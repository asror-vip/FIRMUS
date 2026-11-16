import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { resolveEffectiveSubscription } from "@/lib/ai/subscription-guard";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Autentifikatsiya talab qilinadi" }, { status: 401 });
    }

    const { data: orders, error } = await supabase
      .from("billing_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Tizim xatoligi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Autentifikatsiya talab qilinadi" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // Sandbox manual confirmation (disabled when PAYMENT_LIVE_STRICT is true)
    if (body.action === "confirm_order") {
      const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
      if (!orderId) {
        return NextResponse.json({ error: "orderId talab qilinadi" }, { status: 400 });
      }

      if (process.env.PAYMENT_LIVE_STRICT === "true") {
        return NextResponse.json(
          { error: "Real toʻlov rejimida buyurtmani qoʻlda tasdiqlash taqiqlangan" },
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
        return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
      }

      if (order.status === "paid") {
        const snapshot = await resolveEffectiveSubscription(user.id);
        return NextResponse.json({
          success: true,
          alreadyPaid: true,
          message: "Buyurtma avval toʻlangan",
          subscription: snapshot,
        });
      }

      const { data: completeRes, error: completeErr } = await svc.rpc("complete_billing_order_atomic", {
        p_order_id: orderId,
        p_provider_trans_id: `sandbox_manual_${Date.now()}`,
        p_provider_payload: { method: order.payment_method, manual_sandbox: true },
      });

      if (completeErr) {
        return NextResponse.json(
          { error: completeErr.message || "Buyurtmani tasdiqlashda xatolik yuz berdi" },
          { status: 500 }
        );
      }

      const updatedSnapshot = await resolveEffectiveSubscription(user.id);
      return NextResponse.json({
        success: true,
        message: "Tarif muvaffaqiyatli faollashtirildi!",
        order: completeRes,
        subscription: updatedSnapshot,
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
        { error: "Notoʻgʻri tarif tanlangan (professional yoki pro_plus boʻlishi kerak)" },
        { status: 400 }
      );
    }

    if (!billingCycle || !["monthly", "annual"].includes(billingCycle)) {
      return NextResponse.json(
        { error: "Notoʻgʻri davr tanlangan (monthly yoki annual)" },
        { status: 400 }
      );
    }

    if (!paymentMethod || !["payme", "click", "bank_transfer_didox"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Notoʻgʻri toʻlov tizimi tanlangan (payme, click yoki bank_transfer_didox)" },
        { status: 400 }
      );
    }

    if (paymentMethod === "bank_transfer_didox") {
      if (!b2bMetadata?.tinStir || !b2bMetadata?.companyName) {
        return NextResponse.json(
          { error: "Bank oʻtkazmasi uchun tashkilot STIR va nomi kiritilishi shart" },
          { status: 400 }
        );
      }
    }

    const svc = getServiceClient();
    const { data: orderData, error: rpcErr } = await svc.rpc("create_checkout_order", {
      p_user_id: user.id,
      p_plan_id: planId,
      p_billing_cycle: billingCycle,
      p_payment_method: paymentMethod,
      p_workspace_id: workspaceId || null,
      p_b2b_metadata: b2bMetadata || null,
    });

    if (rpcErr || !orderData) {
      return NextResponse.json(
        { error: rpcErr?.message || "Buyurtma yaratib boʻlmadi" },
        { status: 400 }
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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.firmus.uz";
      const returnUrl = encodeURIComponent(`${appUrl}/assistant?tab=subscription&order=${orderId}`);
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
            buyerTin: b2bMetadata?.tinStir || "",
            buyerName: b2bMetadata?.companyName || "",
            paymentPurpose: `FIRMUS SaaS obunasi uchun toʻlov (${orderId}). QQSsiz.`,
            amountUzs: finalAmountUzs,
            contractNotice:
              "Didox yoki 1C E-SF orqali hisob-faktura yuboriladi yoki bank ilovasida koʻrsatilgan hisob raqamga toʻlov qiling.",
          }
        : null;

    return NextResponse.json({
      success: true,
      sandboxMode: !paymeMerchantId && !clickMerchantId,
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
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Tizim xatoligi yuz berdi" }, { status: 500 });
  }
}
