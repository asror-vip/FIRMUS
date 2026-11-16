import { roundMoney } from "@/lib/utils/finance";

export const LEX_UZ_TAX_CODE_URL = "https://lex.uz/docs/4674902";
export const LEX_UZ_BHMS21_URL = "https://lex.uz/docs/-7315183";

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
  taxArticleRef: string;
  lexUrl: string;
  provodka: ProvodkaLine[];
}

export function calculatePayrollUz(params: {
  amount: number;
  direction: "gross_to_net" | "net_to_gross";
}): PayrollCalculationResult {
  const input = Math.max(0, roundMoney(params.amount));
  const gross =
    params.direction === "net_to_gross"
      ? roundMoney(input / 0.88)
      : input;
  const net =
    params.direction === "net_to_gross"
      ? input
      : roundMoney(gross - roundMoney(gross * 0.12));

  const jshds12 = roundMoney(gross - net);
  const inps01 = roundMoney(gross * 0.001);
  const jshdsBudget = roundMoney(Math.max(0, jshds12 - inps01));
  const socialTax12 = roundMoney(gross * 0.12);
  const totalEmployerCost = roundMoney(gross + socialTax12);

  return {
    gross,
    net,
    jshds12,
    inps01,
    jshdsBudget,
    socialTax12,
    totalEmployerCost,
    taxArticleRef: "Soliq kodeksi 381-modda (JShDS 12%) va 405-modda (Ijtimoiy soliq 12%)",
    lexUrl: LEX_UZ_TAX_CODE_URL,
    provodka: [
      { debitCode: "9420", creditCode: "6710", amount: gross, description: "Ish haqi hisoblandi (Brutto)" },
      { debitCode: "6710", creditCode: "6410", amount: jshds12, description: "JShDS 12% ushlandi (0.1% ShJBPH ichida)" },
      { debitCode: "9420", creditCode: "6520", amount: socialTax12, description: "Ijtimoiy soliq 12% (ish beruvchi)" },
      { debitCode: "6710", creditCode: "5110", amount: net, description: "Xodim kartasiga toʻlandi (Netto)" },
    ],
  };
}

export interface VatCalculationResult {
  net: number;
  vat12: number;
  total: number;
  taxArticleRef: string;
  lexUrl: string;
  saleProvodka: ProvodkaLine[];
  purchaseProvodka: ProvodkaLine[];
}

export function calculateVatUz(params: {
  amount: number;
  mode: "included" | "excluded";
}): VatCalculationResult {
  const input = Math.max(0, roundMoney(params.amount));
  let net: number;
  let vat12: number;
  let total: number;

  if (params.mode === "included") {
    total = input;
    vat12 = roundMoney((total * 12) / 112);
    net = roundMoney(total - vat12);
  } else {
    net = input;
    vat12 = roundMoney(net * 0.12);
    total = roundMoney(net + vat12);
  }

  return {
    net,
    vat12,
    total,
    taxArticleRef: "Soliq kodeksi 258-modda (QQS stavkasi 12%)",
    lexUrl: LEX_UZ_TAX_CODE_URL,
    saleProvodka: [
      { debitCode: "4010", creditCode: "9030", amount: net, description: "Sotuv daromadi (QQSsiz)" },
      { debitCode: "4010", creditCode: "6410", amount: vat12, description: "Chiquvchi QQS 12% budjetga" },
    ],
    purchaseProvodka: [
      { debitCode: "6010", creditCode: "5110", amount: total, description: "Yetkazib beruvchiga jami toʻlov" },
      { debitCode: "4410", creditCode: "6010", amount: vat12, description: "Kiruvchi QQS 12% hisobga (zachyot)" },
    ],
  };
}

export function calculateTurnoverTaxUz(params: {
  revenue: number;
  ratePercent?: number;
}) {
  const revenue = Math.max(0, roundMoney(params.revenue));
  const rate = params.ratePercent ?? 4;
  const tax = roundMoney(revenue * (rate / 100));
  const netAfterTax = roundMoney(revenue - tax);
  return {
    revenue,
    ratePercent: rate,
    tax,
    netAfterTax,
    taxArticleRef: "Soliq kodeksi 467-modda (Aylanmadan olinadigan soliq 4%)",
    lexUrl: LEX_UZ_TAX_CODE_URL,
    provodka: [
      { debitCode: "9430", creditCode: "6410", amount: tax, description: `Aylanmadan soliq (${rate}%) hisoblandi` },
      { debitCode: "6410", creditCode: "5110", amount: tax, description: "Budjetga toʻlandi" },
    ],
  };
}

export function calculateVacationPayUz(params: {
  monthlySalary: number;
  days: number;
}) {
  const monthlySalary = Math.max(0, roundMoney(params.monthlySalary));
  const days = Math.max(1, Math.min(60, Math.round(params.days || 21)));
  const dailyRate = roundMoney(monthlySalary / 25.4);
  const grossVacation = roundMoney(dailyRate * days);
  const jshds12 = roundMoney(grossVacation * 0.12);
  const netVacation = roundMoney(grossVacation - jshds12);
  const socialTax12 = roundMoney(grossVacation * 0.12);

  return {
    monthlySalary,
    days,
    dailyRate,
    grossVacation,
    jshds12,
    netVacation,
    socialTax12,
    note: "Mehnat kodeksi boʻyicha oʻrtacha oylik ish kunlari koeffitsiyenti: 25.4 kun",
  };
}
