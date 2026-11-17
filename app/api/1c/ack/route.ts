import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { authenticate1CBridgeToken } from "@/lib/services/onec-connector";
import { sanitizeStorageText } from "@/lib/utils/privacy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate1CBridgeToken(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const rawResults: any[] = Array.isArray(body?.results) ? body.results : [];

    if (rawResults.length === 0) {
      return NextResponse.json({ ok: true, updatedCount: 0 });
    }

    const service = getServiceClient();
    let updatedCount = 0;

    for (const res of rawResults) {
      const id = String(res?.id || "").trim();
      if (!id) continue;

      const isOk = res?.ok === true;
      const docNumber = res?.docNumber ? sanitizeStorageText(String(res.docNumber).trim()) : null;
      const refKey = res?.refKey ? sanitizeStorageText(String(res.refKey).trim()) : null;
      const errorMsg = res?.error ? sanitizeStorageText(String(res.error).trim()) : null;

      if (isOk) {
        await service
          .from("onec_draft_queue")
          .update({
            status: "pushed_to_1c_draft",
            target_1c_doc_number: docNumber,
            target_1c_ref_key: refKey,
            error_message: null,
            pushed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("business_entity_id", auth.businessEntityId);
        updatedCount++;
      } else {
        await service
          .from("onec_draft_queue")
          .update({
            status: "failed",
            error_message: errorMsg || "1C da hujjat yaratish xatosi",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("business_entity_id", auth.businessEntityId);
        updatedCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      updatedCount,
      message: `${updatedCount} ta qoralama holati yangilandi.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server xatosi yuz berdi." },
      { status: 500 }
    );
  }
}
