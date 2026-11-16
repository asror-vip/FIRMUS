import "server-only";

import { getServiceClient } from "@/lib/supabase/service";
import {
  AI_MODELS,
  PLANS_CONFIG,
  getModelCreditCost,
  normalizeModelId,
  normalizePlanId,
  type AiModelId,
  type PlanId,
  type SubscriptionSnapshot,
} from "@/lib/config/plans";

const burstBuckets = new Map<string, number[]>();

function getTashkentPeriods(): { month: string; day: string } {
  const now = new Date();
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return {
    day: formatted,
    month: formatted.slice(0, 7),
  };
}

export function checkBurstRateLimit(userId: string, maxPerMinute: number): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const cutoff = now - 60_000;
  const arr = (burstBuckets.get(userId) || []).filter((ts) => ts > cutoff);

  if (arr.length >= maxPerMinute) {
    const oldest = arr[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + 60_000 - now) / 1000));
    burstBuckets.set(userId, arr);
    return { allowed: false, retryAfterSec };
  }

  arr.push(now);
  burstBuckets.set(userId, arr);

  // Lazy cleanup so long-lived Node process map stays bounded
  if (burstBuckets.size > 5000) {
    for (const [key, stamps] of burstBuckets.entries()) {
      const fresh = stamps.filter((t) => t > cutoff);
      if (fresh.length === 0) burstBuckets.delete(key);
      else burstBuckets.set(key, fresh);
    }
  }

  return { allowed: true };
}

