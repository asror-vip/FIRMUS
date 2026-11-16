import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { copilotRequestSchema } from "@/lib/ai/agent-types";
import { runFirmusAgent } from "@/lib/ai/firmus-agent";

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
    const parsed = copilotRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Notoʻgʻri soʻrov" },
        { status: 400 }
      );
    }

    const { message, entityId, history } = parsed.data;

    let targetEntity: any = null;
    if (entityId) {
      const { data } = await supabase
        .from("business_entities")
        .select("*")
        .eq("id", entityId)
        .maybeSingle();
      targetEntity = data;
    }
    if (!targetEntity) {
      const { data } = await supabase
        .from("business_entities")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      targetEntity = data;
    }

    if (!targetEntity) {
      return NextResponse.json({
        mode: "deterministic_guard",
        modelUsed: "deterministic-21bhms-guard",
        reply: "Hisobingizga biriktirilgan korxona topilmadi. Avval Sozlamalar boʻlimidan korxona yarating.",
        toolCalls: ["business_entities.select"],
        canExecuteActions: false,
      });
    }

    const result = await runFirmusAgent({
      supabase,
      userId: user.id,
      userEmail: user.email,
      entity: targetEntity,
      message,
      history,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("AI Copilot API error:", err);
    return NextResponse.json(
      { error: err?.message || "AI Copilot soʻrovida xatolik" },
      { status: 500 }
    );
  }
}
