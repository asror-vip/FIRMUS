import { describe, it, expect } from "vitest";
import { getConfiguredAdminEmails, isAdminEmail } from "@/lib/auth/admin-guard";

describe("Admin Guard (fail-closed email allow-list)", () => {
  it("fails closed when ADMIN_EMAILS is unset or empty", () => {
    expect(getConfiguredAdminEmails("")).toEqual([]);
    expect(getConfiguredAdminEmails(undefined)).toEqual([]);
    expect(isAdminEmail("founder@firmus.uz", "")).toBe(false);
    expect(isAdminEmail("founder@firmus.uz", undefined)).toBe(false);
  });

  it("matches configured admin emails case-insensitively and rejects non-admins", () => {
    const envList = " Founder@Firmus.uz , backup@firmus.uz ";
    expect(getConfiguredAdminEmails(envList)).toEqual([
      "founder@firmus.uz",
      "backup@firmus.uz",
    ]);

    expect(isAdminEmail("founder@firmus.uz", envList)).toBe(true);
    expect(isAdminEmail("FOUNDER@FIRMUS.UZ", envList)).toBe(true);
    expect(isAdminEmail("backup@firmus.uz", envList)).toBe(true);

    expect(isAdminEmail("random@gmail.com", envList)).toBe(false);
    expect(isAdminEmail("", envList)).toBe(false);
    expect(isAdminEmail(null, envList)).toBe(false);
  });
});
