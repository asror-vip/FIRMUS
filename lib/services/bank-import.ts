import { excelSerialToIsoDate } from "./xlsx-parser";

export interface ParsedBankTransaction {
  date: string;
  amount: number;
  type: "income" | "expense";
  counterparty: string;
  counterpartyStir?: string;
  description: string;
  accountCode: string;
  accountName: string;
  documentNumber?: string;
}

export function normalizeDateString(raw: string): string {
  const trimmed = raw.trim();
  const datePart = trimmed.split(/[\sT]/)[0].slice(0, 10);
  const iso = datePart;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso;
  }
  const dmy = iso.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (dmy) {
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${year}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  if (/^\d{5}(?:\.\d+)?$/.test(trimmed)) {
    const converted = excelSerialToIsoDate(trimmed);
    if (converted) return converted;
  }
  return new Date().toISOString().split("T")[0];
}

export function parseMoneyString(raw: string): number {
  if (!raw) return 0;
  let cleaned = raw
    .replace(/\u00A0/g, " ")
    .replace(/[^\d.,()\-+]/g, "")
    .trim();

  if (!cleaned) return 0;

  let isNegative = false;
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1);
  } else if (cleaned.startsWith("-")) {
    isNegative = true;
    cleaned = cleaned.slice(1);
  }

  // Handle European/Russian formats: "1.250.000,50" vs "1250000,50" vs "1,250,000.50"
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    const decimals = cleaned.length - lastComma - 1;
    cleaned = decimals <= 2 ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (lastDot > -1) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1 || /^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : Math.abs(num);
}

/**
 * Parses 1C Client-Bank Exchange format text (.txt)
 * Standard used by all Uzbek banks (Kapitalbank, Hamkor, Ipoteka, NBU, SQB, Ipak Yo'li, etc.)
 * Automatically detects our company account / direction even if ourEntityStir is omitted.
 */
