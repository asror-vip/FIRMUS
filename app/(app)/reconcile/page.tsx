"use client";

import React, { useState, useRef } from "react";
import { useAppState } from "@/lib/mock/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Money } from "@/components/shared/money";
import {
  decodeBankFileBuffer,
  parseStatementFile,
  reconcileBankAnd1C,
  buildSafeAiReconcileInput,
  buildReconcileCsvReport,
  type ReconcileRow,
  type ReconcileSummary,
} from "@/lib/services/reconcile-engine";
import type { ParsedBankTransaction } from "@/lib/services/bank-import";
import { generate1CClientBankText } from "@/lib/services/one-c-export";
import { fetchTransactions } from "@/lib/services/supabase-service";
import { sanitizeStringForAi } from "@/lib/utils/privacy";
import { supabase } from "@/lib/supabase/client";
import {
  Upload,
  Sparkles,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Loader2,
  Database,
  Play,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

const DEMO_BANK_TEXT = [
  "1CClientBankExchange",
  "СекцияДокумент=Платежное поручение",
  "Номер=201",
  "Дата=15.11.2026",
  "Сумма=25000000.00",
  "Плательщик1=OOO BARAKA SAVDO",
  "ПлательщикИНН=305112233",
  "Получатель1=OOO FIRMUS PARTNER",
  "ПолучательИНН=308554433",
  "НазначениеПлатежа=Shartnoma 12 bo'yicha tovar uchun to'lov QQS 12% bilan",
  "КонецДокумента",
  "СекцияДокумент=Платежное поручение",
  "Номер=202",
  "Дата=15.11.2026",
  "Сумма=11200000.00",
  "Плательщик1=OOO FIRMUS PARTNER",
  "ПлательщикИНН=308554433",
  "Получатель1=OOO TEXNO TA'MINOT",
  "ПолучательИНН=307445566",
  "НазначениеПлатежа=Uskunalar uchun to'lov",
  "КонецДокумента",
  "СекцияДокумент=Платежное поручение",
  "Номер=203",
  "Дата=15.11.2026",
  "Сумма=380000.00",
  "Плательщик1=OOO FIRMUS PARTNER",
  "ПлательщикИНН=308554433",
  "Получатель1=ATB Kapitalbank",
  "ПолучательИНН=201020304",
  "НазначениеПлатежа=Oylik RKO va bank komissiyasi",
  "КонецДокумента",
  "СекцияДокумент=Платежное поручение",
  "Номер=204",
  "Дата=15.11.2026",
  "Сумма=4500000.00",
  "Плательщик1=OOO SHARQ BIZNES",
  "ПлательщикИНН=303889900",
  "Получатель1=OOO FIRMUS PARTNER",
  "ПолучательИНН=308554433",
  "НазначениеПлатежа=Yangi shartnoma bo'yicha oldindan bo'nak (avans)",
  "КонецДокумента",
].join("\r\n");

const DEMO_1C_XML = `<?xml version="1.0" encoding="UTF-8"?>
<EnterpriseData formatVersion="1.8">
  <Body>
    <Operation id="OP-1">
      <Number>201</Number>
      <Date>2026-11-15</Date>
      <Counterparty>OOO BARAKA SAVDO</Counterparty>
      <STIR>305112233</STIR>
      <Comment>Shartnoma 12 tushum</Comment>
      <Lines>
        <Line num="1"><AccountCode>5110</AccountCode><Debit>25000000</Debit><Credit>0</Credit></Line>
        <Line num="2"><AccountCode>4010</AccountCode><Debit>0</Debit><Credit>25000000</Credit></Line>
      </Lines>
    </Operation>
    <Operation id="OP-2">
      <Number>202</Number>
      <Date>2026-11-15</Date>
      <Counterparty>OOO TEXNO TA'MINOT</Counterparty>
      <STIR>307445566</STIR>
      <Comment>Uskunalar uchun to'lov (QQSsiz kiritilgan)</Comment>
      <Lines>
        <Line num="1"><AccountCode>6010</AccountCode><Debit>10000000</Debit><Credit>0</Credit></Line>
        <Line num="2"><AccountCode>5110</AccountCode><Debit>0</Debit><Credit>10000000</Credit></Line>
      </Lines>
    </Operation>
    <Operation id="OP-3">
      <Number>205</Number>
      <Date>2026-11-14</Date>
      <Counterparty>OOO MILLIY LOGISTIKA</Counterparty>
      <STIR>309991122</STIR>
      <Comment>1C da kiritilgan, bankdan hali o'tmagan</Comment>
      <Lines>
        <Line num="1"><AccountCode>6010</AccountCode><Debit>6200000</Debit><Credit>0</Credit></Line>
        <Line num="2"><AccountCode>5110</AccountCode><Debit>0</Debit><Credit>6200000</Credit></Line>
      </Lines>
    </Operation>
  </Body>
</EnterpriseData>`;

export default function ReconcilePage() {
  const { currentEntity } = useAppState();
  const bankInputRef = useRef<HTMLInputElement | null>(null);
  const oneCInputRef = useRef<HTMLInputElement | null>(null);

  const [bankFileName, setBankFileName] = useState("");
  const [oneCFileName, setOneCFileName] = useState("");
  const [bankItems, setBankItems] = useState<ParsedBankTransaction[]>([]);
  const [oneCItems, setOneCItems] = useState<ParsedBankTransaction[]>([]);

  const [rows, setRows] = useState<ReconcileRow[]>([]);
  const [summary, setSummary] = useState<ReconcileSummary | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isAiChecking, setIsAiChecking] = useState(false);
  const [aiModeNote, setAiModeNote] = useState<string | null>(null);
  const [isPostingLedger, setIsPostingLedger] = useState(false);

  const runComparison = (nextBank: ParsedBankTransaction[], nextOneC: ParsedBankTransaction[]) => {
    if (nextBank.length === 0 && nextOneC.length === 0) {
      setRows([]);
      setSummary(null);
      return;
    }
    const { rows: compared, summary: sum } = reconcileBankAnd1C(nextBank, nextOneC);
    setRows(compared);
    setSummary(sum);
    setSelectedIds(compared.filter((r) => r.status === "bank_only").map((r) => r.id));
    setAiModeNote(null);
  };

  const handleUploadFile = async (source: "bank" | "onec", file?: File) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const text = decodeBankFileBuffer(buffer);
      const parsed = parseStatementFile(text, file.name, currentEntity?.tinStir || "");

      if (parsed.length === 0) {
        toast.error(
          `«${file.name}» faylidan operatsiyalar oʻqilmadi. 1C Client-Bank (.txt), XML yoki CSV formatidan foydalaning.`
        );
        return;
      }

      if (source === "bank") {
        setBankFileName(file.name);
        setBankItems(parsed);
        runComparison(parsed, oneCItems);
        toast.success(`Bank koʻchirmasidan ${parsed.length} ta operatsiya oʻqildi.`);
      } else {
        setOneCFileName(file.name);
        setOneCItems(parsed);
        runComparison(bankItems, parsed);
        toast.success(`1C faylidan ${parsed.length} ta yozuv oʻqildi.`);
      }
    } catch (err: any) {
      toast.error("Faylni oʻqishda xatolik: " + (err?.message || "Nomaʼlum xato"));
    }
  };

  const handleLoadDbAs1C = async () => {
    if (!currentEntity?.id) {
      toast.error("Avval korxona tanlang yoki yarating");
      return;
    }
    try {
      const txs = await fetchTransactions(currentEntity.id);
      const mapped: ParsedBankTransaction[] = (txs || []).map((t: any) => ({
        date: t.date,
        amount: Number(t.amount),
        type: t.type,
        counterparty: t.counterparty,
        counterpartyStir: t.counterpartyStir,
        description: t.description,
        accountCode: t.accountCode || (t.type === "income" ? "4010" : "6010"),
        accountName: t.accountName || "",
      }));
      setOneCFileName("FIRMUS Bosh kitob / Tranzaksiyalar");
      setOneCItems(mapped);
      runComparison(bankItems, mapped);
      toast.success(`Bazadan ${mapped.length} ta yozuv bilan solishtirildi.`);
    } catch (err: any) {
      toast.error("Bazadan oʻqishda xatolik: " + err.message);
    }
  };

  const handleRunDemo = () => {
    const demoBank = parseStatementFile(DEMO_BANK_TEXT, "kapitalbank_demo.txt", "308554433");
    const demo1C = parseStatementFile(DEMO_1C_XML, "1c_demo.xml", "308554433");
    setBankFileName("kapitalbank_demo.txt (Namuna)");
    setOneCFileName("1c_export_demo.xml (Namuna)");
    setBankItems(demoBank);
    setOneCItems(demo1C);
    runComparison(demoBank, demo1C);
    toast.success("Namuna Bank va 1C fayllari brauzer xotirasida solishtirildi!");
  };

  const handleReset = () => {
    setBankFileName("");
    setOneCFileName("");
    setBankItems([]);
    setOneCItems([]);
    setRows([]);
    setSummary(null);
    setSelectedIds([]);
    setAiModeNote(null);
  };

  const handleAiVerify = async () => {
    const candidates = buildSafeAiReconcileInput(rows);
    if (candidates.length === 0) {
      toast.info("Barcha operatsiyalar 100% mos! Tekshirishga muhtoj farq topilmadi.");
      return;
    }
    setIsAiChecking(true);
    try {
      const res = await fetch("/api/ai-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: candidates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI solishtirish xatosi");

      const map = new Map<string, any>((data.suggestions || []).map((s: any) => [s.id, s]));
      setRows((prev) =>
        prev.map((r) => {
          const hit = map.get(r.id);
          if (!hit) return r;
          return {
            ...r,
            suggestedAccountCode: hit.accountCode || r.suggestedAccountCode,
            suggestedAccountName: hit.accountName || r.suggestedAccountName,
            explanation: hit.explanation || r.explanation,
            aiVerified: true,
          };
        })
      );
      setAiModeNote(
        data.mode === "gemini_reconcile"
          ? `Gemini (${data.modelUsed}) tomonidan tekshirildi`
          : "21-BHMS qatʼiy qoidalari bilan tekshirildi"
      );
      toast.success("AI farqlarni tekshirdi va 21-BHMS schyotlarini tasdiqladi!");
    } catch (err: any) {
      toast.error("AI tahlilida xatolik: " + err.message);
    } finally {
      setIsAiChecking(false);
    }
  };

  const handleExport1C = () => {
    const itemsToExport = rows
      .filter((r) => r.bankItem || r.oneCItem)
      .map((r, i) => ({
        id: String(i + 1),
        date: r.date,
        amount: r.bankAmount || r.oneCAmount,
        type: r.type,
        counterparty: sanitizeStringForAi(r.counterparty),
        counterpartyStir: r.counterpartyStir,
        description: `${sanitizeStringForAi(r.bankItem?.description || r.oneCItem?.description || "Operatsiya")} [Schyot: ${r.suggestedAccountCode}]`,
        accountCode: r.suggestedAccountCode,
      }));

    if (itemsToExport.length === 0) {
      toast.error("Eksport uchun maʼlumot yoʻq");
      return;
    }

    const txt = generate1CClientBankText(itemsToExport, {
      name: currentEntity?.name || "FIRMUS KORXONA",
      inn: currentEntity?.tinStir || "300000000",
      account: "20208000000000000000",
      bank: "Tijorat banki",
    });

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kl_to_1c_reconciled_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("1C uchun tayyor `kl_to_1c_reconciled.txt` fayli yuklandi!");
  };

  const handleDownloadCsv = () => {
    if (rows.length === 0) return;
    const csv = buildReconcileCsvReport(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sverka_hisobot_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Excel/CSV Sverka dalolatnomasi yuklandi!");
  };

  const handlePostSelectedToLedger = async () => {
    if (!currentEntity?.id) {
      toast.error("Bosh kitobga yozish uchun avval korxona tanlang");
      return;
    }
    const chosen = rows.filter((r) => selectedIds.includes(r.id) && r.bankAmount > 0);
    if (chosen.length === 0) {
      toast.error("Iltimos, Bosh kitobga oʻtkazish uchun qatorlarni belgilang");
      return;
    }

    setIsPostingLedger(true);
    let successCount = 0;
    try {
      for (const item of chosen) {
        const debitCode = item.type === "income" ? "5110" : item.suggestedAccountCode;
        const creditCode = item.type === "income" ? item.suggestedAccountCode : "5110";
        const safeDesc = sanitizeStringForAi(
          `${item.counterparty}: ${item.bankItem?.description || item.explanation}`
        ).slice(0, 240);

        const { error } = await supabase.rpc("create_journal_entry_atomic", {
          p_business_entity_id: currentEntity.id,
          p_entry_number: `JE-REC-${Date.now().toString().slice(-5)}-${successCount + 1}`,
          p_entry_date: item.date,
          p_description: safeDesc,
          p_source_type: "bank_statement",
          p_idempotency_key: `idem-rec-${currentEntity.id}-${item.date}-${item.bankAmount}-${debitCode}-${creditCode}-${successCount}`,
          p_lines: [
            {
              account_code: debitCode,
              account_name: item.type === "income" ? "Hisob-kitob schyoti" : item.suggestedAccountName,
              debit_amount: item.bankAmount,
              credit_amount: 0,
              memo: safeDesc,
            },
            {
              account_code: creditCode,
              account_name: item.type === "income" ? item.suggestedAccountName : "Hisob-kitob schyoti",
              debit_amount: 0,
              credit_amount: item.bankAmount,
              memo: safeDesc,
            },
          ],
        });
        if (error) throw error;
        successCount++;
      }

      window.dispatchEvent(new CustomEvent("firmus:refresh-data", { detail: { entityId: currentEntity.id } }));
      toast.success(`${successCount} ta tasdiqlangan operatsiya Bosh kitobga atomik tarzda yozildi!`);
    } catch (err: any) {
      toast.error("Bosh kitobga yozishda xatolik: " + err.message);
    } finally {
      setIsPostingLedger(false);
    }
  };

  const filteredRows = rows.filter((r) => activeTab === "all" || r.status === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Bank ↔ 1C AI Solishtirish (Sverka)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bank koʻchirmasi va 1C faylini yuklang — AI 5 soniyada solishtirib, farqlarni va 21-BHMS schyotlarini chiqarib beradi.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" onClick={handleRunDemo}>
            <Play className="h-3.5 w-3.5 text-emerald-600" />
            Namuna bilan sinash
          </Button>
          {rows.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-8 gap-1.5" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              Tozalash
            </Button>
          )}
        </div>
      </div>

      {/* Zero-PII Privacy Banner */}
      <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground">
            OʻRQ-547 «Zero-PII» xavfsiz solishtirish rejimi
          </div>
          <p className="text-[11px] text-muted-foreground">
            Yuklangan fayllar bevosita sizning brauzeringiz xotirasida oʻqiladi va serverga saqlanmaydi. AI ga yuborishdan oldin plastik karta (16 xonali), JShShIR va telefon raqamlari avtomatik niqoblanadi.
          </p>
        </div>
      </div>

      {/* Two Upload Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">1. Bankdan kelgan koʻchirma</CardTitle>
            <CardDescription className="text-xs">
              1C Client-Bank (`.txt` UTF-8/Windows-1251) yoki bank `.csv` fayli
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <input
              ref={bankInputRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={(e) => handleUploadFile("bank", e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-16 border-dashed flex flex-col gap-1"
              onClick={() => bankInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 text-indigo-600" />
              <span>{bankFileName || "Bank faylini tanlash (.txt, .csv)"}</span>
            </Button>
            {bankItems.length > 0 && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded">
                <span>Oʻqildi: <strong className="text-foreground">{bankItems.length} ta</strong></span>
                <Badge variant="outline" className="text-[10px]">
                  Tayyor
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">2. 1C dan olingan fayl</CardTitle>
            <CardDescription className="text-xs">
              1C EnterpriseData (`.xml`), Client-Bank (`.txt`) yoki 1C `.csv` eksport
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <input
              ref={oneCInputRef}
              type="file"
              accept=".xml,.txt,.csv"
              className="hidden"
              onChange={(e) => handleUploadFile("onec", e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full h-16 border-dashed flex flex-col gap-1"
              onClick={() => oneCInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 text-emerald-600" />
              <span>{oneCFileName || "1C faylini tanlash (.xml, .txt, .csv)"}</span>
            </Button>
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[11px] h-7 px-2 gap-1 text-muted-foreground hover:text-foreground"
                onClick={handleLoadDbAs1C}
              >
                <Database className="h-3 w-3" />
                Saytdagi baza bilan solishtirish
              </Button>
              {oneCItems.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {oneCItems.length} ta yozuv
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results & Actions */}
      {summary && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="cursor-pointer hover:border-emerald-500/50" onClick={() => setActiveTab("matched")}>
              <CardContent className="pt-4 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">100% Mos tushgan</p>
                  <p className="text-xl font-bold text-emerald-600">{summary.matchedCount}</p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-emerald-500/70" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-amber-500/50" onClick={() => setActiveTab("amount_mismatch")}>
              <CardContent className="pt-4 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Summa / Sana farqi</p>
                  <p className="text-xl font-bold text-amber-600">{summary.mismatchCount}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-amber-500/70" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-rose-500/50" onClick={() => setActiveTab("bank_only")}>
              <CardContent className="pt-4 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">Bankda bor, 1C da yoʻq</p>
                  <p className="text-xl font-bold text-rose-600">{summary.bankOnlyCount}</p>
                </div>
                <XCircle className="h-6 w-6 text-rose-500/70" />
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-indigo-500/50" onClick={() => setActiveTab("one_c_only")}>
              <CardContent className="pt-4 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">1C da bor, Bankda yoʻq</p>
                  <p className="text-xl font-bold text-indigo-600">{summary.oneCOnlyCount}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-indigo-500/70" />
              </CardContent>
            </Card>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8 text-xs">
                <TabsTrigger value="all" className="text-xs px-2.5">Barchasi ({rows.length})</TabsTrigger>
                <TabsTrigger value="bank_only" className="text-xs px-2.5">1C da yoʻq ({summary.bankOnlyCount})</TabsTrigger>
                <TabsTrigger value="amount_mismatch" className="text-xs px-2.5">Farqlar ({summary.mismatchCount})</TabsTrigger>
                <TabsTrigger value="matched" className="text-xs px-2.5">Mos ({summary.matchedCount})</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                disabled={isAiChecking}
                onClick={handleAiVerify}
              >
                {isAiChecking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI bilan tekshirish
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={handleExport1C}>
                <Download className="h-3.5 w-3.5" />
                1C ga yuklash (.txt)
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5" onClick={handleDownloadCsv}>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                CSV Hisobot
              </Button>
              {currentEntity?.id && selectedIds.length > 0 && (
                <Button
                  size="sm"
                  variant="success"
                  className="text-xs h-8 gap-1.5"
                  disabled={isPostingLedger}
                  onClick={handlePostSelectedToLedger}
                >
                  {isPostingLedger ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Bosh kitobga yozish ({selectedIds.length})
                </Button>
              )}
            </div>
          </div>

          {aiModeNote && (
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {aiModeNote}
            </div>
          )}

          {/* Diff Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Holat</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead>Kontragent</TableHead>
                    <TableHead className="text-right">Bank summasi</TableHead>
                    <TableHead className="text-right">1C summasi</TableHead>
                    <TableHead>21-BHMS Schyot</TableHead>
                    <TableHead>AI Izoh va Tavsiya</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.id} className="text-xs">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(row.id)}
                          disabled={row.bankAmount <= 0}
                          onCheckedChange={(checked) => {
                            setSelectedIds((prev) =>
                              checked ? [...prev, row.id] : prev.filter((id) => id !== row.id)
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {row.status === "matched" && <Badge variant="success" className="text-[10px]">Mos</Badge>}
                        {row.status === "amount_mismatch" && <Badge variant="warning" className="text-[10px]">Farq bor</Badge>}
                        {row.status === "bank_only" && <Badge variant="destructive" className="text-[10px]">1C da yoʻq</Badge>}
                        {row.status === "one_c_only" && <Badge variant="outline" className="text-[10px]">Bankda yoʻq</Badge>}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] whitespace-nowrap">{row.date}</TableCell>
                      <TableCell className="font-medium">
                        <div>{row.counterparty}</div>
                        {row.counterpartyStir && (
                          <div className="text-[10px] font-mono text-muted-foreground">STIR: {row.counterpartyStir}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.bankAmount > 0 ? (
                          <span className={row.type === "income" ? "text-emerald-600" : "text-foreground"}>
                            <Money amount={row.bankAmount} />
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.oneCAmount > 0 ? <Money amount={row.oneCAmount} /> : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {row.suggestedAccountCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] text-[11px] text-muted-foreground">
                        {row.explanation}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
