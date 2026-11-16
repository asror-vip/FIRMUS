/**
 * Pure Uzbekistan BHMS financial calculation helpers (VAT 12%, payroll, rounding).
 * Uses integer-tiyin rounding (or 4-decimal precision matching PostgreSQL NUMERIC(19,4)).
 */

export function roundMoney(val: number, decimals = 2): number {
  if (!Number.isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  const sign = val < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(val) + Number.EPSILON) * factor)) / factor;
}

/**
 * Splits a VAT-inclusive gross amount into Net Base + 12% VAT (standard Uzbekistan VAT rate).
 * Ensures Net + VAT === Gross exactly down to 0.01 UZS.
 */
export function splitVatInclusive(grossAmount: number, vatRatePercent = 12): {
  gross: number;
  net: number;
  vat: number;
} {
  if (!Number.isFinite(grossAmount) || !Number.isFinite(vatRatePercent)) {
    return { gross: 0, net: 0, vat: 0 };
  }
  const gross = roundMoney(Math.max(0, grossAmount));
  if (gross <= 0 || vatRatePercent <= 0) {
    return { gross, net: gross, vat: 0 };
  }
  const vat = roundMoney((gross * vatRatePercent) / (100 + vatRatePercent));
  const net = roundMoney(gross - vat);
  return { gross, net, vat };
}

/**
 * Adds VAT to a net exclusive amount: Net Base + VAT = Gross Total.
 * Ensures Net + VAT === Gross exactly down to 0.01 UZS.
 */
export function addVatExclusive(netAmount: number, vatRatePercent = 12): {
  gross: number;
  net: number;
  vat: number;
} {
  if (!Number.isFinite(netAmount) || !Number.isFinite(vatRatePercent)) {
    return { gross: 0, net: 0, vat: 0 };
  }
  const net = roundMoney(Math.max(0, netAmount));
  if (net <= 0 || vatRatePercent <= 0) {
    return { gross: net, net, vat: 0 };
  }
  const vat = roundMoney((net * vatRatePercent) / 100);
  const gross = roundMoney(net + vat);
  return { gross, net, vat };
}

export function calculatePayrollContributions(grossSalary: number): {
  gross: number;
  jshds12: number;
  socialTax12: number;
  netPay: number;
} {
  if (!Number.isFinite(grossSalary)) {
    return { gross: 0, jshds12: 0, socialTax12: 0, netPay: 0 };
  }
  const gross = roundMoney(Math.max(0, grossSalary));
  const jshds12 = roundMoney(gross * 0.12);
  const socialTax12 = roundMoney(gross * 0.12);
  const netPay = roundMoney(gross - jshds12);
  return { gross, jshds12, socialTax12, netPay };
}
