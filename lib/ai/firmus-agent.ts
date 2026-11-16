import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { depersonalizeForAi } from "@/lib/utils/privacy";
import { roundMoney, splitVatInclusive } from "@/lib/utils/finance";
import {
  type AgentActionProposal,
  type AgentHistoryItem,
  journalProposalPayloadSchema,
  reverseEntryPayloadSchema,
  closePeriodPayloadSchema,
  UUID_REGEX,
  DATE_REGEX,
} from "./agent-types";

export const MUTATING_AGENT_ROLES = new Set([
  "workspace_owner",
  "workspace_admin",
  "chief_accountant",
  "accountant",
  "company_director",
]);

export interface AgentResult {
  mode: "gemini_agent" | "deterministic_guard";
  modelUsed: string;
  reply: string;
  toolCalls: string[];
  actionProposed?: AgentActionProposal;
  userRole: string;
  canExecuteActions: boolean;
}

function formatUzs(val: number): string {
  return `${new Intl.NumberFormat("uz-UZ").format(Math.round(val))} soʻm`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isMutatingRole(role: string): boolean {
  return MUTATING_AGENT_ROLES.has(role);
}

export async function resolveUserEntityRole(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string | undefined,
  entity: { id: string; workspace_id: string }
): Promise<string> {
  const { data: ws } = await supabase
    .from("workspaces")
    .select("owner_user_id")
    .eq("id", entity.workspace_id)
    .maybeSingle();

  if (ws?.owner_user_id === userId) {
    return "workspace_owner";
  }

  const { data: member } = await supabase
    .from("team_members")
    .select("role, status")
    .eq("workspace_id", entity.workspace_id)
    .or(
      userEmail
        ? `user_id.eq.${userId},email.ilike.${userEmail}`
        : `user_id.eq.${userId}`
    )
    .eq("status", "active")
    .maybeSingle();

  return member?.role || "viewer";
}

function buildFirmusSystemInstruction(params: {
  entity: any;
  coaRows: Array<{ code: string; name: string; type: string }>;
  userRole: string;
}): string {
  const { entity, coaRows, userRole } = params;
  const coaSummary =
    coaRows.length > 0
      ? coaRows.map((c) => `${c.code} (${c.name} [${c.type}])`).join(", ")
      : "Standart 21-BHMS schyotlari";

  const taxLabel =
    entity.tax_regime === "vat_profit_tax"
      ? "QQS (12%) + Foyda solig'i (15%)"
      : entity.tax_regime === "turnover_tax"
      ? "Aylanmadan olinadigan soliq (4%)"
      : "Qat'iy belgilangan soliq";

  return [
    "Siz FIRMUS — O'zbekiston buxgalteriyasi (21-son BHMS va O'zR Soliq kodeksi) bo'yicha QAT'IY, XATOSIZ rasmiy AI Agentsiz.",
    `Faol korxona: «${entity.legal_name}» (STIR: ${entity.tin_stir}, Valyuta: ${entity.currency || "UZS"}, Soliq rejimi: ${taxLabel}).`,
    `Joriy foydalanuvchi roli: ${userRole}. Bugungi sana: ${todayIso()}.`,
    "",
    "KORXONANING FAOL SCHYOTLAR REJASI (21-BHMS):",
    coaSummary,
    "",
    "QAT'IY BUXGALTERIYA VA XAVFSIZLIK QOIDALARI (BUZISH TAQIQLANADI):",
    "1. HECH QACHON raqam, summa, schyot qoldig'i, hujjat yoki shartnoma ma'lumotini o'zingizdan to'qib chiqarmang. Foydalanuvchi raqam so'rasa, albatta read tool (get_financial_overview, get_trial_balance, get_general_ledger, list_recent_journal_entries, search_business_records) chaqiring.",
    "2. HECH QACHON schyotlar rejasida (yuqoridagi ro'yxatda) mavjud bo'lmagan schyot kodini ishlatmang.",
    "3. IKKIYOQLAMA YOZUV QONUNI: Har bir provodkada Debet jami == Kredit jami (aniq 2 xonagacha), bir qatorda ham debit > 0 ham credit > 0 bo'lmasligi, va summalar > 0 bo'lishi shart.",
    "4. O'ZBEKISTON SOLIQ FORMULALARI:",
    "   - QQS 12%: Agar summa 'QQS bilan' berilgan bo'lsa: QQS = round(summa * 12 / 112, 2), sof summa = summa - QQS. QQS chiqim/sotishda 6410 (Kt), kirim/xaridda 4410 (Dt).",
    "   - Ish haqi: JShODS = 12% (6710 Dt / 6410 Kt), Ijtimoiy soliq = 12% (9420 Dt / 6520 Kt), asosiy hisob (9420 Dt / 6710 Kt).",
    "   - Xarid (tovar/xizmat): Tovarlar 2910 yoki Material 1010 yoki Xarajat 9420 (Dt), Yetkazib beruvchi 6010 (Kt).",
    "   - Sotuv (tushum): Xaridor 4010 (Dt), Sotish tushumi 9010/9020/9030 (Kt), QQS 6410 (Kt).",
    "   - Bank to'lovi: Kirim 5110 Dt / 4010 Kt; Chiqim 6010 Dt / 5110 Kt.",
    "   - Davr yopish: 90xx/91xx/94xx schyotlarini 9910 orqali 8710 ga yopish uchun propose_close_period chaqiring.",
    "5. HUMAN-IN-THE-LOOP QAT'IY CHEKLOVI: Siz bazaga o'zboshimchalik bilan yozmaysiz. Har qanday o'zgarish (provodka, storno, istisno, bank operatsiyasi, davr yopish) so'ralganda ALBATTA propose_journal_entry yoki mos propose_* functionCall ni chaqiring! Hech qachon functionCall chaqirmasdan matnda 'taklif tayyorlandi, tasdiqlang' deb yozmang — aks holda tasdiqlash tugmasi chiqmaydi.",
    "6. Agar foydalanuvchi roli 'viewer' yoki 'auditor' bo'lsa, hech qanday propose_* o'zgartirish tool'ini chaqirmang, faqat tahlil bering va ruxsat yo'qligini tushuntiring.",
    "7. Javoblarni O'zbek tilida, aniq, qisqa, rasmiy va tushunarli buxgalteriya tilida bering.",
  ].join("\n");
}

const GEMINI_TOOL_DECLARATIONS = [
  {
    name: "get_financial_overview",
    description:
      "Korxonaning joriy moliyaviy umumiy holatini oladi: bank hisobvaraqlari jami qoldig'i, kutilayotgan tranzaksiyalar, ochiq audit istisnolari va sof QQS (6410 - 4410).",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "get_trial_balance",
    description:
      "Korxonaning 21-BHMS Oborot-saldovaya vedomost (Trial Balance) jadvalini berilgan sana oralig'i uchun hisoblab qaytaradi.",
    parameters: {
      type: "OBJECT",
      properties: {
        from_date: { type: "STRING", description: "Boshlanish sanasi YYYY-MM-DD (ixtiyoriy, default 1970-01-01)" },
        to_date: { type: "STRING", description: "Tugash sanasi YYYY-MM-DD (ixtiyoriy, default 2099-12-31)" },
      },
    },
  },
  {
    name: "get_general_ledger",
    description:
      "Muayyan schyot kodi bo'yicha Bosh kitob (General Ledger) harakatlari va joriy qoldiq (running balance) ni qaytaradi.",
    parameters: {
      type: "OBJECT",
      properties: {
        account_code: { type: "STRING", description: "Schyot kodi, masalan 5110, 6010, 6410, 4010" },
        from_date: { type: "STRING", description: "Boshlanish sanasi YYYY-MM-DD (ixtiyoriy)" },
        to_date: { type: "STRING", description: "Tugash sanasi YYYY-MM-DD (ixtiyoriy)" },
      },
      required: ["account_code"],
    },
  },
  {
    name: "list_recent_journal_entries",
    description:
      "Oxirgi provodkalar (journal_entries va journal_lines) ro'yxatini ID va statusi bilan qaytaradi (storno yoki tekshiruv uchun).",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: { type: "NUMBER", description: "Maksimal soni (1 dan 20 gacha, default 10)" },
      },
    },
  },
  {
    name: "search_business_records",
    description:
      "Korxonaning faol jadvallaridan haqiqiy yozuvlarni qidiradi (tax_records, transactions, exceptions, chart_of_accounts).",
    parameters: {
      type: "OBJECT",
      properties: {
        record_type: {
          type: "STRING",
          enum: [
            "tax_records",
            "transactions",
            "exceptions",
            "chart_of_accounts",
          ],
          description: "Qidirililadigan jadval turi",
        },
        query: { type: "STRING", description: "Ixtiyoriy qidiruv matni" },
      },
      required: ["record_type"],
    },
  },
  {
    name: "propose_journal_entry",
    description:
      "Yangi balanslangan 21-BHMS buxgalteriya provodkasini yaratishni TAKLIF qiladi (foydalanuvchi tasdig'idan keyin create_journal_entry_atomic bilan yoziladi).",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Taklif kartasi sarlavhasi, masalan 'Xizmat sotish provodkasi'" },
        entry_date: { type: "STRING", description: "Provodka sanasi YYYY-MM-DD" },
        description: { type: "STRING", description: "Provodka tavsifi" },
        lines: {
          type: "ARRAY",
          description: "Kamida 2 ta balanslangan qator (sum(debit) == sum(credit))",
          items: {
            type: "OBJECT",
            properties: {
              account_code: { type: "STRING", description: "Faol schyot kodi (masalan 4010, 9010, 6410)" },
              debit_amount: { type: "NUMBER", description: "Debet summasi (>= 0)" },
              credit_amount: { type: "NUMBER", description: "Kredit summasi (>= 0)" },
              memo: { type: "STRING", description: "Qator izohi" },
            },
            required: ["account_code", "debit_amount", "credit_amount"],
          },
        },
      },
      required: ["title", "entry_date", "description", "lines"],
    },
  },
  {
    name: "propose_reverse_entry",
    description: "Mavjud posted provodkani Storno (bekor qilish) ni TAKLIF qiladi.",
    parameters: {
      type: "OBJECT",
      properties: {
        entry_id: { type: "STRING", description: "Bekor qilinadigan posted journal_entry UUID si" },
        reason: { type: "STRING", description: "Storno sababi (kamida 3 belgi)" },
      },
      required: ["entry_id", "reason"],
    },
  },
  {
    name: "propose_resolve_exception",
    description: "Ochiq audit istisnosini (exception) tasdiqlash yoki rad etishni TAKLIF qiladi.",
    parameters: {
      type: "OBJECT",
      properties: {
        exception_id: { type: "STRING", description: "Exception UUID si" },
        decision: { type: "STRING", enum: ["approve", "reject"], description: "approve yoki reject" },
      },
      required: ["exception_id", "decision"],
    },
  },
  {
    name: "propose_transaction_status",
    description: "Kutilayotgan bank tranzaksiyasini posted qilish yoki rad etishni TAKLIF qiladi.",
    parameters: {
      type: "OBJECT",
      properties: {
        transaction_id: { type: "STRING", description: "Transaction UUID si" },
        status: { type: "STRING", enum: ["posted", "rejected"], description: "posted yoki rejected" },
      },
      required: ["transaction_id", "status"],
    },
  },
  {
    name: "propose_close_period",
    description: "Hisobot davrini yopish (Zakritiye mesyatsa: 90xx/91xx/94xx -> 9910 -> 8710) ni TAKLIF qiladi.",
    parameters: {
      type: "OBJECT",
      properties: {
        from_date: { type: "STRING", description: "Davr boshi YYYY-MM-DD" },
        to_date: { type: "STRING", description: "Davr oxiri YYYY-MM-DD" },
        closing_date: { type: "STRING", description: "Yopish sanasi YYYY-MM-DD (ixtiyoriy)" },
      },
      required: ["from_date", "to_date"],
    },
  },
];

