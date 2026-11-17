import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { sha256Hex, generateIntegrationToken } from "@/lib/utils/crypto-secrets";
import { sanitizeStorageText } from "@/lib/utils/privacy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = String(body?.pairingCode || body?.code || "").trim();

    if (!/^\d{6}$/.test(rawCode)) {
      return NextResponse.json(
        { error: "Ulash kodi aniq 6 ta raqamdan iborat boʻlishi shart." },
        { status: 400 }
      );
    }

    const codeHash = sha256Hex(rawCode);
    const service = getServiceClient();

    // Find pending pair record
    const { data: conn, error: findErr } = await service
      .from("integration_connections")
      .select("id, workspace_id, business_entity_id, provider, status, config, pairing_code_expires_at")
      .eq("provider", "onec_epf")
      .eq("status", "pending_pair")
      .eq("pairing_code_hash", codeHash)
      .maybeSingle();

    if (findErr || !conn) {
      return NextResponse.json(
        { error: "Ulash kodi topilmadi yoki allaqachon ishlatilgan." },
        { status: 400 }
      );
    }

    // Verify expiration
    if (conn.pairing_code_expires_at && new Date(conn.pairing_code_expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Ulash kodining amal qilish muddati (10 daqiqa) tugagan. Yangi kod oling." },
        { status: 400 }
      );
    }

    // Generate Bearer token
    const rawToken = generateIntegrationToken();
    const tokenHash = sha256Hex(rawToken);

    const baseName = sanitizeStorageText(String(body?.baseName || "1C:Buxgalteriya").trim());
    const version = sanitizeStorageText(String(body?.version || "8.3").trim());

    const currentConfig = (conn.config as Record<string, unknown>) || {};
    const updatedConfig = {
      ...currentConfig,
      baseName,
      version,
      pairedAt: new Date().toISOString(),
      pairCode: null,
      pairCodeExpiresAt: null,
    };

    const { error: updateErr } = await service
      .from("integration_connections")
      .update({
        status: "connected",
        pairing_code_hash: null,
        pairing_code_expires_at: null,
        token_hash: tokenHash,
        config: updatedConfig,
        last_sync_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conn.id);

    if (updateErr) {
      return NextResponse.json({ error: "Ulanishni saqlashda xatolik yuz berdi." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      token: rawToken,
      businessEntityId: conn.business_entity_id,
      message: "1C:Predpriyatiye tashqi koʻprigi muvaffaqiyatli ulandi.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server xatosi yuz berdi." },
      { status: 500 }
    );
  }
}
