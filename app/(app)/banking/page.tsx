"use client";

import React, { useState } from "react";
import { mockBankAccounts } from "@/lib/mock/banking";
import { mockTransactions } from "@/lib/mock/transactions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import {
  Landmark,
  Plus,
  Upload,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function BankingPage() {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const bankTransactions = mockTransactions.filter((tx) => tx.source === "bank");

  const handleSyncAll = () => {
    setIsSyncing(true);
    toast.info("Bank API orqali yangi ko'chirmalar so'ralmoqda...");
    setTimeout(() => {
      setIsSyncing(false);
      toast.success("Barcha 3 ta bank hisoblari yangilandi! Yangi 4 ta operatsiya yuklandi.");
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Bank Hisoblari & Koʻchirmalar
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Oʻzbekiston tijorat banklari bilan toʻgʻridan-toʻgʻri Open Banking integratsiyasi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            CSV / 1C Koʻchirma yuklash
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleSyncAll}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-primary" : ""}`} />
            Sinxronlash
          </Button>

          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setIsConnectModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Yangi bank ulash
          </Button>
        </div>
      </div>

      {/* Row 1: Bank Accounts Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockBankAccounts.map((account) => (
          <Card key={account.id} className="relative overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  {account.bankLogoText}
                </div>
                <div>
                  <CardTitle className="text-xs font-semibold">{account.bankName}</CardTitle>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    MFO: {account.mfo} • {account.accountNumber}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <span className="text-[11px] text-muted-foreground">Joriy qoldiq:</span>
                <div className="text-xl font-bold font-mono text-foreground mt-0.5">
                  <Money
                    amount={account.balance}
                    currency={account.currency === "USD" ? "$" : "soʻm"}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  API ulangan
                </span>
                <span>{account.lastSyncedAt}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Reconciliation Status Widget */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Bank va Buxgalteriya Solishtiruvi (Reconciliation): 98.4%
              </h3>
              <Badge variant="success" className="text-[10px] px-1.5 py-0 h-4">
                Normada
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              1,240 ta bank oʻtkazmasidan 1,220 tasi Didox elektron hisob-fakturalari bilan 100% mos keldi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => toast.info("Solishtiruv hisoboti tayyorlanmoqda...")}
          >
            Solishtiruv akti (PDF)
          </Button>
        </div>
      </div>

      {/* Row 3: Bank Transactions Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Soʻnggi Bank Koʻchirmalari (Bank Statement Feed)
          </CardTitle>
          <CardDescription>
            Kapitalbank va Asakabank hisoblaridan kelgan real tranzaksiyalar
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sana</TableHead>
                <TableHead>Kontragent va Tavsif</TableHead>
                <TableHead>Yoʻnalish</TableHead>
                <TableHead className="text-right">Summa</TableHead>
                <TableHead>Buxgalteriya Holati</TableHead>
                <TableHead className="text-right">Harakat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {tx.date}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <div className="font-medium text-foreground truncate">{tx.counterparty}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{tx.description}</div>
                  </TableCell>
                  <TableCell>
                    {tx.type === "income" ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <ArrowDownLeft className="h-3 w-3" />
                        Kirim
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        <ArrowUpRight className="h-3 w-3" />
                        Chiqim
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    <Money amount={tx.amount} type={tx.type} />
                  </TableCell>
                  <TableCell>
                    <StatusPill status={tx.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2.5"
                      onClick={() => toast.info(`Tranzaksiya №${tx.id} tafsilotlari`)}
                    >
                      Batafsil
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Connect Bank Modal Mock */}
      <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi Tijorat Bankini Ulash</DialogTitle>
            <DialogDescription>
              Oʻzbekiston Markaziy Banki Open Banking xavfsiz standarti orqali toʻgʻridan-toʻgʻri ulanish.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3 text-xs">
            <p className="font-medium text-foreground">Qoʻllab-quvvatlanadigan banklar:</p>
            <div className="grid grid-cols-2 gap-2">
              {["Kapitalbank", "Ipoteka-bank", "Asakabank", "Hamkorbank", "Anorbank", "Oʻzsanoatqurilishbank"].map((b, i) => (
                <div
                  key={i}
                  onClick={() => {
                    toast.success(`${b} bilan xavfsiz ulanish shlyuziga yo'naltirilmoqda...`);
                    setIsConnectModalOpen(false);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:border-primary hover:bg-accent cursor-pointer transition-all"
                >
                  <Landmark className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium text-foreground">{b}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsConnectModalOpen(false)}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Modal Mock */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bank Koʻchirmasini Fayldan Yuklash</DialogTitle>
            <DialogDescription>
              1C formatidagi kliring fayli (.txt), Excel (.xlsx) yoki CSV koʻchirmalarini yuklang.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-dashed border-border p-6 text-center my-3">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-xs font-semibold text-foreground">Faylni bu yerga sudrab olib keling</p>
            <p className="text-[10px] text-muted-foreground mt-1">yoki kompyuterdan tanlang (.txt, .xlsx, .csv)</p>
          </div>
          <DialogFooter>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              onClick={() => {
                toast.success("Koʻchirma muvaffaqiyatli yuklandi va AI orqali tasniflandi!");
                setIsImportModalOpen(false);
              }}
            >
              Yuklash va Tasniflash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
