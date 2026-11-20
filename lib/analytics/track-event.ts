export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "tool_used",
  "register_clicked",
  "registered",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
export type AnalyticsLocale = "uz" | "ru" | "en";

export interface AnalyticsEventPayload {
  eventName: AnalyticsEventName;
  pagePath: string;
  toolName?: string;
  locale?: AnalyticsLocale;
}

const ALLOWED_KEYS = new Set(["eventName", "pagePath", "toolName", "locale"]);
const ALLOWED_EVENTS = new Set<string>(ANALYTICS_EVENT_NAMES);
const ALLOWED_LOCALES = new Set<string>(["uz", "ru", "en"]);
const TOOL_NAME_REGEX = /^[a-z0-9_-]+$/i;

export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Zero-dependency strict validator for non-PII analytics events.
 * Keeps `zod` (~27 kB gzipped) out of public guest & auth bundles while enforcing
 * identical strict allow-list and PII-rejection guarantees.
 */
export const analyticsEventSchema = {
  safeParse(input: unknown): SafeParseResult<AnalyticsEventPayload> {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return { success: false, error: "Payload must be a plain object" };
    }

    const record = input as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (!ALLOWED_KEYS.has(key)) {
        return { success: false, error: `Unknown field: ${key}` };
      }
    }

    const { eventName, pagePath, toolName, locale } = record;

    if (typeof eventName !== "string" || !ALLOWED_EVENTS.has(eventName)) {
      return { success: false, error: "Invalid eventName" };
    }

    if (typeof pagePath !== "string") {
      return { success: false, error: "Invalid pagePath" };
    }
    const trimmedPath = pagePath.trim();
    if (
      trimmedPath.length < 1 ||
      trimmedPath.length > 120 ||
      !trimmedPath.startsWith("/") ||
      trimmedPath.includes("?") ||
      trimmedPath.includes("@")
    ) {
      return {
        success: false,
        error: "pagePath must be a clean internal path without query params or PII",
      };
    }

    let normalizedToolName: string | undefined;
    if (toolName !== undefined) {
      if (typeof toolName !== "string") {
        return { success: false, error: "Invalid toolName" };
      }
      const trimmedTool = toolName.trim();
      if (trimmedTool.length > 64 || !TOOL_NAME_REGEX.test(trimmedTool)) {
        return {
          success: false,
          error: "toolName must be an alphanumeric identifier",
        };
      }
      normalizedToolName = trimmedTool;
    }

    let normalizedLocale: AnalyticsLocale | undefined;
    if (locale !== undefined) {
      if (typeof locale !== "string" || !ALLOWED_LOCALES.has(locale)) {
        return { success: false, error: "Invalid locale" };
      }
      normalizedLocale = locale as AnalyticsLocale;
    }

    const data: AnalyticsEventPayload = {
      eventName: eventName as AnalyticsEventName,
      pagePath: trimmedPath,
    };
    if (normalizedToolName !== undefined) data.toolName = normalizedToolName;
    if (normalizedLocale !== undefined) data.locale = normalizedLocale;

    return { success: true, data };
  },
};

export const PUBLIC_GUEST_PAGE_PREFIXES = [
  "/welcome",
  "/calculators",
  "/try",
] as const;

export function isPublicGuestRoute(pathname: string): boolean {
  return (
    PUBLIC_GUEST_PAGE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    pathname === "/api/events"
  );
}

/**
 * Lightweight, non-blocking client-side event tracker (zero PII).
 * Safe to call in guest and authenticated pages without touching Gemini or user data.
 */
export function trackEvent(payload: AnalyticsEventPayload): void {
  if (typeof window === "undefined") return;

  const parsed = analyticsEventSchema.safeParse(payload);
  if (!parsed.success) return;

  const body = JSON.stringify(parsed.data);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/events", blob)) {
        return;
      }
    }
  } catch {
    // Fallback to keepalive fetch
  }

  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never break UX on analytics failure
  }
}
