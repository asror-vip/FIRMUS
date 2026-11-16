import { describe, it, expect, vi } from "vitest";
import { deflateRawSync } from "node:zlib";

vi.mock("@/lib/supabase/client", () => ({
  supabase: {},
}));

import { parseStatementFileBuffer } from "@/lib/services/reconcile-engine";
import {
  calculatePayrollUz,
  calculateVatUz,
  calculateTurnoverTaxUz,
  calculateVacationPayUz,
} from "@/lib/services/uz-tax-calculator";

function createMinimalXlsxBuffer(files: Array<{ name: string; content: string }>): ArrayBuffer {
  const localChunks: Buffer[] = [];
  const cdChunks: Buffer[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.name, "utf8");
    const rawBuf = Buffer.from(f.content, "utf8");
    const compBuf = deflateRawSync(rawBuf);

    const localHdr = Buffer.alloc(30 + nameBuf.length);
    localHdr.writeUInt32LE(0x04034b50, 0);
    localHdr.writeUInt16LE(20, 4);
    localHdr.writeUInt16LE(0, 6);
    localHdr.writeUInt16LE(8, 8); // deflate-raw
    localHdr.writeUInt32LE(compBuf.length, 18);
    localHdr.writeUInt32LE(rawBuf.length, 22);
    localHdr.writeUInt16LE(nameBuf.length, 26);
    localHdr.writeUInt16LE(0, 28);
    nameBuf.copy(localHdr, 30);

    const cdHdr = Buffer.alloc(46 + nameBuf.length);
    cdHdr.writeUInt32LE(0x02014b50, 0);
    cdHdr.writeUInt16LE(20, 4);
    cdHdr.writeUInt16LE(20, 6);
    cdHdr.writeUInt16LE(0, 8);
    cdHdr.writeUInt16LE(8, 10);
    cdHdr.writeUInt32LE(compBuf.length, 20);
    cdHdr.writeUInt32LE(rawBuf.length, 24);
    cdHdr.writeUInt16LE(nameBuf.length, 28);
    cdHdr.writeUInt16LE(0, 30);
    cdHdr.writeUInt16LE(0, 32);
    cdHdr.writeUInt32LE(offset, 42);
    nameBuf.copy(cdHdr, 46);

    localChunks.push(localHdr, compBuf);
    cdChunks.push(cdHdr);
    offset += localHdr.length + compBuf.length;
  }

  const cdBuf = Buffer.concat(cdChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  const full = Buffer.concat([...localChunks, cdBuf, eocd]);
  return full.buffer.slice(full.byteOffset, full.byteOffset + full.byteLength);
}

describe("Native .xlsx Bank Parser & Uzbekistan Tax/Payroll Calculators", () => {
  it("parses compressed binary .xlsx bank statement into transactions with Excel serial dates", async () => {
    const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8"?>
      <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <si><t>Дата</t></si>
        <si><t>Контрагент</t></si>
        <si><t>ИНН</t></si>
        <si><t>Приход</t></si>
        <si><t>Расход</t></si>
        <si><t>Назначение платежа</t></si>
        <si><t>OOO BARAKA SAVDO</t></si>
        <si><t>Shartnoma 18 tolov QQS 12%</t></si>
        <si><t>ATB KAPITALBANK</t></si>
        <si><t>Oylik RKO komissiya</t></si>
      </sst>`;

    const sheetXml = `<?xml version="1.0" encoding="UTF-8"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheetData>
          <row r="1">
            <c r="A1" t="s"><v>0</v></c>
            <c r="B1" t="s"><v>1</v></c>
            <c r="C1" t="s"><v>2</v></c>
            <c r="D1" t="s"><v>3</v></c>
            <c r="E1" t="s"><v>4</v></c>
            <c r="F1" t="s"><v>5</v></c>
          </row>
          <row r="2">
            <c r="A2"><v>46342</v></c>
            <c r="B2" t="s"><v>6</v></c>
            <c r="C2" t="inlineStr"><is><t>305112233</t></is></c>
            <c r="D2"><v>12500000.50</v></c>
            <c r="E2"><v>0</v></c>
            <c r="F2" t="s"><v>7</v></c>
          </row>
          <row r="3">
            <c r="A3" t="inlineStr"><is><t>16.11.2026</t></is></c>
            <c r="B3" t="s"><v>8</v></c>
            <c r="C3" t="inlineStr"><is><t>201020304</t></is></c>
            <c r="D3"><v>0</v></c>
            <c r="E3"><v>350000</v></c>
            <c r="F3" t="s"><v>9</v></c>
          </row>
        </sheetData>
      </worksheet>`;

    const xlsxBuffer = createMinimalXlsxBuffer([
      { name: "xl/sharedStrings.xml", content: sharedStringsXml },
      { name: "xl/worksheets/sheet1.xml", content: sheetXml },
    ]);

    const parsed = await parseStatementFileBuffer(xlsxBuffer, "kapitalbank.xlsx");
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      date: "2026-11-16",
      counterparty: "OOO BARAKA SAVDO",
      counterpartyStir: "305112233",
      type: "income",
      amount: 12500000.5,
    });
    expect(parsed[1]).toMatchObject({
      date: "2026-11-16",
      counterparty: "ATB KAPITALBANK",
      type: "expense",
      amount: 350000,
    });
  });

  it("calculates Uzbekistan payroll (forward & reverse), 12% VAT, 4% turnover tax, and vacation pay accurately", () => {
    const fwd = calculatePayrollUz({ amount: 5_000_000, direction: "gross_to_net" });
    expect(fwd.jshds12).toBe(600_000);
    expect(fwd.net).toBe(4_400_000);
    expect(fwd.socialTax12).toBe(600_000);
    expect(fwd.provodka).toHaveLength(4);

    const rev = calculatePayrollUz({ amount: 4_400_000, direction: "net_to_gross" });
    expect(rev.gross).toBe(5_000_000);
    expect(rev.net).toBe(4_400_000);

    const vatInc = calculateVatUz({ amount: 11_200_000, mode: "included" });
    expect(vatInc.vat12).toBe(1_200_000);
    expect(vatInc.net).toBe(10_000_000);

    const vatExc = calculateVatUz({ amount: 10_000_000, mode: "excluded" });
    expect(vatExc.vat12).toBe(1_200_000);
    expect(vatExc.total).toBe(11_200_000);

    const turn = calculateTurnoverTaxUz({ revenue: 100_000_000 });
    expect(turn.tax).toBe(4_000_000);

    const vac = calculateVacationPayUz({ monthlySalary: 5_080_000, days: 21 });
    expect(vac.dailyRate).toBe(200_000);
    expect(vac.grossVacation).toBe(4_200_000);
    expect(vac.netVacation).toBe(3_696_000);
  });
});
