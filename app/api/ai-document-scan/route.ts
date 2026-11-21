import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { depersonalizeForAi, sanitizeStringForAi } from "@/lib/utils/privacy";
import { roundMoney } from "@/lib/utils/finance";
import { getTashkentTodayIso } from "@/lib/format/date";
import {
  authorizeAndConsumeAiCredits,
  refundConsumedAiCredits,
  resolveEffectiveSubscription,
} from "@/lib/ai/subscription-guard";
import { UUID_REGEX } from "@/lib/ai/agent-types";
import { validateScannedDocumentResult, isValidCalendarIsoDate } from "@/lib/services/document-scan-validator";
import { getRequestLocale, type Locale } from "@/lib/i18n/server-locale";
import { getApiMessages, localizeServerError, type ApiMessages } from "@/lib/i18n/domains/api-messages";

const scanRequestSchema = z.object({
  mode: z.enum(["invoice_receipt", "contract_risk"]).default("invoice_receipt"),
  chatImageOnly: z.boolean().optional(),
  userNote: z.string().max(400).optional(),
  fileName: z.string().max(180).optional(),
  fileHash: z.string().regex(/^[a-f0-9]{32,64}$/i).optional(),
  entityId: z.string().regex(UUID_REGEX).optional(),
  requestedModel: z.enum(["gemini-3.8-flash", "gemini-4-hydrogen"]).optional(),
  mimeType: z
    .enum(["image/jpeg", "image/png", "image/webp", "application/pdf"])
    .optional(),
  base64Data: z.string().max(8_500_000).optional(),
  docText: z.string().max(30_000).optional(),
});

const ALLOWED_ACCOUNTS = new Set([
  "1010",
  "2910",
  "4010",
  "4310",
  "4410",
  "5010",
  "5110",
  "6010",
  "6310",
  "6410",
  "9010",
  "9020",
  "9030",
  "9410",
  "9420",
  "9430",
]);

function estimateDecodedBytes(dataUrlOrBase64: string): number {
  const b64 = dataUrlOrBase64.includes(",")
    ? dataUrlOrBase64.split(",")[1] || ""
    : dataUrlOrBase64;
  return Math.floor((b64.length * 3) / 4);
}

function verifyBinaryMagicBytes(
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf",
  dataUrlOrBase64: string
): boolean {
  const rawB64 = dataUrlOrBase64.includes(",")
    ? dataUrlOrBase64.split(",")[1] || ""
    : dataUrlOrBase64;
  const clean = rawB64.replace(/\s+/g, "");
  if (!clean || clean.length < 16) return false;

  const prefixLen = Math.min(clean.length, 24);
  const alignedLen = prefixLen - (prefixLen % 4);
  if (alignedLen < 16) return false;

  const header = Buffer.from(clean.slice(0, alignedLen), "base64");
  if (header.length < 4) return false;

  switch (mimeType) {
    case "application/pdf":
      return (
        header[0] === 0x25 &&
        header[1] === 0x50 &&
        header[2] === 0x44 &&
        header[3] === 0x46
      );
    case "image/jpeg":
      return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    case "image/png":
      return (
        header.length >= 8 &&
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4e &&
        header[3] === 0x47 &&
        header[4] === 0x0d &&
        header[5] === 0x0a &&
        header[6] === 0x1a &&
        header[7] === 0x0a
      );
    case "image/webp":
      return (
        header.length >= 12 &&
        header[0] === 0x52 &&
        header[1] === 0x49 &&
        header[2] === 0x46 &&
        header[3] === 0x46 &&
        header[8] === 0x57 &&
        header[9] === 0x45 &&
        header[10] === 0x42 &&
        header[11] === 0x50
      );
    default:
      return false;
  }
}

