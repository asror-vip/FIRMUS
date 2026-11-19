import { roundMoney } from "@/lib/utils/finance";
import {
  calculateTurnoverTaxUz,
  calculateVatUz,
  resolveUzTaxRules,
  type TaxpayerStatus,
  type TaxRegimeType,
} from "@/lib/services/uz-tax-calculator";
import type { ParsedBankTransaction } from "@/lib/services/bank-import";

export const TAX_ESTIMATE_DISCLAIMER =
  "Taxminiy hisob. Yakuniy qarorni buxgalter tasdiqlaydi.";

export type TaxDocumentSourceKind = "bank" | "didox" | "onec";

export type TaxRowCategory =
  | "taxable_revenue"
  | "non_revenue_credit"
  | "non_revenue_own_transfer"
  | "non_revenue_refund"
  | "non_revenue_loan"
  | "expense"
  | "ambiguous";

export type ClassificationSource = "rule_code" | "ai_estimate" | "accountant";

export interface TaxSourceRow {
  id: string;
  sourceType: TaxDocumentSourceKind;
  fileName: string;
  rowIndex: number;
  date: string;
  counterparty: string;
  counterpartyStir?: string;
  description: string;
  amount: number;
  direction: "income" | "expense";
  category: TaxRowCategory;
  includeInTurnover: boolean;
  needsConfirmation: boolean;
  confirmedByAccountant: boolean;
  classificationSource: ClassificationSource;
  reason: string;
  aiNote?: string;
}

export interface ClientTaxProfileInput {
  taxpayerStatus: TaxpayerStatus;
  taxRegime: TaxRegimeType;
  isVatPayer: boolean;
  entityStir?: string;
}

export type ThresholdAlertLevel = "safe" | "warning" | "critical" | "exceeded" | "none";

export interface PeriodTaxCalculationSummary {
  periodTurnoverUzs: number;
  priorYtdTurnoverUzs: number;
  cumulativeYtdTurnoverUzs: number;
  excludedNonRevenueUzs: number;
  expenseTotalUzs: number;
  estimatedTaxUzs: number;
  estimatedVatUzs: number;
  appliedRatePercent: number;
  taxLabel: string;
  taxRuleVersion: string;
  taxArticleRef: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  annualThresholdUzs: number | null;
  annualThresholdBhm: number | null;
  remainingToThresholdUzs: number | null;
  thresholdUsagePercent: number | null;
  thresholdAlertLevel: ThresholdAlertLevel;
  thresholdWarningText: string | null;
  unconfirmedCount: number;
  ambiguousCount: number;
  disclaimer: string;
  trace: {
    includedRevenueRowIds: string[];
    excludedNonRevenueRowIds: string[];
    unconfirmedRowIds: string[];
    ambiguousRowIds: string[];
  };
}

const OWN_TRANSFER_REGEX =
  /(o['ʻ’`]?z\s+hisob|hisobdan\s+hisobga|o['ʻ’`]?z\s+schyot|между\s+своими|переброск|пополнени[ея]\s+(счет|счёт|касс)|своего\s+(счет|счёт)|konvertatsiy|конвертац|own\s+transfer|internal\s+transfer)/i;

const BANK_CREDIT_REGEX =
  /(kredit|кредит|mikrokredit|микрокредит|transh|транш|ssuda|ссуд|overdraft|овердрафт|lizing|лизинг|bank\s+loan)/i;

const LOAN_FOUNDER_REGEX =
  /(qarz|заем|займ|заём|moliyaviy\s+yordam|финансов\w*\s+помощ|ustav\s+fond|уставн\w*\s+(фонд|капитал)|ta['ʻ’`]?sischi\s+ulush|взнос\s+учредител|loan\s+received)/i;

