import { describe, it, expect } from "vitest";
import {
  TAX_ESTIMATE_DISCLAIMER,
  applyAccountantRowOverride,
  computePeriodTurnoverAndTax,
  extractTaxSourceRows,
} from "@/lib/services/turnover-tax-engine";
import type { ParsedBankTransaction } from "@/lib/services/bank-import";

const baseItem = (
  overrides: Partial<ParsedBankTransaction>
): ParsedBankTransaction => ({
  date: "2026-11-10",
  counterparty: "KONTRAGENT MCHJ",
  amount: 10_000_000,
  type: "income",
  description: "Shartnoma tolov",
  accountCode: "4010",
  accountName: "Xaridorlar",
  ...overrides,
});

describe("Stage 4: Deterministic Turnover & Tax Engine from Documents", () => {
  it("separates taxable revenue from credit, own transfer, refund, loan, and ambiguous rows", () => {
    const items: ParsedBankTransaction[] = [
      baseItem({ amount: 200_000_000, description: "Shartnoma №5 tovar sotuvi" }),
      baseItem({ amount: 100_000_000, description: "Bank krediti transh №1" }),
      baseItem({
        amount: 50_000_000,
        counterpartyStir: "305000111",
        description: "Hisobdan pul tushumi",
      }),
      baseItem({ amount: 15_000_000, description: "Bekor qilingan buyurtma qaytarilgan pul vozvrat" }),
      baseItem({ amount: 30_000_000, description: "Ta'sischidan foizsiz qarz shartnoma" }),
      baseItem({ amount: 20_000_000, description: "Otkazma 99" }),
      baseItem({ amount: 12_000_000, type: "expense", description: "Ofis ijarasi" }),
    ];

    const rows = extractTaxSourceRows({
      items,
      sourceType: "bank",
      fileName: "bank_nov.xlsx",
      entityStir: "305000111",
    });

    expect(rows[0].category).toBe("taxable_revenue");
    expect(rows[0].includeInTurnover).toBe(true);
    expect(rows[0].needsConfirmation).toBe(false);

    expect(rows[1].category).toBe("non_revenue_credit");
    expect(rows[1].includeInTurnover).toBe(false);
    expect(rows[1].needsConfirmation).toBe(true);

    // Detected by matching entity STIR!
    expect(rows[2].category).toBe("non_revenue_own_transfer");
    expect(rows[2].includeInTurnover).toBe(false);
    expect(rows[2].needsConfirmation).toBe(true);

    expect(rows[3].category).toBe("non_revenue_refund");
    expect(rows[3].includeInTurnover).toBe(false);
    expect(rows[3].needsConfirmation).toBe(true);

    expect(rows[4].category).toBe("non_revenue_loan");
    expect(rows[4].includeInTurnover).toBe(false);
    expect(rows[4].needsConfirmation).toBe(true);

    expect(rows[5].category).toBe("ambiguous");
    expect(rows[5].needsConfirmation).toBe(true);

    expect(rows[6].category).toBe("expense");
    expect(rows[6].includeInTurnover).toBe(false);
  });

  it("calculates YaTT 1% tax, 92% critical threshold warning, remaining limit, and exact trace IDs", () => {
    const rows = extractTaxSourceRows({
      items: [
        baseItem({ amount: 120_000_000, description: "Tovar sotuvi tushumi" }),
        baseItem({ amount: 80_000_000, description: "Bank krediti" }),
      ],
      sourceType: "bank",
      fileName: "yatt_bank.xlsx",
    });

    const res = computePeriodTurnoverAndTax({
      rows,
      profile: {
        taxpayerStatus: "yatt",
        taxRegime: "turnover_tax",
        isVatPayer: false,
      },
      priorYtdTurnoverUzs: 800_000_000, // 800M + 120M = 920M = 92% of 1B!
      effectiveDate: "2026-11-10",
    });

    expect(res.periodTurnoverUzs).toBe(120_000_000);
    expect(res.excludedNonRevenueUzs).toBe(80_000_000);
    expect(res.cumulativeYtdTurnoverUzs).toBe(920_000_000);
    expect(res.appliedRatePercent).toBe(1);
    expect(res.estimatedTaxUzs).toBe(1_200_000); // 1% of 120M ONLY
    expect(res.annualThresholdUzs).toBe(1_000_000_000);
    expect(res.remainingToThresholdUzs).toBe(80_000_000);
    expect(res.thresholdUsagePercent).toBe(92);
    expect(res.thresholdAlertLevel).toBe("critical");
    expect(res.thresholdWarningText).toContain("92%");
    expect(res.disclaimer).toBe(TAX_ESTIMATE_DISCLAIMER);

    // Provenance trace check: included row sums match periodTurnoverUzs exactly
    const tracedSum = rows
      .filter((r) => res.trace.includedRevenueRowIds.includes(r.id))
      .reduce((acc, r) => acc + r.amount, 0);
    expect(tracedSum).toBe(res.periodTurnoverUzs);
  });

  it("allows accountant override on any row and recalculates immediately", () => {
    const rows = extractTaxSourceRows({
      items: [
        baseItem({ amount: 50_000_000, description: "Shartnoma xizmat tolov" }),
        baseItem({ amount: 25_000_000, description: "Qaytarilgan pul vozvrat" }),
      ],
      sourceType: "didox",
      fileName: "didox.xlsx",
    });

    // Accountant decides row 2 was actually taxable revenue
    const updated = rows.map((r, idx) =>
      idx === 1 ? applyAccountantRowOverride(r, "taxable_revenue") : r
    );

    const res = computePeriodTurnoverAndTax({
      rows: updated,
      profile: {
        taxpayerStatus: "self_employed",
        taxRegime: "turnover_tax",
        isVatPayer: false,
      },
      effectiveDate: "2026-11-10",
    });

    expect(res.periodTurnoverUzs).toBe(75_000_000);
    expect(res.appliedRatePercent).toBe(1);
    expect(res.estimatedTaxUzs).toBe(750_000);
    expect(res.unconfirmedCount).toBe(0);
    expect(updated[1].classificationSource).toBe("accountant");
  });

  it("handles LLC 4% (12,000 BHM = 5.28B UZS) and VAT payer (12%) regimes accurately", () => {
    const rows = extractTaxSourceRows({
      items: [baseItem({ amount: 280_000_000, description: "Hisob-faktura sotuv" })],
      sourceType: "didox",
      fileName: "didox_llc.xlsx",
    });

    // LLC turnover 4% reaching >100% of 5.28B threshold
    const llcExceeded = computePeriodTurnoverAndTax({
      rows,
      profile: {
        taxpayerStatus: "llc",
        taxRegime: "turnover_tax",
        isVatPayer: false,
      },
      priorYtdTurnoverUzs: 5_100_000_000,
      effectiveDate: "2026-11-10",
    });

    expect(llcExceeded.appliedRatePercent).toBe(4);
    expect(llcExceeded.estimatedTaxUzs).toBe(11_200_000);
    expect(llcExceeded.annualThresholdBhm).toBe(12_000);
    expect(llcExceeded.annualThresholdUzs).toBe(5_280_000_000);
    expect(llcExceeded.thresholdAlertLevel).toBe("exceeded");
    expect(llcExceeded.remainingToThresholdUzs).toBe(0);

    // LLC VAT payer 12%
    const llcVat = computePeriodTurnoverAndTax({
      rows: extractTaxSourceRows({
        items: [baseItem({ amount: 112_000_000, description: "Hisob-faktura QQS 12%" })],
        sourceType: "didox",
        fileName: "didox_vat.xlsx",
      }),
      profile: {
        taxpayerStatus: "llc",
        taxRegime: "vat_profit_tax",
        isVatPayer: true,
      },
      effectiveDate: "2026-11-10",
    });

    expect(llcVat.appliedRatePercent).toBe(12);
    expect(llcVat.estimatedVatUzs).toBe(12_000_000);
    expect(llcVat.estimatedTaxUzs).toBe(12_000_000);
    expect(llcVat.disclaimer).toBe(TAX_ESTIMATE_DISCLAIMER);
  });
});
