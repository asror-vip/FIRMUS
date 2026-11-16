/**
 * Pure phone normalization, PINFL masking, and AI depersonalization utilities.
 */

export function normalizeUzPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 9 && /^(9\d|33|55|77|88|71|78|20|50)/.test(digits)) {
    return `998${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("998")) {
    return digits;
  }
  return null;
}

export function formatUzPhoneDisplay(normalized: string): string {
  const digits = normalized.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("998")) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10, 12)}`;
  }
  return normalized;
}

export function maskPinfl(pinfl: string): string {
  const clean = (pinfl || "").replace(/\D/g, "");
  if (clean.length !== 14) return clean || "—";
  return `${clean.slice(0, 4)}••••••${clean.slice(10, 14)}`;
}

/**
 * Strips sensitive Uzbek PII/commercial identifiers (PINFL, STIR, 20-digit bank accounts, phones)
 * before sending payloads to external LLM providers (O'RQ-547 compliance).
 */
export function depersonalizeForAi<T>(payload: T): T {
  const raw = JSON.stringify(payload);
  const sanitized = raw
    .replace(/\b\d{20}\b/g, "[BANK_HISOB_MASKED]")
    .replace(/\b\d{14}\b/g, "[PINFL_MASKED]")
    .replace(/\+?998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g, "[TELEFON_MASKED]")
    .replace(/\b[3]\d{8}\b/g, "[STIR_MASKED]");
  return JSON.parse(sanitized) as T;
}
