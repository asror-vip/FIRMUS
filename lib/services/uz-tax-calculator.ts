import { roundMoney } from "@/lib/utils/finance";
import { getTashkentTodayIso } from "@/lib/format/date";

export const LEX_UZ_TAX_CODE_URL = "https://lex.uz/docs/4674902";
export const LEX_UZ_BHMS21_URL = "https://lex.uz/docs/-7315183";

export type TaxpayerStatus = "llc" | "yatt" | "self_employed";
export type TaxRegimeType = "turnover_tax" | "vat_profit_tax" | "fixed_tax";
export type TaxRuleVerificationStatus = "verified" | "unverified";

export interface TaxRateRuleEntry {
  status: TaxpayerStatus;
  regime: TaxRegimeType;
  rate: number;
  ratePercent: number;
  annualThresholdUzs: number | null;
  annualThresholdBhm: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  legalRef: string;
  sourceUrl: string;
  /** Individual verification date (YYYY-MM-DD) for this specific rule, or null if unverified. */
  lastVerifiedAt: string | null;
  verificationStatus: TaxRuleVerificationStatus;
  note?: string;
}

export interface UzTaxRulesVersion {
  versionId: string;
  effectiveYear: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  lastVerifiedAt: string;
  sourceUrl: string;
  bhmUzs: number;
  bhmLegalRef: string;
  vatMandatoryThresholdBhm: number | null;
  vatMandatoryThresholdUzs: number;
  vatThresholdLegalRef: string;
  fixedTaxAbolishedForYatt: boolean;
  vatRate: number;
  jshdsRate: number;
  inpsRate: number;
  socialTaxRate: number;
  corporateTaxRate: number;
  dividendResidentRate: number;
  dividendNonResidentRate: number;
  turnoverRates: {
    trade: number;
    services: number;
    catering: number;
    ecommerce: number;
    export: number;
  };
  statusRules: Record<
    TaxpayerStatus,
    {
      turnover: TaxRateRuleEntry;
      vatProfit: TaxRateRuleEntry;
    }
  >;
  articles: {
    payroll: string;
    vat: string;
    turnover: string;
    corporate: string;
    dividendResident: string;
    dividendNonResident: string;
  };
}

const YATT_PF100_OVERLAP_NOTE =
  "TASDIQLANMAGAN: PQ-247 / OʻRQ-1108 boʻyicha YaTT va oʻzini oʻzi band qilganlar uchun 1% stavka 1 mlrd soʻmgacha belgilangan; 2026-06-01 dan PF-100 bilan joriy etilgan 12 000 BHM chegarasi doirasida 1 mlrd soʻmdan oshgan YaTT qismining stavkasi rasmiy modda matnidan qoʻshimcha tekshirilishi kerak.";

function buildStatusRules2025(): UzTaxRulesVersion["statusRules"] {
  const effectiveFrom = "2025-01-01";
  const effectiveTo = "2025-12-31";
  return {
    llc: {
      turnover: {
        status: "llc",
        regime: "turnover_tax",
        rate: 0.04,
        ratePercent: 4,
        annualThresholdUzs: 1_000_000_000,
        annualThresholdBhm: null,
        effectiveFrom,
        effectiveTo,
        legalRef: "Soliq kodeksi 461, 467-moddalar (MChJ aylanma soligʻi 4%, 1 mlrd soʻmgacha)",
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: "2026-01-15",
        verificationStatus: "verified",
      },
      vatProfit: {
        status: "llc",
        regime: "vat_profit_tax",
        rate: 0.12,
        ratePercent: 12,
        annualThresholdUzs: null,
        annualThresholdBhm: null,
        effectiveFrom,
        effectiveTo,
        legalRef: "Soliq kodeksi 258-modda (QQS 12%) va 337-modda (Foyda soligʻi 15%)",
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: "2026-01-15",
        verificationStatus: "verified",
      },
    },
    yatt: {
      turnover: {
        status: "yatt",
        regime: "turnover_tax",
        rate: 0.04,
        ratePercent: 4,
        annualThresholdUzs: 1_000_000_000,
        annualThresholdBhm: null,
        effectiveFrom,
        effectiveTo,
        legalRef: "Soliq kodeksi 461, 467-moddalar (2025-yil: YaTT 100 mln–1 mlrd oraligʻida 4%)",
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: "2026-01-15",
        verificationStatus: "verified",
      },
      vatProfit: {
        status: "yatt",
        regime: "vat_profit_tax",
        rate: 0.12,
        ratePercent: 12,
        annualThresholdUzs: null,
        annualThresholdBhm: null,
        effectiveFrom,
        effectiveTo,
        legalRef: "Soliq kodeksi 258-modda (QQS 12%) va 337-modda (Foyda soligʻi 15%)",
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: "2026-01-15",
        verificationStatus: "verified",
      },
    },
    self_employed: {
      turnover: {
        status: "self_employed",
        regime: "turnover_tax",
        rate: 0.04,
        ratePercent: 4,
        annualThresholdUzs: 1_000_000_000,
        annualThresholdBhm: null,
        effectiveFrom,
        effectiveTo,
        legalRef: "Soliq kodeksi 461, 467-moddalar (2025-yil: 100 mln soʻmgacha ozod, 100 mln–1 mlrd oraligʻida 4%)",
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: "2026-01-15",
        verificationStatus: "verified",
      },
      vatProfit: {
        status: "self_employed",
        regime: "vat_profit_tax",
        rate: 0.12,
        ratePercent: 12,
        annualThresholdUzs: null,
        annualThresholdBhm: null,
        effectiveFrom,
        effectiveTo,
        legalRef: "Soliq kodeksi 258-modda (QQS 12%) va 337-modda (Foyda soligʻi 15%)",
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: "2026-01-15",
        verificationStatus: "verified",
      },
    },
  };
}

