import { BankAccount } from "./types";

export const mockBankAccounts: BankAccount[] = [
  {
    id: "bank-1",
    entityId: "ent-alfa",
    bankName: "ATB Kapitalbank Toshkent shahar BXM",
    bankLogoText: "KB",
    accountNumber: "20208000100584930001",
    mfo: "01036",
    currency: "UZS",
    balance: 845200000,
    pendingBalance: 14800000,
    lastSyncedAt: "Bugun 14:30 (Avtomatik)",
    status: "connected",
  },
  {
    id: "bank-2",
    entityId: "ent-alfa",
    bankName: "ATB Asakabank Chilonzor filiali",
    bankLogoText: "AB",
    accountNumber: "20208000700948372001",
    mfo: "00412",
    currency: "UZS",
    balance: 312450000,
    pendingBalance: 0,
    lastSyncedAt: "Bugun 12:15 (Avtomatik)",
    status: "connected",
  },
  {
    id: "bank-3",
    entityId: "ent-alfa",
    bankName: "ATIB Ipoteka-bank Yunusobod filiali (Valyuta)",
    bankLogoText: "IB",
    accountNumber: "20208840200184729001",
    mfo: "00891",
    currency: "USD",
    balance: 48500, // $48,500
    pendingBalance: 2500,
    lastSyncedAt: "Bugun 10:00 (Avtomatik)",
    status: "connected",
  },
];
