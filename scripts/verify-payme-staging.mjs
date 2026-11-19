/**
 * Staging Verification Script for Band 2 (Payme CreateTransaction Hardening)
 *
 * Runs against a STAGING Supabase instance ONLY:
 *   STAGING_SUPABASE_URL="https://..." STAGING_SUPABASE_SERVICE_ROLE_KEY="..." node scripts/verify-payme-staging.mjs
 *
 * Verifies:
 *  1. Two parallel `claim_payment_provider_transaction` RPC calls for two different orders
 *     using the EXACT SAME `p_provider_trans_id` -> exactly 1 returns 'claimed', 1 returns 'conflict'.
 *  2. Cleans up the two synthetic staging orders immediately after the test.
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.STAGING_SUPABASE_URL?.trim();
const key = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error(
    "ERROR: Set STAGING_SUPABASE_URL and STAGING_SUPABASE_SERVICE_ROLE_KEY before running this staging test."
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  // Create a temporary auth user or pick an existing staging user for FK constraint
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1 });
  if (usersErr || !usersData?.users?.[0]) {
    throw new Error("Staging DB needs at least 1 test user in auth.users to run billing_orders test.");
  }
  const testUserId = usersData.users[0].id;

  const suffix = crypto.randomBytes(4).toString("hex");
  const orderA = `STG-PAYME-A-${suffix}`;
  const orderB = `STG-PAYME-B-${suffix}`;
  const sharedTransId = `stg-tx-${suffix}`;

  try {
    const { error: insErr } = await supabase.from("billing_orders").insert([
      {
        order_id: orderA,
        user_id: testUserId,
        plan_id: "professional",
        billing_cycle: "monthly",
        payment_method: "payme",
        status: "pending",
        amount_uzs: 99000,
        final_amount_tiyin: 9900000,
      },
      {
        order_id: orderB,
        user_id: testUserId,
        plan_id: "professional",
        billing_cycle: "monthly",
        payment_method: "payme",
        status: "pending",
        amount_uzs: 99000,
        final_amount_tiyin: 9900000,
      },
    ]);
    if (insErr) throw insErr;

    const nowMs = Date.now();
    const [resA, resB] = await Promise.all([
      supabase.rpc("claim_payment_provider_transaction", {
        p_order_id: orderA,
        p_provider_trans_id: sharedTransId,
        p_payment_method: "payme",
        p_provider_create_time: nowMs,
        p_provider_payload: { staging_test: true },
        p_timeout_ms: 43200000,
      }),
      supabase.rpc("claim_payment_provider_transaction", {
        p_order_id: orderB,
        p_provider_trans_id: sharedTransId,
        p_payment_method: "payme",
        p_provider_create_time: nowMs,
        p_provider_payload: { staging_test: true },
        p_timeout_ms: 43200000,
      }),
    ]);

    if (resA.error || resB.error) {
      throw new Error(`RPC error: ${resA.error?.message || resB.error?.message}`);
    }

    const outcomes = [resA.data?.outcome, resB.data?.outcome].sort();
    console.log("STAGING PARALLEL OUTCOMES:", outcomes);
    if (outcomes[0] !== "claimed" || outcomes[1] !== "conflict") {
      throw new Error(`Expected ['claimed', 'conflict'], got ${JSON.stringify(outcomes)}`);
    }
    console.log("STAGING_PAYME_PARALLEL_PROOF_PASSED");
  } finally {
    await supabase.from("billing_orders").delete().in("order_id", [orderA, orderB]);
  }
}

main().catch((err) => {
  console.error("STAGING VERIFICATION FAILED:", err);
  process.exit(1);
});
