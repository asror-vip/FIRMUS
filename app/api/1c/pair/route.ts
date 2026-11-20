import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import {
  sha256Hex,
  generateIntegrationToken,
  normalizePairingCode,
  safeEqualStrings,
} from "@/lib/utils/crypto-secrets";
import { sanitizeStorageText } from "@/lib/utils/privacy";
import { UUID_REGEX } from "@/lib/ai/agent-types";

export const dynamic = "force-dynamic";

const PAIR_IP_MAX_REQUESTS = 10;
const PAIR_IP_WINDOW_SECONDS = 900; // 15 minutes
const PAIR_MAX_FAILED_ATTEMPTS = 5;
const PAIR_LOCK_MINUTES = 15;
const INTEGRATION_TOKEN_TTL_DAYS = 90;

function extractClientIp(req: NextRequest): string {
  const vercelIp = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelIp) return vercelIp;

  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;

  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

async function recordIpPairFailure(
  service: ReturnType<typeof getServiceClient>,
  ipHash: string
): Promise<{ locked: boolean; retryAfterSec: number }> {
  const { data, error } = await service.rpc("check_rate_limit_atomic", {
    p_bucket_key: `1c_pair_fail_ip:${ipHash}`,
    p_max_hits: PAIR_MAX_FAILED_ATTEMPTS,
    p_window_seconds: PAIR_LOCK_MINUTES * 60,
  });

  if (error || !data) {
    return { locked: false, retryAfterSec: PAIR_LOCK_MINUTES * 60 };
  }

  const allowed = Boolean((data as any).allowed);
  const retryAfterSec = Math.max(1, Number((data as any).reset_in_seconds || PAIR_LOCK_MINUTES * 60));
  return { locked: !allowed, retryAfterSec };
}

