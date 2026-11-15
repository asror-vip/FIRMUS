"use client";

import React, { useState } from "react";
import { mockPnLStatement, mockBalanceSheet, mockCashFlowData } from "@/lib/mock/finance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/shared/money";
import { Download, TrendingUp, DollarSign, PieChart, FileText } from "lucide-react";
import { toast } from "sonner";
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
  const [activeTab, setActiveTab] = useState("pnl");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Moliya & Buxgalteriya Hisobotlari
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Moliyaviy natijalar toʻgʻrisida hisobot (2-shakl) va Buxgalteriya balansi (1-shakl)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => toast.success("Moliyaviy hisobotlar PDF formatida yuklab olindi")}
          >
            <Download className="h-3.5 w-3.5" />
            PDF Yuklab olish
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => toast.success("Hisobotlar Excel (XLSX) formatida yuklab olindi")}
          >
            <Download className="h-3.5 w-3.5" />
            Excel (1-2 shakllar)
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="pnl" className="text-xs gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            P&L (Foyda va zararlar • 2-shakl)
          </TabsTrigger>
          <TabsTrigger value="balance" className="text-xs gap-1.5">
            <PieChart className="h-3.5 w-3.5" />
            Buxgalteriya Balansi (1-shakl)
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Pul Oqimi Tahlili (Cash Flow)
          </TabsTrigger>
        </TabsList>

        {/* 1. P&L Statement Tab */}
        <TabsContent value="pnl" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Moliyaviy Natijalar Toʻgʻrisida Hisobot (Form №2)
                </CardTitle>
                <CardDescription>
                  2026-yil 3-chorak (Q3) yakunlari boʻyicha
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Koʻrsatkichlar Nomi</TableHead>
                    <TableHead className="w-20 text-center">Satr Kodi</TableHead>
                    <TableHead className="text-right">Hisobot Davri (soʻm)</TableHead>
                    <TableHead className="text-right">Oʻtgan Yil Shu Davrida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockPnLStatement.map((row, idx) => (
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
                  Buxgalteriya Balansi (Form №1)
                </CardTitle>
                <CardDescription>
                  2026-yil 1-noyabr holatiga
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Boʻlim va Moddalar Nomi</TableHead>
                    <TableHead className="w-20 text-center">Satr Kodi</TableHead>
                    <TableHead className="text-right">Davr Oxiriga Summa (soʻm)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockBalanceSheet.map((row, idx) => (
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
                Kirim va Chiqim Nisbati (Oylik Tahlil)
              </CardTitle>
              <CardDescription>
                Daromadlar va xarajatlarning davriy nisbati
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockCashFlowData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(0)}m`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toLocaleString()} soʻm`]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="income" name="Kirim tushumlari" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Chiqim xarajatlari" fill="#4F46E5" radius={[4, 4, 0, 0]} />
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
