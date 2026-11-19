import { roundMoney } from "@/lib/utils/finance";
import { resolveUzTaxRules } from "@/lib/services/uz-tax-calculator";

export type DocumentScanIssueCode =
  | "items_sum_mismatch"
  | "item_line_math_mismatch"
  | "vat_math_mismatch"
  | "invalid_stir"
  | "invalid_date"
  | "missing_total";

export interface DocumentScanValidationIssue {
  code: DocumentScanIssueCode;
  message: string;
}

export interface DocumentScanVerificationResult {
  needsReview: boolean;
  reviewBadgeLabel: string;
  issues: DocumentScanValidationIssue[];
  checks: {
    itemsSumOk: boolean;
    vatMathOk: boolean;
    stirOk: boolean;
    dateOk: boolean;
  };
}

export interface ScannedItemCheckInput {
  name?: string;
  qty?: number;
  price?: number;
  total?: number;
  vatRate?: number;
}

export interface ScannedDocumentCheckInput {
  mode: "invoice_receipt" | "contract_risk";
  rawDate?: string | null;
  rawStir?: string | null;
  totalAmount: number;
  vatAmount: number;
  netAmount: number;
  items?: ScannedItemCheckInput[];
  todayIso?: string;
}

export function isValidCalendarIsoDate(rawDate?: string | null): boolean {
  const s = String(rawDate || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() + 1 === month &&
    dt.getUTCDate() === day
  );
}

/**
 * Deterministic server-side verification of AI OCR / document scan output.
 * Checks:
 *  1) Sum of item lines == totalAmount (or netAmount when lines exclude VAT)
 *  2) VAT amount ≈ vatRate * netAmount
 *  3) Counterparty STIR is exactly 9 digits
 *  4) Document date is a valid calendar date (not in far future / malformed)
 * Sets `needsReview = true` and `reviewBadgeLabel = "Tekshiring"` if any check fails.
 */
