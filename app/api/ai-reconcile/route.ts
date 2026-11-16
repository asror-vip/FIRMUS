import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { depersonalizeForAi } from "@/lib/utils/privacy";

const ALLOWED_RECONCILE_ACCOUNTS = new Set([
  "4010",
  "4310",
  "4410",
  "4510",
  "5010",
  "5110",
  "6010",
  "6310",
  "6410",
  "6520",
  "6710",
  "9010",
  "9020",
  "9030",
  "9410",
  "9420",
  "9430",
]);

const ACCOUNT_NAMES: Record<string, string> = {
  "4010": "Xaridorlar va buyurtmachilardan olinadigan schyotlar",
  "4310": "Yetkazib beruvchilarga berilgan boʻnaklar",
  "4410": "Budjetga oldindan toʻlangan soliqlar (QQS)",
  "4510": "Mehnat haqi boʻyicha berilgan boʻnaklar",
  "5010": "Kassadagi pul mablagʻlari",
  "5110": "Hisob-kitob schyoti (Milliy valyutada)",
  "6010": "Mol yetkazib beruvchilarga toʻlanadigan schyotlar",
  "6310": "Xaridorlardan olingan boʻnaklar",
  "6410": "Budjetga toʻlovlar boʻyicha qarzlar (Soliqlar)",
  "6520": "Maqsadli davlat jamgʻarmalariga toʻlovlar",
  "6710": "Mehnat haqi boʻyicha xodimlar bilan hisob-kitoblar",
  "9010": "Tayyor mahsulot sotishdan daromadlar",
  "9020": "Tovarlar sotishdan daromadlar",
  "9030": "Xizmatlar koʻrsatishdan daromadlar",
  "9410": "Sotish xarajatlari",
  "9420": "Maʼmuriy xarajatlar",
  "9430": "Boshqa operatsion xarajatlar",
};

const itemSchema = z.object({
  id: z.string().min(1).max(60),
  status: z.enum(["amount_mismatch", "bank_only", "one_c_only"]),
  date: z.string().max(20),
  type: z.enum(["income", "expense"]),
  bankAmount: z.number().nonnegative(),
  oneCAmount: z.number().nonnegative(),
  diffAmount: z.number(),
  purpose: z.string().max(240),
  counterpartyHint: z.string().max(100),
  currentAccountCode: z.string().max(10),
});

const requestSchema = z.object({
  items: z.array(itemSchema).min(1).max(35),
});

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
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Notoʻgʻri solishtirish soʻrovi" },
        { status: 400 }
      );
    }

    // Re-strip any PII server-side (Stateless / Zero-PII storage)
    const safeItems = depersonalizeForAi(parsed.data.items);
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (apiKey) {
      const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
      const modelChain = Array.from(
        new Set([primaryModel, "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-lite-latest"])
      );

      const prompt = [
        "Siz O'zbekiston buxgalteriyasi (21-son BHMS) bo'yicha Bank ko'chirmasi va 1C fayli o'rtasidagi farqlarni tahlil qiluvchi AI yordamchisiz.",
        "Har bir element uchun faqat quyidagi JSON massivini qaytaring:",
        '[{"id":"...","accountCode":"4010|4310|6010|6310|6410|6520|6710|9420","explanation":"1 ta aniq o\'zbekcha buxgalteriya tavsiyasi"}]',
        "Qoidalar:",
        "- Bank komissiyasi/RKO -> 9420; Soliq/QQS/GNK -> 6410; Ijtimoiy soliq/INPS -> 6520; Ish haqi -> 6710; Xaridordan bo'nak -> 6310; Yetkazib beruvchiga bo'nak -> 4310; Xaridor -> 4010; Yetkazib beruvchi -> 6010.",
        "- Raqamlarni to'qimang, berilgan diffAmount/bankAmount/oneCAmount ga tayaning.",
        "",
        `YOZUVLAR:\n${JSON.stringify(safeItems)}`,
      ].join("\n");

      for (const modelName of modelChain) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
            {
              method: "POST",
              signal: AbortSignal.timeout(15_000),
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.0,
                  maxOutputTokens: 2048,
                  responseMimeType: "application/json",
                },
              }),
            }
          );

          if (!res.ok) continue;
          const json = await res.json();
          const rawText = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
          const suggestions = JSON.parse(rawText);
          if (Array.isArray(suggestions)) {
            const normalized = suggestions
              .filter((s: any) => s && typeof s.id === "string")
              .map((s: any) => {
                const code = ALLOWED_RECONCILE_ACCOUNTS.has(String(s.accountCode))
                  ? String(s.accountCode)
                  : "9420";
                return {
                  id: s.id,
                  accountCode: code,
                  accountName: ACCOUNT_NAMES[code] || code,
                  explanation: String(s.explanation || "").slice(0, 260),
                  aiVerified: true,
                };
              });

            return NextResponse.json({
              mode: "gemini_reconcile",
              modelUsed: modelName,
              suggestions: normalized,
            });
          }
        } catch (err) {
          console.warn(`[AI RECONCILE] ${modelName} fallback:`, err);
        }
      }
    }

    return NextResponse.json({
      mode: "deterministic_reconcile",
      modelUsed: "deterministic-21bhms",
      suggestions: safeItems.map((it) => {
        const code = ALLOWED_RECONCILE_ACCOUNTS.has(it.currentAccountCode)
          ? it.currentAccountCode
          : it.type === "income"
          ? "4010"
          : "6010";
        return {
          id: it.id,
          accountCode: code,
          accountName: ACCOUNT_NAMES[code] || code,
          explanation:
            it.status === "amount_mismatch"
              ? `Bank va 1C oʻrtasida ${Math.abs(it.diffAmount).toLocaleString("uz-UZ")} soʻm tafovut aniqlandi — 1C hujjatini tekshiring.`
              : it.status === "bank_only"
              ? `Bankdan oʻtgan, 1C da yoʻq: ${code} schyotiga provodka qilib 1C ga eksport qilish tavsiya etiladi.`
              : `1C da kiritilgan, lekin bank koʻchirmasida koʻrinmadi — kutilayotgan toʻlov yoki dublikatni tekshiring.`,
          aiVerified: false,
        };
      }),
    });
  } catch (err: any) {
    console.error("AI Reconcile error:", err);
    return NextResponse.json(
      { error: err?.message || "Solishtirish tahlilida xatolik" },
      { status: 500 }
    );
  }
}
