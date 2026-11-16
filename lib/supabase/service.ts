import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function createServiceClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("supabaseService is a server-only client and cannot be called in browser runtime.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Server konfiguratsiya xatosi: NEXT_PUBLIC_SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY topilmadi.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getServiceClient(): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createServiceClient();
  }
  return cachedClient;
}
