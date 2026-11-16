import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

const testConnectionSchema = z.object({
  apiUrl: z.string().trim().url("API manzili toʻgʻri URL formatida boʻlishi kerak (masalan, https://api.didox.uz)"),
  provider: z.string().optional(),
});

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower.endsWith(".local") ||
    lower.startsWith("169.254.") ||
    lower.startsWith("10.") ||
    lower.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)
  ) {
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Autentifikatsiya talab qilinadi" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = testConnectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { reachable: false, error: parsed.error.errors[0]?.message || "Notoʻgʻri URL" },
        { status: 400 }
      );
    }

    const urlObj = new URL(parsed.data.apiUrl);
    if (urlObj.protocol !== "https:" && urlObj.protocol !== "http:") {
      return NextResponse.json(
        { reachable: false, error: "Faqat HTTP yoki HTTPS protokoli qoʻllab-quvvatlanadi" },
        { status: 400 }
      );
    }

    if (isBlockedHostname(urlObj.hostname)) {
      return NextResponse.json(
        { reachable: false, error: "Ichki tarmoq (localhost/private IP) manzillariga soʻrov taqiqlangan" },
        { status: 403 }
      );
    }

    const startedAt = Date.now();
    try {
      const response = await fetch(urlObj.toString(), {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - startedAt;

      return NextResponse.json({
        reachable: true,
        statusCode: response.status,
        statusText: response.statusText || "OK",
        latencyMs,
        message: `Server javob berdi: HTTP ${response.status} (${latencyMs} ms)`,
      });
    } catch (netErr: any) {
      const latencyMs = Date.now() - startedAt;
      return NextResponse.json({
        reachable: false,
        statusCode: null,
        latencyMs,
        error: `Serverga ulanib boʻlmadi (${urlObj.hostname}): ${netErr?.cause?.code || netErr?.message || "Tarmoq xatosi"}`,
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { reachable: false, error: err?.message || "Ichki server xatosi" },
      { status: 500 }
    );
  }
}
