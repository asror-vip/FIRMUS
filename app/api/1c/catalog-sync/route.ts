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
    const rawItems: any[] = Array.isArray(body?.items) ? body.items : [];

    if (rawItems.length === 0) {
      return NextResponse.json({ ok: true, syncedCount: 0, message: "Elementlar roʻyxati boʻsh." });
    }

    // Limit batch size to 500 per call for stability
    const cappedItems = rawItems.slice(0, 500);
    const service = getServiceClient();

    const rows = cappedItems
      .map((item) => {
        const rawType = String(item?.catalogType || "counterparty").toLowerCase();
        let catalogType: "counterparty" | "contract" | "account" | "nomenclature" = "counterparty";
        if (rawType === "contract") catalogType = "contract";
        else if (rawType === "account" || rawType === "bank_account") catalogType = "account";
        else if (rawType === "nomenclature") catalogType = "nomenclature";

        const externalRef = String(item?.externalRefKey || item?.externalRef || item?.refKey || "").trim();
        const name = sanitizeStorageText(String(item?.name || item?.description || "").trim());

        if (!externalRef || !name) return null;

        const rawStir = String(item?.tinStir || item?.inn || item?.stir || "").replace(/\D/g, "");
        const tinStir = /^\d{9}$/.test(rawStir) ? rawStir : null;
        const code = item?.code ? sanitizeStorageText(String(item.code).trim()) : null;

        return {
          business_entity_id: auth.businessEntityId,
          catalog_type: catalogType,
          external_ref: externalRef.slice(0, 120),
          tin_stir: tinStir,
          name: name.slice(0, 255),
          code: code ? code.slice(0, 60) : null,
          meta: item?.rawData || item?.meta || {},
          synced_at: new Date().toISOString(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length > 0) {
      const { error: upsertErr } = await service
        .from("integration_catalog_cache")
        .upsert(rows, { onConflict: "business_entity_id,catalog_type,external_ref" });

      if (upsertErr) {
        return NextResponse.json(
          { error: "Katalog elementlarini saqlashda xatolik yuz berdi." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      syncedCount: rows.length,
      message: `${rows.length} ta katalog elementi sinxronlandi.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server xatosi yuz berdi." },
      { status: 500 }
    );
  }
}
