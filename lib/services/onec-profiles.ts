import { supabase } from "@/lib/supabase/client";
import { parseXlsxBufferToRows, excelSerialToIsoDate } from "./xlsx-parser";
import { decodeBankFileBuffer } from "./reconcile-engine";
import { normalizeDateString, parseMoneyString, type ParsedBankTransaction } from "./bank-import";
import { generate1CClientBankText, generate1CEnterpriseDataXml } from "./one-c-export";

export type DocumentSourceType = "onec" | "bank" | "didox";

export type OneCProfileId =
  | "universal_excel_csv"
  | "1c_83_uz_venkon"
  | "1c_83_uz_standard"
  | "1c_82_legacy"
  | "1uz_accounting"
  | "1c_odata_bridge";

export interface DocumentVersionProfile {
  id: string;
  sourceType: DocumentSourceType;
  label: string;
  shortLabel: string;
  description: string;
  exportEncoding: "utf-8" | "windows-1251";
  clientBankFormatVersion: "1.02" | "1.03";
  recipientName: string;
  xmlDestination: string;
  signatureKeywords: string[];
}

export const ONEC_VERSION_PROFILES: readonly DocumentVersionProfile[] = [
  {
    id: "universal_excel_csv",
    sourceType: "onec",
    label: "Universal (Excel / CSV / TXT / XML)",
    shortLabel: "Universal 1C",
    description: "Har qanday 1C va jadval fayllarini versiya tanlamasdan oʻqiydi va standart 1C formatda chiqaradi.",
    exportEncoding: "utf-8",
    clientBankFormatVersion: "1.02",
    recipientName: "1С:Предприятие 8.3",
    xmlDestination: "1C_Bukhgalteriya_Uzbekistan",
    signatureKeywords: ["sana", "summa", "kontragent"],
  },
  {
    id: "1c_83_uz_venkon",
    sourceType: "onec",
    label: "1C:Buxgalteriya 8.3 Oʻzbekiston (Venkon 3.0)",
    shortLabel: "1C 8.3 (Venkon)",
    description: "Oʻzbekistonda eng koʻp ishlatiladigan 1C 8.3 Venkon lokalizatsiyasi (BHMS 4 xonali schyotlar: 5110, 4010, 6010).",
    exportEncoding: "utf-8",
    clientBankFormatVersion: "1.03",
    recipientName: "Бухгалтерия для Узбекистана, редакция 3.0 (Venkon)",
    xmlDestination: "1C_Bukhgalteriya_Uzbekistan_3_0_Venkon",
    signatureKeywords: ["субконто", "дебет", "кредит", "карточка счета", "5110"],
  },
  {
    id: "1c_83_uz_standard",
    sourceType: "onec",
    label: "1C:Buxgalteriya 8.3 Standart / 1C:Fresh",
    shortLabel: "1C 8.3 Standart",
    description: "Standart 1C:Enterprise 8.3 va bulutli 1C:Fresh bazalari uchun UTF-8 va EnterpriseData 1.8 qolipi.",
    exportEncoding: "utf-8",
    clientBankFormatVersion: "1.02",
    recipientName: "1С:Бухгалтерия 8.3",
    xmlDestination: "1C_Enterprise_83_Standard",
    signatureKeywords: ["документ", "контрагент", "сумма", "назначение"],
  },
  {
    id: "1c_82_legacy",
    sourceType: "onec",
    label: "1C:Buxgalteriya 8.2 / 7.7 (Eski tizim — Windows-1251)",
    shortLabel: "1C 8.2 / 7.7",
    description: "Eski 1C 8.2 va 7.7 versiyalari uchun Windows-1251 kodirovkali Klient-Bank (.txt) qolipi.",
    exportEncoding: "windows-1251",
    clientBankFormatVersion: "1.02",
    recipientName: "1С:Предприятие 8.2",
    xmlDestination: "1C_Bukhgalteriya_82_Legacy",
    signatureKeywords: ["корр. счет", "дебет", "кредит", "сальдо"],
  },
  {
    id: "1uz_accounting",
    sourceType: "onec",
    label: "1UZ Buxgalteriya (Milliy dastur)",
    shortLabel: "1UZ Dasturi",
    description: "1UZ milliy buxgalteriya dasturi jadval eksporti va Klient-Bank almashinuvi.",
    exportEncoding: "utf-8",
    clientBankFormatVersion: "1.02",
    recipientName: "1UZ Бухгалтерия",
    xmlDestination: "1UZ_Accounting_System",
    signatureKeywords: ["1uz", "schyot", "kirim", "chiqim"],
  },
  {
    id: "1c_odata_bridge",
    sourceType: "onec",
    label: "1C OData / EPF koʻprigi (Toʻgʻridan-toʻgʻri ulanish)",
    shortLabel: "1C OData Koʻprigi",
    description: "Fayl yuklamasdan 1C bazadagi qoralamalarga toʻgʻridan-toʻgʻri OData / EPF orqali yuborish.",
    exportEncoding: "utf-8",
    clientBankFormatVersion: "1.03",
    recipientName: "1С:Предприятие OData Bridge",
    xmlDestination: "1C_OData_Draft_Queue",
    signatureKeywords: ["odata", "epf"],
  },
] as const;

