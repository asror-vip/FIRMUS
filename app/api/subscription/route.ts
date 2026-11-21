import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  resolveEffectiveSubscription,
  updateSubscriptionPreferredModel,
} from "@/lib/ai/subscription-guard";
import { getRequestLocale } from "@/lib/i18n/server-locale";
import { getApiMessages, localizeServerError } from "@/lib/i18n/domains/api-messages";

const patchSubscriptionSchema = z.object({
  preferredModel: z.enum(["gemini-3.8-flash", "gemini-4-hydrogen"]),
});

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

    const snapshot = await resolveEffectiveSubscription(user.id, user.email);
    return NextResponse.json(snapshot);
  } catch (err: any) {
    console.error("GET /api/subscription error:", err);
    return NextResponse.json(
      { error: err?.message ? localizeServerError(err.message, locale) : msg.subscriptionFetchError },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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

    const body = await req.json();
    const parsed = patchSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: msg.invalidModel },
        { status: 400 }
      );
    }

    const updated = await updateSubscriptionPreferredModel(
      user.id,
      parsed.data.preferredModel,
      user.email
    );
    return NextResponse.json(updated);
  } catch (err: any) {
    const rawMsg = err?.message || "";
    const status = rawMsg.includes("mavjud emas") ? 403 : 400;
    return NextResponse.json(
      { error: rawMsg ? localizeServerError(rawMsg, locale) : msg.modelSwitchFailed },
      { status }
    );
  }
}