function buildContractHeuristicFallback(rawText: string, msg: ApiMessages) {
  const safeText = depersonalizeForAi(rawText);
  const lower = safeText.toLowerCase();
  const risks: string[] = [];

  const penyaMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:har\s+bir\s+kun|в\s+день|kunlik|penya|пеня)/i);
  if (penyaMatch) {
    const rate = parseFloat(penyaMatch[1].replace(",", "."));
    if (rate > 0.5) {
      risks.push(msg.contractFallback.highPenalty(rate));
    }
  }
  if ((lower.includes("100%") || lower.includes("100 %")) && (lower.includes("avans") || lower.includes("предоплат") || lower.includes("oldindan"))) {
    risks.push(msg.contractFallback.fullPrepayment);
  }
  if (!/(qqs|ндс|qqssiz|без\s+ндс)/i.test(lower)) {
    risks.push(msg.contractFallback.missingVat);
  }
  if (!/(stir|инн|mfo|мфо)/i.test(lower)) {
    risks.push(msg.contractFallback.missingRequisites);
  }

  return {
    mode: "deterministic_scan",
    modelUsed: "deterministic-contract-guard",
    documentType: msg.contractFallback.documentType,
    documentNumber: "",
    date: getTashkentTodayIso(),
    counterparty: msg.contractFallback.counterparty,
    counterpartyStir: "",
    direction: "expense" as const,
    totalAmount: 0,
    vatAmount: 0,
    netAmount: 0,
    items: [],
    suggestedDebitCode: "6010",
    suggestedCreditCode: "5110",
    vatAccountCode: "4410",
    provodkaExplanation:
      risks.length > 0
        ? msg.contractFallback.explanationWithRisks(risks.length)
        : msg.contractFallback.explanationClean,
    risks,
  };
}

