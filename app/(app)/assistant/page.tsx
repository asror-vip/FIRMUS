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
  AI_IMAGE_FORMAT_ERROR,
  compressImageForAi,
  computeSha256Hex,
  isSupportedAiImageFile,
  type CompressedImageResult,
} from "@/lib/utils/image-compression";
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

const TOOL_PAGE_TITLES: Record<string, string> = {
  chat: "AI Chat",
  scan: "Faktura / Chek Skaner",
  calc: "Kalkulyator",
  contract: "Shartnoma tahlili",
  history: "Saqlangan tarix",
};

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
    loadSavedScans();
  }, [loadSavedScans]);

  useEffect(() => {
    loadUnifiedHistory();
  }, [loadUnifiedHistory]);

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

  const vacationCalc = useMemo(
    () =>
      calculateVacationPayUz({
        monthlySalary: parseFloat(calcSalaryAmount) || 0,
        days: parseInt(calcVacationDays, 10) || 21,
      }),
    [calcSalaryAmount, calcVacationDays]
  );

  const handleDropImageToChat = async (file?: File | null) => {
    setIsDraggingOverChat(false);
    if (!file) return;
    if (!isSupportedAiImageFile(file)) {
      toast.error(AI_IMAGE_FORMAT_ERROR);
      return;
    }
    try {
      const compressed = await compressImageForAi(file, {
        maxDimension: subscription.limits.imageMaxDimensionPx,
        maxCompressedBytes: subscription.limits.imageMaxBytes,
      });
      setAttachedChatImage(compressed);
    } catch (err: any) {
      toast.error(err?.message || AI_IMAGE_FORMAT_ERROR);
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
          text: query || `📷 Rasm yuborildi: ${imgToSend?.fileName || "hujjat"}`,
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
            `${cachedHit ? "(Tarixdan topildi — 0 kredit) " : ""}` +
            `${scan.documentType}: ${scan.counterparty} — ${scan.totalAmount.toLocaleString("uz-UZ")} soʻm. ` +
            (scan.provodkaExplanation || "Provodka tayyorlandi."),
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
      if (!res.ok) throw new Error(data.error || "AI javob qaytarmadi");

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
      toast.error("AI javobida xatolik: " + err.message);
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
      toast.error("Bosh kitobga yozish uchun yuqoridan korxona qoʻshing");
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
      toast.success("Faktura/chek provodkasi Bosh kitobga atomik tarzda yozildi!");
    } catch (err: any) {
      toast.error("Bosh kitobga yozishda xatolik: " + err.message);
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
      if (!res.ok) throw new Error(data.error || "Amalni bajarib boʻlmadi");
      const updated: ChatTurn[] = messages.map((m) =>
        m.id === turn.id
          ? { ...m, actionStatus: decision === "approve" ? "approved" : "rejected" }
          : m
      );
      setMessages(updated);
      await persistChatThread(updated);
      if (decision === "approve") {
        window.dispatchEvent(new CustomEvent("firmus:refresh-data", { detail: { entityId: currentEntity.id } }));
        toast.success(data.message || "Provodka Bosh kitobga yozildi!");
      } else {
        toast.info("Taklif bekor qilindi.");
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
      reader.onerror = () => reject(new Error("Faylni oʻqib boʻlmadi"));
      reader.readAsDataURL(file);
    });

  const handleSelectScanFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.type === "application/pdf") {
        if (!subscription.limits.pdfAllowed) {
          toast.info("PDF yuklash Pro va Pro+ tariflarida mavjud. Obunalar boʻlimidan 7 kunlik bepul sinovni yoqing.");
          return;
        }
        if (file.size > subscription.limits.pdfMaxBytes) {
          const maxMb = Math.round(subscription.limits.pdfMaxBytes / (1024 * 1024));
          toast.error(`PDF hajmi ${subscription.planName} tarifi limiti (${maxMb} MB) dan oshmasligi kerak`);
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
        toast.error("Rasm yoki PDF formati notoʻgʻri. PNG, JPG, WEBP yoki PDF yuklang.");
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
      toast.error("Avval faktura, chek yoki TTN rasmini (yoki PDF) tanlang");
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
      if (!res.ok) throw new Error(data.error || "Hujjatni tahlil qilib boʻlmadi");
      setScanResult(data);
      setActiveScanBatchId(data.savedBatchId || null);

      if (data.cachedHit) {
        toast.success("Ushbu hujjat avval oʻqilgan — tarixdan olindi (0 kredit)!");
        return;
      }

      if (currentEntity?.id) {
        try {
          const saved = await saveWorkBatch({
            entityId: currentEntity.id,
            batchType: "document_scan",
            periodMonth: /^\d{4}-\d{2}/.test(data.date || "") ? data.date.slice(0, 7) : undefined,
            title: `${data.documentType || "Hujjat"} ${data.documentNumber || ""} (${data.counterparty || ""})`.trim(),
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

      toast.success("Hujjat oʻqildi!");
    } catch (err: any) {
      toast.error("Skaner xatosi: " + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePostScannedToLedger = async () => {
    if (!currentEntity?.id) {
      toast.error("Bosh kitobga yozish uchun yuqoridan korxona qoʻshing");
      return;
    }
    if (!scanResult || scanResult.totalAmount <= 0) {
      toast.error("Yozish uchun summa > 0 boʻlishi kerak");
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
      toast.success("Faktura/chek provodkasi Bosh kitobga atomik tarzda yozildi!");
    } catch (err: any) {
      toast.error("Bosh kitobga yozishda xatolik: " + err.message);
    } finally {
      setIsPostingDoc(false);
    }
  };

  const handleSelectContractFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.type === "application/pdf") {
        if (!subscription.limits.pdfAllowed) {
          toast.info("Shartnoma PDF yuklash Pro va Pro+ tariflarida mavjud. Obunalar boʻlimidan 7 kunlik bepul sinovni yoqing.");
          return;
        }
        if (file.size > subscription.limits.pdfMaxBytes) {
          const maxMb = Math.round(subscription.limits.pdfMaxBytes / (1024 * 1024));
          toast.error(`PDF hajmi ${subscription.planName} tarifi limiti (${maxMb} MB) dan oshmasligi kerak`);
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
        toast.error("Shartnoma uchun faqat PNG, JPG, WEBP rasm yoki PDF fayl yuklang.");
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
      toast.error("Shartnoma matnini joylashtiring yoki PDF/rasm fayl yuklang");
      return;
    }
    if (contractText.trim().length > subscription.limits.contractTextMaxChars) {
      toast.error(
        `Shartnoma matni ${subscription.planName} tarifi limiti (${subscription.limits.contractTextMaxChars.toLocaleString("uz-UZ")} belgi) dan oshib ketdi.`
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
      if (!res.ok) throw new Error(data.error || "Shartnomani tahlil qilib boʻlmadi");
      setContractResult(data);

      if (data.cachedHit) {
        toast.success("Ushbu shartnoma avval tekshirilgan — tarixdan olindi (0 kredit)!");
        return;
      }

      if (currentEntity?.id) {
        try {
          await saveWorkBatch({
            entityId: currentEntity.id,
            batchType: "contract_risk",
            title: `Shartnoma: ${contractFileInfo?.name || data.counterparty || "Matnli tekshiruv"}`.slice(0, 180),
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

      toast.success("Shartnoma xatarlari tahlil qilindi!");
    } catch (err: any) {
      toast.error("Tahlilda xatolik: " + err.message);
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
        toast.error("Saqlangan hujjat maʼlumoti topilmadi");
        return;
      }
      if (batch.batchType === "document_scan") {
        setScanResult(full.sanitizedPayload as ScannedDocResult);
        setScanFileName(full.bankFileName || full.title);
        setScanPreviewUrl(null);
        setActiveScanBatchId(full.id);
        handleTabChange("scan");
        toast.success("Saqlangan hujjat ochildi");
      } else {
        setContractResult(full.sanitizedPayload as ScannedDocResult);
        handleTabChange("contract");
        toast.success("Saqlangan shartnoma tahlili ochildi");
      }
    } catch (err: any) {
      toast.error("Ochishda xatolik: " + err.message);
    } finally {
      setOpeningBatchId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {FEATURES.fullAccountingErp
            ? "AI Yordamchi"
            : TOOL_PAGE_TITLES[activeTab] || "AI Yordamchi"}
        </h1>

        <Link
          href="/billing"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted/70 px-3 py-1 text-xs transition-colors self-start sm:self-auto"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span className="font-medium text-foreground">
            {subscription.isTrialActive
              ? "Pro (Sinov)"
              : subscription.trialAvailable
              ? `${subscription.planName} • 7 kun bepul Pro`
              : subscription.planName}
          </span>
        </Link>
      </div>

      <QuickEntityBanner />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        {FEATURES.fullAccountingErp && (
          <TabsList className="h-9 text-xs flex-wrap">
            <TabsTrigger value="chat" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              AI Chat
            </TabsTrigger>
            <TabsTrigger value="scan" className="gap-1.5 text-xs">
              <Camera className="h-3.5 w-3.5" />
              Faktura / Chek Skaner
            </TabsTrigger>
            <TabsTrigger value="calc" className="gap-1.5 text-xs">
              <Calculator className="h-3.5 w-3.5" />
              Kalkulyator
            </TabsTrigger>
            <TabsTrigger value="contract" className="gap-1.5 text-xs">
              <FileWarning className="h-3.5 w-3.5" />
              Shartnoma tahlili
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs">
              <History className="h-3.5 w-3.5" />
              Tarix ({allHistoryCount})
            </TabsTrigger>
          </TabsList>
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
                      title={showChatSidebar ? "Chatlar tarixini yopish" : "Chatlar tarixini ochish"}
                      onClick={() => setShowChatSidebar((s) => !s)}
                    >
                      <PanelLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground">
                      {activeThreadId ? "Saqlangan suhbat" : "Yangi suhbat"}
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
                    <span>Yangi chat</span>
                  </Button>
                </div>

                <CardContent className="pt-4 space-y-3 flex-1 flex flex-col justify-between min-h-[420px]">
                  <div
                    ref={chatScrollRef}
                    className="flex-1 flex flex-col space-y-4 max-h-[440px] overflow-y-auto pr-1"
                  >
                    {messages.length === 0 && !isSending ? (
                      <AiEmptyHero greeting="Xush kelibsiz. Nima yordam bera olaman?" />
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
                                  alt="Yuklangan rasm"
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
                                          Tasdiqlash
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-[11px]"
                                          disabled={executingId === m.id}
                                          onClick={() => handleChatProposal(m, "reject")}
                                        >
                                          Rad etish
                                        </Button>
                                      </div>
                                    ) : (
                                      <Badge variant={m.actionStatus === "approved" ? "success" : "outline"} className="text-[10px]">
                                        {m.actionStatus === "approved" ? "Bosh kitobga yozildi" : "Bekor qilindi"}
                                      </Badge>
                                    )}
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
                <CardTitle className="text-sm font-semibold">Faktura, TTN yoki Chek yuklash</CardTitle>
                <CardDescription className="text-xs">
                  {subscription.limits.pdfAllowed
                    ? `PNG, JPG, WEBP yoki PDF (max ${Math.round(subscription.limits.pdfMaxBytes / (1024 * 1024))} MB)`
                    : "PNG, JPG, WEBP (PDF uchun Pro tarif)"}
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
                  onChange={(e) => handleSelectScanFile(e.target.files?.[0])}
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
                      (subscription.limits.pdfAllowed ? "Rasm yoki PDF tanlash" : "Rasm tanlash (PNG, JPG, WEBP)")}
                  </span>
                </Button>
                {scanPreviewUrl && (
                  <div className="rounded-md border border-border overflow-hidden max-h-48 flex justify-center bg-muted/30">
                    <img src={scanPreviewUrl} alt="Yuklangan hujjat" className="max-h-48 object-contain" />
                  </div>
                )}
                <Button
                  type="button"
                  className="w-full gap-1.5"
                  disabled={isScanning || !scanBase64}
                  onClick={handleRunScan}
                >
                  {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Tahlil qilish
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Natija</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3">
                {!scanResult ? (
                  <p className="text-muted-foreground py-8 text-center">
                    Hujjat tanlanmagan
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground">Hujjat turi</span>
                        <div className="font-semibold">{scanResult.documentType} {scanResult.documentNumber}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Sana</span>
                        <div className="font-mono">{scanResult.date}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Kontragent</span>
                        <div className="font-semibold">{scanResult.counterparty}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">STIR</span>
                        <div className="font-mono">{scanResult.counterpartyStir || "Aniqlanmadi"}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">Jami summa</span>
                        <div className="font-mono font-bold text-foreground">
                          <Money amount={scanResult.totalAmount} />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">QQS (12%)</span>
                        <div className="font-mono font-semibold text-emerald-600">
                          <Money amount={scanResult.vatAmount} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-1">
                      <div className="font-semibold text-foreground">
                        Provodka: Dt {scanResult.suggestedDebitCode} / Kt {scanResult.suggestedCreditCode}
                        {scanResult.vatAmount > 0 ? ` (+ QQS ${scanResult.vatAccountCode})` : ""}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{scanResult.provodkaExplanation}</p>
                    </div>

                    {scanResult.items.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow className="text-[10px]">
                              <TableHead>Tovar / Xizmat</TableHead>
                              <TableHead>MXIK</TableHead>
                              <TableHead className="text-right">Summa</TableHead>
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
                            `Kontragent: ${scanResult.counterparty}${scanResult.counterpartyStir ? ` (STIR: ${scanResult.counterpartyStir})` : ""}`,
                            `Jami summa: ${scanResult.totalAmount.toLocaleString("uz-UZ")} soʻm${
                              scanResult.vatAmount > 0 ? ` | QQS 12%: ${scanResult.vatAmount.toLocaleString("uz-UZ")} soʻm` : ""
                            }`,
                            `Provodka: Dt ${scanResult.suggestedDebitCode} / Kt ${scanResult.suggestedCreditCode}${
                              scanResult.vatAmount > 0 ? ` (+ QQS ${scanResult.vatAccountCode})` : ""
                            }`,
                          ].join("\n");
                          try {
                            await navigator.clipboard.writeText(text);
                            toast.success("Natija va provodka nusxalandi");
                          } catch {
                            toast.error("Nusxalab boʻlmadi");
                          }
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Natijani nusxalash
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
                          Bosh kitobga atomik yozish
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
                  Saqlangan hujjatlar ({savedScansCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {savedScans.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    {isLoadingScans ? "Yuklanmoqda..." : "Hali saqlangan chek yoki fakturalar yoʻq."}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Oy</TableHead>
                        <TableHead>Hujjat / Kontragent</TableHead>
                        <TableHead className="text-right">Summa</TableHead>
                        <TableHead>Holat</TableHead>
                        <TableHead className="text-right">Amal</TableHead>
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
                              <Badge variant="success" className="text-[10px]">Bosh kitobda</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">Tekshirilgan</Badge>
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
                                Ochish
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                aria-label="Oʻchirish"
                                onClick={async () => {
                                  await deleteWorkBatch(s.id);
                                  if (activeScanBatchId === s.id) setActiveScanBatchId(null);
                                  await Promise.all([loadSavedScans(), loadUnifiedHistory()]);
                                  toast.success("Tarixdan oʻchirildi");
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
                  itemLabel="hujjat"
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
                <CardTitle className="text-sm font-semibold">Ish haqi va soliq kalkulyatori (JShDS 12%)</CardTitle>
                <CardDescription className="text-xs">
                  {payrollCalc.taxArticleRef}
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
                    Brutto → Qoʻlga tegadi
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={calcSalaryDir === "net_to_gross" ? "default" : "outline"}
                    className="h-7 text-[11px] flex-1"
                    onClick={() => setCalcSalaryDir("net_to_gross")}
                  >
                    Qoʻlga tegadi → Brutto
                  </Button>
                </div>

                <Input
                  type="number"
                  min={0}
                  value={calcSalaryAmount}
                  onChange={(e) => setCalcSalaryAmount(e.target.value)}
                  className="h-9 font-mono text-xs"
                  placeholder="Summa"
                />

                <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hisoblangan (Brutto):</span>
                    <span className="font-mono font-semibold"><Money amount={payrollCalc.gross} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">JShDS (12%, shundan 0.1% INPS):</span>
                    <span className="font-mono text-rose-600">-<Money amount={payrollCalc.jshds12} /></span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1.5">
                    <span className="font-semibold">Xodim qoʻliga tegadi (Netto):</span>
                    <span className="font-mono font-bold text-emerald-600"><Money amount={payrollCalc.net} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ish beruvchi ijtimoiy soligʻi (12%):</span>
                    <span className="font-mono"><Money amount={payrollCalc.socialTax12} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ish beruvchining jami xarajati:</span>
                    <span className="font-mono font-semibold"><Money amount={payrollCalc.totalEmployerCost} /></span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-foreground">Provodkalar:</div>
                  {payrollCalc.provodka.map((p, i) => (
                    <div key={i} className="flex justify-between text-[11px] font-mono text-muted-foreground">
                      <span>Dt {p.debitCode} / Kt {p.creditCode} ({p.description})</span>
                      <span><Money amount={p.amount} /></span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* VAT + Turnover + Vacation */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">QQS (12%) tezkor hisoblagich</CardTitle>
                  <CardDescription className="text-xs">{vatCalc.taxArticleRef}</CardDescription>
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
                      Ichidan QQS ajratish (×12/112)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={calcVatMode === "excluded" ? "default" : "outline"}
                      className="h-7 text-[11px] flex-1"
                      onClick={() => setCalcVatMode("excluded")}
                    >
                      Ustiga 12% QQS qoʻshish
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
                      <div className="text-[10px] text-muted-foreground">QQSsiz sof</div>
                      <div className="font-mono font-semibold"><Money amount={vatCalc.net} /></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">QQS 12%</div>
                      <div className="font-mono font-bold text-indigo-600"><Money amount={vatCalc.vat12} /></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">Jami</div>
                      <div className="font-mono font-bold"><Money amount={vatCalc.total} /></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Aylanmadan soliq (4%) va Taʼtil puli</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1.5 rounded-lg bg-muted/40 p-2.5">
                    <div className="font-semibold">Aylanmadan soliq (4%)</div>
                    <Input
                      type="number"
                      min={0}
                      value={calcTurnoverRev}
                      onChange={(e) => setCalcTurnoverRev(e.target.value)}
                      className="h-8 font-mono text-xs"
                    />
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Soliq (9430/6410):</span>
                      <span className="font-mono font-bold"><Money amount={turnoverCalc.tax} /></span>
                    </div>
                  </div>

                  <div className="space-y-1.5 rounded-lg bg-muted/40 p-2.5">
                    <div className="font-semibold">Taʼtil puli ({vacationCalc.days} kun)</div>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={calcVacationDays}
                      onChange={(e) => setCalcVacationDays(e.target.value)}
                      className="h-8 font-mono text-xs"
                    />
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Qoʻliga tegadi:</span>
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
                <CardTitle className="text-sm font-semibold">Shartnoma yuklash</CardTitle>
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
                  onChange={(e) => handleSelectContractFile(e.target.files?.[0])}
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
                    ? `PDF yoki rasm biriktirish (max ${Math.round(subscription.limits.pdfMaxBytes / (1024 * 1024))} MB)`
                    : "Rasm biriktirish (PDF uchun Pro tarif)"}
                </Button>
                <textarea
                  rows={7}
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  placeholder="Shartnoma matni"
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  type="button"
                  className="w-full gap-1.5"
                  disabled={isCheckingContract}
                  onClick={handleAnalyzeContract}
                >
                  {isCheckingContract ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileWarning className="h-3.5 w-3.5" />}
                  Tekshirish
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Natija</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3">
                {!contractResult ? (
                  <p className="text-muted-foreground py-8 text-center">
                    Hujjat kiritilmagan
                  </p>
                ) : (
                  <>
                    <div className="font-medium text-foreground">{contractResult.provodkaExplanation}</div>
                    {contractResult.risks.length === 0 ? (
                      <div className="flex items-center gap-2 text-emerald-600 rounded-lg bg-emerald-500/10 p-3">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Kritik moliyaviy yoki soliq xatari topilmadi.</span>
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
                    Saqlangan ishlar tarixi ({allHistoryCount})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {FEATURES.multiCompanyMode
                      ? "Korxona va oy kesimida barcha yuklangan bank/1C fayllari, chek skanerlari va shartnomalar (sahifada 10 tadan bazadan yuklanadi)."
                      : "Oy kesimida barcha bank/1C solishtirishlari, chek skanerlari va shartnomalar (sahifada 10 tadan bazadan yuklanadi)."}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { key: "all", label: "Barchasi" },
                    { key: "reconcile", label: "Bank ↔ 1C" },
                    { key: "document_scan", label: "Chek / Faktura" },
                    { key: "contract_risk", label: "Shartnoma" },
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
                  <span className="text-[11px] text-muted-foreground mr-1">Oy:</span>
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
                    Barchasi
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
                  Tarix yuklanmoqda...
                </div>
              ) : !currentEntity?.id || allHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {FEATURES.multiCompanyMode && !currentEntity?.id
                    ? "Tarixni koʻrish uchun yuqoridan korxona tanlang."
                    : "Hozircha saqlangan ishlar tarixi yoʻq. Chek rasmini yuboring yoki Bank ↔ 1C fayl yuklang."}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Oy</TableHead>
                      <TableHead>Turi</TableHead>
                      <TableHead>Nomi / Fayl</TableHead>
                      <TableHead className="text-right">Summa</TableHead>
                      <TableHead>Holat</TableHead>
                      <TableHead className="text-right">Amal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allHistory.map((item) => {
                      const typeLabel =
                        item.batchType === "reconcile"
                          ? "Bank ↔ 1C"
                          : item.batchType === "contract_risk"
                          ? "Shartnoma"
                          : "Chek / Faktura";
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
                              <Badge variant="success" className="text-[10px]">Bosh kitobda</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">Tekshirilgan</Badge>
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
                                Ochish
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                aria-label="Oʻchirish"
                                onClick={async () => {
                                  await deleteWorkBatch(item.id);
                                  if (activeScanBatchId === item.id) setActiveScanBatchId(null);
                                  await Promise.all([loadUnifiedHistory(), loadSavedScans()]);
                                  toast.success("Tarixdan oʻchirildi");
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
                  itemLabel="ish"
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

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Yuklanmoqda...</div>}>
      <AssistantContent />
    </Suspense>
  );
}