interface ToolContext {
  supabase: SupabaseClient;
  entity: any;
  coaMap: Map<string, { code: string; name: string; type: string }>;
  userRole: string;
}

async function runToolCall(
  name: string,
  args: Record<string, any>,
  ctx: ToolContext
): Promise<{ result: any; proposal?: AgentActionProposal }> {
  const { supabase, entity, coaMap, userRole } = ctx;

  // Read-only tools
  if (name === "get_financial_overview") {
    const [txRes, excRes, docRes, bankRes, tbRes] = await Promise.all([
      supabase.from("transactions").select("id, date, amount, type, counterparty, status").eq("business_entity_id", entity.id).order("date", { ascending: false }).limit(30),
      supabase.from("exceptions").select("id, title, severity, status, amount, ai_suggestion").eq("business_entity_id", entity.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("documents").select("id, document_number, type, counterparty, amount, status, date").eq("business_entity_id", entity.id).order("date", { ascending: false }).limit(20),
      supabase.from("bank_accounts").select("id, bank_name, account_number, currency, balance").eq("business_entity_id", entity.id),
      supabase.rpc("get_trial_balance", { p_entity_id: entity.id, p_from_date: "1970-01-01", p_to_date: "2099-12-31" }),
    ]);

    const txs = txRes.data || [];
    const excs = excRes.data || [];
    const docs = docRes.data || [];
    const banks = bankRes.data || [];
    const tb = tbRes.data || [];

    const totalBankBalance = banks.reduce((s: number, b: any) => s + Number(b.balance || 0), 0);
    const row6410 = tb.find((r: any) => r.account_code === "6410");
    const row4410 = tb.find((r: any) => r.account_code === "4410");
    const vatOutput = Number(row6410?.closing_credit || row6410?.period_credit || 0);
    const vatInput = Number(row4410?.closing_debit || row4410?.period_debit || 0);

    return {
      result: depersonalizeForAi({
        entity: entity.legal_name,
        tax_regime: entity.tax_regime,
        total_bank_balance_uzs: totalBankBalance,
        bank_accounts: banks,
        pending_transactions: txs.filter((t: any) => t.status === "pending"),
        open_exceptions: excs.filter((e: any) => e.status === "open" || e.status === "in_review"),
        unsigned_documents: docs.filter((d: any) => d.status === "pending_signature"),
        vat_output_6410: vatOutput,
        vat_input_4410: vatInput,
        net_vat_payable: Math.max(0, roundMoney(vatOutput - vatInput)),
      }),
    };
  }

  if (name === "get_trial_balance") {
    const fromDate = typeof args.from_date === "string" && DATE_REGEX.test(args.from_date) ? args.from_date : "1970-01-01";
    const toDate = typeof args.to_date === "string" && DATE_REGEX.test(args.to_date) ? args.to_date : "2099-12-31";
    const { data, error } = await supabase.rpc("get_trial_balance", {
      p_entity_id: entity.id,
      p_from_date: fromDate,
      p_to_date: toDate,
    });
    if (error) return { result: { ok: false, error: error.message } };
    return { result: { ok: true, from_date: fromDate, to_date: toDate, rows: data || [] } };
  }

  if (name === "get_general_ledger") {
    const code = String(args.account_code || "").trim();
    if (!code) return { result: { ok: false, error: "account_code majburiy" } };
    const fromDate = typeof args.from_date === "string" && DATE_REGEX.test(args.from_date) ? args.from_date : "1970-01-01";
    const toDate = typeof args.to_date === "string" && DATE_REGEX.test(args.to_date) ? args.to_date : "2099-12-31";
    const { data, error } = await supabase.rpc("get_general_ledger", {
      p_entity_id: entity.id,
      p_account_code: code,
      p_from_date: fromDate,
      p_to_date: toDate,
    });
    if (error) return { result: { ok: false, error: error.message } };
    return { result: { ok: true, account_code: code, movements: data || [] } };
  }

  if (name === "list_recent_journal_entries") {
    const limit = Math.min(20, Math.max(1, Number(args.limit || 10)));
    const { data, error } = await supabase
      .from("journal_entries")
      .select("id, entry_number, entry_date, description, status, source_type, journal_lines(account_code, account_name, debit_amount, credit_amount)")
      .eq("business_entity_id", entity.id)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { result: { ok: false, error: error.message } };
    return { result: { ok: true, entries: data || [] } };
  }

  if (name === "search_business_records") {
    const table = String(args.record_type || "");
    const allowed = new Set([
      "tax_records",
      "transactions",
      "exceptions",
      "chart_of_accounts",
    ]);
    if (!allowed.has(table)) {
      return { result: { ok: false, error: "Noto'g'ri record_type" } };
    }
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("business_entity_id", entity.id)
      .limit(30);
    if (error) return { result: { ok: false, error: error.message } };
    let rows = data || [];
    const q = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
    if (q) {
      rows = rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(q));
    }
    return { result: { ok: true, record_type: table, count: rows.length, rows: depersonalizeForAi(rows.slice(0, 20)) } };
  }

  // Mutation Proposal tools (strict RBAC + schema + chart_of_accounts guard)
  if (!isMutatingRole(userRole)) {
    return {
      result: {
        ok: false,
        error: `Sizning rolingiz (${userRole}) moliyaviy yozuv kiritish huquqiga ega emas. Faqat o'qish va tahlil ruxsat etilgan.`,
      },
    };
  }

  if (name === "propose_journal_entry") {
    const rawLines = Array.isArray(args.lines) ? args.lines : [];
    const enrichedLines = rawLines.map((l: any) => {
      const code = String(l.account_code || "").trim();
      const coa = coaMap.get(code);
      return {
        account_code: code,
        account_name: coa?.name || "",
        debit_amount: roundMoney(Number(l.debit_amount || 0)),
        credit_amount: roundMoney(Number(l.credit_amount || 0)),
        memo: l.memo ? String(l.memo).trim() : undefined,
      };
    });

    for (const line of enrichedLines) {
      if (!coaMap.has(line.account_code)) {
        return {
          result: {
            ok: false,
            error: `Schyot kodi "${line.account_code}" korxonaning faol 21-BHMS schyotlar rejasida topilmadi! Faqat tizim yo'riqnomasidagi schyotlardan foydalaning.`,
          },
        };
      }
    }

    const parsed = journalProposalPayloadSchema.safeParse({
      entry_date: String(args.entry_date || todayIso()),
      description: String(args.description || args.title || ""),
      lines: enrichedLines,
    });

    if (!parsed.success) {
      return {
        result: {
          ok: false,
          error: parsed.error.issues[0]?.message || "Provodka ma'lumotlari noto'g'ri",
        },
      };
    }

    const totalDebit = parsed.data.lines.reduce((s, l) => s + l.debit_amount, 0);
    const accountsText = parsed.data.lines
      .map((l) => `${l.debit_amount > 0 ? "Dt" : "Kt"} ${l.account_code}`)
      .join(" / ");

    const proposal: AgentActionProposal = {
      type: "journal_entry",
      title: String(args.title || "Yangi 21-BHMS provodka"),
      summary: parsed.data.description,
      amount: formatUzs(totalDebit),
      accounts: accountsText,
      payload: parsed.data,
    };

    return {
      result: { ok: true, status: "proposed_for_user_approval", total_uzs: totalDebit, accounts: accountsText },
      proposal,
    };
  }

  if (name === "propose_reverse_entry") {
    const parsed = reverseEntryPayloadSchema.safeParse({
      entry_id: args.entry_id,
      reason: args.reason,
    });
    if (!parsed.success) {
      return { result: { ok: false, error: parsed.error.issues[0]?.message || "Noto'g'ri parametr" } };
    }
    const { data: je } = await supabase
      .from("journal_entries")
      .select("id, entry_number, description, status")
      .eq("id", parsed.data.entry_id)
      .eq("business_entity_id", entity.id)
      .maybeSingle();

    if (!je) return { result: { ok: false, error: "Provodka topilmadi" } };
    if (je.status !== "posted") {
      return { result: { ok: false, error: `Faqat 'posted' provodkani storno qilish mumkin (joriy holat: ${je.status})` } };
    }

    const proposal: AgentActionProposal = {
      type: "reverse_entry",
      title: `${je.entry_number} — Storno qilish`,
      summary: `${je.description} | Sabab: ${parsed.data.reason}`,
      targetId: je.id,
      payload: { ...parsed.data, entry_number: je.entry_number },
    };
    return { result: { ok: true, status: "proposed_for_user_approval", entry_number: je.entry_number }, proposal };
  }

  if (name === "propose_resolve_exception") {
    const id = String(args.exception_id || "");
    const decision = args.decision === "reject" ? "reject" : "approve";
    if (!UUID_REGEX.test(id)) return { result: { ok: false, error: "Noto'g'ri exception_id" } };
    const { data: exc } = await supabase
      .from("exceptions")
      .select("id, title, amount, status, ai_suggestion")
      .eq("id", id)
      .eq("business_entity_id", entity.id)
      .maybeSingle();
    if (!exc) return { result: { ok: false, error: "Istisno topilmadi" } };

    const proposal: AgentActionProposal = {
      type: "exception",
      title: exc.title,
      summary: exc.ai_suggestion || "Audit istisnosini yopish",
      amount: exc.amount ? formatUzs(Number(exc.amount)) : undefined,
      targetId: exc.id,
      payload: { exception_id: exc.id, decision },
    };
    return { result: { ok: true, status: "proposed_for_user_approval" }, proposal };
  }

  if (name === "propose_transaction_status") {
    const id = String(args.transaction_id || "");
    const status = args.status === "rejected" ? "rejected" : "posted";
    if (!UUID_REGEX.test(id)) return { result: { ok: false, error: "Noto'g'ri transaction_id" } };
    const { data: tx } = await supabase
      .from("transactions")
      .select("id, counterparty, amount, type, status, account_code")
      .eq("id", id)
      .eq("business_entity_id", entity.id)
      .maybeSingle();
    if (!tx) return { result: { ok: false, error: "Tranzaksiya topilmadi" } };

    const proposal: AgentActionProposal = {
      type: "transaction",
      title: `${tx.counterparty} — ${status === "posted" ? "Tasdiqlash" : "Rad etish"}`,
      amount: formatUzs(Number(tx.amount)),
      accounts: tx.type === "income" ? `Dt 5110 / Kt ${tx.account_code || "4010"}` : `Dt ${tx.account_code || "6010"} / Kt 5110`,
      targetId: tx.id,
      payload: { transaction_id: tx.id, status },
    };
    return { result: { ok: true, status: "proposed_for_user_approval" }, proposal };
  }

  if (name === "propose_close_period") {
    const parsed = closePeriodPayloadSchema.safeParse({
      from_date: args.from_date,
      to_date: args.to_date,
      closing_date: args.closing_date || args.to_date,
    });
    if (!parsed.success) {
      return { result: { ok: false, error: parsed.error.issues[0]?.message || "Davr sanalari xato" } };
    }
    const proposal: AgentActionProposal = {
      type: "close_period",
      title: `Davrni yopish (${parsed.data.from_date} — ${parsed.data.to_date})`,
      summary: "90xx/91xx/94xx schyotlari 9910 orqali 8710 (Taqsimlanmagan foyda) ga yopiladi",
      payload: parsed.data,
    };
    return { result: { ok: true, status: "proposed_for_user_approval" }, proposal };
  }

  return { result: { ok: false, error: `Noma'lum tool: ${name}` } };
}

