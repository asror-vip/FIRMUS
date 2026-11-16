"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import type { ScannedDocResult } from "@/lib/services/doc-scan-client";

interface ChatScanCardProps {
  scan: ScannedDocResult;
  isDuplicate?: boolean;
  posted?: boolean;
  canPost?: boolean;
  onPostToLedger: (editedScan: ScannedDocResult) => Promise<void>;
}

const QUICK_DEBIT_ACCOUNTS = [
  { code: "6010", label: "6010 Yetkazib beruvchi" },
  { code: "9420", label: "9420 Maʼmuriy xarajat" },
  { code: "9410", label: "9410 Sotish xarajati" },
  { code: "2910", label: "2910 Tovarlar" },
  { code: "1010", label: "1010 Materiallar" },
  { code: "4010", label: "4010 Xaridorlar" },
  { code: "5110", label: "5110 Bank hisobi" },
];

export function ChatScanCard({
  scan,
  isDuplicate = false,
  posted = false,
  canPost = true,
  onPostToLedger,
}: ChatScanCardProps) {
  const [debitCode, setDebitCode] = useState(scan.suggestedDebitCode || "6010");
  const [creditCode, setCreditCode] = useState(scan.suggestedCreditCode || "5110");
  const [totalAmount, setTotalAmount] = useState(String(scan.totalAmount || 0));
  const [isPosting, setIsPosting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopySummary = async () => {
    const text = [
      `${scan.documentType}${scan.documentNumber ? ` №${scan.documentNumber}` : ""} (${scan.date})`,
      `Kontragent: ${scan.counterparty}${scan.counterpartyStir ? ` (STIR: ${scan.counterpartyStir})` : ""}`,
      `Summa: ${(Number(totalAmount) || scan.totalAmount).toLocaleString("uz-UZ")} soʻm${
        scan.vatAmount > 0 ? ` | QQS 12%: ${scan.vatAmount.toLocaleString("uz-UZ")} soʻm` : ""
      }`,
      `Provodka: Dt ${debitCode} / Kt ${creditCode}${scan.vatAmount > 0 ? ` (+ QQS ${scan.vatAccountCode})` : ""}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Natija nusxalandi");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Nusxalab boʻlmadi");
    }
  };

  const handleConfirm = async () => {
    setIsPosting(true);
    try {
      const parsedTotal = Math.max(0, Number(totalAmount) || scan.totalAmount || 0);
      await onPostToLedger({
        ...scan,
        totalAmount: parsedTotal,
        suggestedDebitCode: debitCode,
        suggestedCreditCode: creditCode,
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="mt-2 max-w-[92%] rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold text-foreground">
          {scan.documentType} {scan.documentNumber ? `№${scan.documentNumber}` : ""}
        </span>
        <div className="flex items-center gap-1.5">
          {isDuplicate && (
            <Badge variant="warning" className="text-[10px] gap-1">
              <AlertTriangle className="h-3 w-3" />
              Oʻxshash chek tarixda bor
            </Badge>
          )}
          <Badge variant={posted ? "success" : "outline"} className="text-[10px]">
            {posted ? "Bosh kitobda" : scan.date}
          </Badge>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground">
        <strong className="text-foreground">{scan.counterparty}</strong>
        {scan.counterpartyStir ? ` • STIR: ${scan.counterpartyStir}` : ""}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
        <div>
          <span className="text-[10px] text-muted-foreground block">Jami summa (soʻm)</span>
          <input
            type="number"
            min={0}
            disabled={posted}
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="mt-0.5 h-7 w-full rounded border border-input bg-background px-2 font-mono text-xs"
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">Debet schyot</span>
          <select
            disabled={posted}
            value={debitCode}
            onChange={(e) => setDebitCode(e.target.value)}
            className="mt-0.5 h-7 w-full rounded border border-input bg-background px-1.5 font-mono text-[11px]"
          >
            {QUICK_DEBIT_ACCOUNTS.map((a) => (
              <option key={a.code} value={a.code}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">Kredit schyot</span>
          <select
            disabled={posted}
            value={creditCode}
            onChange={(e) => setCreditCode(e.target.value)}
            className="mt-0.5 h-7 w-full rounded border border-input bg-background px-1.5 font-mono text-[11px]"
          >
            <option value="5110">5110 Bank hisobi</option>
            <option value="5010">5010 Kassa</option>
            <option value="6010">6010 Yetkazib beruvchi</option>
            <option value="9030">9030 Xizmat tushumi</option>
            <option value="9020">9020 Tovar tushumi</option>
            <option value="9010">9010 Mahsulot tushumi</option>
          </select>
        </div>
      </div>

      {scan.vatAmount > 0 && (
        <div className="text-[11px] font-mono text-muted-foreground">
          QQS (12%): {scan.vatAmount.toLocaleString("uz-UZ")} soʻm • Sof summa:{" "}
          {scan.netAmount.toLocaleString("uz-UZ")} soʻm
        </div>
      )}

      <div className="pt-1 flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-[11px] gap-1.5"
          onClick={handleCopySummary}
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Nusxalandi" : "Provodkani nusxalash"}
        </Button>
        {!posted && canPost && (
          <Button
            type="button"
            size="sm"
            variant="success"
            className="h-7 text-[11px] gap-1.5"
            disabled={isPosting || Number(totalAmount) <= 0}
            onClick={handleConfirm}
          >
            {isPosting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            Tasdiqlab Bosh kitobga yozish
          </Button>
        )}
      </div>
    </div>
  );
}
