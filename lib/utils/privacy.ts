/**
 * Pure phone normalization, PINFL/card masking, and O'RQ-547 AI depersonalization utilities.
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

export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== "string") return "—";
  const trimmed = email.trim();
  if (!trimmed) return "—";
  const atIdx = trimmed.indexOf("@");
  if (atIdx <= 0 || atIdx === trimmed.length - 1) return trimmed;

  const user = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx);

  if (user.length <= 2) {
    return `${user[0]}***${domain}`;
  }
  const prefix = user.length >= 4 ? user.slice(0, 2) : user.slice(0, 1);
  return `${prefix}***${user.slice(-1)}${domain}`;
}

/**
 * Strips 20-digit bank accounts, 16-digit bank card numbers (Uzcard/Humo/Visa/Mastercard),
 * 14-digit PINFLs, +998 phones, passport numbers, email addresses, and corporate STIR tokens from string values.
 */
export function sanitizeStringForAi(value: string): string {
  return value
    .replace(/\b\d{20}\b/g, "[BANK_HISOB_MASKED]")
    .replace(/\b(?:8600|9860|5614|6262|4\d{3}|5[1-5]\d{2})[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[KARTA_MASKED]")
    .replace(/\b\d{14}\b/g, "[PINFL_MASKED]")
    .replace(/\+?998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g, "[TELEFON_MASKED]")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_MASKED]")
    .replace(/\b[A-Z]{2}\d{7}\b/g, "[PASSPORT_MASKED]")
    .replace(/(?<!\d)[23]\d{8}(?!\d)(?!\s*(?:so['ʻ’]?m|som|uzs|сум|tiyin))/gi, "[STIR_MASKED]");
}

function sanitizeNodeForAi(node: unknown, keyHint = ""): unknown {
  if (node === null || node === undefined) return node;

  const lowerKey = keyHint.toLowerCase();
  if (lowerKey.includes("password") || lowerKey.includes("secret") || lowerKey.includes("token")) {
    return "[REDACTED]";
  }
  if (lowerKey.includes("pinfl")) {
    return "[PINFL_MASKED]";
  }
  if (lowerKey.includes("phone") || lowerKey.includes("mobile")) {
    return "[TELEFON_MASKED]";
  }
  if (lowerKey.includes("email")) {
    return "[EMAIL_MASKED]";
  }
  if (lowerKey === "tin" || lowerKey.includes("stir")) {
    return "[STIR_MASKED]";
  }

  // Never alter numeric financial balances/amounts (e.g., 325000000 UZS)
  if (typeof node === "number" || typeof node === "boolean") {
    return node;
  }

  if (typeof node === "string") {
    return sanitizeStringForAi(node);
  }

  if (Array.isArray(node)) {
    return node.map((item) => sanitizeNodeForAi(item));
  }

  if (node instanceof Date) {
    return node.toISOString();
  }

  if (typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = sanitizeNodeForAi(v, k);
    }
    return out;
  }

  return node;
}

/**
 * Strips sensitive Uzbek PII/commercial identifiers (PINFL, STIR, 20-digit bank accounts,
 * 16-digit cards, phones, tokens) before sending payloads to external LLM providers (O'RQ-547 compliance)
 * without altering numeric money amounts.
 */
export function depersonalizeForAi<T>(payload: T): T {
  return sanitizeNodeForAi(payload) as T;
}
