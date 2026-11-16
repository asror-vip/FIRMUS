"use client";

import React, { useState, useEffect } from "react";
import { fetchTrialBalance, fetchTransactions, fetchContracts } from "@/lib/services/supabase-service";
import { useAppState } from "@/lib/mock/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/shared/money";
import {
  BarChart3,
  FileSpreadsheet,
  TrendingUp,
  PieChart,
  FileText,
  DollarSign,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function ReportsPage() {
  const { currentEntity } = useAppState();
  const { t } = useTranslation();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("2026-Q4");
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "html">("csv");

  const [trialBalance, setTrialBalance] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    if (!currentEntity?.id) {
      setTrialBalance([]);
      setTransactions([]);
      setContracts([]);
      return;
    }
    Promise.all([
      fetchTrialBalance(currentEntity.id),
      fetchTransactions(currentEntity.id),
      fetchContracts(currentEntity.id),
    ]).then(([tb, tx, ct]) => {
      setTrialBalance(tb || []);
      setTransactions(tx || []);
      setContracts(ct || []);
    });
  }, [currentEntity?.id]);

  const reportTemplates = [
    {
      id: "rep-pnl",
      name: t.pages.finance.tabs.pnl,
      category: "2-Shakl (BHMS)",
      description: "Daromadlar (9010), tannarx (9110), davr xarajatlari (9420) va sof foyda hisoboti",
      icon: TrendingUp,
      period: "Oylik / Choraklik",
    },
    {
      id: "rep-bal",
      name: t.pages.finance.tabs.balanceSheet,
      category: "1-Shakl (BHMS)",
      description: "Aktivlar (0100–5900), Majburiyatlar (6000–7900) va Xususiy kapital (8300–8700)",
      icon: PieChart,
      period: "Hisobot davri yakuni",
    },
    {
      id: "rep-osv",
      name: t.pages.accounting.tabs.trialBalance,
      category: "Buxgalteriya",
      description: "Barcha schyotlar boʻyicha boshlangʻich saldo, debet/kredit aylanma va yakuniy qoldiq",
      icon: FileSpreadsheet,
      period: "Ixtiyoriy davr",
    },
    {
      id: "rep-tax",
      name: t.pages.tax.tabs.vat,
      category: t.nav.tax,
      description: "Chiquvchi va kiruvchi E-SF boʻyicha QQS (12%) zachyoti va budjetga toʻlov",
      icon: BarChart3,
      period: "Oylik",
    },
    {
      id: "rep-cash",
      name: t.pages.finance.tabs.cashflow,
      category: t.nav.finance,
      description: "Operatsion, investitsion va moliyaviy faoliyatdan pul oqimlari harakati",
      icon: DollarSign,
      period: "Haftalik / Oylik",
    },
    {
      id: "rep-reconcile",
      name: "Kontragentlar solishtirma dalolatnomasi (Akt sverki)",
      category: t.nav.contracts,
      description: "Xaridorlar (4010) va yetkazib beruvchilar (6010) bilan oʻzaro hisob-kitoblar holati",
      icon: FileText,
      period: "Shartnoma boʻyicha",
    },
  ];

  const activeTemplate = reportTemplates.find((r) => r.id === selectedReportId);

  const handleDownloadReport = (reportId: string) => {
    const rep = reportTemplates.find((r) => r.id === reportId) || reportTemplates[0];
    const dateStr = new Date().toISOString().split("T")[0];
    let headers: string[] = [];
    let rows: any[][] = [];

    if (reportId === "rep-osv" || reportId === "rep-bal") {
      headers = ["Schyot kodi", "Schyot nomi", "Turi", "Boshlang'ich Dt", "Boshlang'ich Kt", "Davr Debet", "Davr Kredit", "Yakuniy Dt", "Yakuniy Kt"];
      rows = trialBalance.map((r) => [
        r.account_code,
        `"${(r.account_name || "").replace(/"/g, '""')}"`,
        r.account_type,
        r.opening_debit,
        r.opening_credit,
        r.period_debit,
        r.period_credit,
        r.closing_debit,
        r.closing_credit,
      ]);
    } else if (reportId === "rep-cash") {
      headers = ["Sana", "Kontragent", "STIR", "Yo'nalish", "Summa (UZS)", "Tavsif", "Holat"];
      rows = transactions.map((tx) => [
        tx.date,
        `"${(tx.counterparty || "").replace(/"/g, '""')}"`,
        tx.counterpartyStir || "",
        tx.type === "income" ? "Kirim" : "Chiqim",
        tx.amount,
        `"${(tx.description || "").replace(/"/g, '""')}"`,
        tx.status,
      ]);
    } else if (reportId === "rep-reconcile") {
      headers = ["Shartnoma №", "Kontragent", "STIR", "Turi", "Shartnoma summasi", "Boshlanish sanasi", "Tugash sanasi", "Holat"];
      rows = contracts.map((c) => [
        c.number,
        `"${(c.counterparty || "").replace(/"/g, '""')}"`,
        c.counterpartyStir || "",
        c.type,
        c.amount,
        c.startDate,
        c.endDate,
        c.status,
      ]);
    } else if (reportId === "rep-tax") {
      headers = ["Schyot kodi", "Ko'rsatkich", "Hisoblangan / Kredit (UZS)", "Zachyot / Debet (UZS)", "Qoldiq (UZS)"];
      const row6410 = trialBalance.find((r) => r.account_code === "6410");
      const row4410 = trialBalance.find((r) => r.account_code === "4410");
      const vatOut = Number(row6410?.period_credit || 0);
      const vatIn = Number(row4410?.period_debit || 0);
      rows = [
        ["6410", `"Budjetga hisoblangan QQS"`, vatOut, Number(row6410?.period_debit || 0), Math.max(0, vatOut - vatIn)],
        ["4410", `"Kiruvchi E-SF zachyot QQS"`, 0, vatIn, vatIn],
      ];
    } else {
      headers = ["Ko'rsatkich nomi", "Satr kodi", "Schyot", "Davr", "Summa (UZS)"];
      const totalIncome = transactions.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0);
      const totalExpense = transactions.filter((t) => t.type === "expense").reduce((a, b) => a + b.amount, 0);
      const netProfit = totalIncome - totalExpense;
      rows = [
        ["Mahsulot va xizmatlar sotishdan sof tushum", "010", "9010", selectedPeriod, totalIncome],
        ["Sotilgan mahsulotlar va xizmatlar tannarxi", "020", "9110", selectedPeriod, Math.round(totalExpense * 0.65)],
        ["Yalpi foyda", "030", "—", selectedPeriod, totalIncome - Math.round(totalExpense * 0.65)],
        ["Ma'muriy va operatsion xarajatlar", "050", "9420", selectedPeriod, Math.round(totalExpense * 0.35)],
        ["Hisobot davrining sof foydasi", "270", "8710", selectedPeriod, netProfit],
      ];
    }

    if (selectedFormat === "html" && selectedReportId === reportId) {
      const htmlRows = rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td style="border:1px solid #cbd5e1;padding:6px 10px;font-family:monospace;">${String(cell).replace(/^"|"$/g, "")}</td>`).join("")}</tr>`
        )
        .join("");
      const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>${rep.name}</title></head><body style="font-family:sans-serif;padding:24px;"><h2>${rep.name} (${selectedPeriod})</h2><p><strong>Korxona:</strong> ${currentEntity?.name || "FIRMUS"} (STIR: ${currentEntity?.tinStir || "—"})</p><table style="border-collapse:collapse;width:100%;font-size:13px;"><thead><tr style="background:#f1f5f9;">${headers.map((h) => `<th style="border:1px solid #cbd5e1;padding:8px 10px;text-align:left;">${h}</th>`).join("")}</tr></thead><tbody>${htmlRows}</tbody></table></body></html>`;
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `firmus_${reportId}_${selectedPeriod}_${dateStr}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" +
        [
          `# Korxona: ${currentEntity?.name || "FIRMUS"} (STIR: ${currentEntity?.tinStir || "301948572"})`,
          `# Hisobot: ${rep.name} | Davr: ${selectedPeriod}`,
          headers.join(","),
          ...rows.map((e) => e.join(",")),
        ].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `firmus_${reportId}_${selectedPeriod}_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast.success(`«${rep.name}» (${selectedPeriod}, ${selectedFormat.toUpperCase()}) muvaffaqiyatli yuklab olindi!`);
    setSelectedReportId(null);
  };

  const totalTurnoverDebit = trialBalance.reduce((acc, r) => acc + Number(r.period_debit || 0), 0);

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
            onClick={() => handleDownloadReport("rep-osv")}
          >
            <Download className="h-3.5 w-3.5" />
            Toʻliq Oborot-Saldo (CSV)
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
                  className="h-7 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  onClick={() => setSelectedReportId(rep.id)}
                >
                  <Download className="h-3 w-3" />
                  {t.pages.reports.generateReport}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Report Generation Modal */}
      {activeTemplate && (
        <Dialog open={!!selectedReportId} onOpenChange={(open) => !open && setSelectedReportId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                {activeTemplate.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Korxona: {currentEntity?.name} (STIR: {currentEntity?.tinStir})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
                <span className="text-muted-foreground">Bosh kitob aylanmasi (Ledger):</span>
                <span className="font-mono font-bold text-foreground">
                  <Money amount={totalTurnoverDebit} />
                </span>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Hisobot davri:</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full h-8 rounded-lg border border-input bg-card px-3 text-xs text-foreground"
                >
                  <option value="2026-Q4">2026-yil 4-chorak (Joriy)</option>
                  <option value="2026-Q3">2026-yil 3-chorak</option>
                  <option value="2026-YTD">2026-yil Yillik (YTD)</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Yuklab olish formati:</label>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setSelectedFormat("csv")}
                    className={`p-2 border rounded-lg text-center font-medium cursor-pointer transition-colors ${
                      selectedFormat === "csv"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    Excel / CSV (.csv)
                  </div>
                  <div
                    onClick={() => setSelectedFormat("html")}
                    className={`p-2 border rounded-lg text-center font-medium cursor-pointer transition-colors ${
                      selectedFormat === "html"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    1C / Soliq.uz Jadvali
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedReportId(null)}>
                {t.common.cancel}
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                onClick={() => handleDownloadReport(activeTemplate.id)}
              >
                <Download className="h-3.5 w-3.5" />
                Hisobotni yuklab olish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