function tryBuildExplicitActionProposal(
  message: string,
  ctx: ToolContext
): { proposal?: AgentActionProposal; replyText?: string; errorText?: string } {
  if (!isMutatingRole(ctx.userRole)) return {};
  const q = message.toLowerCase();

  const provodkaMatch = q.match(/provodka\s+(\d+(?:[.,]\d+)?)\s+(\d{4})\s+(\d{4})/);
  if (provodkaMatch) {
    const amount = roundMoney(Number(provodkaMatch[1].replace(",", ".")));
    const dt = provodkaMatch[2];
    const kt = provodkaMatch[3];
    if (!ctx.coaMap.has(dt) || !ctx.coaMap.has(kt) || amount <= 0) {
      return { errorText: `Schyot kodlari (${dt}, ${kt}) faol 21-BHMS schyotlar rejasida topilmadi yoki summa noto'g'ri.` };
    }
    if (dt === kt) {
      return { errorText: `Debet (${dt}) va Kredit (${kt}) bir xil schyot bo'lishi mumkin emas.` };
    }
    const withVat = q.includes("qqs");
    const lines =
      withVat && (kt === "9010" || kt === "9020" || kt === "9030") && ctx.coaMap.has("6410")
        ? (() => {
            const split = splitVatInclusive(amount, 12);
            return [
              { account_code: dt, account_name: ctx.coaMap.get(dt)!.name, debit_amount: amount, credit_amount: 0, memo: "QQS bilan jami summa" },
              { account_code: kt, account_name: ctx.coaMap.get(kt)!.name, debit_amount: 0, credit_amount: split.net, memo: "QQSsiz tushum" },
              { account_code: "6410", account_name: ctx.coaMap.get("6410")!.name, debit_amount: 0, credit_amount: split.vat, memo: "12% QQS" },
            ];
          })()
        : [
            { account_code: dt, account_name: ctx.coaMap.get(dt)!.name, debit_amount: amount, credit_amount: 0, memo: `AI Agent taklifi: ${dt} -> ${kt}` },
            { account_code: kt, account_name: ctx.coaMap.get(kt)!.name, debit_amount: 0, credit_amount: amount, memo: `AI Agent taklifi: ${dt} -> ${kt}` },
          ];

    const proposal: AgentActionProposal = {
      type: "journal_entry",
      title: `21-BHMS Provodka: Dt ${dt} / Kt ${kt}`,
      summary: withVat ? "QQS 12% ajratilgan provodka loyihasi" : "Ikkiyoqlama standart provodka loyihasi",
      amount: formatUzs(amount),
      accounts: lines.map((l) => `${l.debit_amount > 0 ? "Dt" : "Kt"} ${l.account_code}`).join(" / "),
      payload: {
        entry_date: todayIso(),
        description: `AI Agent orqali tuzilgan provodka (${dt} / ${kt})`,
        lines,
      },
    };
    return {
      proposal,
      replyText: `«${ctx.entity.legal_name}» uchun balanslangan 21-BHMS provodka loyihasi tayyorlandi (${formatUzs(amount)}). Bazaga yozish uchun quyidagi «Tasdiqlash» tugmasini bosing.`,
    };
  }

  if (q.includes("davr") && q.includes("yop")) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    const fromDate = `${y}-${m}-01`;
    const toDate = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    return {
      proposal: {
        type: "close_period",
        title: `Davrni yopish (${fromDate} — ${toDate})`,
        summary: "90xx/91xx/94xx schyotlari 9910 orqali 8710 ga yopiladi",
        payload: { from_date: fromDate, to_date: toDate, closing_date: toDate },
      },
      replyText: `${fromDate} – ${toDate} davrini yopish (90xx/91xx/94xx schyotlarini 9910 orqali 8710 ga o'tkazish) bo'yicha taklif tayyorlandi.`,
    };
  }

  return {};
}

