"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockTransactions } from "@/lib/mock/transactions";
import { mockExceptions } from "@/lib/mock/exceptions";
import { mockIntegrations } from "@/lib/mock/integrations";
import { mockCashFlowData } from "@/lib/mock/finance";
import { useAppState } from "@/lib/mock/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Cable,
  Building,
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

  const pendingApprovals = mockTransactions
    .filter((tx) => tx.status === "pending")
    .slice(0, 5);

  const recentExceptions = mockExceptions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              {t.dashboard.title}
            </h1>
            <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium px-2 py-0.5 rounded-full">
              {currentEntity.tradeName || currentEntity.name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.dashboard.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/transactions")}
            className="text-xs h-8"
          >
            {t.nav.transactions}
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

      {/* Row 1: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t.dashboard.kpiAutomated}
          value="90.4%"
          subtitle={t.dashboard.kpiAutomatedSub}
          trend={{ value: "+4.2%", isPositive: true }}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        />

        <KpiCard
          title={t.dashboard.kpiApprovals}
          value="17"
          subtitle={t.dashboard.kpiApprovalsSub}
          badge={<StatusPill status="pending" label="17" />}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          onClick={() => router.push("/transactions?tab=pending")}
        />

        <KpiCard
          title={t.dashboard.kpiExceptions}
          value="6"
          subtitle={t.dashboard.kpiExceptionsSub}
          badge={<StatusPill status="exception" label="6" />}
          icon={<ShieldAlert className="h-4 w-4 text-rose-500" />}
          onClick={() => router.push("/ai-auditor")}
        />

        <KpiCard
          title={t.dashboard.kpiIntegrations}
          value="3 / 4"
          subtitle={t.dashboard.kpiIntegrationsSub}
          badge={
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {t.common.sync}
            </div>
          }
          icon={<Cable className="h-4 w-4 text-indigo-500" />}
          onClick={() => router.push("/integrations")}
        />
      </div>

      {/* Row 2: Charts & Integrations Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: 30-Day Cash Flow Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                {t.dashboard.cashflowTitle}
              </CardTitle>
              <CardDescription>
                {t.dashboard.cashflowSubtitle}
              </CardDescription>
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={mockCashFlowData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
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
                              {t.common.income}: {payload[0].value?.toLocaleString()} {t.common.currency}
                            </p>
                            <p className="text-indigo-600 dark:text-indigo-400">
                              {t.common.expense}: {payload[1].value?.toLocaleString()} {t.common.currency}
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
            </div>
          </CardContent>
        </Card>

        {/* Right 1/3: Integrations Live Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>{t.dashboard.integrationsTitle}</span>
              <Link
                href="/integrations"
                className="text-xs font-normal text-primary hover:underline flex items-center gap-0.5"
              >
                {t.common.all} <ArrowRight className="h-3 w-3" />
              </Link>
            </CardTitle>
            <CardDescription>{t.pages.integrations.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {mockIntegrations.slice(0, 4).map((integ) => (
              <div
                key={integ.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      integ.status === "connected"
                        ? "bg-emerald-500"
                        : integ.status === "error"
                        ? "bg-rose-500 animate-pulse"
                        : "bg-slate-400"
                    }`}
                  />
                  <div className="truncate">
                    <p className="text-xs font-medium text-foreground truncate">
                      {integ.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {integ.lastSyncTime}
                    </p>
                  </div>
                </div>

                <StatusPill status={integ.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Pending Approvals & Recent Exceptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Pending Approvals Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">
                {t.dashboard.pendingApprovalsTitle}
              </CardTitle>
              <CardDescription>
                {t.dashboard.kpiApprovalsSub}
              </CardDescription>
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
                {pendingApprovals.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {tx.date}
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <div className="font-medium text-foreground truncate">{tx.counterparty}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {tx.description}
                      </div>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right: Recent Exceptions Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold">
                {t.dashboard.recentExceptionsTitle}
              </CardTitle>
              <CardDescription>
                {t.pages.aiAuditor.subtitle}
              </CardDescription>
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
                {recentExceptions.map((exc) => (
                  <TableRow
                    key={exc.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/ai-auditor?id=${exc.id}`)}
                  >
                    <TableCell>
                      <StatusPill status={exc.severity} />
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="font-medium text-foreground truncate">{exc.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {exc.counterparty || exc.evidence.sourceSystem}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {exc.amount ? <Money amount={exc.amount} /> : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusPill status={exc.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Strip: AI Recommendation Callout */}
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
              <span className="text-[10px] text-muted-foreground">• 14:32</span>
            </div>
            <p className="text-xs text-foreground mt-0.5 leading-relaxed max-w-3xl">
              Noyabr oyi QQS boʻyicha hisobga olinadigan (zachyot) summa <strong>34,850,000 {t.common.currency}</strong>ni tashkil etmoqda. 1 ta hisob-faktura (Universal Logistics) toʻlovi bilan nomutanosib. Uni tasdiqlashdan avval tuzatuvchi E-SF soʻrash tavsiya etiladi.
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
