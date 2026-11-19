import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  validateScannedDocumentResult,
  isValidCalendarIsoDate,
} from "@/lib/services/document-scan-validator";
import { getReconcileErpDict } from "@/lib/i18n/domains/reconcile-erp";

describe("Band 3: Document Scan Deterministic Code Validation & AI Suggestion Labeling", () => {
  it("passes clean invoice when items sum, 12% VAT math, 9-digit STIR, and date are all valid", () => {
    const res = validateScannedDocumentResult({
      mode: "invoice_receipt",
      rawDate: "2026-11-18",
      rawStir: "305112233",
      totalAmount: 11_200_000,
      vatAmount: 1_200_000,
      netAmount: 10_000_000,
      items: [
        { name: "Noutbuk", qty: 2, price: 3_000_000, total: 6_000_000, vatRate: 12 },
        { name: "Monitor", qty: 2, price: 2_000_000, total: 4_000_000, vatRate: 12 },
      ],
      todayIso: "2026-11-20",
    });

    expect(res.needsReview).toBe(false);
    expect(res.issues).toHaveLength(0);
    expect(res.checks).toEqual({
      itemsSumOk: true,
      vatMathOk: true,
      stirOk: true,
      dateOk: true,
    });
  });

  it("flags 'Tekshiring' when item lines sum does not match document total or net", () => {
    const res = validateScannedDocumentResult({
      mode: "invoice_receipt",
      rawDate: "2026-11-18",
      rawStir: "305112233",
      totalAmount: 11_200_000,
      vatAmount: 1_200_000,
      netAmount: 10_000_000,
      items: [
        { name: "Noutbuk", qty: 1, price: 5_000_000, total: 5_000_000, vatRate: 12 },
      ],
      todayIso: "2026-11-20",
    });

    expect(res.needsReview).toBe(true);
    expect(res.reviewBadgeLabel).toBe("Tekshiring");
    expect(res.checks.itemsSumOk).toBe(false);
    expect(res.issues.some((i) => i.code === "items_sum_mismatch")).toBe(true);
  });

  it("flags 'Tekshiring' when VAT amount does not match rate * netAmount", () => {
    const res = validateScannedDocumentResult({
      mode: "invoice_receipt",
      rawDate: "2026-11-18",
      rawStir: "305112233",
      totalAmount: 12_000_000,
      vatAmount: 2_000_000, // 20% instead of 12% (expected 1,200,000)
      netAmount: 10_000_000,
      items: [{ name: "Xizmat", qty: 1, price: 10_000_000, total: 10_000_000, vatRate: 12 }],
      todayIso: "2026-11-20",
    });

    expect(res.needsReview).toBe(true);
    expect(res.reviewBadgeLabel).toBe("Tekshiring");
    expect(res.checks.vatMathOk).toBe(false);
    expect(res.issues.some((i) => i.code === "vat_math_mismatch")).toBe(true);
  });

  it("flags 'Tekshiring' on invalid STIR (not 9 digits) and invalid calendar or future dates", () => {
    expect(isValidCalendarIsoDate("2026-02-30")).toBe(false);
    expect(isValidCalendarIsoDate("2026-13-01")).toBe(false);
    expect(isValidCalendarIsoDate("2026-11-18")).toBe(true);

    const badStirRes = validateScannedDocumentResult({
      mode: "invoice_receipt",
      rawDate: "2026-02-30",
      rawStir: "3051122", // only 7 digits
      totalAmount: 1_000_000,
      vatAmount: 0,
      netAmount: 1_000_000,
      todayIso: "2026-11-20",
    });

    expect(badStirRes.needsReview).toBe(true);
    expect(badStirRes.reviewBadgeLabel).toBe("Tekshiring");
    expect(badStirRes.checks.stirOk).toBe(false);
    expect(badStirRes.checks.dateOk).toBe(false);
    expect(badStirRes.issues.some((i) => i.code === "invalid_stir")).toBe(true);
    expect(badStirRes.issues.some((i) => i.code === "invalid_date")).toBe(true);
  });

  it("ensures ai-reconcile uses aiSuggested ('AI taklifi') instead of misleading aiVerified", () => {
    const routeCode = fs.readFileSync(
      path.join(process.cwd(), "app", "api", "ai-reconcile", "route.ts"),
      "utf8"
    );
    expect(routeCode).toContain("aiSuggested: true");
    expect(routeCode).not.toContain("aiVerified: true");

    const uzDict = getReconcileErpDict("uz").reconcile;
    const ruDict = getReconcileErpDict("ru").reconcile;
    const enDict = getReconcileErpDict("en").reconcile;

    expect(uzDict.aiVerifiedNote.toLowerCase()).toContain("ai taklifi");
    expect(ruDict.aiVerifiedNote.toLowerCase()).toContain("предложение ии");
    expect(enDict.aiVerifiedNote.toLowerCase()).toContain("ai suggestion");
  });
});
