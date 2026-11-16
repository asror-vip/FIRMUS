import { z } from "zod";

const stirRegex = /^\d{9}$/;
const pinflRegex = /^\d{14}$/;
const mfoRegex = /^\d{5}$/;
const bankAccountRegex = /^\d{20}$/;

export const journalEntrySchema = z
  .object({
    entryNumber: z.string().trim().min(2, "Hujjat raqami kamida 2 ta belgidan iborat boʻlishi kerak"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD formatida boʻlishi kerak"),
    description: z.string().trim().min(3, "Iqtisodiy mazmun kamida 3 ta belgidan iborat boʻlishi kerak"),
    debitAccountCode: z.string().trim().min(4, "Debet schyotini tanlang"),
    creditAccountCode: z.string().trim().min(4, "Kredit schyotini tanlang"),
    amount: z.coerce
      .number({ error: "Summa raqam boʻlishi kerak" })
      .positive("Summa 0 dan katta musbat son boʻlishi shart")
      .max(999_999_999_999, "Summa ruxsat etilgan chegaradan oshib ketdi"),
  })
  .refine((data) => data.debitAccountCode !== data.creditAccountCode, {
    message: "Debet va kredit schyotlari bir xil boʻlishi mumkin emas",
    path: ["creditAccountCode"],
  });

export const transactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD formatida boʻlishi kerak"),
  amount: z.coerce
    .number({ error: "Summa raqam boʻlishi kerak" })
    .positive("Summa 0 dan katta boʻlishi kerak"),
  type: z.enum(["income", "expense"]),
  counterparty: z.string().trim().min(2, "Kontragent nomini kiriting"),
  counterpartyStir: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || stirRegex.test(val), "STIR raqami aniq 9 ta raqamdan iborat boʻlishi kerak"),
  description: z.string().trim().min(3, "Tranzaksiya tavsifini kiriting"),
  accountCode: z.string().trim().min(4, "Schyot kodini tanlang"),
});

export const documentSchema = z.object({
  number: z.string().trim().min(2, "Hujjat raqamini kiriting"),
  type: z.enum(["invoice", "incoming_invoice", "act", "contract"]),
  counterparty: z.string().trim().min(2, "Kontragent nomini kiriting"),
  counterpartyStir: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || stirRegex.test(val), "STIR raqami aniq 9 ta raqamdan iborat boʻlishi kerak"),
  amount: z.coerce
    .number({ error: "Summa raqam boʻlishi kerak" })
    .positive("Hujjat summasi 0 dan katta boʻlishi kerak"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana notoʻgʻri formatda"),
  contractNumber: z.string().trim().optional(),
});

export const contractSchema = z
  .object({
    number: z.string().trim().min(2, "Shartnoma raqamini kiriting"),
    type: z.string().trim().min(2, "Shartnoma turini tanlang"),
    counterparty: z.string().trim().min(2, "Kontragent nomini kiriting"),
    counterpartyStir: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || stirRegex.test(val), "STIR aniq 9 ta raqam boʻlishi kerak"),
    amount: z.coerce
      .number({ error: "Summa raqam boʻlishi kerak" })
      .positive("Shartnoma summasi musbat son boʻlishi kerak"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Boshlanish sanasi notoʻgʻri"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tugash sanasi notoʻgʻri"),
    description: z.string().trim().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "Tugash sanasi boshlanish sanasidan oldin boʻlishi mumkin emas",
    path: ["endDate"],
  });

export const inventorySchema = z.object({
  sku: z.string().trim().min(2, "SKU artikulini kiriting"),
  name: z.string().trim().min(2, "Tovar nomini kiriting"),
  category: z.string().trim().min(2, "Kategoriyani tanlang"),
  quantity: z.coerce
    .number({ error: "Miqdor son boʻlishi kerak" })
    .nonnegative("Miqdor manfiy boʻlishi mumkin emas"),
  unit: z.string().trim().min(1, "Oʻlchov birligini kiriting"),
  unitPrice: z.coerce
    .number({ error: "Narx son boʻlishi kerak" })
    .positive("Birlik narxi 0 dan katta boʻlishi kerak"),
});

export const employeeSchema = z.object({
  fullName: z.string().trim().min(3, "Xodim F.I.O ni toʻliq kiriting"),
  position: z.string().trim().min(2, "Lavozimni kiriting"),
  department: z.string().trim().min(2, "Boʻlimni kiriting"),
  salary: z.coerce
    .number({ error: "Maosh raqam boʻlishi kerak" })
    .positive("Oylik maosh 0 dan katta boʻlishi kerak"),
  pinfl: z.string().trim().regex(pinflRegex, "JShShIR (PINFL) aniq 14 ta raqamdan iborat boʻlishi shart"),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ishga kirish sanasi notoʻgʻri"),
});

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(2, "Bank nomini tanlang"),
  accountNumber: z
    .string()
    .trim()
    .regex(bankAccountRegex, "Bank hisobvaragʻi aniq 20 ta raqamdan iborat boʻlishi shart"),
  mfo: z.string().trim().regex(mfoRegex, "MFO kodi aniq 5 ta raqamdan iborat boʻlishi shart"),
  currency: z.enum(["UZS", "USD"]),
  balance: z.coerce
    .number({ error: "Balans raqam boʻlishi kerak" })
    .nonnegative("Balans manfiy boʻlishi mumkin emas"),
});

export const businessEntitySchema = z.object({
  legalName: z.string().trim().min(3, "Korxona yuridik nomini kiriting"),
  tradeName: z.string().trim().optional(),
  tinStir: z.string().trim().regex(stirRegex, "STIR (INN) aniq 9 ta raqamdan iborat boʻlishi shart"),
  companyType: z.string().trim().min(2),
  taxRegime: z.enum(["vat_profit_tax", "turnover_tax", "fixed_tax"]),
  accountantName: z.string().trim().optional(),
});

export const teamInviteSchema = z.object({
  name: z.string().trim().min(2, "Xodim ismini kiriting"),
  email: z.string().trim().email("Elektron pochta manzili notoʻgʻri formatda"),
  role: z.enum([
    "workspace_owner",
    "chief_accountant",
    "accountant",
    "auditor",
    "company_director",
    "viewer",
  ]),
});

export function getFirstZodError(err: z.ZodError): string {
  return err.issues[0]?.message || "Maʼlumotlar notoʻgʻri kiritilgan";
}
