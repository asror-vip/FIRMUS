import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";
import { PLANS_CONFIG, type PlanId } from "@/lib/config/plans";

const ALLOWED_PLANS = new Set<PlanId>(["starter", "professional", "pro_plus"]);

export async function POST(req: NextRequest) {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => null);
    const targetUserId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const planId = typeof body?.planId === "string" ? (body.planId.trim() as PlanId) : null;
    const durationDaysRaw = Number(body?.durationDays ?? 30);
    const durationDays = Number.isFinite(durationDaysRaw)
      ? Math.max(1, Math.min(365, Math.trunc(durationDaysRaw)))
      : 30;

    if (!targetUserId || !planId || !ALLOWED_PLANS.has(planId)) {
      return NextResponse.json({ error: "Invalid userId or planId" }, { status: 400 });
    }

    const svc = createServiceClient();
    const now = new Date();
    const expiresAt =
      planId === "starter"
        ? null
        : new Date(now.getTime() + durationDays * 86_400_000).toISOString();

    const preferredModel = PLANS_CONFIG[planId].limits.defaultChatModel;

    const { data: ws } = await svc
      .from("workspaces")
      .select("id")
      .eq("owner_user_id", targetUserId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { error: subErr } = await svc.from("subscriptions").upsert(
      {
        user_id: targetUserId,
        workspace_id: ws?.id || null,
        plan_id: planId,
        status: "active",
        preferred_model: preferredModel,
        expires_at: expiresAt,
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (subErr) throw subErr;

    await svc
      .from("workspaces")
      .update({ plan_id: planId, updated_at: now.toISOString() })
      .eq("owner_user_id", targetUserId);

    return NextResponse.json({
      ok: true,
      userId: targetUserId,
      planId,
      expiresAt,
    });
  } catch (err) {
    console.error("[admin/users/plan] error:", err);
    return NextResponse.json({ error: "Failed to update user plan" }, { status: 500 });
  }
}
