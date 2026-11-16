import { Integration } from "./types";

export const mockIntegrations: Integration[] = [
  {
    id: "int-1",
    provider: "didox",
    name: "Didox (didox.uz) Elektron Hujjat Aylanishi",
    category: "edo",
    description: "Elektron hisob-fakturalar (E-SF), dalolatnomalar (Akt) va ishonchnomalarni avtomatik qabul qilish va yuborish.",
    status: "connected",
    lastSyncTime: "Bugun 14:32 (4 daqiqa oldin)",
    recordsSyncedToday: 14,
  },
  {
    id: "int-2",
    provider: "1c_enterprise",
    name: "1C:Enterprise 8.3 (Buxgalteriya 3.0)",
    category: "erp",
    description: "OData REST orqali provodkalar, tovar qoldiqlari va kontragentlar ma'lumotlarini ikki tomonlama sinxronizatsiya qilish.",
    status: "error",
    lastSyncTime: "Bugun 11:20 (Kutilmoqda)",
    recordsSyncedToday: 32,
    errorDetail: "1C bazasi bilan aloqa sekinlashdi. Tizim avtomatik qayta ulanishni amalga oshirmoqda.",
  },
  {
    id: "int-3",
    provider: "e_imzo",
    name: "E-IMZO Raqamli Imzo Xizmati",
    category: "security",
    description: "Foydalanuvchi kompyuteridagi ERI kaliti orqali hujjatlarni bevosita brauzerda xavfsiz imzolash (Zero-Trust).",
    status: "connected",
    lastSyncTime: "Faol (Mijoz moduli ulandi)",
    recordsSyncedToday: 9,
  },
  {
    id: "int-4",
    provider: "kapitalbank",
    name: "ATB Kapitalbank Open Banking API",
    category: "bank",
    description: "Asosiy hisob raqami (20208) bo'yicha ko'chirmalar va tushumlarni real-vaqt rejimida avtomatik yuklash.",
    status: "connected",
    lastSyncTime: "Bugun 14:30 (Avtomatik)",
    recordsSyncedToday: 8,
  },
  {
    id: "int-5",
    provider: "asakabank",
    name: "ATB Asakabank API Integratsiyasi",
    category: "bank",
    description: "Ikkinchi hisob-kitob schyoti va akkreditivlar bo'yicha bank operatsiyalari.",
    status: "connected",
    lastSyncTime: "Bugun 12:15",
    recordsSyncedToday: 3,
  },
  {
    id: "int-6",
    provider: "ipotekabank",
    name: "ATIB Ipoteka-bank Valyuta Schyoti",
    category: "bank",
    description: "AQSH dollari ($) va valyuta tushumlari monitoringi.",
    status: "connected",
    lastSyncTime: "Bugun 10:00",
    recordsSyncedToday: 1,
  },
  {
    id: "int-7",
    provider: "payme_business",
    name: "Payme Business Merchant API",
    category: "payment",
    description: "Sayt va mobil ilovadan tushgan elektron to'lovlarni avtomatik hisobga olish.",
    status: "disconnected",
    lastSyncTime: "Ulanmagan",
    recordsSyncedToday: 0,
  },
  {
    id: "int-8",
    provider: "click_merchant",
    name: "Click Merchant API",
    category: "payment",
    description: "Click shlyuzi orqali qabul qilingan to'lovlar fiskal cheklari va reyestrlari.",
    status: "disconnected",
    lastSyncTime: "Ulanmagan",
    recordsSyncedToday: 0,
  },
];

export interface SyncLog {
  id: string;
  providerName: string;
  timestamp: string;
  type: "inbound" | "outbound";
  recordsProcessed: number;
  status: "success" | "warning" | "error";
  message: string;
}

export const mockSyncLogs: SyncLog[] = [
  {
    id: "log-1",
    providerName: "Didox (didox.uz)",
    timestamp: "2026-11-14 14:32:10",
    type: "inbound",
    recordsProcessed: 4,
    status: "success",
    message: "Yangi 4 ta kiruvchi E-SF va 1 ta dalolatnoma muvaffaqiyatli qabul qilindi.",
  },
  {
    id: "log-2",
    providerName: "ATB Kapitalbank",
    timestamp: "2026-11-14 14:30:00",
    type: "inbound",
    recordsProcessed: 8,
    status: "success",
    message: "Bugungi bank ko'chirmasi sinxronlandi. 8 ta yangi tranzaksiya aniqlandi.",
  },
  {
    id: "log-3",
    providerName: "1C:Enterprise 8.3",
    timestamp: "2026-11-14 11:20:45",
    type: "outbound",
    recordsProcessed: 0,
    status: "warning",
    message: "1C serveri bilan vaqtinchalik aloqa sekin. Qayta sinxronizatsiya kutilmoqda.",
  },
  {
    id: "log-4",
    providerName: "E-IMZO",
    timestamp: "2026-11-14 10:15:22",
    type: "outbound",
    recordsProcessed: 2,
    status: "success",
    message: "2 ta E-SF PKCS#7 raqamli imzosi muvaffaqiyatli tekshirildi va Didox'ga jo'natildi.",
  },
  {
    id: "log-5",
    providerName: "ATB Asakabank",
    timestamp: "2026-11-14 09:00:15",
    type: "inbound",
    recordsProcessed: 3,
    status: "success",
    message: "Ertalabki reys to'lovlari ko'chirmasi yuklandi.",
  },
];
