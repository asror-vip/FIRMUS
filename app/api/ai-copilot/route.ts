import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { depersonalizeForAi } from "@/lib/utils/privacy";
import { z } from "zod";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const copilotRequestSchema = z.object({
  message: z.string().trim().min(1, "Savol matni boʻsh boʻlishi mumkin emas").max(2000),
  entityId: z.string().regex(UUID_REGEX, "Notoʻgʻri korxona ID").optional(),
});

function formatUzs(val: number): string {
  return `${new Intl.NumberFormat("uz-UZ").format(Math.round(val))} soʻm`;
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
    const parsed = copilotRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Notoʻgʻri soʻrov" },
        { status: 400 }
      );
    }

    const { message, entityId } = parsed.data;

    // Resolve authorized entity via RLS
    let targetEntity: any = null;
    if (entityId) {
      const { data } = await supabase
        .from("business_entities")
        .select("*")
        .eq("id", entityId)
        .maybeSingle();
      targetEntity = data;
    }
    if (!targetEntity) {
      const { data } = await supabase
        .from("business_entities")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      targetEntity = data;
    }

    if (!targetEntity) {
      return NextResponse.json({
        mode: "live_db",
        reply: "Hisobingizga biriktirilgan korxona topilmadi. Avval Sozlamalar boʻlimidan korxona yarating.",
        toolCalls: ["business_entities.select"],
      });
    }

    // Fetch real Supabase financial snapshot for this entity (RLS-protected)
    const [txRes, excRes, docRes, bankRes, tbRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("business_entity_id", targetEntity.id)
        .order("date", { ascending: false })
        .limit(50),
      supabase
        .from("exceptions")
        .select("*")
        .eq("business_entity_id", targetEntity.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("documents")
        .select("*")
        .eq("business_entity_id", targetEntity.id)
        .order("date", { ascending: false })
        .limit(30),
      supabase
        .from("bank_accounts")
        .select("*")
        .eq("business_entity_id", targetEntity.id),
      supabase.rpc("get_trial_balance", {
        p_entity_id: targetEntity.id,
        p_from_date: "1970-01-01",
        p_to_date: "2099-12-31",
      }),
    ]);

    const transactions = txRes.data || [];
    const exceptions = excRes.data || [];
    const documents = docRes.data || [];
    const bankAccounts = bankRes.data || [];
    const trialBalance = tbRes.data || [];

    const openExceptions = exceptions.filter((e: any) => e.status === "open" || e.status === "in_review");
    const pendingTxs = transactions.filter((t: any) => t.status === "pending");
    const unsignedDocs = documents.filter((d: any) => d.status === "pending_signature");
    const totalBankBalance = bankAccounts.reduce((s: number, b: any) => s + Number(b.balance || 0), 0);

    const row6410 = trialBalance.find((r: any) => r.account_code === "6410");
    const row4410 = trialBalance.find((r: any) => r.account_code === "4410");
    const vatOutput = Number(row6410?.period_credit || 0);
    const vatInput = Number(row4410?.period_debit || 0);
    const netVat = Math.max(0, vatOutput - vatInput);

    // Optional Real LLM Call if GEMINI_API_KEY is configured in environment
    if (process.env.GEMINI_API_KEY) {
      try {
        const snapshot = depersonalizeForAi({
          entity: targetEntity.legal_name,
          bankBalanceTotalUzs: totalBankBalance,
          openExceptionsCount: openExceptions.length,
          openExceptions: openExceptions.slice(0, 5),
          pendingTransactionsCount: pendingTxs.length,
          unsignedDocumentsCount: unsignedDocs.length,
          vatOutput6410: vatOutput,
          vatInput4410: vatInput,
          netVatPayable: netVat,
        });
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Siz FIRMUS tizimining O'zbekiston buxgalteriyasi (21-son BHMS) bo'yicha aqlli moliyaviy yordamchisisiz. Foydalanuvchi savoliga faqat quyidagi haqiqiy Supabase ma'lumotlariga tayanib, o'zbek tilida aniq va qisqa javob bering. Agar raqam ma'lumotda bo'lmasa, to'qib chiqarmang.\n\nMA'LUMOTLAR:\n${JSON.stringify(snapshot)}\n\nSAVOL: ${message}`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json();
          const llmText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (llmText) {
            return NextResponse.json({
              mode: "gemini_api",
              reply: llmText,
              toolCalls: ["supabase_live_ledger", "gemini_2_5_flash"],
              actionProposed: openExceptions[0]
                ? {
                    type: "exception",
                    targetId: openExceptions[0].id,
                    title: openExceptions[0].title,
                    amount: openExceptions[0].amount ? formatUzs(Number(openExceptions[0].amount)) : undefined,
                    accounts: "Debet 6010 / Kredit 5110",
                  }
                : undefined,
            });
          }
        }
      } catch (llmErr) {
        console.warn("Gemini API fallback to live DB analyzer:", llmErr);
      }
    }

    // Deterministic Live Supabase Analyzer (no hallucinated or hardcoded values)
    const q = message.toLowerCase();
    let reply = "";
    const toolCalls = ["query_business_entities", "query_trial_balance"];
    let actionProposed: any = undefined;

    if (q.includes("istisno") || q.includes("xato") || q.includes("audit") || q.includes("exception")) {
      toolCalls.push("query_exceptions");
      if (openExceptions.length === 0) {
        reply = `«${targetEntity.legal_name}» korxonasida hozirda ochiq AI Auditor xatoliklari mavjud emas (Barcha ${exceptions.length} ta yozuv koʻrib chiqilgan).`;
      } else {
        const top = openExceptions[0];
        reply = `«${targetEntity.legal_name}» korxonasida ${openExceptions.length} ta ochiq audit istisnosi aniqlandi. Eng muhimi: «${top.title}»${top.amount ? ` (${formatUzs(Number(top.amount))})` : ""}. Tavsiya: ${top.ai_suggestion}`;
        actionProposed = {
          type: "exception",
          targetId: top.id,
          title: top.title,
          amount: top.amount ? formatUzs(Number(top.amount)) : undefined,
          accounts: "Debet 6010 / Kredit 5110",
        };
      }
    } else if (q.includes("qqs") || q.includes("soliq") || q.includes("vat") || q.includes("tax")) {
      toolCalls.push("get_trial_balance_6410_4410");
      reply = `«${targetEntity.legal_name}» Bosh kitobi maʼlumotlariga koʻra: Chiquvchi QQS (6410 Kt) = ${formatUzs(vatOutput)}, Zachyotga olinadigan QQS (4410 Dt) = ${formatUzs(vatInput)}. Budjetga sof QQS majburiyati: ${formatUzs(netVat)}.`;
    } else if (q.includes("bank") || q.includes("qoldiq") || q.includes("balans") || q.includes("pul")) {
      toolCalls.push("query_bank_accounts", "query_transactions");
      const list = bankAccounts
        .map((b: any) => `• ${b.bank_name} (${b.currency}): ${formatUzs(Number(b.balance))}`)
        .join("\n");
      reply = `«${targetEntity.legal_name}» korxonasida ${bankAccounts.length} ta bank hisobvaragʻi mavjud (Jami qoldiq: ${formatUzs(totalBankBalance)}):\n${list || "Hisobvaraqlar ulanmagan."}\n\nTasdiqlashni kutayotgan bank operatsiyalari soni: ${pendingTxs.length} ta.`;
      if (pendingTxs[0]) {
        actionProposed = {
          type: "transaction",
          targetId: pendingTxs[0].id,
          title: `${pendingTxs[0].counterparty} — Tasdiqlash`,
          amount: formatUzs(Number(pendingTxs[0].amount)),
          accounts: pendingTxs[0].type === "income" ? "Debet 5110 / Kredit 4010" : "Debet 6010 / Kredit 5110",
        };
      }
    } else if (q.includes("hujjat") || q.includes("didox") || q.includes("faktura")) {
      toolCalls.push("query_documents");
      reply = `Didox EDO bazasida korxonangiz boʻyicha jami ${documents.length} ta hujjat mavjud. Ulardan ${unsignedDocs.length} tasi E-IMZO bilan imzolashni kutmoqda.`;
    } else {
      toolCalls.push("query_transactions", "query_exceptions");
      reply = `«${targetEntity.legal_name}» (STIR: ${targetEntity.tin_stir}) boʻyicha jonli holat:\n• Bank qoldigʻi: ${formatUzs(totalBankBalance)}\n• Tranzaksiyalar: ${transactions.length} ta (Kutilayotgan: ${pendingTxs.length} ta)\n• Imzolanmagan hujjatlar: ${unsignedDocs.length} ta\n• Ochiq audit istisnolari: ${openExceptions.length} ta\n• Sof QQS majburiyati (6410-4410): ${formatUzs(netVat)}.\n\n(Eslatma: Tashqi LLM kaliti \`GEMINI_API_KEY\` oʻrnatilmaganligi sababli tahlil bevosita Supabase jonli bazasidan hisoblandi.)`;
      if (openExceptions[0]) {
        actionProposed = {
          type: "exception",
          targetId: openExceptions[0].id,
          title: openExceptions[0].title,
          amount: openExceptions[0].amount ? formatUzs(Number(openExceptions[0].amount)) : undefined,
        };
      }
    }

    return NextResponse.json({
      mode: "live_db",
      reply,
      toolCalls,
      actionProposed,
    });
  } catch (err: any) {
    console.error("AI Copilot API error:", err);
    return NextResponse.json(
      { error: err?.message || "AI Copilot soʻrovida xatolik" },
      { status: 500 }
    );
  }
}
