import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { authenticate1CBridgeToken } from "@/lib/services/onec-connector";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate1CBridgeToken(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const service = getServiceClient();

    // Fetch up to 50 pending draft items for this business entity
    const { data: queueItems, error: findErr } = await service
      .from("onec_draft_queue")
      .select("id, source_kind, doc_type, doc_date, counterparty_name, counterparty_stir, amount, vat_amount, debit_account, credit_account, description, payload, created_at")
      .eq("business_entity_id", auth.businessEntityId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (findErr) {
      return NextResponse.json({ error: "Qoralamalar navbatini oʻqishda xatolik." }, { status: 500 });
    }

    const items = queueItems || [];

    if (items.length > 0) {
      const ids = items.map((i) => i.id);
      await service
        .from("onec_draft_queue")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .in("id", ids);
    }

    return NextResponse.json({
      ok: true,
      count: items.length,
      items: items.map((q) => ({
        id: q.id,
        sourceKind: q.source_kind,
        docType: q.doc_type,
        docDate: q.doc_date,
        counterpartyName: q.counterparty_name,
        counterpartyStir: q.counterparty_stir,
        amount: Number(q.amount),
        vatAmount: Number(q.vat_amount),
        debitAccount: q.debit_account,
        creditAccount: q.credit_account,
        description: q.description,
        payload: q.payload,
        createdAt: q.created_at,
        // Guarantee safety rule: Instruct 1C external processor to NEVER post (Проводить)
        postMode: "DraftOnly",
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server xatosi yuz berdi." },
      { status: 500 }
    );
  }
}
