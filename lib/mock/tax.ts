import { TaxRecord } from "./types";

export const mockTaxRecords: TaxRecord[] = [
  {
    id: "tax-1",
    entityId: "ent-alfa",
    type: "QQS (12%)",
    period: "2026-yil Oktyabr",
    calculatedAmount: 48900000,
    paidAmount: 48900000,
    status: "paid",
    deadline: "2026-11-20",
    details: {
      taxableBase: 695000000,
      rate: "12%",
      deductions: 34500000, // Hisobga olinadigan (zachyot) QQS
    },
  },
  {
    id: "tax-2",
    entityId: "ent-alfa",
    type: "JShDS (12%)",
    period: "2026-yil Oktyabr",
    calculatedAmount: 8208000,
    paidAmount: 8208000,
    status: "paid",
    deadline: "2026-11-15",
    details: {
      taxableBase: 68400000,
      rate: "12%",
      deductions: 0,
    },
  },
  {
    id: "tax-3",
    entityId: "ent-alfa",
    type: "Ijtimoiy soliq (12%)",
    period: "2026-yil Oktyabr",
    calculatedAmount: 8208000,
    paidAmount: 8208000,
    status: "paid",
    deadline: "2026-11-15",
    details: {
      taxableBase: 68400000,
      rate: "12%",
      deductions: 0,
    },
  },
  {
    id: "tax-4",
    entityId: "ent-alfa",
    type: "QQS (12%)",
    period: "2026-yil Noyabr (Prognoz)",
    calculatedAmount: 38450000,
    paidAmount: 0,
    status: "due_soon",
    deadline: "2026-12-20",
    details: {
      taxableBase: 580000000,
      rate: "12%",
      deductions: 31150000,
    },
  },
  {
    id: "tax-5",
    entityId: "ent-alfa",
    type: "Foyda solig‘i",
    period: "2026-yil 3-chorak (Q3)",
    calculatedAmount: 54200000,
    paidAmount: 54200000,
    status: "paid",
    deadline: "2026-10-25",
    details: {
      taxableBase: 361333333,
      rate: "15%",
      deductions: 0,
    },
  },
  {
    id: "tax-6",
    entityId: "ent-beta",
    type: "Aylanmadan soliq (4%)",
    period: "2026-yil Oktyabr",
    calculatedAmount: 18000000,
    paidAmount: 18000000,
    status: "paid",
    deadline: "2026-11-15",
    details: {
      taxableBase: 450000000,
      rate: "4%",
      deductions: 0,
    },
  },
];

export const mockTaxDeadlines = [
  { id: "dl-1", date: "2026-11-15", title: "JShDS va Ijtimoiy soliq hisoboti", status: "completed", description: "Oktyabr oyi uchun to'liq to'langan" },
  { id: "dl-2", date: "2026-11-20", title: "Qo'shilgan qiymat solig'i (QQS) hisoboti", status: "urgent", description: "Hisobot topshirishga 5 kun qoldi" },
  { id: "dl-3", date: "2026-12-15", title: "Noyabr oyi mehnat haqi soliqlari", status: "upcoming", description: "JShDS va INPS to'lovlari" },
  { id: "dl-4", date: "2026-12-20", title: "Noyabr oyi QQS va aylanmadan olinadigan soliq", status: "upcoming", description: "Oylik hisobot va to'lov" },
];
