import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  getServiceClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
  }),
}));

import { POST as paymePost } from "@/app/api/payments/payme/route";
import { POST as clickPost } from "@/app/api/payments/click/route";

const TEST_SECRET = "test-payme-secret-key-2026";
const BASIC_AUTH = `Basic ${Buffer.from(`Paycom:${TEST_SECRET}`).toString("base64")}`;

function makePaymeRequest(params: Record<string, unknown>, id = 1): NextRequest {
  return new NextRequest("https://firmus.uz/api/payments/payme", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: BASIC_AUTH,
      "x-forwarded-for": "195.158.1.10",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method: "CreateTransaction",
      params,
    }),
  });
}

function mockOrderSelect(order: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => ({ data: order, error: null })),
  };
  return chain;
}

describe("Band 2: Payme CreateTransaction Atomic Claim & Conflict Protection", () => {
  const prevSecret = process.env.PAYME_SECRET_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PAYME_SECRET_KEY = TEST_SECRET;
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.PAYME_SECRET_KEY;
    else process.env.PAYME_SECRET_KEY = prevSecret;
  });

  it("claims a fresh pending order atomically and returns state 1", async () => {
    const createTime = 1795100000000;
    mockFrom.mockReturnValueOnce(
      mockOrderSelect({
        id: "uuid-1",
        order_id: "ORD-1001",
        payment_method: "payme",
        status: "pending",
        final_amount_tiyin: 9900000,
      })
    );
    mockRpc.mockResolvedValueOnce({
      data: {
        outcome: "claimed",
        provider_state: 1,
        provider_create_time: createTime,
        provider_trans_id: "payme-tx-1",
      },
      error: null,
    });

    const res = await paymePost(
      makePaymeRequest({
        id: "payme-tx-1",
        time: createTime,
        amount: 9900000,
        account: { order_id: "ORD-1001" },
      })
    );
    const json = await res.json();
    expect(json.error).toBeUndefined();
    expect(json.result).toEqual({
      create_time: createTime,
      transaction: "payme-tx-1",
      state: 1,
    });
  });

  it("returns original create_time idempotently on already_same with state 1, and rejects state != 1", async () => {
    const originalCreateTime = 1795100000111;

    // 1) already_same + provider_state === 1 -> idempotent success
    mockFrom.mockReturnValueOnce(
      mockOrderSelect({
        id: "uuid-1",
        order_id: "ORD-1001",
        payment_method: "payme",
        status: "pending",
        final_amount_tiyin: 9900000,
      })
    );
    mockRpc.mockResolvedValueOnce({
      data: {
        outcome: "already_same",
        provider_state: 1,
        provider_create_time: originalCreateTime,
        provider_trans_id: "payme-tx-1",
      },
      error: null,
    });

    const repeatRes = await paymePost(
      makePaymeRequest({
        id: "payme-tx-1",
        time: originalCreateTime + 5000,
        amount: 9900000,
        account: { order_id: "ORD-1001" },
      })
    );
    const repeatJson = await repeatRes.json();
    expect(repeatJson.result).toEqual({
      create_time: originalCreateTime,
      transaction: "payme-tx-1",
      state: 1,
    });

    // 2) already_same + provider_state === -1 (cancelled) -> -31008
    mockFrom.mockReturnValueOnce(
      mockOrderSelect({
        id: "uuid-1",
        order_id: "ORD-1001",
        payment_method: "payme",
        status: "pending",
        final_amount_tiyin: 9900000,
      })
    );
    mockRpc.mockResolvedValueOnce({
      data: {
        outcome: "already_same",
        provider_state: -1,
        provider_create_time: originalCreateTime,
        provider_trans_id: "payme-tx-1",
      },
      error: null,
    });

    const badStateRes = await paymePost(
      makePaymeRequest({
        id: "payme-tx-1",
        time: originalCreateTime + 6000,
        amount: 9900000,
        account: { order_id: "ORD-1001" },
      })
    );
    const badStateJson = await badStateRes.json();
    expect(badStateJson.error?.code).toBe(-31008);
  });

  it("handles parallel CreateTransaction on two different orders with the SAME transId (only 1 succeeds, 2nd gets -31008)", async () => {
    const orders: Record<string, any> = {
      "ORD-A": {
        id: "uuid-a",
        order_id: "ORD-A",
        payment_method: "payme",
        status: "pending",
        final_amount_tiyin: 9900000,
      },
      "ORD-B": {
        id: "uuid-b",
        order_id: "ORD-B",
        payment_method: "payme",
        status: "pending",
        final_amount_tiyin: 9900000,
      },
    };

    const claimedTransIds = new Set<string>();

    mockFrom.mockImplementation(() => {
      let targetOrderId = "";
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn((col: string, val: string) => {
          if (col === "order_id") targetOrderId = val;
          return chain;
        }),
        maybeSingle: vi.fn(async () => ({ data: orders[targetOrderId] || null, error: null })),
      };
      return chain;
    });

    // Simulates PostgreSQL unique index + EXCEPTION WHEN unique_violation -> outcome: 'conflict'
    mockRpc.mockImplementation(async (_fn: string, args: any) => {
      const key = `${args.p_payment_method}:${args.p_provider_trans_id}`;
      if (claimedTransIds.has(key)) {
        return {
          data: { outcome: "conflict", reason: "duplicate_provider_trans_id" },
          error: null,
        };
      }
      claimedTransIds.add(key);
      return {
        data: {
          outcome: "claimed",
          provider_state: 1,
          provider_create_time: args.p_provider_create_time,
          provider_trans_id: args.p_provider_trans_id,
        },
        error: null,
      };
    });

    const sharedTransId = "payme-shared-race-tx";
    const [resA, resB] = await Promise.all([
      paymePost(
        makePaymeRequest(
          { id: sharedTransId, time: 1795100000000, amount: 9900000, account: { order_id: "ORD-A" } },
          101
        )
      ),
      paymePost(
        makePaymeRequest(
          { id: sharedTransId, time: 1795100000001, amount: 9900000, account: { order_id: "ORD-B" } },
          102
        )
      ),
    ]);

    const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()]);
    const results = [jsonA, jsonB];
    const winners = results.filter((r) => r.result?.state === 1);
    const conflicts = results.filter((r) => r.error?.code === -31008);

    expect(winners).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
  });

  it("maps timed_out -> -31008, already_paid -> -31050, and wrong amount -> -31001", async () => {
    // timed_out
    mockFrom.mockReturnValueOnce(
      mockOrderSelect({
        id: "uuid-t",
        order_id: "ORD-T",
        payment_method: "payme",
        status: "pending",
        final_amount_tiyin: 9900000,
      })
    );
    mockRpc.mockResolvedValueOnce({ data: { outcome: "timed_out" }, error: null });
    const timedOutJson = await (
      await paymePost(
        makePaymeRequest({ id: "tx-t", time: Date.now(), amount: 9900000, account: { order_id: "ORD-T" } })
      )
    ).json();
    expect(timedOutJson.error?.code).toBe(-31008);

    // already_paid
    mockFrom.mockReturnValueOnce(
      mockOrderSelect({
        id: "uuid-p",
        order_id: "ORD-P",
        payment_method: "payme",
        status: "paid",
        final_amount_tiyin: 9900000,
      })
    );
    const paidJson = await (
      await paymePost(
        makePaymeRequest({ id: "tx-p", time: Date.now(), amount: 9900000, account: { order_id: "ORD-P" } })
      )
    ).json();
    expect(paidJson.error?.code).toBe(-31050);

    // wrong amount
    mockFrom.mockReturnValueOnce(
      mockOrderSelect({
        id: "uuid-a",
        order_id: "ORD-AMT",
        payment_method: "payme",
        status: "pending",
        final_amount_tiyin: 9900000,
      })
    );
    const amtJson = await (
      await paymePost(
        makePaymeRequest({ id: "tx-a", time: Date.now(), amount: 1000, account: { order_id: "ORD-AMT" } })
      )
    ).json();
    expect(amtJson.error?.code).toBe(-31001);
  });

  it("verifies Band 2 migration contains unique index, conditional UPDATE, unique_violation handler, and service_role-only grants", () => {
    const migPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "20261120010000_payme_create_transaction_hardening.sql"
    );
    const sql = fs.readFileSync(migPath, "utf8");
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_orders_provider_trans_id");
    expect(sql).toContain("AND provider_trans_id IS NULL");
    expect(sql).toContain("IF NOT FOUND THEN");
    expect(sql).toContain("WHEN unique_violation THEN");
    expect(sql).toContain("IF v_order.payment_method = 'payme' AND COALESCE(v_order.provider_state, 0) <> 1 THEN");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.claim_payment_provider_transaction");
    expect(sql).toContain("TO service_role");
  });

  it("Click Prepare regression: repeated Prepare with same click_trans_id succeeds (error: 0) and conflict returns -9", async () => {
    const prevClickSecret = process.env.CLICK_SECRET_KEY;
    const prevClickSvc = process.env.CLICK_SERVICE_ID;
    const clickSecret = "test-click-secret";
    const serviceId = "12345";
    process.env.CLICK_SECRET_KEY = clickSecret;
    process.env.CLICK_SERVICE_ID = serviceId;

    const buildClickPrepareReq = (clickTransId: string, orderId: string, amount = 99000) => {
      const signTime = "2026-11-20 02:30:00";
      const signString = crypto
        .createHash("md5")
        .update(`${clickTransId}${serviceId}${clickSecret}${orderId}${amount}0${signTime}`)
        .digest("hex");
      return new NextRequest("https://firmus.uz/api/payments/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          click_trans_id: clickTransId,
          service_id: serviceId,
          merchant_trans_id: orderId,
          amount,
          action: 0,
          sign_time: signTime,
          sign_string: signString,
        }),
      });
    };

    try {
      // 1) Repeated Click Prepare -> outcome: 'already_same' -> error: 0 (must NOT be broken by Payme state check)
      mockFrom.mockReturnValueOnce(
        mockOrderSelect({
          id: "uuid-clk-1",
          order_id: "ORD-CLK-1",
          payment_method: "click",
          status: "pending",
          final_amount_uzs: 99000,
        })
      );
      mockRpc.mockResolvedValueOnce({
        data: {
          outcome: "already_same",
          provider_state: 1,
          provider_trans_id: "clk-tx-100",
          order_uuid: "uuid-clk-1",
        },
        error: null,
      });

      const okRes = await clickPost(buildClickPrepareReq("clk-tx-100", "ORD-CLK-1"));
      const okJson = await okRes.json();
      expect(okJson.error).toBe(0);
      expect(okJson.merchant_prepare_id).toBe("uuid-clk-1");

      // 2) Conflicting Click Prepare (different click_trans_id) -> outcome: 'conflict' -> error: -9
      mockFrom.mockReturnValueOnce(
        mockOrderSelect({
          id: "uuid-clk-1",
          order_id: "ORD-CLK-1",
          payment_method: "click",
          status: "pending",
          final_amount_uzs: 99000,
        })
      );
      mockRpc.mockResolvedValueOnce({
        data: { outcome: "conflict", reason: "duplicate_provider_trans_id" },
        error: null,
      });

      const conflictRes = await clickPost(buildClickPrepareReq("clk-tx-999", "ORD-CLK-1"));
      const conflictJson = await conflictRes.json();
      expect(conflictJson.error).toBe(-9);
    } finally {
      if (prevClickSecret === undefined) delete process.env.CLICK_SECRET_KEY;
      else process.env.CLICK_SECRET_KEY = prevClickSecret;
      if (prevClickSvc === undefined) delete process.env.CLICK_SERVICE_ID;
      else process.env.CLICK_SERVICE_ID = prevClickSvc;
    }
  });
});