export async function resolveEffectiveSubscription(userId: string): Promise<SubscriptionSnapshot> {
  const svc = getServiceClient();
  const { month, day } = getTashkentPeriods();

  let { data: sub } = await svc
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!sub) {
    const { data: ws } = await svc
      .from("workspaces")
      .select("id")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: inserted, error: insertErr } = await svc
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          workspace_id: ws?.id || null,
          plan_id: "starter",
          status: "active",
          preferred_model: "gemini-3.8-flash",
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (!insertErr && inserted) {
      sub = inserted;
    }
  }

  const now = new Date();
  let planId: PlanId = normalizePlanId(sub?.plan_id);
  let status = (sub?.status || "active") as SubscriptionSnapshot["status"];
  let preferredModel = normalizeModelId(sub?.preferred_model);

  // Graceful auto-downgrade when 7-day trial or paid period expires (never deletes history)
  const isExpiredTrial =
    status === "trialing" && sub?.trial_ends_at && new Date(sub.trial_ends_at).getTime() <= now.getTime();
  const isExpiredPaid =
    planId !== "starter" &&
    status === "active" &&
    sub?.expires_at &&
    new Date(sub.expires_at).getTime() <= now.getTime();

  if (sub && (isExpiredTrial || isExpiredPaid)) {
    planId = "starter";
    status = "active";
    preferredModel = "gemini-3.8-flash";
    await svc
      .from("subscriptions")
      .update({
        plan_id: "starter",
        status: "active",
        preferred_model: "gemini-3.8-flash",
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (sub.workspace_id) {
      await svc
        .from("workspaces")
        .update({ plan_id: "starter", updated_at: now.toISOString() })
        .eq("id", sub.workspace_id);
    }
  }

  const spec = PLANS_CONFIG[planId];
  const isTrialActive = status === "trialing" && planId === "professional";
  const trialAvailable = !sub?.trial_used_at && planId === "starter";

  if (!spec.limits.allowedModels.includes(preferredModel)) {
    preferredModel = spec.limits.defaultChatModel;
  }

  const [monthlyRes, dailyRes] = await Promise.all([
    svc
      .from("ai_usage_monthly")
      .select("credits_used")
      .eq("user_id", userId)
      .eq("period_month", month)
      .maybeSingle(),
    svc
      .from("ai_usage_daily")
      .select("credits_used")
      .eq("user_id", userId)
      .eq("period_day", day)
      .maybeSingle(),
  ]);

  const monthlyUsed = Number(monthlyRes.data?.credits_used ?? 0);
  const dailyUsed = Number(dailyRes.data?.credits_used ?? 0);
  const bonusCredits = Math.max(0, Number(sub?.bonus_credits ?? 0));

  const monthlyLimit =
    isTrialActive && spec.limits.trialMonthlyCredits
      ? spec.limits.trialMonthlyCredits
      : spec.limits.monthlyCredits;
  const dailyLimit =
    isTrialActive && spec.limits.trialDailyCredits
      ? spec.limits.trialDailyCredits
      : spec.limits.dailyCredits;

  const totalAvailableMonth = monthlyLimit + bonusCredits;
  const remainingCredits = Math.max(0, totalAvailableMonth - monthlyUsed);

  return {
    planId,
    planName: spec.name,
    status,
    isTrialActive,
    trialAvailable,
    trialEndsAt: sub?.trial_ends_at || null,
    expiresAt: sub?.expires_at || null,
    preferredModel,
    monthlyUsed,
    monthlyLimit: totalAvailableMonth,
    dailyUsed,
    dailyLimit,
    bonusCredits,
    remainingCredits,
    annualDiscountUsed: Boolean(sub?.annual_discount_used_at),
    limits: spec.limits,
  };
}

export const getUserSubscriptionSnapshot = resolveEffectiveSubscription;

export async function getUserSubscriptionRow(userId: string) {
  const svc = getServiceClient();
  const { data: sub } = await svc
    .from("subscriptions")
    .select("*, annual_discount_used_at")
    .eq("user_id", userId)
    .maybeSingle();
  return sub;
}

export type AiRequestKind = "chat" | "scan" | "contract" | "reconcile";

export interface AuthorizedAiExecution {
  ok: true;
  modelId: AiModelId;
  modelChain: string[];
  creditCost: number;
  snapshot: SubscriptionSnapshot;
  periodMonth?: string;
  periodDay?: string;
}

export interface RejectedAiExecution {
  ok: false;
  status: number;
  error: string;
  upgradeRequired?: boolean;
  snapshot: SubscriptionSnapshot;
}

export async function authorizeAndConsumeAiCredits(params: {
  userId: string;
  kind: AiRequestKind;
  requestedModel?: string | null;
  estimatedTokens?: number;
}): Promise<AuthorizedAiExecution | RejectedAiExecution> {
  const snapshot = await resolveEffectiveSubscription(params.userId);
  const spec = PLANS_CONFIG[snapshot.planId];

  // 1. Burst rate limit guard
  const burst = checkBurstRateLimit(params.userId, spec.limits.burstRequestsPerMin);
  if (!burst.allowed) {
    return {
      ok: false,
      status: 429,
      error: `Juda koʻp soʻrov yuborildi. Iltimos ${burst.retryAfterSec} soniyadan keyin qayta urinib koʻring.`,
      snapshot,
    };
  }

  // 2. Resolve & enforce allowed AI model (never trust client blindly)
  let modelId: AiModelId;
  if (params.requestedModel) {
    const normalized = normalizeModelId(params.requestedModel);
    if (!spec.limits.allowedModels.includes(normalized)) {
      return {
        ok: false,
        status: 403,
        upgradeRequired: true,
        error: `${AI_MODELS[normalized].label} modeli faqat Pro va Pro+ tariflarida mavjud. Obunalar boʻlimidan 7 kunlik bepul sinovni yoqing.`,
        snapshot,
      };
    }
    modelId = normalized;
  } else if (params.kind === "scan" || params.kind === "reconcile") {
    modelId = spec.limits.defaultScanModel;
  } else {
    modelId = snapshot.preferredModel;
  }

  const creditCost = getModelCreditCost(modelId);

  // 3. Atomic credit check & reservation in Postgres
  const svc = getServiceClient();
  const baseMonthlyLimit =
    snapshot.isTrialActive && spec.limits.trialMonthlyCredits
      ? spec.limits.trialMonthlyCredits
      : spec.limits.monthlyCredits;

  const { data: rpcData, error: rpcErr } = await svc.rpc("consume_ai_credits_atomic", {
    p_user_id: params.userId,
    p_credits: creditCost,
    p_monthly_limit: baseMonthlyLimit,
    p_daily_limit: snapshot.dailyLimit,
    p_bonus_credits: snapshot.bonusCredits,
    p_is_scan: params.kind === "scan" || params.kind === "contract",
    p_tokens_est: Math.max(0, Math.round(params.estimatedTokens || 0)),
  });

  if (rpcErr) {
    console.error("consume_ai_credits_atomic error:", rpcErr);
    return {
      ok: false,
      status: 500,
      error: "Kredit balansini tekshirishda tizim xatoligi yuz berdi.",
      snapshot,
    };
  }

  if (!rpcData?.allowed) {
    const isDaily = rpcData?.reason === "daily_limit";
    return {
      ok: false,
      status: 402,
      upgradeRequired: true,
      error: isDaily
        ? `Bugungi kunlik AI kredit limitingiz tugadi (${rpcData?.daily_used}/${rpcData?.daily_limit}). Ertaga qayta urinib koʻring yoki yuqori tarifga oʻting.`
        : `Oylik AI kredit limitingiz tugadi (${rpcData?.monthly_used}/${rpcData?.monthly_limit}). Obunalar boʻlimidan tarifingizni oshiring.`,
      snapshot: {
        ...snapshot,
        monthlyUsed: Number(rpcData?.monthly_used ?? snapshot.monthlyUsed),
        dailyUsed: Number(rpcData?.daily_used ?? snapshot.dailyUsed),
        remainingCredits: Math.max(0, snapshot.monthlyLimit - Number(rpcData?.monthly_used ?? snapshot.monthlyUsed)),
      },
    };
  }

  const updatedMonthlyUsed = Number(rpcData.monthly_used ?? snapshot.monthlyUsed + creditCost);
  const updatedDailyUsed = Number(rpcData.daily_used ?? snapshot.dailyUsed + creditCost);
  const periodMonth = rpcData.period_month as string | undefined;
  const periodDay = rpcData.period_day as string | undefined;

  return {
    ok: true,
    modelId,
    modelChain: AI_MODELS[modelId].fallbackChain,
    creditCost,
    periodMonth,
    periodDay,
    snapshot: {
      ...snapshot,
      monthlyUsed: updatedMonthlyUsed,
      dailyUsed: updatedDailyUsed,
      remainingCredits: Math.max(0, snapshot.monthlyLimit - updatedMonthlyUsed),
    },
  };
}

export const consumeAiCredits = authorizeAndConsumeAiCredits;

export async function refundConsumedAiCredits(params: {
  userId: string;
  creditCost: number;
  periodMonth?: string;
  periodDay?: string;
  isScan?: boolean;
}) {
  try {
    const svc = getServiceClient();
    await svc.rpc("refund_ai_credits_atomic", {
      p_user_id: params.userId,
      p_credit_cost: params.creditCost,
      p_period_month: params.periodMonth || null,
      p_period_day: params.periodDay || null,
      p_is_scan: Boolean(params.isScan),
    });
  } catch (err) {
    console.warn("refundConsumedAiCredits warning:", err);
  }
}

export const refundAiCredits = refundConsumedAiCredits;

export async function updateSubscriptionPreferredModel(userId: string, modelId: AiModelId) {
  const snapshot = await resolveEffectiveSubscription(userId);
  if (!snapshot.limits.allowedModels.includes(modelId)) {
    throw new Error(`${AI_MODELS[modelId].label} modeli joriy tarifingizda mavjud emas.`);
  }
  const svc = getServiceClient();
  const { error } = await svc
    .from("subscriptions")
    .update({
      preferred_model: modelId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw error;
  return resolveEffectiveSubscription(userId);
}

export async function activateUserProTrial(params: {
  userId: string;
  canonicalEmailHash?: string;
  deviceHash?: string;
  ipHash?: string;
}) {
  const svc = getServiceClient();
  const { data, error } = await svc.rpc("activate_pro_trial", {
    p_user_id: params.userId,
    p_canonical_email_hash: params.canonicalEmailHash || null,
    p_device_hash: params.deviceHash || null,
    p_ip_hash: params.ipHash || null,
  });
  if (error) throw new Error(error.message || "Sinov muddatini yoqib boʻlmadi");
  return {
    activation: data,
    snapshot: await resolveEffectiveSubscription(params.userId),
  };
}

export async function trimHistoryRetentionForUser(params: {
  userId: string;
  entityId?: string | null;
}) {
  try {
    const snapshot = await resolveEffectiveSubscription(params.userId);
    const svc = getServiceClient();
    await svc.rpc("enforce_history_retention", {
      p_user_id: params.userId,
      p_entity_id: params.entityId || null,
      p_max_batches: snapshot.limits.maxSavedBatches,
      p_max_threads: snapshot.limits.maxChatThreads,
    });
  } catch (err) {
    console.warn("trimHistoryRetentionForUser warning:", err);
  }
}
