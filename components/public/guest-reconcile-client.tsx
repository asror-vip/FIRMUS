"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/context/locale-context";
import { trackEvent } from "@/lib/analytics/track-event";
import type {
  ReconcileRow,
  ReconcileSummary,
} from "@/lib/services/reconcile-engine";
import type { ParsedBankTransaction } from "@/lib/services/bank-import";
import { Money } from "@/components/shared/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ShieldCheck,
  Sparkles,
  Download,
  History,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Lock,
  Play,
  RotateCcw,
  ArrowRight,
  X,
} from "lucide-react";

const SAMPLE_BANK_ITEMS: ParsedBankTransaction[] = [
  {
    date: "2026-11-05",
    counterparty: "BARAKA SAVDO MCHJ",
    counterpartyStir: "305112233",
    amount: 22_400_000,
    type: "income",
    description: "Shartnoma №42 boʻyicha tovar uchun toʻlov QQS 12%",
    documentNumber: "101",
    accountCode: "4010",
    accountName: "Xaridorlar va buyurtmachilardan olinadigan schyotlar",
  },
  {
    date: "2026-11-08",
    counterparty: "TOSHKENT LOGISTIKA MCHJ",
    counterpartyStir: "301998877",
    amount: 4_500_000,
    type: "expense",
    description: "Yetkazib berish xizmati QQS bilan",
    documentNumber: "102",
    accountCode: "6010",
    accountName: "Mol yetkazib beruvchilarga toʻlanadigan schyotlar",
  },
  {
    date: "2026-11-12",
    counterparty: "ATB KAPITALBANK",
    counterpartyStir: "201020304",
    amount: 320_000,
    type: "expense",
    description: "Oylik bank RKO komissiyasi",
    documentNumber: "103",
    accountCode: "9420",
    accountName: "Maʼmuriy xarajatlar",
  },
  {
    date: "2026-11-15",
    counterparty: "ALFA TEXNOLOGIYA MCHJ",
    counterpartyStir: "309445566",
    amount: 15_000_000,
    type: "income",
    description: "Dasturiy xizmat uchun avans",
    documentNumber: "104",
    accountCode: "6310",
    accountName: "Xaridorlardan olingan boʻnaklar",
  },
];

const SAMPLE_ONEC_ITEMS: ParsedBankTransaction[] = [
  {
    date: "2026-11-05",
    counterparty: "BARAKA SAVDO MCHJ",
    counterpartyStir: "305112233",
    amount: 22_400_000,
    type: "income",
    description: "Shartnoma №42 tushum",
    documentNumber: "101",
    accountCode: "4010",
    accountName: "Xaridorlar va buyurtmachilardan olinadigan schyotlar",
  },
  {
    date: "2026-11-08",
    counterparty: "TOSHKENT LOGISTIKA MCHJ",
    counterpartyStir: "301998877",
    amount: 4_200_000,
    type: "expense",
    description: "Logistika xizmati (summa farqi bor)",
    documentNumber: "102",
    accountCode: "6010",
    accountName: "Mol yetkazib beruvchilarga toʻlanadigan schyotlar",
  },
  {
    date: "2026-11-14",
    counterparty: "NUR ELEKTRO MCHJ",
    counterpartyStir: "308111222",
    amount: 1_850_000,
    type: "expense",
    description: "1C da bor, bankda hali koʻrinmagan toʻlov",
    documentNumber: "105",
    accountCode: "6010",
    accountName: "Mol yetkazib beruvchilarga toʻlanadigan schyotlar",
  },
];

type LockedFeatureKey = "ai_check" | "export" | "history" | "clients";

