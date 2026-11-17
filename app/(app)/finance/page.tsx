"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { fetchTrialBalance, fetchRecentTransactions } from "@/lib/services/supabase-service";
import { cacheKeys, peekQueryCache } from "@/lib/cache/query-cache";
import { useAppState } from "@/lib/context/app-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/shared/money";
import { Download, TrendingUp, DollarSign, PieChart } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getReconcileErpDict, getIntlLocale } from "@/lib/i18n/domains/reconcile-erp";
import { sanitizeCsvField, downloadCsvBlob } from "@/lib/utils/csv";

const CashflowChart = dynamic(
  () => import("@/components/finance/cashflow-chart"),
  { ssr: false }
);

export default function FinancePage() {
  const { currentEntity } = useAppState();
  const { t, locale } = useTranslation();
  const dict = getReconcileErpDict(locale);
  const d = dict.erpExtra.finance;
  const intlLocale = getIntlLocale(locale);
  const [activeTab, setActiveTab] = useState("pnl");
  const [trialBalance, setTrialBalance] = useState<any[]>(() => {
    if (!currentEntity?.id) return [];
    return peekQueryCache<any[]>(cacheKeys.trialBalance(currentEntity.id))?.data || [];
  });
  const [transactions, setTransactions] = useState<any[]>(() => {
    if (!currentEntity?.id) return [];
    return peekQueryCache<any[]>(cacheKeys.recentTransactions(currentEntity.id, 150))?.data || [];
  });

  useEffect(() => {
    let isMounted = true;
    if (!currentEntity?.id) {
      setTrialBalance([]);
      setTransactions([]);
      return;
    }

    const peekTb = peekQueryCache<any[]>(cacheKeys.trialBalance(currentEntity.id));
    if (peekTb) {
      setTrialBalance(peekTb.data || []);
    }
    const peekTx = peekQueryCache<any[]>(cacheKeys.recentTransactions(currentEntity.id, 150));
    if (peekTx) {
      setTransactions(peekTx.data || []);
    }

    Promise.all([
      fetchTrialBalance(currentEntity.id),
      fetchRecentTransactions(currentEntity.id, 150),
    ]).then(([tb, tx]) => {
      if (!isMounted) return;
      setTrialBalance(tb || []);
      setTransactions(tx || []);
    });

    return () => {
      isMounted = false;
    };
  }, [currentEntity?.id]);

  // Helper to get closing or turnover by account prefix
  const sumAccountNet = useMemo(
    () => (codes: string[], side: "debit" | "credit" | "net_debit" | "net_credit") => {
      return trialBalance
        .filter((r) => codes.some((c) => r.account_code?.startsWith(c)))
        .reduce((sum, r) => {
          if (side === "debit") return sum + Number(r.period_debit || 0);
          if (side === "credit") return sum + Number(r.period_credit || 0);
          if (side === "net_debit") return sum + Number(r.closing_debit || 0);
          return sum + Number(r.closing_credit || 0);
        }, 0);
    },
    [trialBalance]
  );

  // Real P&L computed from Trial Balance + Transactions fallback if no 9010 entries posted yet
  const pnlStatement = useMemo(() => {
    const ledgerRevenue = sumAccountNet(["90"], "credit");
    const txIncome = transactions.filter((x) => x.type === "income").reduce((a, b) => a + b.amount, 0);
    const netRevenue = ledgerRevenue > 0 ? ledgerRevenue : txIncome;

    const costOfSales = sumAccountNet(["91"], "debit");
    const grossProfit = netRevenue - costOfSales;
    const adminExpenses = sumAccountNet(["9420"], "debit");
    const otherOpExpenses = sumAccountNet(["9430"], "debit");
    const totalOpExpenses = adminExpenses + otherOpExpenses;
    const operatingProfit = grossProfit - totalOpExpenses;
    const profitTax15 = operatingProfit > 0 ? Math.round(operatingProfit * 0.15) : 0;
    const netProfit = operatingProfit - profitTax15;

    return [
      { code: "010", category: d.pnlRows.r010, currentPeriod: netRevenue, prevPeriod: 0, isHeader: false },
      { code: "020", category: d.pnlRows.r020, currentPeriod: costOfSales, prevPeriod: 0, isHeader: false },
      { code: "030", category: d.pnlRows.r030, currentPeriod: grossProfit, prevPeriod: 0, isHeader: true },
      { code: "050", category: d.pnlRows.r050, currentPeriod: adminExpenses, prevPeriod: 0, isHeader: false },
      { code: "060", category: d.pnlRows.r060, currentPeriod: otherOpExpenses, prevPeriod: 0, isHeader: false },
      { code: "100", category: d.pnlRows.r100, currentPeriod: operatingProfit, prevPeriod: 0, isHeader: true },
      { code: "250", category: d.pnlRows.r250, currentPeriod: profitTax15, prevPeriod: 0, isHeader: false },
      { code: "270", category: d.pnlRows.r270, currentPeriod: netProfit, prevPeriod: 0, isHeader: true },
    ];
  }, [sumAccountNet, transactions, d.pnlRows]);

  // Real Balance Sheet computed dynamically from Trial Balance
  const balanceSheet = useMemo(() => {
    const fixedAssets = sumAccountNet(["01", "08"], "net_debit");
    const inventoryVal = sumAccountNet(["10", "28", "29"], "net_debit");
    const receivablesVal = sumAccountNet(["40", "43", "44"], "net_debit");
    const cashVal = sumAccountNet(["50", "51", "52"], "net_debit");
    const totalAssets = fixedAssets + inventoryVal + receivablesVal + cashVal;

    const equityCapital = sumAccountNet(["83"], "net_credit");
    // Unclosed profit = 90xx closing credit - 91xx/94xx closing debit; once period is closed it lives in 8710
    const unclosedOperatingProfit = Math.max(
      0,
      sumAccountNet(["90"], "net_credit") - sumAccountNet(["91", "94"], "net_debit")
    );
    const retainedEarnings = sumAccountNet(["87"], "net_credit") + unclosedOperatingProfit;
    const totalEquity = equityCapital + retainedEarnings;

    const payablesSuppliers = sumAccountNet(["60", "63"], "net_credit");
    const taxPayables = sumAccountNet(["64"], "net_credit");
    const payrollPayables = sumAccountNet(["67"], "net_credit");
    const totalLiabilities = payablesSuppliers + taxPayables + payrollPayables;

    return [
      { section: d.balanceRows.assetsHeader, code: "", amount: totalAssets, isSectionHeader: true, isHeader: false },
      { section: d.balanceRows.fixedAssets, code: "010", amount: fixedAssets, isSectionHeader: false, isHeader: false },
      { section: d.balanceRows.inventory, code: "140", amount: inventoryVal, isSectionHeader: false, isHeader: false },
      { section: d.balanceRows.receivables, code: "210", amount: receivablesVal, isSectionHeader: false, isHeader: false },
      { section: d.balanceRows.cash, code: "320", amount: cashVal, isSectionHeader: false, isHeader: false },
      { section: d.balanceRows.assetsTotal, code: "400", amount: totalAssets, isSectionHeader: false, isHeader: true },
      { section: d.balanceRows.liabilitiesHeader, code: "", amount: totalEquity + totalLiabilities, isSectionHeader: true, isHeader: false },
      { section: d.balanceRows.equityCapital, code: "410", amount: equityCapital, isSectionHeader: false, isHeader: false },
      { section: d.balanceRows.retainedEarnings, code: "450", amount: retainedEarnings, isSectionHeader: false, isHeader: false },
      { section: d.balanceRows.payablesSuppliers, code: "610", amount: payablesSuppliers, isSectionHeader: false, isHeader: false },
      { section: d.balanceRows.taxPayables, code: "640", amount: taxPayables, isSectionHeader: false, isHeader: false },
      { section: d.balanceRows.payrollPayables, code: "670", amount: payrollPayables, isSectionHeader: false, isHeader: false },
      { section: d.balanceRows.liabilitiesTotal, code: "780", amount: totalEquity + totalLiabilities, isSectionHeader: false, isHeader: true },
    ];
  }, [sumAccountNet, d.balanceRows]);

  // Real Cash Flow chart data from transactions
  const cashFlowData = useMemo(() => {
    const cashFlowMap = new Map<string, { date: string; income: number; expense: number }>();
    for (const tx of [...transactions].sort((a, b) => a.date.localeCompare(b.date))) {
      const existing = cashFlowMap.get(tx.date) || { date: tx.date, income: 0, expense: 0 };
      if (tx.type === "income") existing.income += tx.amount;
      else existing.expense += tx.amount;
      cashFlowMap.set(tx.date, existing);
    }
    return Array.from(cashFlowMap.values());
  }, [transactions]);

  const handleExportExcel = () => {
    let filename = "";
    let csvContent = "";
    if (activeTab === "pnl") {
      filename = `shakl_2_moliyaviy_natijalar_${new Date().getFullYear()}.csv`;
      const headers = d.pnlCsvHeaders;
      const rows = pnlStatement.map((item) => [
        sanitizeCsvField(item.code),
        sanitizeCsvField(item.category),
        sanitizeCsvField(item.prevPeriod),
        sanitizeCsvField(item.currentPeriod),
      ]);
      csvContent = [headers.map(sanitizeCsvField).join(","), ...rows.map((e) => e.join(","))].join("\n");
    } else {
      filename = `shakl_1_buxgalteriya_balansi_${new Date().getFullYear()}.csv`;
      const headers = d.balanceCsvHeaders;
      const rows = balanceSheet.map((item) => [
        sanitizeCsvField(item.code || "-"),
        sanitizeCsvField(item.section),
        sanitizeCsvField(item.amount),
      ]);
      csvContent = [headers.map(sanitizeCsvField).join(","), ...rows.map((e) => e.join(","))].join("\n");
    }

    downloadCsvBlob(filename, csvContent);
    toast.success(d.toasts.excelExported.replace("{filename}", filename));
  };

  const handleExportPdf = () => {
    window.print();
    toast.success(d.toasts.pdfReady);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.finance.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentEntity?.name} • {d.subtitleSuffix}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={handleExportPdf}>
            <Download className="h-3.5 w-3.5" />
            {d.pdfBtnLabel} {t.common.export}
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={handleExportExcel}>
            <Download className="h-3.5 w-3.5" />
            {d.excelBtnLabel} {t.common.export}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="pnl" className="text-xs gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            {t.pages.finance.tabs.pnl}
          </TabsTrigger>
          <TabsTrigger value="balance" className="text-xs gap-1.5">
            <PieChart className="h-3.5 w-3.5" />
            {t.pages.finance.tabs.balanceSheet}
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            {t.pages.finance.tabs.cashflow}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">{t.pages.finance.pnlReportTitle}</CardTitle>
                <CardDescription>{t.pages.finance.pnlReportSubtitle}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.common.name}</TableHead>
                    <TableHead className="w-20 text-center">{t.pages.accounting.code}</TableHead>
                    <TableHead className="text-right">{t.common.period}</TableHead>
                    <TableHead className="text-right">{t.common.previous}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pnlStatement.map((row, idx) => (
                    <TableRow key={idx} className={row.isHeader ? "bg-muted/40 font-bold" : "hover:bg-muted/30"}>
                      <TableCell className={`text-xs ${row.isHeader ? "font-bold text-foreground" : "text-foreground"}`}>
                        {row.category}
                      </TableCell>
                      <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                        {row.code}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs ${row.isHeader ? "font-bold text-foreground" : ""}`}>
                        <Money amount={row.currentPeriod} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        <Money amount={row.prevPeriod} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">{t.pages.finance.balanceReportTitle}</CardTitle>
                <CardDescription>{t.pages.finance.balanceReportSubtitle}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.common.name}</TableHead>
                    <TableHead className="w-20 text-center">{t.pages.accounting.code}</TableHead>
                    <TableHead className="text-right">{t.pages.accounting.balance}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceSheet.map((row, idx) => (
                    <TableRow
                      key={idx}
                      className={
                        row.isSectionHeader
                          ? "bg-indigo-500/10 dark:bg-indigo-500/20 font-bold"
                          : row.isHeader
                          ? "bg-muted/40 font-semibold"
                          : "hover:bg-muted/30"
                      }
                    >
                      <TableCell
                        className={`text-xs ${
                          row.isSectionHeader
                            ? "text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider"
                            : row.isHeader
                            ? "font-semibold text-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {row.section}
                      </TableCell>
                      <TableCell className="text-center font-mono text-[11px] text-muted-foreground">
                        {row.code}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs ${row.isSectionHeader || row.isHeader ? "font-bold text-foreground" : ""}`}>
                        <Money amount={row.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4 mt-4">
          {activeTab === "cashflow" && (
            <CashflowChart
              cashFlowData={cashFlowData}
              title={t.pages.finance.cashflowTitle}
              subtitle={t.pages.finance.cashflowSubtitle}
              emptyLabel={d.emptyCashflow}
              incomeLabel={t.common.income}
              expenseLabel={t.common.expense}
              currencyLabel={t.common.currency}
              intlLocale={intlLocale}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