export function validateScannedDocumentResult(
  input: ScannedDocumentCheckInput
): DocumentScanVerificationResult {
  const issues: DocumentScanValidationIssue[] = [];
  const items = Array.isArray(input.items) ? input.items : [];
  const totalAmount = roundMoney(Math.max(0, Number(input.totalAmount || 0)));
  const vatAmount = roundMoney(Math.max(0, Number(input.vatAmount || 0)));
  const netAmount = roundMoney(Math.max(0, Number(input.netAmount || 0)));

  let itemsSumOk = true;
  let vatMathOk = true;
  let stirOk = true;
  let dateOk = true;

  // 1. Date validation
  const rawDate = String(input.rawDate || "").trim();
  if (!isValidCalendarIsoDate(rawDate)) {
    dateOk = false;
    issues.push({
      code: "invalid_date",
      message: "Hujjat sanasi notoʻgʻri formatda yoki aniqlanmadi — tekshiring.",
    });
  } else {
    const todayStr = input.todayIso || new Date().toISOString().slice(0, 10);
    const maxAllowedMs = Date.parse(`${todayStr}T00:00:00Z`) + 30 * 24 * 60 * 60 * 1000;
    const docMs = Date.parse(`${rawDate}T00:00:00Z`);
    if (Number.isFinite(maxAllowedMs) && Number.isFinite(docMs) && docMs > maxAllowedMs) {
      dateOk = false;
      issues.push({
        code: "invalid_date",
        message: `Hujjat sanasi (${rawDate}) kelajakdagi sana sifatida koʻrsatilgan — tekshiring.`,
      });
    }
  }

  // 2. STIR validation (9 digits)
  const rawStir = String(input.rawStir || "").trim();
  const digitsOnlyStir = rawStir.replace(/\D/g, "");
  const isExactNineDigits = /^\d{9}$/.test(rawStir) && rawStir !== "000000000";
  if (input.mode === "invoice_receipt") {
    if (!isExactNineDigits) {
      stirOk = false;
      issues.push({
        code: "invalid_stir",
        message: rawStir
          ? `Kontragent STIRi (${digitsOnlyStir || rawStir}) aniq 9 ta raqam emas — tekshiring.`
          : "Kontragent STIRi (9 raqam) aniqlanmadi — tekshiring.",
      });
    }
  } else if (rawStir.length > 0 && !isExactNineDigits) {
    stirOk = false;
    issues.push({
      code: "invalid_stir",
      message: `Shartnomadagi STIR (${rawStir}) aniq 9 ta raqam emas — tekshiring.`,
    });
  }

  // 3. Items sum vs Total amount validation
  if (input.mode === "invoice_receipt" && totalAmount <= 0) {
    itemsSumOk = false;
    issues.push({
      code: "missing_total",
      message: "Hujjat jami summasi 0 yoki aniqlanmadi — tekshiring.",
    });
  } else if (items.length > 0 && totalAmount > 0) {
    // Check individual item qty * price ≈ total
    for (const it of items) {
      const qty = Number(it.qty || 0);
      const price = Number(it.price || 0);
      const lineTotal = Number(it.total || 0);
      if (qty > 0 && price > 0 && lineTotal > 0) {
        const expectedLine = roundMoney(qty * price);
        const lineTol = Math.max(100, expectedLine * 0.01);
        const expectedLineWithVat =
          Number(it.vatRate || 0) > 0
            ? roundMoney(expectedLine * (1 + Number(it.vatRate) / 100))
            : expectedLine;
        if (
          Math.abs(lineTotal - expectedLine) > lineTol &&
          Math.abs(lineTotal - expectedLineWithVat) > lineTol
        ) {
          itemsSumOk = false;
          issues.push({
            code: "item_line_math_mismatch",
            message: `«${it.name || "Tovar"}» qatori (miqdor × narx = ${expectedLine}) jami (${lineTotal}) ga mos kelmadi — tekshiring.`,
          });
          break;
        }
      }
    }

    const itemsSum = roundMoney(items.reduce((s, it) => s + Math.max(0, Number(it.total || 0)), 0));
    if (itemsSum > 0) {
      const totalTol = Math.max(100, totalAmount * 0.005);
      const netTol = Math.max(100, netAmount * 0.005);
      const matchesTotal = Math.abs(itemsSum - totalAmount) <= totalTol;
      const matchesNet = vatAmount > 0 && Math.abs(itemsSum - netAmount) <= netTol;

      if (!matchesTotal && !matchesNet) {
        itemsSumOk = false;
        issues.push({
          code: "items_sum_mismatch",
          message: `Qatorlar yigʻindisi (${itemsSum.toLocaleString("en-US")}) hujjat jamisiga (${totalAmount.toLocaleString("en-US")}) mos kelmadi — tekshiring.`,
        });
      }
    }
  }

  // 4. VAT math validation: QQS ≈ stavka × asos
  if (vatAmount > 0) {
    if (vatAmount >= totalAmount || netAmount <= 0) {
      vatMathOk = false;
      issues.push({
        code: "vat_math_mismatch",
        message: "QQS summasi jami summadan katta yoki teng — tekshiring.",
      });
    } else {
      const itemRates = items
        .map((it) => Number(it.vatRate || 0))
        .filter((r) => r > 0 && r <= 30);
      const defaultVatRate = Math.round(resolveUzTaxRules().vatRate * 100); // 12%
      const effectiveRate = itemRates.length > 0 ? itemRates[0] : defaultVatRate;
      const expectedVat = roundMoney((netAmount * effectiveRate) / 100);
      const vatTol = Math.max(100, expectedVat * 0.02);

      if (Math.abs(vatAmount - expectedVat) > vatTol) {
        vatMathOk = false;
        issues.push({
          code: "vat_math_mismatch",
          message: `QQS summasi (${vatAmount.toLocaleString("en-US")}) ${effectiveRate}% stavka boʻyicha kutilgan summaga (${expectedVat.toLocaleString("en-US")}) mos kelmadi — tekshiring.`,
        });
      }
    }
  }

  const needsReview = issues.length > 0;
  return {
    needsReview,
    reviewBadgeLabel: needsReview ? "Tekshiring" : "Kod tekshiruvidan oʻtdi",
    issues,
    checks: {
      itemsSumOk,
      vatMathOk,
      stirOk,
      dateOk,
    },
  };
}