export function parse1CClientBankText(textContent: string, ourEntityStir = ""): ParsedBankTransaction[] {
  const lines = textContent.split(/\r?\n/);
  const ourBankAccounts = new Set<string>();
  const rawDocs: Record<string, string>[] = [];

  let inDoc = false;
  let currentDoc: Record<string, string> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("СекцияДокумент=")) {
      inDoc = true;
      currentDoc = {};
      continue;
    }

    if (line === "КонецДокумента") {
      if (inDoc && currentDoc["Сумма"]) {
        rawDocs.push(currentDoc);
      }
      inDoc = false;
      currentDoc = {};
      continue;
    }

    if (line.includes("=")) {
      const idx = line.indexOf("=");
      const key = line.substring(0, idx).trim();
      const val = line.substring(idx + 1).trim();

      if (inDoc) {
        currentDoc[key] = val;
      } else if (key === "РасчСчет" && val) {
        ourBankAccounts.add(val.replace(/\s+/g, ""));
      }
    }
  }

  // Resolve our STIR automatically when caller does not supply one
  let resolvedOurStir = ourEntityStir.replace(/\D/g, "").slice(0, 9);
  if (!resolvedOurStir && rawDocs.length > 0) {
    // 1) Try matching header РасчСчет against doc accounts
    if (ourBankAccounts.size > 0) {
      for (const doc of rawDocs) {
        const pAcc = (doc["ПлательщикРасчСчет"] || doc["ПлательщикСчет"] || "").replace(/\s+/g, "");
        const rAcc = (doc["ПолучательРасчСчет"] || doc["ПолучательСчет"] || "").replace(/\s+/g, "");
        if (pAcc && ourBankAccounts.has(pAcc) && doc["ПлательщикИНН"]) {
          resolvedOurStir = doc["ПлательщикИНН"].replace(/\D/g, "").slice(0, 9);
          break;
        }
        if (rAcc && ourBankAccounts.has(rAcc) && doc["ПолучательИНН"]) {
          resolvedOurStir = doc["ПолучательИНН"].replace(/\D/g, "").slice(0, 9);
          break;
        }
      }
    }

    // 2) Try finding an STIR shared across every document in this bank statement
    if (!resolvedOurStir && rawDocs.length >= 2) {
      const counts = new Map<string, number>();
      for (const doc of rawDocs) {
        const pInn = (doc["ПлательщикИНН"] || "").replace(/\D/g, "").slice(0, 9);
        const rInn = (doc["ПолучательИНН"] || "").replace(/\D/g, "").slice(0, 9);
        const seenInDoc = new Set([pInn, rInn].filter((x) => x.length >= 6));
        for (const inn of seenInDoc) {
          counts.set(inn, (counts.get(inn) || 0) + 1);
        }
      }
      for (const [inn, count] of counts.entries()) {
        if (count === rawDocs.length) {
          resolvedOurStir = inn;
          break;
        }
      }
    }
  }

  const transactions: ParsedBankTransaction[] = [];

  for (const doc of rawDocs) {
    const amount = Math.abs(parseMoneyString(doc["Сумма"] || "0"));
    if (amount <= 0) continue;

    const rawDate = doc["Дата"] || doc["ДатаПоступило"] || doc["ДатаСписано"] || "";
    const formattedDate = normalizeDateString(rawDate);

    const payerInn = (doc["ПлательщикИНН"] || "").replace(/\D/g, "").slice(0, 9);
    const receiverInn = (doc["ПолучательИНН"] || "").replace(/\D/g, "").slice(0, 9);
    const payerAcc = (doc["ПлательщикРасчСчет"] || doc["ПлательщикСчет"] || "").replace(/\s+/g, "");
    const receiverAcc = (doc["ПолучательРасчСчет"] || doc["ПолучательСчет"] || "").replace(/\s+/g, "");

    const hasReceiptDate = Boolean((doc["ДатаПоступило"] || "").trim());
    const hasDebitDate = Boolean((doc["ДатаСписано"] || "").trim());

    let isReceiverUs = false;
    if (resolvedOurStir && receiverInn) {
      isReceiverUs = receiverInn === resolvedOurStir;
    } else if (resolvedOurStir && payerInn && payerInn === resolvedOurStir) {
      isReceiverUs = false;
    } else if (ourBankAccounts.size > 0 && (receiverAcc || payerAcc)) {
      isReceiverUs = Boolean(receiverAcc && ourBankAccounts.has(receiverAcc));
    } else if (hasReceiptDate !== hasDebitDate) {
      isReceiverUs = hasReceiptDate;
    }

    const type: "income" | "expense" = isReceiverUs ? "income" : "expense";
    const counterparty =
      type === "income"
        ? doc["Плательщик1"] || doc["Плательщик"] || "Mijoz"
        : doc["Получатель1"] || doc["Получатель"] || "Taʼminotchi";

    const counterpartyStir = type === "income" ? payerInn : receiverInn;
    const description = doc["НазначениеПлатежа"] || "Bank toʻlovi";
    const docNumber = doc["Номер"] || "";

    transactions.push({
      date: formattedDate,
      amount,
      type,
      counterparty: cleanOrgName(counterparty),
      counterpartyStir: counterpartyStir || undefined,
      description,
      accountCode: type === "income" ? "4010" : "6010",
      accountName: type === "income" ? "Xaridorlar schyoti" : "Yetkazib beruvchilar schyoti",
      documentNumber: docNumber || undefined,
    });
  }

  return transactions;
}

