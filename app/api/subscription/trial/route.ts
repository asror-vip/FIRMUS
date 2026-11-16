import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { activateUserProTrial } from "@/lib/ai/subscription-guard";
import {
  canonicalizeEmail,
  isDisposableEmailDomain,
} from "@/lib/utils/email-guard";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function extractClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "";
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

    if (user.email && isDisposableEmailDomain(user.email)) {
      return NextResponse.json(
        {
          error:
            "Vaqtinchalik (bir martalik) pochta orqali bepul sinov berilmaydi. Doimiy pochta orqali kiring.",
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

    const { snapshot } = await activateUserProTrial({
      userId: user.id,
      canonicalEmailHash,
      deviceHash: /^[a-f0-9]{32,64}$/i.test(deviceHash) ? deviceHash : undefined,
      ipHash,
    });

    return NextResponse.json({
      success: true,
      message: "7 kunlik bepul Pro sinov davri faollashtirildi!",
      subscription: snapshot,
    });
  } catch (err: any) {
    const message = err?.message || "Sinov muddatini yoqib boʻlmadi";
    const status =
      message.includes("avval") ||
      message.includes("allaqachon") ||
      message.includes("limiti tugagan")
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
