"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchBankAccounts, createBankAccountRecord, fetchTransactions } from "@/lib/services/supabase-service";
import { parse1CClientBankText, parseBankCsv, importBatchTransactions } from "@/lib/services/bank-import";
import { bankAccountSchema, getFirstZodError } from "@/lib/validations/accounting";
import { useAppState } from "@/lib/mock/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import {
  Landmark,
  Plus,
  Upload,
  RefreshCw,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Download,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function BankingPage() {
  const router = useRouter();
  const { currentEntity } = useAppState();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  const [newBank, setNewBank] = useState({
    bankName: "ATB Kapitalbank",
    accountNumber: "20208000905412340001",
    mfo: "00974",
    currency: "UZS",
    balance: "0",
  });

  const loadBankingData = useCallback(async () => {
    if (!currentEntity?.id) {
      setAccounts([]);
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const [dbAccounts, dbTx] = await Promise.all([
        fetchBankAccounts(currentEntity.id),
        fetchTransactions(currentEntity.id),
      ]);

      setAccounts(
        (dbAccounts || []).map((acc: any) => ({
          id: acc.id,
          bankName: acc.bankName,
          bankLogoText: acc.bankName.slice(0, 3).toUpperCase(),
          accountNumber: acc.accountNumber,
          mfo: acc.mfo,
          currency: acc.currency || "UZS",
          balance: acc.balance,
          status: acc.status || "connected",
          lastSyncedAt: "Hozirgina",
        }))
      );
      setTransactions(dbTx || []);
    } catch (err) {
      console.error("Error loading banking data:", err);
      toast.error("Bank ma'lumotlarini yuklashda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, [currentEntity?.id]);

  useEffect(() => {
    loadBankingData();
  }, [loadBankingData]);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await loadBankingData();
      toast.success(`Barcha ${accounts.length} ta bank hisobvaraqlari va operatsiyalar Supabase bazasidan yangilandi!`);
    } catch (err: any) {
      toast.error("Sinxronlashda xatolik: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bankAccountSchema.safeParse({
      bankName: newBank.bankName,
      accountNumber: newBank.accountNumber,
      mfo: newBank.mfo,
      currency: newBank.currency,
      balance: newBank.balance,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }

    setIsSubmittingAccount(true);
    try {
      const created = await createBankAccountRecord({
        entityId: currentEntity?.id,
        bankName: parsed.data.bankName,
        accountNumber: parsed.data.accountNumber,
        mfo: parsed.data.mfo,
        currency: parsed.data.currency,
        balance: parsed.data.balance,
      });

      const uiAccount = {
        id: created.id,
        bankName: created.bankName,
        bankLogoText: created.bankName.slice(0, 3).toUpperCase(),
        accountNumber: created.accountNumber,
        mfo: created.mfo,
        currency: created.currency,
        balance: created.balance,
        status: "connected",
        lastSyncedAt: "Hozirgina",
      };

      setAccounts((prev) => [uiAccount, ...prev]);
      toast.success(`«${created.bankName}» (${created.accountNumber}) hisobvaragʻi Supabase bazasiga saqlandi!`);
      setIsConnectModalOpen(false);
    } catch (err: any) {
      toast.error("Hisobvaraq qoʻshishda xatolik: " + err.message);
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleDownloadReconciliationReport = () => {
    const headers = ["Sana", "Kontragent", "STIR", "Turi", "Summa", "Holat", "Bog'langan E-SF Hujjat"];
    const rows = transactions.map((tx) => [
      tx.date,
      `"${(tx.counterparty || "").replace(/"/g, '""')}"`,
      tx.counterpartyStir || "",
      tx.type === "income" ? "Kirim" : "Chiqim",
      tx.amount,
      tx.status,
      `"${tx.matchedDocumentName || "Solishtirilgan"}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bank_reconciliation_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Bank va Didox E-SF solishtirma dalolatnomasi (Reconciliation CSV) yuklab olindi!");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = file.name.endsWith(".csv")
        ? parseBankCsv(text)
        : parse1CClientBankText(text);

      if (parsed.length === 0) {
        toast.error("Fayldan toʻlovlar topilmadi. Standart CSV yoki 1C Client-Bank (.txt) yuklang.");
        return;
      }

      const saved = await importBatchTransactions(parsed, currentEntity?.id);
      setTransactions((prev) => [...(saved as any[]), ...prev]);
      toast.success(`${saved.length} ta bank koʻchirmasi Supabase bazasiga muvaffaqiyatli yuklandi!`);
      setIsImportModalOpen(false);
    } catch (err: any) {
      toast.error("Koʻchirmani yuklashda xatolik: " + err.message);
    }
  };

  const matchedCount = transactions.filter((tx) => tx.status === "posted" || tx.matchedDocumentName).length;
  const reconPercent = transactions.length > 0 ? ((matchedCount / transactions.length) * 100).toFixed(1) : "100.0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.banking.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.banking.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            CSV / 1C
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleSyncAll}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-primary" : ""}`} />
            {t.common.sync}
          </Button>

          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setIsConnectModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t.pages.banking.connectBank}
          </Button>
        </div>
      </div>

      {/* Row 1: Bank Accounts Cards */}
      {accounts.length === 0 ? (
        <Card className="p-6 text-center text-xs text-muted-foreground border-dashed">
          {isLoading
            ? "Bank hisobvaraqlari yuklanmoqda..."
            : "Ushbu korxonaga biriktirilgan bank hisobvaraq topilmadi. «Bank hisobini ulash» tugmasini bosing."}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accounts.map((account) => (
          <Card key={account.id} className="relative overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  {account.bankLogoText || "BNK"}
                </div>
                <div>
                  <CardTitle className="text-xs font-semibold">{account.bankName}</CardTitle>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    MFO: {account.mfo} • {account.accountNumber}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <span className="text-[11px] text-muted-foreground">{t.pages.accounting.balance}:</span>
                <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                  <Money
                    amount={account.balance}
                    currency={account.currency === "USD" ? "$" : undefined}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {t.statuses.connected}
                </span>
                <span>{account.lastSyncedAt || "Faol"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Row 2: Reconciliation Status Widget */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Reconciliation (Bank va E-SF Solishtiruvi): {reconPercent}%
              </h3>
              <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4">
                {t.statuses.active}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jami {transactions.length} ta bank operatsiyasidan {matchedCount} tasi buxgalteriya schyotlariga biriktirilgan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 gap-1.5"
            onClick={handleDownloadReconciliationReport}
          >
            <Download className="h-3.5 w-3.5" />
            Solishtirma hisobot (CSV)
          </Button>
        </div>
      </div>

      {/* Row 3: Bank Transactions Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {t.pages.banking.tabs.statements}
          </CardTitle>
          <CardDescription>
            {t.pages.banking.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.pages.transactions.tableHeaders.counterparty} & {t.pages.transactions.tableHeaders.description}</TableHead>
                <TableHead>Yoʻnalish</TableHead>
                <TableHead className="text-right">{t.common.amount}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead className="text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    {isLoading ? "Bank koʻchirmalari yuklanmoqda..." : "Ushbu korxona boʻyicha bank operatsiyalari mavjud emas."}
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {tx.date}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <div className="font-medium text-foreground truncate">{tx.counterparty}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{tx.description}</div>
                  </TableCell>
                  <TableCell>
                    {tx.type === "income" ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <ArrowDownLeft className="h-3 w-3" />
                        {t.common.income}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        <ArrowUpRight className="h-3 w-3" />
                        {t.common.expense}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    <Money amount={tx.amount} type={tx.type} />
                  </TableCell>
                  <TableCell>
                    <StatusPill status={tx.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setSelectedTx(tx)}
                    >
                      {t.common.details}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Bank toʻlov topshiriqnomasi tafsilotlari
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              ID: {selectedTx?.id} • Sana: {selectedTx?.date}
            </DialogDescription>
          </DialogHeader>
          {selectedTx && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                <span className="text-muted-foreground">Summa:</span>
                <span className="text-base font-bold font-mono">
                  <Money amount={selectedTx.amount} type={selectedTx.type} />
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Kontragent:</span>
                  <span className="font-semibold text-foreground">{selectedTx.counterparty}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">STIR (INN):</span>
                  <span className="font-mono">{selectedTx.counterpartyStir || "302918472"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Buxgalteriya schyoti:</span>
                  <span className="font-mono font-bold text-indigo-600">{selectedTx.accountCode || "5110"}</span>
                </div>
                <div className="py-1">
                  <span className="text-muted-foreground block mb-1">Toʻlov maqsadi:</span>
                  <p className="p-2 rounded bg-muted/40 text-foreground">{selectedTx.description}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={() => {
                setSelectedTx(null);
                router.push("/accounting");
              }}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Bosh kitobda koʻrish
            </Button>
            <Button size="sm" className="text-xs h-8" onClick={() => setSelectedTx(null)}>
              {t.common.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect New Bank Account Modal (Real DB Insert) */}
      <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.pages.banking.connectBank}</DialogTitle>
            <DialogDescription className="text-xs">
              Yangi korporativ bank hisobvaragʻini (20208...) Supabase bazasiga qoʻshish
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBankAccount} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-[11px] font-medium">Bankni tanlang *</Label>
              <select
                value={newBank.bankName}
                onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
              >
                <option value="ATB Kapitalbank">ATB Kapitalbank</option>
                <option value="ATIB Ipoteka-bank">ATIB Ipoteka-bank</option>
                <option value="AJ Asakabank">AJ Asakabank</option>
                <option value="ATB Hamkorbank">ATB Hamkorbank</option>
                <option value="AJ Anorbank">AJ Anorbank</option>
                <option value="Oʻzsanoatqurilishbank ATB">Oʻzsanoatqurilishbank ATB</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-[11px] font-medium">Hisobvaraq (20 xonali) *</Label>
                <Input
                  value={newBank.accountNumber}
                  onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                  placeholder="20208000..."
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium">MFO *</Label>
                <Input
                  value={newBank.mfo}
                  onChange={(e) => setNewBank({ ...newBank, mfo: e.target.value })}
                  placeholder="00974"
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium">Valyuta</Label>
                <select
                  value={newBank.currency}
                  onChange={(e) => setNewBank({ ...newBank, currency: e.target.value })}
                  className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2 font-mono"
                >
                  <option value="UZS">UZS — Soʻm</option>
                  <option value="USD">USD — AQSh Dollari</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium">Joriy qoldiq</Label>
                <Input
                  type="number"
                  value={newBank.balance}
                  onChange={(e) => setNewBank({ ...newBank, balance: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsConnectModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingAccount}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                {isSubmittingAccount ? "Saqlanmoqda..." : "Hisobvaraqni ulash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import CSV / 1C Modal (Real File Parser) */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.pages.banking.tabs.statements}</DialogTitle>
            <DialogDescription className="text-xs">
              1C Client-Bank (.txt) yoki Bank koʻchirmasini (.csv) tanlang
            </DialogDescription>
          </DialogHeader>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border border-dashed border-border hover:border-indigo-500 p-6 text-center my-3 cursor-pointer transition-colors"
          >
            <Upload className="mx-auto h-8 w-8 text-indigo-600 mb-2" />
            <p className="text-xs font-semibold text-foreground">Faylni tanlash uchun bosing</p>
            <p className="text-[10px] text-muted-foreground mt-1">1C kl_to_1c.txt yoki .csv formatlari qoʻllab-quvvatlanadi</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
              {t.common.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