function buildStatusRules2026(params: {
  effectiveFrom: string;
  effectiveTo: string | null;
  llcThresholdUzs: number;
  llcThresholdBhm: number | null;
  llcLegalRef: string;
  llcVerifiedAt: string;
  vatProfitVerifiedAt: string;
  yattTurnoverVerificationStatus: TaxRuleVerificationStatus;
  yattTurnoverVerifiedAt: string | null;
  selfEmployedTurnoverVerificationStatus: TaxRuleVerificationStatus;
  selfEmployedTurnoverVerifiedAt: string | null;
  includePf100YattNote: boolean;
}): UzTaxRulesVersion["statusRules"] {
  const {
    effectiveFrom,
    effectiveTo,
    llcThresholdUzs,
    llcThresholdBhm,
    llcLegalRef,
    llcVerifiedAt,
    vatProfitVerifiedAt,
    yattTurnoverVerificationStatus,
    yattTurnoverVerifiedAt,
    selfEmployedTurnoverVerificationStatus,
    selfEmployedTurnoverVerifiedAt,
    includePf100YattNote,
  } = params;
  return {
    llc: {
      turnover: {
        status: "llc",
        regime: "turnover_tax",
        rate: 0.04,
        ratePercent: 4,
        annualThresholdUzs: llcThresholdUzs,
        annualThresholdBhm: llcThresholdBhm,
        effectiveFrom,
        effectiveTo,
        legalRef: llcLegalRef,
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: llcVerifiedAt,
        verificationStatus: "verified",
      },
      vatProfit: {
        status: "llc",
        regime: "vat_profit_tax",
        rate: 0.12,
        ratePercent: 12,
        annualThresholdUzs: null,
        annualThresholdBhm: null,
        effectiveFrom,
        effectiveTo,
        legalRef: "Soliq kodeksi 258-modda (QQS 12%) va 337-modda (Foyda soligʻi 15%)",
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: vatProfitVerifiedAt,
        verificationStatus: "verified",
      },
    },
    yatt: {
      turnover: {
        status: "yatt",
        regime: "turnover_tax",
        rate: 0.01,
        ratePercent: 1,
        annualThresholdUzs: 1_000_000_000,
        annualThresholdBhm: null,
        effectiveFrom,
        effectiveTo,
        legalRef:
          "Soliq kodeksi 461, 467-moddalar; PQ-247 (12.08.2025) va OʻRQ-1108 (25.12.2025) — YaTT aylanma soligʻi 1% (1 mlrd soʻmgacha)",
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: yattTurnoverVerifiedAt,
        verificationStatus: yattTurnoverVerificationStatus,
        note: includePf100YattNote ? YATT_PF100_OVERLAP_NOTE : undefined,
      },
      vatProfit: {
        status: "yatt",
        regime: "vat_profit_tax",
        rate: 0.12,
        ratePercent: 12,
        annualThresholdUzs: null,
        annualThresholdBhm: null,
        effectiveFrom,
        effectiveTo,
        legalRef: "Soliq kodeksi 258-modda (QQS 12%) va 337-modda (Foyda soligʻi 15%)",
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: vatProfitVerifiedAt,
        verificationStatus: "verified",
      },
    },
    self_employed: {
      turnover: {
        status: "self_employed",
        regime: "turnover_tax",
        rate: 0.01,
        ratePercent: 1,
        annualThresholdUzs: 1_000_000_000,
        annualThresholdBhm: null,
        effectiveFrom,
        effectiveTo,
        legalRef:
          "Soliq kodeksi 461, 467-moddalar; PQ-247 (12.08.2025) va OʻRQ-1108 (25.12.2025) — Oʻzini oʻzi band qilganlar 1% (1 mlrd soʻmgacha)",
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: selfEmployedTurnoverVerifiedAt,
        verificationStatus: selfEmployedTurnoverVerificationStatus,
        note: includePf100YattNote ? YATT_PF100_OVERLAP_NOTE : undefined,
      },
      vatProfit: {
        status: "self_employed",
        regime: "vat_profit_tax",
        rate: 0.12,
        ratePercent: 12,
        annualThresholdUzs: null,
        annualThresholdBhm: null,
        effectiveFrom,
        effectiveTo,
        legalRef: "Soliq kodeksi 258-modda (QQS 12%) va 337-modda (Foyda soligʻi 15%)",
        sourceUrl: LEX_UZ_TAX_CODE_URL,
        lastVerifiedAt: vatProfitVerifiedAt,
        verificationStatus: "verified",
      },
    },
  };
}