const COPY = {
  uz: {
    title: "Bank ↔ 1C Sverka (Loginsiz sinash)",
    subtitle:
      "Bank koʻchirmasi va 1C faylini yuklang — farqlar va 21-BHMS schyotlari shu zahoti brauzeringiz ichida hisoblanadi.",
    privacyBadge: "Fayllar serverga yuklanmaydi — 100% brauzer ichida qayta ishlanadi (AI chaqiruvsiz)",
    trySampleBtn: "Namuna fayllarda sinab koʻrish",
    resetBtn: "Tozalash",
    bankTitle: "1. Bank koʻchirmasi",
    bankHint: "Excel (.xlsx), CSV yoki 1CClientBankExchange (.txt)",
    bankPrompt: "Bank faylini tanlang",
    oneCTitle: "2. 1C fayli (ixtiyoriy)",
    oneCHint: "Excel (.xlsx), CSV, XML yoki 1C (.txt)",
    oneCPrompt: "1C faylini tanlang",
    rowsSuffix: "qator",
    kpiMatched: "Mos keldi",
    kpiMismatch: "Summa farqi",
    kpiBankOnly: "Faqat bankda",
    kpiOneCOnly: "Faqat 1C da",
    allTab: "Barchasi",
    searchPlaceholder: "Kontragent, STIR yoki schyot boʻyicha qidirish...",
    colDate: "Sana",
    colCounterparty: "Kontragent",
    colBank: "Bank summasi",
    colOneC: "1C summasi",
    colDiff: "Farq",
    colAccount: "21-BHMS schyot",
    colStatus: "Holat",
    lockedTitle: "Bepul roʻyxatdan oʻting",
    lockedReasons: {
      ai_check: "Noaniq qatorlarni AI bilan tekshirish faqat roʻyxatdan oʻtgan foydalanuvchilar uchun ochiq.",
      export: "Natijani 1C (.txt / .xml) yoki CSV koʻrinishida yuklab olish uchun bepul akkaunt oching.",
      history: "Sverka natijalarini oyma-oy tarixda saqlash uchun bepul roʻyxatdan oʻting.",
      clients: "Bir nechta mijoz (MChJ / YaTT) hisobini alohida yuritish uchun bepul roʻyxatdan oʻting.",
    },
    lockedCta: "Bepul roʻyxatdan oʻtish",
    lockedLogin: "Akkauntim bor — Kirish",
    actionAi: "AI tekshiruv",
    actionExport: "Yuklab olish (1C / CSV)",
    actionHistory: "Tarixga saqlash",
    actionClients: "Mijozlar",
    disclaimer: "Taxminiy taqqoslash. Yakuniy qarorni buxgalter tasdiqlaydi.",
    parseErr: "Fayldan qatorlar topilmadi. Formatni tekshiring (.xlsx, .csv, .txt).",
    sampleLoaded: "Namuna bank va 1C fayllari brauzerda solishtirildi.",
  },
  ru: {
    title: "Сверка Банк ↔ 1С (Без регистрации)",
    subtitle:
      "Загрузите выписку банка и файл из 1С — расхождения и счета НСБУ №21 рассчитаются мгновенно прямо в браузере.",
    privacyBadge: "Файлы не отправляются на сервер — 100% локальная обработка в браузере (без AI)",
    trySampleBtn: "Проверить на тестовых файлах",
    resetBtn: "Сбросить",
    bankTitle: "1. Банковская выписка",
    bankHint: "Excel (.xlsx), CSV или 1CClientBankExchange (.txt)",
    bankPrompt: "Выберите файл банка",
    oneCTitle: "2. Выгрузка из 1С (опционально)",
    oneCHint: "Excel (.xlsx), CSV, XML или 1С (.txt)",
    oneCPrompt: "Выберите файл 1С",
    rowsSuffix: "строк",
    kpiMatched: "Совпало",
    kpiMismatch: "Расхождение",
    kpiBankOnly: "Только в банке",
    kpiOneCOnly: "Только в 1С",
    allTab: "Все",
    searchPlaceholder: "Поиск по контрагенту, ИНН или счёту...",
    colDate: "Дата",
    colCounterparty: "Контрагент",
    colBank: "Сумма банка",
    colOneC: "Сумма 1С",
    colDiff: "Разница",
    colAccount: "Счёт НСБУ 21",
    colStatus: "Статус",
    lockedTitle: "Зарегистрируйтесь бесплатно",
    lockedReasons: {
      ai_check: "AI-проверка спорных операций доступна только зарегистрированным пользователям.",
      export: "Скачивание и экспорт в 1С (.txt / .xml) и CSV открывается после бесплатной регистрации.",
      history: "Сохранение истории сверок по месяцам доступно после регистрации.",
      clients: "Ведение нескольких клиентов (ООО / ИП) доступно в бесплатном аккаунте.",
    },
    lockedCta: "Зарегистрироваться бесплатно",
    lockedLogin: "Уже есть аккаунт — Войти",
    actionAi: "AI проверка",
    actionExport: "Скачать (1С / CSV)",
    actionHistory: "Сохранить в историю",
    actionClients: "Клиенты",
    disclaimer: "Предварительная сверка. Итоговое решение подтверждает бухгалтер.",
    parseErr: "Не удалось найти строки в файле. Проверьте формат (.xlsx, .csv, .txt).",
    sampleLoaded: "Тестовые выписки банка и 1С сопоставлены прямо в браузере.",
  },
  en: {
    title: "Bank ↔ 1C Reconciliation (Guest Try)",
    subtitle:
      "Upload a bank statement and 1C export — mismatches and 21-BHMS accounts are computed locally in your browser.",
    privacyBadge: "Files never leave your device — 100% browser-side processing (no server AI calls)",
    trySampleBtn: "Try with sample files",
    resetBtn: "Reset",
    bankTitle: "1. Bank statement",
    bankHint: "Excel (.xlsx), CSV, or 1CClientBankExchange (.txt)",
    bankPrompt: "Choose bank file",
    oneCTitle: "2. 1C export (optional)",
    oneCHint: "Excel (.xlsx), CSV, XML, or 1C (.txt)",
    oneCPrompt: "Choose 1C file",
    rowsSuffix: "rows",
    kpiMatched: "Matched",
    kpiMismatch: "Mismatch",
    kpiBankOnly: "Bank only",
    kpiOneCOnly: "1C only",
    allTab: "All",
    searchPlaceholder: "Search counterparty, TIN, or account...",
    colDate: "Date",
    colCounterparty: "Counterparty",
    colBank: "Bank amount",
    colOneC: "1C amount",
    colDiff: "Diff",
    colAccount: "21-BHMS",
    colStatus: "Status",
    lockedTitle: "Create a free account",
    lockedReasons: {
      ai_check: "AI verification for ambiguous rows requires a free registered account.",
      export: "Downloading 1C (.txt / .xml) and CSV exports unlocks after free signup.",
      history: "Saving monthly reconciliation history unlocks after free signup.",
      clients: "Managing multiple LLC / YaTT clients unlocks after free signup.",
    },
    lockedCta: "Sign up free",
    lockedLogin: "Already have an account? Sign in",
    actionAi: "AI check",
    actionExport: "Download (1C / CSV)",
    actionHistory: "Save history",
    actionClients: "Clients",
    disclaimer: "Estimated match. Final confirmation is made by the accountant.",
    parseErr: "No transaction rows found. Please check file format (.xlsx, .csv, .txt).",
    sampleLoaded: "Sample bank and 1C statements reconciled locally in your browser.",
  },
};

