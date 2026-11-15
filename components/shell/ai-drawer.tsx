"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/mock/store";
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
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-1",
      sender: "ai",
      text: "Assalomu alaykum! Men AUVRIO operatsion tizimining GPT-6 Luna AI koordinatori boʻlaman. Bugun 6 ta yangi istisno aniqlandi va 14 ta Didox hisob-fakturasi avtomatik tekshirildi. Sizga qanday yordam bera olaman?",
      time: "14:30",
    },
    {
      id: "m-2",
      sender: "user",
      text: "Bugungi eng muhim istisnolarni ko‘rsat va ularni hal qilishni taklif ber.",
      time: "14:32",
    },
    {
      id: "m-3",
      sender: "ai",
      text: "Didox va bank tushumlari boʻyicha eng jiddiy holat: Universal Logistics Partners MCHJ dan kelgan E-SF summasi 14,800,000 soʻm, biroq bankdan 13,500,000 soʻm toʻlangan. Qoldiq 1,300,000 soʻm (QQS hisobiga farq) boʻyicha tuzatuvchi hisob-faktura shakllantirishni taklif qilaman.",
      time: "14:32",
      toolCalls: ["search_documents", "get_bank_transactions", "get_accounting_anomalies"],
      actionProposed: {
        title: "Korrektirovochnyy E-SF soʻrovi joʻnatish",
        amount: "1,300,000 soʻm",
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
      time: "Hozir",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiReply: ChatMessage = {
        id: `m-${Date.now() + 1}`,
        sender: "ai",
        text: `"${userText}" soʻrovingiz boʻyicha maʼlumotlar tekshirildi. Tizimda 1C OData va Didox koʻrsatkichlari solishtirildi. Operatsiyani yakunlash uchun buxgalter tasdigʻi zarur.`,
        time: "Hozir",
        toolCalls: ["validate_journal_entry", "reconcile_transaction"],
        actionProposed: {
          title: "Hisob-fakturani avtomatik yopish taklifi",
          amount: "Tekshiruv kutilmoqda",
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
              <span className="text-xs font-semibold text-foreground">AUVRIO Copilot</span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
                gpt-6-luna
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Responses API onlayn
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
          Tezkor amallar (Suggested prompts):
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            "Bugungi istisnolarni ko‘rsat",
            "Bank tranzaksiyalarini tasnifla",
            "Soliq hisobotini tayyorla",
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

              {/* Tool Calls Chips */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-border/40">
                  <div className="text-[10px] text-muted-foreground font-mono mb-1 flex items-center gap-1">
                    <Wrench className="h-2.5 w-2.5" />
                    Ishlatilgan Go tool funksiyalari:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {msg.toolCalls.map((t, idx) => (
                      <span
                        key={idx}
                        className="font-mono text-[9px] bg-background/80 border border-border px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-semibold"
                      >
                        {t}()
                      </span>
                    ))}
                  </div>
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
                      Tasdiqlash kerak
                    </Badge>
                  </div>

                  {msg.actionProposed.amount && (
                    <div className="text-[11px] font-mono text-muted-foreground">
                      Summa: <span className="font-semibold text-foreground">{msg.actionProposed.amount}</span>
                    </div>
                  )}

                  {msg.actionProposed.accounts && (
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      Provodka: {msg.actionProposed.accounts}
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant="success"
                      className="h-7 px-2.5 text-[11px]"
                      onClick={() => toast.success("AI taklifi tasdiqlandi va 1C/Didox ga jo'natildi!")}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Tasdiqlash
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => toast.info("Taklif rad etildi")}
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Rad etish
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-1.5 text-[11px] text-muted-foreground"
                      onClick={() => toast.info("Tafsilotlar sahifasi ochilmoqda...")}
                    >
                      <ArrowUpRight className="h-3 w-3" />
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
            placeholder="AI assistantga buyruq yoki savol bering..."
            className="text-xs h-9"
          />
          <Button type="submit" size="sm" className="h-9 px-3 shrink-0">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
        <div className="mt-1.5 text-[10px] text-center text-muted-foreground">
          Moliyaviy hisob-kitoblar Go deterministik kodi orqali tekshiriladi.
        </div>
      </div>
    </div>
  );
}