export async function POST(req: NextRequest) {
  const locale: Locale = getRequestLocale(req);
  const msg = getApiMessages(locale);

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: msg.authRequired }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: msg.invalidDocumentRequest }, { status: 400 });
    }
    const parsed = scanRequestSchema.safeParse(body);
    if (!parsed.success) {
      const issueMsg = parsed.error.issues[0]?.message;
      return NextResponse.json(
        { error: issueMsg ? localizeServerError(issueMsg, locale) : msg.invalidDocumentRequest },
        { status: 400 }
      );
    }

    const {
      mode,
      chatImageOnly,
      userNote,
      fileName,
      fileHash,
      entityId,
      requestedModel,
      mimeType,
      base64Data,
      docText,
    } = parsed.data;

    if (chatImageOnly && (!mimeType || mimeType === "application/pdf" || !base64Data)) {
      return NextResponse.json(
        { error: msg.invalidImageFormat },
        { status: 400 }
      );
    }

    if (base64Data && base64Data.trim().length > 0) {
      if (!mimeType || !verifyBinaryMagicBytes(mimeType, base64Data)) {
        return NextResponse.json(
          { error: msg.invalidImageFormat },
          { status: 400 }
        );
      }
    }

    const hasBinary = Boolean(mimeType && base64Data && base64Data.length > 20);
    const hasText = Boolean(docText && docText.trim().length > 5);

    if (!hasBinary && !hasText) {
      return NextResponse.json(
        { error: msg.uploadOrEnterContract },
        { status: 400 }
      );
    }

    // 1. Enforce Plan File & Payload Size Limits BEFORE spending any AI credits
    const preSnapshot = await resolveEffectiveSubscription(user.id);
    if (hasBinary && mimeType && base64Data) {
      const byteSize = estimateDecodedBytes(base64Data);
      if (mimeType === "application/pdf") {
        if (!preSnapshot.limits.pdfAllowed) {
          return NextResponse.json(
            {
              error: msg.pdfProOnly,
              upgradeRequired: true,
              usage: preSnapshot,
            },
            { status: 403 }
          );
        }
        if (byteSize > preSnapshot.limits.pdfMaxBytes) {
          const maxMb = Math.round(preSnapshot.limits.pdfMaxBytes / (1024 * 1024));
          return NextResponse.json(
            {
              error: msg.pdfExceedsLimit(preSnapshot.planName, maxMb),
              upgradeRequired: true,
              usage: preSnapshot,
            },
            { status: 413 }
          );
        }
      } else if (byteSize > preSnapshot.limits.imageMaxBytes + 128 * 1024) {
        const maxMb = Number((preSnapshot.limits.imageMaxBytes / (1024 * 1024)).toFixed(1));
        return NextResponse.json(
          {
            error: msg.imageExceedsLimit(preSnapshot.planName, maxMb),
            upgradeRequired: true,
            usage: preSnapshot,
          },
          { status: 413 }
        );
      }
    }

    // 2. Duplicate hash cache hit -> 0 AI credits & 0 tokens!
    if (fileHash && entityId) {
      const { data: cached } = await supabase
        .from("work_batches")
        .select("id, sanitized_payload")
        .eq("business_entity_id", entityId)
        .eq("file_hash", fileHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached?.sanitized_payload && typeof cached.sanitized_payload === "object") {
        return NextResponse.json({
          ...(cached.sanitized_payload as Record<string, any>),
          cachedHit: true,
          savedBatchId: cached.id,
          isDuplicate: true,
          creditCost: 0,
          usage: preSnapshot,
        });
      }
    }

    const safeDocText = docText
      ? depersonalizeForAi(docText).slice(0, preSnapshot.limits.contractTextMaxChars)
      : "";
    const safeUserNote = userNote ? depersonalizeForAi(userNote).slice(0, 350) : "";
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (apiKey) {
      const authz = await authorizeAndConsumeAiCredits({
        userId: user.id,
        userEmail: user.email,
        kind: mode === "contract_risk" ? "contract" : "scan",
        requestedModel,
        estimatedTokens: hasBinary ? 2800 : 2200,
      });

      if (!authz.ok) {
        return NextResponse.json(
          {
            error: localizeServerError(authz.error, locale),
            upgradeRequired: Boolean(authz.upgradeRequired),
            usage: authz.snapshot,
          },
          { status: authz.status }
        );
      }

      const prompt = [
        "Siz Oʻzbekiston buxgalteriyasi (21-son BHMS №3593 va Soliq kodeksi) boʻyicha hujjat va faktura tahlilchisisiz.",
        "Berilgan rasm, PDF yoki shartnoma matnidan FAQAT korporativ buxgalteriya maʼlumotlarini ajrating.",
        "OʻRQ-547 QATʼIY TALABI: Fuqaro pasport raqami, JShShIR (14 raqam), shaxsiy telefon yoki plastik karta raqamini QAYTARMANG.",
        mode === "contract_risk"
          ? "Rejim: SHARTNOMA XAVF TAHLILI — yuqori penya/jarima, 100% avans xatari, QQS bandi va noaniq shartlarni `risks` massivida aniq yozing."
          : "Rejim: FAKTURA / TTN / CHEK OCR — tovar/xizmatlar, taxminiy MXIK (IKPU 17 xonali kodi yoki qisqa nomi), QQS 12% va 21-BHMS provodkasini aniqlang.",
        `TIL QOIDASI: ${msg.aiLanguageInstruction(locale)}`,
        "Faqat quyidagi JSON obyektini qaytaring:",
        JSON.stringify({
          documentType: "E-SF / Faktura | TTN | Kassa/Terminal cheki | Shartnoma",
          documentNumber: "hujjat raqami yoki bo'sh string",
          date: "YYYY-MM-DD",
          counterparty: "Korxona nomi (shaxsiy F.I.O emas)",
          counterpartyStir: "9 raqamli STIR yoki bo'sh string",
          direction: "expense | income",
          totalAmount: 0,
          vatAmount: 0,
          items: [
            { name: "Tovar/xizmat nomi", mxikHint: "taxminiy MXIK yoki toifa", qty: 1, unit: "dona", price: 0, total: 0, vatRate: 12 },
          ],
          suggestedDebitCode: "6010|2910|1010|9420|4010|5110",
          suggestedCreditCode: "5110|6010|9030|9020|9010",
          vatAccountCode: "4410|6410",
          provodkaExplanation: `21-BHMS bo'yicha izoh (${locale})`,
          risks: ["Shartnoma yoki faktura bo'yicha aniqlangan xatarlar (yo'q bo'lsa bo'sh massiv)"],
        }),
        fileName ? `Fayl nomi: ${sanitizeStringForAi(fileName)}` : "",
        safeUserNote ? `Foydalanuvchi izohi/soʻrovi: ${safeUserNote}` : "",
        safeDocText ? `MATN:\n${safeDocText}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const parts: any[] = [{ text: prompt }];
      if (hasBinary && mimeType && base64Data) {
        const cleanBase64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
        parts.push({
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        });
      }

      for (const modelName of authz.modelChain) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
            {
              method: "POST",
              signal: AbortSignal.timeout(25_000),
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                contents: [{ role: "user", parts }],
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
          const rawText =
            json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
          const data = JSON.parse(rawText);

          // Server-side deterministic arithmetic & account code enforcement
          const totalAmount = roundMoney(Math.max(0, Number(data.totalAmount || 0)));
          const rawVatAmount = roundMoney(Math.max(0, Number(data.vatAmount || 0)));
          let vatAmount = rawVatAmount;
          if (vatAmount > totalAmount) vatAmount = 0;
          const netAmount = roundMoney(Math.max(0, totalAmount - vatAmount));

          const normalizedItems = Array.isArray(data.items)
            ? data.items.slice(0, 25).map((it: any) => ({
                name: sanitizeStringForAi(String(it?.name || msg.defaultItemName)).slice(0, 120),
                mxikHint: sanitizeStringForAi(String(it?.mxikHint || "")).slice(0, 40),
                qty: Number(it?.qty || 1),
                unit: sanitizeStringForAi(String(it?.unit || msg.defaultUnit)).slice(0, 20),
                price: roundMoney(Number(it?.price || 0)),
                total: roundMoney(Number(it?.total || 0)),
                vatRate: Number(it?.vatRate || 0),
              }))
            : [];

          const rawDateStr = String(data.date || "").trim();
          const rawStirStr = String(data.counterpartyStir || "").trim();
          const verification = validateScannedDocumentResult({
            mode,
            rawDate: rawDateStr,
            rawStir: rawStirStr,
            totalAmount,
            vatAmount: rawVatAmount,
            netAmount,
            items: normalizedItems,
            todayIso: getTashkentTodayIso(),
          });

          const debitCode = ALLOWED_ACCOUNTS.has(String(data.suggestedDebitCode))
            ? String(data.suggestedDebitCode)
            : "6010";
          const creditCode = ALLOWED_ACCOUNTS.has(String(data.suggestedCreditCode))
            ? String(data.suggestedCreditCode)
            : "5110";
          const vatCode = String(data.vatAccountCode) === "6410" ? "6410" : "4410";

          return NextResponse.json({
            mode: "gemini_scan",
            modelUsed: modelName,
            creditCost: authz.creditCost,
            usage: authz.snapshot,
            documentType: sanitizeStringForAi(String(data.documentType || msg.defaultDocumentType)).slice(0, 60),
            documentNumber: sanitizeStringForAi(String(data.documentNumber || "")).slice(0, 40),
            date: isValidCalendarIsoDate(rawDateStr) ? rawDateStr : getTashkentTodayIso(),
            counterparty: sanitizeStringForAi(String(data.counterparty || msg.defaultCounterparty)).slice(0, 120),
            counterpartyStir: rawStirStr.replace(/\D/g, "").slice(0, 9),
            direction: data.direction === "income" ? "income" : "expense",
            totalAmount,
            vatAmount,
            netAmount,
            items: normalizedItems,
            suggestedDebitCode: debitCode,
            suggestedCreditCode: creditCode,
            vatAccountCode: vatCode,
            provodkaExplanation: sanitizeStringForAi(
              String(data.provodkaExplanation || msg.defaultProvodkaExplanation)
            ).slice(0, 260),
            risks: Array.isArray(data.risks)
              ? data.risks.slice(0, 10).map((r: any) => sanitizeStringForAi(String(r)).slice(0, 220))
              : [],
            verification,
          });
        } catch (err) {
          console.warn(`[AI DOC SCAN] ${modelName} fallback:`, err);
        }
      }

      // Refund reserved credits when Gemini fails completely
      await refundConsumedAiCredits({
        userId: user.id,
        creditCost: authz.creditCost,
        periodMonth: authz.periodMonth,
        periodDay: authz.periodDay,
        isScan: true,
      });
    }

    if (mode === "contract_risk" && safeDocText) {
      return NextResponse.json({
        ...buildContractHeuristicFallback(safeDocText, msg),
        creditCost: 0,
        usage: preSnapshot,
      });
    }

    return NextResponse.json(
      {
        error: msg.aiUnavailable,
      },
      { status: 503 }
    );
  } catch (err) {
    console.error("AI Document Scan error:", err);
    return NextResponse.json(
      { error: msg.documentScanError },
      { status: 500 }
    );
  }
}