const REFUND_REGEX =
  /(qaytar|возврат|vozvrat|otmena|отмен|bekor\s+qil|refund|ortiqcha\s+to['ʻ’`]?lov|излишне\s+уплач|chargeback)/i;

const CLEAR_REVENUE_REGEX =
  /(shartnoma|договор|faktura|фактур|tovar|товар|xizmat|услуг|savdo|выручк|terminal|терминал|humo|uzcard|payme|click|avans|аванс|to['ʻ’`]?lov|оплат|realizatsiy|реализац|sotuv|продаж|invoice|payment)/i;

function normalizeStir(stir?: string | null): string {
  return String(stir || "").replace(/\D/g, "");
}

export function isNonRevenueCategory(category: TaxRowCategory): boolean {
  return (
    category === "non_revenue_credit" ||
    category === "non_revenue_own_transfer" ||
    category === "non_revenue_refund" ||
    category === "non_revenue_loan"
  );
}

export function classifyRowDeterministic(params: {
  item: ParsedBankTransaction;
  sourceType: TaxDocumentSourceKind;
  fileName: string;
  rowIndex: number;
  entityStir?: string;
}): TaxSourceRow {
  const { item, sourceType, fileName, rowIndex, entityStir } = params;
  const amount = Math.max(0, roundMoney(Number(item.amount || 0)));
  const combinedText = `${item.counterparty || ""} ${item.description || ""}`.trim();
  const id = `${sourceType}-${rowIndex}-${item.date}-${Math.round(amount)}`;

  if (item.type === "expense") {
    return {
      id,
      sourceType,
      fileName,
      rowIndex,
      date: item.date,
      counterparty: item.counterparty || "Nomaʼlum",
      counterpartyStir: item.counterpartyStir,
      description: item.description || "",
      amount,
      direction: "expense",
      category: "expense",
      includeInTurnover: false,
      needsConfirmation: false,
      confirmedByAccountant: true,
      classificationSource: "rule_code",
      reason: "Chiqim operatsiyasi (aylanma daromadiga kirmaydi)",
    };
  }

  // Incoming row — check strict non-revenue exclusions first!
  const ownStirClean = normalizeStir(entityStir);
  const cpStirClean = normalizeStir(item.counterpartyStir);

  if (
    (ownStirClean.length === 9 && cpStirClean === ownStirClean) ||
    OWN_TRANSFER_REGEX.test(combinedText)
  ) {
    return {
      id,
      sourceType,
      fileName,
      rowIndex,
      date: item.date,
      counterparty: item.counterparty || "Oʻz hisobi",
      counterpartyStir: item.counterpartyStir,
      description: item.description || "",
      amount,
      direction: "income",
      category: "non_revenue_own_transfer",
      includeInTurnover: false,
      needsConfirmation: true,
      confirmedByAccountant: false,
      classificationSource: "rule_code",
      reason:
        ownStirClean.length === 9 && cpStirClean === ownStirClean
          ? "Oʻz STIR raqamingizdan oʻtkazma — daromad emas (tasdiqlang)"
          : "Oʻz hisoblari orasidagi oʻtkazma — daromad emas (tasdiqlang)",
    };
  }

  if (BANK_CREDIT_REGEX.test(combinedText)) {
    return {
      id,
      sourceType,
      fileName,
      rowIndex,
      date: item.date,
      counterparty: item.counterparty || "Bank",
      counterpartyStir: item.counterpartyStir,
      description: item.description || "",
      amount,
      direction: "income",
      category: "non_revenue_credit",
      includeInTurnover: false,
      needsConfirmation: true,
      confirmedByAccountant: false,
      classificationSource: "rule_code",
      reason: "Bank krediti / ssuda — daromad emas (tasdiqlang)",
    };
  }

  if (REFUND_REGEX.test(combinedText)) {
    return {
      id,
      sourceType,
      fileName,
      rowIndex,
      date: item.date,
      counterparty: item.counterparty || "Kontragent",
      counterpartyStir: item.counterpartyStir,
      description: item.description || "",
      amount,
      direction: "income",
      category: "non_revenue_refund",
      includeInTurnover: false,
      needsConfirmation: true,
      confirmedByAccountant: false,
      classificationSource: "rule_code",
      reason: "Qaytarilgan pul (vozvrat) — daromad emas (tasdiqlang)",
    };
  }

  if (LOAN_FOUNDER_REGEX.test(combinedText)) {
    return {
      id,
      sourceType,
      fileName,
      rowIndex,
      date: item.date,
      counterparty: item.counterparty || "Kontragent",
      counterpartyStir: item.counterpartyStir,
      description: item.description || "",
      amount,
      direction: "income",
      category: "non_revenue_loan",
      includeInTurnover: false,
      needsConfirmation: true,
      confirmedByAccountant: false,
      classificationSource: "rule_code",
      reason: "Qarz / moliyaviy yordam / ustav ulushi — daromad emas (tasdiqlang)",
    };
  }

  // Didox invoices & clearly described commercial receipts -> taxable revenue
  if (sourceType === "didox" || CLEAR_REVENUE_REGEX.test(combinedText)) {
    return {
      id,
      sourceType,
      fileName,
      rowIndex,
      date: item.date,
      counterparty: item.counterparty || "Xaridor",
      counterpartyStir: item.counterpartyStir,
      description: item.description || "",
      amount,
      direction: "income",
      category: "taxable_revenue",
      includeInTurnover: true,
      needsConfirmation: false,
      confirmedByAccountant: false,
      classificationSource: "rule_code",
      reason:
        sourceType === "didox"
          ? "Didox hisob-fakturasi boʻyicha tushum (aylanmaga kiritildi)"
          : "Tovar/xizmat sotuvidan tushum (aylanmaga kiritildi)",
    };
  }

  // Unclear description -> flag as ambiguous for accountant review (and optional AI hint)
  return {
    id,
    sourceType,
    fileName,
    rowIndex,
    date: item.date,
    counterparty: item.counterparty || "Nomaʼlum",
    counterpartyStir: item.counterpartyStir,
    description: item.description || "",
    amount,
    direction: "income",
    category: "ambiguous",
    includeInTurnover: true,
    needsConfirmation: true,
    confirmedByAccountant: false,
    classificationSource: "rule_code",
    reason: "Tavsif noaniq — buxgalter tekshirib tasdiqlashi kerak",
  };
}

export function extractTaxSourceRows(params: {
  items: ParsedBankTransaction[];
  sourceType: TaxDocumentSourceKind;
  fileName: string;
  entityStir?: string;
}): TaxSourceRow[] {
  return params.items.map((item, idx) =>
    classifyRowDeterministic({
      item,
      sourceType: params.sourceType,
      fileName: params.fileName,
      rowIndex: idx + 1,
      entityStir: params.entityStir,
    })
  );
}

/**
 * Pure manual update helper when accountant overrides a row's category or confirms it.
 */
export function applyAccountantRowOverride(
  row: TaxSourceRow,
  nextCategory: TaxRowCategory,
  explicitInclude?: boolean
): TaxSourceRow {
  const defaultInclude = nextCategory === "taxable_revenue";
  return {
    ...row,
    category: nextCategory,
    includeInTurnover: explicitInclude !== undefined ? explicitInclude : defaultInclude,
    needsConfirmation: false,
    confirmedByAccountant: true,
    classificationSource: "accountant",
  };
}

/**
 * Computes period turnover, estimated tax, remaining threshold, and click-to-trace row IDs.
 * 100% deterministic code based on Stage 1 versioned rules (uz-tax-calculator.ts) — NEVER AI math!
 */
export function computePeriodTurnoverAndTax(params: {
  rows: TaxSourceRow[];
  profile: ClientTaxProfileInput;
  priorYtdTurnoverUzs?: number;
  effectiveDate?: string;
}): PeriodTaxCalculationSummary {
  const { rows, profile, effectiveDate } = params;
  const priorYtdTurnoverUzs = Math.max(0, roundMoney(Number(params.priorYtdTurnoverUzs || 0)));
  const rules = resolveUzTaxRules(effectiveDate);

  const includedRevenueRowIds: string[] = [];
  const excludedNonRevenueRowIds: string[] = [];
  const unconfirmedRowIds: string[] = [];
  const ambiguousRowIds: string[] = [];

  let periodTurnoverUzs = 0;
  let excludedNonRevenueUzs = 0;
  let expenseTotalUzs = 0;

  for (const r of rows) {
    if (r.needsConfirmation && !r.confirmedByAccountant) {
      unconfirmedRowIds.push(r.id);
    }
    if (r.category === "ambiguous") {
      ambiguousRowIds.push(r.id);
    }

    if (r.direction === "expense" && !r.includeInTurnover) {
      expenseTotalUzs = roundMoney(expenseTotalUzs + r.amount);
      continue;
    }

    if (r.includeInTurnover) {
      periodTurnoverUzs = roundMoney(periodTurnoverUzs + r.amount);
      includedRevenueRowIds.push(r.id);
    } else if (r.direction === "income") {
      excludedNonRevenueUzs = roundMoney(excludedNonRevenueUzs + r.amount);
      excludedNonRevenueRowIds.push(r.id);
    }
  }

  const cumulativeYtdTurnoverUzs = roundMoney(priorYtdTurnoverUzs + periodTurnoverUzs);

  const isVatRegime = profile.isVatPayer || profile.taxRegime === "vat_profit_tax";

  if (isVatRegime) {
    const vatCalc = calculateVatUz({
      amount: periodTurnoverUzs,
      mode: "included",
      effectiveDate,
    });
    return {
      periodTurnoverUzs,
      priorYtdTurnoverUzs,
      cumulativeYtdTurnoverUzs,
      excludedNonRevenueUzs,
      expenseTotalUzs,
      estimatedTaxUzs: vatCalc.vat12,
      estimatedVatUzs: vatCalc.vat12,
      appliedRatePercent: vatCalc.vatRatePercent,
      taxLabel: `Chiquvchi QQS (${vatCalc.vatRatePercent}%) — taxminiy (zachyotsiz)`,
      taxRuleVersion: vatCalc.taxRuleVersion,
      taxArticleRef: vatCalc.taxArticleRef,
      sourceUrl: vatCalc.lexUrl,
      lastVerifiedAt: vatCalc.lastVerifiedAt,
      annualThresholdUzs: null,
      annualThresholdBhm: null,
      remainingToThresholdUzs: null,
      thresholdUsagePercent: null,
      thresholdAlertLevel: "none",
      thresholdWarningText: null,
      unconfirmedCount: unconfirmedRowIds.length,
      ambiguousCount: ambiguousRowIds.length,
      disclaimer: TAX_ESTIMATE_DISCLAIMER,
      trace: {
        includedRevenueRowIds,
        excludedNonRevenueRowIds,
        unconfirmedRowIds,
        ambiguousRowIds,
      },
    };
  }

  // Turnover tax regime — compute tax on current period AND threshold usage on cumulative YTD!
  const periodTurn = calculateTurnoverTaxUz({
    revenue: periodTurnoverUzs,
    taxpayerStatus: profile.taxpayerStatus,
    effectiveDate,
  });

  const thresholdUzs = periodTurn.annualThresholdUzs;
  const thresholdBhm = periodTurn.annualThresholdBhm;
  const remainingToThresholdUzs =
    thresholdUzs !== null ? roundMoney(Math.max(0, thresholdUzs - cumulativeYtdTurnoverUzs)) : null;
  const thresholdUsagePercent =
    thresholdUzs !== null && thresholdUzs > 0
      ? roundMoney((cumulativeYtdTurnoverUzs / thresholdUzs) * 100)
      : null;

  let thresholdAlertLevel: ThresholdAlertLevel = "none";
  let thresholdWarningText: string | null = null;

  if (thresholdUsagePercent !== null && thresholdUzs !== null) {
    const roundedPct = Math.round(thresholdUsagePercent * 10) / 10;
    if (thresholdUsagePercent >= 100) {
      thresholdAlertLevel = "exceeded";
      thresholdWarningText = `Chegaradan oshdi (${roundedPct}%)! Yillik aylanma chegaradan oshgan — QQS va umumbelgilangan rejimga oʻtish talabini tekshiring.`;
    } else if (thresholdUsagePercent >= 90) {
      thresholdAlertLevel = "critical";
      thresholdWarningText = `Diqqat: yillik chegaraning ${roundedPct}% i toʻldi! Qolgan summa: ${(
        remainingToThresholdUzs ?? 0
      ).toLocaleString("en-US")} soʻm.`;
    } else if (thresholdUsagePercent >= 75) {
      thresholdAlertLevel = "warning";
      thresholdWarningText = `Ogohlantirish: yillik chegaraning ${roundedPct}% i ishlatildi.`;
    } else {
      thresholdAlertLevel = "safe";
    }
  }

  return {
    periodTurnoverUzs,
    priorYtdTurnoverUzs,
    cumulativeYtdTurnoverUzs,
    excludedNonRevenueUzs,
    expenseTotalUzs,
    estimatedTaxUzs: periodTurn.tax,
    estimatedVatUzs: 0,
    appliedRatePercent: periodTurn.ratePercent,
    taxLabel: `Aylanmadan olinadigan soliq (${periodTurn.ratePercent}%)`,
    taxRuleVersion: rules.versionId,
    taxArticleRef: periodTurn.taxArticleRef,
    sourceUrl: periodTurn.lexUrl,
    lastVerifiedAt: periodTurn.lastVerifiedAt,
    annualThresholdUzs: thresholdUzs,
    annualThresholdBhm: thresholdBhm,
    remainingToThresholdUzs,
    thresholdUsagePercent,
    thresholdAlertLevel,
    thresholdWarningText,
    unconfirmedCount: unconfirmedRowIds.length,
    ambiguousCount: ambiguousRowIds.length,
    disclaimer: TAX_ESTIMATE_DISCLAIMER,
    trace: {
      includedRevenueRowIds,
      excludedNonRevenueRowIds,
      unconfirmedRowIds,
      ambiguousRowIds,
    },
  };
}
