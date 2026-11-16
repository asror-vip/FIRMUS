import { parse1CClientBankText, parseBankCsv, parseBankRows, type ParsedBankTransaction } from "./bank-import";
import { parseXlsxBufferToRows } from "./xlsx-parser";
import { roundMoney } from "@/lib/utils/finance";
import { sanitizeStringForAi } from "@/lib/utils/privacy";

export type ReconcileStatus = "matched" | "amount_mismatch" | "bank_only" | "one_c_only";

export const RECONCILE_ACCOUNT_OPTIONS: Array<{ code: string; name: string }> = [
  { code: "4010", name: "Xaridorlar va buyurtmachilardan olinadigan schyotlar" },
  { code: "4310", name: "Yetkazib beruvchilarga berilgan boʻnaklar" },
  { code: "4410", name: "Budjetga oldindan toʻlangan soliqlar (QQS)" },
  { code: "4510", name: "Mehnat haqi boʻyicha berilgan boʻnaklar" },
  { code: "5010", name: "Kassadagi pul mablagʻlari" },
  { code: "5110", name: "Hisob-kitob schyoti (Milliy valyutada)" },
  { code: "5210", name: "Valyuta hisobvaragʻi" },
  { code: "6010", name: "Mol yetkazib beruvchilarga toʻlanadigan schyotlar" },
  { code: "6310", name: "Xaridorlardan olingan boʻnaklar" },
  { code: "6410", name: "Budjetga toʻlovlar boʻyicha qarzlar (Soliqlar)" },
  { code: "6520", name: "Maqsadli davlat jamgʻarmalariga toʻlovlar" },
  { code: "6710", name: "Mehnat haqi boʻyicha xodimlar bilan hisob-kitoblar" },
  { code: "6810", name: "Qisqa muddatli bank kreditlari" },
  { code: "9010", name: "Tayyor mahsulot sotishdan daromadlar" },
  { code: "9020", name: "Tovarlar sotishdan daromadlar" },
  { code: "9030", name: "Xizmatlar koʻrsatishdan daromadlar" },
  { code: "9410", name: "Sotish xarajatlari" },
  { code: "9420", name: "Maʼmuriy xarajatlar" },
  { code: "9430", name: "Boshqa operatsion xarajatlar" },
];

export interface ReconcileRow {
  id: string;
  status: ReconcileStatus;
  confidence: number;
  bankItem?: ParsedBankTransaction;
  oneCItem?: ParsedBankTransaction;
  date: string;
  type: "income" | "expense";
  counterparty: string;
  counterpartyStir?: string;
  bankAmount: number;
  oneCAmount: number;
  diffAmount: number;
  suggestedAccountCode: string;
  suggestedAccountName: string;
  explanation: string;
  aiVerified?: boolean;
  vatIncluded?: boolean;
}

export function detectVatIncluded(description: string): boolean {
  const lower = description.toLowerCase();
  if (/(qqssiz|без\s+ндс|без\s+nds|no\s+vat)/i.test(lower)) return false;
  return /(qqs|ндс|\bnds\b|vat|12%)/i.test(lower);
}

export interface ReconcileSummary {
  matchedCount: number;
  mismatchCount: number;
  bankOnlyCount: number;
  oneCOnlyCount: number;
  bankTotalIncome: number;
  bankTotalExpense: number;
  oneCTotalIncome: number;
  oneCTotalExpense: number;
}

/**
 * Decodes ArrayBuffer uploaded from Uzbek banks or 1C.
 * Auto-falls back to windows-1251 if UTF-8 yields replacement characters (\uFFFD).
 */
export function decodeBankFileBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    try {
      return new TextDecoder("utf-16le").decode(buffer);
    } catch {}
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    try {
      return new TextDecoder("utf-16be").decode(buffer);
    } catch {}
  }
  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (utf8Text.includes("\uFFFD")) {
    try {
      return new TextDecoder("windows-1251").decode(buffer);
    } catch {
      return utf8Text;
    }
  }
  return utf8Text;
}

