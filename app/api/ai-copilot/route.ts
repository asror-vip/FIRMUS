import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { copilotRequestSchema } from "@/lib/ai/agent-types";
import { runFirmusAgent, runAdvisoryAgent, cleanAiLatexFormatting } from "@/lib/ai/firmus-agent";
import { FEATURES } from "@/lib/config/features";
import { isAdminEmail } from "@/lib/auth/admin-guard";
import { buildAdminStatsPromptContext } from "@/lib/ai/admin-stats-context";
import {
  authorizeAndConsumeAiCredits,
  refundConsumedAiCredits,
} from "@/lib/ai/subscription-guard";
import { getRequestLocale } from "@/lib/i18n/server-locale";
import { getApiMessages, localizeServerError } from "@/lib/i18n/domains/api-messages";

export async function POST(req: NextRequest) {
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: msg.invalidRequest }, { status: 400 });
    }
    const parsed = copilotRequestSchema.safeParse(body);
    if (!parsed.success) {
      const issueMsg = parsed.error.issues[0]?.message;
      return NextResponse.json(
        { error: issueMsg ? localizeServerError(issueMsg, locale) : msg.invalidRequest },
        { status: 400 }
      );
    }

    const { message, entityId, requestedModel, history } = parsed.data;

    const authz = await authorizeAndConsumeAiCredits({
      userId: user.id,
      userEmail: user.email,
      kind: "chat",
      requestedModel,
      estimatedTokens: 1600,
    });

    if (!authz.ok) {
      return NextResponse.json(
        {
          error: localizeServerError(authz.error, locale),
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

    const adminStatsContext = isAdminEmail(user.email)
      ? await buildAdminStatsPromptContext()
      : undefined;

    const aiMessage = `${message}\n\n[Reply in the exact same language as the user's message above. Never use raw LaTeX $...$ delimiters; use plain Unicode like H₂O. If the language is ambiguous (e.g., numbers only), use ${locale}.]`;

    let result;
    try {
      if (!targetEntity) {
        result = await runAdvisoryAgent({
          message: aiMessage,
          history,
          modelChain: authz.modelChain,
          adminStatsContext,
        });
      } else {
        result = await runFirmusAgent({
          supabase,
          userId: user.id,
          userEmail: user.email,
          emailConfirmed: Boolean(user.email_confirmed_at),
          entity: targetEntity,
          message: aiMessage,
          history,
          modelChain: authz.modelChain,
          soloToolsMode: !FEATURES.fullAccountingErp,
          adminStatsContext,
        });
      }
      if (result?.reply) {
        result = { ...result, reply: cleanAiLatexFormatting(result.reply) };
      }
    } catch (execErr) {
      await refundConsumedAiCredits({
        userId: user.id,
        creditCost: authz.creditCost,
        periodMonth: authz.periodMonth,
        periodDay: authz.periodDay,
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
        periodMonth: authz.periodMonth,
        periodDay: authz.periodDay,
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
  } catch (err) {
    console.error("AI Copilot API error:", err);
    return NextResponse.json({ error: msg.copilotError }, { status: 500 });
  }
}
