import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/lib/supabase/client", () => ({
  supabase: {},
}));

import {
  ONEC_VERSION_PROFILES,
  BANK_SOURCE_PROFILES,
  DIDOX_SOURCE_PROFILES,
  extractAnonymizedFileBlueprint,
  extractAnonymizedFileBlueprintFromRows,
  detectLearnedSchemaMatch,
  parseRowsWithLearnedSchema,
  generate1CClientBankTextForProfile,
  generate1CEnterpriseXmlForProfile,
  sanitizeHeaderCellName,
  type LearnedDocumentSchema,
} from "@/lib/services/onec-profiles";

describe("Stage 5: 3-Layer 1C, Bank & Didox Profiles and Self-Learning Blueprints", () => {
  it("registers all 1C version profiles, Uzbek bank profiles, and Didox/Soliq EHF profiles", () => {
    expect(ONEC_VERSION_PROFILES.map((p) => p.id)).toEqual([
      "universal_excel_csv",
      "1c_83_uz_venkon",
      "1c_83_uz_standard",
      "1c_82_legacy",
      "1uz_accounting",
      "1c_odata_bridge",
    ]);
    expect(BANK_SOURCE_PROFILES.length).toBeGreaterThanOrEqual(7);
    expect(DIDOX_SOURCE_PROFILES.map((p) => p.id)).toContain("didox_uz_ehf");
    expect(DIDOX_SOURCE_PROFILES.map((p) => p.id)).toContain("soliq_my3_ehf");
  });

  it("extracts ONLY anonymized header blueprints and strictly strips all PII, STIRs, accounts, and amounts", () => {
    const sample1CRows: string[][] = [
      ["Карточка счета 5110 за Ноябрь 2026 — ООО BARAKA SAVDO ИНН 305112233 р/с 20208000905123456001"],
      ["Дата", "Документ №", "Субконто Контрагент", "ИНН 305112233", "Дебет", "Кредит", "Назначение платежа"],
      ["15.11.2026", "ПП-104", "OOO GOLDEN TRADE", "301223344", "420000000.00", "0", "Оплата по договору №15"],
      ["16.11.2026", "ПП-105", "ATB KAPITALBANK", "201020304", "0", "18500000.50", "Комиссия банка"],
    ];

    const blueprint = extractAnonymizedFileBlueprintFromRows(
      sample1CRows,
      "kartochka_5110_venkon.xlsx",
      "onec"
    );

    expect(blueprint.sourceType).toBe("onec");
    expect(blueprint.fileFormat).toBe("xlsx");
    expect(blueprint.headerRowIndex).toBe(1);
    expect(blueprint.suggestedProfileId).toBe("1c_83_uz_venkon");

    // Verify column map detected properly
    expect(blueprint.detectedColumnMap.date).toBe(0);
    expect(blueprint.detectedColumnMap.docNum).toBe(1);
    expect(blueprint.detectedColumnMap.counterparty).toBe(2);
    expect(blueprint.detectedColumnMap.stir).toBe(3);
    expect(blueprint.detectedColumnMap.debit).toBe(4);
    expect(blueprint.detectedColumnMap.credit).toBe(5);
    expect(blueprint.detectedColumnMap.desc).toBe(6);

    // Zero-PII verification: serialized blueprint must NOT contain any transaction amounts, STIRs, or company names
    const serialized = JSON.stringify(blueprint);
    expect(serialized).not.toContain("305112233");
    expect(serialized).not.toContain("301223344");
    expect(serialized).not.toContain("20208000905123456001");
    expect(serialized).not.toContain("420000000");
    expect(serialized).not.toContain("18500000");
    expect(serialized).not.toContain("GOLDEN TRADE");
    expect(serialized).not.toContain("BARAKA SAVDO");

    // Even if a 9-digit STIR was placed inside a header cell ("ИНН 305112233"), sanitizeHeaderCellName strips the digits
    expect(sanitizeHeaderCellName("ИНН 305112233")).toBe("ИНН");
  });

  it("recognizes learned blueprints for 1C, Bank, and Didox on subsequent uploads and parses rows with learned schema", async () => {
    const bankCsv = [
      "Sana;Hujjat;Kontragent;STIR;Chiqim;Kirim;To'lov maqsadi",
      "2026-11-10;12;NUR INVEST MCHJ;308778899;0;95000000;Shartnoma bo'yicha to'lov",
      "2026-11-11;13;IJARA SERVIS;309112233;12000000;0;Ofis ijarasi",
    ].join("\n");

    const bp = await extractAnonymizedFileBlueprint(bankCsv, "kapitalbank_kochirish.csv", "bank");
    expect(bp.sourceType).toBe("bank");
    expect(bp.suggestedProfileId).toBe("bank_kapital");

    const savedSchema: LearnedDocumentSchema = {
      id: "schema-1",
      businessEntityId: "ent-1",
      sourceType: "bank",
      profileId: "bank_kapital",
      versionLabel: "Kapitalbank (Excel / TXT koʻchirma)",
      fileFormat: bp.fileFormat,
      headerRowIndex: bp.headerRowIndex,
      headerSignature: bp.headerSignature,
      columnHeaders: bp.columnHeaders,
      detectedColumnMap: bp.detectedColumnMap,
      sampleCount: 3,
      updatedAt: "2026-11-19T18:00:00Z",
    };

    const matched = detectLearnedSchemaMatch(bp, [savedSchema]);
    expect(matched).not.toBeNull();
    expect(matched?.profileId).toBe("bank_kapital");
    expect(matched?.sampleCount).toBe(3);

    const rows2D = bankCsv.split("\n").map((l) => l.split(";"));
    const parsedTxs = parseRowsWithLearnedSchema(rows2D, savedSchema);
    expect(parsedTxs).toHaveLength(2);
    expect(parsedTxs[0].type).toBe("income");
    expect(parsedTxs[0].amount).toBe(95_000_000);
    expect(parsedTxs[1].type).toBe("expense");
    expect(parsedTxs[1].amount).toBe(12_000_000);
  });

  it("tailors 1CClientBankExchange (.txt) and EnterpriseData (.xml) exports to the selected 1C version profile", () => {
    const sampleTx = [
      {
        id: "1",
        date: "2026-11-18",
        amount: 25_000_000,
        type: "income" as const,
        counterparty: "XARIDOR MCHJ",
        counterpartyStir: "301112223",
        description: "Tovar uchun to'lov",
        accountCode: "4010",
        documentNumber: "101",
      },
    ];
    const entityInfo = {
      name: "FIRMUS CLIENT MCHJ",
      inn: "300100200",
      account: "20208000100000000001",
      bank: "Kapitalbank",
      openingBalance: 0,
    };

    const venkonTxt = generate1CClientBankTextForProfile("1c_83_uz_venkon", sampleTx, entityInfo);
    expect(venkonTxt).toContain("ВерсияФормата=1.03");
    expect(venkonTxt).toContain("Кодировка=UTF-8");
    expect(venkonTxt).toContain("Получатель=Бухгалтерия для Узбекистана, редакция 3.0 (Venkon)");

    const legacy82Txt = generate1CClientBankTextForProfile("1c_82_legacy", sampleTx, entityInfo);
    expect(legacy82Txt).toContain("Кодировка=Windows");
    expect(legacy82Txt).toContain("Получатель=1С:Предприятие 8.2");

    const venkonXml = generate1CEnterpriseXmlForProfile("1c_83_uz_venkon", [
      {
        entryNumber: "REC-101",
        date: "2026-11-18",
        description: "Tovar uchun to'lov",
        totalDebit: 25_000_000,
        lines: [
          { accountCode: "5110", accountName: "Hisob-kitob schyoti", debit: 25_000_000, credit: 0 },
          { accountCode: "4010", accountName: "Xaridorlar", debit: 0, credit: 25_000_000 },
        ],
      },
    ]);
    expect(venkonXml).toContain("<Destination>1C_Bukhgalteriya_Uzbekistan_3_0_Venkon</Destination>");
    expect(venkonXml).toContain("<Posted>false</Posted>");
  });

  it("verifies Stage 5 SQL migration enables RLS on onec_learned_schemas and supports onec, bank, didox", () => {
    const migPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "20261119020000_onec_learned_schemas.sql"
    );
    const sql = fs.readFileSync(migPath, "utf8");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.onec_learned_schemas");
    expect(sql).toContain("CHECK (source_type IN ('onec', 'bank', 'didox'))");
    expect(sql).toContain("ALTER TABLE public.onec_learned_schemas ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("onec_learned_schemas_select");
    expect(sql).toContain("onec_learned_schemas_insert");
  });

  it("auto-detects Bank name by MFO/header and Didox EHF without asking the user (autoConfirmed = true)", () => {
    // 1) Bank file with generic filename ("vypiska.xlsx") but MFO 00444 (Ipak Yo'li) inside top rows
    const ipakBankRows: string[][] = [
      ["Выписка лицевого счета за Ноябрь 2026 — МФО 00444"],
      ["Дата", "Номер документа", "Корреспондент", "ИНН", "Расход", "Приход", "Назначение платежа"],
      ["18.11.2026", "901", "OOO ALFA", "301223344", "0", "15000000", "Оплата за товар"],
    ];
    const bankBp = extractAnonymizedFileBlueprintFromRows(ipakBankRows, "vypiska.xlsx", "bank");
    expect(bankBp.sourceType).toBe("bank");
    expect(bankBp.suggestedProfileId).toBe("bank_ipakyuli");
    expect(bankBp.autoConfirmed).toBe(true);

    // 2) Didox EHF file uploaded even in the bank slot -> auto-switches to 'didox' with autoConfirmed = true
    const didoxRows: string[][] = [
      ["Реестр электронных счетов-фактур (ЭСФ) — Didox.uz"],
      ["Дата", "Счет-фактура №", "Контрагент", "ИНН", "Сумма", "Товар / услуга"],
      ["18.11.2026", "ESF-77", "OOO BETA", "305667788", "42000000", "Консультационные услуги"],
    ];
    const didoxBp = extractAnonymizedFileBlueprintFromRows(didoxRows, "reestr_11.xlsx", "bank");
    expect(didoxBp.sourceType).toBe("didox");
    expect(didoxBp.suggestedProfileId).toBe("didox_uz_ehf");
    expect(didoxBp.autoConfirmed).toBe(true);

    // 3) Generic 1C table without version markers -> autoConfirmed = false (asks user once for 1C version)
    const generic1CRows: string[][] = [
      ["Дата", "Контрагент", "ИНН", "Сумма", "Назначение"],
      ["18.11.2026", "OOO GAMMA", "309887766", "10000000", "Оплата"],
    ];
    const generic1CBp = extractAnonymizedFileBlueprintFromRows(generic1CRows, "export.xlsx", "onec");
    expect(generic1CBp.sourceType).toBe("onec");
    expect(generic1CBp.autoConfirmed).toBe(false);
  });
});
