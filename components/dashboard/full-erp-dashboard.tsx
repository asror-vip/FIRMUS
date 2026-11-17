"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuickEntityBanner } from "@/components/shared/quick-entity-banner";
import { Money } from "@/components/shared/money";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchRecentTransactions,
  fetchTransactionCounts,
  fetchExceptionsPaginated,
  fetchExceptionSummaryCounts,
  fetchTrialBalance,
} from "@/lib/services/supabase-service";
import { cacheKeys, peekQueryCache } from "@/lib/cache/query-cache";
import { useAppState } from "@/lib/context/app-state";
import { formatUzsByLocale } from "@/lib/config/plans";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getBillingHomeDict, getIntlLocale } from "@/lib/i18n/domains/billing-home";
import {
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  TrendingUp,
  Scale,
  Camera,
  Calculator,
  History,
  ArrowUpRight,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function computeVatNetPayable(tb: any[]): number {
  const row6410 = (tb || []).find((r: any) => r.account_code === "6410");
  const row4410 = (tb || []).find((r: any) => r.account_code === "4410");
  const vatOut = Number(row6410?.period_credit || 0);
  const vatIn = Number(row4410?.period_debit || 0);
  return Math.max(0, vatOut - vatIn);
}

function StatusDot({ status }: { status: string }) {
  const norm = String(status || "").toLowerCase();
  let dotClass = "bg-muted-foreground/60";
  let label = status;

  if (["success", "posted", "paid", "resolved"].includes(norm)) {
    dotClass = "bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]";
    label = norm === "posted" ? "Provodka" : "Yechilgan";
  } else if (["pending", "in_review", "syncing"].includes(norm)) {
    dotClass = "bg-purple-300 shadow-[0_0_6px_rgba(192,132,252,0.4)]";
    label = "Kutilmoqda";
  } else if (["critical", "high", "failed", "rejected"].includes(norm)) {
    dotClass = "bg-rose-400/90 shadow-[0_0_6px_rgba(244,63,94,0.35)]";
    label = norm === "critical" ? "Kritik" : "Xatolik";
  } else if (["medium", "warning"].includes(norm)) {
    dotClass = "bg-violet-300/80";
    label = "Oʻrta";
  } else if (["low", "info"].includes(norm)) {
    dotClass = "bg-indigo-300/80";
    label = "Past";
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span>{label}</span>
    </span>
  );
}

function CircularGauge({
  percent,
  label,
  color = "#8B5CF6",
  trackColor = "rgba(139,92,246,0.15)",
}: {
  percent: number;
  label: string;
  color?: string;
  trackColor?: string;
}) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-14 w-14 flex items-center justify-center">
        <svg className="h-14 w-14 -rotate-90" viewBox="0 0 54 54">
          <circle
            cx="27"
            cy="27"
            r={radius}
            fill="transparent"
            stroke={trackColor}
            strokeWidth="4"
          />
          <circle
            cx="27"
            cy="27"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute font-mono text-[11px] font-bold text-foreground">
          {percent}%
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium mt-1 truncate max-w-[80px] text-center">
        {label}
      </span>
    </div>
  );
}

