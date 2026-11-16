"use client";

import React, { useState, useEffect } from "react";
import { getLocalizedBilling } from "@/lib/mock/billing";
import { useAppState } from "@/lib/mock/store";
import { fetchTeamMembers, updateWorkspacePlanInDb } from "@/lib/services/supabase-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Money } from "@/components/shared/money";
import { Check, CreditCard, Download } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { StatusPill } from "@/components/shared/status-pill";

export default function BillingPage() {
  const { currentWorkspace, entities, refreshContext } = useAppState();
  const { t } = useTranslation();
  const { currentPlan, usageMeters, plans, invoices } = getLocalizedBilling(t);

  const [teamCount, setTeamCount] = useState(1);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardLabel, setCardLabel] = useState("Kapitalbank Visa Business (•••• 4910)");
  const [cardLast4, setCardLast4] = useState("4910");
  const [cardHolder, setCardHolder] = useState("FIRMUS ACCOUNTING MCHJ");

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    fetchTeamMembers(currentWorkspace.id).then((m) => {
      if (m) setTeamCount(m.length);
    });
  }, [currentWorkspace?.id]);

  const activePlanId = currentWorkspace?.currentPlan || "professional";
  const activePlanObj = plans.find((p) => p.id === activePlanId) || plans[1] || currentPlan;

  const handlePlanChange = async (planId: string, planName: string) => {
    if (!currentWorkspace?.id) return;
    setIsUpdatingPlan(true);
    try {
      await updateWorkspacePlanInDb(currentWorkspace.id, planId);
      await refreshContext();
      toast.success(`Tarif rejasi «${planName}» ga muvaffaqiyatli oʻzgartirildi!`);
    } catch (err: any) {
      toast.error("Tarifni oʻzgartirishda xatolik: " + err.message);
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardLast4 || cardLast4.trim().length < 4) {
      toast.error("Karta raqamining oxirgi 4 ta raqamini kiriting");
      return;
    }
    setCardLabel(`Korporativ karta (•••• ${cardLast4.trim().slice(-4)})`);
    setIsCardModalOpen(false);
    toast.success("Toʻlov kartasi yangilandi!");
  };

  const handleDownloadInvoice = (inv: any) => {
    const content = [
      "========================================================",
      `TO'LOV HISOB-VARAG'I (INVOICE) № ${inv.id}`,
      "========================================================",
      `Sana: ${inv.date}`,
      `To'lovchi: ${currentWorkspace?.name || "FIRMUS"}`,
      `To'lov usuli: ${inv.paymentMethod}`,
      `Tarif rejasi: ${activePlanObj.name}`,
      `Summa: ${inv.amount.toLocaleString()} UZS`,
      `Holat: ${inv.status.toUpperCase()}`,
      "========================================================",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `firmus_invoice_${inv.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Hisob-faktura (${inv.id}) yuklab olindi!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.billing.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.billing.subtitle}
          </p>
        </div>
      </div>

      {/* Row 1: Current Plan & Live Usage Meters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-card to-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {t.pages.billing.currentPlan}
              </span>
              <StatusPill status="active" />
            </div>
            <CardTitle className="text-xl font-bold mt-1">{activePlanObj.name}</CardTitle>
            <CardDescription className="text-xs">
              {currentWorkspace?.name} • {currentPlan.renewalDate}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              <Money amount={activePlanObj.price} />{" "}
              <span className="text-xs font-normal text-muted-foreground font-sans">
                / {t.common.monthly}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.pages.billing.subtitle}
            </p>

            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 gap-1.5"
                onClick={() => setIsCardModalOpen(true)}
              >
                <CreditCard className="h-3.5 w-3.5" />
                {cardLabel}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t.pages.billing.usageQuotaTitle}</CardTitle>
            <CardDescription>{t.pages.billing.usageQuotaSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1 text-xs">
            {/* Live Managed Entities Meter */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{usageMeters.entities.label}</span>
                <span className="font-mono text-muted-foreground">
                  {entities.length} / {usageMeters.entities.max} {usageMeters.entities.unit}
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${Math.min(100, (entities.length / usageMeters.entities.max) * 100)}%` }}
                />
              </div>
            </div>

            {/* Live Team Members Meter */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{usageMeters.teamMembers.label}</span>
                <span className="font-mono text-muted-foreground">
                  {teamCount} / {usageMeters.teamMembers.max} {usageMeters.teamMembers.unit}
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${Math.min(100, (teamCount / usageMeters.teamMembers.max) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{usageMeters.aiTokens.label}</span>
                <span className="font-mono text-muted-foreground">
                  {usageMeters.aiTokens.percentage}% {usageMeters.aiTokens.spent}
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${usageMeters.aiTokens.percentage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{usageMeters.storage.label}</span>
                <span className="font-mono text-muted-foreground">
                  {usageMeters.storage.current} / {usageMeters.storage.max} {usageMeters.storage.unit}
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${usageMeters.storage.percentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Plan Comparison Cards */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-3">{t.pages.billing.changePlan}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = p.id === activePlanId;
            return (
              <Card
                key={p.id}
                className={`p-5 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? "border-primary ring-1 ring-primary shadow-sm bg-card"
                    : "border-border hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-foreground">{p.name}</h3>
                    {isCurrent && (
                      <Badge variant="indigo" className="text-[10px]">
                        {t.pages.billing.currentPlan}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xl font-bold font-mono text-foreground">
                    <Money amount={p.price} />{" "}
                    <span className="text-xs font-normal text-muted-foreground font-sans">
                      / {t.common.monthly}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {p.description}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-border text-xs">
                    {p.features.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-foreground text-[11px]">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-5 mt-4">
                  {isCurrent ? (
                    <Button variant="outline" size="sm" className="w-full text-xs h-8" disabled>
                      {t.pages.billing.currentPlan}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={isUpdatingPlan}
                      className="w-full text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => handlePlanChange(p.id, p.name)}
                    >
                      {isUpdatingPlan ? "Saqlanmoqda..." : t.pages.billing.changePlan}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Row 3: Invoices History Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{t.pages.billing.billingHistory}</CardTitle>
          <CardDescription>FIRMUS • {t.pages.billing.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>{t.common.date}</TableHead>
                <TableHead className="text-right">{t.common.amount}</TableHead>
                <TableHead>{t.pages.billing.paymentMethod}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead className="text-right">Kvitansiya</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    {inv.id}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {inv.date}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">
                    <Money amount={inv.amount} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {inv.paymentMethod}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={inv.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2 gap-1"
                      onClick={() => handleDownloadInvoice(inv)}
                    >
                      <Download className="h-3 w-3" />
                      Yuklab olish
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Method Update Dialog */}
      <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Toʻlov kartasini boshqarish</DialogTitle>
            <DialogDescription className="text-xs">
              Obuna toʻlovlari uchun korporativ Uzcard / Humo / Visa Business kartasi
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCard} className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-[11px] font-medium">Karta egasi / Kompaniya</Label>
              <Input
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium">Karta oxirgi 4 raqami</Label>
              <Input
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value)}
                maxLength={4}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCardModalOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                {t.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
