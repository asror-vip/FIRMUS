"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Transaction } from "@/lib/types/accounting";
import { fetchTransactionsPaginated, createTransaction, updateTransactionStatus } from "@/lib/services/supabase-service";
import { transactionSchema, getFirstZodError } from "@/lib/validations/accounting";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { importBatchTransactions, ParsedBankTransaction } from "@/lib/services/bank-import";
import { decodeBankFileBuffer, parseStatementFile } from "@/lib/services/reconcile-engine";
import { generate1CClientBankText } from "@/lib/services/one-c-export";
import {
  Search,
  Filter,
  Download,
  Plus,
  Sparkles,
  X,
  CheckCircle2,
  FileText,
  ArrowUpRight,
  Upload,
  FileCode,
} from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/lib/context/app-state";
import { useTranslation } from "@/lib/i18n/useTranslation";

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentEntity, currentRole } = useAppState();
  const { t } = useTranslation();

  const initialTab = searchParams.get("tab") || "all";
  const initialTxId = searchParams.get("id");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Extended Filter Bar state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");

  // Modal form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    type: "expense" as "income" | "expense",
    counterparty: "",
    counterpartyStir: "",
    description: "",
    accountCode: "6010",
  });

  // Bank Vypiska Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importedList, setImportedList] = useState<ParsedBankTransaction[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importFileName, setImportFileName] = useState("");

  const handleExport1C = () => {
    const textContent = generate1CClientBankText(transactions);
    const blob = new Blob([textContent], { type: "text/plain;charset=windows-1251" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kl_to_1c_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("1C:Buxgalteriya uchun bank koʻchirmasi (kl_to_1c.txt) muvaffaqiyatli yuklandi!");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const text = decodeBankFileBuffer(buffer);
      if (!text) return;

      const parsed = parseStatementFile(text, file.name, currentEntity?.tinStir || "");
      if (parsed.length === 0) {
        toast.error("Fayldan toʻlov operatsiyalari topilmadi. Fayl formati 1C Client-Bank (.txt), XML yoki CSV boʻlishi kerak.");
      } else {
        setImportedList(parsed);
        toast.success(`Fayldan ${parsed.length} ta bank toʻlovi muvaffaqiyatli aniqlandi!`);
      }
    } catch (err: any) {
      toast.error("Faylni oʻqishda xatolik: " + (err?.message || "Nomaʼlum xato"));
    }
  };

  const loadTransactions = useCallback(async () => {
    if (!currentEntity?.id) {
      setTransactions([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, count } = await fetchTransactionsPaginated(currentEntity.id, {
        page: currentPage,
        pageSize,
        tab: activeTab,
        search,
      });
      setTransactions((data || []) as Transaction[]);
      setTotalCount(count);
      if (initialTxId) {
        const match = (data || []).find((row: any) => row.id === initialTxId);
        if (match) setSelectedTx(match as Transaction);
      }
    } catch (err: any) {
      console.error("Error loading transactions:", err);
      toast.error("Tranzaksiyalarni yuklab boʻlmadi: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentEntity?.id, currentPage, pageSize, activeTab, search, initialTxId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [currentEntity?.id, activeTab, search]);

  const handleConfirmImport = async () => {
    if (importedList.length === 0) return;
    setIsImporting(true);
    try {
      const saved = await importBatchTransactions(importedList, currentEntity?.id);
      await loadTransactions();
      toast.success(`${saved.length} ta bank toʻlovi Supabase bazasiga kiritildi va Ledgerga bogʻlandi!`);
      setIsImportOpen(false);
      setImportedList([]);
      setImportFileName("");
    } catch (err: any) {
      toast.error("Import qilishda xatolik: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = () => {
    const headers = ["ID", "Sana", "Kontragent", "STIR", "Turi", "Summa", "Tavsif", "Holat"];
    const rows = transactions.map((tx) => [
      tx.id,
      tx.date,
      `"${(tx.counterparty || "").replace(/"/g, '""')}"`,
      tx.counterpartyStir || "",
      tx.type,
      tx.amount,
      `"${(tx.description || "").replace(/"/g, '""')}"`,
      tx.status,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `firmus_transactions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Tranzaksiyalar CSV formatida yuklab olindi");
  };

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = transactionSchema.safeParse({
      date: newTx.date,
      amount: newTx.amount,
      type: newTx.type,
      counterparty: newTx.counterparty,
      counterpartyStir: newTx.counterpartyStir || undefined,
      description: newTx.description,
      accountCode: newTx.accountCode,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransaction({
        entityId: currentEntity?.id,
        date: parsed.data.date,
        amount: parsed.data.amount,
        type: parsed.data.type,
        counterparty: parsed.data.counterparty,
        counterpartyStir: parsed.data.counterpartyStir || undefined,
        description: parsed.data.description,
        accountCode: parsed.data.accountCode,
        accountName: parsed.data.type === "income" ? "Xaridorlar schyoti" : "Yetkazib beruvchilar schyoti",
      });

      await loadTransactions();
      toast.success("Tranzaksiya Supabase maʼlumotlar bazasiga muvaffaqiyatli saqlandi!");
      setIsAddOpen(false);
      setNewTx({
        date: new Date().toISOString().split("T")[0],
        amount: "",
        type: "expense",
        counterparty: "",
        counterpartyStir: "",
        description: "",
        accountCode: "6010",
      });
    } catch (err: any) {
      toast.error("Xatolik yuz berdi: " + (err.message || "Saqlash muvaffaqiyatsiz"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client-side secondary filter (date range / min amount) on top of server-side paginated results
  const filtered = transactions.filter((tx) => {
    if (dateFrom && tx.date < dateFrom) return false;
    if (dateTo && tx.date > dateTo) return false;
    if (minAmount && Number(tx.amount) < Number(minAmount)) return false;
    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filtered.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedTx = filtered;

  const handleApproveTx = async (tx: Transaction) => {
    try {
      await updateTransactionStatus(tx.id, "posted", {
        entityId: currentEntity?.id,
        date: tx.date,
        amount: tx.amount,
        type: tx.type,
        counterparty: tx.counterparty,
        description: tx.description,
        accountCode: tx.accountCode,
      });
      await loadTransactions();
      toast.success(`«${tx.counterparty}» tranzaksiyasi tasdiqlandi va Bosh kitobga (Ledger) provodka tushirildi!`);
      setSelectedTx(null);
    } catch (err: any) {
      toast.error("Tasdiqlashda xatolik: " + err.message);
    }
  };

  const handleRejectTx = async (tx: Transaction) => {
    try {
      await updateTransactionStatus(tx.id, "rejected");
      await loadTransactions();
      toast.success(`«${tx.counterparty}» tranzaksiyasi rad etildi.`);
      setSelectedTx(null);
    } catch (err: any) {
      toast.error("Rad etishda xatolik: " + err.message);
    }
  };

  const handleBatchApprove = async () => {
    try {
      const selectedObjects = transactions.filter((t) => selectedIds.includes(t.id));
      for (const tx of selectedObjects) {
        await updateTransactionStatus(tx.id, "posted", {
          entityId: currentEntity?.id,
          date: tx.date,
          amount: tx.amount,
          type: tx.type,
          counterparty: tx.counterparty,
          description: tx.description,
          accountCode: tx.accountCode,
        });
      }
      await loadTransactions();
      toast.success(`${selectedIds.length} ta tranzaksiya tasdiqlandi va Bosh kitobga (Ledger) provodkalar tushirildi!`);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error("Ommaviy tasdiqlashda xatolik: " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.transactions.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.transactions.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5 border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300"
            onClick={() => setIsImportOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            Vypiska import (.txt / CSV)
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleExport1C}
            title="1C:Buxgalteriya Client-Bank formatida yuklab olish"
          >
            <FileCode className="h-3.5 w-3.5 text-amber-600" />
            1C ga eksport
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleExport}
          >
            <Download className="h-3.5 w-3.5" />
            {t.common.export} (CSV)
          </Button>

          {currentRole !== "viewer" && currentRole !== "auditor" && (
            <Button
              size="sm"
              className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t.common.addNew}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value="all">{t.pages.transactions.tabs.all} ({totalCount})</TabsTrigger>
            <TabsTrigger value="income">{t.pages.transactions.tabs.income}</TabsTrigger>
            <TabsTrigger value="expense">{t.pages.transactions.tabs.expense}</TabsTrigger>
            <TabsTrigger value="pending">{t.pages.transactions.tabs.pending}</TabsTrigger>
            <TabsTrigger value="exception">{t.pages.transactions.tabs.exception}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.pages.transactions.searchPlaceholder}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button
            variant={isFilterOpen ? "default" : "outline"}
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={() => setIsFilterOpen((v) => !v)}
          >
            <Filter className="h-3.5 w-3.5 mr-1" />
            {t.common.filter}
          </Button>
        </div>
      </div>

      {isFilterOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl border border-border bg-muted/20 p-3 text-xs">
          <div>
            <Label className="text-[11px] text-muted-foreground">Sanadan</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs mt-1 bg-background"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Sanagacha</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs mt-1 bg-background"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Minimal summa (UZS)</Label>
            <Input
              type="number"
              placeholder="Masalan: 1000000"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="h-8 text-xs font-mono mt-1 bg-background"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs w-full"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setMinAmount("");
              }}
            >
              Filtrlarni tozalash
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar (when selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2.5 text-xs">
          <span className="font-medium text-foreground">
            {selectedIds.length} — {t.nav.transactions}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="success"
              className="h-7 px-3 text-xs"
              onClick={handleBatchApprove}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              {t.pages.transactions.batchApprove}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedIds([])}
            >
              {t.common.cancel}
            </Button>
          </div>
        </div>
      )}

      {/* Transactions Data Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead>{t.pages.transactions.tableHeaders.date}</TableHead>
              <TableHead>{t.pages.transactions.tableHeaders.counterparty}</TableHead>
              <TableHead>{t.pages.transactions.tableHeaders.description}</TableHead>
              <TableHead className="text-right">{t.pages.transactions.tableHeaders.amount}</TableHead>
              <TableHead>{t.pages.transactions.tableHeaders.source}</TableHead>
              <TableHead>{t.pages.transactions.tableHeaders.status}</TableHead>
              <TableHead>{t.pages.transactions.tableHeaders.linkedDoc}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTx.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                  {isLoading
                    ? "Tranzaksiyalar Supabase bazasidan yuklanmoqda..."
                    : "Ushbu korxona boʻyicha mos tranzaksiya topilmadi."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTx.map((tx) => (
              <TableRow
                key={tx.id}
                className="cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => setSelectedTx(tx)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(tx.id)}
                    onCheckedChange={(checked) => handleSelectOne(tx.id, !!checked)}
                  />
                </TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  {tx.date}
                </TableCell>
                <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                  {tx.counterparty}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[260px] truncate">
                  {tx.description}
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={tx.amount} type={tx.type} />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {tx.source}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusPill status={tx.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tx.matchedDocumentName ? (
                    <span className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      <FileText className="h-3 w-3" />
                      {tx.matchedDocumentName}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            Jami: <strong className="text-foreground">{totalCount}</strong> ta operatsiya (Sahifa {currentPage} / {totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Oldingi
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Keyingi
            </Button>
          </div>
        </div>
      </div>

      {/* Slide-over Detail Panel */}
      {selectedTx && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[500px] flex-col border-l border-border bg-card shadow-2xl p-6 duration-200 animate-in slide-in-from-right overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Tranzaksiya ID: {selectedTx.id}
              </span>
              <h2 className="text-base font-bold text-foreground mt-0.5">
                {selectedTx.counterparty}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setSelectedTx(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="py-5 space-y-5 text-xs">
            {/* Amount Box */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[11px]">{t.common.amount}:</span>
                <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                  <Money amount={selectedTx.amount} type={selectedTx.type} />
                </div>
              </div>
              <StatusPill status={selectedTx.status} />
            </div>

            {/* Details List */}
            <div className="space-y-2.5">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{t.common.date}:</span>
                <span className="font-medium text-foreground">{selectedTx.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{t.entity.tin}:</span>
                <span className="font-mono text-foreground">{selectedTx.counterpartyStir || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{t.pages.transactions.tableHeaders.source}:</span>
                <Badge variant="outline" className="uppercase font-mono text-[10px]">
                  {selectedTx.source}
                </Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{t.nav.accounting}:</span>
                <span className="font-mono font-medium text-foreground">
                  {selectedTx.accountCode ? `${selectedTx.accountCode} (${selectedTx.accountName})` : "—"}
                </span>
              </div>
            </div>

            {/* AI Explanation / Suggestion Card */}
            {selectedTx.aiExplanation && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t.dashboard.aiRecommendationTitle}</span>
                  {selectedTx.aiConfidence && (
                    <Badge variant="indigo" className="ml-auto text-[9px] px-1 py-0 h-4">
                      {selectedTx.aiConfidence}% {t.pages.aiAuditor.confidence}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-foreground leading-relaxed">
                  {selectedTx.aiExplanation}
                </p>
              </div>
            )}

            {/* Linked Document Card */}
            {selectedTx.matchedDocumentName && (
              <div className="rounded-xl border border-border p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{selectedTx.matchedDocumentName}</p>
                    <p className="text-[10px] text-muted-foreground">{t.nav.documents}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => router.push("/reconcile")}
                >
                  Sverka <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Actions */}
            {currentRole !== "viewer" && currentRole !== "auditor" && (
              <div className="pt-4 flex items-center gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                  disabled={selectedTx.status === "posted"}
                  onClick={() => handleApproveTx(selectedTx)}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {selectedTx.status === "posted" ? "Tasdiqlangan" : t.common.approve}
                </Button>
                <Button
                  variant="outline"
                  className="h-9"
                  disabled={selectedTx.status === "rejected"}
                  onClick={() => handleRejectTx(selectedTx)}
                >
                  {t.common.reject}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Transaction Dialog Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Yangi bank tranzaksiyasini qoʻshish
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Supabase maʼlumotlar bazasiga yangi kirim yoki chiqim operatsiyasini kiriting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTx} className="space-y-3.5 pt-2 text-xs">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewTx({ ...newTx, type: "income", accountCode: "4010" })}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  newTx.type === "income"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Kirim (Daromad)
              </button>
              <button
                type="button"
                onClick={() => setNewTx({ ...newTx, type: "expense", accountCode: "6010" })}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  newTx.type === "expense"
                    ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold"
                    : "border-border hover:bg-muted text-muted-foreground"
                }`}
              >
                <ArrowUpRight className="h-3.5 w-3.5 rotate-90" />
                Chiqim (Xarajat)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Sana *</Label>
                <Input
                  type="date"
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Summa (UZS) *</Label>
                <Input
                  type="number"
                  placeholder="Masalan: 15000000"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Kontragent nomi *</Label>
                <Input
                  placeholder="OOO / MChJ / YaTT nomi"
                  value={newTx.counterparty}
                  onChange={(e) => setNewTx({ ...newTx, counterparty: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Kontragent STIR (9 ta raqam)</Label>
                <Input
                  placeholder="309112233"
                  maxLength={9}
                  value={newTx.counterpartyStir}
                  onChange={(e) => setNewTx({ ...newTx, counterpartyStir: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-medium text-foreground">Buxgalteriya schyoti (BHMS)</Label>
              <Input
                placeholder="6010 yoki 4010"
                value={newTx.accountCode}
                onChange={(e) => setNewTx({ ...newTx, accountCode: e.target.value })}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>

            <div>
              <Label className="text-[11px] font-medium text-foreground">Toʻlov maqsadi / Tavsif *</Label>
              <Input
                placeholder="Shartnoma boʻyicha tovar/xizmat haqi..."
                value={newTx.description}
                onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saqlanmoqda..." : "Bazaga saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bank Vypiska Import Modal Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-600" />
              Bank koʻchirmasini yuklash (Vypiska Import)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Kapitalbank, Hamkorbank, Ipotekabank, SQB yoki NBU Bank-Klientidan yuklangan 1C (.txt) yoki .csv faylini tanlang.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs flex-1 overflow-y-auto">
            {/* File Upload Area */}
            <div className="rounded-xl border border-dashed border-border p-5 text-center bg-muted/20 hover:bg-muted/40 transition-colors">
              <Upload className="mx-auto h-7 w-7 text-indigo-600 mb-2" />
              <label htmlFor="bank-file-upload" className="cursor-pointer font-semibold text-xs text-indigo-600 hover:underline">
                Faylni tanlang yoki shu yerga tashlang
              </label>
              <p className="text-[10px] text-muted-foreground mt-1">
                Format: 1C Client-Bank (*.txt) yoki Bank hisob-kitob koʻchirmasi (*.csv)
              </p>
              <input
                id="bank-file-upload"
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
              {importFileName && (
                <Badge variant="indigo" className="mt-2 text-xs font-mono">
                  Tanlangan: {importFileName}
                </Badge>
              )}
            </div>

            {/* Parsed Preview Table */}
            {importedList.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-xs">
                      Aniqlangan toʻlovlar: {importedList.length} ta
                    </span>
                    <Badge variant="success" className="text-[10px]">
                      {importedList.filter((i) => i.type === "income").length} kirim
                    </Badge>
                    <Badge variant="destructive" className="text-[10px]">
                      {importedList.filter((i) => i.type === "expense").length} chiqim
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-foreground">
                    Jami: {importedList.reduce((acc, c) => acc + c.amount, 0).toLocaleString()} UZS
                  </span>
                </div>

                <div className="rounded-lg border border-border max-h-56 overflow-y-auto text-[11px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sana</TableHead>
                        <TableHead>Turi</TableHead>
                        <TableHead>Kontragent</TableHead>
                        <TableHead>STIR</TableHead>
                        <TableHead className="text-right">Summa</TableHead>
                        <TableHead>Toʻlov maqsadi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importedList.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono whitespace-nowrap">{item.date}</TableCell>
                          <TableCell>
                            <Badge variant={item.type === "income" ? "success" : "outline"} className="text-[9px]">
                              {item.type === "income" ? "Kirim" : "Chiqim"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-[140px] truncate">{item.counterparty}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{item.counterpartyStir || "—"}</TableCell>
                          <TableCell className={`text-right font-mono font-bold ${item.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                            {item.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[180px] truncate">{item.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setIsImportOpen(false);
                setImportedList([]);
                setImportFileName("");
              }}
              disabled={isImporting}
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleConfirmImport}
              disabled={importedList.length === 0 || isImporting}
            >
              {isImporting ? "Bazaga yozilmoqda..." : `Supabase bazasiga import qilish (${importedList.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Yuklanmoqda...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
