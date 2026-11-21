import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/auth/admin-guard";

/**
 * Lightweight presence heartbeat for authenticated non-admin users.
 * Updates `subscriptions.updated_at` so `/admin` accurately reflects live Online/Offline status.
 */
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    if (isAdminEmail(user.email)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const svc = createServiceClient();
    const nowIso = new Date().toISOString();

    const { data: existing } = await svc
      .from("subscriptions")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await svc
        .from("subscriptions")
        .update({ updated_at: nowIso })
        .eq("user_id", user.id);
    } else {
      await svc.from("subscriptions").upsert(
        {
          user_id: user.id,
          plan_id: "starter",
          status: "active",
          preferred_model: "gemini-3.8-flash",
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
