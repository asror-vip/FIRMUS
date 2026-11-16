import { supabase } from "@/lib/supabase/client";
import { roundMoney } from "@/lib/utils/finance";
import {
  saveWorkBatch,
  markWorkBatchPosted,
  findDuplicateScanBatch,
} from "@/lib/services/supabase-service";

export interface ScannedDocItem {
  name: string;
  mxikHint: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  vatRate: number;
}

export interface ScannedDocResult {
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
  items: ScannedDocItem[];
  suggestedDebitCode: string;
  suggestedCreditCode: string;
  vatAccountCode: string;
  provodkaExplanation: string;
  risks: string[];
}

export async function scanCompressedImageAndSave(params: {
  dataUrl: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  fileName: string;
  userNote?: string;
  entityId?: string;
}): Promise<{
  scan: ScannedDocResult;
  savedBatchId: string | null;
  isDuplicate: boolean;
}> {
  const res = await fetch("/api/ai-document-scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "invoice_receipt",
      chatImageOnly: true,
      fileName: params.fileName,
      mimeType: params.mimeType,
      base64Data: params.dataUrl,
      userNote: params.userNote?.trim() || undefined,
    }),
  });

  const data = (await res.json()) as ScannedDocResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Rasmni oʻqib boʻlmadi");
  }

  let savedBatchId: string | null = null;
  let isDuplicate = false;

  if (params.entityId && data.totalAmount > 0) {
    try {
      const dup = await findDuplicateScanBatch({
        entityId: params.entityId,
        date: data.date,
        totalAmount: data.totalAmount,
        documentNumber: data.documentNumber,
      });
      if (dup) {
        isDuplicate = true;
      }
      const saved = await saveWorkBatch({
        entityId: params.entityId,
        batchType: "document_scan",
        periodMonth: /^\d{4}-\d{2}/.test(data.date) ? data.date.slice(0, 7) : undefined,
        title: `${data.documentType}: ${data.counterparty || params.fileName}`.slice(0, 180),
        bankFileName: params.fileName,
        rowCount: Math.max(1, data.items?.length || 1),
        totalIncome: data.direction === "income" ? data.totalAmount : 0,
        totalExpense: data.direction === "income" ? 0 : data.totalAmount,
        status: "reviewed",
        summaryJson: {
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          date: data.date,
          counterparty: data.counterparty,
          counterpartyStir: data.counterpartyStir,
          totalAmount: data.totalAmount,
          vatAmount: data.vatAmount,
        },
        sanitizedPayload: data,
      });
      savedBatchId = saved.id;
    } catch (saveErr) {
      console.warn("Work batch scan history save warning:", saveErr);
    }
  }

  return { scan: data, savedBatchId, isDuplicate };
}

export async function postScannedDocToLedger(params: {
  entityId: string;
  scan: ScannedDocResult;
  batchId?: string | null;
}): Promise<void> {
  const { entityId, scan, batchId } = params;
  const gross = roundMoney(scan.totalAmount);
  const vat = roundMoney(scan.vatAmount);
  const net = roundMoney(gross - vat);
  const safeDesc = `${scan.documentType} ${
    scan.documentNumber ? `№${scan.documentNumber} ` : ""
  }(${scan.counterparty})`.slice(0, 220);

  let lines: Array<{
    account_code: string;
    account_name: string;
    debit_amount: number;
    credit_amount: number;
    memo: string;
  }> = [];

  if (vat > 0 && net > 0) {
    if (scan.direction === "income") {
      lines = [
        {
          account_code: scan.suggestedDebitCode || "4010",
          account_name: scan.suggestedDebitCode || "4010",
          debit_amount: gross,
          credit_amount: 0,
          memo: safeDesc,
        },
        {
          account_code: scan.suggestedCreditCode || "9030",
          account_name: scan.suggestedCreditCode || "9030",
          debit_amount: 0,
          credit_amount: net,
          memo: `${safeDesc} (QQSsiz)`,
        },
        {
          account_code: "6410",
          account_name: "Chiquvchi QQS 12%",
          debit_amount: 0,
          credit_amount: vat,
          memo: "QQS 12%",
        },
      ];
    } else {
      lines = [
        {
          account_code: scan.suggestedDebitCode || "6010",
          account_name: scan.suggestedDebitCode || "6010",
          debit_amount: net,
          credit_amount: 0,
          memo: `${safeDesc} (QQSsiz)`,
        },
        {
          account_code: "4410",
          account_name: "Kiruvchi QQS 12%",
          debit_amount: vat,
          credit_amount: 0,
          memo: "QQS 12% zachyot",
        },
        {
          account_code: scan.suggestedCreditCode || "5110",
          account_name: scan.suggestedCreditCode || "5110",
          debit_amount: 0,
          credit_amount: gross,
          memo: safeDesc,
        },
      ];
    }
  } else {
    lines = [
      {
        account_code: scan.suggestedDebitCode || "6010",
        account_name: scan.suggestedDebitCode || "6010",
        debit_amount: gross,
        credit_amount: 0,
        memo: safeDesc,
      },
      {
        account_code: scan.suggestedCreditCode || "5110",
        account_name: scan.suggestedCreditCode || "5110",
        debit_amount: 0,
        credit_amount: gross,
        memo: safeDesc,
      },
    ];
  }

  const { error } = await supabase.rpc("create_journal_entry_atomic", {
    p_business_entity_id: entityId,
    p_entry_number: `JE-OCR-${Date.now().toString().slice(-5)}`,
    p_entry_date: scan.date,
    p_description: safeDesc,
    p_source_type: "ocr_scan",
    p_idempotency_key: `idem-ocr-${entityId}-${scan.date}-${gross}-${scan.documentNumber || "doc"}`,
    p_lines: lines,
  });

  if (error) throw error;

  if (batchId) {
    await markWorkBatchPosted(batchId);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("firmus:refresh-data", { detail: { entityId } }));
  }
}
