"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAppState } from "@/lib/context/app-state";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { AgentActionProposal } from "@/lib/ai/agent-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChatImageInputBar } from "@/components/shared/chat-image-input-bar";
import { ChatScanCard } from "@/components/shared/chat-scan-card";
import {
  AiEmptyHero,
  AiThinkingBubble,
  AiStreamingMessage,
} from "@/components/shared/ai-chat-visuals";
import {
  AI_IMAGE_FORMAT_ERROR,
  compressImageForAi,
  isSupportedAiImageFile,
  type CompressedImageResult,
} from "@/lib/utils/image-compression";
import {
  postScannedDocToLedger,
  scanCompressedImageAndSave,
  type ScannedDocResult,
} from "@/lib/services/doc-scan-client";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
  imagePreviewUrl?: string;
  toolCalls?: string[];
  mode?: string;
  modelUsed?: string;
  actionStatus?: "pending" | "approved" | "rejected";
  actionProposed?: AgentActionProposal;
  scanResult?: ScannedDocResult;
  scanBatchId?: string | null;
  scanDuplicate?: boolean;
  scanPosted?: boolean;
  isFresh?: boolean;
}

export function AiDrawer() {
  const { isAiDrawerOpen, setIsAiDrawerOpen, currentEntity } = useAppState();
  const { t } = useTranslation();
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [input, setInput] = useState("");
  const [attachedImage, setAttachedImage] = useState<CompressedImageResult | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [executingMsgId, setExecutingMsgId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const scrollToBottom = useCallback(() => {
    const el = scrollAreaRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isSending, scrollToBottom]);

  useEffect(() => {
    setMessages([]);
    setInput("");
    setAttachedImage(null);
  }, [currentEntity?.id]);

  if (!isAiDrawerOpen) return null;

  const handleDropFile = async (file?: File | null) => {
    setIsDraggingOver(false);
    if (!file) return;
    if (!isSupportedAiImageFile(file)) {
      toast.error(AI_IMAGE_FORMAT_ERROR);
      return;
    }
    try {
      const compressed = await compressImageForAi(file);
      setAttachedImage(compressed);
    } catch (err: any) {
      toast.error(err?.message || AI_IMAGE_FORMAT_ERROR);
    }
  };

  const sendMessageText = async (userText: string, imgOverride?: CompressedImageResult | null) => {
    const imgToSend = imgOverride !== undefined ? imgOverride : attachedImage;
    if ((!userText.trim() && !imgToSend) || isSending) return;
    const nowStr = new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });

    const newMsg: ChatMessage = {
      id: `m-u-${Date.now()}`,
      sender: "user",
      text: userText.trim() || `📷 Rasm yuborildi: ${imgToSend?.fileName || "hujjat"}`,
      time: nowStr,
      imagePreviewUrl: imgToSend?.dataUrl,
    };
    const historySnapshot = messages
      .filter((m) => m.id !== "m-init" && m.text.trim().length > 0)
      .slice(-8)
      .map((m) => ({ sender: m.sender, text: m.text.slice(0, 1500) }));

    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setAttachedImage(null);
    setIsSending(true);

    try {
      if (imgToSend) {
        const { scan, savedBatchId, isDuplicate } = await scanCompressedImageAndSave({
          dataUrl: imgToSend.dataUrl,
          mimeType: imgToSend.mimeType,
          fileName: imgToSend.fileName,
          userNote: userText.trim(),
          entityId: currentEntity?.id,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `m-a-${Date.now()}`,
            sender: "ai",
            text:
              `${scan.documentType}: ${scan.counterparty} — ${scan.totalAmount.toLocaleString("uz-UZ")} soʻm. ` +
              (scan.provodkaExplanation || "Provodka tayyorlandi."),
            time: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
            mode: scan.mode,
            modelUsed: scan.modelUsed,
            scanResult: scan,
            scanBatchId: savedBatchId,
            scanDuplicate: isDuplicate,
            scanPosted: false,
            isFresh: true,
          },
        ]);
        return;
      }

      const res = await fetch("/api/ai-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          entityId: currentEntity?.id,
          history: historySnapshot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AI Copilot javob qaytarmadi");
      }

      const aiReply: ChatMessage = {
        id: `m-a-${Date.now()}`,
        sender: "ai",
        text: data.reply,
        time: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
        toolCalls: data.toolCalls,
        mode: data.mode,
        modelUsed: data.modelUsed,
        actionStatus: data.actionProposed ? "pending" : undefined,
        actionProposed: data.actionProposed,
        isFresh: true,
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      toast.error("AI Copilot xatosi: " + err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: `m-err-${Date.now()}`,
          sender: "ai",
          text: `Xatolik yuz berdi: ${err.message}`,
          time: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handlePostScanMessage = async (msg: ChatMessage, editedScan: ScannedDocResult) => {
    if (!currentEntity?.id) {
      toast.error("Bosh kitobga yozish uchun avval korxona tanlang");
      return;
    }
    try {
      await postScannedDocToLedger({
        entityId: currentEntity.id,
        scan: editedScan,
        batchId: msg.scanBatchId,
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, scanPosted: true, scanResult: editedScan } : m))
      );
      toast.success("Faktura/chek provodkasi Bosh kitobga atomik tarzda yozildi!");
    } catch (err: any) {
      toast.error("Bosh kitobga yozishda xatolik: " + err.message);
    }
  };

  const handleProposedAction = async (msg: ChatMessage, decision: "approve" | "reject") => {
    if (!msg.actionProposed || !currentEntity?.id || executingMsgId) return;
    setExecutingMsgId(msg.id);

    try {
      const res = await fetch("/api/ai-copilot/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: currentEntity.id,
          decision,
          modelUsed: msg.modelUsed || "firmus-agent",
          proposal: msg.actionProposed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Amalni bajarishda xatolik");
      }

      window.dispatchEvent(
        new CustomEvent("firmus:refresh-data", {
          detail: { entityId: currentEntity.id, actionType: msg.actionProposed.type, decision },
        })
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, actionStatus: decision === "approve" ? "approved" : "rejected" }
            : m
        )
      );
      toast.success(
        data.message ||
          (decision === "approve"
            ? "Amal Supabase bazasida muvaffaqiyatli tasdiqlandi!"
            : "Amal rad etildi va bazada yangilandi.")
      );
    } catch (err: any) {
      toast.error("Amalni bajarishda xatolik: " + err.message);
    } finally {
      setExecutingMsgId(null);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        handleDropFile(e.dataTransfer?.files?.[0]);
      }}
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l bg-card shadow-2xl duration-200 animate-in slide-in-from-right",
        isDraggingOver ? "border-indigo-500 ring-2 ring-indigo-500/40" : "border-border"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">{t.aiDrawer.title}</span>
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {currentEntity?.tradeName || currentEntity?.name}
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setIsAiDrawerOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages area */}
      <div
        ref={scrollAreaRef}
        className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 text-xs"
      >
        {messages.length === 0 && !isSending ? (
          <AiEmptyHero greeting={t.aiDrawer.greeting} compact />
        ) : (
          messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col max-w-[94%] animate-in fade-in slide-in-from-bottom-1 duration-200",
              msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            {msg.sender === "user" ? (
              <div className="rounded-2xl rounded-tr-sm bg-indigo-600 px-3.5 py-2.5 text-white leading-relaxed shadow-sm whitespace-pre-line">
                {msg.imagePreviewUrl && (
                  <img
                    src={msg.imagePreviewUrl}
                    alt="Yuborilgan chek"
                    className="mb-2 max-h-40 rounded-lg border border-white/20 object-contain"
                  />
                )}
                <p>{msg.text}</p>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 w-full">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/25">
                  <Sparkles className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm bg-muted/50 border border-border/70 px-3.5 py-2.5 shadow-sm">
                  <AiStreamingMessage
                    text={msg.text}
                    animate={Boolean(msg.isFresh)}
                    onTickScroll={scrollToBottom}
                    onStreamDone={() =>
                      setMessages((prev) =>
                        prev.map((m) => (m.id === msg.id ? { ...m, isFresh: false } : m))
                      )
                    }
                  />

                  {/* Chat OCR Scan Result Card */}
                  {msg.scanResult && !msg.isFresh && (
                    <ChatScanCard
                      scan={msg.scanResult}
                      isDuplicate={msg.scanDuplicate}
                      posted={msg.scanPosted}
                      canPost={Boolean(currentEntity?.id)}
                      onPostToLedger={(edited) => handlePostScanMessage(msg, edited)}
                    />
                  )}

                  {/* Proposed Action Card */}
                  {msg.actionProposed && !msg.isFresh && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-foreground text-[11px]">
                      {msg.actionProposed.title}
                    </span>
                    <Badge
                      variant={
                        msg.actionStatus === "approved"
                          ? "success"
                          : msg.actionStatus === "rejected"
                          ? "destructive"
                          : "warning"
                      }
                      className="text-[9px] px-1.5 py-0 h-4 shrink-0"
                    >
                      {msg.actionStatus === "approved"
                        ? "Tasdiqlandi"
                        : msg.actionStatus === "rejected"
                        ? "Rad etildi"
                        : t.common.pending}
                    </Badge>
                  </div>

                  {"summary" in msg.actionProposed && msg.actionProposed.summary && (
                    <div className="text-[10px] text-muted-foreground mb-1">
                      {msg.actionProposed.summary}
                    </div>
                  )}

                  {"amount" in msg.actionProposed && msg.actionProposed.amount && (
                    <div className="text-[11px] font-mono text-muted-foreground">
                      {t.common.amount}:{" "}
                      <span className="font-semibold text-foreground">{msg.actionProposed.amount}</span>
                    </div>
                  )}

                  {"accounts" in msg.actionProposed && msg.actionProposed.accounts && (
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {t.pages.accounting.code}: {msg.actionProposed.accounts}
                    </div>
                  )}

                  {/* Multi-line preview for 21-BHMS Journal Entry */}
                  {msg.actionProposed.type === "journal_entry" && (
                    <div className="mt-2 rounded border border-border/60 bg-background/80 p-1.5 space-y-1 font-mono text-[10px]">
                      {msg.actionProposed.payload.lines.map((line, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <span className="truncate">
                            {line.account_code} {line.account_name}
                          </span>
                          <span className="shrink-0 font-semibold">
                            {line.debit_amount > 0
                              ? `Dt ${line.debit_amount.toLocaleString("uz-UZ")}`
                              : `Kt ${line.credit_amount.toLocaleString("uz-UZ")}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.actionStatus === "pending" && (
                    <div className="mt-2.5 flex items-center gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="success"
                        className="h-7 px-2.5 text-[11px]"
                        disabled={executingMsgId === msg.id}
                        onClick={() => handleProposedAction(msg, "approve")}
                      >
                        {executingMsgId === msg.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {t.aiDrawer.approveAction}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        disabled={executingMsgId === msg.id}
                        onClick={() => handleProposedAction(msg, "reject")}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        {t.aiDrawer.rejectAction}
                      </Button>
                    </div>
                  )}
                </div>
                  )}
                </div>
              </div>
            )}

            <span className="text-[10px] text-muted-foreground px-1 mt-1">
              {msg.time}
            </span>
          </div>
        )))}

        {isSending && <AiThinkingBubble />}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-3 bg-card">
        <ChatImageInputBar
          value={input}
          onChange={setInput}
          attachedImage={attachedImage}
          onAttachImage={setAttachedImage}
          isSending={isSending}
          compact
          placeholder="Xabar yozing..."
          onSubmit={() => sendMessageText(input)}
        />
      </div>
    </div>
  );
}
