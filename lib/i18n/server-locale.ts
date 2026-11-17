export type Locale = "uz" | "ru" | "en";

export interface RequestLocaleLike {
  cookies?: {
    get(name: string): { value: string } | undefined;
  };
  headers?: {
    get(name: string): string | null;
  };
}

export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "uz" || normalized === "ru" || normalized === "en") {
    return normalized;
  }
  return null;
}

export function parseCookieLocale(cookieHeader: string | null | undefined, cookieName = "firmus_lang"): Locale | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const eqIndex = part.indexOf("=");
    if (eqIndex === -1) continue;
    const key = part.slice(0, eqIndex).trim();
    if (key !== cookieName) continue;
    const rawValue = part.slice(eqIndex + 1).trim();
    try {
      const decoded = decodeURIComponent(rawValue);
      const locale = normalizeLocale(decoded);
      if (locale) return locale;
    } catch {
      const locale = normalizeLocale(rawValue);
      if (locale) return locale;
    }
  }
  return null;
}

export function parseAcceptLanguageLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return "uz";
  const segments = acceptLanguage.split(",");
  for (const segment of segments) {
    const langTag = segment.split(";")[0]?.trim().toLowerCase();
    if (!langTag) continue;
    if (langTag.startsWith("uz")) return "uz";
    if (langTag.startsWith("ru")) return "ru";
    if (langTag.startsWith("en")) return "en";
  }
  return "uz";
}

export function getRequestLocale(req?: RequestLocaleLike | null): Locale {
  if (!req) return "uz";

  const fromCookieObj = normalizeLocale(req.cookies?.get("firmus_lang")?.value);
  if (fromCookieObj) return fromCookieObj;

  const fromHeader = normalizeLocale(req.headers?.get("x-firmus-lang"));
  if (fromHeader) return fromHeader;

  const fromCookieHeader = parseCookieLocale(req.headers?.get("cookie"));
  if (fromCookieHeader) return fromCookieHeader;

  return parseAcceptLanguageLocale(req.headers?.get("accept-language"));
}

export function getLocaleFromBrowserCookie(): Locale {
  if (typeof document === "undefined") return "uz";
  return parseCookieLocale(document.cookie) || "uz";
}
