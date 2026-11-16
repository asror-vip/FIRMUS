import { describe, it, expect } from "vitest";
import { roundMoney, splitVatInclusive, calculatePayrollContributions } from "@/lib/utils/finance";

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

  it("handles zero or negative amounts safely", () => {
    const res = splitVatInclusive(-500, 12);
    expect(res).toEqual({ gross: 0, net: 0, vat: 0 });
  });

  it("computes Uzbekistan 12% JShDS and 12% Social Tax payroll breakdown", () => {
    const payroll = calculatePayrollContributions(10_000_000);
    expect(payroll.jshds12).toBe(1_200_000);
    expect(payroll.socialTax12).toBe(1_200_000);
    expect(payroll.netPay).toBe(8_800_000);
  });
});
