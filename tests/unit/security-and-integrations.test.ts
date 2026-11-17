import { describe, it, expect } from "vitest";
import {
  validateExternalODataUrl,
  generate1CEpfGuideBsl,
} from "../../lib/services/onec-connector";
import {
  encryptSecret,
  decryptSecret,
  sha256Hex,
  generateSixDigitCode,
  safeEqualStrings,
} from "../../lib/utils/crypto-secrets";
import {
  signAiProposalToken,
  verifyAiProposalToken,
} from "../../lib/ai/proposal-token";
import {
  generate1CClientBankText,
  generate1CEnterpriseDataXml,
} from "../../lib/services/one-c-export";

describe("Security & 1C Integrations Suite", () => {
  describe("1C OData URL Validation & SSRF Prevention", () => {
    it("accepts valid external HTTPS URLs", () => {
      const url = validateExternalODataUrl("https://1cfresh.uz/a/buh/odata/standard.odata");
      expect(url.hostname).toBe("1cfresh.uz");
      expect(url.protocol).toBe("https:");
    });

    it("rejects empty or whitespace URLs", () => {
      expect(() => validateExternalODataUrl("")).toThrow("kiritilishi shart");
      expect(() => validateExternalODataUrl("   ")).toThrow("kiritilishi shart");
    });

    it("rejects URLs with embedded credentials", () => {
      expect(() =>
        validateExternalODataUrl("https://admin:secret@1cfresh.uz/odata")
      ).toThrow("login yoki parol koʻrsatish taqiqlangan");
    });

    it("blocks SSRF loopback, internal hosts and metadata endpoints", () => {
      expect(() => validateExternalODataUrl("http://localhost/odata")).toThrow();
      expect(() => validateExternalODataUrl("http://127.0.0.1:8080/odata")).toThrow();
      expect(() => validateExternalODataUrl("http://10.0.0.1/odata")).toThrow();
      expect(() => validateExternalODataUrl("http://192.168.1.1/odata")).toThrow();
      expect(() => validateExternalODataUrl("http://169.254.169.254/latest/meta-data/")).toThrow();
      expect(() => validateExternalODataUrl("http://metadata.google.internal/")).toThrow();
      expect(() => validateExternalODataUrl("http://app.internal/")).toThrow();
    });
  });

  describe("Crypto Secrets & Secret Storage", () => {
    it("encrypts and decrypts secrets with AES-256-GCM authenticated cipher", () => {
      const plaintext = "my-secret-1c-pass-2026!";
      const encrypted = encryptSecret(plaintext);

      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.startsWith("v1:")).toBe(true);

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("fails decryption if ciphertext is tampered", () => {
      const plaintext = "super-secret";
      const encrypted = encryptSecret(plaintext);
      const parts = encrypted.split(":");
      parts[3] = "tampered" + parts[3].slice(8);
      const tampered = parts.join(":");

      expect(() => decryptSecret(tampered)).toThrow();
    });

    it("generates 6-digit numeric pairing codes in range [100000, 999999]", () => {
      for (let i = 0; i < 20; i++) {
        const code = generateSixDigitCode();
        expect(code).toMatch(/^\d{6}$/);
        const num = Number(code);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThan(1000000);
      }
    });

    it("performs constant-time string equality check safely", () => {
      const hash = sha256Hex("hello-firmus");
      expect(safeEqualStrings(hash, hash)).toBe(true);
      expect(safeEqualStrings(hash, sha256Hex("other-string"))).toBe(false);
      expect(safeEqualStrings("abc", "abcd")).toBe(false);
    });
  });

  describe("AI Action Proposal Signing & Verification", () => {
    it("signs proposal with HMAC token and verifies successfully", () => {
      const userId = "c6b8c8d8-5b12-4299-b1d6-88dba301a686";
      const entityId = "11111111-2222-3333-4444-555555555555";
      const proposalType = "journal_entry";
      const payload = { lines: [{ account_code: "5110", debit_amount: 500000, credit_amount: 0 }] };

      const token = signAiProposalToken({
        userId,
        entityId,
        proposalType,
        proposalPayload: payload,
      });

      expect(token).toBeTruthy();
      expect(token).toContain(".");

      const verifyRes = verifyAiProposalToken(token, {
        userId,
        entityId,
        proposalType,
      });

      expect(verifyRes.ok).toBe(true);
      expect(verifyRes.isAiVerified).toBe(true);
    });

    it("rejects proposal token when user or entity does not match", () => {
      const userId = "user-1";
      const entityId = "entity-1";
      const token = signAiProposalToken({
        userId,
        entityId,
        proposalType: "journal_entry",
        proposalPayload: {},
      });

      const mismatchUser = verifyAiProposalToken(token, {
        userId: "user-2",
        entityId,
        proposalType: "journal_entry",
      });
      expect(mismatchUser.ok).toBe(false);

      const mismatchEntity = verifyAiProposalToken(token, {
        userId,
        entityId: "entity-2",
        proposalType: "journal_entry",
      });
      expect(mismatchEntity.ok).toBe(false);
    });
  });

  describe("1C Export Generators & EPF BSL Bridge", () => {
    it("generates 1C EPF Managed Forms BSL module and instructions", () => {
      const epf = generate1CEpfGuideBsl({ appUrl: "https://firmus.uz" });
      expect(epf.filename).toBe("Firmus1CBridge.bsl");
      expect(epf.bslCode).toContain("Функция БазовыйАдресFirmus()");
      expect(epf.bslCode).toContain("https://firmus.uz");
      expect(epf.bslCode).toContain("ПодключитьFirmusПоКоду");
      expect(epf.bslCode).toContain("РежимЗаписиДокумента.Запись");
      expect(epf.instructionsUz.length).toBeGreaterThanOrEqual(4);
    });

    it("generates valid 1C ClientBank format with standard header and КонецФайла termination", () => {
      const items = [
        {
          id: "1",
          date: "2026-11-18",
          amount: 1_250_000,
          type: "income" as const,
          counterparty: "OOO TEST CLIENT",
          counterpartyStir: "123456789",
          description: "Xizmatlar toʻlovi",
          accountCode: "5110",
        },
      ];

      const txt = generate1CClientBankText(items, {
        name: "FIRMUS SOFT MChJ",
        inn: "310987654",
        account: "20208000600000000001",
        bank: "KAPITALBANK",
      });

      expect(txt).toContain("1CClientBankExchange");
      expect(txt).toContain("ВерсияФормата=1.02");
      expect(txt).toContain("СекцияДокумент=Платежное поручение");
      expect(txt).toContain("Сумма=1250000.00");
      expect(txt).toContain("КонецДокумента");
      expect(txt).toContain("КонецФайла");
    });

    it("generates valid 1C EnterpriseData XML with Posted=false drafts", () => {
      const xml = generate1CEnterpriseDataXml([
        {
          entryNumber: "REC-1",
          date: "2026-11-18",
          description: "Bank kirim provodkasi",
          totalDebit: 500_000,
          lines: [
            { code: "5110", debit: 500_000, credit: 0 },
            { code: "4010", debit: 0, credit: 500_000 },
          ],
        },
      ]);

      expect(xml).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
      expect(xml).toContain("<EnterpriseData");
      expect(xml).toContain("<Posted>false</Posted>");
      expect(xml).toContain("<Number>REC-1</Number>");
    });
  });
});
