"use client";

import React, { useState } from "react";
import {
  getLocalizedPnLStatement,
  getLocalizedBalanceSheet,
  getLocalizedCashFlowData,
} from "@/lib/mock/finance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/shared/money";
import { Download, TrendingUp, DollarSign, PieChart, FileText } from "lucide-react";
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
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState("pnl");

  const pnlStatement = getLocalizedPnLStatement(locale);
  const balanceSheet = getLocalizedBalanceSheet(locale);
  const cashFlowData = getLocalizedCashFlowData(locale);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.finance.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.finance.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleExportPdf}
          >
            <Download className="h-3.5 w-3.5" />
            PDF {t.common.export} (Shakl 1/2)
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleExportExcel}
          >
            <Download className="h-3.5 w-3.5" />
            Excel {t.common.export}
          </Button>
        </div>
      </div>

      {/* Tabs */}
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

        {/* 1. P&L Statement Tab */}
        <TabsContent value="pnl" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  {t.pages.finance.pnlReportTitle}
                </CardTitle>
                <CardDescription>
                  {t.pages.finance.pnlReportSubtitle}
                </CardDescription>
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
                    <TableRow
                      key={idx}
                      className={row.isHeader ? "bg-muted/40 font-bold" : "hover:bg-muted/30"}
                    >
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

        {/* 2. Balance Sheet Tab */}
        <TabsContent value="balance" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  {t.pages.finance.balanceReportTitle}
                </CardTitle>
                <CardDescription>
                  {t.pages.finance.balanceReportSubtitle}
                </CardDescription>
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
                      <TableCell className={`text-xs ${row.isSectionHeader ? "text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider" : row.isHeader ? "font-semibold text-foreground" : "text-foreground"}`}>
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

        {/* 3. Cash Flow Analysis Tab */}
        <TabsContent value="cashflow" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {t.pages.finance.cashflowTitle}
              </CardTitle>
              <CardDescription>
                {t.pages.finance.cashflowSubtitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[280px] w-full">
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
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toLocaleString()} ${t.common.currency}`]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="income" name={t.common.income} fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name={t.common.expense} fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
