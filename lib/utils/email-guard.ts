const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "throwawaymail.com",
  "trashmail.com",
  "maildrop.cc",
  "getnada.com",
  "dispostable.com",
  "fakeinbox.com",
  "mintemail.com",
  "moakt.com",
  "emailondeck.com",
  "mohmal.com",
]);

/**
 * Normalizes an email address to its canonical root mailbox so tricks like
 * `a.b.c+promo@gmail.com` resolve to the same canonical identifier `abc@gmail.com`.
 */
export function canonicalizeEmail(rawEmail?: string | null): string {
  const clean = String(rawEmail || "").trim().toLowerCase();
  const atIdx = clean.lastIndexOf("@");
  if (atIdx <= 0) return clean;

  let local = clean.slice(0, atIdx);
  let domain = clean.slice(atIdx + 1);

  if (domain === "googlemail.com") {
    domain = "gmail.com";
  }

  // Strip sub-addressing (+tag) common across Gmail, Outlook, Yandex, Yahoo
  const plusIdx = local.indexOf("+");
  if (plusIdx !== -1) {
    local = local.slice(0, plusIdx);
  }

  // Gmail ignores dots in the local part
  if (domain === "gmail.com") {
    local = local.replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

export function isDisposableEmailDomain(rawEmail?: string | null): boolean {
  const clean = String(rawEmail || "").trim().toLowerCase();
  const atIdx = clean.lastIndexOf("@");
  if (atIdx <= 0) return false;
  const domain = clean.slice(atIdx + 1);
  return DISPOSABLE_DOMAINS.has(domain);
}