export function FullErpDashboard() {
  const router = useRouter();
  const { currentEntity, toggleAiDrawer } = useAppState();
  const { t, locale } = useTranslation();
  const erp = getBillingHomeDict(locale).home.erp;
  const intlLocale = getIntlLocale(locale);
  const entityId = currentEntity?.id;

  const [transactions, setTransactions] = useState<any[]>(() =>
    entityId ? peekQueryCache<any[]>(cacheKeys.recentTransactions(entityId, 100))?.data ?? [] : []
  );
  const [recentExceptions, setRecentExceptions] = useState<any[]>(() =>
    entityId
      ? peekQueryCache<{ data: any[]; count: number }>(
          cacheKeys.exceptionsPaginated(entityId, {
            page: 1,
            pageSize: 5,
            severity: "all",
            search: "",
          })
        )?.data.data ?? []
      : []
  );
  const [txCounts, setTxCounts] = useState(() =>
    entityId
      ? peekQueryCache<{ total: number; posted: number; pending: number }>(
          cacheKeys.transactionCounts(entityId)
        )?.data ?? { total: 0, posted: 0, pending: 0 }
      : { total: 0, posted: 0, pending: 0 }
  );
  const [excCounts, setExcCounts] = useState(() =>
    entityId
      ? peekQueryCache<{ open: number; critical: number; resolved: number; total: number }>(
          cacheKeys.exceptionCounts(entityId)
        )?.data ?? { open: 0, critical: 0, resolved: 0, total: 0 }
      : { open: 0, critical: 0, resolved: 0, total: 0 }
  );
  const [vatNetPayable, setVatNetPayable] = useState<number>(() => {
    if (!entityId) return 0;
    const cachedTb = peekQueryCache<any[]>(cacheKeys.trialBalance(entityId));
    return cachedTb ? computeVatNetPayable(cachedTb.data) : 0;
  });

  useEffect(() => {
    let isMounted = true;
    if (!currentEntity?.id) {
      setTransactions([]);
      setRecentExceptions([]);
      setTxCounts({ total: 0, posted: 0, pending: 0 });
      setExcCounts({ open: 0, critical: 0, resolved: 0, total: 0 });
      setVatNetPayable(0);
      return;
    }

    const cachedTxs = peekQueryCache<any[]>(
      cacheKeys.recentTransactions(currentEntity.id, 100)
    );
    const cachedTxCounts = peekQueryCache<{ total: number; posted: number; pending: number }>(
      cacheKeys.transactionCounts(currentEntity.id)
    );
    const cachedExcs = peekQueryCache<{ data: any[]; count: number }>(
      cacheKeys.exceptionsPaginated(currentEntity.id, {
        page: 1,
        pageSize: 5,
        severity: "all",
        search: "",
      })
    );
    const cachedExcCounts = peekQueryCache<{
      open: number;
      critical: number;
      resolved: number;
      total: number;
    }>(cacheKeys.exceptionCounts(currentEntity.id));
    const cachedTb = peekQueryCache<any[]>(cacheKeys.trialBalance(currentEntity.id));

    if (cachedTxs) setTransactions(cachedTxs.data || []);
    if (cachedTxCounts) setTxCounts(cachedTxCounts.data);
    if (cachedExcs) setRecentExceptions(cachedExcs.data.data || []);
    if (cachedExcCounts) setExcCounts(cachedExcCounts.data);
    if (cachedTb) setVatNetPayable(computeVatNetPayable(cachedTb.data));

    Promise.all([
      fetchRecentTransactions(currentEntity.id, 100),
      fetchTransactionCounts(currentEntity.id),
      fetchExceptionsPaginated(currentEntity.id, { page: 1, pageSize: 5 }),
      fetchExceptionSummaryCounts(currentEntity.id),
      fetchTrialBalance(currentEntity.id),
    ]).then(([txs, countsTx, excsPage, countsExc, tb]) => {
      if (!isMounted) return;
      setTransactions(txs || []);
      setTxCounts(countsTx);
      setRecentExceptions(excsPage?.data || []);
      setExcCounts(countsExc);
      setVatNetPayable(computeVatNetPayable(tb || []));
    });

    return () => {
      isMounted = false;
    };
  }, [currentEntity?.id]);

  const pendingApprovals = transactions.filter((tx) => tx.status === "pending").slice(0, 5);
  const totalPendingCount = txCounts.pending;
  const postedCount = txCounts.posted;
  const automatedRate =
    txCounts.total > 0 ? ((postedCount / txCounts.total) * 100).toFixed(1) : "100.0";

  const openExceptionsCount = excCounts.open;

  // Build real cashflow chart series grouped by date
  const cashFlowData = useMemo(() => {
    const cashFlowMap = new Map<string, { date: string; income: number; expense: number }>();
    for (const tx of [...transactions].sort((a, b) => a.date.localeCompare(b.date))) {
      const existing = cashFlowMap.get(tx.date) || { date: tx.date, income: 0, expense: 0 };
      if (tx.type === "income") existing.income += tx.amount;
      else existing.expense += tx.amount;
      cashFlowMap.set(tx.date, existing);
    }
    return Array.from(cashFlowMap.values());
  }, [transactions]);

  return (
    <div className="space-y-5 pb-6">
      {/* 1. Page Header (Sleek Datara Bar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
              {t.dashboard.title}
            </h1>
            {(currentEntity?.tradeName || currentEntity?.name) && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-border/60 bg-muted/30 text-muted-foreground font-medium">
                {currentEntity?.tradeName || currentEntity?.name}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/assistant?tab=history")}
            className="text-xs h-8 gap-1.5 border-border/60 hover:bg-muted/40 transition-colors"
          >
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            {erp.savedHistoryBtn}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/reconcile")}
            className="text-xs h-8 gap-1.5 border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-300"
          >
            <Scale className="h-3.5 w-3.5" />
            {erp.reconcileHeaderBtn}
          </Button>
          <Button
            size="sm"
            onClick={toggleAiDrawer}
            className="text-xs h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(139,92,246,0.25)]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t.aiDrawer.title}
          </Button>
        </div>
      </div>

      <QuickEntityBanner />

      {/* 2. Datara Unified Metric Ribbon (Seamless continuous stats, ZERO separate box wrappers) */}
      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm divide-y sm:divide-y-0 sm:divide-x divide-border/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden">
        {/* KPI 1: Automated Rate */}
        <button
          type="button"
          onClick={() => router.push("/accounting")}
          className="p-5 text-left hover:bg-muted/30 transition-colors group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {t.dashboard.kpiAutomated}
            </span>
            <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {automatedRate}%
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
            <CheckCircle2 className="h-3.5 w-3.5 text-violet-400 shrink-0" />
            <span className="truncate">
              {erp.postedOperationsSub
                .replace("{posted}", String(postedCount))
                .replace("{total}", String(txCounts.total))}
            </span>
          </div>
        </button>

        {/* KPI 2: Approvals */}
        <button
          type="button"
          onClick={() => router.push("/transactions?tab=pending")}
          className="p-5 text-left hover:bg-muted/30 transition-colors group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {t.dashboard.kpiApprovals}
            </span>
            <span className="h-2 w-2 rounded-full bg-purple-300 shadow-[0_0_8px_rgba(192,132,252,0.5)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {totalPendingCount}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
            <Clock className="h-3.5 w-3.5 text-purple-300 shrink-0" />
            <span className="truncate">{t.dashboard.kpiApprovalsSub}</span>
          </div>
        </button>

        {/* KPI 3: Exceptions */}
        <button
          type="button"
          onClick={() => router.push("/ai-auditor")}
          className="p-5 text-left hover:bg-muted/30 transition-colors group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {t.dashboard.kpiExceptions}
            </span>
            <span className="h-2 w-2 rounded-full bg-violet-400/80 shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {openExceptionsCount}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
            <ShieldAlert className="h-3.5 w-3.5 text-violet-300 shrink-0" />
            <span className="truncate">{t.dashboard.kpiExceptionsSub}</span>
          </div>
        </button>

        {/* KPI 4: Net VAT */}
        <button
          type="button"
          onClick={() => router.push("/tax")}
          className="p-5 text-left hover:bg-muted/30 transition-colors group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {erp.netVatTitle}
            </span>
            <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground truncate">
            {formatUzsByLocale(Math.round(vatNetPayable), locale)}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
            <Scale className="h-3.5 w-3.5 text-violet-400 shrink-0" />
            <span className="truncate">{erp.netVatSub}</span>
          </div>
        </button>
      </div>

      {/* 3. Fast Actions Segmented Bar (Replacing bulky cards) */}
      <div className="rounded-xl border border-border/50 bg-card/25 backdrop-blur-sm divide-y md:divide-y-0 md:divide-x divide-border/50 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
        <button
          type="button"
          onClick={() => router.push("/reconcile")}
          className="p-3.5 px-4 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
              <Scale className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground group-hover:text-violet-300 transition-colors truncate">
                {erp.quickCards.reconcileTitle}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {erp.quickCards.reconcileDesc}
              </div>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:translate-x-0.5 group-hover:text-foreground transition-all shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => router.push("/assistant?tab=scan")}
          className="p-3.5 px-4 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <Camera className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground group-hover:text-purple-300 transition-colors truncate">
                {erp.quickCards.scanTitle}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {erp.quickCards.scanDesc}
              </div>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:translate-x-0.5 group-hover:text-foreground transition-all shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => router.push("/assistant?tab=calc")}
          className="p-3.5 px-4 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
              <Calculator className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground group-hover:text-violet-300 transition-colors truncate">
                {erp.quickCards.calcTitle}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {erp.quickCards.calcDesc}
              </div>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:translate-x-0.5 group-hover:text-foreground transition-all shrink-0" />
        </button>
      </div>

      {/* 4. Row 2: Unified Analytics & Workflow Panel (2-in-1 Container) */}
      <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border/50 overflow-hidden">
        {/* Left 2/3: Pure Minimalist Cashflow AreaChart */}
        <div className="lg:col-span-2 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t.dashboard.cashflowTitle}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t.dashboard.cashflowSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
                <span className="text-muted-foreground">{t.common.income}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span className="text-muted-foreground">{t.common.expense}</span>
              </div>
            </div>
          </div>

          <div className="h-[250px] w-full pt-2">
            {cashFlowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}m`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border border-violet-500/30 bg-[#151322]/95 backdrop-blur-md p-2.5 shadow-xl text-xs space-y-1">
                            <p className="font-mono text-muted-foreground text-[10px]">
                              {payload[0].payload.date}
                            </p>
                            <p className="text-violet-400 font-mono font-medium">
                              {t.common.income}: {Number(payload[0].value || 0).toLocaleString(intlLocale)} {t.common.currency}
                            </p>
                            <p className="text-indigo-300 font-mono font-medium">
                              {t.common.expense}: {Number(payload[1].value || 0).toLocaleString(intlLocale)} {t.common.currency}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#8B5CF6"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, stroke: "#8B5CF6", strokeWidth: 2, fill: "#0D0B14" }}
                    activeDot={{ r: 5, stroke: "#A78BFA", strokeWidth: 2, fill: "#8B5CF6" }}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#6366F1"
                    strokeWidth={1.8}
                    strokeDasharray="3 3"
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground font-mono">
                {erp.emptyCashflow}
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3: Quick Accountant Workflows & Radial Gauges */}
        <div className="p-5 flex flex-col justify-between">
          <div className="pb-3 border-b border-border/40">
            <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground/80 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              {erp.quickWorkflowsTitle}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {erp.quickWorkflowsSubtitle}
            </p>
          </div>

          <div className="space-y-1 py-2">
            <button
              type="button"
              onClick={() => router.push("/reconcile")}
              className="w-full text-left p-2.5 rounded-lg hover:bg-muted/40 transition-colors flex items-center justify-between group"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground group-hover:text-violet-400 transition-colors">
                  {erp.workflows.reconcileTitle}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{erp.workflows.reconcileSub}</div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => router.push("/accounting")}
              className="w-full text-left p-2.5 rounded-lg hover:bg-muted/40 transition-colors flex items-center justify-between group"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground group-hover:text-violet-400 transition-colors">
                  {erp.workflows.trialBalanceTitle}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{erp.workflows.trialBalanceSub}</div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => router.push("/tax")}
              className="w-full text-left p-2.5 rounded-lg hover:bg-muted/40 transition-colors flex items-center justify-between group"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground group-hover:text-violet-400 transition-colors">
                  {erp.workflows.taxFinanceTitle}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{erp.workflows.taxFinanceSub}</div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="w-full text-left p-2.5 rounded-lg hover:bg-muted/40 transition-colors flex items-center justify-between group"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground group-hover:text-violet-400 transition-colors">
                  {erp.workflows.entitySettingsTitle}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">{erp.workflows.entitySettingsSub}</div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all shrink-0" />
            </button>
          </div>

          {/* Reference Radial Circular Health Gauges */}
          <div className="pt-3 pb-1 border-t border-border/40 grid grid-cols-2 gap-2 items-center justify-center">
            <CircularGauge
              percent={Math.round(Number(automatedRate))}
              label="Avtomatika"
              color="#8B5CF6"
              trackColor="rgba(139,92,246,0.15)"
            />
            <CircularGauge
              percent={openExceptionsCount === 0 ? 100 : Math.max(30, 100 - openExceptionsCount * 10)}
              label="Audit Salomatlik"
              color="#A78BFA"
              trackColor="rgba(167,139,250,0.15)"
            />
          </div>

          <div className="pt-2 border-t border-border/30 text-[11px] text-muted-foreground/70 flex items-center justify-between">
            <span>21-BHMS / Soliq kodeksi</span>
            <span className="font-mono text-[10px]">v2.6</span>
          </div>
        </div>
      </div>

      {/* 5. Row 3: Approvals & Exceptions (Edge-to-Edge Data Tables, No Box Bloat) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Approvals Table */}
        <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 pb-3 flex items-center justify-between border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{t.dashboard.pendingApprovalsTitle}</span>
              {totalPendingCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 font-medium">
                  {totalPendingCount}
                </span>
              )}
            </div>
            <Link
              href="/transactions?tab=pending"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {t.common.details} <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase">{t.common.date}</TableHead>
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase">{t.common.counterparty}</TableHead>
                  <TableHead className="text-right text-[11px] font-medium text-muted-foreground uppercase">{t.common.amount}</TableHead>
                  <TableHead className="text-right text-[11px] font-medium text-muted-foreground uppercase">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.map((tx) => (
                    <TableRow key={tx.id} className="border-border/30 hover:bg-muted/30 transition-colors">
                      <TableCell className="text-[11px] font-mono text-muted-foreground py-3">{tx.date}</TableCell>
                      <TableCell className="max-w-[180px] py-3">
                        <div className="font-medium text-xs text-foreground truncate">{tx.counterparty}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{tx.description}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono py-3">
                        <Money amount={tx.amount} type={tx.type} />
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs hover:bg-violet-500/10 hover:text-violet-300"
                          onClick={() => router.push(`/transactions?id=${tx.id}`)}
                        >
                          {t.common.details}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground font-mono">
                      {erp.emptyPendingApprovals}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Exceptions Table */}
        <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden flex flex-col justify-between">
          <div className="p-4 pb-3 flex items-center justify-between border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{t.dashboard.recentExceptionsTitle}</span>
              {openExceptionsCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30 font-medium">
                  {openExceptionsCount}
                </span>
              )}
            </div>
            <Link
              href="/ai-auditor"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              {t.nav.aiAuditor} <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase">{t.common.status}</TableHead>
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase">{t.common.description}</TableHead>
                  <TableHead className="text-right text-[11px] font-medium text-muted-foreground uppercase">{t.common.amount}</TableHead>
                  <TableHead className="text-right text-[11px] font-medium text-muted-foreground uppercase">{t.common.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExceptions.length > 0 ? (
                  recentExceptions.map((exc) => (
                    <TableRow
                      key={exc.id}
                      className="cursor-pointer border-border/30 hover:bg-muted/30 transition-colors"
                      onClick={() => router.push(`/ai-auditor?id=${exc.id}`)}
                    >
                      <TableCell className="py-3">
                        <StatusDot status={exc.severity} />
                      </TableCell>
                      <TableCell className="max-w-[200px] py-3">
                        <div className="font-medium text-xs text-foreground truncate">{exc.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {exc.counterparty || exc.evidence?.sourceSystem}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono py-3">
                        {exc.amount ? <Money amount={exc.amount} /> : "—"}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <StatusDot status={exc.status} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground font-mono">
                      {erp.emptyExceptions}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* 6. Bottom Datara Glass Strip (AI Recommendation) */}
      <div className="rounded-xl border border-violet-500/25 bg-violet-600/[0.04] backdrop-blur-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-400 mt-0.5">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider font-mono">
                {t.dashboard.aiRecommendationTitle}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-3xl">
              {erp.aiVatCalloutPrefix.replace("{entity}", currentEntity?.name || "")}
              <strong className="text-foreground font-mono mx-1">
                {new Intl.NumberFormat(intlLocale).format(Math.round(vatNetPayable))} {t.common.currency}
              </strong>
              {erp.aiVatCalloutMid}
              <strong className="text-foreground font-mono mx-1">
                {erp.aiVatCalloutCountSuffix.replace("{count}", String(openExceptionsCount))}
              </strong>
              {erp.aiVatCalloutEnd}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={toggleAiDrawer}
            className="text-xs h-7 px-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_12px_rgba(139,92,246,0.3)]"
          >
            {t.common.view}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FullErpDashboard;
