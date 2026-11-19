import type { Locale } from "@/lib/i18n/types";
import { getBillingHomeDict, getIntlLocale } from "@/lib/i18n/domains/billing-home";

export type PlanId = "starter" | "professional" | "pro_plus";

export type AiModelId = "gemini-3.8-flash" | "gemini-4-hydrogen";

export interface AiModelMeta {
  id: AiModelId;
  label: string;
  shortLabel: string;
  creditCost: number;
  description: string;
  fallbackChain: string[];
}

export const AI_MODELS: Record<AiModelId, AiModelMeta> = {
  "gemini-3.8-flash": {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    shortLabel: "3.8 Flash",
    creditCost: 1,
    description: "Tez va hamyonbop model (kundalik savollar va chek skan)",
    fallbackChain: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"],
  },
  "gemini-4-hydrogen": {
    id: "gemini-4-hydrogen",
    label: "Gemini 4 Hydrogen",
    shortLabel: "4 Hydrogen",
    creditCost: 2,
    description: "Chuqur soliq, 21-BHMS va shartnoma tahlili",
    // Backend uses the same free-tier Gemini Flash model chain while keeping UI label unchanged
    fallbackChain: ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"],
  },
};

export interface PlanLimits {
  monthlyCredits: number;
  dailyCredits: number;
  trialMonthlyCredits?: number;
  trialDailyCredits?: number;
  allowedModels: AiModelId[];
  defaultChatModel: AiModelId;
  defaultScanModel: AiModelId;
  imageMaxDimensionPx: number;
  imageMaxBytes: number;
  burstRequestsPerMin: number;
  pdfAllowed: boolean;
  pdfMaxBytes: number;
  pdfMaxPagesLabel: number;
  contractTextMaxChars: number;
  reconcileMaxFileBytes: number;
  reconcileMaxRows: number;
  maxSavedBatches: number;
  maxChatThreads: number;
  maxChatMessagesPerThread: number;
  entitiesLimit: number | null;
  membersLimit: number | null;
}

export interface PlanSpec {
  id: PlanId;
  name: string;
  subtitle: string;
  monthlyPriceUzs: number;
  annualMonthlyPriceUzs: number;
  annualTotalPriceUzs: number;
  regularAnnualTotalPriceUzs: number;
  badge?: string;
  trialDays?: number;
  limits: PlanLimits;
  soloFeatures: string[];
  b2bFeatures: string[];
}

