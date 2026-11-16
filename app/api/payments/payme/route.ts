import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";

const PAYME_ERRORS = {
  AUTH_ERROR: {
    code: -32504,
    message: {
      uz: "Avtorizatsiya xatosi",
      ru: "Неверная авторизация",
      en: "Authorization error",
    },
  },
  METHOD_NOT_FOUND: {
    code: -32601,
    message: {
      uz: "Metod topilmadi",
      ru: "Метод не найден",
      en: "Method not found",
    },
  },
  INVALID_AMOUNT: {
    code: -31001,
    message: {
      uz: "Notoʻgʻri summa",
      ru: "Неверная сумма",
      en: "Incorrect amount",
    },
  },
  ORDER_NOT_FOUND: {
    code: -31050,
    message: {
      uz: "Buyurtma topilmadi",
      ru: "Заказ не найден",
      en: "Order not found",
    },
  },
  ORDER_ALREADY_PAID: {
    code: -31050,
    message: {
      uz: "Buyurtma avval toʻlangan",
      ru: "Заказ уже оплачен",
      en: "Order already paid",
    },
  },
  UNABLE_TO_PERFORM: {
    code: -31008,
    message: {
      uz: "Amalni bajarib boʻlmaydi",
      ru: "Невозможно выполнить операцию",
      en: "Unable to perform transaction",
    },
  },
  TRANSACTION_NOT_FOUND: {
    code: -31003,
    message: {
      uz: "Tranzaksiya topilmadi",
      ru: "Транзакция не найдена",
      en: "Transaction not found",
    },
  },
};

