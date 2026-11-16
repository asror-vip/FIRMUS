import { createTransaction } from "./supabase-service";

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

/**
 * Parses 1C Client-Bank Exchange format text (.txt)
 * Standard used by all Uzbek banks (Kapitalbank, Hamkor, Ipoteka, NBU, etc.)
 */
export function parse1CClientBankText(textContent: string, ourEntityStir = "308554433"): ParsedBankTransaction[] {
  const lines = textContent.split(/\r?\n/);
  const transactions: ParsedBankTransaction[] = [];

  let inDoc = false;
  let currentDoc: Record<string, string> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("СекцияДокумент=")) {
      inDoc = true;
      currentDoc = {};
      continue;
    }

    if (line === "КонецДокумента") {
      if (inDoc && currentDoc["Сумма"]) {
        const rawAmount = parseFloat(currentDoc["Сумма"].replace(/\s/g, "").replace(",", "."));
        const amount = isNaN(rawAmount) ? 0 : Math.abs(rawAmount);

        // Date parsing: DD.MM.YYYY -> YYYY-MM-DD
        let formattedDate = new Date().toISOString().split("T")[0];
        if (currentDoc["Дата"]) {
          const parts = currentDoc["Дата"].split(".");
          if (parts.length === 3) {
            formattedDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        }

        const payerInn = currentDoc["ПлательщикИНН"] || "";
        const receiverInn = currentDoc["ПолучательИНН"] || "";
        const isReceiverUs = receiverInn.includes(ourEntityStir);

        // Determine if Income or Expense
        const type: "income" | "expense" = isReceiverUs ? "income" : "expense";
        const counterparty = type === "income"
          ? (currentDoc["Плательщик1"] || currentDoc["Плательщик"] || "Mijoz")
          : (currentDoc["Получатель1"] || currentDoc["Получатель"] || "Taʼminotchi");

        const counterpartyStir = type === "income" ? payerInn : receiverInn;
        const description = currentDoc["НазначениеПлатежа"] || "Bank toʻlovi";
        const docNumber = currentDoc["Номер"] || "";

        transactions.push({
          date: formattedDate,
          amount,
          type,
          counterparty: cleanOrgName(counterparty),
          counterpartyStir: counterpartyStir.replace(/\D/g, "").substring(0, 9) || undefined,
          description,
          accountCode: type === "income" ? "4010" : "6010",
          accountName: type === "income" ? "Xaridorlar schyoti" : "Yetkazib beruvchilar schyoti",
          documentNumber: docNumber,
        });
      }
      inDoc = false;
      currentDoc = {};
      continue;
    }

    if (inDoc && line.includes("=")) {
      const idx = line.indexOf("=");
      const key = line.substring(0, idx).trim();
      const val = line.substring(idx + 1).trim();
      currentDoc[key] = val;
    }
  }

  return transactions;
}

/**
 * Parses Bank CSV or semicolon/comma-separated statements
 */
export function parseBankCsv(csvContent: string): ParsedBankTransaction[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const transactions: ParsedBankTransaction[] = [];
  const delimiter = lines[0].includes(";") ? ";" : ",";

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, "").trim());
    if (cols.length < 4) continue;

    // Expected format: Sana, Kontragent, STIR, Summa, [Turi/Tavsif], [Tavsif]
    const date = cols[0] || new Date().toISOString().split("T")[0];
    const counterparty = cols[1] || "Kontragent";
    const stir = cols[2]?.replace(/\D/g, "") || undefined;
    const rawSum = parseFloat(cols[3]?.replace(/[^\d.-]/g, "") || "0");
    const col4 = (cols[4] || "").toLowerCase();
    const isExplicitTypeCol = ["income", "expense", "kirim", "chiqim", "приход", "расход"].includes(col4);
    const desc = (isExplicitTypeCol ? cols[5] : cols[4]) || cols[cols.length - 1] || "Bank koʻchirmasi";

    const type: "income" | "expense" =
      col4 === "expense" || col4 === "chiqim" || col4 === "расход" || rawSum < 0
        ? "expense"
        : "income";
    const amount = Math.abs(rawSum);

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
