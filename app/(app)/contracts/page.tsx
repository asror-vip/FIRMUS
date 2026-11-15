"use client";

import React, { useState } from "react";
import { mockContracts } from "@/lib/mock/contracts";
import { ContractItem } from "@/lib/mock/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { FileCheck, Search, Plus, Download, X, Clock, Calendar, Building, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function ContractsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);

  const filteredContracts = mockContracts.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.counterparty.toLowerCase().includes(search.toLowerCase()) ||
      c.number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.contracts.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.contracts.subtitle}
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
            {t.common.export}
          </Button>

          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => toast.info(t.pages.contracts.addContract)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t.pages.contracts.addContract}
          </Button>
        </div>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{t.pages.contracts.title}</CardTitle>
            <CardDescription>{t.pages.contracts.subtitle}</CardDescription>
          </div>
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.common.search}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>{t.common.description}</TableHead>
                <TableHead>{t.common.counterparty}</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">{t.common.amount}</TableHead>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.common.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((cnt) => (
                <TableRow
                  key={cnt.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedContract(cnt)}
                >
                  <TableCell className="font-mono text-xs font-bold text-primary">
                    {cnt.number}
                  </TableCell>
                  <TableCell className="font-medium text-foreground max-w-[260px] truncate">
                    {cnt.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[180px] truncate">
                    {cnt.counterparty}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {cnt.type}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">
                    <Money amount={cnt.amount} />
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {cnt.startDate} — {cnt.endDate}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={cnt.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contract Detail Slide-over */}
      {selectedContract && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[500px] flex-col border-l border-border bg-card shadow-2xl p-6 duration-200 animate-in slide-in-from-right overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                № {selectedContract.number}
              </span>
              <h2 className="text-base font-bold text-foreground mt-0.5">
                {selectedContract.counterparty}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setSelectedContract(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="py-5 space-y-5 text-xs">
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
              <span className="text-muted-foreground text-[11px]">{t.common.amount}:</span>
              <div className="text-xl font-bold font-mono text-foreground">
                <Money amount={selectedContract.amount} />
              </div>
              <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                {selectedContract.title}
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">{t.entity.tin}:</span>
                <span className="font-mono text-foreground">{selectedContract.counterpartyStir}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium text-foreground">{selectedContract.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Start:</span>
                <span className="font-mono text-foreground">{selectedContract.startDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">End:</span>
                <span className="font-mono text-foreground">{selectedContract.endDate}</span>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
              <span className="font-semibold text-foreground text-xs block">
                Didox E-IMZO Holati:
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Ushbu shartnoma Didox EDO orqali ikkala tomon E-IMZO kalitlari bilan tasdiqlangan va yuridik kuchga ega.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1 h-9 text-xs"
                onClick={() => toast.success("Shartnoma nusxasi ochilmoqda...")}
              >
                Hujjatni koʻrish (PDF)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