export const PLANS_CONFIG: Record<PlanId, PlanSpec> = {
  starter: {
    id: "starter",
    name: "Starter",
    subtitle: "Asosiy vositalar va bepul boshlash uchun",
    monthlyPriceUzs: 0,
    annualMonthlyPriceUzs: 0,
    annualTotalPriceUzs: 0,
    regularAnnualTotalPriceUzs: 0,
    limits: {
      monthlyCredits: 25,
      dailyCredits: 6,
      allowedModels: ["gemini-3.8-flash"],
      defaultChatModel: "gemini-3.8-flash",
      defaultScanModel: "gemini-3.8-flash",
      imageMaxDimensionPx: 1280,
      imageMaxBytes: 1 * 1024 * 1024,
      burstRequestsPerMin: 4,
      pdfAllowed: false,
      pdfMaxBytes: 0,
      pdfMaxPagesLabel: 0,
      contractTextMaxChars: 10_000,
      reconcileMaxFileBytes: 3 * 1024 * 1024,
      reconcileMaxRows: 1000,
      maxSavedBatches: 15,
      maxChatThreads: 10,
      maxChatMessagesPerThread: 30,
      entitiesLimit: 1,
      membersLimit: 1,
    },
    soloFeatures: [
      "Kundalik soliq va buxgalteriya savollari uchun AI Chat (Gemini 3.8 Flash)",
      "Chek va faktura rasmlarini AI orqali tezkor oʻqish",
      "Bank ↔ 1C fayllarini solishtirish va 1C (.txt / .xml / CSV) ga eksport",
      "Maosh (JShDS 12%), QQS (12%), aylanma soliq va taʼtil kalkulyatorlari",
      "Shartnoma matnidagi xavf va kamchiliklarni tezkor tekshirish",
      "Soʻnggi saqlangan ishlar va suhbatlar tarixiga kirish",
    ],
    b2bFeatures: [
      "1 ta korxona (STIR) bilan asosiy ishlar",
      "Gemini 3.8 Flash modeli",
      "Bank ↔ 1C solishtirish va 1C eksport",
      "Soliq va maosh kalkulyatorlari",
    ],
  },
  professional: {
    id: "professional",
    name: "Pro",
    subtitle: "Faol buxgalterlar va chuqur tahlil uchun",
    monthlyPriceUzs: 99_000,
    annualMonthlyPriceUzs: 79_000,
    annualTotalPriceUzs: 948_000,
    regularAnnualTotalPriceUzs: 1_188_000,
    badge: "Tavsiya etiladi",
    trialDays: 7,
    limits: {
      monthlyCredits: 350,
      dailyCredits: 45,
      trialMonthlyCredits: 40,
      trialDailyCredits: 15,
      allowedModels: ["gemini-3.8-flash", "gemini-4-hydrogen"],
      defaultChatModel: "gemini-4-hydrogen",
      defaultScanModel: "gemini-3.8-flash",
      imageMaxDimensionPx: 1600,
      imageMaxBytes: Math.round(1.5 * 1024 * 1024),
      burstRequestsPerMin: 8,
      pdfAllowed: true,
      pdfMaxBytes: 4 * 1024 * 1024,
      pdfMaxPagesLabel: 10,
      contractTextMaxChars: 25_000,
      reconcileMaxFileBytes: 10 * 1024 * 1024,
      reconcileMaxRows: 3000,
      maxSavedBatches: 150,
      maxChatThreads: 80,
      maxChatMessagesPerThread: 60,
      entitiesLimit: 5,
      membersLimit: 5,
    },
    soloFeatures: [
      "Starter dagi barcha vositalar — kengaytirilgan oylik hajmda",
      "7 kunlik bepul sinov imkoniyati",
      "Gemini 4 Hydrogen — murakkab soliq va 21-BHMS provodkalari uchun kuchli model",
      "PDF formatidagi faktura, TTN va shartnomalarni toʻgʻridan-toʻgʻri yuklash",
      "Kengaytirilgan Bank ↔ 1C solishtirish va katta jadvallar bilan ishlash",
      "Oylar kesimida toʻliq arxiv va saqlangan AI suhbatlar tarixi",
    ],
    b2bFeatures: [
      "5 tagacha korxona (STIR) va jamoaviy kirish",
      "Gemini 4 Hydrogen va Gemini 3.8 Flash modellari",
      "PDF faktura va shartnomalar ekspertizasi",
      "Kengaytirilgan arxiv va hisobotlar",
    ],
  },
  pro_plus: {
    id: "pro_plus",
    name: "Pro+",
    subtitle: "Katta hajm, maksimal quvvat va ustuvor yordam",
    monthlyPriceUzs: 249_000,
    annualMonthlyPriceUzs: 199_000,
    annualTotalPriceUzs: 2_388_000,
    regularAnnualTotalPriceUzs: 2_988_000,
    limits: {
      monthlyCredits: 1000,
      dailyCredits: 120,
      allowedModels: ["gemini-3.8-flash", "gemini-4-hydrogen"],
      defaultChatModel: "gemini-4-hydrogen",
      defaultScanModel: "gemini-3.8-flash",
      imageMaxDimensionPx: 1600,
      imageMaxBytes: 2 * 1024 * 1024,
      burstRequestsPerMin: 12,
      pdfAllowed: true,
      pdfMaxBytes: 6 * 1024 * 1024,
      pdfMaxPagesLabel: 25,
      contractTextMaxChars: 30_000,
      reconcileMaxFileBytes: 15 * 1024 * 1024,
      reconcileMaxRows: 5000,
      maxSavedBatches: 1000,
      maxChatThreads: 300,
      maxChatMessagesPerThread: 60,
      entitiesLimit: null,
      membersLimit: null,
    },
    soloFeatures: [
      "Pro tarifidagi barcha imkoniyatlar — eng yuqori oylik AI quvvati bilan",
      "Gemini 4 Hydrogen va Gemini 3.8 Flash modellariga ustuvor tezkor ulanish",
      "Koʻp sahifali yirik PDF shartnomalar va hujjatlar paketini tahlil qilish",
      "Eng katta Bank ↔ 1C fayllarni yuklash va uzoq muddatli toʻliq tarix arxivi",
      "Yangi B2B va 1C avtomatlashtirish vositalariga birinchi navbatda kirish",
      "Ustuvor texnik qoʻllab-quvvatlash",
    ],
    b2bFeatures: [
      "Cheksiz korxonalar va kengaytirilgan jamoa rollari",
      "Eng yuqori AI quvvati va ustuvor tezkor navbat",
      "Koʻp sahifali PDF hujjatlar tahlili",
      "Ustuvor texnik qoʻllab-quvvatlash",
    ],
  },
};

export const PLANS_LIST: PlanSpec[] = [
  PLANS_CONFIG.starter,
  PLANS_CONFIG.professional,
  PLANS_CONFIG.pro_plus,
];

export function normalizePlanId(raw?: string | null): PlanId {
  if (raw === "professional") return "professional";
  if (raw === "pro_plus" || raw === "enterprise") return "pro_plus";
  return "starter";
}

export function normalizeModelId(raw?: string | null): AiModelId {
  if (raw === "gemini-4-hydrogen") return "gemini-4-hydrogen";
  return "gemini-3.8-flash";
}

export function getModelCreditCost(modelId: AiModelId): number {
  return AI_MODELS[modelId]?.creditCost ?? 1;
}

