import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("workspaces").select("id").limit(1);

    if (error) {
      console.error("[HEALTH] Database check error:", error);
      return NextResponse.json(
        {
          status: "error",
          service: "firmus",
          database: "disconnected",
          error: "Database unavailable",
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        service: "firmus",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[HEALTH] Exception:", err);
    return NextResponse.json(
      {
        status: "error",
        service: "firmus",
        database: "disconnected",
        error: "Database unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
