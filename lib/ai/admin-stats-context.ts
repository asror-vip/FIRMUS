import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/auth/admin-guard";
import { normalizePlanId, type PlanId } from "@/lib/config/plans";
import { getTashkentTodayIso } from "@/lib/format/date";

const ESTIMATED_COST_PER_CREDIT_UZS = 55;
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Builds a compact, server-side live FIRMUS Admin statistics snapshot
 * ONLY for authenticated admins (ADMIN_EMAILS) so the founder can analyze
 * users, online/offline counts, revenue, AI costs, and guest funnel inside AI chat.
 */
export async function buildAdminStatsPromptContext(): Promise<string> {
  try {
    const svc = createServiceClient();
    const nowMs = Date.now();
    const todayIso = getTashkentTodayIso();
    const currentMonth = todayIso.slice(0, 7);
    const sevenDaysAgoIso = new Date(nowMs - 7 * 86_400_000).toISOString();
    const thirtyDaysAgoIso = new Date(nowMs - 30 * 86_400_000).toISOString();

    const [usersRes, subsRes, monthRes, dayRes, ordersRes, entitiesRes, eventsRes] =
      await Promise.all([
        svc.auth.admin.listUsers({ page: 1, perPage: 500 }),
        svc.from("subscriptions").select("user_id, plan_id, status, updated_at"),
        svc
          .from("ai_usage_monthly")
          .select("credits_used")
          .eq("period_month", currentMonth),
        svc
          .from("ai_usage_daily")
          .select("credits_used")
          .eq("period_day", todayIso),
        svc.from("billing_orders").select("amount_uzs, status, payment_method"),
        svc.from("business_entities").select("id", { count: "exact", head: true }),
        svc
          .from("analytics_events")
          .select("event_name, page_path")
          .gte("created_at", thirtyDaysAgoIso)
          .limit(3000),
      ]);

    const authUsers = (usersRes.data?.users || []).filter((u) => !isAdminEmail(u.email));
    const subs = subsRes.data || [];
    const subMap = new Map(subs.map((s: any) => [s.user_id, s]));

    let onlineCount = 0;
    let usersToday = 0;
    let usersLast7d = 0;
    const planCounts: Record<PlanId, number> = { starter: 0, professional: 0, pro_plus: 0 };

    for (const u of authUsers) {
      const sub = subMap.get(u.id);
      const lastSignInMs = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
      const lastHbMs = sub?.updated_at ? new Date(sub.updated_at).getTime() : 0;
      const lastSeenMs = Math.max(lastSignInMs, lastHbMs);
      if (lastSeenMs > 0 && nowMs - lastSeenMs <= ONLINE_WINDOW_MS) onlineCount += 1;
      if ((u.created_at || "").startsWith(todayIso)) usersToday += 1;
      if ((u.created_at || "") >= sevenDaysAgoIso) usersLast7d += 1;
      const p = normalizePlanId(sub?.plan_id);
      planCounts[p] += 1;
    }

    const offlineCount = Math.max(0, authUsers.length - onlineCount);
    const monthlyCredits = (monthRes.data || []).reduce(
      (sum: number, r: any) => sum + Number(r.credits_used || 0),
      0
    );
    const dailyCredits = (dayRes.data || []).reduce(
      (sum: number, r: any) => sum + Number(r.credits_used || 0),
      0
    );
    const estAiCostUzs = monthlyCredits * ESTIMATED_COST_PER_CREDIT_UZS;

    let paidRevenueUzs = 0;
    let paidOrders = 0;
    for (const o of ordersRes.data || []) {
      if (o.status === "paid") {
        paidRevenueUzs += Number(o.amount_uzs || 0);
        paidOrders += 1;
      }
    }

    const funnel = { page_view: 0, tool_used: 0, register_clicked: 0, registered: 0 };
    const byPath: Record<string, number> = {};
    for (const ev of eventsRes.data || []) {
      const n = ev.event_name as keyof typeof funnel;
      if (n in funnel) funnel[n] += 1;
      if (ev.event_name === "page_view" && ev.page_path) {
        byPath[ev.page_path] = (byPath[ev.page_path] || 0) + 1;
      }
    }

    const topPages = Object.entries(byPath)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([p, c]) => `${p}=${c}`)
      .join(", ");

    return [
      "ADMIN REJIMI (FAQAT FIRMUS ASOSCHISI UCHUN JONLI STATISTIKA):",
      `- Sana: ${todayIso} | Oy: ${currentMonth}`,
      `- Jami foydalanuvchilar: ${authUsers.length} (Bugun: +${usersToday}, 7 kunda: +${usersLast7d})`,
      `- Online (soʻnggi 15 daq): ${onlineCount} | Offline: ${offlineCount}`,
      `- Tariflar: Starter=${planCounts.starter}, Pro=${planCounts.professional}, Pro+=${planCounts.pro_plus}`,
      `- Jami mijoz korxonalar: ${entitiesRes.count ?? 0}`,
      `- Toʻlangan tushum: ${paidRevenueUzs.toLocaleString("en-US")} soʻm (${paidOrders} ta buyurtma)`,
      `- AI kredit sarfi: oylik ${monthlyCredits} kr (bugun ${dailyCredits} kr) | Taxminiy AI API xarajati: ~${estAiCostUzs.toLocaleString("en-US")} soʻm`,
      `- Mehmon voronkasi (30 kun): koʻrish=${funnel.page_view}, vosita=${funnel.tool_used}, reg_bosgan=${funnel.register_clicked}, roʻyxat=${funnel.registered}`,
      `- Eng koʻp koʻrilgan sahifalar: ${topPages || "hali maʼlumot yoʻq"}`,
      "Admin sayt statistikasi, daromad, konversiya, foydalanuvchilar yoki biznes oʻsishi haqida soʻrasa, aynan shu jonli raqamlarga tayanib chuqur va amaliy tahlil bering.",
    ].join("\n");
  } catch (err) {
    console.error("[admin-stats-context] failed:", err);
    return "";
  }
}
