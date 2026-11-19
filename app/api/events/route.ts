import { NextRequest, NextResponse } from "next/server";
import { analyticsEventSchema } from "@/lib/analytics/track-event";
import { createServiceClient } from "@/lib/supabase/service";
import { checkBurstRateLimit } from "@/lib/ai/subscription-guard";

function getClientKey(request: NextRequest): string {
  const ip =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anon";
  return `events:${ip}`;
}

export async function POST(request: NextRequest) {
  try {
    const rate = checkBurstRateLimit(getClientKey(request), 30);
    if (!rate.allowed) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = analyticsEventSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid event payload" }, { status: 400 });
    }

    const { eventName, pagePath, toolName, locale } = parsed.data;

    try {
      const admin = createServiceClient();
      const { error } = await admin.from("analytics_events").insert({
        event_name: eventName,
        page_path: pagePath,
        tool_name: toolName ?? null,
        locale: locale ?? null,
      });

      if (error) {
        // Table may not be migrated in local dev yet — fail soft so guest UX never breaks
        return NextResponse.json({ ok: true, stored: false });
      }
    } catch {
      return NextResponse.json({ ok: true, stored: false });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
