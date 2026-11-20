import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import {
  generatePairingCode,
  normalizePairingCode,
  sha256Hex,
  generateIntegrationToken,
} from "@/lib/utils/crypto-secrets";

// Mock Supabase service client so we can test /api/1c/pair and authenticate1CBridgeToken deterministically
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
  }),
}));

import { POST as pairPost } from "@/app/api/1c/pair/route";
import { authenticate1CBridgeToken } from "@/lib/services/onec-connector";

function makePairRequest(body: unknown, ip = "203.0.113.42"): NextRequest {
  return new NextRequest("https://firmus.uz/api/1c/pair", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function mockSelectChain(result: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    update: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    })),
  };
  return chain;
}

describe("Band 1: 1C Pairing Hardening, DB Rate Limit, Lockout & Token Expiry/Revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates 8-character unambiguous alphanumeric pairing codes (XXXX-XXXX)", () => {
    for (let i = 0; i < 20; i++) {
      const code = generatePairingCode(8);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      expect(normalizePairingCode(code)).toHaveLength(8);
    }
  });

  it("enforces DB-backed IP rate limit via check_rate_limit_atomic (429 + Retry-After)", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { allowed: false, reset_in_seconds: 320 },
      error: null,
    });

    const res = await pairPost(makePairRequest({ pairingCode: "ABCD-2345" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("320");
    expect(mockRpc).toHaveBeenCalledWith(
      "check_rate_limit_atomic",
      expect.objectContaining({
        p_max_hits: 10,
        p_window_seconds: 900,
      })
    );
  });

  it("prioritizes x-vercel-forwarded-for over spoofed x-forwarded-for for IP rate limiting", async () => {
    mockRpc.mockResolvedValueOnce({
      data: { allowed: false, reset_in_seconds: 60 },
      error: null,
    });

    const req = new NextRequest("https://firmus.uz/api/1c/pair", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-forwarded-for": "198.51.100.77",
        "x-forwarded-for": "1.2.3.4",
      },
      body: JSON.stringify({ pairingCode: "ABCD-2345" }),
    });

    await pairPost(req);
    const expectedHash = sha256Hex("1c-pair-ip:198.51.100.77");
    expect(mockRpc).toHaveBeenCalledWith(
      "check_rate_limit_atomic",
      expect.objectContaining({
        p_bucket_key: `1c_pair_ip:${expectedHash}`,
      })
    );
  });

  it("rejects short 6-digit codes and locks IP after repeated failed attempts", async () => {
    // 1st call: IP rate check allowed; 2nd call: IP fail counter hits lockout
    mockRpc
      .mockResolvedValueOnce({ data: { allowed: true, reset_in_seconds: 900 }, error: null })
      .mockResolvedValueOnce({ data: { allowed: false, reset_in_seconds: 900 }, error: null });

    const res = await pairPost(makePairRequest({ pairingCode: "123456" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("900");
  });

  it("increments per-connection failure counter and locks after 5 wrong tries with connectionId", async () => {
    const connId = "11111111-2222-4333-8444-555555555555";
    const rightHash = sha256Hex("ABCD2345");

    mockRpc
      .mockResolvedValueOnce({ data: { allowed: true, reset_in_seconds: 900 }, error: null }) // IP rate
      .mockResolvedValueOnce({ data: { found: true, attempts: 5, locked: true }, error: null }) // record_1c_pair_failure
      .mockResolvedValueOnce({ data: { allowed: true, reset_in_seconds: 900 }, error: null }); // IP fail

    mockFrom.mockReturnValueOnce(
      mockSelectChain({
        data: {
          id: connId,
          workspace_id: "ws-1",
          business_entity_id: "ent-1",
          provider: "onec_epf",
          status: "pending_pair",
          config: {},
          pairing_code_hash: rightHash,
          pairing_code_expires_at: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
          pairing_failed_attempts: 4,
          pairing_locked_until: null,
        },
        error: null,
      })
    );

    const res = await pairPost(
      makePairRequest({ connectionId: connId, pairingCode: "WRNG-9999" })
    );
    expect(res.status).toBe(429);
    expect(mockRpc).toHaveBeenCalledWith(
      "record_1c_pair_failure",
      expect.objectContaining({
        p_connection_id: connId,
        p_max_attempts: 5,
        p_lock_minutes: 15,
      })
    );
  });

  it("rejects expired pairing codes (5-minute TTL)", async () => {
    const code = "ABCD-2345";
    mockRpc.mockResolvedValueOnce({ data: { allowed: true, reset_in_seconds: 900 }, error: null });
    mockFrom.mockReturnValueOnce(
      mockSelectChain({
        data: {
          id: "conn-expired",
          workspace_id: "ws-1",
          business_entity_id: "ent-1",
          provider: "onec_epf",
          status: "pending_pair",
          config: {},
          pairing_code_expires_at: new Date(Date.now() - 60_000).toISOString(),
          pairing_failed_attempts: 0,
          pairing_locked_until: null,
        },
        error: null,
      })
    );

    const res = await pairPost(makePairRequest({ pairingCode: code }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain("5 daqiqa");
  });

  it("issues Bearer token with 90-day tokenExpiresAt and never leaks raw err.message on 500", async () => {
    // 1) Test successful pairing returns token + tokenExpiresAt
    const code = "WXYZ-6789";
    mockRpc.mockResolvedValueOnce({ data: { allowed: true, reset_in_seconds: 900 }, error: null });

    let capturedUpdatePayload: any = null;
    const selectChain = mockSelectChain({
      data: {
        id: "conn-ok",
        workspace_id: "ws-1",
        business_entity_id: "ent-1",
        provider: "onec_epf",
        status: "pending_pair",
        config: {},
        pairing_code_expires_at: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
        pairing_failed_attempts: 0,
        pairing_locked_until: null,
      },
      error: null,
    });
    const updateChain = {
      update: vi.fn((payload: any) => {
        capturedUpdatePayload = payload;
        return { eq: vi.fn(async () => ({ error: null })) };
      }),
    };
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);

    const okRes = await pairPost(makePairRequest({ pairingCode: code }));
    const okJson = await okRes.json();
    expect(okRes.status).toBe(200);
    expect(okJson.ok).toBe(true);
    expect(typeof okJson.token).toBe("string");
    expect(okJson.token.length).toBeGreaterThanOrEqual(32);
    expect(okJson.tokenExpiresAt).toBeTruthy();
    expect(capturedUpdatePayload.token_expires_at).toBe(okJson.tokenExpiresAt);
    expect(capturedUpdatePayload.token_revoked_at).toBeNull();
    expect(capturedUpdatePayload.pairing_failed_attempts).toBe(0);

    // 2) Test unexpected exception does NOT leak err.message
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRpc.mockRejectedValueOnce(new Error("SENSITIVE_DB_PASSWORD_LEAK_12345"));
    const errRes = await pairPost(makePairRequest({ pairingCode: code }));
    const errJson = await errRes.json();
    expect(errRes.status).toBe(500);
    expect(errJson.error).toBe("Server xatosi yuz berdi.");
    expect(JSON.stringify(errJson)).not.toContain("SENSITIVE_DB_PASSWORD_LEAK_12345");
    consoleSpy.mockRestore();
  });

  it("authenticate1CBridgeToken rejects expired or revoked tokens and accepts valid tokens", async () => {
    const rawToken = generateIntegrationToken();
    const tokenHash = sha256Hex(rawToken);
    const req = new Request("https://firmus.uz/api/1c/outbox", {
      headers: { Authorization: `Bearer ${rawToken}` },
    });

    // 1) Revoked token -> 401
    mockFrom.mockReturnValueOnce(
      mockSelectChain({
        data: {
          id: "c1",
          business_entity_id: "ent-1",
          provider: "onec_epf",
          status: "connected",
          config: {},
          token_hash: tokenHash,
          token_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          token_revoked_at: new Date().toISOString(),
        },
        error: null,
      })
    );
    const revokedRes = await authenticate1CBridgeToken(req);
    expect(revokedRes.ok).toBe(false);
    if (!revokedRes.ok) expect(revokedRes.status).toBe(401);

    // 2) Expired token -> 401
    mockFrom.mockReturnValueOnce(
      mockSelectChain({
        data: {
          id: "c2",
          business_entity_id: "ent-1",
          provider: "onec_epf",
          status: "connected",
          config: {},
          token_hash: tokenHash,
          token_expires_at: new Date(Date.now() - 10_000).toISOString(),
          token_revoked_at: null,
        },
        error: null,
      })
    );
    const expiredRes = await authenticate1CBridgeToken(req);
    expect(expiredRes.ok).toBe(false);
    if (!expiredRes.ok) expect(expiredRes.status).toBe(401);

    // 3) Valid token -> ok: true
    mockFrom
      .mockReturnValueOnce(
        mockSelectChain({
          data: {
            id: "c3",
            business_entity_id: "ent-1",
            provider: "onec_epf",
            status: "connected",
            config: {},
            token_hash: tokenHash,
            token_expires_at: new Date(Date.now() + 86_400_000).toISOString(),
            token_revoked_at: null,
          },
          error: null,
        })
      )
      .mockReturnValueOnce({
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      });
    const validRes = await authenticate1CBridgeToken(req);
    expect(validRes.ok).toBe(true);
  });

  it("verifies Band 1 SQL migration adds lockout & token expiry/revocation columns and RPC", () => {
    const migPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "20261120000000_onec_pairing_and_token_hardening.sql"
    );
    const sql = fs.readFileSync(migPath, "utf8");
    expect(sql).toContain("pairing_failed_attempts");
    expect(sql).toContain("pairing_locked_until");
    expect(sql).toContain("token_expires_at");
    expect(sql).toContain("token_revoked_at");
    expect(sql).toContain("record_1c_pair_failure");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
  });
});
