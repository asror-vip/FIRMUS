"use client";

import React, { useState } from "react";
import { mockTransactions } from "@/lib/mock/transactions";
import { Transaction } from "@/lib/mock/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Filter,
  Download,
  Plus,
  Sparkles,
  X,
  CheckCircle2,
  FileText,
  Building,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAppState } from "@/lib/mock/store";

export default function TransactionsPage() {
  const { currentEntity, currentRole } = useAppState();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter transactions
  const filtered = mockTransactions.filter((tx) => {
    // Tab filter
    if (activeTab === "income" && tx.type !== "income") return false;
    if (activeTab === "expense" && tx.type !== "expense") return false;
    if (activeTab === "pending" && tx.status !== "pending") return false;
    if (activeTab === "exception" && tx.status !== "exception") return false;

    // Search query
    if (search) {
      const q = search.toLowerCase();
      const matchName = tx.counterparty.toLowerCase().includes(q);
      const matchDesc = tx.description.toLowerCase().includes(q);
      const matchAmount = tx.amount.toString().includes(q);
      if (!matchName && !matchDesc && !matchAmount) return false;
    }

    return true;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filtered.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const isAllSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Tranzaksiyalar va Bank Tushumlari
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bank, Didox va 1C orqali kelgan barcha moliyaviy operatsiyalar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => toast.success("Tranzaksiyalar Excel (XLSX) formatida eksport qilindi")}
          >
            <Download className="h-3.5 w-3.5" />
            Eksport
          </Button>

          {currentRole !== "viewer" && currentRole !== "auditor" && (
            <Button
              size="sm"
              className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => toast.info("Qoʻlda tranzaksiya kiritish oynasi...")}
            >
              <Plus className="h-3.5 w-3.5" />
              Yangi kiritish
            </Button>
          )}
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value="all">Barchasi ({mockTransactions.length})</TabsTrigger>
            <TabsTrigger value="income">Kirim</TabsTrigger>
            <TabsTrigger value="expense">Chiqim</TabsTrigger>
            <TabsTrigger value="pending">Kutilmoqda</TabsTrigger>
            <TabsTrigger value="exception">Istisnolar</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kontragent, izoh yoki summa..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5 mr-1" />
            Filtr
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar (when selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2.5 text-xs">
          <span className="font-medium text-foreground">
            {selectedIds.length} ta tranzaksiya tanlandi
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="success"
              className="h-7 px-3 text-xs"
              onClick={() => {
                toast.success(`${selectedIds.length} ta tranzaksiya tasdiqlandi va 1C ga oʻtkazildi`);
                setSelectedIds([]);
              }}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Barchasini tasdiqlash
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedIds([])}
            >
              Bekor qilish
            </Button>
          </div>
        </div>
      )}

      {/* Transactions Data Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
              </TableHead>
              <TableHead>Sana</TableHead>
              <TableHead>Kontragent</TableHead>
              <TableHead>Tavsif / Mazmun</TableHead>
              <TableHead className="text-right">Summa (soʻm)</TableHead>
              <TableHead>Manba</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead>Bogʻlangan E-SF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((tx) => (
              <TableRow
                key={tx.id}
                className="cursor-pointer hover:bg-muted/60 transition-colors"
                onClick={() => setSelectedTx(tx)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(tx.id)}
                    onCheckedChange={(checked) => handleSelectOne(tx.id, !!checked)}
                  />
                </TableCell>
                <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                  {tx.date}
                </TableCell>
                <TableCell className="font-medium text-foreground max-w-[200px] truncate">
                  {tx.counterparty}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[260px] truncate">
                  {tx.description}
                </TableCell>
                <TableCell className="text-right">
                  <Money amount={tx.amount} type={tx.type} />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {tx.source}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusPill status={tx.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tx.matchedDocumentName ? (
                    <span className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      <FileText className="h-3 w-3" />
                      {tx.matchedDocumentName}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Slide-over Detail Panel */}
      {selectedTx && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[500px] flex-col border-l border-border bg-card shadow-2xl p-6 duration-200 animate-in slide-in-from-right overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Tranzaksiya ID: {selectedTx.id}
              </span>
              <h2 className="text-base font-bold text-foreground mt-0.5">
                {selectedTx.counterparty}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setSelectedTx(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="py-5 space-y-5 text-xs">
            {/* Amount Box */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between">
              <div>
                <span className="text-muted-foreground text-[11px]">Tranzaksiya summasi:</span>
                <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                  <Money amount={selectedTx.amount} type={selectedTx.type} />
                </div>
              </div>
              <StatusPill status={selectedTx.status} />
            </div>

            {/* Details List */}
            <div className="space-y-2.5">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Sana:</span>
                <span className="font-medium text-foreground">{selectedTx.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">STIR:</span>
                <span className="font-mono text-foreground">{selectedTx.counterpartyStir || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Tizimdagi manba:</span>
                <Badge variant="outline" className="uppercase font-mono text-[10px]">
                  {selectedTx.source}
                </Badge>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Bogʻlangan hisob (Schet):</span>
                <span className="font-mono font-medium text-foreground">
                  {selectedTx.accountCode ? `${selectedTx.accountCode} (${selectedTx.accountName})` : "—"}
                </span>
              </div>
            </div>

            {/* AI Explanation / Suggestion Card */}
            {selectedTx.aiExplanation && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Xulosasi va Solishtirish</span>
                  {selectedTx.aiConfidence && (
                    <Badge variant="indigo" className="ml-auto text-[9px] px-1 py-0 h-4">
                      {selectedTx.aiConfidence}% ishonch
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-foreground leading-relaxed">
                  {selectedTx.aiExplanation}
                </p>
              </div>
            )}

            {/* Linked Document Card */}
            {selectedTx.matchedDocumentName && (
              <div className="rounded-xl border border-border p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{selectedTx.matchedDocumentName}</p>
                    <p className="text-[10px] text-muted-foreground">Didox E-SF elektron hujjati</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Ochish <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 flex items-center gap-2">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                onClick={() => {
                  toast.success("Tranzaksiya muvaffaqiyatli tasdiqlandi va 1C ga provodka qilindi!");
                  setSelectedTx(null);
                }}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Tasdiqlash
              </Button>
              <Button
                variant="outline"
                className="h-9"
                onClick={() => {
                  toast.info("Storno yoki istisnoga jo'natildi");
                  setSelectedTx(null);
                }}
              >
                Istisnoga olish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
