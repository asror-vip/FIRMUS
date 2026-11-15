import { BusinessEntity, Workspace } from "./types";

export const mockWorkspaces: Workspace[] = [
  {
    id: "ws-1",
    name: "Toshkent Buxgalteriya Xizmati MCHJ",
    type: "accounting_firm",
    ownerName: "Akrom Shodiyev",
    currentPlan: "professional",
    entitiesCount: 3,
    membersCount: 8,
  },
  {
    id: "ws-2",
    name: "Mening Buxgalteriya Firmam",
    type: "accounting_firm",
    ownerName: "Nodirbek Qodirov",
    currentPlan: "enterprise",
    entitiesCount: 12,
    membersCount: 15,
  },
  {
    id: "ws-3",
    name: "Alfa Logistics Boshqaruvi",
    type: "individual_company",
    ownerName: "Rustam Aliyev",
    currentPlan: "starter",
    entitiesCount: 1,
    membersCount: 3,
  },
];

export const mockBusinessEntities: BusinessEntity[] = [
  {
    id: "ent-alfa",
    name: "MCHJ Alfa Savdo & Logistika",
    tradeName: "Alfa Logistics",
    tinStir: "304892114",
    companyType: "MCHJ",
    taxRegime: "vat_profit_tax", // QQS + Foyda solig'i
    currency: "UZS",
    isActive: true,
    directorName: "Rustamov Alisher Bahromovich",
    accountantName: "Xalilova Dilnoza Saidovna",
    bankAccount: "20208000100584930001",
    bankName: "ATB Kapitalbank Toshkent shahar BXM",
  },
  {
    id: "ent-beta",
    name: "MCHJ Beta Qurilish & Konstruksiya",
    tradeName: "Beta Build",
    tinStir: "308119042",
    companyType: "MCHJ",
    taxRegime: "turnover_tax", // Aylanmadan olinadigan soliq (4%)
    currency: "UZS",
    isActive: true,
    directorName: "Sobirov Jasur Mansurovich",
    accountantName: "Madaminov Farhod Tolibovich",
    bankAccount: "20208000700948372001",
    bankName: "ATB Asakabank Chilonzor filiali",
  },
  {
    id: "ent-gamma",
    name: "YaTT Gamma Tekstil Dizayn",
    tradeName: "Gamma Fashion",
    tinStir: "512309881",
    companyType: "YaTT",
    taxRegime: "fixed_tax", // Qat'iy belgilangan soliq
    currency: "UZS",
    isActive: true,
    directorName: "Gʻaniyeva Shahnoza Otabekovna",
    accountantName: "Gʻaniyeva Shahnoza Otabekovna",
    bankAccount: "20218000300184729001",
    bankName: "ATIB Ipoteka-bank Yunusobod filiali",
  },
];
