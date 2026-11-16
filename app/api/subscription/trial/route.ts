import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { activateUserProTrial } from "@/lib/ai/subscription-guard";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Autentifikatsiya talab qilinadi" }, { status: 401 });
    }

    const { snapshot } = await activateUserProTrial(user.id);
    return NextResponse.json({
      success: true,
      message: "7 kunlik bepul Pro sinov davri (40 AI kredit) faollashtirildi!",
      subscription: snapshot,
    });
  } catch (err: any) {
    const message = err?.message || "Sinov muddatini yoqib boʻlmadi";
    const status =
      message.includes("avval faollashtirilgan") || message.includes("allaqachon")
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