export const UZ_TAX_RULES_VERSIONS: Record<string, UzTaxRulesVersion> = {
  "2025": {
    versionId: "UZ-SK-2025.1",
    effectiveYear: 2025,
    effectiveFrom: "2025-01-01",
    effectiveTo: "2025-12-31",
    lastVerifiedAt: "2026-01-15",
    sourceUrl: LEX_UZ_TAX_CODE_URL,
    bhmUzs: 412_000,
    bhmLegalRef: "2025-yil 1-avgustdan BHM 412 000 soʻm",
    vatMandatoryThresholdBhm: null,
    vatMandatoryThresholdUzs: 1_000_000_000,
    vatThresholdLegalRef: "Soliq kodeksi 461-modda (2025-yil: 1 mlrd soʻm)",
    fixedTaxAbolishedForYatt: false,
    vatRate: 0.12,
    jshdsRate: 0.12,
    inpsRate: 0.001,
    socialTaxRate: 0.12,
    corporateTaxRate: 0.15,
    dividendResidentRate: 0.05,
    dividendNonResidentRate: 0.1,
    turnoverRates: {
      trade: 0.04,
      services: 0.04,
      catering: 0.04,
      ecommerce: 0.02,
      export: 0.0,
    },
    statusRules: buildStatusRules2025(),
    articles: {
      payroll: "Soliq kodeksi 381-modda (JShDS 12%) va 405-modda (Ijtimoiy soliq 12%)",
      vat: "Soliq kodeksi 258-modda (QQS stavkasi 12%)",
      turnover: "Soliq kodeksi 467-modda (2025-yil: aylanmadan olinadigan soliq 4%)",
      corporate: "Soliq kodeksi 337-modda (Foyda soligʻi asosiy stavkasi 15%)",
      dividendResident: "Soliq kodeksi 381-modda (Oʻzbekiston rezidentlari dividendlariga 5% soliq stavkasi)",
      dividendNonResident: "Soliq kodeksi 353-modda (Norezidentlar dividendlariga 10% soliq stavkasi)",
    },
  },
  "2026-01": {
    versionId: "UZ-SK-2026.1",
    effectiveYear: 2026,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-05-31",
    lastVerifiedAt: "2026-02-10",
    sourceUrl: LEX_UZ_TAX_CODE_URL,
    bhmUzs: 412_000,
    bhmLegalRef: "2025-yil 1-avgust – 2026-yil 31-avgust: BHM 412 000 soʻm",
    vatMandatoryThresholdBhm: null,
    vatMandatoryThresholdUzs: 1_000_000_000,
    vatThresholdLegalRef: "Soliq kodeksi 461-modda (2026-yil 31-maygacha: 1 mlrd soʻm)",
    fixedTaxAbolishedForYatt: true,
    vatRate: 0.12,
    jshdsRate: 0.12,
    inpsRate: 0.001,
    socialTaxRate: 0.12,
    corporateTaxRate: 0.15,
    dividendResidentRate: 0.05,
    dividendNonResidentRate: 0.1,
    turnoverRates: {
      trade: 0.04,
      services: 0.04,
      catering: 0.04,
      ecommerce: 0.04,
      export: 0.0,
    },
    statusRules: buildStatusRules2026({
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-05-31",
      llcThresholdUzs: 1_000_000_000,
      llcThresholdBhm: null,
      llcLegalRef:
        "Soliq kodeksi 461, 467-moddalar; OʻRQ-1108 (25.12.2025) — MChJ aylanma soligʻi 4% (e-commerce ham 4%)",
      llcVerifiedAt: "2026-02-10",
      vatProfitVerifiedAt: "2026-02-10",
      yattTurnoverVerificationStatus: "verified",
      yattTurnoverVerifiedAt: "2026-02-10",
      selfEmployedTurnoverVerificationStatus: "verified",
      selfEmployedTurnoverVerifiedAt: "2026-02-10",
      includePf100YattNote: false,
    }),
    articles: {
      payroll: "Soliq kodeksi 381-modda (JShDS 12%) va 405-modda (Ijtimoiy soliq 12%)",
      vat: "Soliq kodeksi 258-modda (QQS stavkasi 12%)",
      turnover:
        "Soliq kodeksi 467-modda; PQ-247 (12.08.2025), OʻRQ-1108 (25.12.2025) — MChJ 4%, YaTT/oʻzini oʻzi band 1% (1 mlrd soʻmgacha)",
      corporate: "Soliq kodeksi 337-modda (Foyda soligʻi asosiy stavkasi 15%)",
      dividendResident: "Soliq kodeksi 381-modda (Oʻzbekiston rezidentlari dividendlariga 5% soliq stavkasi)",
      dividendNonResident: "Soliq kodeksi 353-modda (Norezidentlar dividendlariga 10% soliq stavkasi)",
    },
  },
  "2026-06": {
    versionId: "UZ-SK-2026.2",
    effectiveYear: 2026,
    effectiveFrom: "2026-06-01",
    effectiveTo: "2026-08-31",
    lastVerifiedAt: "2026-06-15",
    sourceUrl: LEX_UZ_TAX_CODE_URL,
    bhmUzs: 412_000,
    bhmLegalRef: "2025-yil 1-avgust – 2026-yil 31-avgust: BHM 412 000 soʻm",
    vatMandatoryThresholdBhm: 12_000,
    vatMandatoryThresholdUzs: 12_000 * 412_000, // 4,944,000,000 UZS
    vatThresholdLegalRef: "PF-100 (26.05.2026), 2026-yil 1-iyundan QQS chegarasi 12 000 BHM (4,944 mlrd soʻm)",
    fixedTaxAbolishedForYatt: true,
    vatRate: 0.12,
    jshdsRate: 0.12,
    inpsRate: 0.001,
    socialTaxRate: 0.12,
    corporateTaxRate: 0.15,
    dividendResidentRate: 0.05,
    dividendNonResidentRate: 0.1,
    turnoverRates: {
      trade: 0.04,
      services: 0.04,
      catering: 0.04,
      ecommerce: 0.04,
      export: 0.0,
    },
    statusRules: buildStatusRules2026({
      effectiveFrom: "2026-06-01",
      effectiveTo: "2026-08-31",
      llcThresholdUzs: 12_000 * 412_000,
      llcThresholdBhm: 12_000,
      llcLegalRef:
        "Soliq kodeksi 467-modda; OʻRQ-1108 (25.12.2025); PF-100 (26.05.2026) — MChJ aylanma soligʻi 4%, chegara 12 000 BHM (4,944 mlrd soʻm)",
      llcVerifiedAt: "2026-06-15",
      vatProfitVerifiedAt: "2026-06-15",
      yattTurnoverVerificationStatus: "unverified",
      yattTurnoverVerifiedAt: null,
      selfEmployedTurnoverVerificationStatus: "unverified",
      selfEmployedTurnoverVerifiedAt: null,
      includePf100YattNote: true,
    }),
    articles: {
      payroll: "Soliq kodeksi 381-modda (JShDS 12%) va 405-modda (Ijtimoiy soliq 12%)",
      vat: "Soliq kodeksi 258-modda (QQS 12%); PF-100 (26.05.2026) — majburiy QQS chegarasi 12 000 BHM",
      turnover:
        "Soliq kodeksi 467-modda; PQ-247, OʻRQ-1108, PF-100 — MChJ 4% (12 000 BHMgacha), YaTT/oʻzini oʻzi band 1% (1 mlrd soʻmgacha)",
      corporate: "Soliq kodeksi 337-modda (Foyda soligʻi asosiy stavkasi 15%)",
      dividendResident: "Soliq kodeksi 381-modda (Oʻzbekiston rezidentlari dividendlariga 5% soliq stavkasi)",
      dividendNonResident: "Soliq kodeksi 353-modda (Norezidentlar dividendlariga 10% soliq stavkasi)",
    },
  },
  "2026": {
    versionId: "UZ-SK-2026.3",
    effectiveYear: 2026,
    effectiveFrom: "2026-09-01",
    effectiveTo: null,
    lastVerifiedAt: "2026-09-10",
    sourceUrl: LEX_UZ_TAX_CODE_URL,
    bhmUzs: 440_000,
    bhmLegalRef: "PF-115 (23.06.2026), 2026-yil 1-sentabrdan BHM 440 000 soʻm",
    vatMandatoryThresholdBhm: 12_000,
    vatMandatoryThresholdUzs: 12_000 * 440_000, // 5,280,000,000 UZS
    vatThresholdLegalRef:
      "PF-100 (26.05.2026) + PF-115 (23.06.2026) — QQS chegarasi 12 000 BHM (BHM 440 000 soʻm = 5,28 mlrd soʻm)",
    fixedTaxAbolishedForYatt: true,
    vatRate: 0.12,
    jshdsRate: 0.12,
    inpsRate: 0.001,
    socialTaxRate: 0.12,
    corporateTaxRate: 0.15,
    dividendResidentRate: 0.05,
    dividendNonResidentRate: 0.1,
    turnoverRates: {
      trade: 0.04,
      services: 0.04,
      catering: 0.04,
      ecommerce: 0.04,
      export: 0.0,
    },
    statusRules: buildStatusRules2026({
      effectiveFrom: "2026-09-01",
      effectiveTo: null,
      llcThresholdUzs: 12_000 * 440_000,
      llcThresholdBhm: 12_000,
      llcLegalRef:
        "Soliq kodeksi 467-modda; OʻRQ-1108 (25.12.2025); PF-100 (26.05.2026); PF-115 (23.06.2026) — MChJ aylanma soligʻi 4%, chegara 12 000 BHM (5,28 mlrd soʻm)",
      llcVerifiedAt: "2026-09-10",
      vatProfitVerifiedAt: "2026-09-10",
      yattTurnoverVerificationStatus: "unverified",
      yattTurnoverVerifiedAt: null,
      selfEmployedTurnoverVerificationStatus: "unverified",
      selfEmployedTurnoverVerifiedAt: null,
      includePf100YattNote: true,
    }),
    articles: {
      payroll: "Soliq kodeksi 381-modda (JShDS 12%) va 405-modda (Ijtimoiy soliq 12%)",
      vat: "Soliq kodeksi 258-modda (QQS 12%); PF-100 + PF-115 — majburiy QQS chegarasi 12 000 BHM (5,28 mlrd soʻm)",
      turnover:
        "Soliq kodeksi 467-modda; PQ-247, OʻRQ-1108, PF-100 — MChJ 4% (12 000 BHMgacha), YaTT/oʻzini oʻzi band 1% (1 mlrd soʻmgacha)",
      corporate: "Soliq kodeksi 337-modda (Foyda soligʻi asosiy stavkasi 15%)",
      dividendResident: "Soliq kodeksi 381-modda (Oʻzbekiston rezidentlari dividendlariga 5% soliq stavkasi)",
      dividendNonResident: "Soliq kodeksi 353-modda (Norezidentlar dividendlariga 10% soliq stavkasi)",
    },
  },
};

