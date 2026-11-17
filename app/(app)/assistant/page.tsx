"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppState } from "@/lib/context/app-state";
import { FEATURES } from "@/lib/config/features";
import { QuickEntityBanner } from "@/components/shared/quick-entity-banner";
import { Money } from "@/components/shared/money";
import { PaginationBar } from "@/components/shared/pagination-bar";
import { ChatImageInputBar } from "@/components/shared/chat-image-input-bar";
import { ChatScanCard } from "@/components/shared/chat-scan-card";
import { AiModelSelector } from "@/components/shared/ai-model-selector";
import {
  AiEmptyHero,
  AiThinkingBubble,
  AiStreamingMessage,
} from "@/components/shared/ai-chat-visuals";
import { AiThreadHistoryPanel } from "@/components/shared/ai-thread-history-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  calculatePayrollUz,
  calculateVatUz,
  calculateTurnoverTaxUz,
  calculateVacationPayUz,
} from "@/lib/services/uz-tax-calculator";
import {
  compressImageForAi,
  computeSha256Hex,
  isSupportedAiImageFile,
  type CompressedImageResult,
} from "@/lib/utils/image-compression";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getAssistantDict } from "@/lib/i18n/domains/assistant";
import {
  postScannedDocToLedger,
  scanCompressedImageAndSave,
  type ScannedDocResult,
} from "@/lib/services/doc-scan-client";
import {
  fetchWorkBatchesPaginated,
  fetchWorkBatchMonths,
  fetchWorkBatchById,
  saveWorkBatch,
  deleteWorkBatch,
  upsertAiChatThread,
  type WorkBatchRecord,
  type AiChatThreadDetail,
} from "@/lib/services/supabase-service";
import type { AgentActionProposal } from "@/lib/ai/agent-types";
import {
  Sparkles,
  Loader2,
  Camera,
  Calculator,
  FileWarning,
  CheckCircle2,
  AlertTriangle,
  Upload,
  History,
  FolderOpen,
  Trash2,
  PanelLeft,
  SquarePen,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    }
  } catch {}
  return false;
}

interface ChatTurn {
  id: string;
  sender: "user" | "ai";
  text: string;
  imagePreviewUrl?: string;
  modelUsed?: string;
  actionProposed?: AgentActionProposal;
  actionStatus?: "pending" | "approved" | "rejected";
  scanResult?: ScannedDocResult;
  scanBatchId?: string | null;
  scanDuplicate?: boolean;
  scanPosted?: boolean;
  isFresh?: boolean;
}

const HISTORY_PAGE_SIZE = 10;

function AssistantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();
  const d = getAssistantDict(locale);
  const numLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ";
  const {
    currentEntity,
    isContextReady,
    subscription,
    setSubscriptionSnapshot,
  } = useAppState();
  const tabParam = searchParams.get("tab");
  const resolvedTab =
    tabParam && ["chat", "scan", "calc", "contract", "history"].includes(tabParam)
      ? tabParam
      : "chat";
  const [activeTab, setActiveTab] = useState(resolvedTab);

  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const nextUrl = val === "chat" ? "/assistant" : `/assistant?tab=${encodeURIComponent(val)}`;
    router.replace(nextUrl, { scroll: false });
  };

  // 1. AI Chat state
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const prevEntityIdRef = useRef<string | undefined>(currentEntity?.id);
  const [chatInput, setChatInput] = useState("");
  const [attachedChatImage, setAttachedChatImage] = useState<CompressedImageResult | null>(null);
  const [isDraggingOverChat, setIsDraggingOverChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [stopSignal, setStopSignal] = useState(0);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showChatSidebar, setShowChatSidebar] = useState(true);

  const isChatStreaming = messages.some((m) => m.isFresh);

  const scrollChatToBottom = useCallback(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollChatToBottom();
  }, [messages.length, isSending, scrollChatToBottom]);

  useEffect(() => {
    const prev = prevEntityIdRef.current;
    const next = currentEntity?.id;
    prevEntityIdRef.current = next;
    if (prev && next && prev !== next) {
      chatAbortRef.current?.abort();
      setMessages([]);
      setActiveThreadId(null);
    }
  }, [currentEntity?.id]);

  // 2. Document / Invoice Vision Scanner state (paginated 10 per page from DB)
  const scanFileRef = useRef<HTMLInputElement | null>(null);
  const [scanFileName, setScanFileName] = useState("");
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [scanMimeType, setScanMimeType] = useState<string>("");
  const [scanBase64, setScanBase64] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedDocResult | null>(null);
  const [isPostingDoc, setIsPostingDoc] = useState(false);
  const [savedScans, setSavedScans] = useState<WorkBatchRecord[]>([]);
  const [savedScansCount, setSavedScansCount] = useState(0);
  const [savedScansPage, setSavedScansPage] = useState(1);
  const [isLoadingScans, setIsLoadingScans] = useState(false);
  const [activeScanBatchId, setActiveScanBatchId] = useState<string | null>(null);

  // 5. Unified Tarix tab state (paginated 10 per page from DB)
  const [allHistory, setAllHistory] = useState<WorkBatchRecord[]>([]);
  const [allHistoryCount, setAllHistoryCount] = useState(0);
  const [allHistoryPage, setAllHistoryPage] = useState(1);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<
    "all" | "reconcile" | "document_scan" | "contract_risk"
  >("all");
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>("all");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [openingBatchId, setOpeningBatchId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSavedScans = useCallback(async () => {
    if (!currentEntity?.id) {
      setSavedScans([]);
      setSavedScansCount(0);
      return;
    }
    setIsLoadingScans(true);
    try {
      const { data, count } = await fetchWorkBatchesPaginated({
        entityId: currentEntity.id,
        batchType: "document_scan",
        page: savedScansPage,
        pageSize: HISTORY_PAGE_SIZE,
      });
      setSavedScans(data);
      setSavedScansCount(count);
    } finally {
      setIsLoadingScans(false);
    }
  }, [currentEntity?.id, savedScansPage]);

  const loadUnifiedHistory = useCallback(async () => {
    if (!currentEntity?.id) {
      setAllHistory([]);
      setAllHistoryCount(0);
      setAvailableMonths([]);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const [{ data, count }, months] = await Promise.all([
        fetchWorkBatchesPaginated({
          entityId: currentEntity.id,
          batchType: historyTypeFilter === "all" ? undefined : historyTypeFilter,
          periodMonth: historyMonthFilter === "all" ? undefined : historyMonthFilter,
          page: allHistoryPage,
          pageSize: HISTORY_PAGE_SIZE,
        }),
        fetchWorkBatchMonths(
          currentEntity.id,
          historyTypeFilter === "all" ? undefined : historyTypeFilter
        ),
      ]);
      setAllHistory(data);
      setAllHistoryCount(count);
      setAvailableMonths(months);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentEntity?.id, historyTypeFilter, historyMonthFilter, allHistoryPage]);

  useEffect(() => {
    setSavedScansPage(1);
    setAllHistoryPage(1);
    setHistoryMonthFilter("all");
  }, [currentEntity?.id]);

  useEffect(() => {
    if (activeTab !== "scan") return;
    loadSavedScans();
  }, [activeTab, loadSavedScans]);

  useEffect(() => {
    if (activeTab !== "history") return;
    loadUnifiedHistory();
  }, [activeTab, loadUnifiedHistory]);

  // 3. Calculator state
  const [calcSalaryAmount, setCalcSalaryAmount] = useState("5000000");
  const [calcSalaryDir, setCalcSalaryDir] = useState<"gross_to_net" | "net_to_gross">("gross_to_net");
  const [calcVatAmount, setCalcVatAmount] = useState("11200000");
  const [calcVatMode, setCalcVatMode] = useState<"included" | "excluded">("included");
  const [calcTurnoverRev, setCalcTurnoverRev] = useState("100000000");
  const [calcVacationDays, setCalcVacationDays] = useState("21");

  // 4. Contract Risk state
  const contractFileRef = useRef<HTMLInputElement | null>(null);
  const [contractText, setContractText] = useState("");
  const [contractFileInfo, setContractFileInfo] = useState<{ name: string; mimeType: string; base64: string } | null>(null);
  const [isCheckingContract, setIsCheckingContract] = useState(false);
  const [contractResult, setContractResult] = useState<ScannedDocResult | null>(null);

  const batchIdParam = searchParams.get("batchId");
  useEffect(() => {
    if (!batchIdParam) return;
    fetchWorkBatchById(batchIdParam)
      .then((full) => {
        if (!full?.sanitizedPayload) return;
        if (full.batchType === "document_scan") {
          setScanResult(full.sanitizedPayload as ScannedDocResult);
          setScanFileName(full.bankFileName || full.title);
          setScanPreviewUrl(null);
          setActiveScanBatchId(full.id);
          setActiveTab("scan");
        } else if (full.batchType === "contract_risk") {
          setContractResult(full.sanitizedPayload as ScannedDocResult);
          setActiveTab("contract");
        }
      })
      .catch(() => {});
  }, [batchIdParam]);

  const payrollCalc = useMemo(
    () => calculatePayrollUz({ amount: parseFloat(calcSalaryAmount) || 0, direction: calcSalaryDir }),
    [calcSalaryAmount, calcSalaryDir]
  );

  const vatCalc = useMemo(
    () => calculateVatUz({ amount: parseFloat(calcVatAmount) || 0, mode: calcVatMode }),
    [calcVatAmount, calcVatMode]
  );

  const turnoverCalc = useMemo(
    () => calculateTurnoverTaxUz({ revenue: parseFloat(calcTurnoverRev) || 0 }),
    [calcTurnoverRev]
  );

  const vacationCalc = useMemo(() => {
    const parsed = parseInt(calcVacationDays, 10);
    const safeDays = Number.isNaN(parsed) ? 21 : Math.max(1, Math.min(60, parsed));
    return calculateVacationPayUz({
      monthlySalary: parseFloat(calcSalaryAmount) || 0,
      days: safeDays,
    });
  }, [calcSalaryAmount, calcVacationDays]);

  const handleDropImageToChat = async (file?: File | null) => {
    setIsDraggingOverChat(false);
    if (!file) return;
    if (!isSupportedAiImageFile(file)) {
      toast.error(d.toasts.invalidImageFormat);
      return;
    }
    try {
      const compressed = await compressImageForAi(file, {
        maxDimension: subscription.limits.imageMaxDimensionPx,
        maxCompressedBytes: subscription.limits.imageMaxBytes,
      });
      setAttachedChatImage(compressed);
    } catch (err: any) {
      toast.error(err?.message || d.toasts.invalidImageFormat);
    }
  };

  const persistChatThread = async (nextMessages: ChatTurn[]) => {
    const saved = await upsertAiChatThread({
      threadId: activeThreadId,
      entityId: currentEntity?.id,
      messages: nextMessages,
    });
    if (saved) {
      setActiveThreadId(saved.id);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("firmus:ai-threads-updated"));
      }
    }
  };

  const handleNewChat = () => {
    chatAbortRef.current?.abort();
    setIsSending(false);
    setMessages([]);
    setActiveThreadId(null);
    setChatInput("");
    setAttachedChatImage(null);
  };

  const handleSelectChatThread = (thread: AiChatThreadDetail) => {
    chatAbortRef.current?.abort();
    setIsSending(false);
    setActiveThreadId(thread.id);
    setMessages((thread.messages || []).map((m) => ({ ...m, isFresh: false })));
  };

  const handleStopChat = () => {
    chatAbortRef.current?.abort();
    setIsSending(false);
    setStopSignal((s) => s + 1);
  };

  const handleSendChat = async (
    textToSend?: string,
    options?: {
      imgOverride?: CompressedImageResult | null;
      baseMessages?: ChatTurn[];
      clearComposer?: boolean;
    }
  ) => {
    const query = (textToSend ?? chatInput).trim();
    const imgToSend = options?.imgOverride !== undefined ? options.imgOverride : textToSend ? null : attachedChatImage;
    if ((!query && !imgToSend) || isSending) return;

    const baseList = options?.baseMessages ?? messages;
    const isRegen = Boolean(options?.baseMessages);

    const userTurn: ChatTurn | null = isRegen
      ? null
      : {
          id: `u-${Date.now()}`,
          sender: "user",
          text: query || `${d.chat.imageSentPrefix} ${imgToSend?.fileName || d.chat.imageSentDefaultName}`,
          imagePreviewUrl: imgToSend?.dataUrl,
        };
    const nextList = userTurn ? [...baseList, userTurn] : [...baseList];
    const historySnapshot = baseList
      .filter((m) => m.text.trim().length > 0)
      .slice(-6)
      .map((m) => ({ sender: m.sender, text: m.text.slice(0, 1200) }));

    setMessages(nextList);
    if (options?.clearComposer !== false && !textToSend && !isRegen) {
      setChatInput("");
      setAttachedChatImage(null);
    }
    setIsSending(true);

    const ctrl = new AbortController();
    chatAbortRef.current = ctrl;

    try {
      if (imgToSend) {
        const { scan, savedBatchId, isDuplicate, cachedHit, usage } = await scanCompressedImageAndSave({
          dataUrl: imgToSend.dataUrl,
          mimeType: imgToSend.mimeType,
          fileName: imgToSend.fileName,
          userNote: query,
          entityId: currentEntity?.id,
          requestedModel: subscription.limits.defaultScanModel,
        });
        if (usage) setSubscriptionSnapshot(usage);
        await Promise.all([loadSavedScans(), loadUnifiedHistory()]);
        const aiScanTurn: ChatTurn = {
          id: `a-${Date.now()}`,
          sender: "ai",
          text:
            `${cachedHit ? d.chat.cachedFromHistoryPrefix : ""}` +
            `${scan.documentType}: ${scan.counterparty} — ${scan.totalAmount.toLocaleString(numLocale)} ${t.common.currency}. ` +
            (scan.provodkaExplanation || d.chat.scanPreparedFallback),
          modelUsed: scan.modelUsed,
          scanResult: scan,
          scanBatchId: savedBatchId,
          scanDuplicate: isDuplicate,
          scanPosted: false,
          isFresh: true,
        };
        const completed = [...nextList, aiScanTurn];
        setMessages(completed);
        await persistChatThread(completed);
        return;
      }

      const res = await fetch("/api/ai-copilot", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          entityId: currentEntity?.id,
          requestedModel: subscription.preferredModel,
          history: historySnapshot,
        }),
      });
      const data = await res.json();
      if (data?.usage) setSubscriptionSnapshot(data.usage);
      if (!res.ok) throw new Error(data.error || d.toasts.aiNoResponse);

      const aiTurn: ChatTurn = {
        id: `a-${Date.now()}`,
        sender: "ai",
        text: data.reply,
        modelUsed: data.modelUsed,
        actionProposed: data.actionProposed,
        actionStatus: data.actionProposed ? "pending" : undefined,
        isFresh: true,
      };
      const completed = [...nextList, aiTurn];
      setMessages(completed);
      await persistChatThread(completed);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      toast.error(`${d.toasts.aiResponseErrorPrefix}: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerateTurn = async (aiIdx: number) => {
    const prevUser = [...messages.slice(0, aiIdx)].reverse().find((m) => m.sender === "user");
    if (!prevUser) return;
    await handleSendChat(prevUser.text, {
      imgOverride: null,
      baseMessages: messages.slice(0, aiIdx),
      clearComposer: false,
    });
  };

  const handlePostChatScan = async (turn: ChatTurn, editedScan: ScannedDocResult) => {
    if (!currentEntity?.id) {
      toast.error(d.toasts.selectEntityForLedger);
      return;
    }
    try {
      await postScannedDocToLedger({
        entityId: currentEntity.id,
        scan: editedScan,
        batchId: turn.scanBatchId,
      });
      const updated = messages.map((m) =>
        m.id === turn.id ? { ...m, scanPosted: true, scanResult: editedScan } : m
      );
      setMessages(updated);
      await Promise.all([loadSavedScans(), loadUnifiedHistory(), persistChatThread(updated)]);
      toast.success(d.toasts.scanPostedToLedger);
    } catch (err: any) {
      toast.error(`${d.toasts.ledgerWriteErrorPrefix}: ${err.message}`);
    }
  };

  const handleChatProposal = async (turn: ChatTurn, decision: "approve" | "reject") => {
    if (!turn.actionProposed || !currentEntity?.id || executingId) return;
    setExecutingId(turn.id);
    try {
      const res = await fetch("/api/ai-copilot/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: currentEntity.id,
          proposal: turn.actionProposed,
          decision,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || d.toasts.actionExecuteFailed);
      const updated: ChatTurn[] = messages.map((m) =>
        m.id === turn.id
          ? { ...m, actionStatus: decision === "approve" ? "approved" : "rejected" }
          : m
      );
      setMessages(updated);
      await persistChatThread(updated);
      if (decision === "approve") {
        window.dispatchEvent(new CustomEvent("firmus:refresh-data", { detail: { entityId: currentEntity.id } }));
        toast.success(data.message || d.toasts.proposalPostedToLedger);
      } else {
        toast.info(d.toasts.proposalRejected);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExecutingId(null);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(d.toasts.fileReadError));
      reader.readAsDataURL(file);
    });

  const handleSelectScanFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.type === "application/pdf") {
        if (!subscription.limits.pdfAllowed) {
          toast.info(d.toasts.pdfProOnly);
          return;
        }
        if (file.size > subscription.limits.pdfMaxBytes) {
          const maxMb = Math.round(subscription.limits.pdfMaxBytes / (1024 * 1024));
          toast.error(d.toasts.pdfSizeLimit(subscription.planName, maxMb));
          return;
        }
        const dataUrl = await readFileAsBase64(file);
        setScanFileName(file.name);
        setScanMimeType("application/pdf");
        setScanBase64(dataUrl);
        setScanPreviewUrl(null);
        setScanResult(null);
        return;
      }

      if (!isSupportedAiImageFile(file)) {
        toast.error(d.toasts.invalidScanFileFormat);
        return;
      }

      const compressed = await compressImageForAi(file, {
        maxDimension: subscription.limits.imageMaxDimensionPx,
        maxCompressedBytes: subscription.limits.imageMaxBytes,
      });
      setScanFileName(compressed.fileName);
      setScanMimeType(compressed.mimeType);
      setScanBase64(compressed.dataUrl);
      setScanPreviewUrl(compressed.dataUrl);
      setScanResult(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRunScan = async () => {
    if (!scanBase64 || !scanMimeType) {
      toast.error(d.toasts.selectScanFileFirst);
      return;
    }
    setIsScanning(true);
    try {
      const fileHash = await computeSha256Hex(scanBase64);
      const res = await fetch("/api/ai-document-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "invoice_receipt",
          fileName: scanFileName,
          fileHash,
          entityId: currentEntity?.id,
          requestedModel: subscription.limits.defaultScanModel,
          mimeType: scanMimeType,
          base64Data: scanBase64,
        }),
      });
      const data = await res.json();
      if (data?.usage) setSubscriptionSnapshot(data.usage);
      if (!res.ok) throw new Error(data.error || d.toasts.docAnalyzeFailed);
      setScanResult(data);
      setActiveScanBatchId(data.savedBatchId || null);

      if (data.cachedHit) {
        toast.success(d.toasts.docCachedHit);
        return;
      }

      if (currentEntity?.id) {
        try {
          const saved = await saveWorkBatch({
            entityId: currentEntity.id,
            batchType: "document_scan",
            periodMonth: /^\d{4}-\d{2}/.test(data.date || "") ? data.date.slice(0, 7) : undefined,
            title: `${data.documentType || d.scan.defaultDocLabel} ${data.documentNumber || ""} (${data.counterparty || ""})`.trim(),
            bankFileName: scanFileName || undefined,
            fileHash,
            rowCount: Array.isArray(data.items) ? Math.max(1, data.items.length) : 1,
            totalIncome: data.direction === "income" ? Number(data.totalAmount || 0) : 0,
            totalExpense: data.direction === "expense" ? Number(data.totalAmount || 0) : 0,
            status: "reviewed",
            summaryJson: {
              date: data.date,
              documentNumber: data.documentNumber,
              totalAmount: data.totalAmount,
              vatAmount: data.vatAmount,
            },
            sanitizedPayload: data,
          });
          setActiveScanBatchId(saved.id);
          await Promise.all([loadSavedScans(), loadUnifiedHistory()]);
        } catch (saveErr) {
          console.warn("Could not auto-save scan batch:", saveErr);
        }
      }

      toast.success(d.toasts.docScannedSuccess);
    } catch (err: any) {
      toast.error(`${d.toasts.scanErrorPrefix}: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePostScannedToLedger = async () => {
    if (!currentEntity?.id) {
      toast.error(d.toasts.selectEntityForLedger);
      return;
    }
    if (!scanResult || scanResult.totalAmount <= 0) {
      toast.error(d.toasts.amountMustBePositive);
      return;
    }
    setIsPostingDoc(true);
    try {
      await postScannedDocToLedger({
        entityId: currentEntity.id,
        scan: scanResult,
        batchId: activeScanBatchId,
      });
      await Promise.all([loadSavedScans(), loadUnifiedHistory()]);
      toast.success(d.toasts.scanPostedToLedger);
    } catch (err: any) {
      toast.error(`${d.toasts.ledgerWriteErrorPrefix}: ${err.message}`);
    } finally {
      setIsPostingDoc(false);
    }
  };

  const handleSelectContractFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.type === "application/pdf") {
        if (!subscription.limits.pdfAllowed) {
          toast.info(d.toasts.contractPdfProOnly);
          return;
        }
        if (file.size > subscription.limits.pdfMaxBytes) {
          const maxMb = Math.round(subscription.limits.pdfMaxBytes / (1024 * 1024));
          toast.error(d.toasts.pdfSizeLimit(subscription.planName, maxMb));
          return;
        }
        const dataUrl = await readFileAsBase64(file);
        setContractFileInfo({
          name: file.name,
          mimeType: "application/pdf",
          base64: dataUrl,
        });
        return;
      }

      if (!isSupportedAiImageFile(file)) {
        toast.error(d.toasts.invalidContractFileFormat);
        return;
      }

      const compressed = await compressImageForAi(file, {
        maxDimension: subscription.limits.imageMaxDimensionPx,
        maxCompressedBytes: subscription.limits.imageMaxBytes,
      });
      setContractFileInfo({
        name: compressed.fileName,
        mimeType: compressed.mimeType,
        base64: compressed.dataUrl,
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAnalyzeContract = async () => {
    if (!contractText.trim() && !contractFileInfo) {
      toast.error(d.toasts.contractInputRequired);
      return;
    }
    if (contractText.trim().length > subscription.limits.contractTextMaxChars) {
      toast.error(
        d.toasts.contractLengthLimit(
          subscription.planName,
          subscription.limits.contractTextMaxChars.toLocaleString(numLocale)
        )
      );
      return;
    }
    setIsCheckingContract(true);
    try {
      const hashSource = contractFileInfo?.base64 || contractText.trim();
      const fileHash = await computeSha256Hex(hashSource);
      const res = await fetch("/api/ai-document-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "contract_risk",
          fileName: contractFileInfo?.name,
          fileHash,
          entityId: currentEntity?.id,
          requestedModel: subscription.preferredModel,
          mimeType: contractFileInfo?.mimeType,
          base64Data: contractFileInfo?.base64,
          docText: contractText.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data?.usage) setSubscriptionSnapshot(data.usage);
      if (!res.ok) throw new Error(data.error || d.toasts.contractAnalyzeFailed);
      setContractResult(data);

      if (data.cachedHit) {
        toast.success(d.toasts.contractCachedHit);
        return;
      }

      if (currentEntity?.id) {
        try {
          await saveWorkBatch({
            entityId: currentEntity.id,
            batchType: "contract_risk",
            title: `${d.contract.batchTitlePrefix}: ${contractFileInfo?.name || data.counterparty || d.contract.textCheckFallback}`.slice(0, 180),
            bankFileName: contractFileInfo?.name,
            fileHash,
            rowCount: Array.isArray(data.risks) ? data.risks.length : 0,
            totalIncome: 0,
            totalExpense: Number(data.totalAmount || 0),
            status: "reviewed",
            summaryJson: {
              riskCount: Array.isArray(data.risks) ? data.risks.length : 0,
              date: data.date,
            },
            sanitizedPayload: data,
          });
          await loadUnifiedHistory();
        } catch (saveErr) {
          console.warn("Could not save contract_risk batch:", saveErr);
        }
      }

      toast.success(d.toasts.contractAnalyzedSuccess);
    } catch (err: any) {
      toast.error(`${d.toasts.contractErrorPrefix}: ${err.message}`);
    } finally {
      setIsCheckingContract(false);
    }
  };

  const handleOpenHistoryBatch = async (batch: WorkBatchRecord) => {
    if (batch.batchType === "reconcile") {
      router.push(`/reconcile?batchId=${encodeURIComponent(batch.id)}`);
      return;
    }
    setOpeningBatchId(batch.id);
    try {
      const full = await fetchWorkBatchById(batch.id);
      if (!full?.sanitizedPayload) {
        toast.error(d.toasts.savedDocNotFound);
        return;
      }
      if (batch.batchType === "document_scan") {
        setScanResult(full.sanitizedPayload as ScannedDocResult);
        setScanFileName(full.bankFileName || full.title);
        setScanPreviewUrl(null);
        setActiveScanBatchId(full.id);
        handleTabChange("scan");
        toast.success(d.toasts.savedDocOpened);
      } else {
        setContractResult(full.sanitizedPayload as ScannedDocResult);
        handleTabChange("contract");
        toast.success(d.toasts.savedContractOpened);
      }
    } catch (err: any) {
      toast.error(`${d.toasts.openErrorPrefix}: ${err.message}`);
    } finally {
      setOpeningBatchId(null);
    }
  };

  const handleDeleteWorkBatch = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await deleteWorkBatch(id);
      if (activeScanBatchId === id) setActiveScanBatchId(null);
      if (activeTab === "scan") {
        await loadSavedScans();
      } else if (activeTab === "history") {
        await loadUnifiedHistory();
      } else {
        await Promise.all([loadSavedScans(), loadUnifiedHistory()]);
      }
      toast.success(d.toasts.deletedFromHistory);
    } catch (err: any) {
      toast.error(err?.message || d.toasts.actionExecuteFailed);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {FEATURES.fullAccountingErp
            ? d.header.title
            : d.header.toolTitles[activeTab as keyof typeof d.header.toolTitles] || d.header.title}
        </h1>

        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted/70 px-3 py-1 text-xs transition-colors self-start sm:self-auto"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span className="font-medium text-foreground">
            {subscription.isTrialActive
              ? d.header.trialActive
              : subscription.trialAvailable
              ? d.header.trialAvailable(subscription.planName)
              : subscription.planName}
          </span>
        </Link>
      </div>

      <QuickEntityBanner />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        {FEATURES.fullAccountingErp ? (
          <TabsList className="h-9 text-xs flex-wrap">
            <TabsTrigger value="chat" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              {d.tabs.chat}
            </TabsTrigger>
            <TabsTrigger value="scan" className="gap-1.5 text-xs">
              <Camera className="h-3.5 w-3.5" />
              {d.tabs.scan}
            </TabsTrigger>
            <TabsTrigger value="calc" className="gap-1.5 text-xs">
              <Calculator className="h-3.5 w-3.5" />
              {d.tabs.calc}
            </TabsTrigger>
            <TabsTrigger value="contract" className="gap-1.5 text-xs">
              <FileWarning className="h-3.5 w-3.5" />
              {d.tabs.contract}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs">
              <History className="h-3.5 w-3.5" />
              {d.tabs.history} ({allHistoryCount})
            </TabsTrigger>
          </TabsList>
        ) : (
          /* Solo Tools Mode mobile-only horizontal pill bar */
          <div className="flex lg:hidden overflow-x-auto no-scrollbar gap-1.5 pb-1 -mx-1 px-1">
            {[
              { id: "chat", label: d.tabs.mobile.chat, icon: Sparkles },
              { id: "scan", label: d.tabs.mobile.scan, icon: Camera },
              { id: "calc", label: d.tabs.mobile.calc, icon: Calculator },
              { id: "contract", label: d.tabs.mobile.contract, icon: FileWarning },
              { id: "history", label: d.tabs.mobile.history, icon: History },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0",
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* TAB 1: AI CHAT */}
        <TabsContent value="chat" className="space-y-3">
          <Card
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOverChat(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDraggingOverChat(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDropImageToChat(e.dataTransfer?.files?.[0]);
            }}
            className={`overflow-hidden ${isDraggingOverChat ? "border-indigo-500 ring-2 ring-indigo-500/30" : ""}`}
          >
            <div className="flex flex-col md:flex-row min-h-[480px]">
              {/* Collapsible Chat History Sidebar */}
              {showChatSidebar && (
                <div className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border/70 bg-muted/15 max-h-[260px] md:max-h-[540px] flex flex-col">
                  <AiThreadHistoryPanel
                    entityId={currentEntity?.id}
                    activeThreadId={activeThreadId}
                    onSelectThread={(thread) => {
                      handleSelectChatThread(thread);
                    }}
                    onNewChat={handleNewChat}
                    onDeletedThread={(deletedId) => {
                      if (activeThreadId === deletedId) handleNewChat();
                    }}
                  />
                </div>
              )}

              {/* Active Conversation Area */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-border/60 bg-card/50">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      title={showChatSidebar ? d.chat.hideHistory : d.chat.showHistory}
                      onClick={() => setShowChatSidebar((s) => !s)}
                    >
                      <PanelLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground">
                      {activeThreadId ? d.chat.savedThread : d.chat.newThread}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={handleNewChat}
                  >
                    <SquarePen className="h-3.5 w-3.5" />
                    <span>{d.chat.newChat}</span>
                  </Button>
                </div>

                <CardContent className="pt-4 space-y-3 flex-1 flex flex-col justify-between min-h-[420px]">
                  <div
                    ref={chatScrollRef}
                    className="flex-1 flex flex-col space-y-4 max-h-[440px] overflow-y-auto pr-1"
                  >
                    {messages.length === 0 && !isSending ? (
                      <AiEmptyHero greeting={d.chat.emptyGreeting} />
                    ) : (
                      messages.map((m, idx) => (
                        <div
                          key={m.id}
                          className={`flex flex-col animate-in fade-in slide-in-from-bottom-1 duration-200 ${
                            m.sender === "user" ? "items-end" : "items-start"
                          }`}
                        >
                          {m.sender === "user" ? (
                            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-600 px-3.5 py-2.5 text-xs text-white whitespace-pre-wrap leading-relaxed shadow-sm">
                              {m.imagePreviewUrl && (
                                <img
                                  src={m.imagePreviewUrl}
                                  alt={d.chat.uploadedImageAlt}
                                  className="mb-2 max-h-44 rounded-lg border border-white/20 object-contain"
                                />
                              )}
                              {m.text}
                            </div>
                          ) : (
                            <div className="flex items-start gap-2.5 max-w-[90%]">
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/25">
                                <Sparkles className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="rounded-2xl rounded-tl-sm bg-muted/50 border border-border/70 px-3.5 py-2.5 shadow-sm">
                                  <AiStreamingMessage
                                    text={m.text}
                                    animate={Boolean(m.isFresh)}
                                    stopSignal={stopSignal}
                                    onTickScroll={scrollChatToBottom}
                                    onStreamDone={() =>
                                      setMessages((prev) =>
                                        prev.map((turn) => (turn.id === m.id ? { ...turn, isFresh: false } : turn))
                                      )
                                    }
                                    onRegenerate={
                                      !m.scanResult ? () => handleRegenerateTurn(idx) : undefined
                                    }
                                  />
                                </div>

                                {m.scanResult && !m.isFresh && (
                                  <ChatScanCard
                                    scan={m.scanResult}
                                    isDuplicate={m.scanDuplicate}
                                    posted={m.scanPosted}
                                    canPost={FEATURES.fullAccountingErp && Boolean(currentEntity?.id)}
                                    onPostToLedger={(edited) => handlePostChatScan(m, edited)}
                                  />
                                )}
                                {m.actionProposed && !m.isFresh && (
                                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 text-xs space-y-2 animate-in fade-in duration-200">
                                    <div className="font-semibold text-foreground">{m.actionProposed.title}</div>
                                    <p className="text-[11px] text-muted-foreground">{m.actionProposed.summary}</p>
                                    {FEATURES.fullAccountingErp && m.actionStatus === "pending" ? (
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="success"
                                          className="h-7 text-[11px]"
                                          disabled={executingId === m.id}
                                          onClick={() => handleChatProposal(m, "approve")}
                                        >
                                          {executingId === m.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                          {d.chat.approve}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-[11px]"
                                          disabled={executingId === m.id}
                                          onClick={() => handleChatProposal(m, "reject")}
                                        >
                                          {d.chat.reject}
                                        </Button>
                                      </div>
                                    ) : m.actionStatus && m.actionStatus !== "pending" ? (
                                      <Badge variant={m.actionStatus === "approved" ? "success" : "outline"} className="text-[10px]">
                                        {m.actionStatus === "approved" ? d.chat.postedToLedger : d.chat.rejected}
                                      </Badge>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {isSending && <AiThinkingBubble />}
                  </div>

                  <div className="pt-2">
                    <AiModelSelector />
                    <ChatImageInputBar
                      value={chatInput}
                      onChange={setChatInput}
                      attachedImage={attachedChatImage}
                      onAttachImage={setAttachedChatImage}
                      isSending={isSending}
                      isStreaming={isChatStreaming}
                      maxDimension={subscription.limits.imageMaxDimensionPx}
                      maxCompressedBytes={subscription.limits.imageMaxBytes}
                      onStop={handleStopChat}
                      onSubmit={() => handleSendChat()}
                    />
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: INVOICE / RECEIPT SCANNER */}
        <TabsContent value="scan" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{d.scan.uploadTitle}</CardTitle>
                <CardDescription className="text-xs">
                  {subscription.limits.pdfAllowed
                    ? d.scan.uploadDescPdf(Math.round(subscription.limits.pdfMaxBytes / (1024 * 1024)))
                    : d.scan.uploadDescImagesOnly}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <input
                  ref={scanFileRef}
                  type="file"
                  accept={
                    subscription.limits.pdfAllowed
                      ? "image/jpeg,image/png,image/webp,application/pdf"
                      : "image/jpeg,image/png,image/webp"
                  }
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    handleSelectScanFile(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 border-dashed flex flex-col gap-1.5"
                  onClick={() => scanFileRef.current?.click()}
                >
                  <Upload className="h-5 w-5 text-indigo-600" />
                  <span>
                    {scanFileName ||
                      (subscription.limits.pdfAllowed ? d.scan.selectFilePdf : d.scan.selectFileImage)}
                  </span>
                </Button>
                {scanPreviewUrl && (
                  <div className="rounded-md border border-border overflow-hidden max-h-48 flex justify-center bg-muted/30">
                    <img src={scanPreviewUrl} alt={d.scan.uploadedDocAlt} className="max-h-48 object-contain" />
                  </div>
                )}
                <Button
                  type="button"
                  className="w-full gap-1.5"
                  disabled={isScanning || !scanBase64}
                  onClick={handleRunScan}
                >
                  {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {d.scan.analyzeButton}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{d.scan.resultTitle}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3">
                {!scanResult ? (
                  <p className="text-muted-foreground py-8 text-center">
                    {d.scan.emptyResult}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground">{d.scan.fields.docType}</span>
                        <div className="font-semibold">{scanResult.documentType} {scanResult.documentNumber}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">{d.scan.fields.date}</span>
                        <div className="font-mono">{scanResult.date}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">{d.scan.fields.counterparty}</span>
                        <div className="font-semibold">{scanResult.counterparty}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">{d.scan.fields.tin}</span>
                        <div className="font-mono">{scanResult.counterpartyStir || d.scan.fields.notDetected}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">{d.scan.fields.totalAmount}</span>
                        <div className="font-mono font-bold text-foreground">
                          <Money amount={scanResult.totalAmount} />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">{d.scan.fields.vat12}</span>
                        <div className="font-mono font-semibold text-emerald-600">
                          <Money amount={scanResult.vatAmount} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-1">
                      <div className="font-semibold text-foreground">
                        {d.scan.entryPrefix}: {d.calc.debitAbbr} {scanResult.suggestedDebitCode} / {d.calc.creditAbbr} {scanResult.suggestedCreditCode}
                        {scanResult.vatAmount > 0 ? ` (+ ${d.scan.vatTag} ${scanResult.vatAccountCode})` : ""}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{scanResult.provodkaExplanation}</p>
                    </div>

                    {Array.isArray(scanResult.items) && scanResult.items.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow className="text-[10px]">
                              <TableHead>{d.scan.table.item}</TableHead>
                              <TableHead>{d.scan.table.mxik}</TableHead>
                              <TableHead className="text-right">{d.scan.table.amount}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {scanResult.items.map((it, idx) => (
                              <TableRow key={idx} className="text-[11px]">
                                <TableCell>{it.name} ({it.qty} {it.unit})</TableCell>
                                <TableCell className="font-mono text-[10px]">{it.mxikHint || "—"}</TableCell>
                                <TableCell className="text-right font-mono"><Money amount={it.total} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs gap-1.5"
                        onClick={async () => {
                          const text = [
                            `${scanResult.documentType}${scanResult.documentNumber ? ` №${scanResult.documentNumber}` : ""} (${scanResult.date})`,
                            `${d.scan.copyTemplate.counterparty}: ${scanResult.counterparty}${scanResult.counterpartyStir ? ` (${d.scan.copyTemplate.tin}: ${scanResult.counterpartyStir})` : ""}`,
                            `${d.scan.copyTemplate.totalAmount}: ${scanResult.totalAmount.toLocaleString(numLocale)} ${t.common.currency}${
                              scanResult.vatAmount > 0 ? ` | ${d.scan.copyTemplate.vat12}: ${scanResult.vatAmount.toLocaleString(numLocale)} ${t.common.currency}` : ""
                            }`,
                            `${d.scan.copyTemplate.entry}: ${d.calc.debitAbbr} ${scanResult.suggestedDebitCode} / ${d.calc.creditAbbr} ${scanResult.suggestedCreditCode}${
                              scanResult.vatAmount > 0 ? ` (+ ${d.scan.vatTag} ${scanResult.vatAccountCode})` : ""
                            }`,
                          ].join("\n");
                          const ok = await copyToClipboard(text);
                          if (ok) {
                            toast.success(d.toasts.resultCopied);
                          } else {
                            toast.error(d.toasts.copyFailed);
                          }
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {d.scan.copyResult}
                      </Button>
                      {FEATURES.fullAccountingErp && (
                        <Button
                          size="sm"
                          variant="success"
                          className="flex-1 h-8 text-xs gap-1.5"
                          disabled={isPostingDoc || scanResult.totalAmount <= 0}
                          onClick={handlePostScannedToLedger}
                        >
                          {isPostingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {d.scan.postToLedger}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {currentEntity?.id && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  {d.scan.savedDocsTitle} ({savedScansCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {savedScans.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    {isLoadingScans ? t.common.loading : d.scan.noSavedDocs}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{d.table.month}</TableHead>
                        <TableHead>{d.scan.savedTable.docCounterparty}</TableHead>
                        <TableHead className="text-right">{d.table.amount}</TableHead>
                        <TableHead>{d.table.status}</TableHead>
                        <TableHead className="text-right">{d.table.action}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {savedScans.map((s) => (
                        <TableRow key={s.id} className="text-xs">
                          <TableCell className="font-mono text-[11px]">{s.periodMonth}</TableCell>
                          <TableCell className="font-medium max-w-[260px] truncate">{s.title}</TableCell>
                          <TableCell className="text-right font-mono">
                            <Money amount={Number(s.summaryJson?.totalAmount || s.totalExpense || s.totalIncome || 0)} />
                          </TableCell>
                          <TableCell>
                            {s.status === "posted_to_ledger" ? (
                              <Badge variant="success" className="text-[10px]">{d.statuses.postedToLedger}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">{d.statuses.reviewed}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] gap-1 px-2"
                                disabled={openingBatchId === s.id}
                                onClick={async () => {
                                  await handleOpenHistoryBatch(s);
                                }}
                              >
                                <FolderOpen className="h-3 w-3" />
                                {d.actions.open}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                aria-label={d.actions.delete}
                                disabled={deletingId === s.id}
                                onClick={() => handleDeleteWorkBatch(s.id)}
                              >
                                {deletingId === s.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <PaginationBar
                  page={savedScansPage}
                  pageSize={HISTORY_PAGE_SIZE}
                  totalCount={savedScansCount}
                  isLoading={isLoadingScans}
                  itemLabel={d.scan.paginationItemLabel}
                  onPageChange={setSavedScansPage}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3: PAYROLL & TAX CALCULATOR */}
        <TabsContent value="calc" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payroll Calculator */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{d.calc.payroll.title}</CardTitle>
                <CardDescription className="text-xs">
                  {d.calc.payroll.taxArticleRef}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={calcSalaryDir === "gross_to_net" ? "default" : "outline"}
                    className="h-7 text-[11px] flex-1"
                    onClick={() => setCalcSalaryDir("gross_to_net")}
                  >
                    {d.calc.payroll.grossToNet}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={calcSalaryDir === "net_to_gross" ? "default" : "outline"}
                    className="h-7 text-[11px] flex-1"
                    onClick={() => setCalcSalaryDir("net_to_gross")}
                  >
                    {d.calc.payroll.netToGross}
                  </Button>
                </div>

                <Input
                  type="number"
                  min={0}
                  value={calcSalaryAmount}
                  onChange={(e) => setCalcSalaryAmount(e.target.value)}
                  className="h-9 font-mono text-xs"
                  placeholder={d.calc.payroll.amountPlaceholder}
                />

                <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{d.calc.payroll.grossLabel}</span>
                    <span className="font-mono font-semibold"><Money amount={payrollCalc.gross} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{d.calc.payroll.pitLabel}</span>
                    <span className="font-mono text-rose-600">-<Money amount={payrollCalc.jshds12} /></span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1.5">
                    <span className="font-semibold">{d.calc.payroll.netLabel}</span>
                    <span className="font-mono font-bold text-emerald-600"><Money amount={payrollCalc.net} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{d.calc.payroll.socialTaxLabel}</span>
                    <span className="font-mono"><Money amount={payrollCalc.socialTax12} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{d.calc.payroll.totalEmployerCostLabel}</span>
                    <span className="font-mono font-semibold"><Money amount={payrollCalc.totalEmployerCost} /></span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-foreground">{d.calc.payroll.entriesLabel}</div>
                  {payrollCalc.provodka.map((p, i) => {
                    const entryKey = `${p.debitCode}-${p.creditCode}`;
                    const localizedDesc = d.calc.payroll.entryDescriptions[entryKey] || p.description;
                    return (
                      <div key={i} className="flex justify-between text-[11px] font-mono text-muted-foreground">
                        <span>{d.calc.debitAbbr} {p.debitCode} / {d.calc.creditAbbr} {p.creditCode} ({localizedDesc})</span>
                        <span><Money amount={p.amount} /></span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* VAT + Turnover + Vacation */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{d.calc.vat.title}</CardTitle>
                  <CardDescription className="text-xs">{d.calc.vat.taxArticleRef}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={calcVatMode === "included" ? "default" : "outline"}
                      className="h-7 text-[11px] flex-1"
                      onClick={() => setCalcVatMode("included")}
                    >
                      {d.calc.vat.extractMode}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={calcVatMode === "excluded" ? "default" : "outline"}
                      className="h-7 text-[11px] flex-1"
                      onClick={() => setCalcVatMode("excluded")}
                    >
                      {d.calc.vat.addMode}
                    </Button>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={calcVatAmount}
                    onChange={(e) => setCalcVatAmount(e.target.value)}
                    className="h-9 font-mono text-xs"
                  />
                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2.5 text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground">{d.calc.vat.netLabel}</div>
                      <div className="font-mono font-semibold"><Money amount={vatCalc.net} /></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{d.calc.vat.vatLabel}</div>
                      <div className="font-mono font-bold text-indigo-600"><Money amount={vatCalc.vat12} /></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{d.calc.vat.totalLabel}</div>
                      <div className="font-mono font-bold"><Money amount={vatCalc.total} /></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{d.calc.other.title}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1.5 rounded-lg bg-muted/40 p-2.5">
                    <div className="font-semibold">{d.calc.other.turnoverTitle}</div>
                    <Input
                      type="number"
                      min={0}
                      value={calcTurnoverRev}
                      onChange={(e) => setCalcTurnoverRev(e.target.value)}
                      className="h-8 font-mono text-xs"
                    />
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">{d.calc.other.turnoverTaxLabel}</span>
                      <span className="font-mono font-bold"><Money amount={turnoverCalc.tax} /></span>
                    </div>
                  </div>

                  <div className="space-y-1.5 rounded-lg bg-muted/40 p-2.5">
                    <div className="font-semibold">{d.calc.other.vacationTitle(vacationCalc.days)}</div>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={calcVacationDays}
                      onChange={(e) => setCalcVacationDays(e.target.value)}
                      className="h-8 font-mono text-xs"
                    />
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">{d.calc.other.vacationNetLabel}</span>
                      <span className="font-mono font-bold text-emerald-600"><Money amount={vacationCalc.netVacation} /></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: CONTRACT RISK ANALYZER */}
        <TabsContent value="contract" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{d.contract.uploadTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <input
                  ref={contractFileRef}
                  type="file"
                  accept={
                    subscription.limits.pdfAllowed
                      ? "image/jpeg,image/png,image/webp,application/pdf"
                      : "image/jpeg,image/png,image/webp"
                  }
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    handleSelectContractFile(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs gap-1.5"
                  onClick={() => contractFileRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {contractFileInfo
                    ? contractFileInfo.name
                    : subscription.limits.pdfAllowed
                    ? d.contract.attachPdfOrImage(Math.round(subscription.limits.pdfMaxBytes / (1024 * 1024)))
                    : d.contract.attachImageOnly}
                </Button>
                <textarea
                  rows={7}
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  placeholder={d.contract.textareaPlaceholder}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  type="button"
                  className="w-full gap-1.5"
                  disabled={isCheckingContract}
                  onClick={handleAnalyzeContract}
                >
                  {isCheckingContract ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileWarning className="h-3.5 w-3.5" />}
                  {d.contract.analyzeButton}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{d.contract.resultTitle}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3">
                {!contractResult ? (
                  <p className="text-muted-foreground py-8 text-center">
                    {d.contract.emptyResult}
                  </p>
                ) : (
                  <>
                    <div className="font-medium text-foreground">{contractResult.provodkaExplanation}</div>
                    {!Array.isArray(contractResult.risks) || contractResult.risks.length === 0 ? (
                      <div className="flex items-center gap-2 text-emerald-600 rounded-lg bg-emerald-500/10 p-3">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{d.contract.noRisksFound}</span>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {contractResult.risks.map((risk, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-foreground"
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 5: UNIFIED WORK BATCHES HISTORY (10 PER PAGE FROM DB) */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-indigo-500" />
                    {d.history.title} ({allHistoryCount})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {FEATURES.multiCompanyMode
                      ? d.history.descMultiCompany
                      : d.history.descSingleCompany}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { key: "all", label: d.history.filters.all },
                    { key: "reconcile", label: d.history.filters.reconcile },
                    { key: "document_scan", label: d.history.filters.document_scan },
                    { key: "contract_risk", label: d.history.filters.contract_risk },
                  ].map((opt) => (
                    <Button
                      key={opt.key}
                      type="button"
                      size="sm"
                      variant={historyTypeFilter === opt.key ? "default" : "outline"}
                      className="h-7 text-[11px] px-2.5"
                      onClick={() => {
                        setHistoryTypeFilter(opt.key as typeof historyTypeFilter);
                        setAllHistoryPage(1);
                      }}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {availableMonths.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground mr-1">{d.history.monthLabel}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={historyMonthFilter === "all" ? "default" : "outline"}
                    className="h-6 text-[11px] px-2"
                    onClick={() => {
                      setHistoryMonthFilter("all");
                      setAllHistoryPage(1);
                    }}
                  >
                    {d.history.filters.all}
                  </Button>
                  {availableMonths.map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={historyMonthFilter === m ? "default" : "outline"}
                      className="h-6 text-[11px] px-2 font-mono"
                      onClick={() => {
                        setHistoryMonthFilter(m);
                        setAllHistoryPage(1);
                      }}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              {!isContextReady || isLoadingHistory ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  {d.history.loading}
                </div>
              ) : !currentEntity?.id || allHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {FEATURES.multiCompanyMode && !currentEntity?.id
                    ? d.history.emptyNoEntity
                    : d.history.emptyNoItems}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{d.table.month}</TableHead>
                      <TableHead>{d.history.table.type}</TableHead>
                      <TableHead>{d.history.table.nameFile}</TableHead>
                      <TableHead className="text-right">{d.table.amount}</TableHead>
                      <TableHead>{d.table.status}</TableHead>
                      <TableHead className="text-right">{d.table.action}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allHistory.map((item) => {
                      const typeLabel =
                        item.batchType === "reconcile"
                          ? d.history.filters.reconcile
                          : item.batchType === "contract_risk"
                          ? d.history.filters.contract_risk
                          : d.history.filters.document_scan;
                      const amountVal =
                        item.batchType === "reconcile"
                          ? item.totalIncome + item.totalExpense
                          : Number(item.summaryJson?.totalAmount || item.totalExpense || item.totalIncome || 0);
                      return (
                        <TableRow key={item.id} className="text-xs">
                          <TableCell className="font-mono text-[11px] whitespace-nowrap">
                            {item.periodMonth}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {typeLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-[260px] truncate">{item.title}</TableCell>
                          <TableCell className="text-right font-mono">
                            <Money amount={amountVal} />
                          </TableCell>
                          <TableCell>
                            {item.status === "posted_to_ledger" ? (
                              <Badge variant="success" className="text-[10px]">{d.statuses.postedToLedger}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">{d.statuses.reviewed}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-[11px] gap-1 px-2"
                                disabled={openingBatchId === item.id}
                                onClick={() => handleOpenHistoryBatch(item)}
                              >
                                {openingBatchId === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <FolderOpen className="h-3 w-3" />
                                )}
                                {d.actions.open}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                aria-label={d.actions.delete}
                                disabled={deletingId === item.id}
                                onClick={() => handleDeleteWorkBatch(item.id)}
                              >
                                {deletingId === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {currentEntity?.id && (
                <PaginationBar
                  page={allHistoryPage}
                  pageSize={HISTORY_PAGE_SIZE}
                  totalCount={allHistoryCount}
                  isLoading={isLoadingHistory}
                  itemLabel={d.history.paginationItemLabel}
                  onPageChange={setAllHistoryPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssistantSuspenseFallback() {
  const { t } = useTranslation();
  return <div className="p-6 text-xs text-muted-foreground">{t.common.loading}</div>;
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<AssistantSuspenseFallback />}>
      <AssistantContent />
    </Suspense>
  );
}
