"use client";

import React, { useState, useEffect } from "react";
import { fetchTrialBalance, fetchTransactions } from "@/lib/services/supabase-service";
import { useAppState } from "@/lib/mock/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/shared/money";
import { Download, TrendingUp, DollarSign, PieChart } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function FinancePage() {
  const { currentEntity } = useAppState();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("pnl");
  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (!currentEntity?.id) return;

    Promise.all([
      fetchTrialBalance(currentEntity.id),
      fetchTransactions(currentEntity.id),
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
  const sumAccountNet = (codes: string[], side: "debit" | "credit" | "net_debit" | "net_credit") => {
    return trialBalance
      .filter((r) => codes.some((c) => r.account_code?.startsWith(c)))
      .reduce((sum, r) => {
        if (side === "debit") return sum + Number(r.period_debit || 0);
        if (side === "credit") return sum + Number(r.period_credit || 0);
        if (side === "net_debit") return sum + Number(r.closing_debit || 0);
        return sum + Number(r.closing_credit || 0);
      }, 0);
  };

  // Real P&L computed from Trial Balance + Transactions fallback if no 9010 entries posted yet
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

  const pnlStatement = [
    { code: "010", category: "Mahsulot (tovar, ish, xizmat)larni sotishdan sof tushum (9010)", currentPeriod: netRevenue, prevPeriod: 0, isHeader: false },
    { code: "020", category: "Sotilgan mahsulotlarning tannarxi (9110)", currentPeriod: costOfSales, prevPeriod: 0, isHeader: false },
    { code: "030", category: "Mahsulot sotishdan yalpi foyda (zarar)", currentPeriod: grossProfit, prevPeriod: 0, isHeader: true },
    { code: "050", category: "Maʼmuriy xarajatlar (9420)", currentPeriod: adminExpenses, prevPeriod: 0, isHeader: false },
    { code: "060", category: "Boshqa operatsion xarajatlar (9430)", currentPeriod: otherOpExpenses, prevPeriod: 0, isHeader: false },
    { code: "100", category: "Asosiy faoliyatdan olingan foyda", currentPeriod: operatingProfit, prevPeriod: 0, isHeader: true },
    { code: "250", category: "Foyda soligʻi (15%)", currentPeriod: profitTax15, prevPeriod: 0, isHeader: false },
    { code: "270", category: "Hisobot davrining sof foydasi (zarari)", currentPeriod: netProfit, prevPeriod: 0, isHeader: true },
  ];

  // Real Balance Sheet computed dynamically from Trial Balance
  const fixedAssets = sumAccountNet(["01", "08"], "net_debit");
  const inventoryVal = sumAccountNet(["10", "28", "29"], "net_debit");
  const receivablesVal = sumAccountNet(["40", "43", "44"], "net_debit");
  const cashVal = sumAccountNet(["50", "51", "52"], "net_debit");
  const totalAssets = fixedAssets + inventoryVal + receivablesVal + cashVal;

  const equityCapital = sumAccountNet(["83"], "net_credit");
  const retainedEarnings = sumAccountNet(["87"], "net_credit") + Math.max(0, netProfit);
  const totalEquity = equityCapital + retainedEarnings;

  const payablesSuppliers = sumAccountNet(["60", "63"], "net_credit");
  const taxPayables = sumAccountNet(["64"], "net_credit");
  const payrollPayables = sumAccountNet(["67"], "net_credit");
  const totalLiabilities = payablesSuppliers + taxPayables + payrollPayables;

  const balanceSheet = [
    { section: "I. AKTIVLAR (MABLAĞLAR)", code: "", amount: totalAssets, isSectionHeader: true, isHeader: false },
    { section: "Asosiy vositalar va kapital qoʻyilmalar (0100, 0820)", code: "010", amount: fixedAssets, isSectionHeader: false, isHeader: false },
    { section: "Tovar-moddiy zaxiralar va ombor (1010–2910)", code: "140", amount: inventoryVal, isSectionHeader: false, isHeader: false },
    { section: "Debitorlik qarzlari va boʻnaklar (4010–4410)", code: "210", amount: receivablesVal, isSectionHeader: false, isHeader: false },
    { section: "Pul mablagʻlari: Kassa va Bank schyotlari (5010–5210)", code: "320", amount: cashVal, isSectionHeader: false, isHeader: false },
    { section: "BALANS AKTIVI JAMI", code: "400", amount: totalAssets, isSectionHeader: false, isHeader: true },
    { section: "II. PASSIVLAR (MAJBURIYATLAR VA KAPITAL)", code: "", amount: totalEquity + totalLiabilities, isSectionHeader: true, isHeader: false },
    { section: "Ustav kapitali (8330)", code: "410", amount: equityCapital, isSectionHeader: false, isHeader: false },
    { section: "Taqsimlanmagan foyda (8710 + Sof foyda)", code: "450", amount: retainedEarnings, isSectionHeader: false, isHeader: false },
    { section: "Mol yetkazib beruvchilar va avanslar (6010, 6310)", code: "610", amount: payablesSuppliers, isSectionHeader: false, isHeader: false },
    { section: "Budjet va soliq qarzlari (6410)", code: "640", amount: taxPayables, isSectionHeader: false, isHeader: false },
    { section: "Mehnat haqi qarzlari (6710)", code: "670", amount: payrollPayables, isSectionHeader: false, isHeader: false },
    { section: "BALANS PASSIVI JAMI", code: "780", amount: totalEquity + totalLiabilities, isSectionHeader: false, isHeader: true },
  ];

  // Real Cash Flow chart data from transactions
  const cashFlowMap = new Map<string, { date: string; income: number; expense: number }>();
  for (const tx of [...transactions].sort((a, b) => a.date.localeCompare(b.date))) {
    const existing = cashFlowMap.get(tx.date) || { date: tx.date, income: 0, expense: 0 };
    if (tx.type === "income") existing.income += tx.amount;
    else existing.expense += tx.amount;
    cashFlowMap.set(tx.date, existing);
  }
  const cashFlowData = Array.from(cashFlowMap.values());

  const handleExportExcel = () => {
    let filename = "";
    let csvContent = "";
    if (activeTab === "pnl") {
      filename = `shakl_2_moliyaviy_natijalar_${new Date().getFullYear()}.csv`;
      const headers = ["Satr kodi", "Ko'rsatkich nomi", "O'tgan davr (UZS)", "Hisobot davri (UZS)"];
      const rows = pnlStatement.map((item) => [
        item.code,
        `"${item.category.replace(/"/g, '""')}"`,
        item.prevPeriod,
        item.currentPeriod,
      ]);
      csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    } else {
      filename = `shakl_1_buxgalteriya_balansi_${new Date().getFullYear()}.csv`;
      const headers = ["Satr kodi", "Ko'rsatkich nomi", "Summa (UZS)"];
      const rows = balanceSheet.map((item) => [
        item.code || "-",
        `"${item.section.replace(/"/g, '""')}"`,
        item.amount,
      ]);
      csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${filename} muvaffaqiyatli yuklab olindi!`);
  };

  const handleExportPdf = () => {
    window.print();
    toast.success("Hisobot chop etish / PDF saqlash uchun tayyorlandi");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.finance.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentEntity?.name} • Real Bosh kitob (Ledger) asosidagi shakllar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={handleExportPdf}>
            <Download className="h-3.5 w-3.5" />
            PDF {t.common.export} (Shakl 1/2)
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={handleExportExcel}>
            <Download className="h-3.5 w-3.5" />
            Excel {t.common.export}
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t.pages.finance.cashflowTitle}</CardTitle>
              <CardDescription>{t.pages.finance.cashflowSubtitle}</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[280px] w-full">
                {cashFlowData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(val) => `${(val / 1000000).toFixed(0)}m`}
                      />
                      <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString()} ${t.common.currency}`]} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="income" name={t.common.income} fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name={t.common.expense} fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    Pul oqimlari maʼlumoti hozircha mavjud emas.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
