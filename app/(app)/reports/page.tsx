"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  PieChart,
  FileText,
  DollarSign,
  Download,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function ReportsPage() {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reportTemplates = [
    {
      id: "rep-pnl",
      name: "Moliyaviy natijalar toʻgʻrisida hisobot (2-shakl)",
      category: "Buxgalteriya",
      description: "Daromadlar, tannarx, davr xarajatlari va sof foyda hisoboti (P&L).",
      icon: TrendingUp,
      period: "Oylik / Choraklik / Yillik",
    },
    {
      id: "rep-bal",
      name: "Buxgalteriya balansi (1-shakl)",
      category: "Buxgalteriya",
      description: "Aktivlar, xususiy kapital va majburiyatlarning rasmiy balansi.",
      icon: PieChart,
      period: "Davr oxiriga",
    },
    {
      id: "rep-osv",
      name: "Oborotno-sal'dovaya vedomost (OSV)",
      category: "Audit",
      description: "Barcha sintetik va analitik schyotlar boʻyicha aylanmalar va qoldiqlar (Shaxmatka).",
      icon: FileSpreadsheet,
      period: "Ixtiyoriy sana oraligʻi",
    },
    {
      id: "rep-tax",
      name: "QQS va Foyda soligʻi hisob-kitob varaqasi",
      category: "Soliq",
      description: "Didox hisob-fakturalari boʻyicha soliq bazasi va zachyot summasi tafsiloti.",
      icon: BarChart3,
      period: "Oylik",
    },
    {
      id: "rep-cash",
      name: "Pul oqimlari toʻgʻrisida hisobot (Cash Flow)",
      category: "Moliya",
      description: "Operatsion, investitsion va moliyaviy faoliyat boʻyicha naqd va naqdsiz oqimlar.",
      icon: DollarSign,
      period: "Haftalik / Oylik",
    },
    {
      id: "rep-reconcile",
      name: "Kontragentlar bilan solishtiruv dalolatnomasi (Akt sverki)",
      category: "Birlamchi",
      description: "Xaridor va yetkazib beruvchilar boʻyicha oʻzaro hisob-kitoblar va qarzlar akti.",
      icon: FileText,
      period: "Shartnoma boʻyicha",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.reports.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.reports.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => toast.info(t.pages.reports.generateReport)}
          >
            {t.pages.reports.generateReport}
          </Button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTemplates.map((rep) => {
          const Icon = rep.icon;
          return (
            <Card
              key={rep.id}
              className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all p-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {rep.category}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-semibold text-xs text-foreground leading-snug">
                    {rep.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {rep.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {rep.period}
                </span>

                <Button
                  size="sm"
                  className="h-7 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => setSelectedReport(rep.name)}
                >
                  Yaratish
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Report Generation Modal */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedReport}</DialogTitle>
              <DialogDescription>
                Hisobot davri va parametrlarini tanlang.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">Davr:</label>
                <select className="w-full h-8 rounded-lg border border-input bg-card px-3 text-xs text-foreground">
                  <option>2026-yil Oktyabr oyi</option>
                  <option>2026-yil 3-chorak (Q3)</option>
                  <option>2026-yil toʻliq (YTD)</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Format:</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 border border-primary bg-primary/5 rounded-lg text-center font-medium cursor-pointer">
                    Excel (.xlsx)
                  </div>
                  <div className="p-2 border border-border rounded-lg text-center font-medium cursor-pointer hover:bg-accent">
                    PDF (.pdf)
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs w-full"
                onClick={() => {
                  toast.success(`${selectedReport} muvaffaqiyatli shakllantirildi va yuklab olindi!`);
                  setSelectedReport(null);
                }}
              >
                Hisobotni Shakllantirish va Yuklash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
