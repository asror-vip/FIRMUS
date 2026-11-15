"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/mock/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Send, Wrench, CheckCircle2, XCircle, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
  toolCalls?: string[];
  actionProposed?: {
    title: string;
    amount?: string;
    accounts?: string;
  };
}

export function AiDrawer() {
  const { isAiDrawerOpen, setIsAiDrawerOpen } = useAppState();
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-1",
      sender: "ai",
      text: t.aiDrawer.greeting,
      time: "14:30",
    },
    {
      id: "m-2",
      sender: "user",
      text: t.aiDrawer.prompts.exceptions,
      time: "14:32",
    },
    {
      id: "m-3",
      sender: "ai",
      text: "Universal Logistics Partners: E-SF summasi 14,800,000, lekin bank toʻlovi 13,500,000. Qoldiq 1,300,000 boʻyicha tuzatuvchi hisob-faktura shakllantirish taklif etiladi.",
      time: "14:32",
      toolCalls: ["search_documents", "get_bank_transactions"],
      actionProposed: {
        title: "Tuzatuvchi E-SF soʻrovi",
        amount: "1,300,000",
        accounts: "Debet 6010 / Kredit 5110",
      },
    },
  ]);

  if (!isAiDrawerOpen) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "user",
      text: userText,
      time: t.common.now,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiReply: ChatMessage = {
        id: `m-${Date.now() + 1}`,
        sender: "ai",
        text: `"${userText}": ${t.aiDrawer.approvalRequired}`,
        time: t.common.now,
        toolCalls: ["reconcile_transaction"],
        actionProposed: {
          title: t.pages.transactions.batchApprove,
          amount: "1,200,000",
        },
      };
      setMessages((prev) => [...prev, aiReply]);
    }, 800);
  };

  const handleQuickPrompt = (promptText: string) => {
    setInput(promptText);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-border bg-card shadow-2xl duration-200 animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">{t.aiDrawer.title}</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                GPT-6
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t.aiDrawer.online}
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

      {/* Suggested Prompts */}
      <div className="border-b border-border bg-muted/40 p-2.5">
        <div className="text-[10px] font-medium text-muted-foreground mb-1.5 px-1">
          {t.aiDrawer.suggestedTitle}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            t.aiDrawer.prompts.exceptions,
            t.aiDrawer.prompts.bank,
            t.aiDrawer.prompts.tax,
          ].map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleQuickPrompt(prompt)}
              className="rounded-md border border-border/80 bg-background px-2 py-1 text-[11px] text-foreground hover:bg-accent transition-colors text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col max-w-[92%]",
              msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div
              className={cn(
                "rounded-xl p-3 leading-relaxed shadow-sm",
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 border border-border text-foreground"
              )}
            >
              <p>{msg.text}</p>

              {/* Verified Status */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>{t.aiDrawer.verified}</span>
                </div>
              )}

              {/* Proposed Action Card */}
              {msg.actionProposed && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-foreground text-[11px]">
                      {msg.actionProposed.title}
                    </span>
                    <Badge variant="warning" className="text-[9px] px-1 py-0 h-4">
                      {t.common.pending}
                    </Badge>
                  </div>

                  {msg.actionProposed.amount && (
                    <div className="text-[11px] font-mono text-muted-foreground">
                      {t.common.amount}: <span className="font-semibold text-foreground">{msg.actionProposed.amount} {t.common.currency}</span>
                    </div>
                  )}

                  {msg.actionProposed.accounts && (
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {t.pages.accounting.code}: {msg.actionProposed.accounts}
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="success"
                      className="h-7 px-2.5 text-[11px]"
                      onClick={() => toast.success(t.common.approve)}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {t.aiDrawer.approveAction}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => toast.info(t.common.reject)}
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      {t.aiDrawer.rejectAction}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <span className="text-[10px] text-muted-foreground px-1 mt-1">
              {msg.time}
            </span>
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-3 bg-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.aiDrawer.inputPlaceholder}
            className="text-xs h-9"
          />
          <Button type="submit" size="sm" className="h-9 px-3 shrink-0">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