export const BANK_SOURCE_PROFILES: ReadonlyArray<{
  id: string;
  label: string;
  shortLabel: string;
  mfos: readonly string[];
  keywords: readonly string[];
}> = [
  {
    id: "bank_kapital",
    label: "Kapitalbank (Excel / TXT koʻchirma)",
    shortLabel: "Kapitalbank",
    mfos: ["00445", "00974", "01158", "01088", "01018"],
    keywords: ["kapitalbank", "капиталбанк", "kapital bank"],
  },
  {
    id: "bank_ipakyuli",
    label: "Ipak Yoʻli Banki",
    shortLabel: "Ipak Yoʻli",
    mfos: ["00444", "01101", "01067", "01028"],
    keywords: ["ipak yo'li", "ipak yuli", "ipakyuli", "ипак йули", "ipak yoʻli"],
  },
  {
    id: "bank_hamkor",
    label: "Hamkorbank",
    shortLabel: "Hamkorbank",
    mfos: ["00083", "01055", "00997"],
    keywords: ["hamkorbank", "хамкорбанк", "hamkor bank"],
  },
  {
    id: "bank_sqb",
    label: "Oʻzsanoatqurilishbank (SQB)",
    shortLabel: "SQB",
    mfos: ["00440", "00442", "00895"],
    keywords: ["sqb", "sanoatqurilish", "узпромстройбанк", "promstroy"],
  },
  {
    id: "bank_nbu",
    label: "Oʻzmilliybank (NBU)",
    shortLabel: "NBU",
    mfos: ["00450", "00451", "00875"],
    keywords: ["nbu", "milliybank", "milliy bank", "нацбанк", "узнацбанк"],
  },
  {
    id: "bank_anor",
    label: "Anorbank",
    shortLabel: "Anorbank",
    mfos: ["01183"],
    keywords: ["anorbank", "анорбанк", "anor bank"],
  },
  {
    id: "bank_tbc",
    label: "TBC Bank / Payme Business",
    shortLabel: "TBC / Payme",
    mfos: ["01180"],
    keywords: ["tbc bank", "tbcbank", "тбс банк", "payme"],
  },
  {
    id: "bank_ipoteka",
    label: "Ipoteka-bank",
    shortLabel: "Ipoteka-bank",
    mfos: ["00937", "00419", "00423"],
    keywords: ["ipoteka", "ипотека-банк", "ипотека банк"],
  },
  {
    id: "bank_asaka",
    label: "Asakabank",
    shortLabel: "Asakabank",
    mfos: ["00873", "00416"],
    keywords: ["asakabank", "asaka bank", "асакабанк", "банк асака"],
  },
  {
    id: "bank_aloqa",
    label: "Aloqabank",
    shortLabel: "Aloqabank",
    mfos: ["00401", "00926"],
    keywords: ["aloqabank", "алокабанк", "aloqa bank"],
  },
  {
    id: "bank_agro",
    label: "Agrobank",
    shortLabel: "Agrobank",
    mfos: ["00394", "00795"],
    keywords: ["agrobank", "агробанк", "agro bank"],
  },
  {
    id: "bank_xalq",
    label: "Xalq banki",
    shortLabel: "Xalq banki",
    mfos: ["00837", "00425", "01125"],
    keywords: ["xalq bank", "халк банк", "народный банк"],
  },
  {
    id: "bank_trast",
    label: "Trastbank",
    shortLabel: "Trastbank",
    mfos: ["00491", "00965"],
    keywords: ["trastbank", "трастбанк", "trustbank"],
  },
  {
    id: "bank_ofb",
    label: "Orient Finans Bank (OFB)",
    shortLabel: "Orient Finans",
    mfos: ["01071"],
    keywords: ["orient finans", "ориент финанс", "ofb"],
  },
  {
    id: "bank_infin",
    label: "InfinBANK",
    shortLabel: "InfinBANK",
    mfos: ["01041"],
    keywords: ["infinbank", "инфинбанк", "invest finance"],
  },
  {
    id: "bank_aab",
    label: "Asia Alliance Bank",
    shortLabel: "Asia Alliance",
    mfos: ["01095"],
    keywords: ["asia alliance", "азия альянс"],
  },
  {
    id: "bank_davr",
    label: "Davr Bank",
    shortLabel: "Davr Bank",
    mfos: ["00981"],
    keywords: ["davr bank", "davrbank", "давр банк"],
  },
  {
    id: "bank_other",
    label: "Oʻzbekiston bank koʻchirmasi (Avto-qolip)",
    shortLabel: "Bank koʻchirmasi",
    mfos: [],
    keywords: [],
  },
] as const;

