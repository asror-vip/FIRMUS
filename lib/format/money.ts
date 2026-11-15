export function formatMoney(
  amount: number | string,
  options?: {
    currency?: string;
    showSign?: boolean;
    compact?: boolean;
  }
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 soʻm";

  const { currency = "soʻm", showSign = false, compact = false } = options || {};

  if (compact) {
    if (Math.abs(num) >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(1)} mlrd ${currency}`;
    }
    if (Math.abs(num) >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)} mln ${currency}`;
    }
    if (Math.abs(num) >= 1_000) {
      return `${(num / 1_000).toFixed(0)} ming ${currency}`;
    }
  }

  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);

  const sign = showSign && num > 0 ? "+" : "";
  return `${sign}${formatted} ${currency}`;
}
