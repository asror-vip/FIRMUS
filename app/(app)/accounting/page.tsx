"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  createJournalEntryRecord,
  fetchJournalEntriesPaginated,
  reverseJournalEntryRecord,
  closeAccountingPeriod,
  fetchTrialBalance,
  fetchGeneralLedger,
  fetchChartOfAccounts,
  createChartOfAccount,
} from "@/lib/services/supabase-service";
import { journalEntrySchema, getFirstZodError } from "@/lib/validations/accounting";
import { useAppState } from "@/lib/context/app-state";
import { generate1CEnterpriseDataXml } from "@/lib/services/one-c-export";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { Search, Download, Plus, CheckCircle2, BookOpen, Layers, FileSpreadsheet, FileCode, RotateCcw, AlertTriangle, Lock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { JournalEntry } from "@/lib/types/accounting";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AccountingPage() {
  const { currentEntity, currentRole } = useAppState();
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState("coa");
  const [coaSearch, setCoaSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState("5110");
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [totalJournalCount, setTotalJournalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [coaPage, setCoaPage] = useState(1);
  const [glPage, setGlPage] = useState(1);
  const pageSize = 10;
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [ledgerVersion, setLedgerVersion] = useState(0);

  const [trialBalanceData, setTrialBalanceData] = useState<any[]>([]);
  const [generalLedgerData, setGeneralLedgerData] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddCoaOpen, setIsAddCoaOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingCoa, setIsSubmittingCoa] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const [reversalReason, setReversalReason] = useState("Notoʻgʻri summa kiritilgan");
  const [isReversalDialogOpen, setIsReversalDialogOpen] = useState(false);

  // Period Closing (Zakritiye mesyatsa) modal state
  const [isClosePeriodOpen, setIsClosePeriodOpen] = useState(false);
  const [isClosingPeriod, setIsClosingPeriod] = useState(false);
  const [closePeriodDates, setClosePeriodDates] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    return {
      fromDate: `${y}-${m}-01`,
      toDate: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
    };
  });

  const [newCoa, setNewCoa] = useState({
    code: "",
    name: "",
    type: "asset" as "asset" | "liability" | "equity" | "revenue" | "expense",
  });

  const loadAccounts = useCallback(async () => {
    if (!currentEntity?.id) {
      setChartOfAccounts([]);
      return;
    }
    const accounts = await fetchChartOfAccounts(currentEntity.id);
    setChartOfAccounts(accounts || []);
  }, [currentEntity?.id]);

  const loadJournalEntries = useCallback(async () => {
    if (!currentEntity?.id) {
      setJournalEntries([]);
      setTotalJournalCount(0);
      setIsLoadingEntries(false);
      return;
    }
    setIsLoadingEntries(true);
    try {
      const { data, count } = await fetchJournalEntriesPaginated(currentEntity.id, {
        page: currentPage,
        pageSize,
      });
      setJournalEntries((data || []) as JournalEntry[]);
      setTotalJournalCount(count);
    } catch (err) {
      console.error("Error loading journal entries:", err);
      toast.error("Provodkalarni bazadan yuklab boʻlmadi");
    } finally {
      setIsLoadingEntries(false);
    }
  }, [currentEntity?.id, currentPage, pageSize]);

  useEffect(() => {
    setSelectedEntry(null);
    setCurrentPage(1);
    setCoaPage(1);
    setGlPage(1);
    loadAccounts();
  }, [currentEntity?.id, loadAccounts]);

  useEffect(() => {
    setCoaPage(1);
  }, [coaSearch]);

  useEffect(() => {
    setGlPage(1);
  }, [selectedLedgerAccount]);

  useEffect(() => {
    loadJournalEntries();
  }, [loadJournalEntries]);

  useEffect(() => {
    const handleRefresh = () => {
      loadJournalEntries();
      setLedgerVersion((v) => v + 1);
    };

    window.addEventListener("firmus:refresh-data", handleRefresh);
    return () => {
      window.removeEventListener("firmus:refresh-data", handleRefresh);
    };
  }, [loadJournalEntries]);

  // Load real Trial Balance
  useEffect(() => {
    let isMounted = true;
    if (!currentEntity?.id) {
      setTrialBalanceData([]);
      return;
    }

    fetchTrialBalance(currentEntity.id).then((tb) => {
      if (isMounted) {
        setTrialBalanceData(tb || []);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentEntity?.id, ledgerVersion]);

  // Load real General Ledger for selected account
  useEffect(() => {
    let isMounted = true;
    if (!currentEntity?.id || !selectedLedgerAccount) {
      setGeneralLedgerData([]);
      return;
    }

    fetchGeneralLedger(currentEntity.id, selectedLedgerAccount).then((gl) => {
      if (isMounted) {
        setGeneralLedgerData(gl || []);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentEntity?.id, selectedLedgerAccount, ledgerVersion]);

  const [newEntry, setNewEntry] = useState({
    entryNumber: `JE-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
    date: new Date().toISOString().split("T")[0],
    description: "",
    debitAccountCode: "5110",
    creditAccountCode: "6010",
    amount: "",
  });

  const filteredCoa = chartOfAccounts.filter(
    (acc) =>
      acc.code.includes(coaSearch) ||
      acc.name.toLowerCase().includes(coaSearch.toLowerCase())
  );

  // Trial balance totals from real database
  const tbTotalDebit = trialBalanceData.reduce((acc, row) => acc + Number(row.period_debit || 0), 0);
  const tbTotalCredit = trialBalanceData.reduce((acc, row) => acc + Number(row.period_credit || 0), 0);
  const isTbBalanced = Math.abs(tbTotalDebit - tbTotalCredit) < 0.01;

  const handleExport = () => {
    const headers = ["Provodka №", "Sana", "Tavsif", "Manba", "Debet", "Kredit", "Holat", "Muallif"];
    const rows = journalEntries.map((je) => [
      je.entryNumber,
      je.date,
      `"${(je.description || "").replace(/"/g, '""')}"`,
      je.sourceType,
      je.totalDebit,
      je.totalCredit,
      je.status,
      `"${je.createdBy || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `firmus_journal_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Buxgalteriya provodkalari CSV formatida yuklab olindi");
  };

  const handleExport1CXml = () => {
    const xml = generate1CEnterpriseDataXml(journalEntries);
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `1c_enterprise_data_${new Date().toISOString().split("T")[0]}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("1C:Buxgalteriya EnterpriseData XML fayli muvaffaqiyatli yuklab olindi!");
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = journalEntrySchema.safeParse({
      entryNumber: newEntry.entryNumber,
      date: newEntry.date,
      description: newEntry.description,
      debitAccountCode: newEntry.debitAccountCode,
      creditAccountCode: newEntry.creditAccountCode,
      amount: newEntry.amount,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }

    setIsSubmitting(true);
    try {
      const debitAcc =
        chartOfAccounts.find((a) => a.code === parsed.data.debitAccountCode)?.name ||
        "Debet schyoti";
      const creditAcc =
        chartOfAccounts.find((a) => a.code === parsed.data.creditAccountCode)?.name ||
        "Kredit schyoti";

      // Atomic PostgreSQL RPC
      await createJournalEntryRecord({
        entityId: currentEntity?.id,
        entryNumber: parsed.data.entryNumber,
        entryDate: parsed.data.date,
        description: parsed.data.description,
        debitAccountCode: parsed.data.debitAccountCode,
        debitAccountName: debitAcc,
        creditAccountCode: parsed.data.creditAccountCode,
        creditAccountName: creditAcc,
        amount: parsed.data.amount,
        idempotencyKey: `idem-je-${currentEntity?.id}-${parsed.data.entryNumber}-${Date.now()}`,
      });

      await loadJournalEntries();
      setLedgerVersion((v) => v + 1);
      toast.success("Buxgalteriya provodkasi atomar tranzaksiya bilan Ledgerga saqlandi!");
      setIsAddOpen(false);
      setNewEntry({
        entryNumber: `JE-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split("T")[0],
        description: "",
        debitAccountCode: "5110",
        creditAccountCode: "6010",
        amount: "",
      });
    } catch (err: any) {
      console.error("Create entry error:", err);
      toast.error("Provodka saqlashda xatolik: " + (err.message || "Balans xatosi"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCoa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(newCoa.code.trim())) {
      toast.error("Schyot kodi 4–8 xonali raqam boʻlishi shart (masalan: 5120)");
      return;
    }
    if (newCoa.name.trim().length < 3) {
      toast.error("Schyot nomini kamida 3 ta belgi bilan kiriting");
      return;
    }

    setIsSubmittingCoa(true);
    try {
      await createChartOfAccount({
        entityId: currentEntity?.id,
        code: newCoa.code,
        name: newCoa.name,
        type: newCoa.type,
      });
      await loadAccounts();
      toast.success(`«${newCoa.code} — ${newCoa.name}» schyoti rejaga qoʻshildi!`);
      setIsAddCoaOpen(false);
      setNewCoa({ code: "", name: "", type: "asset" });
    } catch (err: any) {
      toast.error("Schyot qoʻshishda xatolik: " + err.message);
    } finally {
      setIsSubmittingCoa(false);
    }
  };

  const handleReverseEntry = async () => {
    if (!selectedEntry) return;
    if (!reversalReason || reversalReason.trim().length < 3) {
      toast.error("Storno qilish sababini kamida 3 ta belgi bilan kiriting");
      return;
    }
    setIsReversing(true);
    try {
      const res = await reverseJournalEntryRecord(selectedEntry.id, reversalReason);
      toast.success(`«${selectedEntry.entryNumber}» provodkasi storno qilindi (Reversal yozuvi yaratildi: ${res.reversal_entry_number})`);
      setIsReversalDialogOpen(false);
      setSelectedEntry(null);

      await loadJournalEntries();
      setLedgerVersion((v) => v + 1);
    } catch (err: any) {
      console.error("Reversal error:", err);
      toast.error("Storno qilishda xatolik: " + err.message);
    } finally {
      setIsReversing(false);
    }
  };

  const handleClosePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closePeriodDates.fromDate || !closePeriodDates.toDate) {
      toast.error("Boshlanish va tugash sanalarini tanlang");
      return;
    }
    setIsClosingPeriod(true);
    try {
      const res = await closeAccountingPeriod({
        entityId: currentEntity?.id,
        fromDate: closePeriodDates.fromDate,
        toDate: closePeriodDates.toDate,
        closingDate: closePeriodDates.toDate,
      });
      if (res?.idempotent) {
        toast.info(`Ushbu davr (${closePeriodDates.fromDate} — ${closePeriodDates.toDate}) allaqachon yopilgan (${res.entry_number}).`);
      } else {
        toast.success(
          `Davr muvaffaqiyatli yopildi (${res.entry_number})! Moliyaviy natija (9910 → 8710): ${Number(res.net_profit || 0).toLocaleString()} UZS.`
        );
      }
      setIsClosePeriodOpen(false);
      await loadJournalEntries();
      setLedgerVersion((v) => v + 1);
    } catch (err: any) {
      toast.error("Davrni yopishda xatolik: " + err.message);
    } finally {
      setIsClosingPeriod(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalJournalCount / pageSize));

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.accounting.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.accounting.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleExport1CXml}
            title="1C:Korxona EnterpriseData XML formatida yuklab olish"
          >
            <FileCode className="h-3.5 w-3.5 text-amber-600" />
            1C ga eksport (XML)
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
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300"
                onClick={() => setIsClosePeriodOpen(true)}
              >
                <Lock className="h-3.5 w-3.5" />
                Davrni yopish
              </Button>
              <Button
                size="sm"
                className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t.common.addNew}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-9">
          <TabsTrigger value="coa" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" />
            {t.pages.accounting.tabs.coa}
          </TabsTrigger>
          <TabsTrigger value="journal" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            {t.pages.accounting.tabs.journal}
          </TabsTrigger>
          <TabsTrigger value="trial" className="gap-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {t.pages.accounting.tabs.trialBalance}
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1.5 text-xs">
            {t.pages.accounting.tabs.ledger}
          </TabsTrigger>
        </TabsList>

        {/* 1. Chart of Accounts Tab */}
        <TabsContent value="coa" className="space-y-3 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                placeholder={t.common.search}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {filteredCoa.length} / {chartOfAccounts.length} schyot
              </span>
              {currentRole !== "viewer" && currentRole !== "auditor" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setIsAddCoaOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Yangi schyot / subschyot
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">{t.pages.accounting.code}</TableHead>
                  <TableHead>{t.pages.accounting.name}</TableHead>
                  <TableHead>Kategoriya</TableHead>
                  <TableHead>Turi</TableHead>
                  <TableHead className="text-right">{t.pages.accounting.balance} ({t.common.currency})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoa.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                      Schyotlar rejasi topilmadi.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoa
                    .slice((coaPage - 1) * pageSize, coaPage * pageSize)
                    .map((acc) => {
                    const tbRow = trialBalanceData.find((r) => r.account_code === acc.code);
                    const liveBalance = tbRow
                      ? Number(tbRow.closing_debit || 0) > 0
                        ? Number(tbRow.closing_debit)
                        : Number(tbRow.closing_credit || 0)
                      : 0;
                    return (
                      <TableRow key={acc.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          {acc.code}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {acc.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {acc.category}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {acc.type === "active" ? "Aktiv" : acc.type === "passive" ? "Passiv" : "Aktiv-Passiv"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <Money amount={liveBalance} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <PaginationBar
              page={coaPage}
              pageSize={pageSize}
              totalCount={filteredCoa.length}
              itemLabel="schyot"
              onPageChange={setCoaPage}
            />
          </div>
        </TabsContent>

        {/* 2. Journal Entries Tab */}
        <TabsContent value="journal" className="space-y-3 mt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">№</TableHead>
                  <TableHead className="w-24">{t.common.date}</TableHead>
                  <TableHead>{t.common.description}</TableHead>
                  <TableHead>{t.common.source}</TableHead>
                  <TableHead className="text-right">{t.pages.accounting.debit}</TableHead>
                  <TableHead className="text-right">{t.pages.accounting.credit}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journalEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                      {isLoadingEntries
                        ? "Provodkalar Supabase bazasidan yuklanmoqda..."
                        : "Ushbu korxona boʻyicha buxgalteriya provodkalari topilmadi."}
                    </TableCell>
                  </TableRow>
                ) : (
                  journalEntries.map((je) => (
                  <TableRow
                    key={je.id}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() => setSelectedEntry(je)}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {je.entryNumber}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {je.date}
                    </TableCell>
                    <TableCell className="font-medium text-foreground max-w-[280px] truncate">
                      {je.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {je.sourceType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-foreground">
                      <Money amount={je.totalDebit} />
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-foreground">
                      <Money amount={je.totalCredit} />
                    </TableCell>
                    <TableCell>
                      <StatusPill status={je.status} />
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                      {je.createdBy}
                    </TableCell>
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>

            {/* Server-side Pagination Bar */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
              <span>
                Jami: <strong className="text-foreground">{totalJournalCount}</strong> ta provodka (Sahifa {currentPage} / {totalPages})
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={currentPage <= 1 || isLoadingEntries}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Oldingi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  disabled={currentPage >= totalPages || isLoadingEntries}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Keyingi
                </Button>
              </div>
            </div>
          </div>

          {/* Selected Entry Detail modal / view */}
          {selectedEntry && (
            <div className="rounded-xl border border-indigo-500/30 bg-card p-5 space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      {selectedEntry.entryNumber} • {selectedEntry.date}
                    </span>
                    <StatusPill status={selectedEntry.status} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mt-0.5">
                    {selectedEntry.description}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {selectedEntry.status === "posted" && currentRole !== "auditor" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsReversalDialogOpen(true)}
                      className="h-7 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950 gap-1.5"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Storno qilish (Reversal)
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEntry(null)}
                    className="h-7 text-xs"
                  >
                    {t.common.close}
                  </Button>
                </div>
              </div>

              <div className="text-xs">
                <span className="font-semibold text-muted-foreground mb-2 block">
                  {t.pages.accounting.tabs.journal}:
                </span>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.pages.accounting.code}</TableHead>
                      <TableHead>{t.pages.accounting.name}</TableHead>
                      <TableHead className="text-right">{t.pages.accounting.debit}</TableHead>
                      <TableHead className="text-right">{t.pages.accounting.credit}</TableHead>
                      <TableHead>{t.common.description}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntry.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {l.accountCode}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{l.accountName}</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {l.debit > 0 ? <Money amount={l.debit} /> : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {l.credit > 0 ? <Money amount={l.credit} /> : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">{l.memo || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 3. Trial Balance Tab */}
        <TabsContent value="trial" className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {isTbBalanced ? "Balans qonuni toʻliq taʼminlangan: Debet = Kredit" : "Diqqat: Debet va Kredit farqi mavjud"}
              </span>
            </div>
            <div className="flex items-center gap-4 font-mono font-bold">
              <span>{t.pages.accounting.debit}: {new Intl.NumberFormat("uz-UZ").format(tbTotalDebit)} {t.common.currency}</span>
              <span>{t.pages.accounting.credit}: {new Intl.NumberFormat("uz-UZ").format(tbTotalCredit)} {t.common.currency}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">{t.pages.accounting.code}</TableHead>
                  <TableHead>{t.pages.accounting.name}</TableHead>
                  <TableHead className="text-right">Boshlangʻich saldo</TableHead>
                  <TableHead className="text-right">{t.pages.accounting.debit} (Aylanma)</TableHead>
                  <TableHead className="text-right">{t.pages.accounting.credit} (Aylanma)</TableHead>
                  <TableHead className="text-right">Yakuniy saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalanceData.length > 0 ? (
                  trialBalanceData.map((row) => (
                    <TableRow key={row.account_code}>
                      <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {row.account_code}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{row.account_name}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {Number(row.opening_debit) > 0 ? (
                          <Money amount={Number(row.opening_debit)} />
                        ) : Number(row.opening_credit) > 0 ? (
                          <span className="text-amber-600 font-medium">-<Money amount={Number(row.opening_credit)} /></span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        {Number(row.period_debit) > 0 ? <Money amount={Number(row.period_debit)} /> : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                        {Number(row.period_credit) > 0 ? <Money amount={Number(row.period_credit)} /> : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">
                        {Number(row.closing_debit) > 0 ? (
                          <Money amount={Number(row.closing_debit)} />
                        ) : Number(row.closing_credit) > 0 ? (
                          <span className="text-amber-600">-<Money amount={Number(row.closing_credit)} /></span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                      Hozircha hisob-kitoblar maʼlumoti yuklanmadi yoki provodkalar yoʻq.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 4. General Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">{t.pages.accounting.code}:</span>
            <select
              value={selectedLedgerAccount}
              onChange={(e) => setSelectedLedgerAccount(e.target.value)}
              className="h-8 rounded-lg border border-input bg-card px-3 text-xs font-medium font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {chartOfAccounts.map((acc) => (
                <option key={acc.id} value={acc.code}>
                  {acc.code} — {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.date}</TableHead>
                  <TableHead>Hujjat raqami</TableHead>
                  <TableHead>{t.common.description}</TableHead>
                  <TableHead>Korr. schyot</TableHead>
                  <TableHead className="text-right">{t.pages.accounting.debit}</TableHead>
                  <TableHead className="text-right">{t.pages.accounting.credit}</TableHead>
                  <TableHead className="text-right">Joriy qoldiq (Running Balance)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generalLedgerData.length > 0 ? (
                  generalLedgerData
                    .slice((glPage - 1) * pageSize, glPage * pageSize)
                    .map((row, idx) => (
                    <TableRow key={row.entry_id || idx}>
                      <TableCell className="font-mono text-xs">{row.entry_date}</TableCell>
                      <TableCell className="font-mono text-xs text-primary font-medium">{row.entry_number}</TableCell>
                      <TableCell className="font-medium text-foreground">{row.description}</TableCell>
                      <TableCell className="font-mono text-primary font-bold">{row.correspondent_code}</TableCell>
                      <TableCell className="text-right text-emerald-600 font-mono font-medium">
                        {Number(row.debit_amount) > 0 ? <Money amount={Number(row.debit_amount)} /> : "—"}
                      </TableCell>
                      <TableCell className="text-right text-indigo-600 font-mono font-medium">
                        {Number(row.credit_amount) > 0 ? <Money amount={Number(row.credit_amount)} /> : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">
                        <Money amount={Number(row.running_balance)} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                      Tanlangan {selectedLedgerAccount} schyoti boʻyicha hozircha operatsiyalar mavjud emas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <PaginationBar
              page={glPage}
              pageSize={pageSize}
              totalCount={generalLedgerData.length}
              itemLabel="harakat"
              onPageChange={setGlPage}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Journal Entry Modal Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Yangi buxgalteriya provodkasini kiritish
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ikkiyoqlama yozuv (Double-Entry Ledger) boʻyicha atomar tranzaksiya bilan saqlash.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEntry} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Hujjat raqami *</Label>
                <Input
                  value={newEntry.entryNumber}
                  onChange={(e) => setNewEntry({ ...newEntry, entryNumber: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Sana *</Label>
                <Input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-medium text-foreground">Iqtisodiy mazmuni / Maqsad *</Label>
              <Input
                placeholder="Xom-ashyo xaridi uchun yetkazib beruvchiga toʻlov..."
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Debet schyoti (Dt) *</Label>
                <select
                  value={newEntry.debitAccountCode}
                  onChange={(e) => setNewEntry({ ...newEntry, debitAccountCode: e.target.value })}
                  className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2 font-mono"
                >
                  {chartOfAccounts.map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} — {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Kredit schyoti (Kt) *</Label>
                <select
                  value={newEntry.creditAccountCode}
                  onChange={(e) => setNewEntry({ ...newEntry, creditAccountCode: e.target.value })}
                  className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2 font-mono"
                >
                  {chartOfAccounts.map((acc) => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} — {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-medium text-foreground">Summa (UZS) *</Label>
              <Input
                type="number"
                placeholder="10000000"
                value={newEntry.amount}
                onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                className="h-8 text-xs font-mono mt-1"
                required
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
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
                {isSubmitting ? "Saqlanmoqda..." : "Provodkani saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Storno (Reversal) Confirmation Dialog */}
      <Dialog open={isReversalDialogOpen} onOpenChange={setIsReversalDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              Provodkani Storno qilish
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tasdiqlangan provodka oʻchirib yuborilmaydi. Uning oʻrniga teskari (storno) provodka yaratilib, joriy provodka holati «reversed» deb belgilanadi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <Label className="text-[11px] font-medium text-foreground">Storno qilish sababi *</Label>
              <Input
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Masalan: Buxgalter kiritishda xato qilgan"
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsReversalDialogOpen(false)}
                disabled={isReversing}
              >
                Bekor qilish
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleReverseEntry}
                disabled={isReversing}
              >
                {isReversing ? "Storno qilinmoqda..." : "Storno yozuvini yaratish"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Custom BHMS Account / Sub-account Modal */}
      <Dialog open={isAddCoaOpen} onOpenChange={setIsAddCoaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Yangi schyot / subschyot qoʻshish
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Korxona uchun individual BHMS subschyotini (masalan, 5120, 4011) bazaga kiritish.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCoa} className="space-y-3 pt-2 text-xs">
            <div>
              <Label className="text-[11px] font-medium">Schyot kodi (4–8 ta raqam) *</Label>
              <Input
                placeholder="5120"
                value={newCoa.code}
                onChange={(e) => setNewCoa({ ...newCoa, code: e.target.value })}
                className="h-8 text-xs font-mono mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium">Schyot nomi *</Label>
              <Input
                placeholder="Valyuta hisobvaragʻi (USD)"
                value={newCoa.name}
                onChange={(e) => setNewCoa({ ...newCoa, name: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium">Schyot turi (BHMS)</Label>
              <select
                value={newCoa.type}
                onChange={(e) => setNewCoa({ ...newCoa, type: e.target.value as any })}
                className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
              >
                <option value="asset">Aktiv (Asset)</option>
                <option value="liability">Majburiyat (Liability)</option>
                <option value="equity">Xususiy kapital (Equity)</option>
                <option value="revenue">Daromad (Revenue)</option>
                <option value="expense">Xarajat (Expense)</option>
              </select>
            </div>
            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsAddCoaOpen(false)}
                disabled={isSubmittingCoa}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSubmittingCoa}
              >
                {isSubmittingCoa ? "Qoʻshilmoqda..." : "Schyotni saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Period Closing (Zakritiye mesyatsa) Modal */}
      <Dialog open={isClosePeriodOpen} onOpenChange={setIsClosePeriodOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              Davrni yopish (Oy yopish)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tanlangan davr uchun barcha daromad (9010) va xarajat (9110–9430) schyotlarini 9910 orqali 8710 (Taqsimlanmagan foyda/zarar) ga yopish.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleClosePeriod} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium">Boshlanish sanasi *</Label>
                <Input
                  type="date"
                  value={closePeriodDates.fromDate}
                  onChange={(e) => setClosePeriodDates({ ...closePeriodDates, fromDate: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium">Tugash sanasi *</Label>
                <Input
                  type="date"
                  value={closePeriodDates.toDate}
                  onChange={(e) => setClosePeriodDates({ ...closePeriodDates, toDate: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsClosePeriodOpen(false)}
                disabled={isClosingPeriod}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isClosingPeriod}
              >
                {isClosingPeriod ? "Yopilmoqda..." : "Davrni yopish (9910 → 8710)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
