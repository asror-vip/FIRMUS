"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KpiCard } from "@/components/shared/kpi-card";
import { QuickEntityBanner } from "@/components/shared/quick-entity-banner";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchRecentTransactions,
  fetchTransactionCounts,
  fetchExceptionsPaginated,
  fetchExceptionSummaryCounts,
  fetchTrialBalance,
} from "@/lib/services/supabase-service";
import { useAppState } from "@/lib/context/app-state";
import { useTranslation } from "@/lib/i18n/useTranslation";
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

export default function DashboardPage() {
  const router = useRouter();
  const { currentEntity, toggleAiDrawer } = useAppState();
  const { t } = useTranslation();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [recentExceptions, setRecentExceptions] = useState<any[]>([]);
  const [txCounts, setTxCounts] = useState({ total: 0, posted: 0, pending: 0 });
  const [excCounts, setExcCounts] = useState({ open: 0, critical: 0, resolved: 0, total: 0 });
  const [vatNetPayable, setVatNetPayable] = useState<number>(0);

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

      const row6410 = (tb || []).find((r: any) => r.account_code === "6410");
      const row4410 = (tb || []).find((r: any) => r.account_code === "4410");
      const vatOut = Number(row6410?.period_credit || 0);
      const vatIn = Number(row4410?.period_debit || 0);
      setVatNetPayable(Math.max(0, vatOut - vatIn));
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
  const cashFlowMap = new Map<string, { date: string; income: number; expense: number }>();
  for (const tx of [...transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    const existing = cashFlowMap.get(tx.date) || { date: tx.date, income: 0, expense: 0 };
    if (tx.type === "income") existing.income += tx.amount;
    else existing.expense += tx.amount;
    cashFlowMap.set(tx.date, existing);
  }
  const cashFlowData = Array.from(cashFlowMap.values());

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              {t.dashboard.title}
            </h1>
            {(currentEntity?.tradeName || currentEntity?.name) && (
              <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium px-2 py-0.5 rounded-full">
                {currentEntity?.tradeName || currentEntity?.name}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.dashboard.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/assistant?tab=history")}
            className="text-xs h-8 gap-1.5"
          >
            <History className="h-3.5 w-3.5" />
            Saqlangan tarix
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/reconcile")}
            className="text-xs h-8 gap-1.5 border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          >
            <Scale className="h-3.5 w-3.5" />
            Bank ↔ 1C AI Sverka
          </Button>
          <Button
            size="sm"
            onClick={toggleAiDrawer}
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t.aiDrawer.title}
          </Button>
        </div>
      </div>

      <QuickEntityBanner />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 transition-colors">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Scale className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Bank ↔ 1C Sverka</span>
            </div>
            <Button
              size="sm"
              onClick={() => router.push("/reconcile")}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shrink-0"
            >
              Ochish <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/60 transition-colors">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Camera className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Faktura / Chek Skaner</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/assistant?tab=scan")}
              className="text-xs h-8 gap-1 border-indigo-500/40 shrink-0"
            >
              Yuklash <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border hover:border-primary/50 transition-colors">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
              <Calculator className="h-4 w-4 text-primary shrink-0" />
              <span>Kalkulyator va Soliq AI</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/assistant?tab=calc")}
              className="text-xs h-8 gap-1 shrink-0"
            >
              Ochish <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: 4 Real Live KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t.dashboard.kpiAutomated}
          value={`${automatedRate}%`}
          subtitle={`${postedCount} / ${txCounts.total} ta operatsiya oʻtkazilgan`}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          onClick={() => router.push("/accounting")}
        />

        <KpiCard
          title={t.dashboard.kpiApprovals}
          value={String(totalPendingCount)}
          subtitle={t.dashboard.kpiApprovalsSub}
          badge={<StatusPill status="pending" label={String(totalPendingCount)} />}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          onClick={() => router.push("/transactions?tab=pending")}
        />

        <KpiCard
          title={t.dashboard.kpiExceptions}
          value={String(openExceptionsCount)}
          subtitle={t.dashboard.kpiExceptionsSub}
          badge={<StatusPill status="exception" label={String(openExceptionsCount)} />}
          icon={<ShieldAlert className="h-4 w-4 text-rose-500" />}
          onClick={() => router.push("/ai-auditor")}
        />

        <KpiCard
          title="Sof QQS (6410–4410)"
          value={`${new Intl.NumberFormat("uz-UZ").format(Math.round(vatNetPayable))} soʻm`}
          subtitle="Bosh kitobdagi joriy QQS majburiyati"
          icon={<Scale className="h-4 w-4 text-emerald-500" />}
          onClick={() => router.push("/tax")}
        />
      </div>

      {/* Row 2: Charts & Integrations Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                {t.dashboard.cashflowTitle}
              </CardTitle>
              <CardDescription>{t.dashboard.cashflowSubtitle}</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">{t.common.income}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                <span className="text-muted-foreground">{t.common.expense}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[250px] w-full">
              {cashFlowData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
                            <div className="rounded-lg border border-border bg-card p-2 shadow-md text-xs">
                              <p className="font-semibold text-foreground mb-1">
                                {payload[0].payload.date}
                              </p>
                              <p className="text-emerald-600 dark:text-emerald-400">
                                {t.common.income}: {Number(payload[0].value || 0).toLocaleString()} {t.common.currency}
                              </p>
                              <p className="text-indigo-600 dark:text-indigo-400">
                                {t.common.expense}: {Number(payload[1].value || 0).toLocaleString()} {t.common.currency}
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
                      stroke="#10B981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorExpense)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Ushbu korxona boʻyicha hozircha pul oqimi operatsiyalari mavjud emas.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right 1/3: Quick Accountant Workflows */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tezkor buxgalter amallari</CardTitle>
            <CardDescription>Eng koʻp ishlatiladigan kundalik vazifalar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0 text-xs">
            <button
              type="button"
              onClick={() => router.push("/reconcile")}
              className="w-full text-left p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-foreground">Bank ↔ 1C AI Sverka</div>
                <div className="text-[10px] text-muted-foreground">Fayl yuklab 5 soniyada solishtirish</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/accounting")}
              className="w-full text-left p-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-foreground">Oborot-saldovaya vedomost</div>
                <div className="text-[10px] text-muted-foreground">Qoldiqlar va davr yopish</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/tax")}
              className="w-full text-left p-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-foreground">Soliqlar va Moliya</div>
                <div className="text-[10px] text-muted-foreground">QQS (12%), Balans va Foyda hisoboti</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="w-full text-left p-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-foreground">Korxona sozlamalari</div>
                <div className="text-[10px] text-muted-foreground">STIR, soliq rejimi va tilni boshqarish</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Pending Approvals & Recent Exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">{t.dashboard.pendingApprovalsTitle}</CardTitle>
              <CardDescription>{t.dashboard.kpiApprovalsSub}</CardDescription>
            </div>
            <Link
              href="/transactions?tab=pending"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              {t.common.details} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.date}</TableHead>
                  <TableHead>{t.common.counterparty}</TableHead>
                  <TableHead className="text-right">{t.common.amount}</TableHead>
                  <TableHead className="text-right">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingApprovals.length > 0 ? (
                  pendingApprovals.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-[11px] text-muted-foreground">{tx.date}</TableCell>
                      <TableCell className="max-w-[180px]">
                        <div className="font-medium text-foreground truncate">{tx.counterparty}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{tx.description}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Money amount={tx.amount} type={tx.type} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => router.push(`/transactions?id=${tx.id}`)}
                        >
                          {t.common.details}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                      Tasdiqlashni kutayotgan tranzaksiyalar yoʻq.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">{t.dashboard.recentExceptionsTitle}</CardTitle>
              <CardDescription>{t.pages.aiAuditor.subtitle}</CardDescription>
            </div>
            <Link
              href="/ai-auditor"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              {t.nav.aiAuditor} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead>{t.common.description}</TableHead>
                  <TableHead className="text-right">{t.common.amount}</TableHead>
                  <TableHead className="text-right">{t.common.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExceptions.length > 0 ? (
                  recentExceptions.map((exc) => (
                    <TableRow
                      key={exc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/ai-auditor?id=${exc.id}`)}
                    >
                      <TableCell>
                        <StatusPill status={exc.severity} />
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="font-medium text-foreground truncate">{exc.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {exc.counterparty || exc.evidence?.sourceSystem}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {exc.amount ? <Money amount={exc.amount} /> : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusPill status={exc.status} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                      Ochiq audit xatoliklari topilmadi.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Strip: Live Ledger AI Recommendation Callout */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm mt-0.5">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {t.dashboard.aiRecommendationTitle}
              </span>
            </div>
            <p className="text-xs text-foreground mt-0.5 leading-relaxed max-w-3xl">
              «{currentEntity?.name}» korxonasining Bosh kitobiga (6410–4410 schyotlar) koʻra joriy sof QQS majburiyati{" "}
              <strong>{new Intl.NumberFormat("uz-UZ").format(Math.round(vatNetPayable))} {t.common.currency}</strong> va ochiq istisnolar{" "}
              <strong>{openExceptionsCount} ta</strong>ni tashkil etmoqda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={toggleAiDrawer}
            className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {t.common.view}
          </Button>
        </div>
      </div>
    </div>
  );
}
