"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getShellSharedDict, getIntlLocale } from "@/lib/i18n/domains/shell-shared";
import type { ScannedDocResult } from "@/lib/services/doc-scan-client";

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

interface ChatScanCardProps {
  scan: ScannedDocResult;
  isDuplicate?: boolean;
  posted?: boolean;
  canPost?: boolean;
  onPostToLedger: (editedScan: ScannedDocResult) => Promise<void>;
}

const DEBIT_ACCOUNT_CODES = ["6010", "9420", "9410", "2910", "1010", "4010", "5110"];
const CREDIT_ACCOUNT_CODES = ["5110", "5010", "6010", "9030", "9020", "9010"];

export function ChatScanCard({
  scan,
  isDuplicate = false,
  posted = false,
  canPost = true,
  onPostToLedger,
}: ChatScanCardProps) {
  const { t, locale } = useTranslation();
  const d = getShellSharedDict(locale);
  const intlLocale = getIntlLocale(locale);
  const sc = d.shared.chatScanCard;

  const [debitCode, setDebitCode] = useState(scan.suggestedDebitCode || "6010");
  const [creditCode, setCreditCode] = useState(scan.suggestedCreditCode || "5110");
  const [totalAmount, setTotalAmount] = useState(String(scan.totalAmount || 0));
  const [isPosting, setIsPosting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopySummary = async () => {
    const text = [
      `${scan.documentType}${scan.documentNumber ? ` №${scan.documentNumber}` : ""} (${scan.date})`,
      `${sc.copyCounterparty}: ${scan.counterparty}${scan.counterpartyStir ? ` (${t.entity.tin}: ${scan.counterpartyStir})` : ""}`,
      `${sc.copyAmount}: ${(Number(totalAmount) || scan.totalAmount).toLocaleString(intlLocale)} ${t.common.currency}${
        scan.vatAmount > 0 ? ` | ${sc.copyVat}: ${scan.vatAmount.toLocaleString(intlLocale)} ${t.common.currency}` : ""
      }`,
      `${sc.copyEntry}: ${d.aiDrawer.dtPrefix} ${debitCode} / ${d.aiDrawer.ktPrefix} ${creditCode}${scan.vatAmount > 0 ? ` (+ ${sc.vatLabel} ${scan.vatAccountCode})` : ""}`,
    ].join("\n");
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      toast.success(sc.copiedToast);
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast.error(sc.copyErrorToast);
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
              {sc.duplicateBadge}
            </Badge>
          )}
          <Badge variant={posted ? "success" : "outline"} className="text-[10px]">
            {posted ? sc.postedBadge : scan.date}
          </Badge>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground">
        <strong className="text-foreground">{scan.counterparty}</strong>
        {scan.counterpartyStir ? ` • ${t.entity.tin}: ${scan.counterpartyStir}` : ""}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
        <div>
          <span className="text-[10px] text-muted-foreground block">{sc.totalAmountLabel(t.common.currency)}</span>
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
          <span className="text-[10px] text-muted-foreground block">{sc.debitAccountLabel}</span>
          <select
            disabled={posted}
            value={debitCode}
            onChange={(e) => setDebitCode(e.target.value)}
            className="mt-0.5 h-7 w-full rounded border border-input bg-background px-1.5 font-mono text-[11px]"
          >
            {DEBIT_ACCOUNT_CODES.map((code) => (
              <option key={code} value={code}>
                {sc.debitAccounts[code] || code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">{sc.creditAccountLabel}</span>
          <select
            disabled={posted}
            value={creditCode}
            onChange={(e) => setCreditCode(e.target.value)}
            className="mt-0.5 h-7 w-full rounded border border-input bg-background px-1.5 font-mono text-[11px]"
          >
            {CREDIT_ACCOUNT_CODES.map((code) => (
              <option key={code} value={code}>
                {sc.creditAccounts[code] || code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {scan.vatAmount > 0 && (
        <div className="text-[11px] font-mono text-muted-foreground">
          {sc.vatLabel}: {scan.vatAmount.toLocaleString(intlLocale)} {t.common.currency} • {sc.netLabel}:{" "}
          {scan.netAmount.toLocaleString(intlLocale)} {t.common.currency}
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
          {copied ? sc.copiedBtn : sc.copyBtn}
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
            {sc.postToLedgerBtn}
          </Button>
        )}
      </div>
    </div>
  );
}
