"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchExceptionsPaginated,
  fetchExceptionSummaryCounts,
  fetchAiActionLogsPaginated,
  resolveExceptionInDb,
  createJournalEntryRecord,
  isValidUuid,
} from "@/lib/services/supabase-service";
import { useAppState } from "@/lib/context/app-state";
import { ExceptionItem } from "@/lib/types/accounting";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { PaginationBar } from "@/components/shared/pagination-bar";
import {
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  XCircle,
  UserCheck,
  Search,
  AlertTriangle,
  FileText,
  Building,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getReconcileErpDict, getIntlLocale } from "@/lib/i18n/domains/reconcile-erp";
import { cn } from "@/lib/utils";

interface AiActionLog {
  id: string;
  business_entity_id: string;
  actor_user_id: string;
  action_type: string;
  target_id: string | null;
  summary: string;
  payload?: any;
  model_used: string;
  decision: "approved" | "rejected" | "failed";
  error_message?: string | null;
  created_at: string;
}

function AiAuditorContent() {
  const searchParams = useSearchParams();
  const targetExcId = searchParams.get("id");
  const { currentEntity } = useAppState();
  const { t, locale } = useTranslation();
  const dict = getReconcileErpDict(locale);
  const d = dict.erpExtra.aiAuditor;
  const intlLocale = getIntlLocale(locale);

  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [totalExceptionsCount, setTotalExceptionsCount] = useState(0);
  const [excPage, setExcPage] = useState(1);
  const [excCounts, setExcCounts] = useState({ open: 0, critical: 0, resolved: 0, total: 0 });
  const [selectedExc, setSelectedExc] = useState<ExceptionItem | null>(null);
  const [actionLogs, setActionLogs] = useState<AiActionLog[]>([]);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const PAGE_SIZE = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadSummaryCounts = useCallback(async (entityId: string) => {
    try {
      const summaryCounts = await fetchExceptionSummaryCounts(entityId);
      setExcCounts(summaryCounts);
      return summaryCounts;
    } catch (err) {
      console.error("Error loading exception summary counts:", err);
      return null;
    }
  }, []);

  const loadExceptions = useCallback(async (
    entityId: string,
    includeSummary = false
  ): Promise<{ open: number; total: number } | null> => {
    setIsLoading(true);
    try {
      const [{ data, count }, summaryCounts] = await Promise.all([
        fetchExceptionsPaginated(entityId, {
          page: excPage,
          pageSize: PAGE_SIZE,
          severity: filterSeverity,
          search: debouncedSearch,
        }),
        includeSummary ? fetchExceptionSummaryCounts(entityId) : Promise.resolve(null),
      ]);
      setExceptions(data);
      setTotalExceptionsCount(count);
      if (summaryCounts) {
        setExcCounts(summaryCounts);
      }
      if (targetExcId) {
        const match = data.find((e) => e.id === targetExcId);
        setSelectedExc(match || data[0] || null);
      } else {
        setSelectedExc((prev) => (prev ? (data.find((e) => e.id === prev.id) || data[0] || null) : (data[0] || null)));
      }
      return summaryCounts ? { open: summaryCounts.open, total: summaryCounts.total } : null;
    } catch (err) {
      console.error("Error loading exceptions:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [targetExcId, excPage, filterSeverity, debouncedSearch]);

  const loadActionLogs = useCallback(async (entityId: string) => {
    if (!isValidUuid(entityId)) return;
    setIsLoadingLogs(true);
    try {
      const { data, count } = await fetchAiActionLogsPaginated(entityId, {
        page: logsPage,
        pageSize: PAGE_SIZE,
      });
      setActionLogs(data as AiActionLog[]);
      setTotalLogsCount(count);
    } catch (err) {
      console.error("Failed to fetch ai action logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [logsPage]);

  useEffect(() => {
    setExcPage(1);
    setLogsPage(1);
  }, [currentEntity?.id]);

  useEffect(() => {
    setExcPage(1);
  }, [filterSeverity, debouncedSearch]);

  useEffect(() => {
    if (!currentEntity?.id) return;
    loadSummaryCounts(currentEntity.id);
  }, [currentEntity?.id, loadSummaryCounts]);

  useEffect(() => {
    if (!currentEntity?.id) return;
    loadExceptions(currentEntity.id);
  }, [currentEntity?.id, loadExceptions]);

  useEffect(() => {
    if (!currentEntity?.id) return;
    loadActionLogs(currentEntity.id);
  }, [currentEntity?.id, loadActionLogs]);

  useEffect(() => {
    const handleRefresh = () => {
      if (currentEntity?.id) {
        loadExceptions(currentEntity.id);
        loadSummaryCounts(currentEntity.id);
        loadActionLogs(currentEntity.id);
      }
    };

    window.addEventListener("firmus:refresh-data", handleRefresh);
    return () => {
      window.removeEventListener("firmus:refresh-data", handleRefresh);
    };
  }, [currentEntity?.id, loadExceptions, loadSummaryCounts, loadActionLogs]);

  const handleRecheck = async () => {
    if (!currentEntity?.id) return;
    loadActionLogs(currentEntity.id);
    const counts = await loadExceptions(currentEntity.id, true);
    if (counts) {
      toast.success(
        d.toasts.recheckDone
          .replace("{open}", String(counts.open))
          .replace("{total}", String(counts.total))
      );
    }
  };

  const filtered = exceptions;

  const handleResolve = async (exc: ExceptionItem, action: "approve" | "reject", customLabel?: string) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      if (action === "approve" && exc.amount && exc.amount > 0 && isValidUuid(currentEntity?.id)) {
        await createJournalEntryRecord({
          entityId: currentEntity.id,
          entryNumber: `JE-AUD-${exc.id.slice(0, 6).toUpperCase()}`,
          entryDate: new Date().toISOString().split("T")[0],
          description: `${d.correctiveEntryPrefix}: ${exc.title}`,
          debitAccountCode: "6010",
          debitAccountName: d.account6010Name,
          creditAccountCode: "5110",
          creditAccountName: d.account5110Name,
          amount: exc.amount,
          sourceType: "ai_auditor",
          sourceReferenceId: exc.id,
          idempotencyKey: `idem-aud-${exc.id}`,
        });
      }

      if (isValidUuid(exc.id)) {
        await resolveExceptionInDb(exc.id, action);
      }

      const nextStatus = action === "approve" ? "resolved" : "in_review";
      setExceptions((prev) =>
        prev.map((e) => (e.id === exc.id ? { ...e, status: nextStatus } : e))
      );
      setSelectedExc((prev) => (prev?.id === exc.id ? { ...prev, status: nextStatus } : prev));
      if (currentEntity?.id) {
        fetchExceptionSummaryCounts(currentEntity.id).then(setExcCounts);
      }

      toast.success(
        customLabel ||
          (action === "approve"
            ? d.toasts.approvedSuccess
            : d.toasts.rejectedSuccess)
      );
    } catch (err: any) {
      toast.error(d.toasts.actionError.replace("{error}", err.message || d.errorFallback));
    } finally {
      setIsMutating(false);
    }
  };

  const openCount = excCounts.open;
  const critCount = excCounts.critical;
  const resolvedCount = excCounts.resolved;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {t.pages.aiAuditor.title}
            </h1>
            <Badge variant="indigo" className="text-[10px] px-2 py-0.5">
              {d.monitoringBadge}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.aiAuditor.subtitle}
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8 gap-1.5"
          onClick={handleRecheck}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          {d.recheckBtn}
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">{d.openSuspicions}</span>
            <p className="text-xl font-bold font-mono text-foreground mt-0.5">{openCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">{t.statuses.critical}</span>
            <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">{critCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">{d.resolvedCountLabel}</span>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{resolvedCount}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.common.search}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground"
            >
              <option value="all">{t.common.all}</option>
              <option value="critical">{t.statuses.critical}</option>
              <option value="warning">{d.severityWarning}</option>
              <option value="info">{d.severityInfo}</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filtered.length > 0 ? (
              filtered.map((exc) => (
                <div
                  key={exc.id}
                  onClick={() => setSelectedExc(exc)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedExc?.id === exc.id
                      ? "border-indigo-600 bg-indigo-500/5 ring-1 ring-indigo-600"
                      : "border-border bg-card hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <StatusPill status={exc.severity} />
                    <span className="font-mono text-[10px] text-muted-foreground">{exc.date}</span>
                  </div>

                  <h4 className="font-semibold text-xs text-foreground leading-snug line-clamp-1">
                    {exc.title}
                  </h4>

                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {exc.description}
                  </p>

                  <div className="pt-2 mt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-foreground flex items-center gap-1 truncate max-w-[160px]">
                      <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                      {exc.entityName}
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      {exc.amount && (
                        <span className="font-mono font-bold text-foreground">
                          <Money amount={exc.amount} />
                        </span>
                      )}
                      <StatusPill status={exc.status} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                {d.emptyExceptions}
              </div>
            )}
          </div>
          <PaginationBar
            page={excPage}
            pageSize={PAGE_SIZE}
            totalCount={totalExceptionsCount}
            isLoading={isLoading}
            itemLabel={d.exceptionItemLabel}
            className="rounded-lg border border-border bg-card"
            onPageChange={setExcPage}
          />
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-7">
          {selectedExc ? (
            <Card className="h-full flex flex-col justify-between">
              <div>
                <CardHeader className="pb-4 border-b border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusPill status={selectedExc.severity} />
                      <StatusPill status={selectedExc.status} />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      ID: {selectedExc.id} • {selectedExc.date}
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground leading-snug">
                    {selectedExc.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground pt-1">
                    {selectedExc.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 space-y-5 text-xs">
                  {/* Evidence Box */}
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
                    <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      {t.pages.aiAuditor.evidenceTitle}
                    </span>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">{d.sourceSystemLabel}</span>
                        <span className="font-medium text-foreground">{selectedExc.evidence.sourceSystem}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">{d.referenceIdLabel}</span>
                        <span className="font-mono text-foreground">{selectedExc.evidence.referenceId}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] text-muted-foreground block">{d.detailsLabel}</span>
                      <span className="text-foreground leading-relaxed">{selectedExc.evidence.details}</span>
                    </div>
                  </div>

                  {/* AI Recommendation Box */}
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        {t.pages.aiAuditor.aiSuggestionTitle}
                      </span>
                      <Badge variant="indigo" className="text-[10px] font-mono">
                        {selectedExc.aiConfidence}% {t.pages.aiAuditor.confidence}
                      </Badge>
                    </div>
                    <p className="text-foreground leading-relaxed">{selectedExc.aiSuggestion}</p>

                    <div className="pt-2">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>{t.pages.aiAuditor.confidence}</span>
                        <span className="font-mono">{selectedExc.aiConfidence}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${selectedExc.aiConfidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-muted/10">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={isMutating}
                  onClick={() =>
                    handleResolve(
                      selectedExc,
                      "reject",
                      d.forwardSuccessMsg
                    )
                  }
                >
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                  {t.pages.aiAuditor.forwardToAccountant}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-rose-600"
                    disabled={isMutating}
                    onClick={() => handleResolve(selectedExc, "reject")}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    {t.pages.aiAuditor.rejectButton}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={isMutating || selectedExc.status === "resolved"}
                    onClick={() => handleResolve(selectedExc, "approve")}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {selectedExc.status === "resolved" ? d.resolvedBtn : t.pages.aiAuditor.approveButton}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-xs">
              {d.selectPrompt}
            </div>
          )}
        </div>
      </div>

      {/* AI Agent Harakatlar Jurnali (Audit Trail) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              {d.auditTrailTitle}
            </CardTitle>
            <CardDescription className="text-xs">
              {d.auditTrailDesc}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => currentEntity?.id && loadActionLogs(currentEntity.id)}
            disabled={isLoadingLogs}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isLoadingLogs && "animate-spin")} />
            {d.refreshBtn}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
              {d.loadingLogs}
            </div>
          ) : actionLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              {d.emptyLogs}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="pb-2 font-medium">{d.colTime}</th>
                    <th className="pb-2 font-medium">{d.colActionType}</th>
                    <th className="pb-2 font-medium">{d.colSummary}</th>
                    <th className="pb-2 font-medium">{d.colModel}</th>
                    <th className="pb-2 font-medium text-right">{d.colDecision}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {actionLogs.map((log) => {
                    const badgeVariant =
                      log.decision === "approved"
                        ? "success"
                        : log.decision === "rejected"
                        ? "destructive"
                        : "warning";

                    return (
                      <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString(intlLocale, {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="font-mono text-[11px] font-semibold bg-muted px-1.5 py-0.5 rounded">
                            {log.action_type}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 font-medium text-foreground max-w-md">
                          <div className="truncate" title={log.summary}>
                            {log.summary}
                          </div>
                          {log.error_message && (
                            <div className="text-[10px] text-destructive truncate">{log.error_message}</div>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap text-[11px] font-mono">
                          {log.model_used}
                        </td>
                        <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                          <Badge variant={badgeVariant} className="text-[10px] px-2 py-0.5">
                            {log.decision}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <PaginationBar
            page={logsPage}
            pageSize={PAGE_SIZE}
            totalCount={totalLogsCount}
            isLoading={isLoadingLogs}
            itemLabel={d.logItemLabel}
            className="mt-2"
            onPageChange={setLogsPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AiAuditorLoadingFallback() {
  const { locale } = useTranslation();
  const dict = getReconcileErpDict(locale);
  return <div className="p-8 text-center text-xs text-muted-foreground">{dict.commonLoading}</div>;
}

export default function AiAuditorPage() {
  return (
    <React.Suspense fallback={<AiAuditorLoadingFallback />}>
      <AiAuditorContent />
    </React.Suspense>
  );
}
