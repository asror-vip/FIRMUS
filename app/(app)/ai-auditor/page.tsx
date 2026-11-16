"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchExceptions,
  resolveExceptionInDb,
  createJournalEntryRecord,
  isValidUuid,
} from "@/lib/services/supabase-service";
import { useAppState } from "@/lib/mock/store";
import { ExceptionItem } from "@/lib/mock/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
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

function AiAuditorContent() {
  const searchParams = useSearchParams();
  const targetExcId = searchParams.get("id");
  const { currentEntity } = useAppState();
  const { t } = useTranslation();

  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [selectedExc, setSelectedExc] = useState<ExceptionItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isMounted = true;
    if (!currentEntity?.id) return;
    setIsLoading(true);
    fetchExceptions(currentEntity.id)
      .then((data) => {
        if (!isMounted) return;
        setExceptions(data);
        if (targetExcId) {
          const match = data.find((e) => e.id === targetExcId);
          setSelectedExc(match || data[0] || null);
        } else {
          setSelectedExc(data[0] || null);
        }
      })
      .catch((err) => console.error("Error loading exceptions:", err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentEntity?.id, targetExcId]);

  const handleRecheck = async () => {
    if (!currentEntity?.id) return;
    setIsLoading(true);
    try {
      const data = await fetchExceptions(currentEntity.id);
      setExceptions(data);
      if (data.length > 0 && !data.some((d) => d.id === selectedExc?.id)) {
        setSelectedExc(data[0]);
      }
      const openCnt = data.filter((e) => e.status === "open").length;
      toast.success(`AI Auditor tekshiruvi yakunlandi: ${openCnt} ta ochiq va ${data.length} ta jami yozuv aniqlandi.`);
    } catch (err: any) {
      toast.error("Tekshiruv xatosi: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = exceptions.filter((exc) => {
    if (filterSeverity !== "all" && exc.severity !== filterSeverity) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!exc.title.toLowerCase().includes(q) && !exc.description.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const handleResolve = async (exc: ExceptionItem, action: "approve" | "reject", customLabel?: string) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      if (action === "approve" && exc.amount && exc.amount > 0 && isValidUuid(currentEntity?.id)) {
        await createJournalEntryRecord({
          entityId: currentEntity.id,
          entryNumber: `JE-AUD-${exc.id.slice(0, 6).toUpperCase()}`,
          entryDate: new Date().toISOString().split("T")[0],
          description: `AI Auditor tuzatuvchi provodkasi: ${exc.title}`,
          debitAccountCode: "6010",
          debitAccountName: "Mol yetkazib beruvchilarga toʻlanadigan schyotlar",
          creditAccountCode: "5110",
          creditAccountName: "Hisob-kitob schyoti (Milliy valyutada)",
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

      toast.success(
        customLabel ||
          (action === "approve"
            ? "AI tavsiyasi maʼqullandi va tuzatuvchi provodka Bosh kitobga (Ledger) saqlandi!"
            : "Istisno rad etildi va koʻrib chiqish (in_review) holatiga oʻtkazildi.")
      );
    } catch (err: any) {
      toast.error("Amalni bajarishda xatolik: " + (err.message || "Xatolik"));
    } finally {
      setIsMutating(false);
    }
  };

  const openCount = exceptions.filter((e) => e.status === "open").length;
  const critCount = exceptions.filter((e) => e.severity === "critical").length;
  const resolvedCount = exceptions.filter((e) => e.status === "resolved").length;

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
              24/7 Monitoring
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
          Qayta tekshirish
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground">Ochiq shubhalar</span>
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
            <span className="text-xs text-muted-foreground">Hal qilingan</span>
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
              <option value="warning">Ogohlantirish</option>
              <option value="info">Info</option>
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
                Ushbu korxona uchun mos xatoliklar topilmadi.
              </div>
            )}
          </div>
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
                        <span className="text-[10px] text-muted-foreground block">Manba tizim:</span>
                        <span className="font-medium text-foreground">{selectedExc.evidence.sourceSystem}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Hujjat / Tranzaksiya ID:</span>
                        <span className="font-mono text-foreground">{selectedExc.evidence.referenceId}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Tafsilotlar:</span>
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
                      "Masʼul bosh buxgalterga shaxsiy koʻrik uchun («in_review») yuborildi!"
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
                    {selectedExc.status === "resolved" ? "Hal qilingan" : t.pages.aiAuditor.approveButton}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-xs">
              Tafsilotlarni koʻrish uchun roʻyxatdan istisno tanlang
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AiAuditorPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground">
          AI Auditor yuklanmoqda...
        </div>
      }
    >
      <AiAuditorContent />
    </React.Suspense>
  );
}