export function resolveUzTaxRules(dateOrYear?: string | number): UzTaxRulesVersion {
  const allVersions = Object.values(UZ_TAX_RULES_VERSIONS);
  const todayIso = getTashkentTodayIso();

  if (dateOrYear === undefined || dateOrYear === null || String(dateOrYear).trim() === "") {
    const byToday = allVersions.find(
      (v) => todayIso >= v.effectiveFrom && (v.effectiveTo === null || todayIso <= v.effectiveTo)
    );
    return byToday ?? UZ_TAX_RULES_VERSIONS["2026"];
  }

  const raw = typeof dateOrYear === "number" ? String(Math.trunc(dateOrYear)) : String(dateOrYear).trim();

  if (UZ_TAX_RULES_VERSIONS[raw]) {
    return UZ_TAX_RULES_VERSIONS[raw];
  }

  const versionMatch = allVersions.find((v) => v.versionId === raw);
  if (versionMatch) {
    return versionMatch;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const isoDate = raw.slice(0, 10);
    const byDate = allVersions.find(
      (v) => isoDate >= v.effectiveFrom && (v.effectiveTo === null || isoDate <= v.effectiveTo)
    );
    if (byDate) return byDate;
  }

  const yearMatch = raw.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const yr = Number(yearMatch[1]);
    if (UZ_TAX_RULES_VERSIONS[String(yr)]) {
      return UZ_TAX_RULES_VERSIONS[String(yr)];
    }
    if (yr <= 2025) {
      return UZ_TAX_RULES_VERSIONS["2025"];
    }
  }

  return UZ_TAX_RULES_VERSIONS["2026"];
}

