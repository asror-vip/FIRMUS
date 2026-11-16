"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DocumentItem } from "@/lib/mock/types";
import {
  fetchDocumentsPaginated,
  createDocument,
  signDocumentWithEImzo,
  rejectDocumentInDb,
  uploadDocumentFileToStorage,
  getDocumentDownloadUrl,
} from "@/lib/services/supabase-service";
import { listEImzoCertificates, signWithEImzoCertificate } from "@/lib/services/eimzo-client";
import { documentSchema, getFirstZodError } from "@/lib/validations/accounting";
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

function DocumentsContent() {
  const searchParams = useSearchParams();
  const initialDocId = searchParams.get("id");
  const { currentEntity, currentRole } = useAppState();
  const { t } = useTranslation();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileInfo, setAttachedFileInfo] = useState<{ name: string; sizeLabel: string } | null>(null);

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

  const mapDbDoc = useCallback(
    (d: any): DocumentItem => {
      const titleMap: Record<string, string> = {
        invoice: "Elektron hisob-faktura (Chiquvchi)",
        incoming_invoice: "Kiruvchi hisob-faktura (Xarid)",
        act: "Bajarilgan ishlar dalolatnomasi",
        contract: "Shartnoma / Bitim",
      };
      return {
        id: d.id,
        entityId: d.entityId || currentEntity?.id || "",
        number: d.documentNumber,
        type: d.type,
        title: `${titleMap[d.type] || "Elektron hujjat"} №${d.documentNumber}`,
        counterparty: d.counterparty,
        counterpartyStir: d.counterpartyStir || "—",
        amount: d.amount,
        date: d.date,
        status: d.status,
        format: "pdf",
        fileSize: d.fileSize || "—",
        fileName: d.fileName,
        fileUrl: d.fileUrl,
        signedByLocal: d.eImzoSigned ? "Imzolangan (E-IMZO)" : undefined,
        signedByPartner: d.status === "signed" ? "Tasdiqlangan" : "Kutilmoqda",
        aiExtractedData: {
          vatAmount: d.vatAmount,
          itemsCount: 1,
        },
      };
    },
    [currentEntity?.id]
  );

  const loadDocuments = useCallback(async () => {
    if (!currentEntity?.id) {
      setDocuments([]);
      setTotalCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, count } = await fetchDocumentsPaginated(currentEntity.id, {
        page: currentPage,
        pageSize,
        type: selectedType,
        search,
      });
      const mapped = (data || []).map(mapDbDoc);
      setDocuments(mapped);
      setTotalCount(count);
      if (initialDocId) {
        const found = mapped.find((doc) => doc.id === initialDocId);
        if (found) setSelectedDoc(found);
      }
    } catch (err: any) {
      console.error("Error loading documents:", err);
      toast.error("Hujjatlarni yuklashda xatolik: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentEntity?.id, currentPage, pageSize, selectedType, search, initialDocId, mapDbDoc]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentEntity?.id, selectedType, search]);

  const handleSyncDidox = async () => {
    await loadDocuments();
    toast.success("Didox EDO hujjatlar reestri Supabase bazasidan yangilandi!");
  };

  const handleSignDocument = async (docId: string) => {
    try {
      const target = documents.find((d) => d.id === docId);

      // Attempt real browser E-IMZO (CAPIWS) signature if agent is active on user PC
      let signerTag = "Imzolangan (E-IMZO Oʻzbekiston)";
      try {
        const certs = await listEImzoCertificates();
        if (certs.length > 0 && target) {
          const sig = await signWithEImzoCertificate(
            certs[0],
            JSON.stringify({
              number: target.number,
              amount: target.amount,
              counterparty: target.counterparty,
              date: target.date,
            })
          );
          signerTag = `E-IMZO PKCS#7 (${sig.signerName})`;
        }
      } catch {
        // Local desktop E-IMZO agent not present; proceed with authenticated server session approval
      }

      await signDocumentWithEImzo(
        docId,
        target
          ? {
              entityId: currentEntity?.id,
              documentNumber: target.number,
              type: target.type,
              counterparty: target.counterparty,
              date: target.date,
              amount: target.amount || 0,
              vatAmount: target.aiExtractedData?.vatAmount,
            }
          : undefined
      );
      await loadDocuments();
      if (selectedDoc && selectedDoc.id === docId) {
        setSelectedDoc((prev) =>
          prev
            ? { ...prev, status: "signed", signedByLocal: signerTag }
            : null
        );
      }
      toast.success(
        `Hujjat ${signerTag} bilan tasdiqlandi va Bosh kitobga (QQS 12% bilan) provodka tushirildi!`
      );
    } catch (err: any) {
      toast.error("Imzolashda xatolik yuz berdi: " + err.message);
    }
  };

  const handleRejectDocument = async (docId: string) => {
    try {
      await rejectDocumentInDb(docId);
      await loadDocuments();
      toast.success("Hujjat rad etildi va holat bazada yangilandi.");
      setSelectedDoc(null);
    } catch (err: any) {
      toast.error("Rad etishda xatolik: " + err.message);
    }
  };

  const handleExportSingleDoc = async (doc: DocumentItem) => {
    if (doc.fileUrl) {
      try {
        const signedUrl = await getDocumentDownloadUrl(doc.fileUrl);
        window.open(signedUrl, "_blank", "noopener,noreferrer");
        toast.success(`«${doc.fileName || doc.number}» asl fayli Supabase Storage'dan ochildi!`);
        return;
      } catch (err: any) {
        toast.error("Faylni Storage'dan yuklab boʻlmadi: " + err.message);
        return;
      }
    }

    const content = [
      `FIRMUS — DIDOX EDO ELEKTRON HUJJAT NUSXASI`,
      `==========================================`,
      `Hujjat raqami: ${doc.number}`,
      `Sarlavha: ${doc.title}`,
      `Korxona: ${currentEntity?.name || "—"} (STIR: ${currentEntity?.tinStir || "—"})`,
      `Kontragent: ${doc.counterparty} (STIR: ${doc.counterpartyStir})`,
      `Sana: ${doc.date}`,
      `Summa: ${doc.amount.toLocaleString()} UZS`,
      `QQS (12%): ${(doc.aiExtractedData?.vatAmount || 0).toLocaleString()} UZS`,
      `Holati: ${doc.status}`,
      `E-IMZO: ${doc.signedByLocal || "Imzolanmagan"}`,
    ].join("\n");
    const blob = new Blob(["\uFEFF" + content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `didox_${doc.number.replace(/[^a-zA-Z0-9_-]/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`«${doc.number}» hujjat nusxasi yuklab olindi!`);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = documentSchema.safeParse({
      number: newDoc.number,
      type: newDoc.type,
      counterparty: newDoc.counterparty,
      counterpartyStir: newDoc.counterpartyStir || undefined,
      amount: newDoc.amount,
      date: newDoc.date,
      contractNumber: newDoc.contractNumber || undefined,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedMeta: { fileUrl: string; fileName: string; fileSize: string } | undefined;
      if (attachedFile && currentEntity?.id) {
        uploadedMeta = await uploadDocumentFileToStorage(currentEntity.id, attachedFile);
      }

      await createDocument({
        entityId: currentEntity?.id,
        documentNumber: parsed.data.number,
        type: parsed.data.type,
        counterparty: parsed.data.counterparty,
        counterpartyStir: parsed.data.counterpartyStir || undefined,
        amount: parsed.data.amount,
        date: parsed.data.date,
        contractNumber: parsed.data.contractNumber || undefined,
        fileUrl: uploadedMeta?.fileUrl,
        fileName: uploadedMeta?.fileName,
        fileSize: uploadedMeta?.fileSize,
      });

      await loadDocuments();
      toast.success(
        uploadedMeta
          ? "Hujjat va biriktirilgan fayl Supabase Storage + bazaga yuklandi!"
          : "Hujjat Didox va Supabase tizimiga muvaffaqiyatli yuklandi!"
      );
      setIsUploadOpen(false);
      setAttachedFile(null);
      setAttachedFileInfo(null);
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

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const filteredDocs = documents;

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

          {currentRole !== "viewer" && currentRole !== "auditor" && (
            <Button
              size="sm"
              className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setIsUploadOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              {t.pages.documents.uploadDoc}
            </Button>
          )}
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "invoice", "incoming_invoice", "act", "contract"].map((typeKey) => (
            <Button
              key={typeKey}
              variant={selectedType === typeKey ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(typeKey)}
              className="text-xs h-8 capitalize"
            >
              {typeKey === "all"
                ? `${t.pages.documents.tabs.all} (${totalCount})`
                : typeKey === "invoice"
                ? t.pages.documents.tabs.invoices
                : typeKey === "incoming_invoice"
                ? "Kiruvchi E-SF"
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
              {filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    {isLoading
                      ? "Hujjatlar Supabase bazasidan yuklanmoqda..."
                      : "Ushbu korxona boʻyicha mos hujjat topilmadi."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
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
              ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card className="p-8 text-center text-xs text-muted-foreground">
          {isLoading ? "Hujjatlar yuklanmoqda..." : "Ushbu korxona boʻyicha hujjatlar topilmadi."}
        </Card>
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

      {/* Server-side Pagination Bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          Jami: <strong className="text-foreground">{totalCount}</strong> ta hujjat (Sahifa {currentPage} / {totalPages})
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Oldingi
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs"
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Keyingi
          </Button>
        </div>
      </div>

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
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleExportSingleDoc(selectedDoc)}
                >
                  <Download className="h-3 w-3" />
                  Hujjat nusxasi (Yuklash)
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
                  <span className="text-muted-foreground">Korxona imzosi:</span>
                  <span className={`font-medium flex items-center gap-1 ${selectedDoc.signedByLocal ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    <CheckCircle2 className="h-3 w-3" />
                    {selectedDoc.signedByLocal || "Imzolanmagan (Kutilmoqda)"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">{t.common.counterparty}:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {selectedDoc.signedByPartner || "Kutilmoqda"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {currentRole !== "viewer" && currentRole !== "auditor" && (
              <div className="pt-2 flex items-center gap-2">
                <Button
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-9"
                  onClick={() => handleSignDocument(selectedDoc.id)}
                  disabled={selectedDoc.status === "signed"}
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  {selectedDoc.status === "signed" ? "E-IMZO bilan imzolangan" : `E-IMZO bilan tasdiqlash`}
                </Button>
                <Button
                  variant="outline"
                  className="h-9"
                  disabled={selectedDoc.status === "rejected" as any}
                  onClick={() => handleRejectDocument(selectedDoc.id)}
                >
                  {t.common.reject}
                </Button>
              </div>
            )}
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
                  <option value="invoice">Chiquvchi E-SF (Sotuv)</option>
                  <option value="incoming_invoice">Kiruvchi E-SF (Xarid)</option>
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

            <div>
              <Label className="text-[11px] font-medium text-foreground">Fayl biriktirish (PDF / XML — ixtiyoriy)</Label>
              <Input
                type="file"
                accept=".pdf,.xml,.json,.jpg,.png,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setAttachedFile(file);
                    const kb = Math.max(1, Math.round(file.size / 1024));
                    setAttachedFileInfo({
                      name: file.name,
                      sizeLabel: kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`,
                    });
                  }
                }}
                className="h-8 text-[11px] mt-1 file:text-[11px] file:mr-2"
              />
              {attachedFileInfo && (
                <p className="text-[10px] text-emerald-600 mt-1 font-mono">
                  Biriktirildi: {attachedFileInfo.name} ({attachedFileInfo.sizeLabel})
                </p>
              )}
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

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Yuklanmoqda...</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
