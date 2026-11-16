"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TaxRecord } from "@/lib/types/accounting";
import {
  fetchTrialBalance,
  createJournalEntryRecord,
  createTransaction,
  fetchTaxRecordsPaginated,
  fetchTaxDeadlinesPaginated,
  payTaxRecordInDb,
} from "@/lib/services/supabase-service";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { useAppState } from "@/lib/context/app-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Calendar,
  Download,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function TaxPage() {
  const { currentEntity } = useAppState();
  const { t } = useTranslation();
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [totalTaxCount, setTotalTaxCount] = useState(0);
  const [taxPage, setTaxPage] = useState(1);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [totalDeadlinesCount, setTotalDeadlinesCount] = useState(0);
  const [deadlinesPage, setDeadlinesPage] = useState(1);
  const PAGE_SIZE = 10;
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTax, setSelectedTax] = useState<TaxRecord | null>(null);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real Ledger balances for 6410 (Tax Payable), 4410 (Input VAT), 6520 (Social Tax)
  const [vatOutput6410, setVatOutput6410] = useState<number>(0);
  const [vatInput4410, setVatInput4410] = useState<number>(0);
  const [liveSocialTax, setLiveSocialTax] = useState<number>(0);
  const [liveJshds, setLiveJshds] = useState<number>(0);

  const loadTaxData = useCallback(async () => {
    if (!currentEntity?.id) {
      setTaxRecords([]);
      setTotalTaxCount(0);
      setDeadlines([]);
      setTotalDeadlinesCount(0);
      setVatOutput6410(0);
      setVatInput4410(0);
      setLiveSocialTax(0);
      setLiveJshds(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [tb, dbTaxPage, dbDeadlinesPage] = await Promise.all([
        fetchTrialBalance(currentEntity.id),
        fetchTaxRecordsPaginated(currentEntity.id, { page: taxPage, pageSize: PAGE_SIZE }),
        fetchTaxDeadlinesPaginated(currentEntity.id, { page: deadlinesPage, pageSize: PAGE_SIZE }),
      ]);

      const row6410 = (tb || []).find((r: any) => r.account_code === "6410");
      const row4410 = (tb || []).find((r: any) => r.account_code === "4410");
      const row6520 = (tb || []).find((r: any) => r.account_code === "6520");

      setVatOutput6410(row6410 ? Number(row6410.period_credit || 0) : 0);
      setVatInput4410(row4410 ? Number(row4410.period_debit || 0) : 0);

      const socTax = row6520
        ? Number(row6520.closing_credit ?? row6520.period_credit ?? 0)
        : 0;
      setLiveSocialTax(socTax);

      const jshds = row6410
        ? Number(row6410.period_credit ?? row6410.closing_credit ?? 0)
        : 0;
      setLiveJshds(jshds);

      setTaxRecords((dbTaxPage.data || []) as TaxRecord[]);
      setTotalTaxCount(dbTaxPage.count);
      setDeadlines(dbDeadlinesPage.data || []);
      setTotalDeadlinesCount(dbDeadlinesPage.count);
    } catch (err) {
      console.error("Soliq ma'lumotlarini yuklashda xatolik:", err);
      toast.error("Soliq ma'lumotlarini bazadan yuklab boʻlmadi");
    } finally {
      setIsLoading(false);
    }
  }, [currentEntity?.id, taxPage, deadlinesPage]);

  useEffect(() => {
    setTaxPage(1);
    setDeadlinesPage(1);
  }, [currentEntity?.id]);

  useEffect(() => {
    loadTaxData();

    const handleRefresh = () => {
      loadTaxData();
    };
    window.addEventListener("firmus:refresh-data", handleRefresh);
    return () => {
      window.removeEventListener("firmus:refresh-data", handleRefresh);
    };
  }, [loadTaxData]);

  const jshdsRec = taxRecords.find((r) => r.type.toLowerCase().includes("jshds"));
  const socialRec = taxRecords.find((r) => r.type.toLowerCase().includes("ijtimoiy"));
  const profitOrTurnoverRec = taxRecords.find(
    (r) => r.type.toLowerCase().includes("foyda") || r.type.toLowerCase().includes("aylanma")
  );

  const jshdsAmount = jshdsRec ? jshdsRec.calculatedAmount : liveJshds;
  const socialTaxAmount = socialRec ? socialRec.calculatedAmount : liveSocialTax;

  const netVatPayable = Math.max(0, vatOutput6410 - vatInput4410);

  const handleExportTaxCsv = () => {
    const headers = ["Soliq turi", "Davr", "Hisoblangan summa (UZS)", "To'langan summa (UZS)", "Muddat", "Holat"];
    const rows = taxRecords.map((rec) => [
      `"${rec.type}"`,
      `"${rec.period}"`,
      rec.calculatedAmount,
      rec.paidAmount,
      rec.deadline,
      rec.status,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `firmus_soliq_hisoboti_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Soliq majburiyatlari reestri CSV formatida yuklab olindi!");
  };

  const handleConfirmVatCalculation = async () => {
    setIsSubmitting(true);
    try {
      const offsetAmount = Math.min(vatOutput6410, vatInput4410);
      if (offsetAmount <= 0 || !currentEntity?.id) {
        toast.info("Zachyot uchun 6410 va 4410 schyotlarida yetarli qoldiq topilmadi.");
        setIsCalcModalOpen(false);
        return;
      }
      const today = new Date().toISOString().split("T")[0];
      await createJournalEntryRecord({
        entityId: currentEntity.id,
        entryNumber: `JE-VAT-${Date.now().toString().slice(-5)}`,
        entryDate: today,
        description: "QQS zachyoti: 4410 (Kiruvchi QQS) hisobidan 6410 (Budjetga QQS) kamaytirildi",
        debitAccountCode: "6410",
        debitAccountName: "Budjetga toʻlovlar boʻyicha qarzlar (Soliqlar)",
        creditAccountCode: "4410",
        creditAccountName: "Budjetga oldindan toʻlangan soliqlar (QQS)",
        amount: offsetAmount,
        sourceType: "tax_offset",
        idempotencyKey: `idem-vat-offset-${currentEntity.id}-${today}-${Math.round(offsetAmount)}`,
      });
      await loadTaxData();
      toast.success(
        `QQS hisob-kitobi tasdiqlandi! Zachyot summasi (${offsetAmount.toLocaleString()} soʻm) Bosh kitobda (Dt 6410 / Kt 4410) aks ettirildi.`
      );
      setIsCalcModalOpen(false);
    } catch (err: any) {
      toast.error("QQS provodkasini saqlashda xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayTax = async (rec: TaxRecord) => {
    const unpaid = Math.max(0, rec.calculatedAmount - rec.paidAmount);
    if (unpaid <= 0) {
      toast.info("Ushbu soliq majburiyati toʻliq toʻlangan!");
      return;
    }

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await createTransaction({
        entityId: currentEntity?.id,
        date: today,
        amount: unpaid,
        type: "expense",
        counterparty: "Davlat soliq qoʻmitasi (Yagona gʻazna hisobvaragʻi)",
        counterpartyStir: "200000001",
        description: `${rec.type} (${rec.period}) boʻyicha soliq toʻlovi`,
        accountCode: "6410",
        accountName: "Budjetga toʻlovlar boʻyicha qarzlar (Soliqlar)",
      });

      await payTaxRecordInDb(rec.id, rec.calculatedAmount);
      await loadTaxData();
      setSelectedTax(null);
      toast.success(
        `«${rec.type}» boʻyicha ${unpaid.toLocaleString()} soʻm soliq toʻlovi amalga oshirildi va Ledgerga (Dt 6410 / Kt 5110) saqlandi!`
      );
    } catch (err: any) {
      toast.error("Soliq toʻlovini saqlashda xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.tax.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.tax.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleExportTaxCsv}
          >
            <Download className="h-3.5 w-3.5" />
            {t.common.export} (CSV/Excel)
          </Button>

          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setIsCalcModalOpen(true)}
          >
            <Calculator className="h-3.5 w-3.5" />
            {t.pages.tax.tabs.vat}
          </Button>
        </div>
      </div>

      {/* Row 1: Tax Types Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">QQS (12% Sof toʻlov)</span>
            <Badge variant="indigo" className="text-[10px] px-1 py-0 h-4">
              {t.common.monthly}
            </Badge>
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            <Money amount={netVatPayable} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Hisoblangan: {vatOutput6410.toLocaleString()} • Zachyot: {vatInput4410.toLocaleString()}
          </p>
        </Card>

        <Card className="p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">JShDS (12%)</span>
            <Badge
              variant={
                jshdsRec?.status === "paid"
                  ? "success"
                  : jshdsRec?.status === "overdue"
                  ? "destructive"
                  : jshdsAmount > 0
                  ? "warning"
                  : "outline"
              }
              className="text-[10px] px-1 py-0 h-4"
            >
              {jshdsRec?.status === "paid"
                ? t.statuses.paid
                : jshdsRec
                ? t.common.pending
                : jshdsAmount > 0
                ? "Hisoblangan"
                : "Kutilmoqda"}
            </Badge>
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            <Money amount={jshdsAmount} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {jshdsRec
              ? `Muddat: ${jshdsRec.deadline}`
              : jshdsAmount > 0
              ? "Bosh kitob (6410 Kt) boʻyicha hisoblangan"
              : "Ushbu davr uchun hisobot yoʻq"}
          </p>
        </Card>

        <Card className="p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Ijtimoiy soliq (12%)</span>
            <Badge
              variant={
                socialRec?.status === "paid"
                  ? "success"
                  : socialRec?.status === "overdue"
                  ? "destructive"
                  : socialTaxAmount > 0
                  ? "warning"
                  : "outline"
              }
              className="text-[10px] px-1 py-0 h-4"
            >
              {socialRec?.status === "paid"
                ? t.statuses.paid
                : socialRec
                ? t.common.pending
                : socialTaxAmount > 0
                ? "Hisoblangan"
                : "Kutilmoqda"}
            </Badge>
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            <Money amount={socialTaxAmount} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {socialRec
              ? `Muddat: ${socialRec.deadline}`
              : socialTaxAmount > 0
              ? "Bosh kitob (6520 Kt) boʻyicha hisoblangan"
              : "Ushbu davr uchun hisobot yoʻq"}
          </p>
        </Card>

        <Card className="p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">
              {profitOrTurnoverRec?.type || "Foyda soligʻi (15%)"}
            </span>
            <Badge
              variant={profitOrTurnoverRec?.status === "paid" ? "success" : "outline"}
              className="text-[10px] px-1 py-0 h-4"
            >
              {profitOrTurnoverRec?.status === "paid" ? t.statuses.paid : t.common.quarterly}
            </Badge>
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            <Money amount={profitOrTurnoverRec?.calculatedAmount || 0} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {profitOrTurnoverRec ? `Davr: ${profitOrTurnoverRec.period}` : "Choraklik hisobot"}
          </p>
        </Card>
      </div>

      {/* Row 2: Tax Deadlines Calendar View */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-500" />
              {t.pages.tax.calendarTitle}
            </CardTitle>
            <CardDescription>
              Soliq.uz taqvimi va muddatlar nazorati
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {deadlines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              {isLoading ? "Soliq taqvimi yuklanmoqda..." : "Ushbu korxona uchun yaqinlashayotgan soliq muddatlari kiritilmagan."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {deadlines.map((dl) => (
                <div
                  key={dl.id}
                  className={`p-3 rounded-xl border transition-all ${
                    dl.status === "urgent"
                      ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10"
                      : dl.status === "completed"
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {dl.date}
                    </span>
                    <Badge
                      variant={dl.status === "urgent" ? "warning" : dl.status === "completed" ? "success" : "outline"}
                      className="text-[9px] px-1 py-0 h-4"
                    >
                      {dl.status === "urgent" ? t.statuses.urgent : dl.status === "completed" ? t.statuses.completed : t.common.pending}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-xs text-foreground line-clamp-1">
                    {dl.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {dl.description}
                  </p>
                </div>
              ))}
            </div>
          )}
          {totalDeadlinesCount > PAGE_SIZE && (
            <PaginationBar
              page={deadlinesPage}
              pageSize={PAGE_SIZE}
              totalCount={totalDeadlinesCount}
              isLoading={isLoading}
              itemLabel="muddat"
              className="mt-3 rounded-lg border border-border"
              onPageChange={setDeadlinesPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Row 3: Tax Records Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {t.nav.tax}
          </CardTitle>
          <CardDescription>
            {t.pages.tax.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.pages.accounting.name}</TableHead>
                <TableHead>{t.common.period}</TableHead>
                <TableHead className="text-right">Hisoblangan</TableHead>
                <TableHead className="text-right">Toʻlangan</TableHead>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead className="text-right">{t.common.details}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    {isLoading ? "Soliq majburiyatlari yuklanmoqda..." : "Ushbu korxona boʻyicha soliq majburiyatlari topilmadi."}
                  </TableCell>
                </TableRow>
              ) : (
                taxRecords.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-semibold text-xs text-foreground">
                    {rec.type}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {rec.period}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-foreground">
                    <Money amount={rec.calculatedAmount} />
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    <Money amount={rec.paidAmount} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {rec.deadline}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={rec.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2.5"
                      onClick={() => setSelectedTax(rec)}
                    >
                      {t.common.details}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
          <PaginationBar
            page={taxPage}
            pageSize={PAGE_SIZE}
            totalCount={totalTaxCount}
            isLoading={isLoading}
            itemLabel="soliq"
            onPageChange={setTaxPage}
          />
        </CardContent>
      </Card>

      {/* Selected Tax Declaration Details & Payment Modal */}
      <Dialog open={!!selectedTax} onOpenChange={(open) => !open && setSelectedTax(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {selectedTax?.type}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Hisobot davri: {selectedTax?.period} • Topshirish muddati: {selectedTax?.deadline}
            </DialogDescription>
          </DialogHeader>
          {selectedTax && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hisoblangan soliq summasi:</span>
                  <span className="font-mono font-bold text-foreground">
                    <Money amount={selectedTax.calculatedAmount} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toʻlangan summa:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    <Money amount={selectedTax.paidAmount} />
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Qolgan toʻlov qoldigʻi:</span>
                  <span className="font-mono font-bold text-rose-600">
                    <Money amount={Math.max(0, selectedTax.calculatedAmount - selectedTax.paidAmount)} />
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>Buxgalteriya schyoti: <strong className="font-mono text-foreground">6410</strong></span>
                <StatusPill status={selectedTax.status} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedTax(null)}>
              {t.common.close}
            </Button>
            {selectedTax && selectedTax.calculatedAmount > selectedTax.paidAmount && (
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={() => handlePayTax(selectedTax)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <CreditCard className="h-3.5 w-3.5" />
                {isSubmitting ? "Toʻlanmoqda..." : "Soliqni toʻlash (Dt 6410 / Kt 5110)"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax Calculation Modal (Real Ledger VAT Offset) */}
      <Dialog open={isCalcModalOpen} onOpenChange={setIsCalcModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.pages.tax.calculateModalTitle}</DialogTitle>
            <DialogDescription className="text-xs">
              Bosh kitob (6410 va 4410 schyotlar) hamda Didox E-SF asosida real QQS (12%) hisob-kitobi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="p-3.5 rounded-lg border border-indigo-500/30 bg-indigo-500/5 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chiquvchi E-SF boʻyicha QQS (6410 Kt):</span>
                <span className="font-mono font-semibold"><Money amount={vatOutput6410} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kiruvchi E-SF zachyot QQS (4410 Dt):</span>
                <span className="font-mono font-semibold text-emerald-600">-<Money amount={vatInput4410} /></span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between font-mono font-bold text-foreground text-sm">
                <span>Budjetga sof QQS toʻlovi:</span>
                <span className="text-primary"><Money amount={netVatPayable} /></span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCalcModalOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              onClick={handleConfirmVatCalculation}
            >
              {isSubmitting ? "Saqlanmoqda..." : t.pages.tax.confirmCalculation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
