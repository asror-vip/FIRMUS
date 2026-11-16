import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { normalizeUzPhone, formatUzPhoneDisplay } from "@/lib/utils/privacy";
import { z } from "zod";

const verifyOtpSchema = z.object({
  phone: z.string().trim().min(9, "Telefon raqami kiritilmagan"),
  code: z.string().trim().regex(/^\d{6}$/, "Tasdiqlash kodi aniq 6 ta raqamdan iborat boʻlishi shart"),
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
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Notoʻgʻri soʻrov" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeUzPhone(parsed.data.phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Telefon raqami notoʻgʻri" }, { status: 400 });
    }

    const svc = getServiceClient();
    const nowIso = new Date().toISOString();

    const { data: otpRow, error: fetchErr } = await svc
      .from("phone_otp_verifications")
      .select("*")
      .eq("user_id", user.id)
      .eq("phone", normalizedPhone)
      .is("verified_at", null)
      .gte("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!otpRow) {
      return NextResponse.json(
        { error: "Faol SMS kod topilmadi yoki muddati tugagan. Qayta kod yuboring." },
        { status: 400 }
      );
    }

    if (otpRow.attempts >= 5) {
      return NextResponse.json(
        { error: "Urinishlar soni tugadi (5/5). Yangi SMS kod soʻrang." },
        { status: 429 }
      );
    }

    const expectedHash = Buffer.from(otpRow.code_hash, "hex");
    const candidateHash = Buffer.from(hashOtp(user.id, normalizedPhone, parsed.data.code), "hex");

    const isMatch =
      expectedHash.length === candidateHash.length &&
      crypto.timingSafeEqual(expectedHash, candidateHash);

    if (!isMatch) {
      await svc
        .from("phone_otp_verifications")
        .update({ attempts: otpRow.attempts + 1 })
        .eq("id", otpRow.id);

      return NextResponse.json(
        { error: `Tasdiqlash kodi notoʻgʻri (${otpRow.attempts + 1}/5 urinish).` },
        { status: 400 }
      );
    }

    const verifiedAt = new Date().toISOString();
    const displayPhone = formatUzPhoneDisplay(normalizedPhone);

    await svc
      .from("phone_otp_verifications")
      .update({ verified_at: verifiedAt })
      .eq("id", otpRow.id);

    await svc
      .from("team_members")
      .update({
        phone: displayPhone,
        phone_verified_at: verifiedAt,
      })
      .eq("user_id", user.id);

    await svc.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata || {}),
        phone: displayPhone,
        phone_verified_at: verifiedAt,
      },
    });

    return NextResponse.json({
      verified: true,
      phone: displayPhone,
      verifiedAt,
    });
  } catch (err: any) {
    console.error("phone-otp verify error:", err);
    return NextResponse.json(
      { error: err?.message || "Tasdiqlashda server xatoligi" },
      { status: 500 }
    );
  }
}