export interface SubscriptionSnapshot {
  planId: PlanId;
  planName: string;
  status: "active" | "trialing" | "expired" | "cancelled";
  isTrialActive: boolean;
  trialAvailable: boolean;
  trialEndsAt: string | null;
  expiresAt: string | null;
  preferredModel: AiModelId;
  monthlyUsed: number;
  monthlyLimit: number;
  dailyUsed: number;
  dailyLimit: number;
  bonusCredits: number;
  remainingCredits: number;
  annualDiscountUsed: boolean;
  limits: PlanLimits;
}

export const DEFAULT_STARTER_SNAPSHOT: SubscriptionSnapshot = {
  planId: "starter",
  planName: PLANS_CONFIG.starter.name,
  status: "active",
  isTrialActive: false,
  trialAvailable: true,
  trialEndsAt: null,
  expiresAt: null,
  preferredModel: "gemini-3.8-flash",
  monthlyUsed: 0,
  monthlyLimit: PLANS_CONFIG.starter.limits.monthlyCredits,
  dailyUsed: 0,
  dailyLimit: PLANS_CONFIG.starter.limits.dailyCredits,
  bonusCredits: 0,
  remainingCredits: PLANS_CONFIG.starter.limits.monthlyCredits,
  annualDiscountUsed: false,
  limits: PLANS_CONFIG.starter.limits,
};

export function getAnnualPricingForUser(
  planId: PlanId,
  annualDiscountUsed: boolean
): {
  totalUzs: number;
  monthlyEquivalentUzs: number;
  savedUzs: number;
  isDiscounted: boolean;
} {
  const spec = PLANS_CONFIG[planId];
  if (planId === "starter" || !spec) {
    return {
      totalUzs: 0,
      monthlyEquivalentUzs: 0,
      savedUzs: 0,
      isDiscounted: false,
    };
  }

  if (!annualDiscountUsed) {
    return {
      totalUzs: spec.annualTotalPriceUzs,
      monthlyEquivalentUzs: spec.annualMonthlyPriceUzs,
      savedUzs: spec.regularAnnualTotalPriceUzs - spec.annualTotalPriceUzs,
      isDiscounted: true,
    };
  }

  return {
    totalUzs: spec.regularAnnualTotalPriceUzs,
    monthlyEquivalentUzs: spec.monthlyPriceUzs,
    savedUzs: 0,
    isDiscounted: false,
  };
}

export type PaymentMethodId = "bank_transfer_didox" | "payme" | "click";

export interface PaymentMethodMeta {
  id: PaymentMethodId;
  label: string;
  commissionLabel: string;
  badge: string;
  description: string;
}

export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  {
    id: "bank_transfer_didox",
    label: "Bank oʻtkazmasi / Hisob-faktura (B2B)",
    commissionLabel: "0% komissiya",
    badge: "Eng foydali (0%)",
    description:
      "MChJ va YaTTlar uchun STIR orqali toʻlov shartnomasi / hisob-faktura (Didox E-SF). Bank komissiyasi 0%.",
  },
  {
    id: "payme",
    label: "Payme (Uzcard / Humo)",
    commissionLabel: "~1% shlyuz komissiyasi (qoʻshimcha ustamasiz)",
    badge: "Tezkor avto-faollashtirish",
    description:
      "Uzcard va Humo kartalari orqali bir zumda toʻlov. Foydalanuvchidan qoʻshimcha foiz olinmaydi.",
  },
  {
    id: "click",
    label: "Click Up / QR-toʻlov",
    commissionLabel: "~1% shlyuz komissiyasi (qoʻshimcha ustamasiz)",
    badge: "QR va Karta",
    description: "Click ilovasi, QR-kod yoki Uzcard/Humo orqali tezkor toʻlov.",
  },
];

export function formatUzsByLocale(amount: number, locale: Locale): string {
  const dict = getBillingHomeDict(locale);
  const formatted = new Intl.NumberFormat(getIntlLocale(locale)).format(amount);
  return `${formatted} ${dict.currencyLabel}`;
}

export function getLocalizedPlanSpec(planId: PlanId, locale: Locale): PlanSpec {
  const base = PLANS_CONFIG[planId];
  const localized = getBillingHomeDict(locale).plans.items[planId];
  return {
    ...base,
    name: localized.name,
    subtitle: localized.subtitle,
    badge: localized.badge,
    soloFeatures: localized.soloFeatures,
    b2bFeatures: localized.b2bFeatures,
  };
}

export function getLocalizedPlansList(locale: Locale): PlanSpec[] {
  return PLANS_LIST.map((plan) => getLocalizedPlanSpec(plan.id, locale));
}

export function getLocalizedAiModel(modelId: AiModelId, locale: Locale): AiModelMeta {
  const base = AI_MODELS[modelId];
  const localized = getBillingHomeDict(locale).plans.aiModels[modelId];
  return {
    ...base,
    label: localized.label,
    shortLabel: localized.shortLabel,
    description: localized.description,
  };
}
