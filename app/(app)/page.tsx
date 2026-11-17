"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchWorkBatchesPaginated,
  fetchWorkspaceUsageSummary,
  type WorkBatchRecord,
} from "@/lib/services/supabase-service";
import { cacheKeys, peekQueryCache } from "@/lib/cache/query-cache";
import { useAppState } from "@/lib/context/app-state";
import { FEATURES } from "@/lib/config/features";
import { getLocalizedPlanSpec, normalizePlanId } from "@/lib/config/plans";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getBillingHomeDict } from "@/lib/i18n/domains/billing-home";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Scale,
  Camera,
  Calculator,
  History,
  FileWarning,
  FileStack,
  MessageSquare,
  CreditCard,
  FolderOpen,
} from "lucide-react";

const FullErpDashboard = dynamic(
  () => import("@/components/dashboard/full-erp-dashboard"),
  { ssr: false }
);

export default function DashboardPage() {
  if (!FEATURES.fullAccountingErp) {
    return <SoloToolsHome />;
  }
  return <FullErpDashboard />;
}

function SoloToolsHome() {
  const router = useRouter();
  const { locale } = useTranslation();
  const solo = getBillingHomeDict(locale).home.solo;
  const { currentWorkspace, currentEntity, isContextReady, subscription, toggleAiDrawer } =
    useAppState();
  const initialUsage = isContextReady
    ? peekQueryCache<{ monthlyBatches: number; aiThreadsCount: number }>(
        cacheKeys.usage(currentWorkspace?.id, currentEntity?.id)
      )
    : null;
  const initialBatches =
    isContextReady && currentEntity?.id
      ? peekQueryCache<{ data: WorkBatchRecord[]; count: number }>(
          cacheKeys.workBatches({ entityId: currentEntity.id, page: 1, pageSize: 5 })
        )
      : null;
  const hasInitialCache = Boolean(
    isContextReady && initialUsage && (!currentEntity?.id || initialBatches)
  );

  const [usage, setUsage] = useState(
    () => initialUsage?.data ?? { monthlyBatches: 0, aiThreadsCount: 0 }
  );
  const [recentBatches, setRecentBatches] = useState<WorkBatchRecord[]>(
    () => initialBatches?.data.data ?? []
  );
  const [totalBatches, setTotalBatches] = useState(
    () => initialBatches?.data.count ?? 0
  );
  const [isLoading, setIsLoading] = useState(!hasInitialCache);

  useEffect(() => {
    let isMounted = true;
    if (!isContextReady) return;

    const cachedUsage = peekQueryCache<{ monthlyBatches: number; aiThreadsCount: number }>(
      cacheKeys.usage(currentWorkspace?.id, currentEntity?.id)
    );
    const cachedBatches = currentEntity?.id
      ? peekQueryCache<{ data: WorkBatchRecord[]; count: number }>(
          cacheKeys.workBatches({ entityId: currentEntity.id, page: 1, pageSize: 5 })
        )
      : null;

    if (cachedUsage) {
      setUsage(cachedUsage.data);
    }
    if (cachedBatches) {
      setRecentBatches(cachedBatches.data.data || []);
      setTotalBatches(cachedBatches.data.count || 0);
    } else if (!currentEntity?.id) {
      setRecentBatches([]);
      setTotalBatches(0);
    }

    const hasAllCached = Boolean(cachedUsage && (!currentEntity?.id || cachedBatches));
    setIsLoading(!hasAllCached);

    Promise.all([
      fetchWorkspaceUsageSummary({
        workspaceId: currentWorkspace?.id,
        entityId: currentEntity?.id,
      }),
      currentEntity?.id
        ? fetchWorkBatchesPaginated({ entityId: currentEntity.id, page: 1, pageSize: 5 })
        : Promise.resolve({ data: [], count: 0 }),
    ])
      .then(([summaryRes, batchesRes]) => {
        if (!isMounted) return;
        setUsage(summaryRes);
        setRecentBatches(batchesRes.data || []);
        setTotalBatches(batchesRes.count || 0);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isContextReady, currentWorkspace?.id, currentEntity?.id]);

  const planName = subscription.isTrialActive
    ? solo.planTrialLabel
    : getLocalizedPlanSpec(
        normalizePlanId(subscription.planId || currentWorkspace?.currentPlan),
        locale
      ).name;

  const tools = [
    {
      title: solo.tools.aiChatTitle,
      desc: solo.tools.aiChatDesc,
      href: "/assistant",
      icon: Sparkles,
      accent: "border-indigo-500/30 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400",
    },
    {
      title: solo.tools.reconcileTitle,
      desc: solo.tools.reconcileDesc,
      href: "/reconcile",
      icon: Scale,
      accent: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: solo.tools.scanTitle,
      desc: solo.tools.scanDesc,
      href: "/assistant?tab=scan",
      icon: Camera,
      accent: "border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400",
    },
    {
      title: solo.tools.calcTitle,
      desc: solo.tools.calcDesc,
      href: "/assistant?tab=calc",
      icon: Calculator,
      accent: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    },
    {
      title: solo.tools.contractTitle,
      desc: solo.tools.contractDesc,
      href: "/assistant?tab=contract",
      icon: FileWarning,
      accent: "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400",
    },
    {
      title: solo.tools.historyTitle,
      desc: solo.tools.historyDesc,
      href: "/assistant?tab=history",
      icon: History,
      accent: "border-border bg-muted/30 text-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
            {solo.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {solo.subtitle}
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
            {solo.savedHistoryBtn}
          </Button>
          <Button
            size="sm"
            onClick={toggleAiDrawer}
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {solo.firmusAiBtn}
          </Button>
        </div>
      </div>

      {/* Quick Usage Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={solo.kpi.monthlyWorksTitle}
          value={isLoading ? "…" : String(usage.monthlyBatches)}
          subtitle={solo.kpi.monthlyWorksSub}
          icon={<FileStack className="h-4 w-4 text-emerald-500" />}
          onClick={() => router.push("/assistant?tab=history")}
        />
        <KpiCard
          title={solo.kpi.aiChatsTitle}
          value={isLoading ? "…" : String(usage.aiThreadsCount)}
          subtitle={solo.kpi.aiChatsSub}
          icon={<MessageSquare className="h-4 w-4 text-indigo-500" />}
          onClick={() => router.push("/assistant")}
        />
        <KpiCard
          title={solo.kpi.totalWorksTitle}
          value={isLoading ? "…" : String(totalBatches)}
          subtitle={solo.kpi.totalWorksSub}
          icon={<CheckCircle2 className="h-4 w-4 text-sky-500" />}
          onClick={() => router.push("/assistant?tab=history")}
        />
        <KpiCard
          title={solo.kpi.currentPlanTitle}
          value={planName}
          subtitle={
            subscription.trialAvailable
              ? solo.kpi.trialAvailableSub
              : solo.kpi.managePlanSub
          }
          icon={<CreditCard className="h-4 w-4 text-amber-500" />}
          onClick={() => router.push("/billing")}
        />
      </div>

      {/* Tools Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{solo.toolsSectionTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card
                key={tool.href}
                onClick={() => router.push(tool.href)}
                className="cursor-pointer border-border hover:border-indigo-500/40 hover:shadow-sm transition-all group"
              >
                <CardContent className="p-4 flex flex-col justify-between gap-3 h-full">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tool.accent}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {tool.title}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {tool.desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                      {solo.openCta} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Saved Works */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{solo.recentWorks.title}</CardTitle>
            <CardDescription className="text-xs">
              {solo.recentWorks.subtitle}
            </CardDescription>
          </div>
          <Link
            href="/assistant?tab=history"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {solo.recentWorks.viewAll} <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {recentBatches.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {isLoading ? solo.recentWorks.loading : solo.recentWorks.empty}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{solo.recentWorks.colMonth}</TableHead>
                  <TableHead>{solo.recentWorks.colType}</TableHead>
                  <TableHead>{solo.recentWorks.colName}</TableHead>
                  <TableHead className="text-right">{solo.recentWorks.colAction}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBatches.map((item) => {
                  const typeLabel =
                    item.batchType === "reconcile"
                      ? solo.recentWorks.typeReconcile
                      : item.batchType === "contract_risk"
                      ? solo.recentWorks.typeContract
                      : solo.recentWorks.typeReceipt;
                  const targetHref =
                    item.batchType === "reconcile"
                      ? `/reconcile?batchId=${encodeURIComponent(item.id)}`
                      : `/assistant?tab=history&batchId=${encodeURIComponent(item.id)}`;

                  return (
                    <TableRow key={item.id} className="text-xs">
                      <TableCell className="font-mono text-[11px] whitespace-nowrap">
                        {item.periodMonth}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {typeLabel}
                      </TableCell>
                      <TableCell className="font-medium max-w-[320px] truncate">
                        {item.title}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] gap-1 px-2"
                          onClick={() => router.push(targetHref)}
                        >
                          <FolderOpen className="h-3 w-3" />
                          {solo.recentWorks.openBtn}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