function extractXmlTag(block: string, tags: string[]): string {
  for (const tag of tags) {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const m = block.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function normalizeXmlDate(dateRaw: string): string {
  const clean = dateRaw.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const dmy = clean.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return new Date().toISOString().split("T")[0];
}

/**
 * Parses 1C EnterpriseData XML (<Operation>) or generic 1C payment XML blocks.
 */
export function parse1CEnterpriseXml(xmlText: string): ParsedBankTransaction[] {
  const results: ParsedBankTransaction[] = [];
  let opBlocks = xmlText.match(/<Operation\b[^>]*>[\s\S]*?<\/Operation>/gi) || [];
  if (opBlocks.length === 0) {
    opBlocks = xmlText.match(/<(?:Document|Документ)\b[^>]*>[\s\S]*?<\/(?:Document|Документ)>/gi) || [];
  }

  for (const op of opBlocks) {
    const dateRaw = extractXmlTag(op, ["Date", "Дата"]);
    const date = normalizeXmlDate(dateRaw);
    const comment = extractXmlTag(op, ["Comment", "НазначениеПлатежа", "Memo", "Содержание"]) || "1C operatsiya";
    const docNum = extractXmlTag(op, ["Number", "Номер"]);

    const lines = op.match(/<Line\b[^>]*>[\s\S]*?<\/Line>/gi) || [];
    if (lines.length > 0) {
      let bankDebit = 0;
      let bankCredit = 0;
      let corrCode = "";
      let corrName = "";

      for (const l of lines) {
        const code = extractXmlTag(l, ["AccountCode"]);
        const name = extractXmlTag(l, ["AccountName"]);
        const dt = parseFloat((extractXmlTag(l, ["Debit"]) || "0").replace(/\s/g, "").replace(",", ".")) || 0;
        const ct = parseFloat((extractXmlTag(l, ["Credit"]) || "0").replace(/\s/g, "").replace(",", ".")) || 0;

        if (code.startsWith("51") || code.startsWith("52") || code.startsWith("50")) {
          bankDebit += dt;
          bankCredit += ct;
        } else if (!corrCode && code) {
          corrCode = code;
          corrName = name;
        }
      }

      const amountRaw =
        bankDebit > 0 || bankCredit > 0
          ? Math.max(bankDebit, bankCredit)
          : parseFloat((extractXmlTag(op, ["Amount", "Сумма"]) || "0").replace(/\s/g, "").replace(",", ".")) || 0;

      if (amountRaw > 0) {
        const type: "income" | "expense" = bankCredit > bankDebit ? "expense" : "income";
        results.push({
          date,
          amount: roundMoney(amountRaw),
          type,
          counterparty: extractXmlTag(op, ["Counterparty", "Контрагент"]) || comment.split(/[:—-]/)[0]?.trim() || "1C Kontragent",
          counterpartyStir: extractXmlTag(op, ["STIR", "INN", "ИНН"]).replace(/\D/g, "").slice(0, 9) || undefined,
          description: comment,
          accountCode: corrCode || (type === "income" ? "4010" : "6010"),
          accountName: corrName || (type === "income" ? "Xaridorlar" : "Yetkazib beruvchilar"),
          documentNumber: docNum || undefined,
        });
      }
    } else {
      const amount = parseFloat((extractXmlTag(op, ["Amount", "Сумма"]) || "0").replace(/\s/g, "").replace(",", ".")) || 0;
      if (amount > 0) {
        results.push({
          date,
          amount: roundMoney(amount),
          type: "expense",
          counterparty: extractXmlTag(op, ["Counterparty", "Контрагент"]) || "1C Kontragent",
          counterpartyStir: extractXmlTag(op, ["STIR", "INN", "ИНН"]).replace(/\D/g, "").slice(0, 9) || undefined,
          description: comment,
          accountCode: "6010",
          accountName: "Yetkazib beruvchilar",
          documentNumber: docNum || undefined,
        });
      }
    }
  }

  return results;
}

export function parseStatementFile(
  rawText: string,
  fileName: string,
  ourEntityStir = ""
): ParsedBankTransaction[] {
  const lower = fileName.toLowerCase();
  if (rawText.includes("1CClientBankExchange") || rawText.includes("СекцияДокумент=") || lower.endsWith(".txt")) {
    const parsedTxt = parse1CClientBankText(rawText, ourEntityStir);
    if (parsedTxt.length > 0) return parsedTxt;
  }
  if (lower.endsWith(".xml") || rawText.includes("<EnterpriseData") || rawText.includes("<Operation")) {
    const parsedXml = parse1CEnterpriseXml(rawText);
    if (parsedXml.length > 0) return parsedXml;
  }
  return parseBankCsv(rawText);
}

/**
 * Full binary/text statement parser: handles native .xlsx ZIP Excel workbooks as well as
 * 1C Client-Bank .txt, EnterpriseData .xml, CSV/TSV, HTML .xls, and XML SpreadsheetML.
 */
export async function parseStatementFileBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  ourEntityStir = ""
): Promise<ParsedBankTransaction[]> {
  const bytes = new Uint8Array(buffer);
  const lower = fileName.toLowerCase();
  const isZipMagic = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;

  if (lower.endsWith(".xlsx") || isZipMagic) {
    const xlsxRows = await parseXlsxBufferToRows(buffer);
    return parseBankRows(xlsxRows);
  }

  const text = decodeBankFileBuffer(buffer);
  return parseStatementFile(text, fileName, ourEntityStir);
}

/**
 * Deterministic 21-BHMS account classifier for Uzbekistan bank payments.
 */
export function classify21BhmsAccount(item: ParsedBankTransaction): {
  accountCode: string;
  accountName: string;
  reason: string;
} {
  const desc = `${item.description} ${item.counterparty}`.toLowerCase();

  if (
    desc.includes("комисс") ||
    desc.includes("komissiya") ||
    desc.includes("рко") ||
    desc.includes("услуг банк") ||
    desc.includes("bank xizmat") ||
    desc.includes("sms") ||
    desc.includes("abonent")
  ) {
    return {
      accountCode: "9420",
      accountName: "Maʼmuriy xarajatlar (Bank xizmati)",
      reason: "Bank komissiyasi va RKO xizmatlari 9420 davr xarajatiga yoziladi.",
    };
  }

  if (
    desc.includes("инпс") ||
    desc.includes("inps") ||
    desc.includes("ижтимоий") ||
    desc.includes("ijtimoiy") ||
    desc.includes("пенс") ||
    desc.includes("шжбпх")
  ) {
    return {
      accountCode: "6520",
      accountName: "Maqsadli davlat jamgʻarmalariga toʻlovlar",
      reason: "Ijtimoiy soliq va ShJBPH toʻlovlari 6520 schyotida aks etadi.",
    };
  }

  if (
    desc.includes("налог") ||
    desc.includes("soliq") ||
    desc.includes("ндс") ||
    desc.includes("qqs") ||
    desc.includes("гнк") ||
    desc.includes("gnk") ||
    desc.includes("byudjet") ||
    desc.includes("бюджет") ||
    desc.includes("jshds") ||
    desc.includes("jshods") ||
    desc.includes("ндфл")
  ) {
    return {
      accountCode: "6410",
      accountName: "Budjetga toʻlovlar boʻyicha qarzlar (Soliqlar)",
      reason: "Soliq va budjet toʻlovlari 6410 schyotiga oʻtkaziladi.",
    };
  }

  if (
    desc.includes("зарплат") ||
    desc.includes("ish haqi") ||
    desc.includes("oylik") ||
    desc.includes("мехнат хак") ||
    desc.includes("mehnat haq")
  ) {
    return {
      accountCode: "6710",
      accountName: "Mehnat haqi boʻyicha xodimlar bilan hisob-kitoblar",
      reason: "Xodimlarga ish haqi toʻlovlari 6710 schyotida yuritiladi.",
    };
  }

  if (
    desc.includes("аванс") ||
    desc.includes("avans") ||
    desc.includes("предоплат") ||
    desc.includes("boʻnak") ||
    desc.includes("bo'nak")
  ) {
    return item.type === "income"
      ? {
          accountCode: "6310",
          accountName: "Xaridorlardan olingan boʻnaklar",
          reason: "Xaridordan kelgan oldindan toʻlov (boʻnak) 6310 schyotiga olinadi.",
        }
      : {
          accountCode: "4310",
          accountName: "Yetkazib beruvchilarga berilgan boʻnaklar",
          reason: "Yetkazib beruvchiga chiqarilgan oldindan toʻlov 4310 schyotida yuradi.",
        };
  }

  return item.type === "income"
    ? {
        accountCode: "4010",
        accountName: "Xaridorlar va buyurtmachilardan olinadigan schyotlar",
        reason: "Xaridordan tushgan tushum 5110 Dt / 4010 Kt tarzida aks ettiriladi.",
      }
    : {
        accountCode: "6010",
        accountName: "Mol yetkazib beruvchilarga toʻlanadigan schyotlar",
        reason: "Yetkazib beruvchiga toʻlov 6010 Dt / 5110 Kt tarzida aks ettiriladi.",
      };
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/["'«»„“]/g, "")
    .replace(/\b(mchj|ooo|xk|qk|yatt|aj|llc)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dateDiffDays(a: string, b: string): number {
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (isNaN(da) || isNaN(db)) return 999;
  return Math.abs(Math.round((da - db) / 86_400_000));
}

/**
 * Two-way reconciliation between Bank Statement rows and 1C Export rows.
 */
export function reconcileBankAnd1C(
  bankItems: ParsedBankTransaction[],
  oneCItems: ParsedBankTransaction[]
): { rows: ReconcileRow[]; summary: ReconcileSummary } {
  const usedOneC = new Set<number>();
  const rows: ReconcileRow[] = [];

  for (let i = 0; i < bankItems.length; i++) {
    const b = bankItems[i];
    const bNormName = normalizeName(b.counterparty);

    let bestIdx = -1;
    let bestScore = -1;
    let isExactMatch = false;

    for (let j = 0; j < oneCItems.length; j++) {
      if (usedOneC.has(j)) continue;
      const c = oneCItems[j];
      if (b.type !== c.type) continue;

      const stirMatch = Boolean(b.counterpartyStir && c.counterpartyStir && b.counterpartyStir === c.counterpartyStir);
      const cNormName = normalizeName(c.counterparty);
      const nameMatch =
        bNormName.length >= 5
          ? cNormName.includes(bNormName.slice(0, 6))
          : bNormName.length > 0 && bNormName === cNormName;
      const docMatch = Boolean(b.documentNumber && c.documentNumber && b.documentNumber === c.documentNumber);
      const days = dateDiffDays(b.date, c.date);
      const diffAmt = Math.abs(b.amount - c.amount);

      if (diffAmt <= 1 && (stirMatch || nameMatch || docMatch) && days <= 5) {
        const score = 100 - days + (stirMatch ? 20 : 0) + (docMatch ? 15 : 0);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = j;
          isExactMatch = true;
        }
      } else if (!isExactMatch && (stirMatch || docMatch || nameMatch) && days <= 7) {
        const score = (stirMatch ? 50 : 25) + (docMatch ? 30 : 0) - days;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = j;
        }
      }
    }

    const cls = classify21BhmsAccount(b);
    const vatAuto =
      detectVatIncluded(b.description) &&
      !["6410", "6520", "6710", "9420"].includes(cls.accountCode);

    if (bestIdx !== -1 && isExactMatch) {
      usedOneC.add(bestIdx);
      const c = oneCItems[bestIdx];
      rows.push({
        id: `rec-m-${i}`,
        status: "matched",
        confidence: 99,
        bankItem: b,
        oneCItem: c,
        date: b.date,
        type: b.type,
        counterparty: b.counterparty,
        counterpartyStir: b.counterpartyStir || c.counterpartyStir,
        bankAmount: roundMoney(b.amount),
        oneCAmount: roundMoney(c.amount),
        diffAmount: 0,
        suggestedAccountCode: c.accountCode || cls.accountCode,
        suggestedAccountName: c.accountName || cls.accountName,
        explanation: "Bank koʻchirmasi va 1C yozuvi sana, kontragent hamda summa boʻyicha 100% mos.",
        vatIncluded: vatAuto,
      });
    } else if (bestIdx !== -1) {
      usedOneC.add(bestIdx);
      const c = oneCItems[bestIdx];
      const diff = roundMoney(b.amount - c.amount);
      rows.push({
        id: `rec-mis-${i}`,
        status: "amount_mismatch",
        confidence: 78,
        bankItem: b,
        oneCItem: c,
        date: b.date,
        type: b.type,
        counterparty: b.counterparty,
        counterpartyStir: b.counterpartyStir || c.counterpartyStir,
        bankAmount: roundMoney(b.amount),
        oneCAmount: roundMoney(c.amount),
        diffAmount: diff,
        suggestedAccountCode: c.accountCode || cls.accountCode,
        suggestedAccountName: c.accountName || cls.accountName,
        explanation:
          diff !== 0
            ? `Summa tafovuti: Bank (${b.amount.toLocaleString("uz-UZ")}) vs 1C (${c.amount.toLocaleString("uz-UZ")}), farq = ${diff.toLocaleString("uz-UZ")} soʻm.`
            : `Sana tafovuti: Bank (${b.date}) vs 1C (${c.date}).`,
        vatIncluded: vatAuto,
      });
    } else {
      rows.push({
        id: `rec-bank-${i}`,
        status: "bank_only",
        confidence: 90,
        bankItem: b,
        date: b.date,
        type: b.type,
        counterparty: b.counterparty,
        counterpartyStir: b.counterpartyStir,
        bankAmount: roundMoney(b.amount),
        oneCAmount: 0,
        diffAmount: roundMoney(b.amount),
        suggestedAccountCode: cls.accountCode,
        suggestedAccountName: cls.accountName,
        explanation: `1C faylida topilmadi. AI taklifi: ${cls.accountCode} (${cls.reason})`,
        vatIncluded: vatAuto,
      });
    }
  }

  for (let j = 0; j < oneCItems.length; j++) {
    if (usedOneC.has(j)) continue;
    const c = oneCItems[j];
    rows.push({
      id: `rec-1c-${j}`,
      status: "one_c_only",
      confidence: 85,
      oneCItem: c,
      date: c.date,
      type: c.type,
      counterparty: c.counterparty,
      counterpartyStir: c.counterpartyStir,
      bankAmount: 0,
      oneCAmount: roundMoney(c.amount),
      diffAmount: roundMoney(-c.amount),
      suggestedAccountCode: c.accountCode || (c.type === "income" ? "4010" : "6010"),
      suggestedAccountName: c.accountName || "Kontragent",
      explanation: "1C da mavjud, lekin bank koʻchirmasida oʻtmagan (kutilayotgan toʻlov yoki 1C dublikati boʻlishi mumkin).",
      vatIncluded: detectVatIncluded(c.description),
    });
  }

  const summary: ReconcileSummary = {
    matchedCount: rows.filter((r) => r.status === "matched").length,
    mismatchCount: rows.filter((r) => r.status === "amount_mismatch").length,
    bankOnlyCount: rows.filter((r) => r.status === "bank_only").length,
    oneCOnlyCount: rows.filter((r) => r.status === "one_c_only").length,
    bankTotalIncome: roundMoney(bankItems.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0)),
    bankTotalExpense: roundMoney(bankItems.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0)),
    oneCTotalIncome: roundMoney(oneCItems.filter((x) => x.type === "income").reduce((s, x) => s + x.amount, 0)),
    oneCTotalExpense: roundMoney(oneCItems.filter((x) => x.type === "expense").reduce((s, x) => s + x.amount, 0)),
  };

  return { rows, summary };
}