async function runDeterministicAgent(params: {
  message: string;
  ctx: ToolContext;
  geminiFailureReason?: string;
}): Promise<AgentResult> {
  const { message, ctx, geminiFailureReason } = params;
  const { supabase, entity, userRole } = ctx;
  const canExecute = isMutatingRole(userRole);
  const q = message.toLowerCase();
  const toolCalls = ["deterministic_live_db"];

  const [txRes, excRes, bankRes, tbRes] = await Promise.all([
    supabase.from("transactions").select("*").eq("business_entity_id", entity.id).order("date", { ascending: false }).limit(50),
    supabase.from("exceptions").select("*").eq("business_entity_id", entity.id).order("created_at", { ascending: false }),
    supabase.from("bank_accounts").select("*").eq("business_entity_id", entity.id),
    supabase.rpc("get_trial_balance", { p_entity_id: entity.id, p_from_date: "1970-01-01", p_to_date: "2099-12-31" }),
  ]);

  const transactions = txRes.data || [];
  const exceptions = excRes.data || [];
  const bankAccounts = bankRes.data || [];
  const trialBalance = tbRes.data || [];

  const openExceptions = exceptions.filter((e: any) => e.status === "open" || e.status === "in_review");
  const pendingTxs = transactions.filter((t: any) => t.status === "pending");
  const totalBankBalance = bankAccounts.reduce((s: number, b: any) => s + Number(b.balance || 0), 0);

  const row6410 = trialBalance.find((r: any) => r.account_code === "6410");
  const row4410 = trialBalance.find((r: any) => r.account_code === "4410");
  const vatOutput = Number(row6410?.closing_credit || row6410?.period_credit || 0);
  const vatInput = Number(row4410?.closing_debit || row4410?.period_debit || 0);
  const netVat = Math.max(0, roundMoney(vatOutput - vatInput));

  let reply = "";
  let actionProposed: AgentActionProposal | undefined;

  const explicitAction = tryBuildExplicitActionProposal(message, ctx);
  if (explicitAction.errorText) {
    reply = explicitAction.errorText;
  } else if (explicitAction.proposal && explicitAction.replyText) {
    actionProposed = explicitAction.proposal;
    reply = explicitAction.replyText;
  } else if (q.includes("provodka") && !canExecute) {
    reply = `Sizning rolingiz (${userRole}) provodka yaratish huquqiga ega emas.`;
  } else if (q.includes("istisno") || q.includes("xato") || q.includes("audit") || q.includes("exception")) {
    toolCalls.push("query_exceptions");
    if (openExceptions.length === 0) {
      reply = `«${entity.legal_name}» korxonasida hozirda ochiq AI Auditor istisnolari mavjud emas (jami ${exceptions.length} ta yozuv koʻrilgan).`;
    } else {
      const top = openExceptions[0];
      reply = `«${entity.legal_name}» korxonasida ${openExceptions.length} ta ochiq istisno bor. Eng muhimi: «${top.title}»${top.amount ? ` (${formatUzs(Number(top.amount))})` : ""}. Tavsiya: ${top.ai_suggestion}`;
      if (canExecute) {
        actionProposed = {
          type: "exception",
          targetId: top.id,
          title: top.title,
          summary: top.ai_suggestion,
          amount: top.amount ? formatUzs(Number(top.amount)) : undefined,
          accounts: "Debet 6010 / Kredit 5110",
          payload: { exception_id: top.id, decision: "approve" },
        };
      }
    }
  } else if (q.includes("qqs") || q.includes("soliq") || q.includes("vat") || q.includes("tax")) {
    toolCalls.push("get_trial_balance_6410_4410");
    reply = `«${entity.legal_name}» Bosh kitobi boʻyicha: Chiquvchi QQS (6410) = ${formatUzs(vatOutput)}, Zachyotga olinadigan QQS (4410) = ${formatUzs(vatInput)}. Budjetga sof QQS majburiyati: ${formatUzs(netVat)}.`;
  } else if (q.includes("oborot") || q.includes("vedomost") || q.includes("bosh kitob") || q.includes("schyot")) {
    toolCalls.push("get_trial_balance");
    const nonZero = trialBalance
      .filter((r: any) => Number(r.period_debit || 0) > 0 || Number(r.period_credit || 0) > 0)
      .slice(0, 8)
      .map((r: any) => `• ${r.account_code} (${r.account_name}): Dt ${formatUzs(Number(r.period_debit || 0))} / Kt ${formatUzs(Number(r.period_credit || 0))}`)
      .join("\n");
    reply = `«${entity.legal_name}» Oborot-saldovaya vedomost (faol schyotlar):\n${nonZero || "Hozircha harakatlar yo'q."}`;
  } else if (q.includes("bank") || q.includes("qoldiq") || q.includes("balans") || q.includes("pul")) {
    toolCalls.push("query_bank_accounts", "query_transactions");
    const list = bankAccounts.map((b: any) => `• ${b.bank_name} (${b.currency}): ${formatUzs(Number(b.balance))}`).join("\n");
    reply = `«${entity.legal_name}» bank hisobvaraqlari (${bankAccounts.length} ta, Jami: ${formatUzs(totalBankBalance)}):\n${list || "Hisobvaraqlar ulanmagan."}\n\nTasdiqlashni kutayotgan operatsiyalar: ${pendingTxs.length} ta.`;
    if (pendingTxs[0] && canExecute) {
      const tx = pendingTxs[0];
      actionProposed = {
        type: "transaction",
        targetId: tx.id,
        title: `${tx.counterparty} — Tasdiqlash`,
        amount: formatUzs(Number(tx.amount)),
        accounts: tx.type === "income" ? "Debet 5110 / Kredit 4010" : "Debet 6010 / Kredit 5110",
        payload: { transaction_id: tx.id, status: "posted" },
      };
    }
  } else {
    toolCalls.push("query_financial_overview");
    reply = `«${entity.legal_name}» (STIR: ${entity.tin_stir}) boʻyicha jonli holat:\n• Bank qoldigʻi: ${formatUzs(totalBankBalance)}\n• Ochiq istisnolar: ${openExceptions.length} ta | Kutilayotgan bank operatsiyalari: ${pendingTxs.length} ta\n• Sof QQS majburiyati (6410-4410): ${formatUzs(netVat)}\n\nTezkor buyruq namunasi: "provodka 1120000 4010 9030 qqs" yoki "oborot ko'rsat" deb yozing.`;
    if (openExceptions[0] && canExecute) {
      actionProposed = {
        type: "exception",
        targetId: openExceptions[0].id,
        title: openExceptions[0].title,
        summary: openExceptions[0].ai_suggestion,
        amount: openExceptions[0].amount ? formatUzs(Number(openExceptions[0].amount)) : undefined,
        payload: { exception_id: openExceptions[0].id, decision: "approve" },
      };
    }
  }

  if (geminiFailureReason) {
    reply += `\n\n(${geminiFailureReason})`;
  } else if (!process.env.GEMINI_API_KEY) {
    reply += `\n\n(Eslatma: Erkin tabiiy tilda toʻliq AI Function Calling ishlashi uchun .env.local fayliga bepul Google AI Studio \`GEMINI_API_KEY\` kalitini qoʻshing — hozir qatʼiy Supabase tahlil rejimi ishlamoqda.)`;
  }

  return {
    mode: "deterministic_guard",
    modelUsed: "deterministic-21bhms-guard",
    reply,
    toolCalls,
    actionProposed,
    userRole,
    canExecuteActions: canExecute,
  };
}