export function getTurnoverRuleForStatus(
  status: TaxpayerStatus = "llc",
  dateOrYear?: string | number
): TaxRateRuleEntry {
  const rules = resolveUzTaxRules(dateOrYear);
  return rules.statusRules[status]?.turnover ?? rules.statusRules.llc.turnover;
}

export function getTaxRuleEntries(dateOrYear?: string | number): TaxRateRuleEntry[] {
  const rules = resolveUzTaxRules(dateOrYear);
  const statuses: TaxpayerStatus[] = ["llc", "yatt", "self_employed"];
  return statuses.flatMap((st) => [
    rules.statusRules[st].turnover,
    rules.statusRules[st].vatProfit,
  ]);
}

export function getUnverifiedTaxRules(dateOrYear?: string | number): TaxRateRuleEntry[] {
  return getTaxRuleEntries(dateOrYear).filter((entry) => entry.verificationStatus === "unverified");
}

export function getTurnoverRateRangeLabel(dateOrYear?: string | number): string {
  const rules = resolveUzTaxRules(dateOrYear);
  const rates = Array.from(
    new Set(
      (["llc", "yatt", "self_employed"] as TaxpayerStatus[]).map(
        (s) => rules.statusRules[s].turnover.ratePercent
      )
    )
  ).sort((a, b) => a - b);

  if (rates.length === 0) return "";
  if (rates.length === 1) return `${rates[0]}%`;
  return `${rates[0]}%–${rates[rates.length - 1]}%`;
}

export function getVatRatePercent(dateOrYear?: string | number): number {
  return roundMoney(resolveUzTaxRules(dateOrYear).vatRate * 100);
}

