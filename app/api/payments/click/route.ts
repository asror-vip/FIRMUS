import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

function md5(value: string): string {
  return crypto.createHash("md5").update(value).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    let payload: Record<string, any> = {};

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await req.json().catch(() => ({}));
    } else {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        for (const [key, val] of formData.entries()) {
          payload[key] = typeof val === "string" ? val : val.name;
        }
      }
    }

    const clickTransId = payload.click_trans_id;
    const serviceId = payload.service_id;
    const clickPaydocId = payload.click_paydoc_id;
    const merchantTransId = String(payload.merchant_trans_id || "").trim(); // our order_id
    const rawAmount = payload.amount;
    const amount =
      typeof rawAmount === "number" ||
      (typeof rawAmount === "string" && rawAmount.trim() !== "")
        ? Number(rawAmount)
        : NaN;
    const rawAction = payload.action;
    const action =
      typeof rawAction === "number" ||
      (typeof rawAction === "string" && rawAction.trim() !== "")
        ? Number(rawAction)
        : NaN;
    const error = Number(payload.error ?? 0);
    const signTime = payload.sign_time;
    const signString = payload.sign_string;
    const merchantPrepareId = payload.merchant_prepare_id ?? "";

    const secretKey = process.env.CLICK_SECRET_KEY?.trim();
    const expectedServiceId = process.env.CLICK_SERVICE_ID?.trim();
    const allowInsecureBypass =
      process.env.NODE_ENV === "development" &&
      process.env.ALLOW_INSECURE_PAYMENT_WEBHOOKS === "true";

    if (!secretKey) {
      if (!allowInsecureBypass) {
        return NextResponse.json({
          error: -1,
          error_note: "SIGN CHECK FAILED",
        });
      }
    } else {
      if (expectedServiceId && String(serviceId ?? "") !== expectedServiceId) {
        return NextResponse.json({
          error: -1,
          error_note: "SIGN CHECK FAILED",
        });
      }

      if (action !== 0 && action !== 1) {
        return NextResponse.json({
          error: -3,
          error_note: "Nomaʻlum action",
        });
      }

      const signAmount = rawAmount ?? "";
      const rawSign =
        action === 0
          ? `${clickTransId}${serviceId}${secretKey}${merchantTransId}${signAmount}${action}${signTime}`
          : `${clickTransId}${serviceId}${secretKey}${merchantTransId}${merchantPrepareId}${signAmount}${action}${signTime}`;

      const calculatedBuf = Buffer.from(md5(rawSign).toLowerCase(), "utf8");
      const providedBuf = Buffer.from(String(signString || "").trim().toLowerCase(), "utf8");
      if (
        calculatedBuf.length !== providedBuf.length ||
        !crypto.timingSafeEqual(calculatedBuf, providedBuf)
      ) {
        return NextResponse.json({
          error: -1,
          error_note: "SIGN CHECK FAILED",
        });
      }
    }

    if (action !== 0 && action !== 1) {
      return NextResponse.json({
        error: -3,
        error_note: "Nomaʻlum action",
      });
    }

    if (!merchantTransId) {
      return NextResponse.json({
        error: -5,
        error_note: "Buyurtma ID si (merchant_trans_id) koʻrsatilmadi",
      });
    }

    const svc = getServiceClient();
    const { data: order, error: orderErr } = await svc
      .from("billing_orders")
      .select("*")
      .eq("order_id", merchantTransId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({
        error: -5,
        error_note: "Buyurtma topilmadi",
      });
    }

    // Action 0: Prepare
    if (action === 0) {
      if (order.payment_method !== "click") {
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: -9,
          error_note: "Notoʻgʻri toʻlov usuli",
        });
      }

      if (order.status !== "pending") {
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: order.status === "paid" ? -4 : -9,
          error_note:
            order.status === "paid"
              ? "Buyurtma allaqachon toʻlangan"
              : "Buyurtma holati toʻlovga mos emas",
        });
      }

      if (!Number.isFinite(amount) || amount <= 0 || Math.abs(Number(order.final_amount_uzs) - amount) > 0.01) {
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: -2,
          error_note: "Notoʻgʻri summa",
        });
      }

      // Update order state
      await svc
        .from("billing_orders")
        .update({
          provider_trans_id: String(clickTransId),
          provider_state: 1,
          provider_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      return NextResponse.json({
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        merchant_prepare_id: order.id,
        error: 0,
        error_note: "Success",
      });
    }

    // Action 1: Complete
    if (action === 1) {
      if (order.payment_method !== "click") {
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: -9,
          error_note: "Notoʻgʻri toʻlov usuli",
        });
      }

      if (order.status === "paid") {
        if (error < 0) {
          return NextResponse.json({
            click_trans_id: clickTransId,
            merchant_trans_id: merchantTransId,
            merchant_confirm_id: order.id,
            error: -4,
            error_note: "Buyurtma allaqachon toʻlangan",
          });
        }
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          merchant_confirm_id: order.id,
          error: 0,
          error_note: "Success (Already paid)",
        });
      }

      if (order.status !== "pending") {
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: -9,
          error_note: "Buyurtma holati toʻlovga mos emas",
        });
      }

      if (String(merchantPrepareId) !== String(order.id)) {
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: -6,
          error_note: "Tranzaksiya topilmadi",
        });
      }

      if (error < 0) {
        // User cancelled or transaction failed in Click
        await svc
          .from("billing_orders")
          .update({
            status: "cancelled",
            provider_state: -1,
            provider_cancel_reason: Number.isFinite(error) ? error : -1,
            provider_cancel_time: Date.now(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          merchant_confirm_id: order.id,
          error: -9,
          error_note: "Tranzaksiya bekor qilindi",
        });
      }

      if (!Number.isFinite(amount) || amount <= 0 || Math.abs(Number(order.final_amount_uzs) - amount) > 0.01) {
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: -2,
          error_note: "Notoʻgʻri summa",
        });
      }

      // Complete order atomically
      const { error: completeErr } = await svc.rpc("complete_billing_order_atomic", {
        p_order_id: merchantTransId,
        p_provider_trans_id: String(clickTransId),
        p_provider_payload: {
          method: "click",
          click_trans_id: clickTransId,
          click_paydoc_id: clickPaydocId,
          sign_time: signTime,
        },
      });

      if (completeErr) {
        console.error("[CLICK] complete_billing_order_atomic error:", completeErr);
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: -7,
          error_note: "Foydalanuvchi obunasini yangilab boʻlmadi",
        });
      }

      return NextResponse.json({
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        merchant_confirm_id: order.id,
        error: 0,
        error_note: "Success",
      });
    }

    return NextResponse.json({
      error: -3,
      error_note: "Nomaʻlum action",
    });
  } catch (err) {
    console.error("[CLICK] Webhook error:", err);
    return NextResponse.json({
      error: -8,
      error_note: "Click soʻrovini qayta ishlashda xatolik",
    });
  }
}