export async function runFirmusAgent(params: {
  supabase: SupabaseClient;
  userId: string;
  userEmail: string | undefined;
  entity: any;
  message: string;
  history?: AgentHistoryItem[];
}): Promise<AgentResult> {
  const { supabase, userId, userEmail, entity, message, history = [] } = params;

  const [coaRes, userRole] = await Promise.all([
    supabase
      .from("chart_of_accounts")
      .select("code, name, type")
      .eq("business_entity_id", entity.id)
      .eq("is_active", true)
      .order("code", { ascending: true }),
    resolveUserEntityRole(supabase, userId, userEmail, entity),
  ]);

  const coaRows = (coaRes.data || []) as Array<{ code: string; name: string; type: string }>;
  const coaMap = new Map(coaRows.map((c) => [c.code, c]));
  const ctx: ToolContext = { supabase, entity, coaMap, userRole };
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return runDeterministicAgent({ message, ctx });
  }

  const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const modelChain = Array.from(
    new Set([primaryModel, "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-lite-latest"])
  );
  const systemInstruction = buildFirmusSystemInstruction({ entity, coaRows, userRole });

  const baseContents: any[] = history.slice(-8).map((h) => ({
    role: h.sender === "user" ? "user" : "model",
    parts: [{ text: h.text }],
  }));
  baseContents.push({ role: "user", parts: [{ text: message }] });

  let lastErrorNote = "";

  for (const modelName of modelChain) {
    try {
      const contents = [...baseContents];
      const toolCallsUsed: string[] = [];
      let pendingProposal: AgentActionProposal | undefined;

      for (let round = 0; round < 4; round++) {
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
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents,
              tools: [{ functionDeclarations: GEMINI_TOOL_DECLARATIONS }],
              toolConfig: { functionCallingConfig: { mode: "AUTO" } },
              generationConfig: {
                temperature: 0.0,
                topP: 0.9,
                maxOutputTokens: 2048,
              },
            }),
          }
        );

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          lastErrorNote = `Gemini ${modelName} HTTP ${res.status}`;
          console.warn(`[FIRMUS AI] ${modelName} error ${res.status}:`, errText.slice(0, 200));
          break;
        }

        const data = await res.json();
        const candidateContent = data?.candidates?.[0]?.content;
        const parts: any[] = candidateContent?.parts || [];
        const fnCalls = parts.filter((p) => p.functionCall);

        if (fnCalls.length === 0) {
          const textReply = parts
            .map((p) => p.text || "")
            .join("")
            .trim();
          if (!pendingProposal && isMutatingRole(userRole)) {
            const safeFallbackProposal = tryBuildExplicitActionProposal(message, ctx);
            if (safeFallbackProposal.proposal) {
              pendingProposal = safeFallbackProposal.proposal;
            }
          }
          if (textReply || pendingProposal) {
            return {
              mode: "gemini_agent",
              modelUsed: modelName,
              reply:
                textReply ||
                "Amaliy taklif tayyorlandi. Tasdiqlash uchun quyidagi kartadan foydalaning.",
              toolCalls: toolCallsUsed.length > 0 ? toolCallsUsed : [modelName],
              actionProposed: pendingProposal,
              userRole,
              canExecuteActions: isMutatingRole(userRole),
            };
          }
          break;
        }

        // Preserve model tool calls in conversation turns
        contents.push({ role: "model", parts });

        const fnResponses: any[] = [];
        for (const callPart of fnCalls) {
          const { name, args } = callPart.functionCall;
          toolCallsUsed.push(name);
          const exec = await runToolCall(name, args || {}, ctx);
          if (exec.proposal) {
            pendingProposal = exec.proposal;
          }
          fnResponses.push({
            functionResponse: {
              ...(callPart.functionCall.id ? { id: callPart.functionCall.id } : {}),
              name,
              response: exec.result,
            },
          });
        }

        contents.push({ role: "user", parts: fnResponses });
      }
    } catch (err: any) {
      lastErrorNote = `Gemini ${modelName} ulanish xatosi`;
      console.warn(`[FIRMUS AI] ${modelName} exception:`, err?.message || err);
    }
  }

  return runDeterministicAgent({
    message,
    ctx,
    geminiFailureReason: lastErrorNote
      ? `Tashqi LLM (${lastErrorNote}) vaqtincha javob bermaganligi sababli qatʼiy Supabase tahlil rejimi ishlatildi.`
      : undefined,
  });
}