export function buildTaxRulesSummaryForAi(dateOrYear?: string | number): string {
  const rules = resolveUzTaxRules(dateOrYear);
  const vatPct = roundMoney(rules.vatRate * 100);
  const jshdsPct = roundMoney(rules.jshdsRate * 100);
  const inpsPct = roundMoney(rules.inpsRate * 100);
  const socialPct = roundMoney(rules.socialTaxRate * 100);
  const corpPct = roundMoney(rules.corporateTaxRate * 100);
  const llcRule = rules.statusRules.llc.turnover;
  const yattRule = rules.statusRules.yatt.turnover;
  const selfRule = rules.statusRules.self_employed.turnover;

  const thresholdLine = rules.vatMandatoryThresholdBhm
    ? `${rules.vatMandatoryThresholdBhm.toLocaleString("en-US")} BHM (BHM = ${rules.bhmUzs.toLocaleString("en-US")} so'm → ${rules.vatMandatoryThresholdUzs.toLocaleString("en-US")} so'm)`
    : `${rules.vatMandatoryThresholdUzs.toLocaleString("en-US")} so'm`;

  const formatRuleStatus = (entry: TaxRateRuleEntry) =>
    entry.verificationStatus === "verified" && entry.lastVerifiedAt
      ? `tasdiqlangan: ${entry.lastVerifiedAt}`
      : "TASDIQLANMAGAN — qoʻshimcha tekshiruv talab qilinadi";

  return [
    `   - Amaldagi soliq qoidalari versiyasi: ${rules.versionId} (kuchga kirish: ${rules.effectiveFrom}).`,
    `   - Rasmiy manbalar: Soliq kodeksi (${rules.sourceUrl}), 21-son BHMS (${LEX_UZ_BHMS21_URL}).`,
    `   - QQS ${vatPct}% (SK 258-modda): ichidan ajratish = round(summa * ${vatPct} / ${100 + vatPct}, 2); sotuvda 6410 (Kt), xaridda 4410 (Dt). Majburiy QQS chegarasi: ${thresholdLine} (${rules.vatThresholdLegalRef}).`,
    `   - Foyda solig'i ${corpPct}% (SK 337-modda): 9810 Dt / 6810 Kt.`,
    `   - Ish haqi (SK 381 va 405-moddalar): JShDS ${jshdsPct}% (shundan ${inpsPct}% ShJBPH/INPS ichida; 6710 Dt / 6410 Kt), Ijtimoiy soliq ${socialPct}% (9420 Dt / 6520 Kt).`,
    `   - Aylanmadan olinadigan soliq (9430 Dt / 6410 Kt):`,
    `     • MChJ / yuridik shaxs: ${llcRule.ratePercent}% (chegara: ${thresholdLine}; ${llcRule.legalRef}) [${formatRuleStatus(llcRule)}].`,
    `     • YaTT: ${yattRule.ratePercent}% (1 mlrd so'mgacha; ${yattRule.legalRef}) [${formatRuleStatus(yattRule)}].${rules.fixedTaxAbolishedForYatt ? " 2026-yildan YaTT qat'iy JShDS bekor qilingan." : ""}`,
    `     • O'zini o'zi band qilganlar: ${selfRule.ratePercent}% (1 mlrd so'mgacha; ${selfRule.legalRef}) [${formatRuleStatus(selfRule)}].`,
    `   - Muhim: Soliq hisob-kitoblarida aniqlik uchun doim calculate_uz_tax toolini chaqiring va mijoz maqomini (llc / yatt / self_employed) inobatga oling. Tasdiqlanmagan qoida bo'lsa foydalanuvchini albatta ogohlantiring.`,
  ].join("\n");
}

export interface ProvodkaLine {
  debitCode: string;
  creditCode: string;
  amount: number;
  description: string;
}

export interface PayrollCalculationResult {
  gross: number;
  net: number;
  jshds12: number;
  inps01: number;
  jshdsBudget: number;
  socialTax12: number;
  totalEmployerCost: number;
  taxRuleVersion: string;
  effectiveYear: number;
  lastVerifiedAt: string;
  taxArticleRef: string;
  lexUrl: string;
  provodka: ProvodkaLine[];
}

export function calculatePayrollUz(params: {
  amount: number;
  direction: "gross_to_net" | "net_to_gross";
  taxYear?: number | string;
  effectiveDate?: string;
}): PayrollCalculationResult {
  const rules = resolveUzTaxRules(params?.effectiveDate ?? params?.taxYear);
  const rawAmount = Number.isFinite(params?.amount) ? params.amount : 0;
  const input = Math.max(0, roundMoney(rawAmount));
  const netRatio = 1 - rules.jshdsRate;
  const gross =
    params.direction === "net_to_gross"
      ? roundMoney(input / netRatio)
      : input;
  const net =
    params.direction === "net_to_gross"
      ? input
      : roundMoney(gross - roundMoney(gross * rules.jshdsRate));

  const jshds12 = roundMoney(gross - net);
  const inps01 = roundMoney(gross * rules.inpsRate);
  const jshdsBudget = roundMoney(Math.max(0, jshds12 - inps01));
  const socialTax12 = roundMoney(gross * rules.socialTaxRate);
  const totalEmployerCost = roundMoney(gross + socialTax12);
  const jshdsPct = roundMoney(rules.jshdsRate * 100);
  const inpsPct = roundMoney(rules.inpsRate * 100);
  const socialPct = roundMoney(rules.socialTaxRate * 100);

  return {
    gross,
    net,
    jshds12,
    inps01,
    jshdsBudget,
    socialTax12,
    totalEmployerCost,
    taxRuleVersion: rules.versionId,
    effectiveYear: rules.effectiveYear,
    lastVerifiedAt: rules.lastVerifiedAt,
    taxArticleRef: rules.articles.payroll,
    lexUrl: rules.sourceUrl,
    provodka: [
      { debitCode: "9420", creditCode: "6710", amount: gross, description: "Ish haqi hisoblandi (Brutto)" },
      { debitCode: "6710", creditCode: "6410", amount: jshds12, description: `JShDS ${jshdsPct}% ushlandi (${inpsPct}% ShJBPH ichida)` },
      { debitCode: "9420", creditCode: "6520", amount: socialTax12, description: `Ijtimoiy soliq ${socialPct}% (ish beruvchi)` },
      { debitCode: "6710", creditCode: "5110", amount: net, description: "Xodim kartasiga toʻlandi (Netto)" },
    ],
  };
}

export interface VatCalculationResult {
  net: number;
  vat12: number;
  total: number;
  vatRatePercent: number;
  vatMandatoryThresholdUzs: number;
  vatMandatoryThresholdBhm: number | null;
  bhmUzs: number;
  taxRuleVersion: string;
  effectiveYear: number;
  lastVerifiedAt: string;
  taxArticleRef: string;
  lexUrl: string;
  saleProvodka: ProvodkaLine[];
  purchaseProvodka: ProvodkaLine[];
}

