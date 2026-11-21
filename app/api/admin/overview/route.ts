import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/admin-guard";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizePlanId, type PlanId } from "@/lib/config/plans";
import { getTashkentTodayIso } from "@/lib/format/date";

const ESTIMATED_COST_PER_CREDIT_UZS = 55;

export async function GET() {
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const svc = createServiceClient();
    const todayIso = getTashkentTodayIso(); // YYYY-MM-DD
    const currentMonth = todayIso.slice(0, 7); // YYYY-MM
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const [
      usersRes,
      subsRes,
      monthlyUsageRes,
      dailyUsageRes,
      ordersRes,
      workspacesRes,
      entitiesRes,
      eventsRes,
    ] = await Promise.all([
      svc.auth.admin.listUsers({ page: 1, perPage: 500 }),
      svc
        .from("subscriptions")
        .select("user_id, plan_id, status, expires_at, updated_at"),
      svc
        .from("ai_usage_monthly")
        .select("user_id, credits_used")
        .eq("period_month", currentMonth),
      svc
        .from("ai_usage_daily")
        .select("user_id, credits_used")
        .eq("period_day", todayIso),
      svc
        .from("billing_orders")
        .select("id, user_id, plan_id, billing_cycle, amount_uzs, payment_method, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      svc.from("workspaces").select("id, owner_user_id"),
      svc.from("business_entities").select("id, workspace_id"),
      svc
        .from("analytics_events")
        .select("event_name, page_path, tool_name, created_at")
        .gte("created_at", thirtyDaysAgoIso)
        .limit(5000),
    ]);

    const authUsers = usersRes.data?.users || [];
    const subs = subsRes.data || [];
    const monthlyUsage = monthlyUsageRes.data || [];
    const dailyUsage = dailyUsageRes.data || [];
    const orders = ordersRes.data || [];
    const workspaces = workspacesRes.data || [];
    const entities = entitiesRes.data || [];
    const events = eventsRes.data || [];

    const emailById = new Map<string, string>();
    for (const u of authUsers) {
      emailById.set(u.id, u.email || u.id);
    }

    const subByUser = new Map<string, any>();
    for (const s of subs) {
      subByUser.set(s.user_id, s);
    }

    const monthCreditsByUser = new Map<string, number>();
    let totalMonthlyCredits = 0;
    for (const row of monthlyUsage) {
      const c = Number(row.credits_used || 0);
      totalMonthlyCredits += c;
      monthCreditsByUser.set(row.user_id, (monthCreditsByUser.get(row.user_id) || 0) + c);
    }

    const dayCreditsByUser = new Map<string, number>();
    let totalDailyCredits = 0;
    for (const row of dailyUsage) {
      const c = Number(row.credits_used || 0);
      totalDailyCredits += c;
      dayCreditsByUser.set(row.user_id, (dayCreditsByUser.get(row.user_id) || 0) + c);
    }

    const wsOwnerMap = new Map<string, string>();
    for (const w of workspaces) {
      wsOwnerMap.set(w.id, w.owner_user_id);
    }

    const entitiesCountByUser = new Map<string, number>();
    for (const ent of entities) {
      const ownerId = wsOwnerMap.get(ent.workspace_id);
      if (ownerId) {
        entitiesCountByUser.set(ownerId, (entitiesCountByUser.get(ownerId) || 0) + 1);
      }
    }

    const planCounts: Record<PlanId, number> = {
      starter: 0,
      professional: 0,
      pro_plus: 0,
    };

    let usersToday = 0;
    let usersLast7Days = 0;

    const usersList = authUsers
      .map((u) => {
        const createdAt = u.created_at || "";
        if (createdAt.startsWith(todayIso)) usersToday += 1;
        if (createdAt >= sevenDaysAgoIso) usersLast7Days += 1;

        const sub = subByUser.get(u.id);
        const planId = normalizePlanId(sub?.plan_id);
        planCounts[planId] += 1;

        return {
          id: u.id,
          email: u.email || "—",
          fullName:
            (u.user_metadata?.full_name as string) ||
            (u.user_metadata?.name as string) ||
            "",
          createdAt,
          planId,
          status: (sub?.status as string) || "active",
          expiresAt: (sub?.expires_at as string) || null,
          monthlyCreditsUsed: monthCreditsByUser.get(u.id) || 0,
          dailyCreditsUsed: dayCreditsByUser.get(u.id) || 0,
          entitiesCount: entitiesCountByUser.get(u.id) || 0,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    let paidRevenueUzs = 0;
    let paidOrdersCount = 0;
    const recentOrders = orders.map((o: any) => {
      const amount = Number(o.amount_uzs || 0);
      if (o.status === "paid") {
        paidRevenueUzs += amount;
        paidOrdersCount += 1;
      }
      return {
        id: o.id,
        email: emailById.get(o.user_id) || o.user_id,
        planId: normalizePlanId(o.plan_id),
        billingCycle: o.billing_cycle || "monthly",
        amountUzs: amount,
        paymentMethod: o.payment_method || "—",
        status: o.status || "pending",
        createdAt: o.created_at,
      };
    });

    const funnel = {
      page_view: 0,
      tool_used: 0,
      register_clicked: 0,
      registered: 0,
    };
    const pageViewsByPath: Record<string, number> = {};
    for (const ev of events) {
      const name = ev.event_name as keyof typeof funnel;
      if (name in funnel) funnel[name] += 1;
      if (ev.event_name === "page_view" && ev.page_path) {
        pageViewsByPath[ev.page_path] = (pageViewsByPath[ev.page_path] || 0) + 1;
      }
    }

    const estimatedMonthlyAiCostUzs = totalMonthlyCredits * ESTIMATED_COST_PER_CREDIT_UZS;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      periodMonth: currentMonth,
      todayIso,
      adminEmail: adminUser.email,
      kpis: {
        totalUsers: authUsers.length,
        usersToday,
        usersLast7Days,
        totalEntities: entities.length,
        planCounts,
        paidRevenueUzs,
        paidOrdersCount,
        totalMonthlyCredits,
        totalDailyCredits,
        estimatedMonthlyAiCostUzs,
      },
      funnel,
      pageViewsByPath,
      users: usersList,
      recentOrders,
    });
  } catch (err) {
    console.error("[admin/overview] error:", err);
    return NextResponse.json({ error: "Failed to load admin overview" }, { status: 500 });
  }
}
