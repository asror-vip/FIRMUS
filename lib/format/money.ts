export function formatMoney(
  amount: number | string,
  options?: {
    currency?: string;
    showSign?: boolean;
    compact?: boolean;
  }
): string {
  const { currency = "soʻm", showSign = false, compact = false } = options || {};
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (typeof num !== "number" || Number.isNaN(num)) return `0 ${currency}`;

  const sign = showSign && num > 0 ? "+" : "";

  if (compact) {
    if (Math.abs(num) >= 1_000_000_000) {
      return `${sign}${(num / 1_000_000_000).toFixed(1)} mlrd ${currency}`;
    }
    if (Math.abs(num) >= 1_000_000) {
      return `${sign}${(num / 1_000_000).toFixed(1)} mln ${currency}`;
    }
    if (Math.abs(num) >= 1_000) {
      return `${sign}${(num / 1_000).toFixed(0)} ming ${currency}`;
    }
  }

  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);

  return `${sign}${formatted} ${currency}`;
}
