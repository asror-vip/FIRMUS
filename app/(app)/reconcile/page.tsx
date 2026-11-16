"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppState } from "@/lib/context/app-state";
import { FEATURES } from "@/lib/config/features";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Money } from "@/components/shared/money";
import { QuickEntityBanner } from "@/components/shared/quick-entity-banner";
import { PaginationBar } from "@/components/shared/pagination-bar";
import {
  RECONCILE_ACCOUNT_OPTIONS,
  parseStatementFile,
  parseStatementFileBuffer,
  reconcileBankAnd1C,
  buildReconcileJournalLines,
  buildSafeAiReconcileInput,
  buildReconcileCsvReport,
  sanitizeReconcileRowsForStorage,
  type ReconcileRow,
  type ReconcileSummary,
} from "@/lib/services/reconcile-engine";
import type { ParsedBankTransaction } from "@/lib/services/bank-import";
import { generate1CClientBankText, generate1CEnterpriseDataXml } from "@/lib/services/one-c-export";
import {
  fetchRecentTransactions,
  fetchWorkBatchesPaginated,
  fetchWorkBatchMonths,
  fetchWorkBatchById,
  saveWorkBatch,
  markWorkBatchPosted,
  deleteWorkBatch,
  type WorkBatchRecord,
} from "@/lib/services/supabase-service";
import { sanitizeStringForAi } from "@/lib/utils/privacy";
import { roundMoney } from "@/lib/utils/finance";
import { supabase } from "@/lib/supabase/client";
import {
  Upload,
  Sparkles,
  Download,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Database,
  RotateCcw,
  ClipboardPaste,
  Search,
  History,
  BookmarkCheck,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

function downloadFileBlob(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ReconcileContent() {
  const searchParams = useSearchParams();
  const batchIdParam = searchParams.get("batchId");
  const { currentEntity, subscription, setSubscriptionSnapshot } = useAppState();
  const bankInputRef = useRef<HTMLInputElement | null>(null);
  const oneCInputRef = useRef<HTMLInputElement | null>(null);

  const [bankFileName, setBankFileName] = useState("");
  const [oneCFileName, setOneCFileName] = useState("");
  const [bankItems, setBankItems] = useState<ParsedBankTransaction[]>([]);
  const [oneCItems, setOneCItems] = useState<ParsedBankTransaction[]>([]);

  const [rows, setRows] = useState<ReconcileRow[]>([]);
  const [summary, setSummary] = useState<ReconcileSummary | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiModeNote, setAiModeNote] = useState<string | null>(null);
  const [isPostingLedger, setIsPostingLedger] = useState(false);

  // Saved batch history state (10 per page from DB, lightweight metadata)
  const historyCardRef = useRef<HTMLDivElement | null>(null);
  const [savedBatches, setSavedBatches] = useState<WorkBatchRecord[]>([]);
  const [savedBatchesCount, setSavedBatchesCount] = useState(0);
  const [historyMonths, setHistoryMonths] = useState<string[]>([]);
  const [historyMonth, setHistoryMonth] = useState<string>("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [openingBatchId, setOpeningBatchId] = useState<string | null>(null);
  const [rowsPage, setRowsPage] = useState(1);
  const HISTORY_PAGE_SIZE = 10;
  const ROWS_PAGE_SIZE = 10;

  // Paste dialog state
  const [pasteTarget, setPasteTarget] = useState<"bank" | "onec" | null>(null);
  const [pasteText, setPasteText] = useState("");

  const loadHistory = useCallback(async () => {
    if (!currentEntity?.id) {
      setSavedBatches([]);
      setSavedBatchesCount(0);
      setHistoryMonths([]);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const [{ data, count }, months] = await Promise.all([
        fetchWorkBatchesPaginated({
          entityId: currentEntity.id,
          batchType: "reconcile",
          periodMonth: historyMonth === "all" ? undefined : historyMonth,
          page: historyPage,
          pageSize: HISTORY_PAGE_SIZE,
        }),
        fetchWorkBatchMonths(currentEntity.id, "reconcile"),
      ]);
      setSavedBatches(data);
      setSavedBatchesCount(count);
      setHistoryMonths(months);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentEntity?.id, historyMonth, historyPage]);

  useEffect(() => {
    setHistoryPage(1);
    setHistoryMonth("all");
  }, [currentEntity?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenBatch = useCallback(async (batch: WorkBatchRecord | string) => {
    const id = typeof batch === "string" ? batch : batch.id;
    setOpeningBatchId(id);
    try {
      const full = await fetchWorkBatchById(id);
      if (!full) {
        toast.error("Saqlangan ish topilmadi");
        return;
      }
      const loadedRows = Array.isArray(full.sanitizedPayload)
        ? (full.sanitizedPayload as ReconcileRow[])
        : [];
      setRows(loadedRows);
      setRowsPage(1);
      setSummary((full.summaryJson || null) as ReconcileSummary | null);
      setBankFileName(full.bankFileName || "");
      setOneCFileName(full.oneCFileName || "");
      setSelectedIds(loadedRows.filter((r) => r.status === "bank_only").map((r) => r.id));
      setActiveBatchId(full.id);
      setActiveTab("all");
      setAiModeNote(null);
      toast.success(`«${full.title}» yuklandi`);
    } catch (err: any) {
      toast.error("Yuklashda xatolik: " + err.message);
    } finally {
      setOpeningBatchId(null);
    }
  }, []);

  useEffect(() => {
    if (batchIdParam && currentEntity?.id) {
      handleOpenBatch(batchIdParam);
    }
  }, [batchIdParam, currentEntity?.id, handleOpenBatch]);

  const runComparison = (nextBank: ParsedBankTransaction[], nextOneC: ParsedBankTransaction[]) => {
    if (nextBank.length === 0 && nextOneC.length === 0) {
      setRows([]);
      setSummary(null);
      setActiveBatchId(null);
      return;
    }
    const { rows: compared, summary: sum } = reconcileBankAnd1C(nextBank, nextOneC);
    setRows(compared);
    setSummary(sum);
    setSelectedIds(compared.filter((r) => r.status === "bank_only").map((r) => r.id));
    setAiModeNote(null);
    setActiveBatchId(null);
  };

  const applyParsedSource = (source: "bank" | "onec", parsed: ParsedBankTransaction[], label: string) => {
    if (parsed.length === 0) {
      toast.error(
        `«${label}» dan operatsiyalar oʻqilmadi. Client-Bank (.txt), 1C XML, CSV/TSV yoki Excel HTML jadval formatidan foydalaning.`
      );
      return false;
    }

    if (parsed.length > subscription.limits.reconcileMaxRows) {
      toast.error(
        `Faylda ${parsed.length} ta yozuv bor. ${subscription.planName} tarifi limiti: max ${subscription.limits.reconcileMaxRows.toLocaleString("uz-UZ")} qator.`
      );
      return false;
    }

    if (source === "bank") {
      setBankFileName(label);
      setBankItems(parsed);
      runComparison(parsed, oneCItems);
      toast.success(`Bank koʻchirmasidan ${parsed.length} ta operatsiya oʻqildi.`);
    } else {
      setOneCFileName(label);
      setOneCItems(parsed);
      runComparison(bankItems, parsed);
      toast.success(`1C maʼlumotidan ${parsed.length} ta yozuv oʻqildi.`);
    }
    return true;
  };

  const handleUploadFile = async (source: "bank" | "onec", file?: File) => {
    if (!file) return;
    if (file.size > subscription.limits.reconcileMaxFileBytes) {
      const maxMb = Math.round(subscription.limits.reconcileMaxFileBytes / (1024 * 1024));
      toast.error(`Fayl hajmi ${subscription.planName} tarifi limiti (${maxMb} MB) dan oshmasligi kerak`);
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseStatementFileBuffer(buffer, file.name, currentEntity?.tinStir || "");
      applyParsedSource(source, parsed, file.name);
    } catch (err: any) {
      toast.error("Faylni oʻqishda xatolik: " + (err?.message || "Nomaʼlum xato"));
    }
  };

  const handleApplyPaste = () => {
    if (!pasteTarget || !pasteText.trim()) {
      toast.error("Avval Excel yoki Bank jadvalidan nusxalangan matnni joylashtiring");
      return;
    }
    const parsed = parseStatementFile(
      pasteText,
      pasteTarget === "onec" ? "pasted_1c.csv" : "pasted_bank.csv",
      currentEntity?.tinStir || ""
    );
    const label = pasteTarget === "bank" ? "Bank (Ctrl+V jadval)" : "1C (Ctrl+V jadval)";
    if (applyParsedSource(pasteTarget, parsed, label)) {
      setPasteTarget(null);
      setPasteText("");
    }
  };

  const handleLoadDbAs1C = async () => {
    if (!currentEntity?.id) {
      toast.error("Avval korxona tanlang yoki tezkor qoʻshing");
      return;
    }
    try {
      const txs = await fetchRecentTransactions(currentEntity.id, 200);
      const mapped: ParsedBankTransaction[] = (txs || []).map((t: any) => ({
        date: t.date,
        amount: Number(t.amount),
        type: t.type,
        counterparty: t.counterparty,
        counterpartyStir: t.counterpartyStir,
        description: t.description,
        accountCode: t.accountCode || (t.type === "income" ? "4010" : "6010"),
        accountName: t.accountName || "",
      }));
      setOneCFileName("FIRMUS Bosh kitob / Tranzaksiyalar");
      setOneCItems(mapped);
      runComparison(bankItems, mapped);
      toast.success(`Bazadan ${mapped.length} ta yozuv bilan solishtirildi.`);
    } catch (err: any) {
      toast.error("Bazadan oʻqishda xatolik: " + err.message);
    }
  };

  const handleReset = () => {
    setBankFileName("");
    setOneCFileName("");
    setBankItems([]);
    setOneCItems([]);
    setRows([]);
    setSummary(null);
    setSelectedIds([]);
    setSearchQuery("");
    setActiveTab("all");
    setAiModeNote(null);
    setActiveBatchId(null);
  };

  const handleSaveBatchToHistory = async (markPosted = false): Promise<string | null> => {
    if (!currentEntity?.id) {
      toast.error(FEATURES.multiCompanyMode ? "Saqlash uchun avval korxona qoʻshing" : "Shaxsiy hisob tayyorlanmoqda, biroz kuting");
      return null;
    }
    if (!summary || rows.length === 0) return null;

    setIsSavingBatch(true);
    try {
      const sampleDate = rows.find((r) => /^\d{4}-\d{2}/.test(r.date))?.date;
      const periodMonth = sampleDate ? sampleDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
      const safeRows = sanitizeReconcileRowsForStorage(rows);
      const label = [bankFileName || "Bank", oneCFileName || "1C"].filter(Boolean).join(" ↔ ");

      const created = await saveWorkBatch({
        entityId: currentEntity.id,
        batchType: "reconcile",
        periodMonth,
        title: label,
        bankFileName: bankFileName || undefined,
        oneCFileName: oneCFileName || undefined,
        rowCount: rows.length,
        totalIncome: summary.bankTotalIncome,
        totalExpense: summary.bankTotalExpense,
        status: markPosted ? "posted_to_ledger" : "reviewed",
        summaryJson: summary,
        sanitizedPayload: safeRows,
      });

      setActiveBatchId(created.id);
      await loadHistory();
      if (!markPosted) {
        toast.success("Solishtirish tarixga saqlandi!");
      }
      return created.id;
    } catch (err: any) {
      if (!markPosted) toast.error("Saqlashda xatolik: " + err.message);
      return null;
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      await deleteWorkBatch(batchId);
      if (activeBatchId === batchId) setActiveBatchId(null);
      await loadHistory();
      toast.success("Tarixdan oʻchirildi");
    } catch (err: any) {
      toast.error("Oʻchirishda xatolik: " + err.message);
    }
  };

  const handleChangeRowAccount = (rowId: string, nextCode: string) => {
    const found = RECONCILE_ACCOUNT_OPTIONS.find((a) => a.code === nextCode);
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              suggestedAccountCode: nextCode,
              suggestedAccountName: found?.name || nextCode,
            }
          : r
      )
    );
  };

  const handleToggleRowVat = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, vatIncluded: !r.vatIncluded } : r))
    );
  };

  const handleAiVerify = async () => {
    const candidates = buildSafeAiReconcileInput(rows);
    if (candidates.length === 0) {
      toast.info("Barcha operatsiyalar 100% mos! Tekshirishga muhtoj farq topilmadi.");
      return;
    }
    setIsAiChecking(true);
    try {
      const res = await fetch("/api/ai-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: candidates,
          requestedModel: subscription.limits.defaultScanModel,
        }),
      });
      const data = await res.json();
      if (data?.usage) setSubscriptionSnapshot(data.usage);
      if (!res.ok) throw new Error(data.error || "AI solishtirish xatosi");

      const map = new Map<string, any>((data.suggestions || []).map((s: any) => [s.id, s]));
      setRows((prev) =>
        prev.map((r) => {
          const hit = map.get(r.id);
          if (!hit) return r;
          return {
            ...r,
            suggestedAccountCode: hit.accountCode || r.suggestedAccountCode,
            suggestedAccountName: hit.accountName || r.suggestedAccountName,
            explanation: hit.explanation || r.explanation,
            aiVerified: true,
          };
        })
      );
      setAiModeNote(
        data.mode === "gemini_reconcile"
          ? "AI tomonidan tekshirildi"
          : "Qatʼiy qoidalar bilan tekshirildi"
      );
      toast.success("AI farqlarni tekshirdi va schyotlarni tasdiqladi!");
    } catch (err: any) {
      toast.error("AI tahlilida xatolik: " + err.message);
    } finally {
      setIsAiChecking(false);
    }
  };

  const getRowsForExport = () => {
    const selectedRows = rows.filter((r) => selectedIds.includes(r.id) && r.bankAmount > 0);
    if (selectedRows.length > 0) return { targetRows: selectedRows, modeLabel: "tanlangan" };

    const missingOnly = rows.filter((r) => r.status === "bank_only" && r.bankAmount > 0);
    if (missingOnly.length > 0) return { targetRows: missingOnly, modeLabel: "1C da yoʻq" };

    return {
      targetRows: rows.filter((r) => r.bankItem || r.oneCItem),
      modeLabel: "barcha",
    };
  };

  const handleExport1CTxt = () => {
    const { targetRows, modeLabel } = getRowsForExport();
    const itemsToExport = targetRows.map((r, i) => ({
      id: String(i + 1),
      date: r.date,
      amount: r.bankAmount || r.oneCAmount,
      type: r.type,
      counterparty: sanitizeStringForAi(r.counterparty),
      counterpartyStir: r.counterpartyStir,
      description: `${sanitizeStringForAi(r.bankItem?.description || r.oneCItem?.description || "Operatsiya")} [Schyot: ${r.suggestedAccountCode}${r.vatIncluded ? ", QQS 12%" : ""}]`,
      accountCode: r.suggestedAccountCode,
      documentNumber: r.bankItem?.documentNumber || r.oneCItem?.documentNumber,
    }));

    if (itemsToExport.length === 0) {
      toast.error("Eksport uchun maʼlumot yoʻq");
      return;
    }

    const txt = generate1CClientBankText(itemsToExport, {
      name: currentEntity?.name || "Kompaniya",
      inn: currentEntity?.tinStir || "",
      account: currentEntity?.bankAccount || "",
      bank: currentEntity?.bankName || "",
      openingBalance: 0,
    });

    downloadFileBlob(
      txt,
      `kl_to_1c_${new Date().toISOString().slice(0, 10)}.txt`,
      "text/plain;charset=utf-8"
    );
    toast.success(`${itemsToExport.length} ta (${modeLabel}) operatsiya 1C (.txt) fayliga yuklandi!`);
  };

  const handleExport1CXml = () => {
    const { targetRows, modeLabel } = getRowsForExport();
    if (targetRows.length === 0) {
      toast.error("XML eksport uchun maʼlumot yoʻq");
      return;
    }

    const entries = targetRows.map((r, idx) => {
      const lines = buildReconcileJournalLines(r);
      return {
        entryNumber: r.bankItem?.documentNumber ? `REC-${r.bankItem.documentNumber}` : `REC-${idx + 1}`,
        date: r.date,
        description: sanitizeStringForAi(`${r.counterparty} — ${r.bankItem?.description || r.explanation}`).slice(0, 200),
        totalDebit: roundMoney(lines.reduce((s, l) => s + l.debit, 0)),
        lines,
      };
    });

    const xml = generate1CEnterpriseDataXml(entries);
    downloadFileBlob(
      xml,
      `1c_enterprise_reconciled_${new Date().toISOString().slice(0, 10)}.xml`,
      "application/xml;charset=utf-8"
    );
    toast.success(`${entries.length} ta (${modeLabel}) provodka 1C EnterpriseData XML formatida yuklandi!`);
  };

  const handleDownloadCsv = () => {
    if (rows.length === 0) return;
    const csv = buildReconcileCsvReport(rows);
    downloadFileBlob(
      csv,
      `sverka_hisobot_${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv;charset=utf-8"
    );
    toast.success("Excel/CSV Sverka dalolatnomasi yuklandi!");
  };

  const handlePostSelectedToLedger = async () => {
    if (!currentEntity?.id) {
      toast.error("Bosh kitobga yozish uchun yuqoridagi tugma orqali korxonani tezkor ulang");
      return;
    }
    const chosen = rows.filter((r) => selectedIds.includes(r.id) && r.bankAmount > 0);
    if (chosen.length === 0) {
      toast.error("Iltimos, Bosh kitobga oʻtkazish uchun qatorlarni belgilang");
      return;
    }

    setIsPostingLedger(true);
    let successCount = 0;
    try {
      for (const item of chosen) {
        const lines = buildReconcileJournalLines(item);
        const safeDesc = sanitizeStringForAi(
          `${item.counterparty}: ${item.bankItem?.description || item.explanation}`
        ).slice(0, 240);

        const { error } = await supabase.rpc("create_journal_entry_atomic", {
          p_business_entity_id: currentEntity.id,
          p_entry_number: `JE-REC-${Date.now().toString().slice(-5)}-${successCount + 1}`,
          p_entry_date: item.date,
          p_description: safeDesc,
          p_source_type: "bank_statement",
          p_idempotency_key: `idem-rec-${currentEntity.id}-${item.date}-${item.bankAmount}-${item.suggestedAccountCode}-${item.vatIncluded ? "vat" : "novat"}-${successCount}`,
          p_lines: lines.map((l) => ({
            account_code: l.accountCode,
            account_name: l.accountName,
            debit_amount: l.debit,
            credit_amount: l.credit,
            memo: l.memo,
          })),
        });
        if (error) throw error;
        successCount++;
      }

      if (activeBatchId) {
        await markWorkBatchPosted(activeBatchId);
        await loadHistory();
      } else {
        await handleSaveBatchToHistory(true);
      }

      window.dispatchEvent(new CustomEvent("firmus:refresh-data", { detail: { entityId: currentEntity.id } }));
      toast.success(`${successCount} ta tasdiqlangan operatsiya Bosh kitobga atomik tarzda yozildi!`);
    } catch (err: any) {
      toast.error("Bosh kitobga yozishda xatolik: " + err.message);
    } finally {
      setIsPostingLedger(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (activeTab !== "all" && r.status !== activeTab) return false;
      if (!q) return true;
      return (
        r.counterparty.toLowerCase().includes(q) ||
        (r.counterpartyStir || "").includes(q) ||
        r.suggestedAccountCode.includes(q) ||
        r.explanation.toLowerCase().includes(q) ||
        String(r.bankAmount || r.oneCAmount).includes(q)
      );
    });
  }, [rows, activeTab, searchQuery]);

  useEffect(() => {
    setRowsPage(1);
  }, [activeTab, searchQuery]);

  const paginatedRows = useMemo(() => {
    const start = (rowsPage - 1) * ROWS_PAGE_SIZE;
    return filteredRows.slice(start, start + ROWS_PAGE_SIZE);
  }, [filteredRows, rowsPage]);

  const selectableFilteredIds = useMemo(
    () => filteredRows.filter((r) => r.bankAmount > 0).map((r) => r.id),
    [filteredRows]
  );

  const allVisibleSelected =
    selectableFilteredIds.length > 0 &&
    selectableFilteredIds.every((id) => selectedIds.includes(id));

  const incomeDiff = summary ? roundMoney(summary.bankTotalIncome - summary.oneCTotalIncome) : 0;
  const expenseDiff = summary ? roundMoney(summary.bankTotalExpense - summary.oneCTotalExpense) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Bank ↔ 1C Solishtirish
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentEntity?.id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={() => historyCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <History className="h-3.5 w-3.5" />
              Saqlangan tarix ({savedBatchesCount})
            </Button>
          )}
          {rows.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-8 gap-1.5" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              Tozalash
            </Button>
          )}
        </div>
      </div>

      <QuickEntityBanner />

      {/* Two Upload Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">1. Bank koʻchirmasi</CardTitle>
            <CardDescription className="text-xs">
              .xlsx, .txt, .csv, .xls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <input
              ref={bankInputRef}
              type="file"
              accept=".xlsx,.xls,.txt,.csv,.tsv"
              className="hidden"
              onChange={(e) => handleUploadFile("bank", e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-16 border-dashed flex flex-col gap-1"
              onClick={() => bankInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 text-indigo-600" />
              <span>{bankFileName || "Bank faylini tanlash (.xlsx, .txt, .csv, .xls)"}</span>
            </Button>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[11px] h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setPasteTarget("bank");
                  setPasteText("");
                }}
              >
                <ClipboardPaste className="h-3 w-3" />
                Jadvaldan nusxa qoʻyish (Ctrl+V)
              </Button>
              {bankItems.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {bankItems.length} ta operatsiya
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">2. 1C fayli</CardTitle>
            <CardDescription className="text-xs">
              .xlsx, .xml, .txt, .csv
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <input
              ref={oneCInputRef}
              type="file"
              accept=".xlsx,.xls,.xml,.txt,.csv,.tsv"
              className="hidden"
              onChange={(e) => handleUploadFile("onec", e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-16 border-dashed flex flex-col gap-1"
              onClick={() => oneCInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 text-emerald-600" />
              <span>{oneCFileName || "1C faylini tanlash (.xlsx, .xml, .txt, .csv)"}</span>
            </Button>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-[11px] h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setPasteTarget("onec");
                    setPasteText("");
                  }}
                >
                  <ClipboardPaste className="h-3 w-3" />
                  Nusxa qoʻyish
                </Button>
                {FEATURES.fullAccountingErp && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
                    onClick={handleLoadDbAs1C}
                  >
                    <Database className="h-3 w-3" />
                    Saytdagi baza
                  </Button>
                )}
              </div>
              {oneCItems.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {oneCItems.length} ta yozuv
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results & Actions */}
      {summary && (
        <>
          {/* Count KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="cursor-pointer hover:border-emerald-500/50" onClick={() => setActiveTab("matched")}>
              <CardContent className="pt-4 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">100% Mos tushgan</p>
                  <p className="text-xl font-bold text-emerald-600">{summary.matchedCount}</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-emerald-500/70" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-amber-500/50" onClick={() => setActiveTab("amount_mismatch")}>
              <CardContent className="pt-4 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Summa / Sana farqi</p>
                  <p className="text-xl font-bold text-amber-600">{summary.mismatchCount}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-amber-500/70" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-rose-500/50" onClick={() => setActiveTab("bank_only")}>
              <CardContent className="pt-4 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Bankda bor, 1C da yoʻq</p>
                  <p className="text-xl font-bold text-rose-600">{summary.bankOnlyCount}</p>
                </div>
                <XCircle className="h-6 w-6 text-rose-500/70" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-indigo-500/50" onClick={() => setActiveTab("one_c_only")}>
              <CardContent className="pt-4 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">1C da bor, Bankda yoʻq</p>
                  <p className="text-xl font-bold text-indigo-600">{summary.oneCOnlyCount}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-indigo-500/70" />
              </CardContent>
            </Card>
          </div>

          {/* Bank vs 1C Turnover Summary Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <Card className="bg-muted/20">
              <CardContent className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground">Jami Kirim (Bank vs 1C)</p>
                  <div className="flex items-center gap-2 mt-0.5 font-mono font-semibold">
                    <span className="text-emerald-600">
                      <Money amount={summary.bankTotalIncome} />
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span>
                      <Money amount={summary.oneCTotalIncome} />
                    </span>
                  </div>
                </div>
                <Badge variant={incomeDiff === 0 ? "success" : "warning"} className="font-mono text-[10px]">
                  {incomeDiff === 0 ? "Kirim mos (0)" : `Farq: ${incomeDiff > 0 ? "+" : ""}${incomeDiff.toLocaleString("uz-UZ")}`}
                </Badge>
              </CardContent>
            </Card>
            <Card className="bg-muted/20">
              <CardContent className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground">Jami Chiqim (Bank vs 1C)</p>
                  <div className="flex items-center gap-2 mt-0.5 font-mono font-semibold">
                    <span className="text-rose-600">
                      <Money amount={summary.bankTotalExpense} />
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span>
                      <Money amount={summary.oneCTotalExpense} />
                    </span>
                  </div>
                </div>
                <Badge variant={expenseDiff === 0 ? "success" : "warning"} className="font-mono text-[10px]">
                  {expenseDiff === 0 ? "Chiqim mos (0)" : `Farq: ${expenseDiff > 0 ? "+" : ""}${expenseDiff.toLocaleString("uz-UZ")}`}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Action & Filter Toolbar */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-8 text-xs flex-wrap">
                  <TabsTrigger value="all" className="text-xs px-2.5">Barchasi ({rows.length})</TabsTrigger>
                  <TabsTrigger value="bank_only" className="text-xs px-2.5">1C da yoʻq ({summary.bankOnlyCount})</TabsTrigger>
                  <TabsTrigger value="amount_mismatch" className="text-xs px-2.5">Farqlar ({summary.mismatchCount})</TabsTrigger>
                  <TabsTrigger value="one_c_only" className="text-xs px-2.5">Bankda yoʻq ({summary.oneCOnlyCount})</TabsTrigger>
                  <TabsTrigger value="matched" className="text-xs px-2.5">Mos ({summary.matchedCount})</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative w-full lg:w-64">
                <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Kontragent, STIR, summa qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                disabled={isAiChecking}
                onClick={handleAiVerify}
              >
                {isAiChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI bilan tekshirish
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={handleExport1CTxt}>
                <Download className="h-3.5 w-3.5" />
                1C ga yuklash (.txt)
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={handleExport1CXml}>
                <FileCode className="h-3.5 w-3.5" />
                1C Provodka (.xml)
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={handleDownloadCsv}>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV Hisobot
              </Button>
              {currentEntity?.id && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 gap-1.5"
                  disabled={isSavingBatch || Boolean(activeBatchId)}
                  onClick={() => handleSaveBatchToHistory(false)}
                >
                  {isSavingBatch ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <BookmarkCheck className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  {activeBatchId ? "Saqlangan" : "Tarixga saqlash"}
                </Button>
              )}
              {FEATURES.fullAccountingErp && selectedIds.length > 0 && (
                <Button
                  size="sm"
                  variant="success"
                  className="text-xs h-8 gap-1.5"
                  disabled={isPostingLedger}
                  onClick={handlePostSelectedToLedger}
                >
                  {isPostingLedger ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Bosh kitobga yozish ({selectedIds.length})
                </Button>
              )}
            </div>
          </div>

          {aiModeNote && (
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {aiModeNote}
            </div>
          )}

          {/* Diff Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        aria-label="Barchasini belgilash"
                        checked={allVisibleSelected}
                        disabled={selectableFilteredIds.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds((prev) => Array.from(new Set([...prev, ...selectableFilteredIds])));
                          } else {
                            setSelectedIds((prev) => prev.filter((id) => !selectableFilteredIds.includes(id)));
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead>Kontragent</TableHead>
                    <TableHead className="text-right">Bank summasi</TableHead>
                    <TableHead className="text-right">1C summasi</TableHead>
                    <TableHead>Schyot</TableHead>
                    <TableHead>QQS 12%</TableHead>
                    <TableHead>AI Izoh va Tavsiya</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                        Ushbu filtr boʻyicha yozuvlar topilmadi.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRows.map((row) => (
                      <TableRow key={row.id} className="text-xs">
                        <TableCell>
                          <Checkbox
                            aria-label={`${row.counterparty} tanlash`}
                            checked={selectedIds.includes(row.id)}
                            disabled={row.bankAmount <= 0}
                            onCheckedChange={(checked) => {
                              setSelectedIds((prev) =>
                                checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {row.status === "matched" && <Badge variant="success" className="text-[10px]">Mos</Badge>}
                          {row.status === "amount_mismatch" && <Badge variant="warning" className="text-[10px]">Farq bor</Badge>}
                          {row.status === "bank_only" && <Badge variant="destructive" className="text-[10px]">1C da yoʻq</Badge>}
                          {row.status === "one_c_only" && <Badge variant="outline" className="text-[10px]">Bankda yoʻq</Badge>}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] whitespace-nowrap">{row.date}</TableCell>
                        <TableCell className="font-medium min-w-[160px]">
                          <div>{row.counterparty}</div>
                          {row.counterpartyStir && (
                            <div className="text-[10px] font-mono text-muted-foreground">STIR: {row.counterpartyStir}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {row.bankAmount > 0 ? (
                            <span className={row.type === "income" ? "text-emerald-600" : "text-foreground"}>
                              <Money amount={row.bankAmount} />
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {row.oneCAmount > 0 ? <Money amount={row.oneCAmount} /> : "—"}
                        </TableCell>
                        <TableCell>
                          <select
                            aria-label={`${row.counterparty} schyoti`}
                            value={row.suggestedAccountCode}
                            onChange={(e) => handleChangeRowAccount(row.id, e.target.value)}
                            className="h-7 rounded border border-input bg-background px-1.5 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {RECONCILE_ACCOUNT_OPTIONS.map((opt) => (
                              <option key={opt.code} value={opt.code}>
                                {opt.code} — {opt.name.slice(0, 22)}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleToggleRowVat(row.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                              row.vatIncluded
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                            }`}
                            title="12% QQS ajratishni yoqish / o'chirish"
                          >
                            {row.vatIncluded ? "QQS 12%" : "QQSsiz"}
                          </button>
                        </TableCell>
                        <TableCell className="max-w-[280px] text-[11px] text-muted-foreground">
                          <div className="flex items-start gap-1">
                            {row.aiVerified && <Sparkles className="h-3 w-3 text-indigo-500 shrink-0 mt-0.5" />}
                            <span>{row.explanation}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <PaginationBar
                page={rowsPage}
                pageSize={ROWS_PAGE_SIZE}
                totalCount={filteredRows.length}
                itemLabel="qator"
                onPageChange={setRowsPage}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Saved Batch History organized by Month (10 per page from DB) */}
      {currentEntity?.id && (
        <div ref={historyCardRef} id="reconcile-history">
        <Card>
          <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">
                Saqlangan ishlar tarixi ({savedBatchesCount})
              </CardTitle>
            </div>
            {historyMonths.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant={historyMonth === "all" ? "default" : "outline"}
                  className="h-6 text-[11px] px-2"
                  onClick={() => {
                    setHistoryMonth("all");
                    setHistoryPage(1);
                  }}
                >
                  Barchasi
                </Button>
                {historyMonths.map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={historyMonth === m ? "default" : "outline"}
                      className="h-6 text-[11px] px-2 font-mono"
                      onClick={() => {
                        setHistoryMonth(m);
                        setHistoryPage(1);
                      }}
                    >
                      {m}
                    </Button>
                  ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {isLoadingHistory ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                Tarix yuklanmoqda...
              </div>
            ) : savedBatches.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Saqlangan solishtirishlar yoʻq
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Oy</TableHead>
                    <TableHead>Fayllar</TableHead>
                    <TableHead className="text-right">Qator</TableHead>
                    <TableHead className="text-right">Bank Kirim</TableHead>
                    <TableHead className="text-right">Bank Chiqim</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead className="text-right">Amal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedBatches.map((b) => (
                      <TableRow key={b.id} className="text-xs">
                        <TableCell className="font-mono text-[11px] whitespace-nowrap">{b.periodMonth}</TableCell>
                        <TableCell className="font-medium max-w-[260px] truncate">{b.title}</TableCell>
                        <TableCell className="text-right font-mono">{b.rowCount}</TableCell>
                        <TableCell className="text-right font-mono text-emerald-600">
                          <Money amount={b.totalIncome} />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <Money amount={b.totalExpense} />
                        </TableCell>
                        <TableCell>
                          {b.status === "posted_to_ledger" ? (
                            <Badge variant="success" className="text-[10px]">Bosh kitobda</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Tekshirilgan</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1 px-2"
                              disabled={openingBatchId === b.id}
                              onClick={() => handleOpenBatch(b)}
                            >
                              {openingBatchId === b.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <FolderOpen className="h-3 w-3" />
                              )}
                              Ochish
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              aria-label="Oʻchirish"
                              onClick={() => handleDeleteBatch(b.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
            <PaginationBar
              page={historyPage}
              pageSize={HISTORY_PAGE_SIZE}
              totalCount={savedBatchesCount}
              isLoading={isLoadingHistory}
              itemLabel="ish"
              onPageChange={setHistoryPage}
            />
          </CardContent>
        </Card>
        </div>
      )}

      {/* Clipboard Paste Dialog */}
      <Dialog open={pasteTarget !== null} onOpenChange={(o) => !o && setPasteTarget(null)}>
        <DialogContent className="sm:max-w-lg text-xs">
          <DialogHeader>
            <DialogTitle className="text-base">
              {pasteTarget === "bank" ? "Bank koʻchirmasini joylashtirish" : "1C jadvalini joylashtirish"}
            </DialogTitle>
          </DialogHeader>
          <textarea
            rows={8}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Jadval qatorlarini joylashtiring"
            className="w-full rounded-md border border-input bg-background p-2.5 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPasteTarget(null)}>
              Bekor qilish
            </Button>
            <Button type="button" size="sm" onClick={handleApplyPaste} className="gap-1.5">
              <ClipboardPaste className="h-3.5 w-3.5" />
              Oʻqish va solishtirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReconcilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Yuklanmoqda...</div>}>
      <ReconcileContent />
    </Suspense>
  );
}
