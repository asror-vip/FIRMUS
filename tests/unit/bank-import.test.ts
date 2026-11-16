import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  supabase: {},
}));

import { parse1CClientBankText, parseBankCsv } from "@/lib/services/bank-import";

describe("1C Client-Bank & CSV Statement Parsers", () => {
  it("parses standard Uzbekistan 1CClientBankExchange income and expense records", () => {
    const sample = [
      "1CClientBankExchange",
      "СекцияДокумент=Платежное поручение",
      "Номер=104",
      "Дата=16.11.2026",
      "Сумма=15000000.50",
      "Плательщик1=ANGLESEY FOOD MCHJ",
      "ПлательщикИНН=301223344",
      "Получатель1=ORIENT AGRO MCHJ",
      "ПолучательИНН=308554433",
      "НазначениеПлатежа=Mahsulot yetkazib berish bo'yicha to'lov",
      "КонецДокумента",
      "СекцияДокумент=Платежное поручение",
      "Номер=105",
      "Дата=16.11.2026",
      "Сумма=2500000",
      "Плательщик1=ORIENT AGRO MCHJ",
      "ПлательщикИНН=308554433",
      "Получатель1=UZTELECOM AK",
      "ПолучательИНН=200112233",
      "НазначениеПлатежа=Internet xizmatlari uchun",
      "КонецДокумента",
    ].join("\n");

    const parsed = parse1CClientBankText(sample, "308554433");
    expect(parsed).toHaveLength(2);

    expect(parsed[0]).toMatchObject({
      date: "2026-11-16",
      amount: 15000000.5,
      type: "income",
      counterparty: "ANGLESEY FOOD MCHJ",
      counterpartyStir: "301223344",
      accountCode: "4010",
    });

    expect(parsed[1]).toMatchObject({
      date: "2026-11-16",
      amount: 2500000,
      type: "expense",
      counterparty: "UZTELECOM AK",
      counterpartyStir: "200112233",
      accountCode: "6010",
    });
  });

  it("parses semicolon/comma delimited bank CSV rows", () => {
    const csv = [
      "Sana;Kontragent;STIR;Summa;Turi;Tavsif",
      "2026-11-15;MAKRO RETAIL;302998877;45000000;income;Shartnoma 12 to'lov",
      "2026-11-16;LUKOIL UZ;303112244;8500000;expense;Dizel yoqilg'isi",
    ].join("\n");

    const parsed = parseBankCsv(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].type).toBe("income");
    expect(parsed[0].amount).toBe(45000000);
    expect(parsed[1].type).toBe("expense");
    expect(parsed[1].amount).toBe(8500000);
  });
});
