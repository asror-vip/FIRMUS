"use client";

import React, { useState } from "react";
import { mockDocuments } from "@/lib/mock/documents";
import { DocumentItem } from "@/lib/mock/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import {
  FileText,
  Upload,
  Search,
  Filter,
  Grid,
  List,
  Sparkles,
  Download,
  X,
  FileCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function DocumentsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filteredDocs = mockDocuments.filter((doc) => {
    if (selectedType !== "all" && doc.type !== selectedType) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchCounterparty = doc.counterparty.toLowerCase().includes(q);
      const matchNumber = doc.number.toLowerCase().includes(q);
      if (!matchTitle && !matchCounterparty && !matchNumber) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Didox Elektron Hujjatlari & Birlamchi Hujjatlar
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hisob-fakturalar (E-SF), dalolatnomalar (Akt), shartnomalar va ishonchnomalar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => toast.success("Didox serveridan yangi hujjatlar tekshirildi (14 ta yangi)")}
          >
            Didox Sinxronlash
          </Button>

          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            Hujjat yuklash (E-IMZO)
          </Button>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "invoice", "act", "contract", "power_of_attorney"].map((t) => (
            <Button
              key={t}
              variant={selectedType === t ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(t)}
              className="text-xs h-8 capitalize"
            >
              {t === "all"
                ? "Barchasi"
                : t === "invoice"
                ? "Hisob-faktura"
                : t === "act"
                ? "Dalolatnoma"
                : t === "contract"
                ? "Shartnoma"
                : "Ishonchnoma"}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Raqam, kontragent..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded ${viewMode === "list" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded ${viewMode === "grid" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"}`}
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Documents List View */}
      {viewMode === "list" ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hujjat raqami</TableHead>
                <TableHead>Nomi & Mazmuni</TableHead>
                <TableHead>Kontragent</TableHead>
                <TableHead className="text-right">Summa</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Format</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="cursor-pointer hover:bg-muted/60"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    {doc.number}
                  </TableCell>
                  <TableCell className="font-medium text-foreground max-w-[240px] truncate">
                    {doc.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {doc.counterparty}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {doc.amount > 0 ? <Money amount={doc.amount} /> : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {doc.date}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={doc.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {doc.format}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <FileText className="h-5 w-5" />
                </div>
                <StatusPill status={doc.status} />
              </div>

              <div>
                <span className="font-mono text-[11px] font-semibold text-primary">
                  {doc.number}
                </span>
                <h3 className="font-medium text-xs text-foreground line-clamp-1 mt-0.5">
                  {doc.title}
                </h3>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {doc.counterparty}
                </p>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-foreground">
                  {doc.amount > 0 ? <Money amount={doc.amount} /> : "0 soʻm"}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {doc.date}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Document Detail Slide-over Panel */}
      {selectedDoc && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[540px] flex-col border-l border-border bg-card shadow-2xl p-6 duration-200 animate-in slide-in-from-right overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Didox EDO • {selectedDoc.number}
              </span>
              <h2 className="text-base font-bold text-foreground mt-0.5">
                {selectedDoc.title}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setSelectedDoc(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="py-5 space-y-5 text-xs">
            {/* Visual Preview Placeholder */}
            <div className="rounded-xl border border-border bg-muted/40 p-6 text-center space-y-2">
              <FileCheck className="h-10 w-10 text-indigo-600 mx-auto" />
              <p className="font-semibold text-foreground text-xs">{selectedDoc.number}.pdf</p>
              <p className="text-[10px] text-muted-foreground">Didox E-SF elektron nusxasi ({selectedDoc.fileSize})</p>
              <div className="pt-2">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <Download className="h-3 w-3" />
                  PDF yuklab olish
                </Button>
              </div>
            </div>

            {/* AI Extracted Data Card */}
            {selectedDoc.aiExtractedData && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Ekstraktsiya Natijalari (GPT-6 Luna)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-muted-foreground">QQS summasi (12%):</span>
                    <p className="font-mono font-semibold text-foreground">
                      <Money amount={selectedDoc.aiExtractedData.vatAmount || 0} />
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tovar pozitsiyalari:</span>
                    <p className="font-mono font-semibold text-foreground">
                      {selectedDoc.aiExtractedData.itemsCount || 1} ta tovar
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures Status Box */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <span className="font-semibold text-foreground text-xs block">
                E-IMZO Elektron Raqamli Imzolar:
              </span>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Biz tomondan (Mijoz):</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {selectedDoc.signedByLocal || "Imzolangan"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Hamkor tomondan:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {selectedDoc.signedByPartner || "Tasdiqlangan"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center gap-2">
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-9"
                onClick={() => {
                  toast.success("E-IMZO orqali imzolandi va Didox'ga jo'natildi!");
                  setSelectedDoc(null);
                }}
              >
                E-IMZO bilan imzolash
              </Button>
              <Button
                variant="outline"
                className="h-9"
                onClick={() => {
                  toast.info("Tuzatish so'rovi yuborildi");
                  setSelectedDoc(null);
                }}
              >
                Rad etish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal Mock */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi Hujjat Yuklash</DialogTitle>
            <DialogDescription>
              Hisob-faktura (PDF, XML) yoki shartnomani yuklang. AI rekvizitlarni avtomatik aniqlaydi.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-dashed border-border p-8 text-center my-3">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-xs font-semibold text-foreground">Faylni tanlang yoki shu yerga tashlang</p>
            <p className="text-[10px] text-muted-foreground mt-1">PDF, XML, DOCX, XLSX (20 MB gacha)</p>
          </div>
          <DialogFooter>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              onClick={() => {
                toast.success("Hujjat yuklandi va AI orqali rekvizitlar aniqlandi!");
                setIsUploadOpen(false);
              }}
            >
              Yuklash va Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
