import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { agentExecuteRequestSchema } from "@/lib/ai/agent-types";
import { isMutatingRole, resolveUserEntityRole } from "@/lib/ai/firmus-agent";

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
    const parsed = agentExecuteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Notoʻgʻri amal maʻlumotlari" },
        { status: 400 }
      );
    }

    const { entityId, decision, modelUsed, proposal } = parsed.data;

    const { data: entity } = await supabase
      .from("business_entities")
      .select("id, workspace_id, legal_name")
      .eq("id", entityId)
      .maybeSingle();

    if (!entity) {
      return NextResponse.json({ error: "Korxona topilmadi yoki ruxsat yoʻq" }, { status: 403 });
    }

    const userRole = await resolveUserEntityRole(
      supabase,
      user.id,
      user.email,
      entity,
      Boolean(user.email_confirmed_at)
    );
    if (!isMutatingRole(userRole)) {
      return NextResponse.json(
        { error: `Sizning rolingiz (${userRole}) moliyaviy amallarni bajarish huquqiga ega emas` },
        { status: 403 }
      );
    }

    let executionResult: any = null;
    let resolvedTargetId: string | null = "targetId" in proposal && proposal.targetId ? proposal.targetId : null;

    try {
      if (decision === "reject") {
        if (proposal.type === "exception" && proposal.targetId) {
          const { error } = await supabase
            .from("exceptions")
            .update({ status: "rejected", resolved_at: new Date().toISOString() })
            .eq("id", proposal.targetId)
            .eq("business_entity_id", entity.id);
          if (error) throw error;
        } else if (proposal.type === "transaction" && proposal.targetId) {
          const { error } = await supabase
            .from("transactions")
            .update({ status: "rejected" })
            .eq("id", proposal.targetId)
            .eq("business_entity_id", entity.id);
          if (error) throw error;
        }

        await supabase.from("ai_action_logs").insert({
          business_entity_id: entity.id,
          actor_user_id: user.id,
          action_type: proposal.type,
          target_id: resolvedTargetId,
          summary: `${proposal.title} — rad etildi`,
          payload: proposal,
          model_used: modelUsed,
          decision: "rejected",
        });

        return NextResponse.json({
          ok: true,
          decision: "rejected",
          message: "Taklif rad etildi va audit jurnaliga yozildi.",
        });
      }

      // APPROVED EXECUTION
      if (proposal.type === "journal_entry") {
        const { data: coaRows } = await supabase
          .from("chart_of_accounts")
          .select("code, name")
          .eq("business_entity_id", entity.id)
          .eq("is_active", true);
        const coaMap = new Map((coaRows || []).map((c: any) => [c.code, c.name]));

        for (const l of proposal.payload.lines) {
          if (!coaMap.has(l.account_code)) {
            throw new Error(`Schyot kodi "${l.account_code}" korxona schyotlar rejasida mavjud emas`);
          }
        }

        const hash = crypto
          .createHash("sha256")
          .update(JSON.stringify({ entityId: entity.id, payload: proposal.payload }))
          .digest("hex");

        const { data, error } = await supabase.rpc("create_journal_entry_atomic", {
          p_business_entity_id: entity.id,
          p_entry_number: `JE-AI-${hash.slice(0, 8).toUpperCase()}`,
          p_entry_date: proposal.payload.entry_date,
          p_description: proposal.payload.description,
          p_source_type: "ai_agent",
          p_source_reference_id: null,
          p_idempotency_key: `idem-ai-${hash.slice(0, 24)}`,
          p_lines: proposal.payload.lines.map((l) => ({
            account_code: l.account_code,
            account_name: coaMap.get(l.account_code) || l.account_name,
            debit_amount: l.debit_amount,
            credit_amount: l.credit_amount,
            memo: l.memo || proposal.payload.description,
          })),
        });
        if (error) throw error;
        executionResult = data;
        if (data?.id) resolvedTargetId = data.id;
      } else if (proposal.type === "reverse_entry") {
        const { data, error } = await supabase.rpc("reverse_journal_entry", {
          p_entry_id: proposal.payload.entry_id,
          p_reason: proposal.payload.reason,
        });
        if (error) throw error;
        executionResult = data;
        if (data?.id) resolvedTargetId = data.id;
      } else if (proposal.type === "exception") {
        const { data, error } = await supabase
          .from("exceptions")
          .update({ status: "approved", resolved_at: new Date().toISOString() })
          .eq("id", proposal.targetId)
          .eq("business_entity_id", entity.id)
          .select("id, status")
          .single();
        if (error) throw error;
        executionResult = data;
      } else if (proposal.type === "transaction") {
        const { data: tx, error: txFetchErr } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", proposal.targetId)
          .eq("business_entity_id", entity.id)
          .single();
        if (txFetchErr || !tx) throw txFetchErr || new Error("Tranzaksiya topilmadi");

        const { error: updErr } = await supabase
          .from("transactions")
          .update({ status: "posted" })
          .eq("id", tx.id)
          .eq("business_entity_id", entity.id);
        if (updErr) throw updErr;

        if (Number(tx.amount) > 0) {
          const corrCode = tx.account_code || (tx.type === "income" ? "4010" : "6010");
          const debitCode = tx.type === "income" ? "5110" : corrCode;
          const creditCode = tx.type === "income" ? corrCode : "5110";
          const { error: jeErr } = await supabase.rpc("create_journal_entry_atomic", {
            p_business_entity_id: entity.id,
            p_entry_number: `JE-APPR-${String(tx.id).slice(0, 8).toUpperCase()}`,
            p_entry_date: tx.date,
            p_description: `${tx.counterparty}: ${tx.description}`,
            p_source_type: "bank_statement",
            p_source_reference_id: String(tx.id),
            p_idempotency_key: `idem-tx-approve-${tx.id}`,
            p_lines: [
              { account_code: debitCode, debit_amount: Number(tx.amount), credit_amount: 0, memo: tx.description },
              { account_code: creditCode, debit_amount: 0, credit_amount: Number(tx.amount), memo: tx.description },
            ],
          });
          if (jeErr) throw jeErr;
        }
        executionResult = { id: tx.id, status: "posted" };
      } else if (proposal.type === "contract") {
        const { data, error } = await supabase
          .from("contracts")
          .insert({
            business_entity_id: entity.id,
            number: proposal.payload.number,
            type: proposal.payload.type,
            counterparty: proposal.payload.counterparty,
            counterparty_stir: proposal.payload.counterparty_stir,
            amount: proposal.payload.amount,
            start_date: proposal.payload.start_date,
            end_date: proposal.payload.end_date,
            status: "active",
            auto_renewal: false,
            description: proposal.payload.description || "AI Agent orqali qo'shildi",
          })
          .select("id, number")
          .single();
        if (error) throw error;
        executionResult = data;
        if (data?.id) resolvedTargetId = data.id;
      } else if (proposal.type === "inventory_item") {
        const status =
          proposal.payload.quantity <= 0
            ? "out_of_stock"
            : proposal.payload.quantity <= 5
            ? "low_stock"
            : "in_stock";
        const { data, error } = await supabase
          .from("inventory_items")
          .insert({
            business_entity_id: entity.id,
            sku: proposal.payload.sku,
            name: proposal.payload.name,
            category: proposal.payload.category,
            quantity: proposal.payload.quantity,
            unit: proposal.payload.unit,
            unit_price: proposal.payload.unit_price,
            status,
          })
          .select("id, sku")
          .single();
        if (error) throw error;
        executionResult = data;
        if (data?.id) resolvedTargetId = data.id;
      } else if (proposal.type === "employee") {
        const { data, error } = await supabase
          .from("employees")
          .insert({
            business_entity_id: entity.id,
            full_name: proposal.payload.full_name,
            position: proposal.payload.position,
            department: proposal.payload.department,
            salary: proposal.payload.salary,
            pinfl: proposal.payload.pinfl,
            hire_date: proposal.payload.hire_date,
            status: "active",
          })
          .select("id, full_name")
          .single();
        if (error) throw error;
        executionResult = data;
        if (data?.id) resolvedTargetId = data.id;
      } else if (proposal.type === "close_period") {
        const { data, error } = await supabase.rpc("close_accounting_period", {
          p_business_entity_id: entity.id,
          p_from_date: proposal.payload.from_date,
          p_to_date: proposal.payload.to_date,
          p_closing_date: proposal.payload.closing_date,
          p_idempotency_key: `idem-close-${entity.id}-${proposal.payload.from_date}-${proposal.payload.to_date}`,
        });
        if (error) throw error;
        executionResult = data;
      }

      await supabase.from("ai_action_logs").insert({
        business_entity_id: entity.id,
        actor_user_id: user.id,
        action_type: proposal.type,
        target_id: resolvedTargetId,
        summary: proposal.title,
        payload: proposal,
        model_used: modelUsed,
        decision: "approved",
      });

      return NextResponse.json({
        ok: true,
        decision: "approved",
        result: executionResult,
        message: "Amal server tomonida tekshirildi, Supabase bazasiga yozildi va audit jurnaliga qayd etildi!",
      });
    } catch (execErr: any) {
      await supabase.from("ai_action_logs").insert({
        business_entity_id: entity.id,
        actor_user_id: user.id,
        action_type: proposal.type,
        target_id: resolvedTargetId,
        summary: proposal.title,
        payload: proposal,
        model_used: modelUsed,
        decision: "failed",
        error_message: execErr?.message || "Noma'lum xatolik",
      });
      return NextResponse.json(
        { error: execErr?.message || "Amalni bajarishda xatolik" },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("AI Execute error:", err);
    return NextResponse.json(
      { error: err?.message || "Server xatosi" },
      { status: 500 }
    );
  }
}
