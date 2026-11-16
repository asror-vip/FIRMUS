import { describe, it, expect } from "vitest";
import {
  roundMoney,
  splitVatInclusive,
  addVatExclusive,
  calculatePayrollContributions,
} from "@/lib/utils/finance";
import { formatMoney } from "@/lib/format/money";
import {
  calculateCorporateTaxUz,
  calculateDividendTaxUz,
  calculateVacationPayUz,
} from "@/lib/services/uz-tax-calculator";

describe("BHMS Financial Arithmetic", () => {
  it("splits 12% VAT-inclusive amounts accurately without rounding drift", () => {
    const res = splitVatInclusive(112_000_000, 12);
    expect(res.gross).toBe(112_000_000);
    expect(res.vat).toBe(12_000_000);
    expect(res.net).toBe(100_000_000);
    expect(roundMoney(res.net + res.vat)).toBe(res.gross);
  });

  it("handles fractional VAT sums while preserving Net + VAT === Gross", () => {
    const res = splitVatInclusive(15_450_123.45, 12);
    expect(roundMoney(res.net + res.vat)).toBe(res.gross);
    expect(res.vat).toBeGreaterThan(0);
    expect(res.net).toBeGreaterThan(0);
  });

  it("handles zero, negative, and non-finite amounts safely in VAT functions", () => {
    expect(splitVatInclusive(-500, 12)).toEqual({ gross: 0, net: 0, vat: 0 });
    expect(splitVatInclusive(NaN, 12)).toEqual({ gross: 0, net: 0, vat: 0 });
    expect(splitVatInclusive(1000, NaN)).toEqual({ gross: 0, net: 0, vat: 0 });

    expect(addVatExclusive(100_000_000, 12)).toEqual({
      gross: 112_000_000,
      net: 100_000_000,
      vat: 12_000_000,
    });
    expect(addVatExclusive(NaN, 12)).toEqual({ gross: 0, net: 0, vat: 0 });
    expect(addVatExclusive(-500, 12)).toEqual({ gross: 0, net: 0, vat: 0 });
  });

  it("handles sign-aware rounding and non-finite inputs in roundMoney", () => {
    expect(roundMoney(NaN)).toBe(0);
    expect(roundMoney(Infinity)).toBe(0);
    expect(roundMoney(-Infinity)).toBe(0);
    expect(roundMoney(-125.456, 2)).toBe(-125.46);
    expect(roundMoney(125.454, 2)).toBe(125.45);
    expect(roundMoney(125.455, 2)).toBe(125.46);
    expect(roundMoney(-125.455, 2)).toBe(-125.46);
  });

  it("computes Uzbekistan 12% JShDS and 12% Social Tax payroll breakdown", () => {
    const payroll = calculatePayrollContributions(10_000_000);
    expect(payroll.jshds12).toBe(1_200_000);
    expect(payroll.socialTax12).toBe(1_200_000);
    expect(payroll.netPay).toBe(8_800_000);

    const invalid = calculatePayrollContributions(NaN);
    expect(invalid).toEqual({ gross: 0, jshds12: 0, socialTax12: 0, netPay: 0 });
  });

  it("calculates Corporate Profit Tax (15%) and Dividend Tax (5% / 10%) per Soliq kodeksi", () => {
    const corp = calculateCorporateTaxUz({ taxableProfit: 100_000_000 });
    expect(corp.tax).toBe(15_000_000);
    expect(corp.netProfitAfterTax).toBe(85_000_000);
    expect(corp.provodka).toHaveLength(2);

    const corpCustom = calculateCorporateTaxUz({ taxableProfit: 100_000_000, ratePercent: 20 });
    expect(corpCustom.tax).toBe(20_000_000);

    const resDiv = calculateDividendTaxUz({ grossDividend: 50_000_000, isNonResident: false });
    expect(resDiv.ratePercent).toBe(5);
    expect(resDiv.tax).toBe(2_500_000);
    expect(resDiv.netDividend).toBe(47_500_000);

    const nonResDiv = calculateDividendTaxUz({ grossDividend: 50_000_000, isNonResident: true });
    expect(nonResDiv.ratePercent).toBe(10);
    expect(nonResDiv.tax).toBe(5_000_000);
    expect(nonResDiv.netDividend).toBe(45_000_000);

    // Guard non-finite inputs
    expect(calculateCorporateTaxUz({ taxableProfit: NaN }).tax).toBe(0);
    expect(calculateDividendTaxUz({ grossDividend: NaN }).tax).toBe(0);
  });

  it("calculates vacation pay with safe days capping and unrounded tiyin precision", () => {
    const vac = calculateVacationPayUz({ monthlySalary: 5_080_000, days: 21 });
    expect(vac.dailyRate).toBe(200_000);
    expect(vac.grossVacation).toBe(4_200_000);

    // Test fallback to 21 when days is NaN/invalid
    const vacDefault = calculateVacationPayUz({ monthlySalary: 5_080_000 });
    expect(vacDefault.days).toBe(21);
    expect(vacDefault.grossVacation).toBe(4_200_000);
  });

  it("formats money correctly including compact mode with showSign and NaN handling", () => {
    expect(formatMoney(5_000_000, { compact: true, showSign: true })).toBe("+5.0 mln soʻm");
    expect(formatMoney(1_500_000_000, { compact: true, showSign: true })).toBe("+1.5 mlrd soʻm");
    expect(formatMoney(50_000, { compact: true, showSign: true })).toBe("+50 ming soʻm");
    expect(formatMoney(-5_000_000, { compact: true, showSign: true })).toBe("-5.0 mln soʻm");
    expect(formatMoney(NaN, { currency: "USD" })).toBe("0 USD");
    expect(formatMoney("invalid")).toBe("0 soʻm");
  });
});
