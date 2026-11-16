export type OptionalModuleKey =
  | "banking"
  | "documents"
  | "inventory"
  | "contracts"
  | "employees"
  | "integrations"
  | "reports"
  | "team"
  | "billing"
  | "smsOtp";

export interface OptionalModuleMeta {
  key: OptionalModuleKey;
  title: string;
  description: string;
  href?: string;
  containsPii?: boolean;
}

export const OPTIONAL_MODULES: OptionalModuleMeta[] = [
  {
    key: "banking",
    title: "Bank hisobvaraqlari",
    description: "Bir nechta bank hisobvaraqlarini va valyuta qoldiqlarini alohida boshqarish.",
    href: "/banking",
  },
  {
    key: "documents",
    title: "Didox E-SF va E-IMZO hujjatlar",
    description: "Elektron hisob-fakturalar, PDF fayllar ombori va lokal E-IMZO imzolash.",
    href: "/documents",
  },
  {
    key: "contracts",
    title: "Shartnomalar reyestri",
    description: "Kontragent shartnomalari va muddatlarini alohida jadvalda yuritish.",
    href: "/contracts",
  },
  {
    key: "inventory",
    title: "Omborxona va Tovar qoldigʻi",
    description: "SKU, tannarx va ombor zaxiralarini kuzatish (1C dan tashqari).",
    href: "/inventory",
  },
  {
    key: "employees",
    title: "Xodimlar va Ish haqi (HR)",
    description: "Xodimlar roʻyxati va oylik soliq provodkalari (OʻRQ-547: JShShIR saqlaydi).",
    href: "/employees",
    containsPii: true,
  },
  {
    key: "integrations",
    title: "Integratsiyalar (Didox / 1C API)",
    description: "Tashqi API endpointlari va sinxronizatsiya sozlamalari.",
    href: "/integrations",
  },
  {
    key: "reports",
    title: "Hisobot shablonlari",
    description: "Qoʻshimcha soliq va boshqaruv hisobot shablonlari.",
    href: "/reports",
  },
  {
    key: "team",
    title: "Jamoa va RBAC boshqaruvi",
    description: "Buxgalteriya firmasi xodimlarini qoʻshish va korxonalarga biriktirish.",
    href: "/team",
    containsPii: true,
  },
  {
    key: "billing",
    title: "Tariflar va Obuna",
    description: "SaaS tarif rejasi va toʻlov hisobvaraqlarini koʻrish.",
    href: "/billing",
  },
  {
    key: "smsOtp",
    title: "Telefon SMS OTP (2FA)",
    description: "Eskiz.uz orqali telefon raqamini tasdiqlash (OʻRQ-547: telefon raqam saqlaydi).",
    containsPii: true,
  },
];

export const DEFAULT_ENABLED_MODULES: Record<OptionalModuleKey, boolean> = {
  banking: false,
  documents: false,
  inventory: false,
  contracts: false,
  employees: false,
  integrations: false,
  reports: false,
  team: false,
  billing: false,
  smsOtp: false,
};

export const FULL_ENABLED_MODULES: Record<OptionalModuleKey, boolean> = {
  banking: true,
  documents: true,
  inventory: true,
  contracts: true,
  employees: true,
  integrations: true,
  reports: true,
  team: true,
  billing: true,
  smsOtp: true,
};