export async function POST(req: NextRequest) {
  try {
    const service = getServiceClient();
    const clientIp = extractClientIp(req);
    const ipHash = sha256Hex(`1c-pair-ip:${clientIp}`);

    // 1. Database-backed IP rate limit (never in-memory)
    const { data: ipRate, error: ipRateErr } = await service.rpc("check_rate_limit_atomic", {
      p_bucket_key: `1c_pair_ip:${ipHash}`,
      p_max_hits: PAIR_IP_MAX_REQUESTS,
      p_window_seconds: PAIR_IP_WINDOW_SECONDS,
    });

    if (ipRateErr || !ipRate) {
      console.error("[1C PAIR] DB rate limit check failed:", ipRateErr);
      return NextResponse.json(
        { error: "Soʻrovlar tezligini tekshirishda vaqtinchalik xatolik yuz berdi. Birozdan soʻng urinib koʻring." },
        { status: 503 }
      );
    }

    if (!(ipRate as any).allowed) {
      const retryAfter = Math.max(1, Number((ipRate as any).reset_in_seconds || 60));
      return NextResponse.json(
        { error: "Juda koʻp urinish qilindi. Biroz kutib qayta urinib koʻring." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const normalizedCode = normalizePairingCode(String(body?.pairingCode || body?.code || ""));
    const rawConnectionId = String(body?.connectionId || "").trim();

    if (rawConnectionId && !UUID_REGEX.test(rawConnectionId)) {
      await recordIpPairFailure(service, ipHash);
      return NextResponse.json(
        { error: "Ulash identifikatori (connectionId) notoʻgʻri formatda." },
        { status: 400 }
      );
    }

    if (!/^[A-Z0-9]{8,16}$/.test(normalizedCode)) {
      const failState = await recordIpPairFailure(service, ipHash);
      if (failState.locked) {
        return NextResponse.json(
          { error: "Koʻp marta notoʻgʻri kod kiritildi. Ulash 15 daqiqaga vaqtincha bloklandi." },
          { status: 429, headers: { "Retry-After": String(failState.retryAfterSec) } }
        );
      }
      return NextResponse.json(
        { error: "Ulash kodi kamida 8 ta harf va raqamdan (masalan, ABCD-2345) iborat boʻlishi shart." },
        { status: 400 }
      );
    }

    const codeHash = sha256Hex(normalizedCode);

    // 2. Lookup pending pairing connection (either scoped by connectionId or by codeHash)
    let conn: any = null;
    if (rawConnectionId) {
      const { data: byId, error: byIdErr } = await service
        .from("integration_connections")
        .select(
          "id, workspace_id, business_entity_id, provider, status, config, pairing_code_hash, pairing_code_expires_at, pairing_failed_attempts, pairing_locked_until"
        )
        .eq("id", rawConnectionId)
        .eq("provider", "onec_epf")
        .eq("status", "pending_pair")
        .maybeSingle();

      if (byIdErr) {
        console.error("[1C PAIR] Lookup by connectionId failed:", byIdErr);
        return NextResponse.json({ error: "Server xatosi yuz berdi." }, { status: 500 });
      }

      if (!byId) {
        const failState = await recordIpPairFailure(service, ipHash);
        return NextResponse.json(
          {
            error: failState.locked
              ? "Koʻp marta notoʻgʻri urinish qilindi. Ulash 15 daqiqaga bloklandi."
              : "Ulash kodi topilmadi yoki allaqachon ishlatilgan.",
          },
          {
            status: failState.locked ? 429 : 400,
            headers: failState.locked ? { "Retry-After": String(failState.retryAfterSec) } : undefined,
          }
        );
      }

      // Check per-connection temporary lockout
      if (byId.pairing_locked_until && new Date(byId.pairing_locked_until).getTime() > Date.now()) {
        const retryAfter = Math.max(
          1,
          Math.ceil((new Date(byId.pairing_locked_until).getTime() - Date.now()) / 1000)
        );
        return NextResponse.json(
          { error: "Notoʻgʻri urinishlar soni oshib ketdi. Ushbu ulash kodi vaqtincha bloklangan." },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }

      if (!byId.pairing_code_hash || !safeEqualStrings(String(byId.pairing_code_hash), codeHash)) {
        const [connFailRes, ipFailState] = await Promise.all([
          service.rpc("record_1c_pair_failure", {
            p_connection_id: byId.id,
            p_max_attempts: PAIR_MAX_FAILED_ATTEMPTS,
            p_lock_minutes: PAIR_LOCK_MINUTES,
          }),
          recordIpPairFailure(service, ipHash),
        ]);
        const connLocked = Boolean((connFailRes.data as any)?.locked);
        if (connLocked || ipFailState.locked) {
          return NextResponse.json(
            { error: "Koʻp marta notoʻgʻri kod kiritildi. Ulash 15 daqiqaga vaqtincha bloklandi." },
            { status: 429, headers: { "Retry-After": String(PAIR_LOCK_MINUTES * 60) } }
          );
        }
        return NextResponse.json(
          { error: "Ulash kodi notoʻgʻri." },
          { status: 400 }
        );
      }

      conn = byId;
    } else {
      const { data: byHash, error: findErr } = await service
        .from("integration_connections")
        .select(
          "id, workspace_id, business_entity_id, provider, status, config, pairing_code_expires_at, pairing_failed_attempts, pairing_locked_until"
        )
        .eq("provider", "onec_epf")
        .eq("status", "pending_pair")
        .eq("pairing_code_hash", codeHash)
        .maybeSingle();

      if (findErr) {
        console.error("[1C PAIR] Lookup by hash failed:", findErr);
        return NextResponse.json({ error: "Server xatosi yuz berdi." }, { status: 500 });
      }

      if (!byHash) {
        const failState = await recordIpPairFailure(service, ipHash);
        return NextResponse.json(
          {
            error: failState.locked
              ? "Koʻp marta notoʻgʻri urinish qilindi. Ulash 15 daqiqaga bloklandi."
              : "Ulash kodi topilmadi yoki allaqachon ishlatilgan.",
          },
          {
            status: failState.locked ? 429 : 400,
            headers: failState.locked ? { "Retry-After": String(failState.retryAfterSec) } : undefined,
          }
        );
      }

      if (byHash.pairing_locked_until && new Date(byHash.pairing_locked_until).getTime() > Date.now()) {
        const retryAfter = Math.max(
          1,
          Math.ceil((new Date(byHash.pairing_locked_until).getTime() - Date.now()) / 1000)
        );
        return NextResponse.json(
          { error: "Notoʻgʻri urinishlar soni oshib ketdi. Ushbu ulash kodi vaqtincha bloklangan." },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        );
      }

      conn = byHash;
    }

    // 3. Verify 5-minute pairing code expiration
    if (!conn.pairing_code_expires_at || new Date(conn.pairing_code_expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Ulash kodining amal qilish muddati (5 daqiqa) tugagan. Yangi kod oling." },
        { status: 400 }
      );
    }

    // 4. Generate Bearer token with explicit expiration (90 days)
    const rawToken = generateIntegrationToken();
    const tokenHash = sha256Hex(rawToken);
    const nowIso = new Date().toISOString();
    const tokenExpiresAt = new Date(
      Date.now() + INTEGRATION_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const baseName = sanitizeStorageText(String(body?.baseName || "1C:Buxgalteriya").trim());
    const version = sanitizeStorageText(String(body?.version || "8.3").trim());

    const currentConfig = (conn.config as Record<string, unknown>) || {};
    const updatedConfig = {
      ...currentConfig,
      baseName,
      version,
      pairedAt: nowIso,
      tokenExpiresAt,
      pairCode: null,
      pairCodeExpiresAt: null,
    };

    const { error: updateErr } = await service
      .from("integration_connections")
      .update({
        status: "connected",
        pairing_code_hash: null,
        pairing_code_expires_at: null,
        pairing_failed_attempts: 0,
        pairing_locked_until: null,
        token_hash: tokenHash,
        token_expires_at: tokenExpiresAt,
        token_revoked_at: null,
        config: updatedConfig,
        last_sync_at: nowIso,
        last_error: null,
        updated_at: nowIso,
      })
      .eq("id", conn.id);

    if (updateErr) {
      console.error("[1C PAIR] Failed to persist paired connection:", updateErr);
      return NextResponse.json({ error: "Ulanishni saqlashda xatolik yuz berdi." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      token: rawToken,
      tokenExpiresAt,
      connectionId: conn.id,
      businessEntityId: conn.business_entity_id,
      message: "1C:Predpriyatiye tashqi koʻprigi muvaffaqiyatli ulandi.",
    });
  } catch (err: unknown) {
    // Never leak internal error messages to clients
    console.error("[1C PAIR] Unexpected error:", err);
    return NextResponse.json(
      { error: "Server xatosi yuz berdi." },
      { status: 500 }
    );
  }
}
