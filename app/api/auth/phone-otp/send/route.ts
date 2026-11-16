import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { isEskizConfigured, sendEskizSms } from "@/lib/services/eskiz-sms";
import { normalizeUzPhone, formatUzPhoneDisplay } from "@/lib/utils/privacy";
import { z } from "zod";

const sendOtpSchema = z.object({
  phone: z.string().trim().min(9, "Telefon raqamini toʻliq kiriting"),
});

function hashOtp(userId: string, phone: string, code: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "firmus-otp-fallback-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(`${userId}:${phone}:${code}`)
    .digest("hex");
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

    const body = await req.json();
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Notoʻgʻri telefon raqami" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeUzPhone(parsed.data.phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Oʻzbekiston telefon raqamini +998 XX XXX-XX-XX formatida kiriting" },
        { status: 400 }
      );
    }

    if (!isEskizConfigured()) {
      return NextResponse.json(
        {
          error:
            "Eskiz.uz SMS shlyuzi hali ulanmagan. Server .env faylida ESKIZ_EMAIL va ESKIZ_PASSWORD kalitlarini kiriting.",
          code: "ESKIZ_NOT_CONFIGURED",
        },
        { status: 503 }
      );
    }

    const svc = getServiceClient();

    // 60-second anti-spam rate limit per user
    const sixtySecAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await svc
      .from("phone_otp_verifications")
      .select("id, created_at")
      .eq("user_id", user.id)
      .gte("created_at", sixtySecAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent) {
      return NextResponse.json(
        { error: "SMS kodini qayta yuborish uchun 60 soniya kuting." },
        { status: 429 }
      );
    }

    const otpCode = String(crypto.randomInt(100000, 1000000));
    const codeHash = hashOtp(user.id, normalizedPhone, otpCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data: inserted, error: insertErr } = await svc
      .from("phone_otp_verifications")
      .insert({
        user_id: user.id,
        phone: normalizedPhone,
        code_hash: codeHash,
        provider: "eskiz",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    try {
      const smsText = `FIRMUS tizimida telefon raqamingizni tasdiqlash kodi: ${otpCode}. Kodni hech kimga bermang.`;
      await sendEskizSms(normalizedPhone, smsText);
    } catch (smsErr: any) {
      // Remove unused OTP row if Eskiz SMS dispatch failed
      await svc.from("phone_otp_verifications").delete().eq("id", inserted.id);
      return NextResponse.json(
        { error: `Eskiz.uz orqali SMS yuborib boʻlmadi: ${smsErr.message}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      sent: true,
      phone: formatUzPhoneDisplay(normalizedPhone),
      expiresInSeconds: 300,
      message: `${formatUzPhoneDisplay(normalizedPhone)} raqamiga Eskiz.uz orqali 6 xonali SMS kod yuborildi.`,
    });
  } catch (err: any) {
    console.error("phone-otp send error:", err);
    return NextResponse.json(
      { error: err?.message || "SMS yuborishda server xatoligi" },
      { status: 500 }
    );
  }
}