function extractHtmlTableRows(html: string): string[][] {
  const rows: string[][] = [];
  const trMatches = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trMatches) {
    const cells: string[] = [];
    const tdMatches = tr.match(/<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    for (const td of tdMatches) {
      const cleaned = td
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&quot;/gi, '"')
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/\s+/g, " ")
        .trim();
      cells.push(cleaned);
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function splitDelimitedRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result.map((c) => c.replace(/^["']|["']$/g, "").trim());
}

function extractSpreadsheetMlRows(xml: string): string[][] {
  const rows: string[][] = [];
  const rowMatches = xml.match(/<Row\b[^>]*>[\s\S]*?<\/Row>/gi) || [];
  for (const r of rowMatches) {
    const cells: string[] = [];
    const cellMatches = r.match(/<Cell\b[^>]*>[\s\S]*?<\/Cell>/gi) || [];
    for (const c of cellMatches) {
      const m = c.match(/<Data\b[^>]*>([\s\S]*?)<\/Data>/i);
      const val = (m?.[1] || c.replace(/<[^>]+>/g, ""))
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim();
      cells.push(val);
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

/**
 * Smart parser for CSV, TSV, Excel copy-paste, HTML .xls, and XML SpreadsheetML bank/1C statements.
 * Handles arbitrary Russian/Uzbek/English column headers as well as fixed-column legacy CSVs.
 */
export function parseBankCsv(csvContent: string): ParsedBankTransaction[] {
  const trimmed = csvContent.trim();
  if (!trimmed) return [];

  let rows: string[][] = [];
  const isHtmlTable = /<(html|table|tr)\b/i.test(trimmed);
  const isSpreadsheetMl = /<Workbook\b/i.test(trimmed) && /<Row\b/i.test(trimmed);

  if (isSpreadsheetMl) {
    rows = extractSpreadsheetMlRows(trimmed);
  } else if (isHtmlTable) {
    rows = extractHtmlTableRows(trimmed);
  } else {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const sampleLine = lines.slice(0, 5).join("\n");
    const tabCount = (sampleLine.match(/\t/g) || []).length;
    const semiCount = (sampleLine.match(/;/g) || []).length;
    const commaCount = (sampleLine.match(/,/g) || []).length;

    const delimiter = tabCount >= semiCount && tabCount >= commaCount && tabCount > 0
      ? "\t"
      : semiCount >= commaCount && semiCount > 0
      ? ";"
      : ",";

    rows = lines.map((l) => splitDelimitedRow(l, delimiter));
  }

  return parseBankRows(rows);
}

/**
 * Converts already-extracted 2D worksheet/table rows (.xlsx, HTML .xls, CSV) into typed transactions.
 */
export function parseBankRows(rows: string[][]): ParsedBankTransaction[] {
  if (rows.length <= 1) return [];

  // Detect smart header row within first 15 rows
  let headerRowIdx = -1;
  let colMap = {
    date: -1,
    counterparty: -1,
    stir: -1,
    docNum: -1,
    debit: -1,
    credit: -1,
    amount: -1,
    type: -1,
    desc: -1,
    debitIsIncome: false,
  };

  const fullTopText = rows.slice(0, 10).flat().join(" ").toLowerCase();
  const looksLike1CCard =
    fullTopText.includes("карточка счета") ||
    fullTopText.includes("оборотно-сальдовая") ||
    fullTopText.includes("1c");

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const cols = rows[r].map((c) => c.toLowerCase().trim());
    let d = -1, cp = -1, st = -1, doc = -1, deb = -1, cred = -1, amt = -1, typ = -1, dsc = -1;
    let debitInflowHint = looksLike1CCard;

    cols.forEach((h, idx) => {
      if (!h) return;
      if (d === -1 && /(^|[\s_./-])(sana|дата|date)/.test(h)) d = idx;
      else if (st === -1 && /(stir|инн|inn|tin)/.test(h)) st = idx;
      else if (doc === -1 && /(номер|hujjat|докум|№|\bno\b)/.test(h) && !/(счет|schyot)/.test(h)) doc = idx;
      else if (deb === -1 && /(расход|chiqim|списан|дебет|debit|outflow)/.test(h)) {
        deb = idx;
        if (/(расход|chiqim|списан)/.test(h)) debitInflowHint = false;
      } else if (cred === -1 && /(приход|kirim|поступ|зачисл|кредит|credit|inflow)/.test(h)) {
        cred = idx;
        if (/(приход|kirim|поступ|зачисл)/.test(h)) debitInflowHint = false;
      } else if (amt === -1 && /(summa|сумма|amount|miqdor)/.test(h)) amt = idx;
      else if (typ === -1 && /(^|[\s_./-])(turi|тип|type)($|[\s_./-])/.test(h)) typ = idx;
      else if (dsc === -1 && /(назначен|tavsif|izoh|описан|основан|purpose|description|comment)/.test(h)) dsc = idx;
      else if (cp === -1 && /(kontragent|корреспонд|контрагент|получател|плательщик|наименован|counterparty|client)/.test(h)) {
        cp = idx;
      }
    });

    const hasAmountCol = amt !== -1 || deb !== -1 || cred !== -1;
    if (d !== -1 && hasAmountCol) {
      headerRowIdx = r;
      colMap = {
        date: d,
        counterparty: cp,
        stir: st,
        docNum: doc,
        debit: deb,
        credit: cred,
        amount: amt,
        type: typ,
        desc: dsc,
        debitIsIncome: debitInflowHint,
      };
      break;
    }
  }

  const transactions: ParsedBankTransaction[] = [];

  if (headerRowIdx !== -1) {
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const cols = rows[i];
      if (cols.length < 2) continue;

      const rawDate = (cols[colMap.date] || "").trim();
      const isFormattedDate = /(\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{2,4})/.test(rawDate);
      const isExcelSerial = /^\d{5}(?:\.\d+)?$/.test(rawDate) && excelSerialToIsoDate(rawDate) !== null;
      if (!isFormattedDate && !isExcelSerial) continue;
      const date = normalizeDateString(rawDate);

      let amount = 0;
      let type: "income" | "expense" = "income";

      if (colMap.debit !== -1 || colMap.credit !== -1) {
        const debVal = colMap.debit !== -1 ? Math.abs(parseMoneyString(cols[colMap.debit] || "")) : 0;
        const credVal = colMap.credit !== -1 ? Math.abs(parseMoneyString(cols[colMap.credit] || "")) : 0;
        if (colMap.debitIsIncome) {
          if (debVal > 0) {
            amount = debVal;
            type = "income";
          } else if (credVal > 0) {
            amount = credVal;
            type = "expense";
          }
        } else {
          if (credVal > 0) {
            amount = credVal;
            type = "income";
          } else if (debVal > 0) {
            amount = debVal;
            type = "expense";
          }
        }
      } else if (colMap.amount !== -1) {
        const rawCell = cols[colMap.amount] || "";
        const signed = parseMoneyString(rawCell);
        const typeStr = colMap.type !== -1 ? (cols[colMap.type] || "").toLowerCase() : "";
        type =
          typeStr === "expense" || typeStr === "chiqim" || typeStr === "расход" || signed < 0
            ? "expense"
            : "income";
        amount = Math.abs(signed);
      }

      if (amount <= 0) continue;

      const counterparty =
        (colMap.counterparty !== -1 ? cols[colMap.counterparty] : "") || "Kontragent";
      const stir =
        colMap.stir !== -1 ? (cols[colMap.stir] || "").replace(/\D/g, "").slice(0, 9) || undefined : undefined;
      const desc =
        (colMap.desc !== -1 ? cols[colMap.desc] : "") || counterparty || "Bank operatsiyasi";
      const docNumber =
        colMap.docNum !== -1 ? (cols[colMap.docNum] || "").trim() || undefined : undefined;

      transactions.push({
        date,
        amount,
        type,
        counterparty: cleanOrgName(counterparty),
        counterpartyStir: stir,
        description: desc,
        accountCode: type === "income" ? "4010" : "6010",
        accountName: type === "income" ? "Xaridorlar schyoti" : "Yetkazib beruvchilar schyoti",
        documentNumber: docNumber,
      });
    }

    if (transactions.length > 0) {
      return transactions;
    }
  }

  // Legacy positional fallback: Sana;Kontragent;STIR;Summa;[Turi/Tavsif];[Tavsif]
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 4) continue;

    const date = cols[0] ? normalizeDateString(cols[0]) : new Date().toISOString().split("T")[0];
    const counterparty = cols[1] || "Kontragent";
    const stir = cols[2]?.replace(/\D/g, "").slice(0, 9) || undefined;
    const rawCell = cols[3] || "0";
    const rawNum = parseMoneyString(rawCell);
    const col4 = (cols[4] || "").toLowerCase();
    const isExplicitTypeCol = ["income", "expense", "kirim", "chiqim", "приход", "расход"].includes(col4);
    const desc = (isExplicitTypeCol ? cols[5] : cols[4]) || cols[cols.length - 1] || "Bank koʻchirmasi";

    const type: "income" | "expense" =
      col4 === "expense" || col4 === "chiqim" || col4 === "расход" || rawNum < 0
        ? "expense"
        : "income";
    const amount = Math.abs(rawNum);

    if (amount > 0) {
      transactions.push({
        date,
        amount,
        type,
        counterparty: cleanOrgName(counterparty),
        counterpartyStir: stir,
        description: desc,
        accountCode: type === "income" ? "4010" : "6010",
        accountName: type === "income" ? "Xaridorlar schyoti" : "Yetkazib beruvchilar schyoti",
      });
    }
  }

  return transactions;
}

/**
 * Batch insert parsed transactions into Supabase
 */
export async function importBatchTransactions(items: ParsedBankTransaction[], entityId?: string) {
  const { createTransaction } = await import("./supabase-service");
  const results = [];
  for (const item of items) {
    const created = await createTransaction({
      entityId,
      date: item.date,
      amount: item.amount,
      type: item.type,
      counterparty: item.counterparty,
      counterpartyStir: item.counterpartyStir,
      description: item.description,
      accountCode: item.accountCode,
      accountName: item.accountName,
    });
    results.push(created);
  }
  return results;
}

function cleanOrgName(raw: string): string {
  return raw
    .replace(/^["']|["']$/g, "")
    .replace(/\\"/g, '"')
    .trim();
}
