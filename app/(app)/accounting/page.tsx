"use client";

import React, { useState } from "react";
import { mockChartOfAccounts, mockJournalEntries } from "@/lib/mock/accounting";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { Search, Download, Plus, CheckCircle2, BookOpen, Layers, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { JournalEntry } from "@/lib/mock/types";

export default function AccountingPage() {
  const [subTab, setSubTab] = useState("coa");
  const [coaSearch, setCoaSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState("5110");

  const filteredCoa = mockChartOfAccounts.filter(
    (acc) =>
      acc.code.includes(coaSearch) ||
      acc.name.toLowerCase().includes(coaSearch.toLowerCase())
  );

  const totalDebit = mockJournalEntries.reduce((acc, curr) => acc + curr.totalDebit, 0);
  const totalCredit = mockJournalEntries.reduce((acc, curr) => acc + curr.totalCredit, 0);
  const isBalanced = totalDebit === totalCredit;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Buxgalteriya & Deterministik Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Oʻzbekiston Milliy Buxgalteriya Standartlari (BHMS) asosidagi hisoblar rejasi va provodkalar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => toast.success("Hisoblar rejasi va vedomost eksport qilindi")}
          >
            <Download className="h-3.5 w-3.5" />
            Eksport (Excel)
          </Button>
          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => toast.info("Yangi memorial provodka kiritish...")}
          >
            <Plus className="h-3.5 w-3.5" />
            Yangi provodka
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="h-9">
          <TabsTrigger value="coa" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" />
            Hisoblar rejasi (Chart of Accounts)
          </TabsTrigger>
          <TabsTrigger value="journal" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Jurnal provodkalari (Journal Entries)
          </TabsTrigger>
          <TabsTrigger value="trial" className="gap-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Oborotno-Sal'dovaya Vedomost (Trial Balance)
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1.5 text-xs">
            Bosh kitob (General Ledger)
          </TabsTrigger>
        </TabsList>

        {/* 1. Chart of Accounts Tab */}
        <TabsContent value="coa" className="space-y-3 mt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                placeholder="Schyot kodi yoki nomini qidiring (masalan: 5110)..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Jami schyotlar: {filteredCoa.length} ta
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Kod</TableHead>
                  <TableHead>Schyot Nomi</TableHead>
                  <TableHead>Kategoriya</TableHead>
                  <TableHead>Turi</TableHead>
                  <TableHead className="text-right">Joriy Saldo (soʻm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoa.map((acc) => (
                  <TableRow key={acc.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      {acc.code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {acc.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {acc.category}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {acc.type === "active" ? "Aktiv" : acc.type === "passive" ? "Passiv" : "Aktiv-Passiv"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={acc.balance} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 2. Journal Entries Tab */}
        <TabsContent value="journal" className="space-y-3 mt-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Provodka №</TableHead>
                  <TableHead className="w-24">Sana</TableHead>
                  <TableHead>Mazmuni va Tavsif</TableHead>
                  <TableHead>Manba</TableHead>
                  <TableHead className="text-right">Debet jami</TableHead>
                  <TableHead className="text-right">Kredit jami</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Kiritdi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockJournalEntries.map((je) => (
                  <TableRow
                    key={je.id}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() => setSelectedEntry(je)}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {je.entryNumber}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {je.date}
                    </TableCell>
                    <TableCell className="font-medium text-foreground max-w-[280px] truncate">
                      {je.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {je.sourceType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-foreground">
                      <Money amount={je.totalDebit} />
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-foreground">
                      <Money amount={je.totalCredit} />
                    </TableCell>
                    <TableCell>
                      <StatusPill status={je.status} />
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                      {je.createdBy}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Selected Entry Detail modal / view */}
          {selectedEntry && (
            <div className="rounded-xl border border-indigo-500/30 bg-card p-5 space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {selectedEntry.entryNumber} • {selectedEntry.date}
                  </span>
                  <h3 className="text-sm font-bold text-foreground mt-0.5">
                    {selectedEntry.description}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEntry(null)}
                  className="h-7 text-xs"
                >
                  Yopish
                </Button>
              </div>

              <div className="text-xs">
                <span className="font-semibold text-muted-foreground mb-2 block">
                  Debet / Kredit chiziqlari (Double-entry lines):
                </span>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Schyot kodi</TableHead>
                      <TableHead>Schyot nomi</TableHead>
                      <TableHead className="text-right">Debet</TableHead>
                      <TableHead className="text-right">Kredit</TableHead>
                      <TableHead>Izoh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntry.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {l.accountCode}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{l.accountName}</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {l.debit > 0 ? <Money amount={l.debit} /> : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {l.credit > 0 ? <Money amount={l.credit} /> : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">{l.memo || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 3. Trial Balance Tab */}
        <TabsContent value="trial" className="space-y-4 mt-4">
          <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Buxgalteriya balansi teng: Debet = Kredit (BHMS Qoidasi)</span>
            </div>
            <div className="flex items-center gap-4 font-mono font-bold">
              <span>Debet: 282,440,000 soʻm</span>
              <span>Kredit: 282,440,000 soʻm</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Kod</TableHead>
                  <TableHead>Schyot Nomi</TableHead>
                  <TableHead className="text-right">Dastlabki Saldo</TableHead>
                  <TableHead className="text-right">Debet Aylanmasi</TableHead>
                  <TableHead className="text-right">Kredit Aylanmasi</TableHead>
                  <TableHead className="text-right">Oxirgi Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockChartOfAccounts.slice(0, 10).map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {acc.code}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{acc.name}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      <Money amount={acc.balance * 0.9} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      <Money amount={acc.balance * 0.2} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                      <Money amount={acc.balance * 0.1} />
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-foreground">
                      <Money amount={acc.balance} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 4. General Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Schyotni tanlang:</span>
            <select
              value={selectedLedgerAccount}
              onChange={(e) => setSelectedLedgerAccount(e.target.value)}
              className="h-8 rounded-lg border border-input bg-card px-3 text-xs font-medium font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="5110">5110 — Hisob-kitob schyoti (Bank UZS)</option>
              <option value="4010">4010 — Xaridorlar bilan hisoblashuvlar</option>
              <option value="6010">6010 — Mol yetkazib beruvchilarga qarzlar</option>
              <option value="6410">6410 — Budjetga toʻlovlar (QQS)</option>
              <option value="1010">1010 — Xomashyo va materiallar</option>
            </select>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sana</TableHead>
                  <TableHead>Hujjat / Operatsiya</TableHead>
                  <TableHead>Korrespondent Schyot</TableHead>
                  <TableHead className="text-right">Debet</TableHead>
                  <TableHead className="text-right">Kredit</TableHead>
                  <TableHead className="text-right">Qoldiq Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">2026-11-14</TableCell>
                  <TableCell className="font-medium text-foreground">Anglesey Food E-SF №189 tushumi</TableCell>
                  <TableCell className="font-mono text-primary font-bold">4010</TableCell>
                  <TableCell className="text-right text-emerald-600 font-mono font-medium">142,500,000 soʻm</TableCell>
                  <TableCell className="text-right font-mono">—</TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">1,157,650,000 soʻm</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">2026-11-14</TableCell>
                  <TableCell className="font-medium text-foreground">Oʻzbektelekom internet toʻlovi</TableCell>
                  <TableCell className="font-mono text-primary font-bold">6010</TableCell>
                  <TableCell className="text-right font-mono">—</TableCell>
                  <TableCell className="text-right text-indigo-600 font-mono font-medium">3,840,000 soʻm</TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">1,015,150,000 soʻm</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">2026-11-12</TableCell>
                  <TableCell className="font-medium text-foreground">E-Ijara ofis ijarasi toʻlovi</TableCell>
                  <TableCell className="font-mono text-primary font-bold">9420</TableCell>
                  <TableCell className="text-right font-mono">—</TableCell>
                  <TableCell className="text-right text-indigo-600 font-mono font-medium">22,000,000 soʻm</TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">1,018,990,000 soʻm</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
