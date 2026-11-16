import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { copilotRequestSchema } from "@/lib/ai/agent-types";
import { runFirmusAgent, runAdvisoryAgent } from "@/lib/ai/firmus-agent";
import { FEATURES } from "@/lib/config/features";
import {
  authorizeAndConsumeAiCredits,
  refundConsumedAiCredits,
} from "@/lib/ai/subscription-guard";

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

    const { message, entityId, requestedModel, history } = parsed.data;

    const authz = await authorizeAndConsumeAiCredits({
      userId: user.id,
      kind: "chat",
      requestedModel,
      estimatedTokens: 1600,
    });

    if (!authz.ok) {
      return NextResponse.json(
        {
          error: authz.error,
          upgradeRequired: Boolean(authz.upgradeRequired),
          usage: authz.snapshot,
        },
        { status: authz.status }
      );
    }

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

    let result;
    try {
      if (!targetEntity) {
        result = await runAdvisoryAgent({
          message,
          history,
          modelChain: authz.modelChain,
        });
      } else {
        result = await runFirmusAgent({
          supabase,
          userId: user.id,
          userEmail: user.email,
          entity: targetEntity,
          message,
          history,
          modelChain: authz.modelChain,
          soloToolsMode: !FEATURES.fullAccountingErp,
        });
      }
    } catch (execErr) {
      await refundConsumedAiCredits({
        userId: user.id,
        creditCost: authz.creditCost,
        isScan: false,
      });
      throw execErr;
    }

    // Do not charge credits when offline deterministic fallback responded without Gemini tokens
    let finalUsage = authz.snapshot;
    if (result.mode === "deterministic_guard") {
      await refundConsumedAiCredits({
        userId: user.id,
        creditCost: authz.creditCost,
        isScan: false,
      });
      finalUsage = {
        ...authz.snapshot,
        monthlyUsed: Math.max(0, authz.snapshot.monthlyUsed - authz.creditCost),
        dailyUsed: Math.max(0, authz.snapshot.dailyUsed - authz.creditCost),
        remainingCredits: Math.min(
          authz.snapshot.monthlyLimit,
          authz.snapshot.remainingCredits + authz.creditCost
        ),
      };
    }

    return NextResponse.json({
      ...result,
      creditCost: result.mode === "deterministic_guard" ? 0 : authz.creditCost,
      usage: finalUsage,
    });
  } catch (err: any) {
    console.error("AI Copilot API error:", err);
    return NextResponse.json(
      { error: err?.message || "AI Copilot soʻrovida xatolik" },
      { status: 500 }
    );
  }
}