export function calculateVatUz(params: {
  amount: number;
  mode: "included" | "excluded";
  taxYear?: number | string;
  effectiveDate?: string;
}): VatCalculationResult {
  const rules = resolveUzTaxRules(params?.effectiveDate ?? params?.taxYear);
  const vatPct = Math.round(rules.vatRate * 100);
  const rawAmount = Number.isFinite(params?.amount) ? params.amount : 0;
  const input = Math.max(0, roundMoney(rawAmount));
  let net: number;
  let vat12: number;
  let total: number;

  if (params.mode === "included") {
    total = input;
    vat12 = roundMoney((total * vatPct) / (100 + vatPct));
    net = roundMoney(total - vat12);
  } else {
    net = input;
    vat12 = roundMoney(net * rules.vatRate);
    total = roundMoney(net + vat12);
  }

  return {
    net,
    vat12,
    total,
    vatRatePercent: vatPct,
    vatMandatoryThresholdUzs: rules.vatMandatoryThresholdUzs,
    vatMandatoryThresholdBhm: rules.vatMandatoryThresholdBhm,
    bhmUzs: rules.bhmUzs,
    taxRuleVersion: rules.versionId,
    effectiveYear: rules.effectiveYear,
    lastVerifiedAt: rules.lastVerifiedAt,
    taxArticleRef: rules.articles.vat,
    lexUrl: rules.sourceUrl,
    saleProvodka: [
      { debitCode: "4010", creditCode: "9030", amount: net, description: "Sotuv daromadi (QQSsiz)" },
      { debitCode: "4010", creditCode: "6410", amount: vat12, description: `Chiquvchi QQS ${vatPct}% budjetga` },
    ],
    purchaseProvodka: [
      { debitCode: "6010", creditCode: "5110", amount: total, description: "Yetkazib beruvchiga jami toʻlov" },
      { debitCode: "4410", creditCode: "6010", amount: vat12, description: `Kiruvchi QQS ${vatPct}% hisobga (zachyot)` },
    ],
  };
}

export interface TurnoverTaxCalculationResult {
  revenue: number;
  taxpayerStatus: TaxpayerStatus;
  ratePercent: number;
  tax: number;
  netAfterTax: number;
  annualThresholdUzs: number | null;
  annualThresholdBhm: number | null;
  exceedsThreshold: boolean;
  thresholdUsagePercent: number | null;
  taxRuleVersion: string;
  effectiveYear: number;
  lastVerifiedAt: string | null;
  verificationStatus: TaxRuleVerificationStatus;
  ruleNote?: string;
  taxArticleRef: string;
  lexUrl: string;
  provodka: ProvodkaLine[];
}

export function calculateTurnoverTaxUz(params: {
  revenue: number;
  taxpayerStatus?: TaxpayerStatus;
  ratePercent?: number;
  category?: keyof UzTaxRulesVersion["turnoverRates"];
  taxYear?: number | string;
  effectiveDate?: string;
}): TurnoverTaxCalculationResult {
  const rules = resolveUzTaxRules(params?.effectiveDate ?? params?.taxYear);
  const status: TaxpayerStatus = params?.taxpayerStatus ?? "llc";
  const statusRule = rules.statusRules[status]?.turnover ?? rules.statusRules.llc.turnover;
  const rawRevenue = Number.isFinite(params?.revenue) ? params.revenue : 0;
  const revenue = Math.max(0, roundMoney(rawRevenue));

  const categoryRatePct =
    status === "llc" && params?.category && params.category in rules.turnoverRates
      ? roundMoney(rules.turnoverRates[params.category] * 100)
      : statusRule.ratePercent;

  const rate = Number.isFinite(params?.ratePercent) ? params.ratePercent! : categoryRatePct;
  const tax = roundMoney(revenue * (rate / 100));
  const netAfterTax = roundMoney(revenue - tax);

  const thresholdUzs = statusRule.annualThresholdUzs;
  const exceedsThreshold = thresholdUzs !== null && revenue > thresholdUzs;
  const thresholdUsagePercent =
    thresholdUzs !== null && thresholdUzs > 0
      ? roundMoney((revenue / thresholdUzs) * 100)
      : null;

  return {
    revenue,
    taxpayerStatus: status,
    ratePercent: rate,
    tax,
    netAfterTax,
    annualThresholdUzs: thresholdUzs,
    annualThresholdBhm: statusRule.annualThresholdBhm,
    exceedsThreshold,
    thresholdUsagePercent,
    taxRuleVersion: rules.versionId,
    effectiveYear: rules.effectiveYear,
    lastVerifiedAt: statusRule.lastVerifiedAt,
    verificationStatus: statusRule.verificationStatus,
    ruleNote: statusRule.note,
    taxArticleRef: statusRule.legalRef,
    lexUrl: statusRule.sourceUrl,
    provodka: [
      { debitCode: "9430", creditCode: "6410", amount: tax, description: `Aylanmadan soliq (${rate}%) hisoblandi` },
      { debitCode: "6410", creditCode: "5110", amount: tax, description: "Budjetga toʻlandi" },
    ],
  };
}

