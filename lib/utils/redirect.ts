const INTERNAL_ORIGIN = "https://app.firmus.local";
const CONTROL_CHARS_RE = /[\r\n\t\x00-\x1f\x7f]/;

/**
 * Validates and normalizes an internal redirect target, rejecting open-redirect
 * payloads (external origins, protocol-relative //, backslash /\, control chars).
 */
export function sanitizeInternalRedirect(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") {
    return "/";
  }

  if (
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    raw.startsWith("/\\") ||
    CONTROL_CHARS_RE.test(raw)
  ) {
    return "/";
  }

  try {
    const parsed = new URL(raw, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) {
      return "/";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
