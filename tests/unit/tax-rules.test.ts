import { describe, it, expect } from "vitest";
import {
  UZ_TAX_RULES_VERSIONS,
  LEX_UZ_TAX_CODE_URL,
  resolveUzTaxRules,
  getTurnoverRuleForStatus,
  getTaxRuleEntries,
  getUnverifiedTaxRules,
  getTurnoverRateRangeLabel,
  buildTaxRulesSummaryForAi,
  calculateTurnoverTaxUz,
  calculateVatUz,
  calculateCorporateTaxUz,
  calculateDividendTaxUz,
  calculateVacationPayUz,
  type TaxpayerStatus,
} from "@/lib/services/uz-tax-calculator";

describe("Uzbekistan Versioned Tax Rules (Single Source of Truth)", () => {
  it("resolves exact historical and 2026 rule versions by effective date", () => {
    const r2025 = resolveUzTaxRules("2025-07-01");
    expect(r2025.versionId).toBe("UZ-SK-2025.1");
    expect(r2025.fixedTaxAbolishedForYatt).toBe(false);
    expect(r2025.vatMandatoryThresholdUzs).toBe(1_000_000_000);
    expect(r2025.turnoverRates.ecommerce).toBe(0.02);

    const r2026Jan = resolveUzTaxRules("2026-03-15");
    expect(r2026Jan.versionId).toBe("UZ-SK-2026.1");
    expect(r2026Jan.fixedTaxAbolishedForYatt).toBe(true);
    expect(r2026Jan.bhmUzs).toBe(412_000);
    expect(r2026Jan.vatMandatoryThresholdUzs).toBe(1_000_000_000);
    expect(r2026Jan.turnoverRates.ecommerce).toBe(0.04);

    const r2026Jun = resolveUzTaxRules("2026-07-10");
    expect(r2026Jun.versionId).toBe("UZ-SK-2026.2");
    expect(r2026Jun.bhmUzs).toBe(412_000);
    expect(r2026Jun.vatMandatoryThresholdBhm).toBe(12_000);
    expect(r2026Jun.vatMandatoryThresholdUzs).toBe(4_944_000_000);

    const r2026Sep = resolveUzTaxRules("2026-10-15");
    expect(r2026Sep.versionId).toBe("UZ-SK-2026.3");
    expect(r2026Sep.bhmUzs).toBe(440_000);
    expect(r2026Sep.vatMandatoryThresholdBhm).toBe(12_000);
    expect(r2026Sep.vatMandatoryThresholdUzs).toBe(5_280_000_000);
  });

  it("applies 1% turnover tax for YaTT and self-employed in 2026 (up to 1B UZS)", () => {
    const yatt = calculateTurnoverTaxUz({
      revenue: 500_000_000,
      taxpayerStatus: "yatt",
      effectiveDate: "2026-10-01",
    });
    expect(yatt.ratePercent).toBe(1);
    expect(yatt.tax).toBe(5_000_000);
    expect(yatt.netAfterTax).toBe(495_000_000);
    expect(yatt.annualThresholdUzs).toBe(1_000_000_000);
    expect(yatt.exceedsThreshold).toBe(false);
    expect(yatt.thresholdUsagePercent).toBe(50);
    expect(yatt.ruleNote).toContain("TASDIQLANMAGAN");

    const selfEmp = calculateTurnoverTaxUz({
      revenue: 1_200_000_000,
      taxpayerStatus: "self_employed",
      effectiveDate: "2026-10-01",
    });
    expect(selfEmp.ratePercent).toBe(1);
    expect(selfEmp.tax).toBe(12_000_000);
    expect(selfEmp.exceedsThreshold).toBe(true);
    expect(selfEmp.thresholdUsagePercent).toBe(120);
  });

  it("applies 4% turnover tax for LLC and enforces date-dependent VAT threshold (1B -> 4.944B -> 5.28B)", () => {
    const llcMar = calculateTurnoverTaxUz({
      revenue: 2_000_000_000,
      taxpayerStatus: "llc",
      effectiveDate: "2026-03-15",
    });
    expect(llcMar.ratePercent).toBe(4);
    expect(llcMar.tax).toBe(80_000_000);
    expect(llcMar.annualThresholdUzs).toBe(1_000_000_000);
    expect(llcMar.exceedsThreshold).toBe(true);

    const llcJulUnder = calculateTurnoverTaxUz({
      revenue: 2_000_000_000,
      taxpayerStatus: "llc",
      effectiveDate: "2026-07-10",
    });
    expect(llcJulUnder.annualThresholdUzs).toBe(4_944_000_000);
    expect(llcJulUnder.annualThresholdBhm).toBe(12_000);
    expect(llcJulUnder.exceedsThreshold).toBe(false);

    const llcJulOver = calculateTurnoverTaxUz({
      revenue: 5_000_000_000,
      taxpayerStatus: "llc",
      effectiveDate: "2026-07-10",
    });
    expect(llcJulOver.exceedsThreshold).toBe(true);

    const llcOctUnder = calculateTurnoverTaxUz({
      revenue: 5_000_000_000,
      taxpayerStatus: "llc",
      effectiveDate: "2026-10-01",
    });
    expect(llcOctUnder.annualThresholdUzs).toBe(5_280_000_000);
    expect(llcOctUnder.exceedsThreshold).toBe(false);
  });

  it("stores per-entry verificationStatus and individual lastVerifiedAt (never marking unverified rules as verified with one shared date)", () => {
    const statuses: TaxpayerStatus[] = ["llc", "yatt", "self_employed"];
    const uniqueVerifiedDates = new Set<string>();

    for (const version of Object.values(UZ_TAX_RULES_VERSIONS)) {
      expect(version.sourceUrl).toBe(LEX_UZ_TAX_CODE_URL);
      expect(version.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const st of statuses) {
        const rule = getTurnoverRuleForStatus(st, version.versionId);
        expect(rule.sourceUrl).toMatch(/^https:\/\/lex\.uz\//);
        expect(rule.legalRef.length).toBeGreaterThan(10);
        expect(rule.ratePercent).toBeGreaterThan(0);

        if (rule.verificationStatus === "verified") {
          expect(rule.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          uniqueVerifiedDates.add(rule.lastVerifiedAt!);
        } else {
          expect(rule.verificationStatus).toBe("unverified");
          expect(rule.lastVerifiedAt).toBeNull();
          expect(rule.note).toContain("TASDIQLANMAGAN");
        }
      }
    }

    // Multiple distinct per-rule verification dates exist (not one global hardcoded date)
    expect(uniqueVerifiedDates.size).toBeGreaterThanOrEqual(3);

    // 2026-06 and 2026 YaTT / self-employed PF-100 overlap rules must be explicitly unverified
    const yatt2026 = getTurnoverRuleForStatus("yatt", "2026-10-01");
    expect(yatt2026.verificationStatus).toBe("unverified");
    expect(yatt2026.lastVerifiedAt).toBeNull();

    const self2026 = getTurnoverRuleForStatus("self_employed", "2026-10-01");
    expect(self2026.verificationStatus).toBe("unverified");
    expect(self2026.lastVerifiedAt).toBeNull();

    // LLC 2026 turnover rule remains verified with its own date
    const llc2026 = getTurnoverRuleForStatus("llc", "2026-10-01");
    expect(llc2026.verificationStatus).toBe("verified");
    expect(llc2026.lastVerifiedAt).toBe("2026-09-10");

    // Helper functions expose unverified rules cleanly for UI banners
    expect(getTaxRuleEntries("2026-10-01")).toHaveLength(6);
    const unverified2026 = getUnverifiedTaxRules("2026-10-01");
    expect(unverified2026.map((r) => r.status).sort()).toEqual(["self_employed", "yatt"]);
    expect(getUnverifiedTaxRules("2025-07-01")).toHaveLength(0);
  });

  it("computes dynamic rate range labels and AI rule summary without stale hardcoded values", () => {
    expect(getTurnoverRateRangeLabel("2025")).toBe("4%");
    expect(getTurnoverRateRangeLabel("2026-10-01")).toBe("1%–4%");

    const aiSummary = buildTaxRulesSummaryForAi("2026-10-01");
    expect(aiSummary).toContain("UZ-SK-2026.3");
    expect(aiSummary).toContain("1%");
    expect(aiSummary).toContain("4%");
    expect(aiSummary).toContain("12,000 BHM");
    expect(aiSummary).toContain("440,000");
    expect(aiSummary).toContain("TASDIQLANMAGAN");
    expect(aiSummary).toContain(LEX_UZ_TAX_CODE_URL);
  });

  it("uses versioned rules consistently in VAT, Corporate, Dividend, and Vacation calculators", () => {
    const vat = calculateVatUz({ amount: 11_200_000, mode: "included", effectiveDate: "2026-10-01" });
    expect(vat.vatRatePercent).toBe(12);
    expect(vat.vatMandatoryThresholdUzs).toBe(5_280_000_000);
    expect(vat.taxRuleVersion).toBe("UZ-SK-2026.3");

    const corp = calculateCorporateTaxUz({ taxableProfit: 100_000_000, effectiveDate: "2026-10-01" });
    expect(corp.ratePercent).toBe(15);
    expect(corp.tax).toBe(15_000_000);
    expect(corp.taxRuleVersion).toBe("UZ-SK-2026.3");

    const divRes = calculateDividendTaxUz({ grossDividend: 10_000_000, isNonResident: false, effectiveDate: "2026-10-01" });
    expect(divRes.ratePercent).toBe(5);
    expect(divRes.tax).toBe(500_000);

    const vac = calculateVacationPayUz({ monthlySalary: 5_080_000, days: 21, effectiveDate: "2026-10-01" });
    expect(vac.taxRuleVersion).toBe("UZ-SK-2026.3");
    expect(vac.grossVacation).toBe(4_200_000);
    expect(vac.jshds12).toBe(504_000);
  });
});
