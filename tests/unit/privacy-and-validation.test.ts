import { describe, it, expect } from "vitest";
import {
  normalizeUzPhone,
  formatUzPhoneDisplay,
  maskPinfl,
  maskEmail,
  depersonalizeForAi,
  sanitizeStringForAi,
  sanitizeStorageText,
} from "@/lib/utils/privacy";
import {
  journalEntrySchema,
  employeeSchema,
  bankAccountSchema,
  businessEntitySchema,
  teamInviteSchema,
} from "@/lib/validations/accounting";
import { getClientDeviceHash } from "@/lib/utils/device-fingerprint";
import { sanitizeInternalRedirect } from "@/lib/utils/redirect";
import { sanitizeCsvField } from "@/lib/utils/csv";

describe("Privacy, Eskiz Phone Normalization & Depersonalization", () => {
  it("normalizes 9-digit and +998 Uzbekistan numbers for Eskiz API", () => {
    expect(normalizeUzPhone("+998 90 123-45-67")).toBe("998901234567");
    expect(normalizeUzPhone("998911112233")).toBe("998911112233");
    expect(normalizeUzPhone("93 555 44 33")).toBe("998935554433");
    expect(normalizeUzPhone("12345")).toBeNull();
    expect(formatUzPhoneDisplay("998901234567")).toBe("+998 90 123-45-67");
  });

  it("masks 14-digit PINFL safely in UI", () => {
    expect(maskPinfl("31502941234567")).toBe("3150••••••4567");
    expect(maskPinfl("")).toBe("—");
  });

  it("strips STIR, PINFL, 20-digit bank accounts and phone numbers before LLM calls", () => {
    const raw = {
      entity: "ORIENT AGRO",
      tin: "301948572",
      account: "20208000905412340001",
      directorPinfl: "31502941234567",
      phone: "+998 90 123-45-67",
      memo: "Uzcard 8600 1234 5678 9012 orqali tolov",
      balance: 325000000, // 9-digit monetary figure starting with 3 must stay numeric!
      vatPayable: 12000000,
    };
    const sanitized = depersonalizeForAi(raw);
    expect(sanitized.tin).toBe("[STIR_MASKED]");
    expect(sanitized.account).toBe("[BANK_HISOB_MASKED]");
    expect(sanitized.directorPinfl).toBe("[PINFL_MASKED]");
    expect(sanitized.phone).toBe("[TELEFON_MASKED]");
    expect(sanitized.memo).toBe("Uzcard [KARTA_MASKED] orqali tolov");
    expect(sanitized.balance).toBe(325000000);
    expect(sanitized.vatPayable).toBe(12000000);
  });

  it("masks emails cleanly for UI display", () => {
    expect(maskEmail("asror@gmail.com")).toBe("as***r@gmail.com");
    expect(maskEmail("ab@mail.uz")).toBe("a***@mail.uz");
    expect(maskEmail("")).toBe("—");
    expect(maskEmail(null)).toBe("—");
    expect(maskEmail(undefined)).toBe("—");
  });

  it("preserves 9-digit monetary figures with currency words and masks emails/passports in sanitizeStringForAi", () => {
    const textWithMoney = "Shartnoma bo'yicha 325000000 soʻm to'landi va 250000000 uzs kutilmoqda";
    const sanitizedMoney = sanitizeStringForAi(textWithMoney);
    expect(sanitizedMoney).toContain("325000000 soʻm");
    expect(sanitizedMoney).toContain("250000000 uzs");
    expect(sanitizedMoney).not.toContain("[STIR_MASKED]");

    const textWithStir = "Kompaniya STIR raqami 301948572 va direktor email asror@firmus.uz pasport AA1234567";
    const sanitizedPii = sanitizeStringForAi(textWithStir);
    expect(sanitizedPii).toContain("[STIR_MASKED]");
    expect(sanitizedPii).toContain("[EMAIL_MASKED]");
    expect(sanitizedPii).toContain("[PASSPORT_MASKED]");
    expect(sanitizedPii).not.toContain("301948572");
    expect(sanitizedPii).not.toContain("asror@firmus.uz");
    expect(sanitizedPii).not.toContain("AA1234567");
  });

  it("masks 16-digit cards and 14-digit PINFL/JSHSHIR in nested depersonalizeForAi payloads", () => {
    const payload = {
      apiToken: "secret-123",
      employees: [
        {
          fullName: "Karimov Jasur",
          jshshirNote: "JSHSHIR 31502941234567 bo'yicha oylik",
          cardNote: "Humo 9860-1234-5678-9012 va Uzcard 8600987654321098 va Visa 4242 4242 4242 4242",
          salary: 8500000,
        },
      ],
    };

    const sanitized = depersonalizeForAi(payload);
    expect(sanitized.apiToken).toBe("[REDACTED]");
    expect(sanitized.employees[0].jshshirNote).toBe("JSHSHIR [PINFL_MASKED] bo'yicha oylik");
    expect(sanitized.employees[0].jshshirNote).not.toContain("31502941234567");
    expect(sanitized.employees[0].cardNote).toBe(
      "Humo [KARTA_MASKED] va Uzcard [KARTA_MASKED] va Visa [KARTA_MASKED]"
    );
    expect(sanitized.employees[0].cardNote).not.toContain("9860");
    expect(sanitized.employees[0].cardNote).not.toContain("8600987654321098");
    expect(sanitized.employees[0].cardNote).not.toContain("4242");
    expect(sanitized.employees[0].salary).toBe(8500000);
  });

  it("masks 16-digit cards and 14-digit PINFL/JSHSHIR in sanitizeStorageText while preserving STIR", () => {
    const rawText =
      "STIR 305112233, JSHSHIR 31502941234567, karta 8600 1234 5678 9012 va 9860111122223333, pasport AB 1234567";
    const cleaned = sanitizeStorageText(rawText);

    expect(cleaned).toContain("STIR 305112233");
    expect(cleaned).toContain("[JSHSHIR-****]");
    expect(cleaned).toContain("[KARTA-****]");
    expect(cleaned).toContain("[PASPORT-****]");
    expect(cleaned).not.toContain("31502941234567");
    expect(cleaned).not.toContain("8600 1234 5678 9012");
    expect(cleaned).not.toContain("9860111122223333");
    expect(sanitizeStorageText(null)).toBe("");
  });
});

