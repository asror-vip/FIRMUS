import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  resolveEffectiveSubscription,
  updateSubscriptionPreferredModel,
} from "@/lib/ai/subscription-guard";

const patchSubscriptionSchema = z.object({
  preferredModel: z.enum(["gemini-3.8-flash", "gemini-4-hydrogen"]),
});

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Autentifikatsiya talab qilinadi" }, { status: 401 });
    }

    const snapshot = await resolveEffectiveSubscription(user.id);
    return NextResponse.json(snapshot);
  } catch (err: any) {
    console.error("GET /api/subscription error:", err);
    return NextResponse.json(
      { error: err?.message || "Obuna maʼlumotini olishda xatolik" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Autentifikatsiya talab qilinadi" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = patchSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Notoʻgʻri model tanlandi" },
        { status: 400 }
      );
    }

    const updated = await updateSubscriptionPreferredModel(
      user.id,
      parsed.data.preferredModel
    );
    return NextResponse.json(updated);
  } catch (err: any) {
    const msg = err?.message || "Modelni yangilab boʻlmadi";
    const status = msg.includes("mavjud emas") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
