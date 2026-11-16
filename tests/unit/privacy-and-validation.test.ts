import { describe, it, expect } from "vitest";
import {
  normalizeUzPhone,
  formatUzPhoneDisplay,
  maskPinfl,
  depersonalizeForAi,
} from "@/lib/utils/privacy";
import {
  journalEntrySchema,
  employeeSchema,
  bankAccountSchema,
  businessEntitySchema,
} from "@/lib/validations/accounting";

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
      vatPayable: 12000000,
    };
    const sanitized = depersonalizeForAi(raw);
    expect(sanitized.tin).toBe("[STIR_MASKED]");
    expect(sanitized.account).toBe("[BANK_HISOB_MASKED]");
    expect(sanitized.directorPinfl).toBe("[PINFL_MASKED]");
    expect(sanitized.phone).toBe("[TELEFON_MASKED]");
    expect(sanitized.vatPayable).toBe(12000000);
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
});
