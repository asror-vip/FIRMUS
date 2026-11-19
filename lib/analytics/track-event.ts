import { z } from "zod";

export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "tool_used",
  "register_clicked",
  "registered",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export const analyticsEventSchema = z
  .object({
    eventName: z.enum(ANALYTICS_EVENT_NAMES),
    pagePath: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .refine((v) => v.startsWith("/") && !v.includes("?") && !v.includes("@"), {
        message: "pagePath must be a clean internal path without query params or PII",
      }),
    toolName: z
      .string()
      .trim()
      .max(64)
      .regex(/^[a-z0-9_-]+$/i, "toolName must be an alphanumeric identifier")
      .optional(),
    locale: z.enum(["uz", "ru", "en"]).optional(),
  })
  .strict();

export type AnalyticsEventPayload = z.infer<typeof analyticsEventSchema>;

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