export interface CorporateTaxCalculationResult {
  taxableProfit: number;
  ratePercent: number;
  tax: number;
  netProfitAfterTax: number;
  taxRuleVersion: string;
  effectiveYear: number;
  lastVerifiedAt: string;
  taxArticleRef: string;
  lexUrl: string;
  provodka: ProvodkaLine[];
}

export function calculateCorporateTaxUz(params: {
  taxableProfit: number;
  ratePercent?: number;
  taxYear?: number | string;
  effectiveDate?: string;
}): CorporateTaxCalculationResult {
  const rules = resolveUzTaxRules(params?.effectiveDate ?? params?.taxYear);
  const rawProfit = Number.isFinite(params?.taxableProfit) ? params.taxableProfit : 0;
  const taxableProfit = Math.max(0, roundMoney(rawProfit));
  const defaultRate = roundMoney(rules.corporateTaxRate * 100);
  const rate = Number.isFinite(params?.ratePercent) ? params.ratePercent! : defaultRate;
  const tax = roundMoney(taxableProfit * (rate / 100));
  const netProfitAfterTax = roundMoney(taxableProfit - tax);

  return {
    taxableProfit,
    ratePercent: rate,
    tax,
    netProfitAfterTax,
    taxRuleVersion: rules.versionId,
    effectiveYear: rules.effectiveYear,
    lastVerifiedAt: rules.lastVerifiedAt,
    taxArticleRef: rules.articles.corporate,
    lexUrl: rules.sourceUrl,
    provodka: [
      { debitCode: "9810", creditCode: "6810", amount: tax, description: `Foyda soligʻi (${rate}%) hisoblandi` },
      { debitCode: "6810", creditCode: "5110", amount: tax, description: "Budjetga foyda soligʻi toʻlandi" },
    ],
  };
}

export interface DividendTaxCalculationResult {
  grossDividend: number;
  ratePercent: number;
  tax: number;
  netDividend: number;
  isNonResident: boolean;
  taxRuleVersion: string;
  effectiveYear: number;
  lastVerifiedAt: string;
  taxArticleRef: string;
  lexUrl: string;
  provodka: ProvodkaLine[];
}

export function calculateDividendTaxUz(params: {
  grossDividend: number;
  isNonResident?: boolean;
  taxYear?: number | string;
  effectiveDate?: string;
}): DividendTaxCalculationResult {
  const rules = resolveUzTaxRules(params?.effectiveDate ?? params?.taxYear);
  const rawDiv = Number.isFinite(params?.grossDividend) ? params.grossDividend : 0;
  const grossDividend = Math.max(0, roundMoney(rawDiv));
  const isNonResident = Boolean(params?.isNonResident);
  const ratePercent = roundMoney(
    (isNonResident ? rules.dividendNonResidentRate : rules.dividendResidentRate) * 100
  );
  const tax = roundMoney(grossDividend * (ratePercent / 100));
  const netDividend = roundMoney(grossDividend - tax);

  return {
    grossDividend,
    ratePercent,
    tax,
    netDividend,
    isNonResident,
    taxRuleVersion: rules.versionId,
    effectiveYear: rules.effectiveYear,
    lastVerifiedAt: rules.lastVerifiedAt,
    taxArticleRef: isNonResident
      ? rules.articles.dividendNonResident
      : rules.articles.dividendResident,
    lexUrl: rules.sourceUrl,
    provodka: [
      { debitCode: "8710", creditCode: "6610", amount: grossDividend, description: "Taʼsischilarga dividend hisoblandi" },
      { debitCode: "6610", creditCode: "6410", amount: tax, description: `Dividenddan soliq (${ratePercent}%) ushlandi` },
      { debitCode: "6610", creditCode: "5110", amount: netDividend, description: "Taʼsischiga dividend toʻlandi" },
    ],
  };
}

export function calculateVacationPayUz(params: {
  monthlySalary: number;
  days?: number;
  taxYear?: number | string;
  effectiveDate?: string;
}) {
  const rules = resolveUzTaxRules(params?.effectiveDate ?? params?.taxYear);
  const salaryRaw = Number.isFinite(params?.monthlySalary) ? params.monthlySalary : 0;
  const monthlySalary = Math.max(0, roundMoney(salaryRaw));
  const days = Number.isFinite(params?.days)
    ? Math.max(1, Math.min(60, Math.round(params.days!)))
    : 21;
  const dailyRate = roundMoney(monthlySalary / 25.4);
  const grossVacation = roundMoney((monthlySalary / 25.4) * days);
  const jshds12 = roundMoney(grossVacation * rules.jshdsRate);
  const netVacation = roundMoney(grossVacation - jshds12);
  const socialTax12 = roundMoney(grossVacation * rules.socialTaxRate);

  return {
    monthlySalary,
    days,
    dailyRate,
    grossVacation,
    jshds12,
    netVacation,
    socialTax12,
    taxRuleVersion: rules.versionId,
    effectiveYear: rules.effectiveYear,
    lastVerifiedAt: rules.lastVerifiedAt,
    note: "Mehnat kodeksi boʻyicha oʻrtacha oylik ish kunlari koeffitsiyenti: 25.4 kun",
  };
}
