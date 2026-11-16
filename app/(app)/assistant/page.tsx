"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useAppState } from "@/lib/context/app-state";
import { QuickEntityBanner } from "@/components/shared/quick-entity-banner";
import { Money } from "@/components/shared/money";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LEX_UZ_TAX_CODE_URL,
  LEX_UZ_BHMS21_URL,
  calculatePayrollUz,
  calculateVatUz,
  calculateTurnoverTaxUz,
  calculateVacationPayUz,
} from "@/lib/services/uz-tax-calculator";
import { roundMoney } from "@/lib/utils/finance";
import { supabase } from "@/lib/supabase/client";
import type { AgentActionProposal } from "@/lib/ai/agent-types";
import {
  Sparkles,
  Send,
  Loader2,
  Camera,
  Calculator,
  FileWarning,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

interface ChatTurn {
  id: string;
  sender: "user" | "ai";
  text: string;
  modelUsed?: string;
  actionProposed?: AgentActionProposal;
  actionStatus?: "pending" | "approved" | "rejected";
}

interface ScannedDocResult {
  mode: string;
  modelUsed: string;
  documentType: string;
  documentNumber: string;
  date: string;
  counterparty: string;
  counterpartyStir: string;
  direction: "income" | "expense";
  totalAmount: number;
  vatAmount: number;
  netAmount: number;
  items: Array<{
    name: string;
    mxikHint: string;
    qty: number;
    unit: string;
    price: number;
    total: number;
    vatRate: number;
  }>;
  suggestedDebitCode: string;
  suggestedCreditCode: string;
  vatAccountCode: string;
  provodkaExplanation: string;
  risks: string[];
}

const QUICK_PROMPTS = [
  "4 500 000 so'm oylikdan xodim qo'liga qancha tegadi? Provodkasini yoz",
  "Ta'lim xizmatlari QQSdan ozodmi? Soliq kodeksi moddasi bilan tushuntir",
  "11 200 000 so'm QQS 12% bilan tovar sotilganda 21-BHMS provodkasi qanday?",
  "Aylanmadan soliq 4% qachon va qaysi schyotda hisoblanadi?",
];

export default function AssistantPage() {
  const { currentEntity } = useAppState();
  const [activeTab, setActiveTab] = useState("chat");

  useEffect(() => {
    try {
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam && ["chat", "scan", "calc", "contract"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    } catch {}
  }, []);

  // 1. AI Chat state
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Assalomu alaykum! Men FIRMUS AI Hamkasbman. Oʻzbekiston Soliq kodeksi moddalari (lex.uz), 21-son BHMS provodkalari, ish haqi va QQS hisoblash boʻyicha savolingizni yozing.",
    },
  ]);

  // 2. Document / Invoice Vision Scanner state
  const scanFileRef = useRef<HTMLInputElement | null>(null);
  const [scanFileName, setScanFileName] = useState("");
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);
  const [scanMimeType, setScanMimeType] = useState<string>("");
  const [scanBase64, setScanBase64] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedDocResult | null>(null);
  const [isPostingDoc, setIsPostingDoc] = useState(false);

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

  const handleSendChat = async (textToSend?: string) => {
    const query = (textToSend ?? chatInput).trim();
    if (!query || isSending) return;

    const userTurn: ChatTurn = { id: `u-${Date.now()}`, sender: "user", text: query };
    const historySnapshot = messages
      .filter((m) => m.id !== "welcome" && m.text.trim().length > 0)
      .slice(-6)
      .map((m) => ({ sender: m.sender, text: m.text.slice(0, 1200) }));

    setMessages((prev) => [...prev, userTurn]);
    if (!textToSend) setChatInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/ai-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          entityId: currentEntity?.id,
          history: historySnapshot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI javob qaytarmadi");

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: "ai",
          text: data.reply,
          modelUsed: data.modelUsed,
          actionProposed: data.actionProposed,
          actionStatus: data.actionProposed ? "pending" : undefined,
        },
      ]);
    } catch (err: any) {
      toast.error("AI javobida xatolik: " + err.message);
    } finally {
      setIsSending(false);
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
      setMessages((prev) =>
        prev.map((m) =>
          m.id === turn.id
            ? { ...m, actionStatus: decision === "approve" ? "approved" : "rejected" }
            : m
        )
      );
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
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Fayl hajmi 6 MB dan oshmasligi kerak");
      return;
    }
    try {
      const dataUrl = await readFileAsBase64(file);
      setScanFileName(file.name);
      setScanMimeType(file.type || "image/jpeg");
      setScanBase64(dataUrl);
      setScanPreviewUrl(file.type.startsWith("image/") ? dataUrl : null);
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
      const res = await fetch("/api/ai-document-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "invoice_receipt",
          fileName: scanFileName,
          mimeType: scanMimeType,
          base64Data: scanBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Hujjatni tahlil qilib boʻlmadi");
      setScanResult(data);
      toast.success("Hujjat oʻqildi va 21-BHMS provodkasi tayyorlandi!");
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
      const gross = roundMoney(scanResult.totalAmount);
      const vat = roundMoney(scanResult.vatAmount);
      const net = roundMoney(gross - vat);
      const safeDesc = `${scanResult.documentType} ${scanResult.documentNumber ? `№${scanResult.documentNumber} ` : ""}(${scanResult.counterparty})`.slice(0, 220);

      let lines: Array<{
        account_code: string;
        account_name: string;
        debit_amount: number;
        credit_amount: number;
        memo: string;
      }> = [];

      if (vat > 0 && net > 0) {
        if (scanResult.direction === "income") {
          lines = [
            { account_code: scanResult.suggestedDebitCode || "4010", account_name: scanResult.suggestedDebitCode || "4010", debit_amount: gross, credit_amount: 0, memo: safeDesc },
            { account_code: scanResult.suggestedCreditCode || "9030", account_name: scanResult.suggestedCreditCode || "9030", debit_amount: 0, credit_amount: net, memo: `${safeDesc} (QQSsiz)` },
            { account_code: "6410", account_name: "Chiquvchi QQS 12%", debit_amount: 0, credit_amount: vat, memo: "QQS 12%" },
          ];
        } else {
          lines = [
            { account_code: scanResult.suggestedDebitCode || "6010", account_name: scanResult.suggestedDebitCode || "6010", debit_amount: net, credit_amount: 0, memo: `${safeDesc} (QQSsiz)` },
            { account_code: "4410", account_name: "Kiruvchi QQS 12%", debit_amount: vat, credit_amount: 0, memo: "QQS 12% zachyot" },
            { account_code: scanResult.suggestedCreditCode || "5110", account_name: scanResult.suggestedCreditCode || "5110", debit_amount: 0, credit_amount: gross, memo: safeDesc },
          ];
        }
      } else {
        lines = [
          { account_code: scanResult.suggestedDebitCode, account_name: scanResult.suggestedDebitCode, debit_amount: gross, credit_amount: 0, memo: safeDesc },
          { account_code: scanResult.suggestedCreditCode, account_name: scanResult.suggestedCreditCode, debit_amount: 0, credit_amount: gross, memo: safeDesc },
        ];
      }

      const { error } = await supabase.rpc("create_journal_entry_atomic", {
        p_business_entity_id: currentEntity.id,
        p_entry_number: `JE-OCR-${Date.now().toString().slice(-5)}`,
        p_entry_date: scanResult.date,
        p_description: safeDesc,
        p_source_type: "ocr_scan",
        p_idempotency_key: `idem-ocr-${currentEntity.id}-${scanResult.date}-${gross}-${scanResult.documentNumber || "doc"}`,
        p_lines: lines,
      });
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("firmus:refresh-data", { detail: { entityId: currentEntity.id } }));
      toast.success("Faktura/chek provodkasi Bosh kitobga atomik tarzda yozildi!");
    } catch (err: any) {
      toast.error("Bosh kitobga yozishda xatolik: " + err.message);
    } finally {
      setIsPostingDoc(false);
    }
  };

  const handleSelectContractFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Fayl hajmi 6 MB dan oshmasligi kerak");
      return;
    }
    const dataUrl = await readFileAsBase64(file);
    setContractFileInfo({
      name: file.name,
      mimeType: file.type || "application/pdf",
      base64: dataUrl,
    });
  };

  const handleAnalyzeContract = async () => {
    if (!contractText.trim() && !contractFileInfo) {
      toast.error("Shartnoma matnini joylashtiring yoki PDF/rasm fayl yuklang");
      return;
    }
    setIsCheckingContract(true);
    try {
      const res = await fetch("/api/ai-document-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "contract_risk",
          fileName: contractFileInfo?.name,
          mimeType: contractFileInfo?.mimeType,
          base64Data: contractFileInfo?.base64,
          docText: contractText.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Shartnomani tahlil qilib boʻlmadi");
      setContractResult(data);
      toast.success("Shartnoma xatarlari tahlil qilindi!");
    } catch (err: any) {
      toast.error("Tahlilda xatolik: " + err.message);
    } finally {
      setIsCheckingContract(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            AI Hamkasb — Faktura, Soliq va Kalkulyator
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Soliq kodeksi javoblari (`lex.uz`), faktura/chek skaneri, brutto ↔ netto maosh va shartnoma tekshiruvi bitta soddalashtirilgan oynada.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={LEX_UZ_TAX_CODE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] hover:bg-accent"
          >
            Soliq kodeksi <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={LEX_UZ_BHMS21_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] hover:bg-accent"
          >
            21-son BHMS <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Zero-PII badge */}
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>
          <strong className="text-foreground">OʻRQ-547 Zero-PII:</strong> Yuklangan chek, faktura rasmlari va shartnomalar serverda saqlanmaydi; shaxsiy karta va JShShIR avtomatik niqoblanadi.
        </span>
      </div>

      <QuickEntityBanner contextNote="Faktura provodkasini Bosh kitobga 1 klikda saqlash uchun korxonani qoʻshing (maslahat, skaner va kalkulyator korxonasiz ham ishlaydi)." />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-9 text-xs flex-wrap">
          <TabsTrigger value="chat" className="gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            AI Soliq & Provodka Chat
          </TabsTrigger>
          <TabsTrigger value="scan" className="gap-1.5 text-xs">
            <Camera className="h-3.5 w-3.5" />
            Faktura / Chek Skaner
          </TabsTrigger>
          <TabsTrigger value="calc" className="gap-1.5 text-xs">
            <Calculator className="h-3.5 w-3.5" />
            Maosh & QQS Kalkulyatori
          </TabsTrigger>
          <TabsTrigger value="contract" className="gap-1.5 text-xs">
            <FileWarning className="h-3.5 w-3.5" />
            Shartnoma Xavf Tekshiruvi
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AI CHAT */}
        <TabsContent value="chat" className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp}
                type="button"
                onClick={() => handleSendChat(qp)}
                className="text-[11px] rounded-full border border-border bg-muted/40 px-3 py-1 hover:bg-accent text-left transition-colors"
              >
                {qp}
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed ${
                        m.sender === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-muted/60 text-foreground border border-border"
                      }`}
                    >
                      {m.text}
                    </div>
                    {m.actionProposed && (
                      <div className="mt-2 max-w-[85%] rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 text-xs space-y-2">
                        <div className="font-semibold text-foreground">{m.actionProposed.title}</div>
                        <p className="text-[11px] text-muted-foreground">{m.actionProposed.summary}</p>
                        {m.actionStatus === "pending" ? (
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
                    {m.modelUsed && (
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">{m.modelUsed}</span>
                    )}
                  </div>
                ))}
                {isSending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    AI oʻylamoqda...
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex gap-2 pt-2 border-t border-border"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Soliq kodeksi, provodka, QQS yoki maosh haqida yozing..."
                  className="h-9 text-xs"
                />
                <Button type="submit" size="sm" disabled={isSending || !chatInput.trim()} className="h-9 px-4 gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Yuborish
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: INVOICE / RECEIPT SCANNER */}
        <TabsContent value="scan" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Faktura, TTN yoki Chek yuklash</CardTitle>
                <CardDescription className="text-xs">
                  JPG, PNG, WebP rasm yoki PDF fayl — AI summa, QQS 12%, MXIK va 21-BHMS provodkasini oʻqib beradi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <input
                  ref={scanFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
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
                  <span>{scanFileName || "Rasm yoki PDF tanlash (maks. 6 MB)"}</span>
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
                  AI bilan oʻqish va provodka chiqarish
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">AI Tahlil Natijasi</CardTitle>
                <CardDescription className="text-xs">
                  Oʻqilgan rekvizitlar, MXIK kod taxmini va tayyor 21-BHMS provodkasi
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs space-y-3">
                {!scanResult ? (
                  <p className="text-muted-foreground py-8 text-center">
                    Chap tomondan faktura yoki chek rasmini yuklab «AI bilan oʻqish» tugmasini bosing.
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
                        21-BHMS Provodka: Dt {scanResult.suggestedDebitCode} / Kt {scanResult.suggestedCreditCode}
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

                    <Button
                      size="sm"
                      variant="success"
                      className="w-full h-8 text-xs gap-1.5"
                      disabled={isPostingDoc || scanResult.totalAmount <= 0}
                      onClick={handlePostScannedToLedger}
                    >
                      {isPostingDoc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Bosh kitobga atomik yozish
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
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
                  placeholder="Summani so'mda kiriting"
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
                    <span className="text-muted-foreground">Jami korxona xarajati:</span>
                    <span className="font-mono font-semibold"><Money amount={payrollCalc.totalEmployerCost} /></span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-foreground">21-BHMS Provodkalari:</div>
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
                <CardTitle className="text-sm font-semibold">Shartnoma matni yoki PDF/rasm yuklash</CardTitle>
                <CardDescription className="text-xs">
                  AI katta jarima (penya), 100% oldindan toʻlov, QQS bandi va STIR xatoliklarini tekshiradi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <input
                  ref={contractFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
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
                  {contractFileInfo ? `Tanlangan: ${contractFileInfo.name}` : "PDF yoki rasm shartnoma biriktirish (ixtiyoriy)"}
                </Button>
                <textarea
                  rows={7}
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  placeholder="Shartnomaning muhim bandlarini (toʻlov tartibi, jarima/penya, QQS qismi) bu yerga nusxalab qoʻying..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  type="button"
                  className="w-full gap-1.5"
                  disabled={isCheckingContract}
                  onClick={handleAnalyzeContract}
                >
                  {isCheckingContract ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileWarning className="h-3.5 w-3.5" />}
                  Shartnoma xatarlarini tekshirish
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Aniqlangan xatarlar va tavsiyalar</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3">
                {!contractResult ? (
                  <p className="text-muted-foreground py-8 text-center">
                    Shartnoma matnini kiriting yoki fayl yuklab tahlilni boshlang.
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
      </Tabs>
    </div>
  );
}
