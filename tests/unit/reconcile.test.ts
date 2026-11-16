import { describe, it, expect } from "vitest";
import {
  parseStatementFile,
  classify21BhmsAccount,
  reconcileBankAnd1C,
  buildReconcileJournalLines,
  buildSafeAiReconcileInput,
  sanitizeReconcileRowsForStorage,
  detectVatIncluded,
} from "../../lib/services/reconcile-engine";

const SAMPLE_BANK_TXT = [
  "1CClientBankExchange",
  "СекцияДокумент=Платежное поручение",
  "Номер=101",
  "Дата=15.11.2026",
  "Сумма=11200000.00",
  "Плательщик1=OOO BARAKA SAVDO",
  "ПлательщикИНН=305112233",
  "Получатель1=OOO TEST KORXONA",
  "ПолучательИНН=308554433",
  "НазначениеПлатежа=Shartnoma №5 bo'yicha to'lov QQS bilan",
  "КонецДокумента",
  "СекцияДокумент=Платежное поручение",
  "Номер=102",
  "Дата=15.11.2026",
  "Сумма=350000.00",
  "Плательщик1=OOO TEST KORXONA",
  "ПлательщикИНН=308554433",
  "Получатель1=ATB Kapitalbank",
  "ПолучательИНН=201020304",
  "НазначениеПлатежа=Komissiya bank RKO karta 8600 1234 5678 9012",
  "КонецДокумента",
].join("\r\n");

const SAMPLE_1C_XML = `<?xml version="1.0" encoding="UTF-8"?>
<EnterpriseData formatVersion="1.8">
  <Body>
    <Operation id="OP-1">
      <Number>101</Number>
      <Date>2026-11-15</Date>
      <Counterparty>OOO BARAKA SAVDO</Counterparty>
      <STIR>305112233</STIR>
      <Comment>Shartnoma №5 bo'yicha to'lov</Comment>
      <Lines>
        <Line num="1"><AccountCode>5110</AccountCode><Debit>11200000</Debit><Credit>0</Credit></Line>
        <Line num="2"><AccountCode>4010</AccountCode><Debit>0</Debit><Credit>11200000</Credit></Line>
      </Lines>
    </Operation>
    <Operation id="OP-2">
      <Number>103</Number>
      <Date>2026-11-15</Date>
      <Counterparty>OOO MILLIY LOGISTIKA</Counterparty>
      <STIR>309998811</STIR>
      <Comment>Yetkazib beruvchiga to'lov</Comment>
      <Lines>
        <Line num="1"><AccountCode>6010</AccountCode><Debit>4500000</Debit><Credit>0</Credit></Line>
        <Line num="2"><AccountCode>5110</AccountCode><Debit>0</Debit><Credit>4500000</Credit></Line>
      </Lines>
    </Operation>
  </Body>
</EnterpriseData>`;

