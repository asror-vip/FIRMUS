import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  supabase: {},
}));

import {
  parse1CClientBankText,
  parseBankCsv,
  normalizeDateString,
  parseMoneyString,
} from "@/lib/services/bank-import";

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

  it("auto-detects company direction in Client-Bank TXT without entity STIR using РасчСчет & ДатаПоступило/Списано", () => {
    const sample = [
      "1CClientBankExchange",
      "РасчСчет=20208000999888777001",
      "СекцияДокумент=Платежное поручение",
      "Номер=55",
      "Дата=02.11.2026",
      "ДатаПоступило=02.11.2026",
      "Сумма=9500000.00",
      "Плательщик1=OOO SAMARQAND TEKSTIL",
      "ПлательщикИНН=301555666",
      "ПлательщикРасчСчет=20208000111222333001",
      "Получатель1=OOO YANGI MIJOZ",
      "ПолучательИНН=309123456",
      "ПолучательРасчСчет=20208000999888777001",
      "НазначениеПлатежа=Shartnoma 88 tolov",
      "КонецДокумента",
      "СекцияДокумент=Платежное поручение",
      "Номер=56",
      "Дата=03.11.2026",
      "ДатаСписано=03.11.2026",
      "Сумма=150000.00",
      "Плательщик1=OOO YANGI MIJOZ",
      "ПлательщикИНН=309123456",
      "ПлательщикРасчСчет=20208000999888777001",
      "Получатель1=ATB KAPITALBANK",
      "ПолучательИНН=201020304",
      "ПолучательРасчСчет=16103000111111111001",
      "НазначениеПлатежа=Bank RKO komissiyasi",
      "КонецДокумента",
    ].join("\r\n");

    const parsed = parse1CClientBankText(sample, "");
    expect(parsed).toHaveLength(2);
    expect(parsed[0].type).toBe("income");
    expect(parsed[0].counterparty).toBe("OOO SAMARQAND TEKSTIL");
    expect(parsed[1].type).toBe("expense");
    expect(parsed[1].counterparty).toBe("ATB KAPITALBANK");
  });

  it("parses real bank CSV/TSV & Excel HTML tables with Russian headers, Дебет/Кредит, and formatted numbers", () => {
    const bankCsv = [
      "Выписка по счету 20208000...",
      "Дата\tНомер\tКонтрагент\tИНН\tДебет\tКредит\tНазначение платежа",
      '14.11.2026\t701\t"OOO, BARAKA GROUP"\t304112233\t0\t"12 500 000,50"\tTovar uchun tushum',
      "15.11.2026\t702\tATB HAMKORBANK\t200445566\t450 000,00\t0\tKomissiya RKO",
    ].join("\n");

    const csvParsed = parseBankCsv(bankCsv);
    expect(csvParsed).toHaveLength(2);
    expect(csvParsed[0]).toMatchObject({
      date: "2026-11-14",
      type: "income",
      amount: 12500000.5,
      counterparty: "OOO, BARAKA GROUP",
      documentNumber: "701",
    });
    expect(csvParsed[1]).toMatchObject({
      date: "2026-11-15",
      type: "expense",
      amount: 450000,
    });

    const htmlXls = `<html><body><table>
      <tr><th>Sana</th><th>Kontragent</th><th>Kirim</th><th>Chiqim</th><th>Izoh</th></tr>
      <tr><td>16.11.2026</td><td>OOO NAVOIY</td><td>3&nbsp;200&nbsp;000,00</td><td>0</td><td>Avans tolov</td></tr>
    </table></body></html>`;
    const xlsParsed = parseBankCsv(htmlXls);
    expect(xlsParsed).toHaveLength(1);
    expect(xlsParsed[0].amount).toBe(3200000);
    expect(xlsParsed[0].type).toBe("income");
  });

  it("normalizes date strings with timestamps cleanly without falling back to today", () => {
    expect(normalizeDateString("1.5.2024 10:20:00")).toBe("2024-05-01");
    expect(normalizeDateString("15.11.2026 23:59:59")).toBe("2026-11-15");
    expect(normalizeDateString("2026-11-16T12:00:00Z")).toBe("2026-11-16");
    expect(normalizeDateString("02/08/2025 09:30")).toBe("2025-08-02");
  });

  it("parses dotted thousand separators and European decimals in parseMoneyString", () => {
    expect(parseMoneyString("1.250.000")).toBe(1250000);
    expect(parseMoneyString("15.000.000")).toBe(15000000);
    expect(parseMoneyString("150.000")).toBe(150000);
    expect(parseMoneyString("125.50")).toBe(125.5);
    expect(parseMoneyString("1.250.000,50")).toBe(1250000.5);
    expect(parseMoneyString("1,250,000.50")).toBe(1250000.5);
    expect(parseMoneyString("(500.000)")).toBe(-500000);
    expect(parseMoneyString("-1.250.000")).toBe(-1250000);
    expect(parseMoneyString("")).toBe(0);
  });
});