export function GuestReconcileClient() {
  const { language: locale } = useLocale();
  const c = COPY[locale] ?? COPY.uz;

  const bankInputRef = useRef<HTMLInputElement | null>(null);
  const oneCInputRef = useRef<HTMLInputElement | null>(null);
  const trackedToolRef = useRef(false);

  const [bankFileName, setBankFileName] = useState("");
  const [oneCFileName, setOneCFileName] = useState("");
  const [bankItems, setBankItems] = useState<ParsedBankTransaction[]>([]);
  const [oneCItems, setOneCItems] = useState<ParsedBankTransaction[]>([]);
  const [rows, setRows] = useState<ReconcileRow[]>([]);
  const [summary, setSummary] = useState<ReconcileSummary | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lockedFeature, setLockedFeature] = useState<LockedFeatureKey | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(false);

  // Restore guest reconciliation state on mount (prevents losing work on browser Back / navigation)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("firmus_guest_reconcile_v1");
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.bankFileName === "string") setBankFileName(saved.bankFileName);
        if (typeof saved.oneCFileName === "string") setOneCFileName(saved.oneCFileName);
        if (Array.isArray(saved.bankItems)) setBankItems(saved.bankItems);
        if (Array.isArray(saved.oneCItems)) setOneCItems(saved.oneCItems);
        if (Array.isArray(saved.rows)) setRows(saved.rows);
        if (saved.summary && typeof saved.summary === "object") setSummary(saved.summary);
        if (typeof saved.activeTab === "string") setActiveTab(saved.activeTab);
        if (typeof saved.searchQuery === "string") setSearchQuery(saved.searchQuery);
      }
    } catch {
      // ignore storage errors
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    try {
      if (bankItems.length === 0 && oneCItems.length === 0 && rows.length === 0) {
        sessionStorage.removeItem("firmus_guest_reconcile_v1");
        return;
      }
      const serialized = JSON.stringify({
        bankFileName,
        oneCFileName,
        bankItems,
        oneCItems,
        rows,
        summary,
        activeTab,
        searchQuery,
      });
      // Guard against exceeding sessionStorage quota (~5MB)
      if (serialized.length <= 2_000_000) {
        sessionStorage.setItem("firmus_guest_reconcile_v1", serialized);
      }
    } catch {
      // ignore quota errors
    }
  }, [
    draftHydrated,
    bankFileName,
    oneCFileName,
    bankItems,
    oneCItems,
    rows,
    summary,
    activeTab,
    searchQuery,
  ]);

  useEffect(() => {
    trackEvent({ eventName: "page_view", pagePath: "/try", locale });
  }, [locale]);

  const runLocalReconcile = async (
    nextBank: ParsedBankTransaction[],
    nextOneC: ParsedBankTransaction[],
    toolTag: string
  ) => {
    if (nextBank.length === 0 && nextOneC.length === 0) {
      setRows([]);
      setSummary(null);
      return;
    }
    const { reconcileBankAnd1C } = await import("@/lib/services/reconcile-engine");
    const res = reconcileBankAnd1C(nextBank, nextOneC);
    setRows(res.rows);
    setSummary(res.summary);
    if (!trackedToolRef.current) {
      trackedToolRef.current = true;
      trackEvent({ eventName: "tool_used", pagePath: "/try", toolName: toolTag, locale });
    }
  };

  const handleFileUpload = async (target: "bank" | "onec", file?: File) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const { parseStatementFileBuffer } = await import("@/lib/services/reconcile-engine");
      const parsed = await parseStatementFileBuffer(buffer, file.name);
      if (parsed.length === 0) {
        const { toast } = await import("sonner");
        toast.error(c.parseErr);
        return;
      }
      if (target === "bank") {
        setBankFileName(file.name);
        setBankItems(parsed);
        await runLocalReconcile(parsed, oneCItems, "guest_reconcile_file");
      } else {
        setOneCFileName(file.name);
        setOneCItems(parsed);
        await runLocalReconcile(bankItems, parsed, "guest_reconcile_file");
      }
    } catch {
      const { toast } = await import("sonner");
      toast.error(c.parseErr);
    }
  };

  const handleLoadSample = async () => {
    setBankFileName("namuna_bank_2026_11.xlsx");
    setOneCFileName("namuna_1c_2026_11.txt");
    setBankItems(SAMPLE_BANK_ITEMS);
    setOneCItems(SAMPLE_ONEC_ITEMS);
    await runLocalReconcile(SAMPLE_BANK_ITEMS, SAMPLE_ONEC_ITEMS, "guest_reconcile_sample");
    const { toast } = await import("sonner");
    toast.success(c.sampleLoaded);
  };

  const handleReset = () => {
    setBankFileName("");
    setOneCFileName("");
    setBankItems([]);
    setOneCItems([]);
    setRows([]);
    setSummary(null);
    setActiveTab("all");
    setSearchQuery("");
    try {
      sessionStorage.removeItem("firmus_guest_reconcile_v1");
    } catch {
      // ignore
    }
  };

  const openLockedGate = (feature: LockedFeatureKey) => {
    setLockedFeature(feature);
    trackEvent({
      eventName: "tool_used",
      pagePath: "/try",
      toolName: `guest_gate_${feature}`,
      locale,
    });
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeTab !== "all" && r.status !== activeTab) return false;
      if (!q) return true;
      return (
        r.counterparty.toLowerCase().includes(q) ||
        (r.counterpartyStir || "").includes(q) ||
        r.suggestedAccountCode.includes(q)
      );
    });
  }, [rows, activeTab, searchQuery]);

  const statusBadge = (status: ReconcileRow["status"]) => {
    if (status === "matched") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {c.kpiMatched}
        </span>
      );
    }
    if (status === "amount_mismatch") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {c.kpiMismatch}
        </span>
      );
    }
    if (status === "bank_only") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-400">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          {c.kpiBankOnly}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 dark:text-violet-400">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
        {c.kpiOneCOnly}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {c.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{c.subtitle}</p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 pt-0.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>{c.privacyBadge}</span>
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
            {c.trySampleBtn}
          </Button>
          {rows.length > 0 && (
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              {c.resetBtn}
            </Button>
          )}
        </div>
      </div>

      {/* 2-Segment Upload Panel */}
      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm divide-y md:divide-y-0 md:divide-x divide-border/60 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {c.bankTitle}
            </span>
            {bankItems.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                {bankItems.length} {c.rowsSuffix}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{c.bankHint}</p>
          <input
            ref={bankInputRef}
            type="file"
            accept=".xlsx,.xls,.txt,.csv,.tsv"
            className="hidden"
            onChange={(e) => {
              void handleFileUpload("bank", e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => bankInputRef.current?.click()}
            className="w-full h-16 rounded-lg border border-dashed border-border hover:border-violet-500/50 bg-muted/20 hover:bg-violet-500/5 transition-all flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Upload className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="truncate max-w-[280px] font-medium">{bankFileName || c.bankPrompt}</span>
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {c.oneCTitle}
            </span>
            {oneCItems.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                {oneCItems.length} {c.rowsSuffix}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{c.oneCHint}</p>
          <input
            ref={oneCInputRef}
            type="file"
            accept=".xlsx,.xls,.xml,.txt,.csv,.tsv"
            className="hidden"
            onChange={(e) => {
              void handleFileUpload("onec", e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => oneCInputRef.current?.click()}
            className="w-full h-16 rounded-lg border border-dashed border-border hover:border-violet-500/50 bg-muted/20 hover:bg-violet-500/5 transition-all flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Upload className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="truncate max-w-[280px] font-medium">{oneCFileName || c.oneCPrompt}</span>
          </button>
        </div>
      </div>

      {/* Results & Locked Actions Bar */}
      {summary && (
        <>
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm divide-y sm:divide-y-0 sm:divide-x divide-border/60 grid grid-cols-2 lg:grid-cols-4 overflow-hidden">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "matched" ? "all" : "matched")}
              className={`p-4 text-left transition-colors ${activeTab === "matched" ? "bg-emerald-500/10" : "hover:bg-muted/30"}`}
            >
              <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase mb-1.5">
                <span>{c.kpiMatched}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono">{summary.matchedCount}</div>
              <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{c.kpiMatched}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "amount_mismatch" ? "all" : "amount_mismatch")}
              className={`p-4 text-left transition-colors ${activeTab === "amount_mismatch" ? "bg-amber-500/10" : "hover:bg-muted/30"}`}
            >
              <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase mb-1.5">
                <span>{c.kpiMismatch}</span>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono">{summary.mismatchCount}</div>
              <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>{c.kpiMismatch}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "bank_only" ? "all" : "bank_only")}
              className={`p-4 text-left transition-colors ${activeTab === "bank_only" ? "bg-rose-500/10" : "hover:bg-muted/30"}`}
            >
              <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase mb-1.5">
                <span>{c.kpiBankOnly}</span>
                <span className="h-2 w-2 rounded-full bg-rose-500" />
              </div>
              <div className="text-2xl font-bold font-mono">{summary.bankOnlyCount}</div>
              <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                <span>{c.kpiBankOnly}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "one_c_only" ? "all" : "one_c_only")}
              className={`p-4 text-left transition-colors ${activeTab === "one_c_only" ? "bg-violet-500/10" : "hover:bg-muted/30"}`}
            >
              <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase mb-1.5">
                <span>{c.kpiOneCOnly}</span>
                <span className="h-2 w-2 rounded-full bg-violet-500" />
              </div>
              <div className="text-2xl font-bold font-mono">{summary.oneCOnlyCount}</div>
              <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span>{c.kpiOneCOnly}</span>
              </div>
            </button>
          </div>

          {/* Action Toolbar — Locked Features Open Signup Modal (Zero AI/Server Calls) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={c.searchPlaceholder}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => openLockedGate("ai_check")}
              >
                <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                {c.actionAi}
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => openLockedGate("export")}
              >
                <Download className="h-3.5 w-3.5" />
                {c.actionExport}
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => openLockedGate("history")}
              >
                <History className="h-3.5 w-3.5" />
                {c.actionHistory}
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => openLockedGate("clients")}
              >
                <Building2 className="h-3.5 w-3.5" />
                {c.actionClients}
                <Lock className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Edge-to-Edge Reconcile Table */}
          <div className="rounded-xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] uppercase text-muted-foreground">
                  <TableHead>{c.colDate}</TableHead>
                  <TableHead>{c.colCounterparty}</TableHead>
                  <TableHead className="text-right">{c.colBank}</TableHead>
                  <TableHead className="text-right">{c.colOneC}</TableHead>
                  <TableHead className="text-right">{c.colDiff}</TableHead>
                  <TableHead>{c.colAccount}</TableHead>
                  <TableHead>{c.colStatus}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id} className="text-xs">
                    <TableCell className="font-mono text-[11px] whitespace-nowrap">{row.date}</TableCell>
                    <TableCell className="max-w-[240px]">
                      <div className="font-medium truncate">{row.counterparty}</div>
                      {row.counterpartyStir && (
                        <div className="text-[10px] font-mono text-muted-foreground">
                          STIR: {row.counterpartyStir}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono whitespace-nowrap">
                      {row.bankAmount > 0 ? <Money amount={row.bankAmount} /> : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono whitespace-nowrap">
                      {row.oneCAmount > 0 ? <Money amount={row.oneCAmount} /> : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono whitespace-nowrap">
                      {row.diffAmount !== 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          <Money amount={row.diffAmount} />
                        </span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-violet-700 dark:text-violet-300">
                      {row.suggestedAccountCode}
                    </TableCell>
                    <TableCell>{statusBadge(row.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <p className="text-[11px] text-muted-foreground">{c.disclaimer}</p>
        </>
      )}

      {/* Register Gate Modal (lightweight, zero Radix Dialog overhead) */}
      {lockedFeature !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setLockedFeature(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLockedFeature(null)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                {c.lockedTitle}
              </h2>
              <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
                {c.lockedReasons[lockedFeature]}
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                asChild
                className="w-full h-9 text-xs bg-violet-600 hover:bg-violet-500 text-white shadow-sm gap-1.5"
                onClick={() =>
                  trackEvent({
                    eventName: "register_clicked",
                    pagePath: "/try",
                    toolName: `gate_modal_${lockedFeature}`,
                    locale,
                  })
                }
              >
                <Link href="/register">
                  {c.lockedCta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full h-8 text-xs">
                <Link href="/login">{c.lockedLogin}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