describe("Bank <-> 1C AI Reconciliation Engine", () => {
  it("parses Client-Bank TXT and 1C EnterpriseData XML cleanly", () => {
    const bankItems = parseStatementFile(SAMPLE_BANK_TXT, "bank.txt", "308554433");
    const oneCItems = parseStatementFile(SAMPLE_1C_XML, "1c.xml", "308554433");

    expect(bankItems).toHaveLength(2);
    expect(bankItems[0].type).toBe("income");
    expect(bankItems[1].type).toBe("expense");

    expect(oneCItems).toHaveLength(2);
    expect(oneCItems[0].amount).toBe(11200000);
    expect(oneCItems[1].amount).toBe(4500000);
  });

  it("classifies bank commission, taxes, advances, and payroll to 21-BHMS accounts", () => {
    expect(
      classify21BhmsAccount({
        date: "2026-11-15",
        amount: 350000,
        type: "expense",
        counterparty: "Kapitalbank",
        description: "Komissiya RKO bank xizmati",
        accountCode: "6010",
        accountName: "",
      }).accountCode
    ).toBe("9420");

    expect(
      classify21BhmsAccount({
        date: "2026-11-15",
        amount: 5000000,
        type: "income",
        counterparty: "Baraka",
        description: "Shartnoma bo'yicha avans",
        accountCode: "4010",
        accountName: "",
      }).accountCode
    ).toBe("6310");
  });

  it("reconciles Bank and 1C into matched, bank_only, and one_c_only buckets and strips card PII before AI", () => {
    const bankItems = parseStatementFile(SAMPLE_BANK_TXT, "bank.txt", "308554433");
    const oneCItems = parseStatementFile(SAMPLE_1C_XML, "1c.xml", "308554433");

    const { rows, summary } = reconcileBankAnd1C(bankItems, oneCItems);
    expect(summary.matchedCount).toBe(1);
    expect(summary.bankOnlyCount).toBe(1);
    expect(summary.oneCOnlyCount).toBe(1);

    const safeInput = buildSafeAiReconcileInput(rows);
    const serialized = JSON.stringify(safeInput);
    expect(serialized).not.toContain("8600 1234 5678 9012");
    expect(serialized).toContain("[KARTA_MASKED]");
  });

  it("detects 12% VAT flag and builds balanced 3-line 21-BHMS journal entries", () => {
    expect(detectVatIncluded("Tovar uchun QQS 12% bilan")).toBe(true);
    expect(detectVatIncluded("Uskuna to'lovi (QQSsiz)")).toBe(false);
    expect(detectVatIncluded("Без НДС по договору")).toBe(false);

    const vatExpenseLines = buildReconcileJournalLines({
      id: "rec-vat-1",
      status: "bank_only",
      confidence: 90,
      date: "2026-11-16",
      type: "expense",
      counterparty: "OOO TEXNO",
      bankAmount: 11200000,
      oneCAmount: 0,
      diffAmount: 11200000,
      suggestedAccountCode: "6010",
      suggestedAccountName: "Yetkazib beruvchilar",
      explanation: "Uskuna",
      vatIncluded: true,
    });

    expect(vatExpenseLines).toHaveLength(3);
    expect(vatExpenseLines.find((l) => l.accountCode === "4410")?.debit).toBe(1200000);
    expect(vatExpenseLines.find((l) => l.accountCode === "6010")?.debit).toBe(10000000);
    expect(vatExpenseLines.find((l) => l.accountCode === "5110")?.credit).toBe(11200000);

    const totalDt = vatExpenseLines.reduce((s, l) => s + l.debit, 0);
    const totalCt = vatExpenseLines.reduce((s, l) => s + l.credit, 0);
    expect(totalDt).toBe(totalCt);

    const vatIncomeLines = buildReconcileJournalLines({
      id: "rec-vat-2",
      status: "bank_only",
      confidence: 90,
      date: "2026-11-16",
      type: "income",
      counterparty: "OOO XARIDOR",
      bankAmount: 5600000,
      oneCAmount: 0,
      diffAmount: 5600000,
      suggestedAccountCode: "9030",
      suggestedAccountName: "Xizmatlar",
      explanation: "Xizmat QQS 12%",
      vatIncluded: true,
    });

    expect(vatIncomeLines).toHaveLength(3);
    expect(vatIncomeLines.find((l) => l.accountCode === "5110")?.debit).toBe(5600000);
    expect(vatIncomeLines.find((l) => l.accountCode === "6410")?.credit).toBe(600000);
    expect(vatIncomeLines.find((l) => l.accountCode === "9030")?.credit).toBe(5000000);
  });

  it("scrubs cards, PINFLs, and phones before persisting reconcile rows to work_batches", () => {
    const cleaned = sanitizeReconcileRowsForStorage([
      {
        id: "rec-pii-1",
        status: "bank_only",
        confidence: 90,
        date: "2026-11-16",
        type: "expense",
        counterparty: "Xodim karta 9860 1234 5678 9012",
        bankAmount: 2000000,
        oneCAmount: 0,
        diffAmount: 2000000,
        suggestedAccountCode: "6710",
        suggestedAccountName: "Ish haqi",
        explanation: "PINFL 30101901234567 tel +998901234567",
      },
    ]);

    const json = JSON.stringify(cleaned);
    expect(json).not.toContain("9860 1234 5678 9012");
    expect(json).not.toContain("30101901234567");
    expect(json).not.toContain("+998901234567");
    expect(json).toContain("[KARTA_MASKED]");
    expect(json).toContain("[PINFL_MASKED]");
    expect(json).toContain("[TELEFON_MASKED]");
  });
});
