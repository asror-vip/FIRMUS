"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAppState } from "@/lib/context/app-state";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { parseStatementFileBuffer } from "@/lib/services/reconcile-engine";
import {
  TAX_ESTIMATE_DISCLAIMER,
  applyAccountantRowOverride,
  computePeriodTurnoverAndTax,
  extractTaxSourceRows,
  type TaxDocumentSourceKind,
  type TaxRowCategory,
  type TaxSourceRow,
} from "@/lib/services/turnover-tax-engine";
import type { ParsedBankTransaction } from "@/lib/services/bank-import";
import type { TaxpayerStatus } from "@/lib/services/uz-tax-calculator";
import {
  extractAnonymizedFileBlueprint,
  detectLearnedSchemaMatch,
  fetchLearnedSchemasForEntity,
  saveLearnedSchemaForEntity,
  getProfileOptionsForSource,
  type AnonymizedFileBlueprint,
  type DocumentSourceType,
  type LearnedDocumentSchema,
} from "@/lib/services/onec-profiles";
import { Money } from "@/components/shared/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Play,
  RotateCcw,
  FileSpreadsheet,
  ExternalLink,
  Loader2,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

type TraceFilter = "all" | "included_revenue" | "excluded_non_revenue" | "unconfirmed" | "ambiguous";

const CATEGORY_LABELS: Record<TaxRowCategory, string> = {
  taxable_revenue: "Daromad (aylanmaga kiradi)",
  non_revenue_credit: "Bank krediti (daromad emas)",
  non_revenue_own_transfer: "Oʻz hisobi oʻtkazmasi (daromad emas)",
  non_revenue_refund: "Qaytarilgan pul (daromad emas)",
  non_revenue_loan: "Qarz / taʼsischi ulushi (daromad emas)",
  ambiguous: "Noaniq (tekshiring)",
  expense: "Chiqim (aylanmaga kirmaydi)",
};

const SOURCE_LABELS: Record<TaxDocumentSourceKind, string> = {
  bank: "Bank",
  didox: "Didox",
  onec: "1C",
};

const SAMPLE_BANK_DOCS: ParsedBankTransaction[] = [
  {
    date: "2026-11-03",
    counterparty: "BARAKA SAVDO MCHJ",
    counterpartyStir: "305112233",
    amount: 420_000_000,
    type: "income",
    description: "Shartnoma №14 boʻyicha tovar sotuvi tushumi",
    accountCode: "4010",
    accountName: "Xaridorlar",
  },
  {
    date: "2026-11-06",
    counterparty: "ATB KAPITALBANK",
    counterpartyStir: "201020304",
    amount: 150_000_000,
    type: "income",
    description: "Aylanma mablagʻ uchun bank krediti transh №2",
    accountCode: "6810",
    accountName: "Kreditlar",
  },
  {
    date: "2026-11-09",
    counterparty: "OʻZ HISOBIMIZDAN",
    counterpartyStir: "300000001",
    amount: 65_000_000,
    type: "income",
    description: "Oʻz hisobdan hisobga pul oʻtkazish (ichki)",
    accountCode: "5110",
    accountName: "Hisob-kitob schyoti",
  },
  {
    date: "2026-11-12",
    counterparty: "TEZKOR YETKAZISH MCHJ",
    counterpartyStir: "304556677",
    amount: 18_500_000,
    type: "income",
    description: "Bekor qilingan buyurtma boʻyicha qaytarilgan pul (vozvrat)",
    accountCode: "6010",
    accountName: "Yetkazib beruvchilar",
  },
  {
    date: "2026-11-14",
    counterparty: "KARIMOV A. (TAʼSISCHI)",
    amount: 40_000_000,
    type: "income",
    description: "Foizsiz qarz (moliyaviy yordam) shartnoma №3",
    accountCode: "6820",
    accountName: "Qarzlar",
  },
  {
    date: "2026-11-16",
    counterparty: "HUMO / UZCARD TERMINAL",
    amount: 310_000_000,
    type: "income",
    description: "Terminal orqali savdo tushumi",
    accountCode: "5110",
    accountName: "Hisob-kitob schyoti",
  },
  {
    date: "2026-11-17",
    counterparty: "NUR INVEST MCHJ",
    counterpartyStir: "308778899",
    amount: 90_000_000,
    type: "income",
    description: "Pul oʻtkazmasi №77",
    accountCode: "4010",
    accountName: "Xaridorlar",
  },
  {
    date: "2026-11-18",
    counterparty: "IJARA MARKAZI MCHJ",
    amount: 25_000_000,
    type: "expense",
    description: "Ofis ijarasi uchun toʻlov",
    accountCode: "6010",
    accountName: "Yetkazib beruvchilar",
  },
];

