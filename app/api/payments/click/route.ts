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
    const amount = Number(payload.amount);
    const action = Number(payload.action);
    const error = Number(payload.error || 0);
    const signTime = payload.sign_time;
    const signString = payload.sign_string;
    const merchantPrepareId = payload.merchant_prepare_id || "";

    const secretKey = process.env.CLICK_SECRET_KEY?.trim();

    // Verify MD5 signature if CLICK_SECRET_KEY is configured
    if (secretKey) {
      let rawSign = "";
      if (action === 0) {
        rawSign = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${amount}${action}${signTime}`;
      } else if (action === 1) {
        rawSign = `${clickTransId}${serviceId}${secretKey}${merchantTransId}${merchantPrepareId}${amount}${action}${signTime}`;
      }

      const calculatedSign = md5(rawSign);
      if (calculatedSign.toLowerCase() !== String(signString || "").toLowerCase()) {
        return NextResponse.json({
          error: -1,
          error_note: "SIGN CHECK FAILED",
        });
      }
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
      if (order.status === "paid") {
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: -4,
          error_note: "Buyurtma allaqachon toʻlangan",
        });
      }

      if (Math.abs(Number(order.final_amount_uzs) - amount) > 0.01) {
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
      if (error < 0) {
        // User cancelled or transaction failed in Click
        await svc
          .from("billing_orders")
          .update({
            status: "cancelled",
            provider_state: -1,
            provider_cancel_reason: error,
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

      if (order.status === "paid") {
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          merchant_confirm_id: order.id,
          error: 0,
          error_note: "Success (Already paid)",
        });
      }

      if (Math.abs(Number(order.final_amount_uzs) - amount) > 0.01) {
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
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          error: -7,
          error_note: completeErr.message || "Foydalanuvchi obunasini yangilab boʻlmadi",
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
  } catch (err: any) {
    return NextResponse.json({
      error: -8,
      error_note: err?.message || "Click soʻrovini qayta ishlashda xatolik",
    });
  }
}
