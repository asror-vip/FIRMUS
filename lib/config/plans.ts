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
    fallbackChain: ["gemini-4-hydrogen", "gemini-3.8-flash", "gemini-3.5-flash-lite"],
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
    subtitle: "Asosiy vositalar va bepul sinash uchun",
    monthlyPriceUzs: 0,
    annualMonthlyPriceUzs: 0,
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
      "Barcha lokal kalkulyatorlar va 1C (.txt / .xml / CSV) eksport — cheksiz",
      "Oyiga 25 ta AI kredit (kuniga max 6 kredit)",
      "Gemini 3.8 Flash modeli (1 soʻrov = 1 kredit)",
      "Chek / faktura rasm skanerlash (max 1280px / 1 MB)",
      "Bank ↔ 1C fayl limiti: 3 MB / 1 000 qatorgacha",
      "Tarix xotirasi: oxirgi 15 ta ish va 10 ta chat",
    ],
    b2bFeatures: [
      "1 ta korxona (STIR)",
      "Oyiga 25 ta AI kredit",
      "Bank ↔ 1C solishtirish + 1C eksport",
      "Gemini 3.8 Flash modeli",
    ],
  },
  professional: {
    id: "professional",
    name: "Pro",
    subtitle: "Faol buxgalterlar va kundalik ishlar uchun",
    monthlyPriceUzs: 99_000,
    annualMonthlyPriceUzs: 79_000,
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
      "7 kun bepul sinov (40 kredit bilan barcha Pro imkoniyatlari)",
      "Oyiga 350 ta AI kredit (kuniga max 45 kredit)",
      "Gemini 4 Hydrogen (2 kr) va Gemini 3.8 Flash (1 kr)",
      "PDF faktura va shartnoma yuklash (max 4 MB / 10 bet)",
      "Rasm skanerlash (max 1600px / 1.5 MB)",
      "Bank ↔ 1C fayl limiti: 10 MB / 3 000 qatorgacha",
      "Tarix xotirasi: 150 ta saqlangan ish va 80 ta chat",
    ],
    b2bFeatures: [
      "5 tagacha korxona (STIR) va 5 ta aʼzo",
      "Oyiga 350 ta AI kredit",
      "Gemini 4 Hydrogen + Gemini 3.8 Flash",
      "PDF faktura va shartnoma ekspertizasi",
    ],
  },
  pro_plus: {
    id: "pro_plus",
    name: "Pro+",
    subtitle: "Katta hajm, chuqur hujjat tahlili va ustuvor tezlik",
    monthlyPriceUzs: 249_000,
    annualMonthlyPriceUzs: 199_000,
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
      "Oyiga 1 000 ta AI kredit (kuniga max 120 kredit)",
      "Gemini 4 Hydrogen (2 kr) + Gemini 3.8 Flash (1 kr) ustuvor navbat",
      "Katta PDF shartnoma va fakturalar (max 6 MB / 25 bet)",
      "Rasm skanerlash (max 1600px / 2 MB)",
      "Bank ↔ 1C fayl limiti: 15 MB / 5 000 qatorgacha",
      "Tarix xotirasi: 1 000 ta saqlangan ish va 300 ta chat",
    ],
    b2bFeatures: [
      "Cheksiz korxonalar va jamoa rollari",
      "Oyiga 1 000 ta AI kredit",
      "Gemini 4 Hydrogen + katta PDF tahlili",
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
  limits: PLANS_CONFIG.starter.limits,
};
