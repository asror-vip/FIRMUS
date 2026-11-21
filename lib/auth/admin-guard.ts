import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Parses comma-separated ADMIN_EMAILS from environment.
 * Fail-closed: if ADMIN_EMAILS is unset or empty, nobody is considered an admin.
 */
export function getConfiguredAdminEmails(rawEnv = process.env.ADMIN_EMAILS): string[] {
  if (!rawEnv || typeof rawEnv !== "string") return [];
  return rawEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 3 && e.includes("@"));
}

export function isAdminEmail(
  email?: string | null,
  rawEnv = process.env.ADMIN_EMAILS
): boolean {
  if (!email || typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const allowed = getConfiguredAdminEmails(rawEnv);
  if (allowed.length === 0) return false;
  return allowed.includes(normalized);
}

export async function requireAdminUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return null;
  }

  return user;
}
