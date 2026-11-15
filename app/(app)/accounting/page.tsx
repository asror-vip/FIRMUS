"use client";

import React, { useState, useEffect } from "react";
import { mockChartOfAccounts, mockJournalEntries } from "@/lib/mock/accounting";
import {
  createJournalEntryRecord,
  fetchJournalEntries,
  reverseJournalEntryRecord,
  fetchTrialBalance,
  fetchGeneralLedger,
  fetchChartOfAccounts,
} from "@/lib/services/supabase-service";
import { useAppState } from "@/lib/mock/store";
import { generate1CEnterpriseDataXml } from "@/lib/services/one-c-export";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { Search, Download, Plus, CheckCircle2, BookOpen, Layers, FileSpreadsheet, FileCode, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { JournalEntry } from "@/lib/mock/types";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AccountingPage() {
  const { currentEntity, currentRole } = useAppState();
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState("coa");
  const [coaSearch, setCoaSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState("5110");
  const [chartOfAccounts, setChartOfAccounts] = useState<any[]>(mockChartOfAccounts);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(mockJournalEntries);
  const [trialBalanceData, setTrialBalanceData] = useState<any[]>([]);
  const [generalLedgerData, setGeneralLedgerData] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const [reversalReason, setReversalReason] = useState("Notoʻgʻri summa kiritilgan");
  const [isReversalDialogOpen, setIsReversalDialogOpen] = useState(false);

  // Load real Chart of Accounts & Journal Entries
  useEffect(() => {
    let isMounted = true;
    if (!currentEntity?.id) return;

    fetchChartOfAccounts(currentEntity.id).then((accounts) => {
      if (isMounted && accounts && accounts.length > 0) {
        setChartOfAccounts(accounts);
      }
    });

    fetchJournalEntries(currentEntity.id)
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setJournalEntries(data);
        }
      })
      .catch((err) => console.error("Error loading journal entries:", err));

    return () => {
      isMounted = false;
    };
  }, [currentEntity?.id]);

  // Load real Trial Balance
  useEffect(() => {
    let isMounted = true;
    if (!currentEntity?.id) return;

    fetchTrialBalance(currentEntity.id).then((tb) => {
      if (isMounted && tb) {
        setTrialBalanceData(tb);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentEntity?.id, journalEntries.length]);

  // Load real General Ledger for selected account
  useEffect(() => {
    let isMounted = true;
    if (!currentEntity?.id || !selectedLedgerAccount) return;

    fetchGeneralLedger(currentEntity.id, selectedLedgerAccount).then((gl) => {
      if (isMounted && gl) {
        setGeneralLedgerData(gl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentEntity?.id, selectedLedgerAccount, journalEntries.length]);

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

  const totalDebit = journalEntries.reduce((acc, curr) => acc + curr.totalDebit, 0);
  const totalCredit = journalEntries.reduce((acc, curr) => acc + curr.totalCredit, 0);
  const isBalanced = totalDebit === totalCredit;

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
    if (!newEntry.description || !newEntry.amount) {
      toast.error("Iltimos, tavsif va summani kiriting");
      return;
    }

    const amountNum = Number(newEntry.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Summa musbat son boʻlishi kerak");
      return;
    }

    if (newEntry.debitAccountCode === newEntry.creditAccountCode) {
      toast.error("Debet va kredit schyotlari bir xil boʻlishi mumkin emas");
      return;
    }

    setIsSubmitting(true);
    try {
      const debitAcc =
        chartOfAccounts.find((a) => a.code === newEntry.debitAccountCode)?.name ||
        "Debet schyoti";
      const creditAcc =
        chartOfAccounts.find((a) => a.code === newEntry.creditAccountCode)?.name ||
        "Kredit schyoti";

      // Atomic PostgreSQL RPC
      const result = await createJournalEntryRecord({
        entityId: currentEntity?.id,
        entryNumber: newEntry.entryNumber,
        entryDate: newEntry.date,
        description: newEntry.description,
        debitAccountCode: newEntry.debitAccountCode,
        debitAccountName: debitAcc,
        creditAccountCode: newEntry.creditAccountCode,
        creditAccountName: creditAcc,
        amount: amountNum,
      });

      const createdJe: JournalEntry = {
        id: result?.id || `je-${Date.now()}`,
        entityId: currentEntity?.id || "11111111-1111-1111-1111-111111111111",
        entryNumber: newEntry.entryNumber,
        date: newEntry.date,
        description: newEntry.description,
        sourceType: "manual",
        status: "posted",
        totalDebit: amountNum,
        totalCredit: amountNum,
        createdBy: "Bosh buxgalter",
        lines: [
          {
            id: `line-${Date.now()}-1`,
            accountCode: newEntry.debitAccountCode,
            accountName: debitAcc,
            debit: amountNum,
            credit: 0,
            memo: newEntry.description,
          },
          {
            id: `line-${Date.now()}-2`,
            accountCode: newEntry.creditAccountCode,
            accountName: creditAcc,
            debit: 0,
            credit: amountNum,
            memo: newEntry.description,
          },
        ],
      };

      setJournalEntries((prev) => [createdJe, ...prev]);
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

  const handleReverseEntry = async () => {
    if (!selectedEntry) return;
    setIsReversing(true);
    try {
      const res = await reverseJournalEntryRecord(selectedEntry.id, reversalReason);
      toast.success(`«${selectedEntry.entryNumber}» provodkasi storno qilindi (Reversal yozuvi yaratildi: ${res.reversal_entry_number})`);
      setIsReversalDialogOpen(false);
      setSelectedEntry(null);

      // Refresh list
      if (currentEntity?.id) {
        const refreshed = await fetchJournalEntries(currentEntity.id);
        setJournalEntries(refreshed);
      }
    } catch (err: any) {
      console.error("Reversal error:", err);
      toast.error("Storno qilishda xatolik: " + err.message);
    } finally {
      setIsReversing(false);
    }
  };

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
          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t.common.addNew}
          </Button>
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
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                placeholder={t.common.search}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {filteredCoa.length} / {mockChartOfAccounts.length}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">{t.pages.accounting.code}</TableHead>
                  <TableHead>{t.pages.accounting.name}</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">{t.pages.accounting.balance} ({t.common.currency})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoa.map((acc) => (
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
                    <TableCell className="text-right">
                      <Money amount={acc.balance} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                {journalEntries.map((je) => (
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
                ))}
              </TableBody>
            </Table>
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
                  generalLedgerData.map((row, idx) => (
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
    </div>
  );
}