export interface ReconcileJournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo: string;
}

/**
 * Builds balanced 21-BHMS double-entry lines (2-line or 3-line 12% VAT split) for a reconciled bank row.
 */
export function buildReconcileJournalLines(row: ReconcileRow): ReconcileJournalLine[] {
  const gross = roundMoney(row.bankAmount || row.oneCAmount);
  if (gross <= 0) return [];

  const safeDesc = sanitizeStringForAi(
    `${row.counterparty}: ${row.bankItem?.description || row.oneCItem?.description || row.explanation}`
  ).slice(0, 220);

  const bankName = "Hisob-kitob schyoti (5110)";
  const accountCode = row.suggestedAccountCode || (row.type === "income" ? "4010" : "6010");
  const accountName =
    row.suggestedAccountName ||
    RECONCILE_ACCOUNT_OPTIONS.find((a) => a.code === accountCode)?.name ||
    accountCode;

  const canSplitVat = Boolean(row.vatIncluded) && accountCode !== "4410" && accountCode !== "6410" && accountCode !== "5110";

  if (canSplitVat) {
    const vat = roundMoney((gross * 12) / 112);
    const net = roundMoney(gross - vat);
    if (vat > 0 && net > 0) {
      if (row.type === "income") {
        return [
          { accountCode: "5110", accountName: bankName, debit: gross, credit: 0, memo: safeDesc },
          { accountCode, accountName, debit: 0, credit: net, memo: `${safeDesc} (QQSsiz)` },
          {
            accountCode: "6410",
            accountName: "Budjetga toʻlovlar boʻyicha qarzlar (QQS 12%)",
            debit: 0,
            credit: vat,
            memo: `QQS 12%: ${row.counterparty}`,
          },
        ];
      }
      return [
        { accountCode, accountName, debit: net, credit: 0, memo: `${safeDesc} (QQSsiz)` },
        {
          accountCode: "4410",
          accountName: "Budjetga oldindan toʻlangan soliqlar (QQS 12%)",
          debit: vat,
          credit: 0,
          memo: `Zachyot QQS 12%: ${row.counterparty}`,
        },
        { accountCode: "5110", accountName: bankName, debit: 0, credit: gross, memo: safeDesc },
      ];
    }
  }

  return row.type === "income"
    ? [
        { accountCode: "5110", accountName: bankName, debit: gross, credit: 0, memo: safeDesc },
        { accountCode, accountName, debit: 0, credit: gross, memo: safeDesc },
      ]
    : [
        { accountCode, accountName, debit: gross, credit: 0, memo: safeDesc },
        { accountCode: "5110", accountName: bankName, debit: 0, credit: gross, memo: safeDesc },
      ];
}