describe("Zod Financial Form Schemas", () => {
  it("rejects identical debit and credit accounts in journalEntrySchema", () => {
    const res = journalEntrySchema.safeParse({
      entryNumber: "JE-01",
      date: "2026-11-16",
      description: "Test",
      debitAccountCode: "5110",
      creditAccountCode: "5110",
      amount: 100000,
    });
    expect(res.success).toBe(false);
  });

  it("enforces exact 14-digit PINFL for employees", () => {
    expect(
      employeeSchema.safeParse({
        fullName: "Aliyev Vali",
        position: "Buxgalter",
        department: "Moliya",
        salary: 8000000,
        pinfl: "12345",
        hireDate: "2026-11-01",
      }).success
    ).toBe(false);

    expect(
      employeeSchema.safeParse({
        fullName: "Aliyev Vali",
        position: "Buxgalter",
        department: "Moliya",
        salary: 8000000,
        pinfl: "31502941234567",
        hireDate: "2026-11-01",
      }).success
    ).toBe(true);
  });

  it("validates 20-digit bank account & 5-digit MFO", () => {
    expect(
      bankAccountSchema.safeParse({
        bankName: "Kapitalbank",
        accountNumber: "20208000905412340001",
        mfo: "00974",
        currency: "UZS",
        balance: 0,
      }).success
    ).toBe(true);
  });

  it("enforces 9-digit STIR on businessEntitySchema", () => {
    expect(
      businessEntitySchema.safeParse({
        legalName: "TEST MCHJ",
        tinStir: "309112233",
        companyType: "MChJ",
        taxRegime: "vat_profit_tax",
      }).success
    ).toBe(true);
  });

  it("prevents escalating invites to workspace_owner in teamInviteSchema", () => {
    const invalidOwnerInvite = teamInviteSchema.safeParse({
      name: "Ali Valiyev",
      email: "ali@example.com",
      role: "workspace_owner",
    });
    expect(invalidOwnerInvite.success).toBe(false);

    const validChiefAccountant = teamInviteSchema.safeParse({
      name: "Vali Aliyev",
      email: "vali@example.com",
      role: "chief_accountant",
    });
    expect(validChiefAccountant.success).toBe(true);
  });

  it("generates deterministic device fingerprint using persistent localStorage firmus_device_token", async () => {
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };

    const prevWindow = (globalThis as unknown as { window?: unknown }).window;
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: mockStorage },
      configurable: true,
      writable: true,
    });

    try {
      const hash1 = await getClientDeviceHash();
      expect(hash1).toBeDefined();
      expect(store["firmus_device_token"]).toBeDefined();
      const token = store["firmus_device_token"];

      const hash2 = await getClientDeviceHash();
      expect(hash1).toBe(hash2);
      expect(store["firmus_device_token"]).toBe(token);
    } finally {
      if (prevWindow === undefined) {
        delete (globalThis as unknown as { window?: unknown }).window;
      } else {
        Object.defineProperty(globalThis, "window", {
          value: prevWindow,
          configurable: true,
          writable: true,
        });
      }
    }
  });
});

describe("Security Helpers: Internal Redirect & CSV Sanitization", () => {
  it("allows safe internal paths and blocks open-redirect payloads in sanitizeInternalRedirect", () => {
    expect(sanitizeInternalRedirect("/billing")).toBe("/billing");
    expect(sanitizeInternalRedirect("/reconcile?batchId=123#top")).toBe(
      "/reconcile?batchId=123#top"
    );

    expect(sanitizeInternalRedirect("//evil.com")).toBe("/");
    expect(sanitizeInternalRedirect("/\\evil.com")).toBe("/");
    expect(sanitizeInternalRedirect("https://evil.com")).toBe("/");
    expect(sanitizeInternalRedirect("javascript:alert(1)")).toBe("/");
    expect(sanitizeInternalRedirect("/ok\r\nLocation: evil")).toBe("/");
    expect(sanitizeInternalRedirect(null)).toBe("/");
    expect(sanitizeInternalRedirect(undefined)).toBe("/");
    expect(sanitizeInternalRedirect("")).toBe("/");
  });

  it("neutralizes CSV formula prefixes and escapes embedded quotes in sanitizeCsvField", () => {
    expect(sanitizeCsvField("=1+1")).toBe(`"'=1+1"`);
    expect(sanitizeCsvField("+cmd")).toBe(`"'+cmd"`);
    expect(sanitizeCsvField("-2+3")).toBe(`"'-2+3"`);
    expect(sanitizeCsvField("@SUM")).toBe(`"'@SUM"`);
    expect(sanitizeCsvField("\tfoo")).toBe(`"'\tfoo"`);
    expect(sanitizeCsvField("\rbar")).toBe(`"'\rbar"`);
    expect(sanitizeCsvField('a"b')).toBe('"a""b"');
  });
});
