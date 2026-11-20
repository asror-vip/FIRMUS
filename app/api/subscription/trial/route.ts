import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { activateUserProTrial, checkRateLimitDistributed } from "@/lib/ai/subscription-guard";
import {
  canonicalizeEmail,
  isDisposableEmailDomain,
} from "@/lib/utils/email-guard";
import { getRequestLocale } from "@/lib/i18n/server-locale";
import { getApiMessages, localizeServerError } from "@/lib/i18n/domains/api-messages";
import { FEATURES } from "@/lib/config/features";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function extractClientIp(req: NextRequest): string {
  const isProd = process.env.NODE_ENV === "production";

  // In production, trust only edge platform headers (un-spoofable by the client)
  const vercel = req.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercel) return vercel.split(",")[0].trim();

  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const netlify = req.headers.get("x-nf-client-connection-ip")?.trim();
  if (netlify) return netlify;

  // In development / test, allow fallback to standard headers
  if (!isProd) {
    const real = req.headers.get("x-real-ip")?.trim();
    if (real) return real;

    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      const parts = forwarded
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        return parts[0];
      }
    }
  }

  return "";
}

export async function POST(req: NextRequest) {
  const locale = getRequestLocale(req);
  const msg = getApiMessages(locale);

  if (!FEATURES.proTrialEnabled) {
    const disabledMsg =
      locale === "ru"
        ? "7-дневный пробный период Pro временно отключён до подключения привязки карты (Payme/Click). Вы можете бесплатно пользоваться тарифом Starter."
        : locale === "en"
        ? "The 7-day Pro trial is temporarily paused until Payme/Click card binding is enabled. You can use the Starter plan for free."
        : "7 kunlik bepul Pro sinovi karta ulash (Payme/Click) yoqilgunga qadar vaqtincha yopiq. Hozircha Starter tarifidan bepul foydalanishingiz mumkin.";
    return NextResponse.json({ error: disabledMsg }, { status: 403 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: msg.authRequired }, { status: 401 });
    }

    // Rate limit: max 3 trial activation attempts per 5 minutes per user
    const rateLimit = await checkRateLimitDistributed(`trial:${user.id}`, 3, 300);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Juda koʻp sinov soʻrovi yuborildi. Iltimos ${rateLimit.retryAfterSec} soniyadan keyin qayta urinib koʻring.` },
        { status: 429 }
      );
    }

    if (!user.email_confirmed_at) {
      return NextResponse.json(
        {
          error: localizeServerError(
            "Bepul sinov muddatini faollashtirish uchun avval elektron pochtangizni tasdiqlang.",
            locale
          ),
        },
        { status: 403 }
      );
    }

    if (user.email && isDisposableEmailDomain(user.email)) {
      return NextResponse.json(
        {
          error: msg.disposableEmailTrialForbidden,
        },
        { status: 403 }
      );
    }

    let deviceHash = req.headers.get("x-firmus-device")?.trim() || "";
    try {
      const body = await req.json().catch(() => null);
      if (body && typeof body.deviceHash === "string" && /^[a-f0-9]{32,64}$/i.test(body.deviceHash)) {
        deviceHash = body.deviceHash.toLowerCase();
      }
    } catch {
      // Optional JSON body
    }

    const canonicalEmail = canonicalizeEmail(user.email || user.id);
    const canonicalEmailHash = sha256(`email:${canonicalEmail}`);

    const rawIp = extractClientIp(req);
    const ipHash = rawIp ? sha256(`ip:${rawIp}`) : undefined;

    const resolvedDeviceHash = /^[a-f0-9]{32,64}$/i.test(deviceHash)
      ? deviceHash.toLowerCase()
      : sha256(
          `device-fallback:${req.headers.get("user-agent") || "unknown"}:${
            req.headers.get("accept-language") || ""
          }:${rawIp || "no-ip"}`
        );

    const { snapshot } = await activateUserProTrial({
      userId: user.id,
      canonicalEmailHash,
      deviceHash: resolvedDeviceHash,
      ipHash,
    });

    return NextResponse.json({
      success: true,
      message: msg.trialActivated,
      subscription: snapshot,
    });
  } catch (err: any) {
    console.error("Trial activation error:", err);
    const rawMessage = typeof err?.message === "string" ? err.message : "";
    const isConflict =
      rawMessage.includes("avval") ||
      rawMessage.includes("allaqachon") ||
      rawMessage.includes("limiti tugagan");
    const isDomainError = isConflict || rawMessage.includes("Sinov muddatini");

    if (isDomainError) {
      return NextResponse.json(
        { error: localizeServerError(rawMessage, locale) },
        { status: isConflict ? 409 : 400 }
      );
    }

    return NextResponse.json(
      { error: msg.trialActivateFailed },
      { status: 500 }
    );
  }
}