export function sanitizeReconcileRowsForStorage(rows: ReconcileRow[]): ReconcileRow[] {
  return rows.map((r) => ({
    ...r,
    counterparty: sanitizeStringForAi(r.counterparty),
    explanation: sanitizeStringForAi(r.explanation),
    bankItem: r.bankItem
      ? {
          ...r.bankItem,
          counterparty: sanitizeStringForAi(r.bankItem.counterparty),
          description: sanitizeStringForAi(r.bankItem.description),
        }
      : undefined,
    oneCItem: r.oneCItem
      ? {
          ...r.oneCItem,
          counterparty: sanitizeStringForAi(r.oneCItem.counterparty),
          description: sanitizeStringForAi(r.oneCItem.description),
        }
      : undefined,
  }));
}

/**
 * Strips all PII (cards, PINFL, phones, STIR) inside browser memory before sending rows to /api/ai-reconcile.
 */
export function buildSafeAiReconcileInput(rows: ReconcileRow[]) {
  return rows
    .filter((r) => r.status !== "matched")
    .slice(0, 35)
    .map((r) => ({
      id: r.id,
      status: r.status,
      date: r.date,
      type: r.type,
      bankAmount: r.bankAmount,
      oneCAmount: r.oneCAmount,
      diffAmount: r.diffAmount,
      purpose: sanitizeStringForAi(r.bankItem?.description || r.oneCItem?.description || "").slice(0, 180),
      counterpartyHint: sanitizeStringForAi(r.counterparty).slice(0, 80),
      currentAccountCode: r.suggestedAccountCode,
    }));
}

