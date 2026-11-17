"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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
  ArrowUpRight,
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
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      title: solo.tools.reconcileTitle,
      desc: solo.tools.reconcileDesc,
      href: "/reconcile",
      icon: Scale,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: solo.tools.scanTitle,
      desc: solo.tools.scanDesc,
      href: "/assistant?tab=scan",
      icon: Camera,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    },
    {
      title: solo.tools.calcTitle,
      desc: solo.tools.calcDesc,
      href: "/assistant?tab=calc",
      icon: Calculator,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      title: solo.tools.contractTitle,
      desc: solo.tools.contractDesc,
      href: "/assistant?tab=contract",
      icon: FileWarning,
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    },
    {
      title: solo.tools.historyTitle,
      desc: solo.tools.historyDesc,
      href: "/assistant?tab=history",
      icon: History,
      color: "text-slate-400 bg-muted/40 border-border/60",
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-sans">
            {solo.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {solo.subtitle}
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
            {solo.savedHistoryBtn}
          </Button>
          <Button
            size="sm"
            onClick={toggleAiDrawer}
            className="text-xs h-8 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-none"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {solo.firmusAiBtn}
          </Button>
        </div>
      </div>

      {/* 2. Unified Metric Ribbon */}
      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm divide-y sm:divide-y-0 sm:divide-x divide-border/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden">
        <button
          type="button"
          onClick={() => router.push("/assistant?tab=history")}
          className="p-5 text-left hover:bg-muted/30 transition-colors group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {solo.kpi.monthlyWorksTitle}
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {isLoading ? "…" : String(usage.monthlyBatches)}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
            <FileStack className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{solo.kpi.monthlyWorksSub}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/assistant")}
          className="p-5 text-left hover:bg-muted/30 transition-colors group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {solo.kpi.aiChatsTitle}
            </span>
            <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {isLoading ? "…" : String(usage.aiThreadsCount)}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
            <MessageSquare className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{solo.kpi.aiChatsSub}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/assistant?tab=history")}
          className="p-5 text-left hover:bg-muted/30 transition-colors group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {solo.kpi.totalWorksTitle}
            </span>
            <span className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {isLoading ? "…" : String(totalBatches)}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
            <CheckCircle2 className="h-3.5 w-3.5 text-sky-500 shrink-0" />
            <span className="truncate">{solo.kpi.totalWorksSub}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/billing")}
          className="p-5 text-left hover:bg-muted/30 transition-colors group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
              {solo.kpi.currentPlanTitle}
            </span>
            <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground truncate">
            {planName}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
            <CreditCard className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="truncate">
              {subscription.trialAvailable ? solo.kpi.trialAvailableSub : solo.kpi.managePlanSub}
            </span>
          </div>
        </button>
      </div>

      {/* 3. Integrated Tools Grid (Clean 6-segment container, No heavy separate cards) */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground/80">
          {solo.toolsSectionTitle}
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/25 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x lg:divide-x-0 divide-border/50 overflow-hidden">
          {tools.map((tool, idx) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.href}
                type="button"
                onClick={() => router.push(tool.href)}
                className={`p-5 text-left hover:bg-muted/30 transition-colors group flex flex-col justify-between ${
                  idx < 3 ? "lg:border-b border-border/50" : ""
                } ${idx % 3 !== 2 ? "lg:border-r border-border/50" : ""}`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${tool.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {tool.title}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {tool.desc}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-2 border-t border-border/30 text-[11px] font-medium text-primary flex items-center gap-1">
                  <span>{solo.openCta}</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Saved Works (Edge-to-Edge Data Table) */}
      <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden flex flex-col justify-between">
        <div className="p-4 pb-3 flex items-center justify-between border-b border-border/40">
          <div>
            <div className="text-sm font-semibold text-foreground">{solo.recentWorks.title}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {solo.recentWorks.subtitle}
            </p>
          </div>
          <Link
            href="/assistant?tab=history"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {solo.recentWorks.viewAll} <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="p-0 overflow-x-auto">
          {recentBatches.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground font-mono">
              {isLoading ? solo.recentWorks.loading : solo.recentWorks.empty}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase">{solo.recentWorks.colMonth}</TableHead>
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase">{solo.recentWorks.colType}</TableHead>
                  <TableHead className="text-[11px] font-medium text-muted-foreground uppercase">{solo.recentWorks.colName}</TableHead>
                  <TableHead className="text-right text-[11px] font-medium text-muted-foreground uppercase">{solo.recentWorks.colAction}</TableHead>
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
                    <TableRow key={item.id} className="border-border/30 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-[11px] text-muted-foreground py-3 whitespace-nowrap">
                        {item.periodMonth}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-3 whitespace-nowrap">
                        {typeLabel}
                      </TableCell>
                      <TableCell className="font-medium text-xs max-w-[320px] truncate py-3">
                        {item.title}
                      </TableCell>
                      <TableCell className="text-right py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1.5 px-2 hover:bg-muted/60"
                          onClick={() => router.push(targetHref)}
                        >
                          <FolderOpen className="h-3 w-3 text-muted-foreground" />
                          <span>{solo.recentWorks.openBtn}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