function verifyPaymeAuth(req: NextRequest): boolean {
  const secretKey = process.env.PAYME_SECRET_KEY?.trim();
  if (!secretKey) {
    // If no secret key is set, allow in development/sandbox
    return true;
  }

  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Basic ")) {
    return false;
  }

  try {
    const base64 = authHeader.slice(6).trim();
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    const [login, key] = decoded.split(":");
    return login?.toLowerCase() === "paycom" && key === secretKey;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let reqId: number | string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    reqId = body.id ?? null;
    const { method, params } = body;

    if (!verifyPaymeAuth(req)) {
      return NextResponse.json({
        id: reqId,
        error: PAYME_ERRORS.AUTH_ERROR,
      });
    }

    const svc = getServiceClient();

    switch (method) {
      case "CheckPerformTransaction": {
        const orderId = params?.account?.order_id;
        const amount = Number(params?.amount);

        if (!orderId) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.ORDER_NOT_FOUND });
        }

        const { data: order } = await svc
          .from("billing_orders")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle();

        if (!order) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.ORDER_NOT_FOUND });
        }

        if (order.status === "paid") {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.ORDER_ALREADY_PAID });
        }

        if (order.status !== "pending" && order.status !== "waiting_transfer") {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.UNABLE_TO_PERFORM });
        }

        if (Number(order.final_amount_tiyin) !== amount) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.INVALID_AMOUNT });
        }

        return NextResponse.json({
          id: reqId,
          result: { allow: true },
        });
      }

      case "CreateTransaction": {
        const orderId = params?.account?.order_id;
        const amount = Number(params?.amount);
        const transId = String(params?.id || "");
        const transTime = Number(params?.time || Date.now());

        if (!orderId || !transId) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.ORDER_NOT_FOUND });
        }

        const { data: order } = await svc
          .from("billing_orders")
          .select("*")
          .eq("order_id", orderId)
          .maybeSingle();

        if (!order) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.ORDER_NOT_FOUND });
        }

        if (Number(order.final_amount_tiyin) !== amount) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.INVALID_AMOUNT });
        }

        // Check existing transaction
        if (order.provider_trans_id) {
          if (order.provider_trans_id === transId) {
            if (order.provider_state === -1) {
              return NextResponse.json({ id: reqId, error: PAYME_ERRORS.UNABLE_TO_PERFORM });
            }
            return NextResponse.json({
              id: reqId,
              result: {
                create_time: Number(order.provider_create_time || transTime),
                transaction: order.provider_trans_id,
                state: order.provider_state || 1,
              },
            });
          } else {
            // Another transaction in progress
            return NextResponse.json({ id: reqId, error: PAYME_ERRORS.UNABLE_TO_PERFORM });
          }
        }

        if (order.status === "paid" || order.status === "cancelled") {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.UNABLE_TO_PERFORM });
        }

        // Update order with transaction details
        await svc
          .from("billing_orders")
          .update({
            provider_trans_id: transId,
            provider_create_time: transTime,
            provider_state: 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        return NextResponse.json({
          id: reqId,
          result: {
            create_time: transTime,
            transaction: transId,
            state: 1,
          },
        });
      }

      case "PerformTransaction": {
        const transId = String(params?.id || "");
        if (!transId) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND });
        }

        const { data: order } = await svc
          .from("billing_orders")
          .select("*")
          .eq("provider_trans_id", transId)
          .maybeSingle();

        if (!order) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND });
        }

        if (order.provider_state === 1) {
          // Check timeout (12 hours)
          const nowMs = Date.now();
          if (nowMs - Number(order.provider_create_time || 0) > 43_200_000) {
            await svc
              .from("billing_orders")
              .update({
                provider_state: -1,
                provider_cancel_reason: 4,
                provider_cancel_time: nowMs,
                status: "failed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", order.id);

            return NextResponse.json({ id: reqId, error: PAYME_ERRORS.UNABLE_TO_PERFORM });
          }

          // Complete order atomically
          const { error: completeErr } = await svc.rpc("complete_billing_order_atomic", {
            p_order_id: order.order_id,
            p_provider_trans_id: transId,
            p_provider_payload: { method: "payme", perform_time: nowMs },
          });

          if (completeErr) {
            return NextResponse.json({ id: reqId, error: PAYME_ERRORS.UNABLE_TO_PERFORM });
          }

          const { data: updatedOrder } = await svc
            .from("billing_orders")
            .select("provider_perform_time")
            .eq("id", order.id)
            .single();

          return NextResponse.json({
            id: reqId,
            result: {
              transaction: transId,
              perform_time: Number(updatedOrder?.provider_perform_time || nowMs),
              state: 2,
            },
          });
        }

        if (order.provider_state === 2) {
          return NextResponse.json({
            id: reqId,
            result: {
              transaction: transId,
              perform_time: Number(order.provider_perform_time || 0),
              state: 2,
            },
          });
        }

        return NextResponse.json({ id: reqId, error: PAYME_ERRORS.UNABLE_TO_PERFORM });
      }

      case "CancelTransaction": {
        const transId = String(params?.id || "");
        const reason = Number(params?.reason || 0);

        if (!transId) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND });
        }

        const { data: order } = await svc
          .from("billing_orders")
          .select("*")
          .eq("provider_trans_id", transId)
          .maybeSingle();

        if (!order) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND });
        }

        const nowMs = Date.now();

        if (order.provider_state === 1) {
          await svc
            .from("billing_orders")
            .update({
              provider_state: -1,
              provider_cancel_reason: reason,
              provider_cancel_time: nowMs,
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          return NextResponse.json({
            id: reqId,
            result: {
              transaction: transId,
              cancel_time: nowMs,
              state: -1,
            },
          });
        }

        if (order.provider_state === 2) {
          await svc
            .from("billing_orders")
            .update({
              provider_state: -2,
              provider_cancel_reason: reason,
              provider_cancel_time: nowMs,
              status: "refunded",
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          return NextResponse.json({
            id: reqId,
            result: {
              transaction: transId,
              cancel_time: nowMs,
              state: -2,
            },
          });
        }

        return NextResponse.json({
          id: reqId,
          result: {
            transaction: transId,
            cancel_time: Number(order.provider_cancel_time || nowMs),
            state: order.provider_state,
          },
        });
      }

      case "CheckTransaction": {
        const transId = String(params?.id || "");
        if (!transId) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND });
        }

        const { data: order } = await svc
          .from("billing_orders")
          .select("*")
          .eq("provider_trans_id", transId)
          .maybeSingle();

        if (!order) {
          return NextResponse.json({ id: reqId, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND });
        }

        return NextResponse.json({
          id: reqId,
          result: {
            create_time: Number(order.provider_create_time || 0),
            perform_time: Number(order.provider_perform_time || 0),
            cancel_time: Number(order.provider_cancel_time || 0),
            transaction: order.provider_trans_id,
            state: order.provider_state || 0,
            reason: order.provider_cancel_reason !== null ? Number(order.provider_cancel_reason) : null,
          },
        });
      }

      case "GetStatement": {
        const from = Number(params?.from || 0);
        const to = Number(params?.to || Date.now());

        const { data: orders } = await svc
          .from("billing_orders")
          .select("*")
          .gte("provider_perform_time", from)
          .lte("provider_perform_time", to)
          .eq("provider_state", 2);

        const transactions = (orders || []).map((o) => ({
          id: o.provider_trans_id,
          time: Number(o.provider_create_time || 0),
          amount: Number(o.final_amount_tiyin),
          account: { order_id: o.order_id },
          create_time: Number(o.provider_create_time || 0),
          perform_time: Number(o.provider_perform_time || 0),
          cancel_time: Number(o.provider_cancel_time || 0),
          transaction: o.provider_trans_id,
          state: o.provider_state,
          reason: o.provider_cancel_reason,
        }));

        return NextResponse.json({
          id: reqId,
          result: { transactions },
        });
      }

      default:
        return NextResponse.json({
          id: reqId,
          error: PAYME_ERRORS.METHOD_NOT_FOUND,
        });
    }
  } catch (err: any) {
    return NextResponse.json({
      id: reqId,
      error: {
        code: -32400,
        message: {
          uz: "Tizim xatoligi: " + (err?.message || "Nomaʻlum xato"),
          ru: "Системная ошибка: " + (err?.message || "Неизвестная ошибка"),
          en: "System error: " + (err?.message || "Unknown error"),
        },
      },
    });
  }
}
