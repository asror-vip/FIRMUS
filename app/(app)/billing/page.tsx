"use client";

import React from "react";
import { mockBillingData } from "@/lib/mock/billing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/shared/money";
import { Check, Sparkles, CreditCard, Shield, Download, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

export default function BillingPage() {
  const { currentPlan, usageMeters, plans, invoices } = mockBillingData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Obuna & Toʻlovlar (Billing)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Joriy tarif rejasi, resurslar sarfi va toʻlov invoyslari
          </p>
        </div>
      </div>

      {/* Row 1: Current Plan & Usage Meters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Current Plan Card */}
        <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-card to-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Faol Tarif Rejasi
              </span>
              <Badge variant="indigo" className="text-[10px]">
                Faol
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold mt-1">{currentPlan.name}</CardTitle>
            <CardDescription className="text-xs">
              Keyingi toʻlov sanasi: {currentPlan.renewalDate}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              <Money amount={currentPlan.price} />{" "}
              <span className="text-xs font-normal text-muted-foreground font-sans">
                / {currentPlan.period}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Buxgalteriya firmalari va bir nechta mijozlarni yurituvchi mutaxassislar uchun toʻliq funksional paket.
            </p>

            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => toast.info("To'lov usuli: Kapitalbank Visa Business (•••• 4910)")}
              >
                Karta maʼlumotlari
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right 2 cols: Usage Meters */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Resurslar Sarfi (Usage Quota)</CardTitle>
            <CardDescription>Tarif boʻyicha ajratilgan limitlar holati</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-1 text-xs">
            {/* Managed Entities Meter */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{usageMeters.entities.label}</span>
                <span className="font-mono text-muted-foreground">
                  {usageMeters.entities.current} / {usageMeters.entities.max} ta korxona
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${(usageMeters.entities.current / usageMeters.entities.max) * 100}%` }}
                />
              </div>
            </div>

            {/* Team Members Meter */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{usageMeters.teamMembers.label}</span>
                <span className="font-mono text-muted-foreground">
                  {usageMeters.teamMembers.current} / {usageMeters.teamMembers.max} nafar xodim
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full"
                  style={{ width: `${(usageMeters.teamMembers.current / usageMeters.teamMembers.max) * 100}%` }}
                />
              </div>
            </div>

            {/* AI Tokens Meter */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-foreground">{usageMeters.aiTokens.label}</span>
                <span className="font-mono text-muted-foreground">
                  {usageMeters.aiTokens.percentage}% sarflandi
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${usageMeters.aiTokens.percentage}%` }}
                />
              </div>
            </div>

            {/* Storage Meter */}
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
        <h2 className="text-base font-bold text-foreground mb-3">Tarif Rejalarini Tanlash</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <Card
              key={p.id}
              className={`p-5 flex flex-col justify-between transition-all ${
                p.isCurrent
                  ? "border-primary ring-1 ring-primary shadow-sm bg-card"
                  : "border-border hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">{p.name}</h3>
                  {p.isCurrent && (
                    <Badge variant="indigo" className="text-[10px]">
                      Hozirgi tarif
                    </Badge>
                  )}
                </div>

                <div className="text-xl font-bold font-mono text-foreground">
                  <Money amount={p.price} />{" "}
                  <span className="text-xs font-normal text-muted-foreground font-sans">
                    / oyiga
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {p.description}
                </p>

                <div className="space-y-2 pt-3 border-t border-border text-xs">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-foreground text-[11px]">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-5 mt-4">
                {p.isCurrent ? (
                  <Button variant="outline" size="sm" className="w-full text-xs h-8" disabled>
                    Amaldagi reja
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => toast.success(`${p.name} rejasiga oʻtish soʻrovi yuborildi!`)}
                  >
                    Tarifni yangilash
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Row 3: Invoices History Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Toʻlovlar & Invoyslar Tarixi</CardTitle>
          <CardDescription>AUVRIO xizmatlari uchun chiqarilgan rasmiy toʻlov kvitansiyalari</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoys №</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead className="text-right">Summa</TableHead>
                <TableHead>Toʻlov usuli</TableHead>
                <TableHead>Holat</TableHead>
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
                    <Badge variant="success" className="text-[10px]">
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2 gap-1"
                      onClick={() => toast.success(`Invoys ${inv.id} PDF yuklab olindi`)}
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