function sanitizeCsvField(val?: string | null): string {
  const str = String(val || "");
  const trimmed = str.trimStart();
  const escaped = str.replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `"'${escaped}"`;
  }
  return `"${escaped}"`;
}

export function buildReconcileCsvReport(rows: ReconcileRow[]): string {
  const header = "Holat;Sana;Turi;Kontragent;STIR;Bank summasi;1C summasi;Farq;21-BHMS Schyot;QQS 12%;Izoh";
  const labelMap: Record<ReconcileStatus, string> = {
    matched: "MOS",
    amount_mismatch: "FARQ_BOR",
    bank_only: "BANKDA_BOR_1CDA_YOQ",
    one_c_only: "1CDA_BOR_BANKDA_YOQ",
  };
  const body = rows.map((r) =>
    [
      labelMap[r.status],
      r.date,
      r.type === "income" ? "Kirim" : "Chiqim",
      sanitizeCsvField(r.counterparty),
      r.counterpartyStir || "",
      r.bankAmount,
      r.oneCAmount,
      r.diffAmount,
      r.suggestedAccountCode,
      r.vatIncluded ? "Ha (12%)" : "Yo'q",
      sanitizeCsvField(r.explanation),
    ].join(";")
  );
  return "\uFEFF" + [header, ...body].join("\r\n");
}
