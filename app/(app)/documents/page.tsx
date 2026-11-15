"use client";

import React, { useState, useEffect } from "react";
import { mockDocuments } from "@/lib/mock/documents";
import { DocumentItem } from "@/lib/mock/types";
import { fetchDocuments, createDocument, signDocumentWithEImzo } from "@/lib/services/supabase-service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAppState } from "@/lib/mock/store";

export default function DocumentsPage() {
  const { currentEntity } = useAppState();
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentItem[]>(mockDocuments);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [newDoc, setNewDoc] = useState({
    number: `SF-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
    type: "invoice",
    counterparty: "",
    counterpartyStir: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    contractNumber: "",
  });

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchDocuments(currentEntity?.id)
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          const mapped: DocumentItem[] = data.map((d: any) => ({
            id: d.id,
            entityId: d.entityId || currentEntity?.id,
            number: d.documentNumber,
            type: d.type,
            title: `${d.type === "invoice" ? "Elektron hisob-faktura" : d.type === "act" ? "Bajarilgan ishlar dalolatnomasi" : "Shartnoma"} №${d.documentNumber}`,
            counterparty: d.counterparty,
            counterpartyStir: d.counterpartyStir || "309112233",
            amount: d.amount,
            date: d.date,
            status: d.status,
            format: "pdf",
            fileSize: "1.4 MB",
            signedByLocal: d.eImzoSigned ? "Imzolangan (E-IMZO)" : undefined,
            signedByPartner: "Tasdiqlangan",
            aiExtractedData: {
              vatAmount: d.vatAmount,
              itemsCount: 3,
            },
          }));
          setDocuments(mapped);
        }
      })
      .catch((err) => console.error("Error loading documents:", err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentEntity?.id]);

  const handleSyncDidox = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDocuments(currentEntity?.id);
      if (data && data.length > 0) {
        const mapped: DocumentItem[] = data.map((d: any) => ({
          id: d.id,
          entityId: d.entityId || currentEntity?.id,
          number: d.documentNumber,
          type: d.type,
          title: `${d.type === "invoice" ? "Elektron hisob-faktura" : d.type === "act" ? "Bajarilgan ishlar dalolatnomasi" : "Shartnoma"} №${d.documentNumber}`,
          counterparty: d.counterparty,
          counterpartyStir: d.counterpartyStir || "309112233",
          amount: d.amount,
          date: d.date,
          status: d.status,
          format: "pdf",
          fileSize: "1.4 MB",
          signedByLocal: d.eImzoSigned ? "Imzolangan (E-IMZO)" : undefined,
          signedByPartner: "Tasdiqlangan",
          aiExtractedData: {
            vatAmount: d.vatAmount,
            itemsCount: 3,
          },
        }));
        setDocuments(mapped);
      }
      toast.success("Didox EDO tizimidan barcha elektron hujjatlar yangilandi!");
    } catch (err: any) {
      toast.error("Didox sinxronizatsiya xatosi: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignDocument = async (docId: string) => {
    try {
      await signDocumentWithEImzo(docId);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, status: "signed", signedByLocal: "Imzolangan (E-IMZO Oʻzbekiston)" }
            : d
        )
      );
      if (selectedDoc && selectedDoc.id === docId) {
        setSelectedDoc((prev) =>
          prev
            ? { ...prev, status: "signed", signedByLocal: "Imzolangan (E-IMZO Oʻzbekiston)" }
            : null
        );
      }
      toast.success("Hujjat E-IMZO elektron raqamli imzosi bilan muvaffaqiyatli tasdiqlandi!");
    } catch (err: any) {
      toast.error("Imzolashda xatolik yuz berdi: " + err.message);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.counterparty || !newDoc.amount || !newDoc.number) {
      toast.error("Iltimos, hujjat raqami, kontragent va summani kiriting");
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createDocument({
        entityId: currentEntity?.id,
        documentNumber: newDoc.number,
        type: newDoc.type,
        counterparty: newDoc.counterparty,
        counterpartyStir: newDoc.counterpartyStir || undefined,
        amount: Number(newDoc.amount),
        date: newDoc.date,
        contractNumber: newDoc.contractNumber || undefined,
      });

      const newDocItem: DocumentItem = {
        id: created.id,
        entityId: created.entityId || currentEntity?.id,
        number: created.documentNumber,
        type: created.type as any,
        title: `${created.type === "invoice" ? "Elektron hisob-faktura" : created.type === "act" ? "Bajarilgan ishlar dalolatnomasi" : "Shartnoma"} №${created.documentNumber}`,
        counterparty: created.counterparty,
        counterpartyStir: created.counterpartyStir || "309112233",
        amount: created.amount,
        date: created.date,
        status: created.status as any,
        format: "pdf",
        fileSize: "1.2 MB",
        signedByPartner: "Kutilmoqda",
        aiExtractedData: {
          vatAmount: created.vatAmount,
          itemsCount: 1,
        },
      };

      setDocuments((prev) => [newDocItem, ...prev]);
      toast.success("Hujjat Didox va Supabase tizimiga muvaffaqiyatli yuklandi!");
      setIsUploadOpen(false);
      setNewDoc({
        number: `SF-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
        type: "invoice",
        counterparty: "",
        counterpartyStir: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        contractNumber: "",
      });
    } catch (err: any) {
      toast.error("Hujjat yaratishda xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
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
            {t.pages.documents.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.documents.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleSyncDidox}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {t.pages.documents.syncDidox}
          </Button>

          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            {t.pages.documents.uploadDoc}
          </Button>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "invoice", "act", "contract"].map((typeKey) => (
            <Button
              key={typeKey}
              variant={selectedType === typeKey ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(typeKey)}
              className="text-xs h-8 capitalize"
            >
              {typeKey === "all"
                ? t.pages.documents.tabs.all
                : typeKey === "invoice"
                ? t.pages.documents.tabs.invoices
                : typeKey === "act"
                ? t.pages.documents.tabs.acts
                : t.pages.documents.tabs.contracts}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.common.search}
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
                <TableHead>№</TableHead>
                <TableHead>{t.common.description}</TableHead>
                <TableHead>{t.common.counterparty}</TableHead>
                <TableHead className="text-right">{t.common.amount}</TableHead>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>{t.common.status}</TableHead>
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
                  PDF {t.common.export}
                </Button>
              </div>
            </div>

            {/* AI Extracted Data Card */}
            {selectedDoc.aiExtractedData && (
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t.dashboard.aiRecommendationTitle}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-muted-foreground">{t.pages.tax.vatPayable}:</span>
                    <p className="font-mono font-semibold text-foreground">
                      <Money amount={selectedDoc.aiExtractedData.vatAmount || 0} />
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.pages.inventory.totalItems}:</span>
                    <p className="font-mono font-semibold text-foreground">
                      {selectedDoc.aiExtractedData.itemsCount || 1}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures Status Box */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <span className="font-semibold text-foreground text-xs block">
                E-IMZO:
              </span>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">Entity:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {selectedDoc.signedByLocal || t.statuses.signed}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">{t.common.counterparty}:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {selectedDoc.signedByPartner || t.statuses.posted}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center gap-2">
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-9"
                onClick={() => handleSignDocument(selectedDoc.id)}
                disabled={selectedDoc.status === "signed"}
              >
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                {selectedDoc.status === "signed" ? "E-IMZO bilan imzolangan" : `E-IMZO ${t.statuses.signed}`}
              </Button>
              <Button
                variant="outline"
                className="h-9"
                onClick={() => {
                  toast.info(t.common.reject);
                  setSelectedDoc(null);
                }}
              >
                {t.common.reject}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Create Document Modal */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {t.pages.documents.uploadDoc} (Didox EDO)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Yangi elektron hujjatni (E-SF, dalolatnoma, shartnoma) tizimga kiritish va bazaga saqlash.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDocument} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Hujjat turi *</Label>
                <select
                  value={newDoc.type}
                  onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                  className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
                >
                  <option value="invoice">Elektron hisob-faktura (E-SF)</option>
                  <option value="act">Bajarilgan ishlar dalolatnomasi</option>
                  <option value="contract">Shartnoma / Bitim</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Hujjat raqami *</Label>
                <Input
                  value={newDoc.number}
                  onChange={(e) => setNewDoc({ ...newDoc, number: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Kontragent nomi *</Label>
                <Input
                  placeholder="OOO / MChJ..."
                  value={newDoc.counterparty}
                  onChange={(e) => setNewDoc({ ...newDoc, counterparty: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Kontragent STIR (9 ta)</Label>
                <Input
                  placeholder="309887766"
                  maxLength={9}
                  value={newDoc.counterpartyStir}
                  onChange={(e) => setNewDoc({ ...newDoc, counterpartyStir: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Summa (UZS) *</Label>
                <Input
                  type="number"
                  placeholder="Masalan: 8500000"
                  value={newDoc.amount}
                  onChange={(e) => setNewDoc({ ...newDoc, amount: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Hujjat sanasi *</Label>
                <Input
                  type="date"
                  value={newDoc.date}
                  onChange={(e) => setNewDoc({ ...newDoc, date: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-medium text-foreground">Bogʻlangan shartnoma raqami</Label>
              <Input
                placeholder="SH-2026/012 (ixtiyoriy)"
                value={newDoc.contractNumber}
                onChange={(e) => setNewDoc({ ...newDoc, contractNumber: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsUploadOpen(false)}
                disabled={isSubmitting}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Yuklanmoqda..." : "Didox bazasiga yuklash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
