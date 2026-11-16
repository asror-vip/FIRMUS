import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { depersonalizeForAi } from "@/lib/utils/privacy";
import {
  authorizeAndConsumeAiCredits,
  refundConsumedAiCredits,
  resolveEffectiveSubscription,
} from "@/lib/ai/subscription-guard";

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
  requestedModel: z.enum(["gemini-3.8-flash", "gemini-4-hydrogen"]).optional(),
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
      const authz = await authorizeAndConsumeAiCredits({
        userId: user.id,
        kind: "reconcile",
        requestedModel: parsed.data.requestedModel,
        estimatedTokens: 1600,
      });

      if (!authz.ok) {
        return NextResponse.json(
          {
            error: authz.error,
            upgradeRequired: Boolean(authz.upgradeRequired),
            usage: authz.snapshot,
          },
          { status: authz.status }
        );
      }

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

      for (const modelName of authz.modelChain) {
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
              creditCost: authz.creditCost,
              usage: authz.snapshot,
              suggestions: normalized,
            });
          }
        } catch (err) {
          console.warn(`[AI RECONCILE] ${modelName} fallback:`, err);
        }
      }

      await refundConsumedAiCredits({
        userId: user.id,
        creditCost: authz.creditCost,
        isScan: false,
      });
    }

    const fallbackSnapshot = await resolveEffectiveSubscription(user.id);
    return NextResponse.json({
      mode: "deterministic_reconcile",
      modelUsed: "deterministic-21bhms",
      creditCost: 0,
      usage: fallbackSnapshot,
      suggestions: safeItems.map((item: any) => {
        const code = ALLOWED_RECONCILE_ACCOUNTS.has(item.currentAccountCode)
          ? item.currentAccountCode
          : "9420";
        return {
          id: item.id,
          accountCode: code,
          accountName: ACCOUNT_NAMES[code] || code,
          explanation:
            item.status === "amount_mismatch"
              ? `Bank (${item.bankAmount.toLocaleString("uz-UZ")}) va 1C (${item.oneCAmount.toLocaleString("uz-UZ")}) oʻrtasidagi ${Math.abs(item.diffAmount).toLocaleString("uz-UZ")} soʻm farqni tekshiring.`
              : item.status === "bank_only"
              ? `1C bazasida topilmadi. «${ACCOUNT_NAMES[code] || code}» (${code}) schyotiga kiritish tavsiya etiladi.`
              : `1C da mavjud, lekin yuklangan bank koʻchirmasida koʻrinmadi (sana yoki dublikatni tekshiring).`,
          aiVerified: true,
        };
      }),
    });
  } catch (err: any) {
    console.error("AI Reconcile API error:", err);
    return NextResponse.json(
      { error: err?.message || "AI solishtirish xatoligi" },
      { status: 500 }
    );
  }
}