export const DIDOX_SOURCE_PROFILES: ReadonlyArray<{ id: string; label: string; shortLabel: string }> = [
  { id: "didox_uz_ehf", label: "Didox.uz — EHF (Elektron hisobvaraq-faktura) reestri", shortLabel: "Didox.uz EHF" },
  { id: "soliq_my3_ehf", label: "my3.soliq.uz — EHF va Onlayn-NKM reestri", shortLabel: "Soliq.uz EHF" },
  { id: "faktura_uz_ehf", label: "Faktura.uz / E-ijara reestri", shortLabel: "Faktura.uz" },
] as const;

export interface DetectedColumnMap {
  date: number;
  counterparty: number;
  stir: number;
  docNum: number;
  debit: number;
  credit: number;
  amount: number;
  type: number;
  desc: number;
  debitIsIncome: boolean;
}

export interface AnonymizedFileBlueprint {
  sourceType: DocumentSourceType;
  fileFormat: "xlsx" | "xls" | "csv" | "txt" | "xml";
  headerRowIndex: number;
  headerSignature: string;
  columnHeaders: string[];
  detectedColumnMap: DetectedColumnMap;
  suggestedProfileId: string;
  suggestedVersionLabel: string;
  /**
   * When true, the document's bank/EHF/1C profile was automatically determined
   * (or belongs to Bank/Didox where user confirmation is never required) and
   * can be saved directly to the database without prompting the user.
   */
  autoConfirmed: boolean;
}

export interface LearnedDocumentSchema {
  id: string;
  businessEntityId: string;
  sourceType: DocumentSourceType;
  profileId: string;
  versionLabel: string;
  fileFormat: "xlsx" | "xls" | "csv" | "txt" | "xml";
  headerRowIndex: number;
  headerSignature: string;
  columnHeaders: string[];
  detectedColumnMap: DetectedColumnMap;
  sampleCount: number;
  updatedAt: string;
}

export function getOneCProfileById(profileId?: string | null): DocumentVersionProfile {
  return (
    ONEC_VERSION_PROFILES.find((p) => p.id === profileId) ??
    ONEC_VERSION_PROFILES[0]
  );
}

export function getProfileOptionsForSource(
  sourceType: DocumentSourceType
): ReadonlyArray<{ id: string; label: string; shortLabel: string }> {
  if (sourceType === "bank") return BANK_SOURCE_PROFILES;
  if (sourceType === "didox") return DIDOX_SOURCE_PROFILES;
  return ONEC_VERSION_PROFILES.map((p) => ({
    id: p.id,
    label: p.label,
    shortLabel: p.shortLabel,
  }));
}

/**
 * Strips any digits/STIRs/account numbers or company quotes from a header cell
 * so that ONLY structural column titles remain (100% Zero-PII).
 */
