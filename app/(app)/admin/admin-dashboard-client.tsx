"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  CreditCard,
  Sparkles,
  Activity,
  RefreshCw,
  Search,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { PlanId } from "@/lib/config/plans";

interface AdminUserRow {
  id: string;
  maskedEmail: string;
  fullName: string;
  createdAt: string;
  lastSignInAt: string | null;
  isOnline: boolean;
  planId: PlanId;
  status: string;
  expiresAt: string | null;
  monthlyCreditsUsed: number;
  dailyCreditsUsed: number;
  entitiesCount: number;
}

interface AdminOrderRow {
  id: string;
  maskedEmail: string;
  planId: PlanId;
  billingCycle: string;
  amountUzs: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface DailyActivityPoint {
  date: string;
  entered: number;
  left: number;
}

interface AdminOverviewData {
  generatedAt: string;
  periodMonth: string;
  todayIso: string;
  adminEmail: string;
  kpis: {
    totalUsers: number;
    usersToday: number;
    usersLast7Days: number;
    onlineCount: number;
    offlineCount: number;
    inactiveCount: number;
    totalEntities: number;
    planCounts: Record<PlanId, number>;
    paidRevenueUzs: number;
    paidOrdersCount: number;
    totalMonthlyCredits: number;
    totalDailyCredits: number;
    estimatedMonthlyAiCostUzs: number;
  };
  dailyActivity: DailyActivityPoint[];
  funnel: {
    page_view: number;
    tool_used: number;
    register_clicked: number;
    registered: number;
  };
  pageViewsByPath: Record<string, number>;
  users: AdminUserRow[];
  recentOrders: AdminOrderRow[];
}

function fmtUzs(value: number): string {
  return `${Math.round(value).toLocaleString("en-US").replace(/,/g, " ")} soʻm`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

const PLAN_LABELS: Record<PlanId, string> = {
  starter: "Starter",
  professional: "Pro",
  pro_plus: "Pro+",
};

export function AdminDashboardClient() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Admin maʼlumotlarini yuklab boʻlmadi");
      }
      const json = (await res.json()) as AdminOverviewData;
      setData(json);
    } catch (err: any) {
      toast.error(err?.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleSetPlan = async (userId: string, planId: PlanId, durationDays = 30) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch("/api/admin/users/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId, durationDays }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Tarifni oʻzgartirib boʻlmadi");
      }
      toast.success(`Tarif ${PLAN_LABELS[planId]} ga oʻzgartirildi`);
      await loadOverview();
    } catch (err: any) {
      toast.error(err?.message || "Xatolik");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.maskedEmail.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.planId.toLowerCase().includes(q)
    );
  }, [data, search]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Maʼlumotlar yuklanmadi.</p>
        <Button size="sm" onClick={() => void loadOverview()}>
          Qayta yuklash
        </Button>
      </div>
    );
  }

  const netMarginEstimate = data.kpis.paidRevenueUzs - data.kpis.estimatedMonthlyAiCostUzs;
  const maxBar = Math.max(
    1,
    ...data.dailyActivity.flatMap((d) => [d.entered, d.left])
  );

  // Donut math for Online (green) vs Offline (red)
  const totalForDonut = Math.max(1, data.kpis.totalUsers);
  const onlinePct = Math.round((data.kpis.onlineCount / totalForDonut) * 100);
  const offlinePct = data.kpis.totalUsers === 0 ? 0 : 100 - onlinePct;
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const onlineDash = (onlinePct / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Faqat Admin ({data.adminEmail})</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FIRMUS — Admin Statistika</h1>
          <p className="text-xs text-muted-foreground">
            Davr: {data.periodMonth} • Bugun: {data.todayIso}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void loadOverview()}
          className="h-8 text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Yangilash
        </Button>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Foydalanuvchilar</span>
            <Users className="h-4 w-4 text-violet-600" />
          </div>
          <div className="text-2xl font-bold font-mono">{data.kpis.totalUsers}</div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Online: {data.kpis.onlineCount}
            </span>
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Offline: {data.kpis.offlineCount}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Bugun: +{data.kpis.usersToday} • Korxonalar: {data.kpis.totalEntities}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tushum va Tariflar</span>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {fmtUzs(data.kpis.paidRevenueUzs)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Toʻlangan buyurtmalar: {data.kpis.paidOrdersCount} ta
          </div>
          <div className="text-[11px] text-muted-foreground">
            Starter: {data.kpis.planCounts.starter} • Pro: {data.kpis.planCounts.professional} • Pro+:{" "}
            {data.kpis.planCounts.pro_plus}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>AI Kredit va Taxminiy Xarajat</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono">
            {data.kpis.totalMonthlyCredits.toLocaleString("en-US")} kr
          </div>
          <div className="text-[11px] text-muted-foreground">
            Bugun: {data.kpis.totalDailyCredits} kr • Taxm. API: ~{fmtUzs(data.kpis.estimatedMonthlyAiCostUzs)}
          </div>
          <div className="text-[11px] font-medium text-foreground">
            Tushum − AI: {fmtUzs(netMarginEstimate)}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Mehmon voronkasi (30 kun)</span>
            <Activity className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold font-mono">{data.funnel.page_view}</div>
          <div className="text-[11px] text-muted-foreground">
            Vosita ishlatgan: {data.funnel.tool_used} • Reg bosgan: {data.funnel.register_clicked}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Roʻyxatdan oʻtgan: {data.funnel.registered}
          </div>
        </div>
      </div>

      {/* Green / Red Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-day Entered (Green) vs Left/Cancelled (Red) Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border/70 bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">Oxirgi 7 kun: Kirganlar vs Chiqib ketganlar</h2>
              <p className="text-[11px] text-muted-foreground">
                Yashil — kirgan/roʻyxatdan oʻtganlar • Qizil — bekor/muddati tugaganlar
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                Kirganlar
              </span>
              <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
                Chiqib ketganlar
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4 border-b border-border/60 pb-2">
            {data.dailyActivity.map((pt) => {
              const enteredH = pt.entered > 0 ? Math.max(10, Math.round((pt.entered / maxBar) * 100)) : 4;
              const leftH = pt.left > 0 ? Math.max(10, Math.round((pt.left / maxBar) * 100)) : 4;
              return (
                <div key={pt.date} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="flex items-end justify-center gap-1 w-full h-32">
                    <div className="flex flex-col items-center gap-0.5 flex-1 max-w-[20px]">
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        {pt.entered}
                      </span>
                      <div
                        className="w-full rounded-t bg-emerald-500/90 transition-all"
                        style={{ height: `${enteredH}%` }}
                        title={`${pt.date}: Kirganlar ${pt.entered}`}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-0.5 flex-1 max-w-[20px]">
                      <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400">
                        {pt.left}
                      </span>
                      <div
                        className="w-full rounded-t bg-rose-500/85 transition-all"
                        style={{ height: `${leftH}%` }}
                        title={`${pt.date}: Chiqib ketganlar ${pt.left}`}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{pt.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Online (Green) vs Offline (Red) Donut Chart */}
        <div className="rounded-xl border border-border/70 bg-card p-5 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-bold">Online va Offline holati</h2>
            <p className="text-[11px] text-muted-foreground">
              Soʻnggi 5 daqiqa ichida faol boʻlganlar
            </p>
          </div>

          <div className="flex items-center justify-center py-2">
            <div className="relative h-32 w-32 flex items-center justify-center">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 110 110">
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-rose-500/80"
                />
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={`${onlineDash} ${circumference}`}
                  strokeLinecap="round"
                  className="text-emerald-500 transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {onlinePct}%
                </span>
                <span className="text-[10px] text-muted-foreground">Online</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2.5">
              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                Online (Yashil)
              </div>
              <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-300">
                {data.kpis.onlineCount} ({onlinePct}%)
              </div>
            </div>
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/25 p-2.5">
              <div className="text-[10px] text-rose-700 dark:text-rose-300 font-medium">
                Offline (Qizil)
              </div>
              <div className="text-base font-bold font-mono text-rose-700 dark:text-rose-300">
                {data.kpis.offlineCount} ({offlinePct}%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page views breakdown */}
      {Object.keys(data.pageViewsByPath).length > 0 && (
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mehmon sahifalar koʻrilishi (oxirgi 30 kun)
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.pageViewsByPath)
              .sort((a, b) => b[1] - a[1])
              .map(([path, count]) => (
                <div
                  key={path}
                  className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-mono"
                >
                  {path}: <span className="font-bold">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Users Table (emails strictly masked) */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Foydalanuvchilar ({filteredUsers.length})</h2>
            <p className="text-[11px] text-muted-foreground">
              Maxfiylik uchun emaillar yarim yashirilgan • Qoʻlda tarif berish (30 kun)
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Email yoki ism boʻyicha qidirish..."
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground">
                <th className="p-3 font-semibold">Foydalanuvchi</th>
                <th className="p-3 font-semibold">Holat</th>
                <th className="p-3 font-semibold">Sana</th>
                <th className="p-3 font-semibold">Tarif</th>
                <th className="p-3 font-semibold">AI (oy / kun)</th>
                <th className="p-3 font-semibold">Korxona</th>
                <th className="p-3 font-semibold text-right">Qoʻlda tarif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredUsers.map((u) => {
                const isBusy = updatingUserId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-muted/20">
                    <td className="p-3">
                      <div className="font-medium font-mono text-foreground">{u.maskedEmail}</div>
                      {u.fullName && (
                        <div className="text-[11px] text-muted-foreground">{u.fullName}</div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {u.isOnline ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                      {fmtDate(u.createdAt)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          u.planId === "pro_plus"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : u.planId === "professional"
                            ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {PLAN_LABELS[u.planId]}
                      </span>
                      {u.expiresAt && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          gacha: {fmtDate(u.expiresAt)}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-mono whitespace-nowrap">
                      {u.monthlyCreditsUsed} / {u.dailyCreditsUsed}
                    </td>
                    <td className="p-3 font-mono">{u.entitiesCount}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant={u.planId === "starter" ? "default" : "outline"}
                          disabled={isBusy}
                          onClick={() => void handleSetPlan(u.id, "starter")}
                          className="h-6 px-2 text-[10px]"
                        >
                          Starter
                        </Button>
                        <Button
                          size="sm"
                          variant={u.planId === "professional" ? "default" : "outline"}
                          disabled={isBusy}
                          onClick={() => void handleSetPlan(u.id, "professional", 30)}
                          className="h-6 px-2 text-[10px]"
                        >
                          Pro 30k
                        </Button>
                        <Button
                          size="sm"
                          variant={u.planId === "pro_plus" ? "default" : "outline"}
                          disabled={isBusy}
                          onClick={() => void handleSetPlan(u.id, "pro_plus", 30)}
                          className="h-6 px-2 text-[10px]"
                        >
                          Pro+ 30k
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    Foydalanuvchi topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Billing Orders */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/60">
          <h2 className="text-sm font-bold">Soʻnggi toʻlovlar ({data.recentOrders.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground">
                <th className="p-3 font-semibold">Sana</th>
                <th className="p-3 font-semibold">Foydalanuvchi</th>
                <th className="p-3 font-semibold">Tarif</th>
                <th className="p-3 font-semibold">Summa</th>
                <th className="p-3 font-semibold">Usul</th>
                <th className="p-3 font-semibold">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                    {fmtDate(o.createdAt)}
                  </td>
                  <td className="p-3 font-mono">{o.maskedEmail}</td>
                  <td className="p-3 whitespace-nowrap">
                    {PLAN_LABELS[o.planId]} ({o.billingCycle})
                  </td>
                  <td className="p-3 font-mono font-semibold whitespace-nowrap">
                    {fmtUzs(o.amountUzs)}
                  </td>
                  <td className="p-3 uppercase text-muted-foreground">{o.paymentMethod}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        o.status === "paid"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Hali toʻlov buyurtmalari yoʻq.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
