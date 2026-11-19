import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkBurstRateLimit } from "@/lib/ai/subscription-guard";
import { depersonalizeForAi } from "@/lib/utils/privacy";

const ALLOWED_CATEGORIES = [
  "taxable_revenue",
  "non_revenue_credit",
  "non_revenue_own_transfer",
  "non_revenue_refund",
  "non_revenue_loan",
  "ambiguous",
] as const;

const classifyRequestSchema = z.object({
  rows: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        description: z.string().max(400),
      })
    )
    .min(1)
    .max(25),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }

    const burst = checkBurstRateLimit(`tax-classify:${user.id}`, 6);
    if (!burst.allowed) {
      return NextResponse.json(
        { error: "Juda koʻp soʻrov yuborildi. Biroz kutib qayta urinib koʻring." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = classifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Notoʻgʻri soʻrov formati" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI xizmati sozlanmagan — qatorlarni qoʻlda tasniflang." },
        { status: 503 }
      );
    }

    const safeRows = parsed.data.rows.map((r) => ({
      id: r.id,
      description: depersonalizeForAi(r.description || "Tavsif yo'q").slice(0, 260),
    }));

    const prompt = [
      "Siz O'zbekiston buxgalteriyasi bo'yicha faqat noaniq bank/hujjat qatorlarini tasniflashga yordam beruvchi yordamchisiz.",
      "MUHIM: Soliq hisoblamang! Faqat quyidagi toifalardan birini taxminiy taklif qiling:",
      "- taxable_revenue (tovar/xizmat sotuvidan daromad)",
      "- non_revenue_credit (bank krediti / ssuda)",
      "- non_revenue_own_transfer (o'z hisoblari orasidagi o'tkazma)",
      "- non_revenue_refund (qaytarilgan pul / vozvrat)",
      "- non_revenue_loan (qarz / ta'sischi ulushi / moliyaviy yordam)",
      "- ambiguous (hali ham noaniq, buxgalter aniqlashi kerak)",
      "",
      "Faqat JSON massiv qaytaring: [{\"id\":\"...\",\"category\":\"...\",\"reason\":\"qisqa o'zbekcha sabab\"}]",
      "Qatorlar:",
      JSON.stringify(safeRows),
    ].join("\n");

    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const aiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!aiRes.ok) {
      return NextResponse.json(
        { error: "AI tasniflash hozircha javob bermadi — qatorlarni qoʻlda tanlang." },
        { status: 502 }
      );
    }

    const aiJson = await aiRes.json();
    const rawText = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    let items: any[] = [];
    try {
      const decoded = JSON.parse(rawText);
      if (Array.isArray(decoded)) items = decoded;
    } catch {
      items = [];
    }

    const allowedSet = new Set<string>(ALLOWED_CATEGORIES);
    const validIds = new Set(safeRows.map((r) => r.id));

    const suggestions = items
      .filter((x) => x && validIds.has(String(x.id)) && allowedSet.has(String(x.category)))
      .map((x) => ({
        id: String(x.id),
        category: String(x.category) as (typeof ALLOWED_CATEGORIES)[number],
        reason: `Taxminiy (AI): ${String(x.reason || "Tasnif taklifi").slice(0, 160)}`,
        isEstimate: true,
      }));

    return NextResponse.json({
      ok: true,
      isEstimate: true,
      suggestions,
    });
  } catch {
    return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
  }
}