export function sanitizeHeaderCellName(rawHeader: string): string {
  const cleaned = String(rawHeader || "")
    .replace(/[\r\n\t]+/g, " ")
    // Mask any sequence of 5+ digits (STIR, MFO, bank account, phone, date, amount)
    .replace(/\b\d{5,}\b/g, "")
    // Mask decimal amounts if accidentally placed in header
    .replace(/\b\d+[.,]\d+\b/g, "")
    .replace(/["'«»]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 64);
}

/**
 * Builds a deterministic normalized signature from header names.
 */
export function buildHeaderSignature(headers: string[], fileFormat: string): string {
  const normalized = headers
    .map((h) =>
      sanitizeHeaderCellName(h)
        .toLowerCase()
        .replace(/[^a-zа-яёўқғҳ0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "")
    )
    .filter(Boolean);
  if (normalized.length === 0) {
    return `${fileFormat}:standard_structure`;
  }
  return `${fileFormat}:${normalized.join("|")}`.slice(0, 230);
}

/**
 * Detects column indexes from a candidate 2D table (first 15 rows).
 */
export function detectColumnMapFromRows(
  rows: string[][],
  sourceHint: DocumentSourceType = "onec"
): {
  headerRowIndex: number;
  columnHeaders: string[];
  colMap: DetectedColumnMap;
} {
  let headerRowIdx = 0;
  let colMap: DetectedColumnMap = {
    date: -1,
    counterparty: -1,
    stir: -1,
    docNum: -1,
    debit: -1,
    credit: -1,
    amount: -1,
    type: -1,
    desc: -1,
    debitIsIncome: sourceHint === "onec",
  };

  const fullTopText = rows
    .slice(0, 10)
    .flat()
    .map((c) => sanitizeHeaderCellName(c).toLowerCase())
    .join(" ");
  const looksLike1CCard =
    sourceHint === "onec" ||
    fullTopText.includes("карточка счета") ||
    fullTopText.includes("оборотно-сальдовая") ||
    fullTopText.includes("субконто");

  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const cols = rows[r].map((c) => sanitizeHeaderCellName(c).toLowerCase());
    let d = -1,
      cp = -1,
      st = -1,
      doc = -1,
      deb = -1,
      cred = -1,
      amt = -1,
      typ = -1,
      dsc = -1;
    let debitInflowHint = looksLike1CCard;

    cols.forEach((h, idx) => {
      if (!h) return;
      if (d === -1 && /(^|[\s_./-])(sana|дата|date|период)/.test(h)) d = idx;
      else if (st === -1 && /(stir|инн|inn|tin)/.test(h)) st = idx;
      else if (doc === -1 && /(номер|hujjat|докум|счет-фактур|faktura|№|\bno\b)/.test(h) && !/(счет\s*дт|счет\s*кт|schyot)/.test(h))
        doc = idx;
      else if (deb === -1 && /(расход|chiqim|списан|дебет|debit|outflow)/.test(h)) {
        deb = idx;
        if (/(расход|chiqim|списан)/.test(h)) debitInflowHint = false;
      } else if (cred === -1 && /(приход|kirim|поступ|зачисл|кредит|credit|inflow)/.test(h)) {
        cred = idx;
        if (/(приход|kirim|поступ|зачисл)/.test(h)) debitInflowHint = false;
      } else if (amt === -1 && /(summa|сумма|amount|miqdor|стоимость|итого|jami)/.test(h)) amt = idx;
      else if (typ === -1 && /(^|[\s_./-])(turi|тип|type|вид)($|[\s_./-])/.test(h)) typ = idx;
      else if (dsc === -1 && /(назначен|tavsif|izoh|описан|основан|содержан|purpose|description|comment|товар|хизмат)/.test(h))
        dsc = idx;
      else if (cp === -1 && /(kontragent|корреспонд|контрагент|субконто|получател|плательщик|наименован|counterparty|client|покупател|поставщик)/.test(h)) {
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

  const rawHeaderRow = rows[headerRowIdx] || [];
  const sanitizedHeaders = rawHeaderRow
    .map((cell) => sanitizeHeaderCellName(cell))
    .filter((cell) => cell.length > 0);

  return {
    headerRowIndex: headerRowIdx,
    columnHeaders: sanitizedHeaders,
    colMap,
  };
}

/**
 * Automatically detects the Uzbekistan Bank name/profile from top document rows (MFO codes & bank titles).
 */
export function detectUzbekBankFromContent(rawText: string): {
  profileId: string;
  versionLabel: string;
  matchedSpecifically: boolean;
} {
  const lower = rawText.toLowerCase();

  // 1) Check by bank keywords (Latin & Cyrillic)
  for (const bank of BANK_SOURCE_PROFILES) {
    if (bank.id === "bank_other") continue;
    for (const kw of bank.keywords) {
      if (lower.includes(kw)) {
        return { profileId: bank.id, versionLabel: bank.label, matchedSpecifically: true };
      }
    }
  }

  // 2) Check by 5-digit Uzbek MFO codes (e.g. 00445, 00974, 00444, 00083, 00440, 00450, 01183, etc.)
  const mfoMatches = lower.match(/\b0\d{4}\b/g) || [];
  if (mfoMatches.length > 0) {
    const mfoSet = new Set(mfoMatches);
    for (const bank of BANK_SOURCE_PROFILES) {
      if (bank.id === "bank_other") continue;
      if (bank.mfos.some((mfo) => mfoSet.has(mfo))) {
        return { profileId: bank.id, versionLabel: bank.label, matchedSpecifically: true };
      }
    }
  }

  return {
    profileId: "bank_other",
    versionLabel: "Oʻzbekiston bank koʻchirmasi (Avto-qolip)",
    matchedSpecifically: false,
  };
}

function guessSuggestedProfile(
  sourceType: DocumentSourceType,
  fileFormat: "xlsx" | "xls" | "csv" | "txt" | "xml",
  headers: string[],
  fileName: string,
  topDocumentContext = ""
): {
  effectiveSource: DocumentSourceType;
  profileId: string;
  versionLabel: string;
  autoConfirmed: boolean;
} {
  const joined = `${fileName} ${headers.join(" ")} ${topDocumentContext}`.toLowerCase();

  // 1) Didox / Soliq / Faktura EHF auto-detection (ALWAYS autoConfirmed = true, never ask user)
  if (
    sourceType === "didox" ||
    /(didox|faktura\.uz|счет-фактур|электронный счет|эсф|\behf\b|my3\.soliq|soliq\.uz)/.test(joined)
  ) {
    if (joined.includes("soliq") || joined.includes("my3")) {
      return {
        effectiveSource: "didox",
        profileId: "soliq_my3_ehf",
        versionLabel: "my3.soliq.uz — EHF va Onlayn-NKM reestri",
        autoConfirmed: true,
      };
    }
    if (joined.includes("faktura.uz") || joined.includes("e-ijara")) {
      return {
        effectiveSource: "didox",
        profileId: "faktura_uz_ehf",
        versionLabel: "Faktura.uz / E-ijara reestri",
        autoConfirmed: true,
      };
    }
    return {
      effectiveSource: "didox",
      profileId: "didox_uz_ehf",
      versionLabel: "Didox.uz — EHF reestri",
      autoConfirmed: true,
    };
  }

  // 2) Bank Statement auto-detection (ALWAYS autoConfirmed = true, never ask user for bank name)
  if (sourceType === "bank") {
    const detectedBank = detectUzbekBankFromContent(joined);
    return {
      effectiveSource: "bank",
      profileId: detectedBank.profileId,
      versionLabel: detectedBank.versionLabel,
      autoConfirmed: true,
    };
  }

  // 3) 1C / Accounting Software detection
  if (joined.includes("1uz")) {
    return {
      effectiveSource: "onec",
      profileId: "1uz_accounting",
      versionLabel: "1UZ Buxgalteriya (Milliy dastur)",
      autoConfirmed: true,
    };
  }
  if (
    joined.includes("venkon") ||
    joined.includes("редакция 3.0") ||
    joined.includes("субконто") ||
    joined.includes("карточка счета") ||
    joined.includes("5110")
  ) {
    return {
      effectiveSource: "onec",
      profileId: "1c_83_uz_venkon",
      versionLabel: "1C:Buxgalteriya 8.3 Oʻzbekiston (Venkon 3.0)",
      autoConfirmed: true,
    };
  }
  if (joined.includes("8.2") || joined.includes("7.7") || joined.includes("1с:предприятие 8.2")) {
    return {
      effectiveSource: "onec",
      profileId: "1c_82_legacy",
      versionLabel: "1C:Buxgalteriya 8.2 / 7.7 (Eski tizim)",
      autoConfirmed: true,
    };
  }
  if (fileFormat === "xml" || fileFormat === "txt") {
    return {
      effectiveSource: "onec",
      profileId: "1c_83_uz_standard",
      versionLabel: "1C:Buxgalteriya 8.3 Standart / 1C:Fresh",
      autoConfirmed: true,
    };
  }

  // Generic 1C table without explicit version marker in headers -> suggest Venkon 3.0, ask user ONLY if client has no profile set yet
  return {
    effectiveSource: "onec",
    profileId: "1c_83_uz_venkon",
    versionLabel: "1C:Buxgalteriya 8.3 Oʻzbekiston (Venkon 3.0)",
    autoConfirmed: false,
  };
}

/**
 * Extracts a 100% anonymized structural blueprint from 2D rows or text content.
 * Strictly strips all transaction amounts, company names, and STIR numbers.
 */
export function extractAnonymizedFileBlueprintFromRows(
  rows: string[][],
  fileName: string,
  sourceType: DocumentSourceType = "onec"
): AnonymizedFileBlueprint {
  const lowerName = fileName.toLowerCase();
  const topContext = rows
    .slice(0, 12)
    .flat()
    .join(" ")
    .slice(0, 2500);

  const fileFormat: "xlsx" | "xls" | "csv" | "txt" | "xml" = lowerName.endsWith(".xlsx")
    ? "xlsx"
    : lowerName.endsWith(".xls")
    ? "xls"
    : lowerName.endsWith(".xml")
    ? "xml"
    : lowerName.endsWith(".txt")
    ? "txt"
    : "csv";

  const { headerRowIndex, columnHeaders, colMap } = detectColumnMapFromRows(rows, sourceType);
  const suggested = guessSuggestedProfile(
    sourceType,
    fileFormat,
    columnHeaders,
    fileName,
    topContext
  );
  const headerSignature = buildHeaderSignature(columnHeaders, fileFormat);

  return {
    sourceType: suggested.effectiveSource,
    fileFormat,
    headerRowIndex,
    headerSignature,
    columnHeaders,
    detectedColumnMap: colMap,
    suggestedProfileId: suggested.profileId,
    suggestedVersionLabel: suggested.versionLabel,
    autoConfirmed: suggested.autoConfirmed,
  };
}

/**
 * Extracts anonymized structural blueprint from a raw file ArrayBuffer or text string.
 */
export async function extractAnonymizedFileBlueprint(
  input: ArrayBuffer | string,
  fileName: string,
  sourceType: DocumentSourceType = "onec"
): Promise<AnonymizedFileBlueprint> {
  const lowerName = fileName.toLowerCase();

  if (typeof input !== "string" && lowerName.endsWith(".xlsx")) {
    try {
      const rows = await parseXlsxBufferToRows(input);
      return extractAnonymizedFileBlueprintFromRows(rows, fileName, sourceType);
    } catch {
      // Fallback to text decoding if file is actually CSV/HTML saved with .xlsx extension
    }
  }

  const text = typeof input === "string" ? input : decodeBankFileBuffer(input);
  const trimmed = text.trim();

  // Check if 1CClientBankExchange (.txt)
  if (trimmed.includes("1CClientBankExchange") || trimmed.includes("СекцияДокумент=")) {
    const keysFound = new Set<string>();
    const topLines = trimmed.split(/\r?\n/).slice(0, 80);
    for (const rawLine of topLines) {
      const idx = rawLine.indexOf("=");
      if (idx > 0) {
        const key = sanitizeHeaderCellName(rawLine.slice(0, idx));
        if (key) keysFound.add(key);
      }
    }
    const headers = Array.from(keysFound).slice(0, 18);
    const sig = buildHeaderSignature(headers, "txt");
    const suggested = guessSuggestedProfile(
      sourceType,
      "txt",
      headers,
      fileName,
      topLines.slice(0, 25).join(" ")
    );
    return {
      sourceType: suggested.effectiveSource,
      fileFormat: "txt",
      headerRowIndex: 0,
      headerSignature: sig,
      columnHeaders: headers,
      detectedColumnMap: {
        date: 0,
        counterparty: 1,
        stir: 2,
        docNum: 3,
        debit: -1,
        credit: -1,
        amount: 4,
        type: -1,
        desc: 5,
        debitIsIncome: false,
      },
      suggestedProfileId: suggested.profileId,
      suggestedVersionLabel: suggested.versionLabel,
      autoConfirmed: suggested.autoConfirmed,
    };
  }

  // Check if 1C EnterpriseData XML
  if (trimmed.startsWith("<?xml") || /<(EnterpriseData|Operation|Документ)\b/i.test(trimmed)) {
    const tagMatches = trimmed.slice(0, 4000).match(/<([A-Za-zА-Яа-яЁё0-9_]+)\b/g) || [];
    const uniqueTags = Array.from(
      new Set(tagMatches.map((t) => sanitizeHeaderCellName(t.replace(/^</, ""))))
    ).slice(0, 16);
    const sig = buildHeaderSignature(uniqueTags, "xml");
    return {
      sourceType: "onec",
      fileFormat: "xml",
      headerRowIndex: 0,
      headerSignature: sig,
      columnHeaders: uniqueTags,
      detectedColumnMap: {
        date: 0,
        counterparty: 1,
        stir: 2,
        docNum: 3,
        debit: 4,
        credit: 5,
        amount: 6,
        type: -1,
        desc: 7,
        debitIsIncome: true,
      },
      suggestedProfileId: "1c_83_uz_standard",
      suggestedVersionLabel: "1C:Buxgalteriya 8.3 Standart / EnterpriseData XML",
      autoConfirmed: true,
    };
  }

  // Delimited text (CSV / TSV)
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 20);
  const sample = lines.slice(0, 5).join("\n");
  const delimiter =
    (sample.match(/\t/g) || []).length > (sample.match(/;/g) || []).length
      ? "\t"
      : (sample.match(/;/g) || []).length >= (sample.match(/,/g) || []).length
      ? ";"
      : ",";
  const rows = lines.map((line) => line.split(delimiter).map((c) => c.replace(/^["']|["']$/g, "").trim()));
  return extractAnonymizedFileBlueprintFromRows(rows, fileName, sourceType);
}

/**
 * Matches an extracted file blueprint against a client's learned schemas.
 */
export function detectLearnedSchemaMatch(
  blueprint: AnonymizedFileBlueprint,
  learnedSchemas: LearnedDocumentSchema[]
): LearnedDocumentSchema | null {
  if (!learnedSchemas || learnedSchemas.length === 0) return null;

  // 1) Exact signature match
  const exact = learnedSchemas.find(
    (s) => s.sourceType === blueprint.sourceType && s.headerSignature === blueprint.headerSignature
  );
  if (exact) return exact;

  // 2) High header overlap match (>= 80% matching column names)
  if (blueprint.columnHeaders.length >= 3) {
    const bpSet = new Set(blueprint.columnHeaders.map((h) => h.toLowerCase()));
    for (const s of learnedSchemas) {
      if (s.sourceType !== blueprint.sourceType || s.columnHeaders.length < 3) continue;
      const matchCount = s.columnHeaders.filter((h) => bpSet.has(h.toLowerCase())).length;
      const ratio = matchCount / Math.max(blueprint.columnHeaders.length, s.columnHeaders.length);
      if (ratio >= 0.8) {
        return s;
      }
    }
  }

  return null;
}

/**
 * Parses 2D table rows using a learned schema's custom detectedColumnMap.
 */
export function parseRowsWithLearnedSchema(
  rows: string[][],
  schema: Pick<LearnedDocumentSchema, "headerRowIndex" | "detectedColumnMap">
): ParsedBankTransaction[] {
  const { headerRowIndex, detectedColumnMap: colMap } = schema;
  if (rows.length <= headerRowIndex + 1 || colMap.date === -1) return [];

  const transactions: ParsedBankTransaction[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length < 2) continue;

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
      const signed = parseMoneyString(cols[colMap.amount] || "");
      const typeStr = colMap.type !== -1 ? (cols[colMap.type] || "").toLowerCase() : "";
      type =
        typeStr === "expense" || typeStr === "chiqim" || typeStr === "расход" || signed < 0
          ? "expense"
          : "income";
      amount = Math.abs(signed);
    }

    if (amount <= 0) continue;

    const counterparty =
      (colMap.counterparty !== -1 ? cols[colMap.counterparty] : "")?.trim() || "Kontragent";
    const stir =
      colMap.stir !== -1
        ? (cols[colMap.stir] || "").replace(/\D/g, "").slice(0, 9) || undefined
        : undefined;
    const description =
      (colMap.desc !== -1 ? cols[colMap.desc] : "")?.trim() || counterparty || "Operatsiya";
    const documentNumber =
      colMap.docNum !== -1 ? (cols[colMap.docNum] || "").trim() || undefined : undefined;

    transactions.push({
      date,
      amount,
      type,
      counterparty,
      counterpartyStir: stir,
      description,
      accountCode: type === "income" ? "4010" : "6010",
      accountName: type === "income" ? "Xaridorlar schyoti" : "Yetkazib beruvchilar schyoti",
      documentNumber,
    });
  }

  return transactions;
}

/**
 * Generates version-tailored 1CClientBankExchange (.txt) according to the active client's 1C profile.
 */
export function generate1CClientBankTextForProfile(
  profileId: string | null | undefined,
  transactions: Parameters<typeof generate1CClientBankText>[0],
  entityInfo: Parameters<typeof generate1CClientBankText>[1]
): string {
  const profile = getOneCProfileById(profileId);
  const rawTxt = generate1CClientBankText(transactions, entityInfo, {
    encoding: profile.exportEncoding,
  });

  return rawTxt
    .replace(/^ВерсияФормата=1\.02/m, `ВерсияФормата=${profile.clientBankFormatVersion}`)
    .replace(/^Получатель=1С:Предприятие 8\.3/m, `Получатель=${profile.recipientName}`);
}

/**
 * Generates version-tailored 1C EnterpriseData XML according to the active client's 1C profile.
 */
export function generate1CEnterpriseXmlForProfile(
  profileId: string | null | undefined,
  journalEntries: Parameters<typeof generate1CEnterpriseDataXml>[0]
): string {
  const profile = getOneCProfileById(profileId);
  const rawXml = generate1CEnterpriseDataXml(journalEntries);
  return rawXml.replace(
    /<Destination>1C_Bukhgalteriya_Uzbekistan<\/Destination>/,
    `<Destination>${profile.xmlDestination}</Destination>`
  );
}

// ============================================================================
// Supabase Persistence for Learned Anonymized Schemas
// ============================================================================

export async function fetchLearnedSchemasForEntity(
  entityId: string
): Promise<LearnedDocumentSchema[]> {
  if (!entityId) return [];
  const { data, error } = await supabase
    .from("onec_learned_schemas")
    .select("*")
    .eq("business_entity_id", entityId)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    businessEntityId: row.business_entity_id,
    sourceType: (row.source_type as DocumentSourceType) || "onec",
    profileId: row.profile_id,
    versionLabel: row.version_label,
    fileFormat: row.file_format || "xlsx",
    headerRowIndex: Number(row.header_row_index ?? 0),
    headerSignature: row.header_signature,
    columnHeaders: Array.isArray(row.column_headers) ? row.column_headers : [],
    detectedColumnMap: (row.detected_column_map as DetectedColumnMap) || {
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
    },
    sampleCount: Number(row.sample_count ?? 1),
    updatedAt: row.updated_at,
  }));
}

export async function saveLearnedSchemaForEntity(params: {
  entityId: string;
  sourceType: DocumentSourceType;
  profileId: string;
  versionLabel: string;
  blueprint: AnonymizedFileBlueprint;
}): Promise<LearnedDocumentSchema> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Qolipni saqlash uchun tizimga kirgan boʻlishingiz kerak.");
  }

  // Ensure headers are strictly sanitized before DB write
  const safeHeaders = params.blueprint.columnHeaders
    .map((h) => sanitizeHeaderCellName(h))
    .filter(Boolean)
    .slice(0, 30);

  const safeSignature = buildHeaderSignature(safeHeaders, params.blueprint.fileFormat);

  // Check if this signature already exists for this entity + sourceType
  const { data: existing } = await supabase
    .from("onec_learned_schemas")
    .select("id, sample_count")
    .eq("business_entity_id", params.entityId)
    .eq("source_type", params.sourceType)
    .eq("header_signature", safeSignature)
    .maybeSingle();

  const nextSampleCount = existing ? Number(existing.sample_count || 1) + 1 : 1;

  const { data, error } = await supabase
    .from("onec_learned_schemas")
    .upsert(
      {
        business_entity_id: params.entityId,
        created_by_user_id: user.id,
        source_type: params.sourceType,
        profile_id: params.profileId,
        version_label: params.versionLabel,
        file_format: params.blueprint.fileFormat,
        header_row_index: params.blueprint.headerRowIndex,
        header_signature: safeSignature,
        column_headers: safeHeaders,
        detected_column_map: params.blueprint.detectedColumnMap,
        sample_count: nextSampleCount,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "business_entity_id,source_type,header_signature",
      }
    )
    .select("*")
    .single();

  if (error) throw error;

  // If sourceType is 'onec', also update the client's default onec_profile_id
  if (params.sourceType === "onec") {
    await supabase
      .from("business_entities")
      .update({ onec_profile_id: params.profileId })
      .eq("id", params.entityId);
  } else if (params.sourceType === "bank" && params.profileId !== "bank_other") {
    const matchedBank = BANK_SOURCE_PROFILES.find((b) => b.id === params.profileId);
    if (matchedBank) {
      const { data: ent } = await supabase
        .from("business_entities")
        .select("primary_bank")
        .eq("id", params.entityId)
        .maybeSingle();
      if (ent && !ent.primary_bank) {
        await supabase
          .from("business_entities")
          .update({ primary_bank: matchedBank.shortLabel })
          .eq("id", params.entityId);
      }
    }
  }

  return {
    id: data.id,
    businessEntityId: data.business_entity_id,
    sourceType: data.source_type as DocumentSourceType,
    profileId: data.profile_id,
    versionLabel: data.version_label,
    fileFormat: data.file_format,
    headerRowIndex: Number(data.header_row_index ?? 0),
    headerSignature: data.header_signature,
    columnHeaders: Array.isArray(data.column_headers) ? data.column_headers : [],
    detectedColumnMap: data.detected_column_map as DetectedColumnMap,
    sampleCount: Number(data.sample_count ?? 1),
    updatedAt: data.updated_at,
  };
}
