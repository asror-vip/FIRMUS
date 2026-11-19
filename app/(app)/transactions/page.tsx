"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Transaction } from "@/lib/types/accounting";
import { fetchTransactionsPaginated, createTransaction, updateTransactionStatus } from "@/lib/services/supabase-service";
import { cacheKeys, peekQueryCache } from "@/lib/cache/query-cache";
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
import { parseStatementFileBuffer } from "@/lib/services/reconcile-engine";
import { generate1CClientBankText } from "@/lib/services/one-c-export";
import { sanitizeCsvField, downloadCsvBlob } from "@/lib/utils/csv";
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
import { getReconcileErpDict, getIntlLocale } from "@/lib/i18n/domains/reconcile-erp";

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentEntity, currentRole } = useAppState();
  const isReadOnly = currentRole === "viewer" || currentRole === "auditor";
  const { t, locale } = useTranslation();
  const dict = getReconcileErpDict(locale);
  const d = dict.erpExtra.transactions;
  const intlLocale = getIntlLocale(locale);

  const tabParam = searchParams.get("tab");
  const initialTab = tabParam || "all";
  const initialTxId = searchParams.get("id");
  const pageSize = 10;

  const initialPeek = currentEntity?.id
    ? peekQueryCache<{ data: Transaction[]; count: number }>(
        cacheKeys.transactionsPaginated(currentEntity.id, {
          page: 1,
          pageSize,
          tab: initialTab,
          search: "",
        })
      )
    : null;

  const [transactions, setTransactions] = useState<Transaction[]>(
    () => (initialPeek?.data.data as Transaction[]) || []
  );
  const [totalCount, setTotalCount] = useState(() => initialPeek?.data.count ?? 0);
  const [isLoading, setIsLoading] = useState(() => !initialPeek);
  const [isMutating, setIsMutating] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(() => {
    if (!initialTxId || !initialPeek?.data.data) return null;
    return (initialPeek.data.data as Transaction[]).find((row) => row.id === initialTxId) || null;
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setActiveTab(tabParam || "all");
  }, [tabParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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
    toast.success(d.toasts.exported1C);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = await parseStatementFileBuffer(buffer, file.name, currentEntity?.tinStir || "");
      if (parsed.length === 0) {
        toast.error(d.toasts.noParsedOps);
      } else {
        setImportedList(parsed);
        toast.success(d.toasts.parsedOpsSuccess.replace("{count}", String(parsed.length)));
      }
    } catch (err: any) {
      toast.error(d.toasts.fileReadError.replace("{error}", err?.message || d.unknownError));
    }
  };

  const loadTransactions = useCallback(async () => {
    if (!currentEntity?.id) {
      setTransactions([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    const peek = peekQueryCache<{ data: Transaction[]; count: number }>(
      cacheKeys.transactionsPaginated(currentEntity.id, {
        page: Math.max(1, currentPage || 1),
        pageSize,
        tab: activeTab || "all",
        search: debouncedSearch.trim(),
      })
    );

    if (peek) {
      const cachedRows = (peek.data.data || []) as Transaction[];
      setTransactions(cachedRows);
      setTotalCount(peek.data.count ?? 0);
      if (initialTxId) {
        const match = cachedRows.find((row) => row.id === initialTxId);
        if (match) setSelectedTx(match);
      }
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const { data, count } = await fetchTransactionsPaginated(currentEntity.id, {
        page: currentPage,
        pageSize,
        tab: activeTab,
        search: debouncedSearch,
      });
      setTransactions((data || []) as Transaction[]);
      setTotalCount(count);
      if (initialTxId) {
        const match = (data || []).find((row: any) => row.id === initialTxId);
        if (match) setSelectedTx(match as Transaction);
      }
    } catch (err: any) {
      console.error("Error loading transactions:", err);
      toast.error(d.toasts.loadTxError.replace("{error}", err.message));
    } finally {
      setIsLoading(false);
    }
  }, [currentEntity?.id, currentPage, pageSize, activeTab, debouncedSearch, initialTxId, d.toasts.loadTxError]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentEntity?.id, activeTab, debouncedSearch]);

  useEffect(() => {
    setSelectedIds([]);
  }, [currentEntity?.id, activeTab, search, currentPage]);

  const handleConfirmImport = async () => {
    if (isReadOnly || importedList.length === 0) return;
    setIsImporting(true);
    try {
      const saved = await importBatchTransactions(importedList, currentEntity?.id);
      await loadTransactions();
      toast.success(d.toasts.importedToDb.replace("{count}", String(saved.length)));
      setIsImportOpen(false);
      setImportedList([]);
      setImportFileName("");
    } catch (err: any) {
      toast.error(d.toasts.importError.replace("{error}", err.message));
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = () => {
    const headers = d.csvHeaders.map((h) => sanitizeCsvField(h));
    const rows = transactions.map((tx) => [
      sanitizeCsvField(tx.id),
      sanitizeCsvField(tx.date),
      sanitizeCsvField(tx.counterparty || ""),
      sanitizeCsvField(tx.counterpartyStir || ""),
      sanitizeCsvField(tx.type),
      sanitizeCsvField(tx.amount),
      sanitizeCsvField(tx.description || ""),
      sanitizeCsvField(tx.status),
    ]);
    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    downloadCsvBlob(`firmus_transactions_${new Date().toISOString().split("T")[0]}.csv`, csvContent);
    toast.success(d.toasts.csvExported);
  };

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
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
        accountName: parsed.data.type === "income" ? d.incomeAccFallbackName : d.expenseAccFallbackName,
      });

      await loadTransactions();
      toast.success(d.toasts.txSaved);
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
      toast.error(d.toasts.txSaveError.replace("{error}", err.message || d.saveFailedFallback));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client-side secondary filter (date range / min amount) on top of server-side paginated results
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (dateFrom && tx.date < dateFrom) return false;
      if (dateTo && tx.date > dateTo) return false;
      if (minAmount && Number(tx.amount) < Number(minAmount)) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo, minAmount]);

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
    if (isReadOnly || isMutating) return;
    setIsMutating(true);
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
      toast.success(d.toasts.txApproved.replace("{counterparty}", tx.counterparty));
      setSelectedTx(null);
    } catch (err: any) {
      toast.error(d.toasts.txApproveError.replace("{error}", err.message));
    } finally {
      setIsMutating(false);
    }
  };

  const handleRejectTx = async (tx: Transaction) => {
    if (isReadOnly || isMutating) return;
    setIsMutating(true);
    try {
      await updateTransactionStatus(tx.id, "rejected");
      await loadTransactions();
      toast.success(d.toasts.txRejected.replace("{counterparty}", tx.counterparty));
      setSelectedTx(null);
    } catch (err: any) {
      toast.error(d.toasts.txRejectError.replace("{error}", err.message));
    } finally {
      setIsMutating(false);
    }
  };

  const handleBatchApprove = async () => {
    if (isReadOnly || isMutating) return;
    const selectedObjects = transactions.filter((t) => selectedIds.includes(t.id));
    if (selectedObjects.length === 0) return;

    setIsMutating(true);
    let approvedCount = 0;
    let firstError: any = null;
    try {
      const CHUNK_SIZE = 5;
      for (let i = 0; i < selectedObjects.length; i += CHUNK_SIZE) {
        const chunk = selectedObjects.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(
          chunk.map((tx) =>
            updateTransactionStatus(tx.id, "posted", {
              entityId: currentEntity?.id,
              date: tx.date,
              amount: tx.amount,
              type: tx.type,
              counterparty: tx.counterparty,
              description: tx.description,
              accountCode: tx.accountCode,
            })
          )
        );
        for (const res of results) {
          if (res.status === "fulfilled") {
            approvedCount++;
          } else if (!firstError) {
            firstError = res.reason;
          }
        }
      }
      await loadTransactions();
      if (firstError) {
        toast.error(d.toasts.batchApproveError.replace("{error}", firstError?.message || d.unknownError));
      } else {
        toast.success(d.toasts.batchApproved.replace("{count}", String(approvedCount)));
      }
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(d.toasts.batchApproveError.replace("{error}", err.message));
    } finally {
      setIsMutating(false);
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
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-300"
              onClick={() => setIsImportOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              {d.importBtn}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleExport1C}
            title={d.export1CTitle}
          >
            <FileCode className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            {d.export1CBtn}
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

          {!isReadOnly && (
            <Button
              size="sm"
              className="text-xs h-8 gap-1.5 bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-3.5 text-xs">
          <div>
            <Label className="text-[11px] text-muted-foreground">{d.dateFromLabel}</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs mt-1 bg-background/50 border-border/60"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">{d.dateToLabel}</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs mt-1 bg-background/50 border-border/60"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">{d.minAmountLabel}</Label>
            <Input
              type="number"
              placeholder={d.minAmountPlaceholder}
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="h-8 text-xs font-mono mt-1 bg-background/50 border-border/60"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs w-full border-border/60 hover:bg-muted/30"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setMinAmount("");
              }}
            >
              {d.clearFiltersBtn}
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar (when selected) */}
      {!isReadOnly && selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-violet-500/30 bg-violet-500/10 p-2.5 text-xs">
          <span className="font-medium text-foreground">
            {selectedIds.length} â€” {t.nav.transactions}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-7 px-3 text-xs bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
              disabled={isMutating}
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
      <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.transactions.tableHeaders.date}</TableHead>
              <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.transactions.tableHeaders.counterparty}</TableHead>
              <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.transactions.tableHeaders.description}</TableHead>
              <TableHead className="text-right text-[11px] uppercase font-medium text-muted-foreground">{t.pages.transactions.tableHeaders.amount}</TableHead>
              <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.transactions.tableHeaders.source}</TableHead>
              <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.transactions.tableHeaders.status}</TableHead>
              <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.transactions.tableHeaders.linkedDoc}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTx.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                  {isLoading ? d.loadingRows : d.emptyRows}
                </TableCell>
              </TableRow>
            ) : (
              paginatedTx.map((tx) => (
              <TableRow
                key={tx.id}
                className="cursor-pointer border-border/30 hover:bg-muted/30 transition-colors"
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
                    <span className="flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 font-medium">
                      <FileText className="h-3 w-3" />
                      {tx.matchedDocumentName}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">â€”</span>
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
            {d.totalPrefix} <strong className="text-foreground">{totalCount}</strong> {d.operationsWord} ({d.pageWord} {currentPage} / {totalPages})
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              {d.prevBtn}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              {d.nextBtn}
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
                {d.txIdPrefix}: {selectedTx.id}
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
                <span className="font-mono text-foreground">{selectedTx.counterpartyStir || "â€”"}</span>
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
                  {selectedTx.accountCode ? `${selectedTx.accountCode} (${selectedTx.accountName})` : "â€”"}
                </span>
              </div>
            </div>

            {/* AI Explanation / Suggestion Card */}
            {selectedTx.aiExplanation && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3.5">
                <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-semibold mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t.dashboard.aiRecommendationTitle}</span>
                  {selectedTx.aiConfidence && (
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300 font-mono">
                      {selectedTx.aiConfidence}% {t.pages.aiAuditor.confidence}
                    </span>
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
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
                  {d.reconcileBtn} <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Actions */}
            {!isReadOnly && (
              <div className="pt-4 flex items-center gap-2">
                <Button
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white shadow-sm h-9"
                  disabled={isMutating || selectedTx.status === "posted"}
                  onClick={() => handleApproveTx(selectedTx)}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {selectedTx.status === "posted" ? d.approvedBtn : t.common.approve}
                </Button>
                <Button
                  variant="outline"
                  className="h-9"
                  disabled={isMutating || selectedTx.status === "rejected"}
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
              {d.addTxTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {d.addTxDesc}
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
                {d.incomeTypeBtn}
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
                {d.expenseTypeBtn}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-foreground">{d.dateLabel}</Label>
                <Input
                  type="date"
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">{d.amountLabel}</Label>
                <Input
                  type="number"
                  placeholder={d.amountPlaceholder}
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-foreground">{d.counterpartyLabel}</Label>
                <Input
                  placeholder={d.counterpartyPlaceholder}
                  value={newTx.counterparty}
                  onChange={(e) => setNewTx({ ...newTx, counterparty: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">{d.counterpartyStirLabel}</Label>
                <Input
                  placeholder={d.stirPlaceholder}
                  maxLength={9}
                  value={newTx.counterpartyStir}
                  onChange={(e) => setNewTx({ ...newTx, counterpartyStir: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-medium text-foreground">{d.accountCodeLabel}</Label>
              <Input
                placeholder={d.accountCodePlaceholder}
                value={newTx.accountCode}
                onChange={(e) => setNewTx({ ...newTx, accountCode: e.target.value })}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>

            <div>
              <Label className="text-[11px] font-medium text-foreground">{d.purposeLabel}</Label>
              <Input
                placeholder={d.purposePlaceholder}
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
                {isSubmitting ? d.savingBtn : d.saveToDbBtn}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bank Vypiska Import Modal Dialog */}
      <Dialog
        open={isImportOpen}
        onOpenChange={(open) => {
          setIsImportOpen(open);
          if (!open) {
            setImportedList([]);
            setImportFileName("");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-600" />
              {d.importTitle}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {d.importDesc}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs flex-1 overflow-y-auto">
            {/* File Upload Area */}
            <div className="rounded-xl border border-dashed border-border p-5 text-center bg-muted/20 hover:bg-muted/40 transition-colors">
              <Upload className="mx-auto h-7 w-7 text-indigo-600 mb-2" />
              <label htmlFor="bank-file-upload" className="cursor-pointer font-semibold text-xs text-indigo-600 hover:underline">
                {d.chooseFilePrompt}
              </label>
              <p className="text-[10px] text-muted-foreground mt-1">
                {d.importFormatsHint}
              </p>
              <input
                id="bank-file-upload"
                type="file"
                accept=".xlsx,.xls,.txt,.csv,.tsv"
                className="hidden"
                onChange={handleFileChange}
              />
              {importFileName && (
                <Badge variant="indigo" className="mt-2 text-xs font-mono">
                  {d.selectedFilePrefix} {importFileName}
                </Badge>
              )}
            </div>

            {/* Parsed Preview Table */}
            {importedList.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-xs">
                      {d.detectedCountLabel} {importedList.length}
                    </span>
                    <Badge variant="success" className="text-[10px]">
                      {importedList.filter((i) => i.type === "income").length} {d.incomeCountSuffix}
                    </Badge>
                    <Badge variant="destructive" className="text-[10px]">
                      {importedList.filter((i) => i.type === "expense").length} {d.expenseCountSuffix}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-foreground">
                    {d.totalLabel} {importedList.reduce((acc, c) => acc + c.amount, 0).toLocaleString(intlLocale)} {t.common.currency}
                  </span>
                </div>

                <div className="rounded-lg border border-border max-h-56 overflow-y-auto text-[11px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{d.impColDate}</TableHead>
                        <TableHead>{d.impColType}</TableHead>
                        <TableHead>{d.impColCounterparty}</TableHead>
                        <TableHead>{d.impColStir}</TableHead>
                        <TableHead className="text-right">{d.impColAmount}</TableHead>
                        <TableHead>{d.impColPurpose}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importedList.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono whitespace-nowrap">{item.date}</TableCell>
                          <TableCell>
                            <Badge variant={item.type === "income" ? "success" : "outline"} className="text-[9px]">
                              {item.type === "income" ? d.impIncomeBadge : d.impExpenseBadge}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-[140px] truncate">{item.counterparty}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{item.counterpartyStir || "â€”"}</TableCell>
                          <TableCell className={`text-right font-mono font-bold ${item.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                            {item.amount.toLocaleString(intlLocale)}
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
              {d.cancelBtn}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleConfirmImport}
              disabled={importedList.length === 0 || isImporting}
            >
              {isImporting ? d.importingBtn : `${d.importConfirmBtn} (${importedList.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransactionsLoadingFallback() {
  const { locale } = useTranslation();
  const dict = getReconcileErpDict(locale);
  return <div className="p-6 text-xs text-muted-foreground">{dict.commonLoading}</div>;
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<TransactionsLoadingFallback />}>
      <TransactionsContent />
    </Suspense>
  );
}
