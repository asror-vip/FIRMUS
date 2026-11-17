import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { resolveEffectiveSubscription } from "@/lib/ai/subscription-guard";
import { UUID_REGEX } from "@/lib/ai/agent-types";
import { getRequestLocale } from "@/lib/i18n/server-locale";
import { getApiMessages, localizeServerError } from "@/lib/i18n/domains/api-messages";

const b2bMetadataSchema = z.object({
  tinStir: z.string().trim().regex(/^\d{9}$/),
  companyName: z.string().trim().min(1).max(200),
});

function isSandboxConfirmEnabled(): boolean {
  return (
    process.env.ALLOW_SANDBOX_CONFIRM === "true" &&
    process.env.PAYMENT_LIVE_STRICT !== "true"
  );
}

export async function GET(req: NextRequest) {
  const locale = getRequestLocale(req);
  const msg = getApiMessages(locale);

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: msg.authRequired }, { status: 401 });
    }

    const { data: orders, error } = await supabase
      .from("billing_orders")
      .select(
        "order_id, plan_id, billing_cycle, regular_amount_uzs, discount_amount_uzs, final_amount_uzs, payment_method, status, paid_at, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Checkout GET error:", error);
      return NextResponse.json({ error: msg.systemError }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err) {
    console.error("Checkout GET exception:", err);
    return NextResponse.json({ error: msg.systemError }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const locale = getRequestLocale(req);
  const msg = getApiMessages(locale);

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: msg.authRequired }, { status: 401 });
    }

    let body: Record<string, any>;
    try {
      const parsedBody = await req.json();
      if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
        return NextResponse.json({ error: msg.invalidRequest }, { status: 400 });
      }
      body = parsedBody;
    } catch {
      return NextResponse.json({ error: msg.invalidRequest }, { status: 400 });
    }

    // Sandbox manual confirmation (fail-closed unless explicitly enabled and PAYMENT_LIVE_STRICT !== "true")
    if (body.action === "confirm_order") {
      const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
      if (!orderId) {
        return NextResponse.json({ error: msg.orderIdRequired }, { status: 400 });
      }

      if (!isSandboxConfirmEnabled()) {
        return NextResponse.json(
          { error: msg.manualConfirmForbidden },
          { status: 403 }
        );
      }

      const svc = getServiceClient();
      const { data: order, error: orderErr } = await svc
        .from("billing_orders")
        .select("*")
        .eq("order_id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (orderErr || !order) {
        return NextResponse.json({ error: msg.orderNotFound }, { status: 404 });
      }

      if (order.status === "paid") {
        const snapshot = await resolveEffectiveSubscription(user.id);
        return NextResponse.json({
          success: true,
          alreadyPaid: true,
          message: msg.orderAlreadyPaid,
          subscription: snapshot,
        });
      }

      const { data: completeRes, error: completeErr } = await svc.rpc("complete_billing_order_atomic", {
        p_order_id: orderId,
        p_provider_trans_id: `sandbox_manual_${Date.now()}`,
        p_provider_payload: { method: order.payment_method, manual_sandbox: true },
      });

      if (completeErr) {
        console.error("complete_billing_order_atomic error:", completeErr);
        return NextResponse.json(
          { error: msg.orderConfirmFailed },
          { status: 500 }
        );
      }

      const updatedSnapshot = await resolveEffectiveSubscription(user.id);
      return NextResponse.json({
        success: true,
        message: msg.orderActivated,
        order: completeRes,
        subscription: updatedSnapshot,
      });
    }

    // Explicit cancellation of an unpaid order (when user switches payment method or cancels)
    if (body.action === "cancel_order") {
      const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
      if (!orderId) {
        return NextResponse.json({ error: msg.orderIdRequired }, { status: 400 });
      }

      const svc = getServiceClient();
      const { data: cancelRes, error: cancelErr } = await svc.rpc("cancel_checkout_order", {
        p_user_id: user.id,
        p_order_id: orderId,
      });

      if (cancelErr) {
        console.error("cancel_checkout_order error:", cancelErr);
        return NextResponse.json(
          { error: msg.orderCancelFailed },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        orderId,
        cancelled: Boolean(cancelRes?.cancelled),
      });
    }

    // Creating a new checkout order
    const {
      planId,
      billingCycle = "monthly",
      paymentMethod,
      workspaceId,
      b2bMetadata,
    } = body;

    if (!planId || !["professional", "pro_plus"].includes(planId)) {
      return NextResponse.json(
        { error: msg.invalidPlanId },
        { status: 400 }
      );
    }

    if (!billingCycle || !["monthly", "annual"].includes(billingCycle)) {
      return NextResponse.json(
        { error: msg.invalidBillingCycle },
        { status: 400 }
      );
    }

    if (!paymentMethod || !["payme", "click", "bank_transfer_didox"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: msg.invalidPaymentMethod },
        { status: 400 }
      );
    }

    let validatedWorkspaceId: string | null = null;
    if (workspaceId !== undefined && workspaceId !== null && workspaceId !== "") {
      if (typeof workspaceId !== "string" || !UUID_REGEX.test(workspaceId.trim())) {
        return NextResponse.json({ error: msg.invalidRequest }, { status: 400 });
      }
      validatedWorkspaceId = workspaceId.trim();
    }

    let validatedB2bMetadata: { tinStir: string; companyName: string } | null = null;
    if (paymentMethod === "bank_transfer_didox") {
      const parsedB2b = b2bMetadataSchema.safeParse(b2bMetadata);
      if (!parsedB2b.success) {
        return NextResponse.json(
          { error: msg.b2bTinNameRequired },
          { status: 400 }
        );
      }
      validatedB2bMetadata = parsedB2b.data;
    }

    const svc = getServiceClient();
    const { data: orderData, error: rpcErr } = await svc.rpc("create_checkout_order", {
      p_user_id: user.id,
      p_plan_id: planId,
      p_billing_cycle: billingCycle,
      p_payment_method: paymentMethod,
      p_workspace_id: validatedWorkspaceId,
      p_b2b_metadata: validatedB2bMetadata,
    });

    if (rpcErr || !orderData) {
      const rawMsg = rpcErr?.message || "";
      const isConflict =
        rawMsg.includes("allaqachon toʻlangan") ||
        rawMsg.includes("yuqoriroq tarif faol") ||
        rawMsg.includes("faol!");

      return NextResponse.json(
        { error: rawMsg ? localizeServerError(rawMsg, locale) : msg.orderCreateFailed },
        { status: isConflict ? 409 : 400 }
      );
    }

    const {
      order_id: orderId,
      regular_amount_uzs: regularAmountUzs,
      discount_amount_uzs: discountAmountUzs,
      final_amount_uzs: finalAmountUzs,
      final_amount_tiyin: finalAmountTiyin,
      is_discount_applied: isDiscountApplied,
      status,
    } = orderData;

    // Checkout URLs
    const paymeMerchantId = process.env.PAYME_MERCHANT_ID?.trim();
    let paymeCheckoutUrl: string | null = null;
    if (paymeMerchantId) {
      const params = `m=${paymeMerchantId};ac.order_id=${orderId};a=${finalAmountTiyin}`;
      const encoded = Buffer.from(params).toString("base64");
      paymeCheckoutUrl = `https://checkout.paycom.uz/${encoded}`;
    }

    const clickMerchantId = process.env.CLICK_MERCHANT_ID?.trim();
    const clickServiceId = process.env.CLICK_SERVICE_ID?.trim();
    let clickCheckoutUrl: string | null = null;
    if (clickMerchantId && clickServiceId) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://app.firmus.uz").replace(/\/+$/, "");
      const returnUrl = encodeURIComponent(`${appUrl}/billing?order=${encodeURIComponent(orderId)}`);
      clickCheckoutUrl = `https://my.click.uz/services/pay?service_id=${clickServiceId}&merchant_id=${clickMerchantId}&amount=${finalAmountUzs}&transaction_param=${orderId}&return_url=${returnUrl}`;
    }

    // Invoice details for B2B bank transfer / Didox
    const invoiceDetails =
      paymentMethod === "bank_transfer_didox"
        ? {
            sellerName: '"FIRMUS SOFT" MChJ',
            sellerTin: "310987654",
            sellerAccount: "20208000600000000001",
            sellerBank: '"KAPITALBANK" ATB Toshkent shahar filiali',
            sellerMfo: "00974",
            invoiceNumber: `INV-${orderId}`,
            buyerTin: validatedB2bMetadata?.tinStir || "",
            buyerName: validatedB2bMetadata?.companyName || "",
            paymentPurpose: msg.b2bInvoicePurpose(orderId),
            amountUzs: finalAmountUzs,
            contractNotice: msg.b2bContractNotice,
          }
        : null;

    return NextResponse.json({
      success: true,
      sandboxMode: !paymeMerchantId && !clickMerchantId,
      sandboxConfirmEnabled: isSandboxConfirmEnabled(),
      order: {
        orderId,
        planId,
        billingCycle,
        paymentMethod,
        regularAmountUzs,
        discountAmountUzs,
        finalAmountUzs,
        finalAmountTiyin,
        isDiscountApplied,
        status,
      },
      paymeCheckoutUrl,
      clickCheckoutUrl,
      invoiceDetails,
    });
  } catch (err) {
    console.error("Checkout POST error:", err);
    return NextResponse.json({ error: msg.systemError }, { status: 500 });
  }
}
