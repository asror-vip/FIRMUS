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

function sanitizeStringForAi(value: string): string {
  return value
    .replace(/\b\d{20}\b/g, "[BANK_HISOB_MASKED]")
    .replace(/\b\d{14}\b/g, "[PINFL_MASKED]")
    .replace(/\+?998[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g, "[TELEFON_MASKED]")
    .replace(/\b[23]\d{8}\b/g, "[STIR_MASKED]");
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
 * Strips sensitive Uzbek PII/commercial identifiers (PINFL, STIR, 20-digit bank accounts, phones, tokens)
 * before sending payloads to external LLM providers (O'RQ-547 compliance) without altering numeric money amounts.
 */
export function depersonalizeForAi<T>(payload: T): T {
  return sanitizeNodeForAi(payload) as T;
}
