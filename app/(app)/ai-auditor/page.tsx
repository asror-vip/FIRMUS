"use client";

import React, { useState } from "react";
import { mockExceptions } from "@/lib/mock/exceptions";
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
  Filter,
  AlertTriangle,
  FileText,
  Building,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AiAuditorPage() {
  const { t } = useTranslation();
  const [exceptions, setExceptions] = useState<ExceptionItem[]>(mockExceptions);
  const [selectedExc, setSelectedExc] = useState<ExceptionItem>(mockExceptions[0]);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = exceptions.filter((exc) => {
    if (filterSeverity !== "all" && exc.severity !== filterSeverity) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!exc.title.toLowerCase().includes(q) && !exc.description.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  const handleResolve = (id: string, action: "approve" | "reject") => {
    toast.success(
      action === "approve"
        ? "AI tavsiyasi maʼqullandi! Tuzatuvchi provodka 1C va Didox ga yuborildi."
        : "Istisno rad etildi va qoʻlda qayta koʻrib chiqishga belgilandi."
    );
    setExceptions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "resolved" } : e))
    );
  };

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
              GPT-6 Luna
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.aiAuditor.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => toast.info(t.pages.aiAuditor.recheck)}
          >
            {t.pages.aiAuditor.recheck}
          </Button>
        </div>
      </div>

      {/* Split View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Col (5 cols): Exceptions List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.pages.aiAuditor.searchPlaceholder}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="h-8 rounded-lg border border-input bg-card px-2 text-xs text-foreground"
            >
              <option value="all">{t.pages.aiAuditor.tabs.all}</option>
              <option value="critical">{t.pages.aiAuditor.tabs.critical}</option>
              <option value="warning">{t.pages.aiAuditor.tabs.warning}</option>
              <option value="info">{t.pages.aiAuditor.tabs.info}</option>
            </select>
          </div>

          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {filtered.map((exc) => {
              const isSelected = selectedExc?.id === exc.id;
              return (
                <div
                  key={exc.id}
                  onClick={() => setSelectedExc(exc)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-indigo-500/5 shadow-sm"
                      : "border-border bg-card hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <StatusPill status={exc.severity} />
                    <span className="text-[10px] font-mono text-muted-foreground">{exc.date}</span>
                  </div>

                  <h4 className="font-semibold text-xs text-foreground line-clamp-2 leading-snug">
                    {exc.title}
                  </h4>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-[11px]">
                    <span className="text-muted-foreground truncate max-w-[160px]">
                      {exc.entityName}
                    </span>
                    {exc.amount ? (
                      <span className="font-mono font-bold text-foreground">
                        <Money amount={exc.amount} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col (7 cols): Selected Exception Detail View */}
        <div className="lg:col-span-7">
          {selectedExc ? (
            <Card className="h-full flex flex-col justify-between">
              <div>
                <CardHeader className="pb-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <StatusPill status={selectedExc.severity} />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Hujjat №{selectedExc.evidence.referenceId || selectedExc.id.replace("exc-", "")}
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold mt-2">
                    {selectedExc.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {selectedExc.entityName} • {selectedExc.date}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5 pt-4 text-xs">
                  {/* Problem Description */}
                  <div>
                    <span className="font-semibold text-foreground text-xs block mb-1">
                      {t.pages.aiAuditor.problemTitle}
                    </span>
                    <p className="text-muted-foreground leading-relaxed text-xs">
                      {selectedExc.description}
                    </p>
                  </div>

                  {/* Evidence Box */}
                  <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
                    <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      {t.pages.aiAuditor.evidenceTitle}
                    </span>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Source & Doc:</span>
                        <span className="font-mono font-medium text-foreground">
                          {selectedExc.evidence.sourceSystem}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t.common.description}:</span>
                        <span className="font-medium text-foreground text-right max-w-xs">
                          {selectedExc.evidence.details}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Suggestion Card */}
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                        <Sparkles className="h-4 w-4" />
                        <span>{t.pages.aiAuditor.aiSuggestionTitle}</span>
                      </div>
                      <Badge variant="indigo" className="text-[10px] px-2 py-0.5">
                        {selectedExc.aiConfidence}% {t.pages.aiAuditor.confidence}
                      </Badge>
                    </div>

                    <p className="text-xs text-foreground leading-relaxed pt-1">
                      {selectedExc.aiSuggestion}
                    </p>

                    {/* AI Confidence Meter Bar */}
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
                  onClick={() => toast.info(t.pages.aiAuditor.forwardToAccountant)}
                >
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                  {t.pages.aiAuditor.forwardToAccountant}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-rose-600"
                    onClick={() => handleResolve(selectedExc.id, "reject")}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    {t.pages.aiAuditor.rejectButton}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleResolve(selectedExc.id, "approve")}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {t.pages.aiAuditor.approveButton}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-xs">
              Chap tomondagi roʻyxatdan birorta istisnoni tanlang.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
