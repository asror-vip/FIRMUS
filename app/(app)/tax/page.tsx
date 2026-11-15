"use client";

import React, { useState } from "react";
import { mockTaxRecords, mockTaxDeadlines } from "@/lib/mock/tax";
import { TaxRecord } from "@/lib/mock/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { Badge } from "@/components/ui/badge";
import {
  Percent,
  Calculator,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function TaxPage() {
  const { t } = useTranslation();
  const [selectedTax, setSelectedTax] = useState<TaxRecord | null>(null);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);

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
            onClick={() => toast.success(t.common.export)}
          >
            <Download className="h-3.5 w-3.5" />
            {t.common.export} (PDF/Excel)
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
            <span className="text-xs font-semibold text-foreground">QQS (12%)</span>
            <Badge variant="indigo" className="text-[10px] px-1 py-0 h-4">
              {t.common.monthly}
            </Badge>
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            <Money amount={38450000} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            20-dekabr
          </p>
        </Card>

        <Card className="p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">JShDS (12%)</span>
            <Badge variant="success" className="text-[10px] px-1 py-0 h-4">
              {t.statuses.paid}
            </Badge>
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            <Money amount={8208000} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            15-noyabr
          </p>
        </Card>

        <Card className="p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Ijtimoiy soliq (12%)</span>
            <Badge variant="success" className="text-[10px] px-1 py-0 h-4">
              {t.statuses.paid}
            </Badge>
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            <Money amount={8208000} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            15-noyabr
          </p>
        </Card>

        <Card className="p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Foyda soligʻi (15%)</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
              {t.common.quarterly}
            </Badge>
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            <Money amount={54200000} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Q3
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
              FIRMUS AI
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {mockTaxDeadlines.map((dl) => (
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
                <TableHead className="text-right">{t.pages.accounting.debit}</TableHead>
                <TableHead className="text-right">{t.pages.accounting.credit}</TableHead>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead className="text-right">{t.common.details}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTaxRecords.map((rec) => (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tax Calculation Modal */}
      <Dialog open={isCalcModalOpen} onOpenChange={setIsCalcModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.pages.tax.calculateModalTitle}</DialogTitle>
            <DialogDescription>
              1C & Didox
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5">
              <span className="font-semibold text-foreground block mb-1">
                QQS (12%)
              </span>
              <p className="text-muted-foreground leading-relaxed">
                (E-SF × 12%)
              </p>
              <div className="mt-2 pt-2 border-t border-border flex justify-between font-mono font-bold text-foreground">
                <span>QQS:</span>
                <span className="text-primary"><Money amount={38450000} /></span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              onClick={() => {
                toast.success(t.pages.tax.confirmCalculation);
                setIsCalcModalOpen(false);
              }}
            >
              {t.pages.tax.confirmCalculation}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