const SAMPLE_DIDOX_DOCS: ParsedBankTransaction[] = [
  {
    date: "2026-11-15",
    counterparty: "SHARQ LOGISTIKA MCHJ",
    counterpartyStir: "302334455",
    amount: 100_000_000,
    type: "income",
    description: "Hisob-faktura №8812 xizmat koʻrsatish",
    accountCode: "4010",
    accountName: "Xaridorlar",
  },
];

export default function TurnoverTaxAutoPage() {
  const { currentEntity } = useAppState();
  const { locale } = useTranslation();

  const bankInputRef = useRef<HTMLInputElement | null>(null);
  const didoxInputRef = useRef<HTMLInputElement | null>(null);
  const oneCInputRef = useRef<HTMLInputElement | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);

  const [rows, setRows] = useState<TaxSourceRow[]>([]);
  const [priorYtdInput, setPriorYtdInput] = useState("0");
  const [traceFilter, setTraceFilter] = useState<TraceFilter>("all");
  const [traceNotice, setTraceNotice] = useState<string | null>(null);
  const [isAiClassifying, setIsAiClassifying] = useState(false);

  // Stage 5: Self-learning schema state for Bank / Didox / 1C
  const [learnedSchemas, setLearnedSchemas] = useState<LearnedDocumentSchema[]>([]);
  const [pendingBlueprint, setPendingBlueprint] = useState<{
    fileName: string;
    blueprint: AnonymizedFileBlueprint;
    selectedSourceType: DocumentSourceType;
    selectedProfileId: string;
  } | null>(null);
  const [matchedSchemaLabel, setMatchedSchemaLabel] = useState<string | null>(null);
  const [isSavingSchema, setIsSavingSchema] = useState(false);

  // Reset uploaded rows cleanly when switching active client in Topbar
  useEffect(() => {
    setRows([]);
    setTraceFilter("all");
    setTraceNotice(null);
    setPendingBlueprint(null);
    setMatchedSchemaLabel(null);
    if (!currentEntity?.id) {
      setLearnedSchemas([]);
      return;
    }
    fetchLearnedSchemasForEntity(currentEntity.id)
      .then((list) => setLearnedSchemas(list))
      .catch(() => setLearnedSchemas([]));
  }, [currentEntity?.id]);

  const taxpayerStatus: TaxpayerStatus =
    currentEntity?.taxpayerStatus ??
    (currentEntity?.companyType === "YaTT"
      ? "yatt"
      : currentEntity?.companyType === "Oʻzini band"
      ? "self_employed"
      : "llc");

  const taxRegime = currentEntity?.taxRegime ?? "turnover_tax";
  const isVatPayer = Boolean(currentEntity?.isVatPayer ?? taxRegime === "vat_profit_tax");

  const summary = useMemo(
    () =>
      computePeriodTurnoverAndTax({
        rows,
        profile: {
          taxpayerStatus,
          taxRegime,
          isVatPayer,
          entityStir: currentEntity?.tinStir,
        },
        priorYtdTurnoverUzs: parseFloat(priorYtdInput) || 0,
      }),
    [rows, taxpayerStatus, taxRegime, isVatPayer, currentEntity?.tinStir, priorYtdInput]
  );

  const handleUpload = async (sourceType: TaxDocumentSourceKind, file?: File) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseStatementFileBuffer(buffer, file.name);
      if (parsed.length === 0) {
        toast.error("Fayldan qatorlar topilmadi. Formatni tekshiring (.xlsx, .csv, .txt).");
        return;
      }
      const extracted = extractTaxSourceRows({
        items: parsed,
        sourceType,
        fileName: file.name,
        entityStir: currentEntity?.tinStir,
      });
      setRows((prev) => [...prev, ...extracted]);
      toast.success(`${file.name}: ${extracted.length} ta qator qoʻshildi.`);

      // Inspect anonymized column blueprint for Bank / Didox / 1C
      const bp = await extractAnonymizedFileBlueprint(buffer, file.name, sourceType);
      const matched = detectLearnedSchemaMatch(bp, learnedSchemas);
      if (matched) {
        setMatchedSchemaLabel(`${matched.versionLabel} (${matched.columnHeaders.length} ustun)`);
        setPendingBlueprint(null);
      } else {
        const clientHasChosen1C =
          bp.sourceType === "onec" &&
          currentEntity?.oneCProfileId &&
          currentEntity.oneCProfileId !== "universal_excel_csv";

        if (bp.autoConfirmed || clientHasChosen1C) {
          const autoProfileId = clientHasChosen1C
            ? (currentEntity.oneCProfileId as string)
            : bp.suggestedProfileId;
          const autoLabel = bp.suggestedVersionLabel;

          if (currentEntity?.id) {
            try {
              const saved = await saveLearnedSchemaForEntity({
                entityId: currentEntity.id,
                sourceType: bp.sourceType,
                profileId: autoProfileId,
                versionLabel: autoLabel,
                blueprint: bp,
              });
              setLearnedSchemas((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
              setMatchedSchemaLabel(`${saved.versionLabel} (${saved.columnHeaders.length} ustun)`);
              setPendingBlueprint(null);
              return;
            } catch {
              // Fall back to showing auto-detected label even if offline
            }
          }
          setMatchedSchemaLabel(`${autoLabel} (${bp.columnHeaders.length} ustun)`);
          setPendingBlueprint(null);
        } else {
          setMatchedSchemaLabel(null);
          setPendingBlueprint({
            fileName: file.name,
            blueprint: bp,
            selectedSourceType: "onec",
            selectedProfileId: bp.suggestedProfileId,
          });
        }
      }
    } catch {
      toast.error("Faylni oʻqishda xatolik yuz berdi.");
    }
  };

  const handleSaveTaxBlueprint = async () => {
    if (!pendingBlueprint || !currentEntity?.id) {
      toast.error("Qolipni saqlash uchun avval mijozni tanlang.");
      return;
    }
    setIsSavingSchema(true);
    try {
      const opts = getProfileOptionsForSource(pendingBlueprint.selectedSourceType);
      const chosen = opts.find((o) => o.id === pendingBlueprint.selectedProfileId) ?? opts[0];
      const saved = await saveLearnedSchemaForEntity({
        entityId: currentEntity.id,
        sourceType: pendingBlueprint.selectedSourceType,
        profileId: chosen.id,
        versionLabel: chosen.label,
        blueprint: {
          ...pendingBlueprint.blueprint,
          sourceType: pendingBlueprint.selectedSourceType,
        },
      });
      setLearnedSchemas((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
      setMatchedSchemaLabel(`${saved.versionLabel} (${saved.columnHeaders.length} ustun)`);
      setPendingBlueprint(null);
      toast.success(`Hujjat qolipi (${chosen.shortLabel}) bazaga saqlandi!`);
    } catch (err: any) {
      toast.error(err?.message || "Qolipni saqlashda xatolik");
    } finally {
      setIsSavingSchema(false);
    }
  };

  const handleLoadSample = () => {
    const bankRows = extractTaxSourceRows({
      items: SAMPLE_BANK_DOCS,
      sourceType: "bank",
      fileName: "bank_2026_11.xlsx",
      entityStir: currentEntity?.tinStir,
    });
    const didoxRows = extractTaxSourceRows({
      items: SAMPLE_DIDOX_DOCS,
      sourceType: "didox",
      fileName: "didox_faktura_2026_11.xlsx",
      entityStir: currentEntity?.tinStir,
    });
    setRows([...bankRows, ...didoxRows]);
    setTraceFilter("all");
    setTraceNotice(null);
    toast.success("Namuna bank va Didox hujjatlari yuklandi — daromad boʻlmagan qatorlarni tekshiring.");
  };

  const handleCategoryChange = (rowId: string, nextCategory: TaxRowCategory) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? applyAccountantRowOverride(r, nextCategory) : r))
    );
  };

  const handleConfirmRow = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              needsConfirmation: false,
              confirmedByAccountant: true,
              classificationSource: "accountant",
            }
          : r
      )
    );
  };

  const handleAiClassifyAmbiguous = async () => {
    const ambiguous = rows.filter((r) => r.category === "ambiguous");
    if (ambiguous.length === 0) {
      toast.info("Noaniq qatorlar topilmadi.");
      return;
    }

    setIsAiClassifying(true);
    try {
      const res = await fetch("/api/tax-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: ambiguous.slice(0, 25).map((r) => ({
            id: r.id,
            description: `${r.counterparty} — ${r.description}`,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "AI tasniflash amalga oshmadi.");
        return;
      }

      const suggestions: Array<{ id: string; category: TaxRowCategory; reason: string }> =
        Array.isArray(data?.suggestions) ? data.suggestions : [];

      if (suggestions.length === 0) {
        toast.info("AI aniq taklif bera olmadi — qatorlarni qoʻlda tanlang.");
        return;
      }

      const map = new Map(suggestions.map((s) => [s.id, s]));
      setRows((prev) =>
        prev.map((r) => {
          const hit = map.get(r.id);
          if (!hit) return r;
          return {
            ...r,
            category: hit.category,
            includeInTurnover: hit.category === "taxable_revenue",
            needsConfirmation: true,
            confirmedByAccountant: false,
            classificationSource: "ai_estimate",
            aiNote: hit.reason,
          };
        })
      );
      toast.success(
        `${suggestions.length} ta noaniq qatorga AI taxminiy tasnif berdi — tasdiqlab chiqing.`
      );
    } finally {
      setIsAiClassifying(false);
    }
  };

  const focusTrace = (filter: TraceFilter, label: string) => {
    setTraceFilter(filter);
    setTraceNotice(label);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filteredRows = useMemo(() => {
    if (traceFilter === "included_revenue") {
      const set = new Set(summary.trace.includedRevenueRowIds);
      return rows.filter((r) => set.has(r.id));
    }
    if (traceFilter === "excluded_non_revenue") {
      const set = new Set(summary.trace.excludedNonRevenueRowIds);
      return rows.filter((r) => set.has(r.id));
    }
    if (traceFilter === "unconfirmed") {
      const set = new Set(summary.trace.unconfirmedRowIds);
      return rows.filter((r) => set.has(r.id));
    }
    if (traceFilter === "ambiguous") {
      const set = new Set(summary.trace.ambiguousRowIds);
      return rows.filter((r) => set.has(r.id));
    }
    return rows;
  }, [rows, traceFilter, summary.trace]);

  const statusLabel =
    taxpayerStatus === "yatt"
      ? "YaTT"
      : taxpayerStatus === "self_employed"
      ? "Oʻzini oʻzi band"
      : "MChJ / Yuridik shaxs";

  const alertStyles =
    summary.thresholdAlertLevel === "exceeded"
      ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      : summary.thresholdAlertLevel === "critical"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
      : "border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {locale === "ru"
              ? "Авторасчёт оборота и налога из документов"
              : locale === "en"
              ? "Turnover & Tax Calculation from Documents"
              : "Hujjatdan aylanma va soliq hisobi"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Faol mijoz:{" "}
            <span className="font-semibold text-foreground">
              {currentEntity?.name || "Tanlanmagan"}
            </span>{" "}
            • Maqom: <span className="font-medium text-foreground">{statusLabel}</span> • Rejim:{" "}
            <span className="font-medium text-foreground">
              {isVatPayer ? "QQS (12%) + Foyda" : `Aylanmadan soliq (${summary.appliedRatePercent}%)`}
            </span>{" "}
            (<Link href="/clients" className="text-violet-600 dark:text-violet-400 hover:underline">
              Profilni oʻzgartirish
            </Link>)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={handleLoadSample}
          >
            <Play className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            Namuna hujjatlar bilan sinash
          </Button>
          {rows.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                setRows([]);
                setTraceFilter("all");
                setTraceNotice(null);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Tozalash
            </Button>
          )}
        </div>
      </div>

      {/* 3-Segment Document Upload Panel (Bank + Didox + 1C) */}
      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm divide-y md:divide-y-0 md:divide-x divide-border/60 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
        {[
          {
            kind: "bank" as TaxDocumentSourceKind,
            title: "1. Bank koʻchirmasi",
            hint: "Excel (.xlsx), CSV, 1C (.txt)",
            ref: bankInputRef,
          },
          {
            kind: "didox" as TaxDocumentSourceKind,
            title: "2. Didox fakturalari",
            hint: "Didox Excel (.xlsx) yoki CSV roʻyxat",
            ref: didoxInputRef,
          },
          {
            kind: "onec" as TaxDocumentSourceKind,
            title: "3. 1C hisoboti",
            hint: "Excel (.xlsx), CSV, XML yoki TXT",
            ref: oneCInputRef,
          },
        ].map((slot) => (
          <div key={slot.kind} className="p-4 space-y-2.5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {slot.title}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{slot.hint}</p>
            </div>
            <input
              ref={slot.ref}
              type="file"
              accept=".xlsx,.xls,.csv,.txt,.tsv,.xml"
              className="hidden"
              onChange={(e) => {
                void handleUpload(slot.kind, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => slot.ref.current?.click()}
              className="w-full h-14 rounded-lg border border-dashed border-border hover:border-violet-500/50 bg-muted/20 hover:bg-violet-500/5 transition-all flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Upload className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <span>Fayl yuklash</span>
            </button>
          </div>
        ))}
      </div>

      {/* Stage 5: Self-Learning Schema Prompt or Matched Badge for Bank / Didox / 1C */}
      {matchedSchemaLabel && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Tanilgan qolip: <strong className="text-emerald-700 dark:text-emerald-300">{matchedSchemaLabel}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMatchedSchemaLabel(null)}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Yopish
          </button>
        </div>
      )}

      {pendingBlueprint && (
        <div className="rounded-xl border border-violet-500/35 bg-violet-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-semibold text-foreground">
              {pendingBlueprint.fileName} — Hujjat qolipini eslab qolish ({SOURCE_LABELS[pendingBlueprint.selectedSourceType]})
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Ustunlar: <span className="font-mono">{pendingBlueprint.blueprint.columnHeaders.slice(0, 8).join(" | ") || "Standart"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={pendingBlueprint.selectedProfileId}
              onChange={(e) =>
                setPendingBlueprint((prev) =>
                  prev ? { ...prev, selectedProfileId: e.target.value } : null
                )
              }
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              {getProfileOptionsForSource(pendingBlueprint.selectedSourceType).map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white"
              disabled={isSavingSchema}
              onClick={handleSaveTaxBlueprint}
            >
              {isSavingSchema ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Qolipni eslab qolish
            </Button>
          </div>
        </div>
      )}

      {/* Prior YTD Turnover Input */}
      <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <div className="font-medium text-foreground">
            Yil boshidan oldingi davrlar aylanmasi (ixtiyoriy)
          </div>
          <p className="text-[11px] text-muted-foreground">
            Yillik chegaraga (1 mlrd yoki 12 000 BHM) qancha qolganini aniq bilish uchun oldingi oylar tushumini kiriting.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Input
            type="number"
            min={0}
            value={priorYtdInput}
            onChange={(e) => setPriorYtdInput(e.target.value)}
            className="h-8 w-44 font-mono text-xs"
            placeholder="0"
          />
          <span className="text-muted-foreground">soʻm</span>
        </div>
      </div>

      {/* Results Section */}
      {rows.length > 0 && (
        <>
          {/* Click-to-Trace KPI Ribbon */}
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm divide-y sm:divide-y-0 sm:divide-x divide-border/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 overflow-hidden">
            <button
              type="button"
              onClick={() =>
                focusTrace(
                  "included_revenue",
                  `Davr aylanmasi: ${summary.trace.includedRevenueRowIds.length} ta tasdiqlangan/kiritilgan daromad qatoridan yigʻilgan`
                )
              }
              className={`p-4 sm:p-5 text-left transition-colors ${
                traceFilter === "included_revenue" ? "bg-emerald-500/10" : "hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                <span>Davr aylanmasi</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground truncate">
                <Money amount={summary.periodTurnoverUzs} />
              </div>
              <div className="mt-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>Manba: {summary.trace.includedRevenueRowIds.length} ta qator (bosing)</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                focusTrace(
                  "included_revenue",
                  `Taxminiy soliq (${summary.appliedRatePercent}%): kod orqali ${summary.trace.includedRevenueRowIds.length} ta daromad qatoridan hisoblandi`
                )
              }
              className="p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                <span>Taxminiy soliq ({summary.appliedRatePercent}%)</span>
                <span className="h-2 w-2 rounded-full bg-violet-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-violet-700 dark:text-violet-300 truncate">
                <Money amount={summary.estimatedTaxUzs} />
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground truncate">
                {summary.taxRuleVersion} •{" "}
                {summary.verificationStatus === "verified" && summary.lastVerifiedAt
                  ? `Tasdiqlangan: ${summary.lastVerifiedAt}`
                  : "Tasdiqlanmagan qoida"}
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                focusTrace(
                  "included_revenue",
                  `Yillik jami aylanma: ${summary.cumulativeYtdTurnoverUzs.toLocaleString("en-US")} soʻm (${summary.thresholdUsagePercent ?? 0}%)`
                )
              }
              className="p-4 sm:p-5 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                <span>Chegaragacha qoldi</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    summary.thresholdAlertLevel === "exceeded"
                      ? "bg-rose-500"
                      : summary.thresholdAlertLevel === "critical" ||
                        summary.thresholdAlertLevel === "warning"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground truncate">
                {summary.remainingToThresholdUzs !== null ? (
                  <Money amount={summary.remainingToThresholdUzs} />
                ) : (
                  "QQS rejimi"
                )}
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground truncate">
                {summary.thresholdUsagePercent !== null
                  ? `Chegaraning ${summary.thresholdUsagePercent}% i toʻldi`
                  : "QQS toʻlovchi chegarasi qoʻllanilmaydi"}
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                focusTrace(
                  "unconfirmed",
                  `Tasdiqlash kerak: ${summary.unconfirmedCount} ta qator (kredit, oʻz hisobi, qaytarilgan pul, qarz yoki noaniq)`
                )
              }
              className={`p-4 sm:p-5 text-left transition-colors ${
                traceFilter === "unconfirmed" ? "bg-amber-500/10" : "hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                <span>Tasdiqlang</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    summary.unconfirmedCount > 0 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {summary.unconfirmedCount} ta qator
              </div>
              <div className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400 truncate">
                Daromad emas: <Money amount={summary.excludedNonRevenueUzs} />
              </div>
            </button>
          </div>

          {/* Unverified Tax Rule Warning Banner */}
          {summary.verificationStatus === "unverified" && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1 flex-1">
                <div className="font-semibold">
                  Tasdiqlanmagan soliq qoidasi — qoʻshimcha tekshiruv talab qilinadi
                </div>
                {summary.ruleNote && (
                  <p className="text-[11px] leading-relaxed opacity-90">{summary.ruleNote}</p>
                )}
              </div>
            </div>
          )}

          {/* Threshold Warning Alert Banner */}
          {summary.thresholdWarningText && (
            <div className={`rounded-xl border px-4 py-3 flex items-start gap-2.5 text-xs ${alertStyles}`}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="font-semibold">{summary.thresholdWarningText}</div>
                {summary.annualThresholdUzs !== null && (
                  <div className="w-full h-1.5 rounded-full bg-background/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        summary.thresholdAlertLevel === "exceeded" ? "bg-rose-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, summary.thresholdUsagePercent ?? 0)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mandatory Legal Disclaimer Banner */}
          <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <ShieldAlert className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <span>{TAX_ESTIMATE_DISCLAIMER}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="truncate max-w-[300px]">{summary.taxArticleRef}</span>
              <a
                href={summary.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:underline shrink-0"
              >
                lex.uz <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Filter & Optional AI Ambiguous Helper Toolbar */}
          <div ref={tableRef} className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: "all" as TraceFilter, label: `Barchasi (${rows.length})` },
                {
                  key: "unconfirmed" as TraceFilter,
                  label: `Tasdiqlash kerak (${summary.unconfirmedCount})`,
                },
                {
                  key: "included_revenue" as TraceFilter,
                  label: `Aylanmaga kirgan (${summary.trace.includedRevenueRowIds.length})`,
                },
                {
                  key: "excluded_non_revenue" as TraceFilter,
                  label: `Daromad emas (${summary.trace.excludedNonRevenueRowIds.length})`,
                },
                {
                  key: "ambiguous" as TraceFilter,
                  label: `Noaniq (${summary.ambiguousCount})`,
                },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  size="sm"
                  variant={traceFilter === tab.key ? "default" : "outline"}
                  className="h-7 text-[11px] px-2.5"
                  onClick={() => {
                    setTraceFilter(tab.key);
                    setTraceNotice(null);
                  }}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {summary.ambiguousCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isAiClassifying}
                className="h-7 text-[11px] gap-1.5 border-violet-500/30 text-violet-700 dark:text-violet-300"
                onClick={() => void handleAiClassifyAmbiguous()}
              >
                {isAiClassifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Noaniq qatorlarni AI bilan taxminiy tasniflash ({summary.ambiguousCount})
              </Button>
            )}
          </div>

          {traceNotice && (
            <div className="text-xs text-violet-700 dark:text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2 flex items-center justify-between">
              <span>{traceNotice}</span>
              <button
                type="button"
                className="text-[11px] underline ml-2"
                onClick={() => {
                  setTraceFilter("all");
                  setTraceNotice(null);
                }}
              >
                Hammasini koʻrsatish
              </button>
            </div>
          )}

          {/* Provenance & Editable Audit Table */}
          <div className="rounded-xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] uppercase text-muted-foreground">
                  <TableHead>Hujjat manbasi</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead>Kontragent va tavsif</TableHead>
                  <TableHead className="text-right">Summa</TableHead>
                  <TableHead>Tasnif (oʻzgartirish mumkin)</TableHead>
                  <TableHead className="text-right">Holat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`text-xs ${
                      row.needsConfirmation && !row.confirmedByAccountant
                        ? "bg-amber-500/[0.04]"
                        : ""
                    }`}
                  >
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground">
                          {SOURCE_LABELS[row.sourceType]}
                        </span>
                        <span className="text-muted-foreground truncate max-w-[110px]" title={row.fileName}>
                          {row.fileName}
                        </span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          #{row.rowIndex}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-[11px] whitespace-nowrap">{row.date}</TableCell>

                    <TableCell className="max-w-[260px]">
                      <div className="font-medium text-foreground truncate">{row.counterparty}</div>
                      <div className="text-[11px] text-muted-foreground truncate" title={row.description}>
                        {row.description || "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                        {row.aiNote || row.reason}
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-mono whitespace-nowrap">
                      <span
                        className={
                          row.includeInTurnover
                            ? "font-semibold text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }
                      >
                        <Money amount={row.amount} />
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <select
                          value={row.category}
                          onChange={(e) =>
                            handleCategoryChange(row.id, e.target.value as TaxRowCategory)
                          }
                          className="h-7 rounded-md border border-input bg-background px-2 text-[11px] max-w-[230px]"
                        >
                          {(Object.keys(CATEGORY_LABELS) as TaxRowCategory[]).map((cat) => (
                            <option key={cat} value={cat}>
                              {CATEGORY_LABELS[cat]}
                            </option>
                          ))}
                        </select>
                        {row.classificationSource === "ai_estimate" && (
                          <Badge variant="violet" className="w-fit text-[9px] h-4 px-1.5">
                            Taxminiy (AI)
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap">
                      {row.needsConfirmation && !row.confirmedByAccountant ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] px-2.5 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                          onClick={() => handleConfirmRow(row.id)}
                        >
                          Tasdiqlash
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{row.includeInTurnover ? "Aylanmada" : "Chiqarilgan"}</span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
