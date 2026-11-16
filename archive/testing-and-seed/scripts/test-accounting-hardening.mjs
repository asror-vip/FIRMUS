import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ytkrgrajrwgrotuxxtmb.supabase.co";

if (existsSync(".env.local")) {
  const envContent = readFileSync(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    if (line.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) {
      anonKey = line.split("=")[1]?.trim();
    }
    if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) {
      serviceKey = line.split("=")[1]?.trim();
    }
    if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      supabaseUrl = line.split("=")[1]?.trim();
    }
  }
}

const adminClient = createClient(supabaseUrl, serviceKey);
const anonClient = createClient(supabaseUrl, anonKey);
const ENTITY_ID = "11111111-1111-1111-1111-111111111111"; // Real Alfa entity
const FOREIGN_ENTITY_ID = "22222222-2222-2222-2222-222222222222"; // Beta entity

async function runHardeningTests() {
  console.log("==================================================================");
  console.log("FIRMUS — PHASE 2: HARDENING & SECURITY REVIEW VERIFICATION SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function report(name, success, detail) {
    if (success) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} -> ${detail}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 1: STORNO & TRIAL BALANCE MATHEMATICAL NETTING
  // -------------------------------------------------------------------------
  console.log("--- 1. Storno & Trial Balance Integrity ---");
  try {
    const entryNum = `JE-REV-MATH-${Date.now()}`;
    const amount = 85000000.0;

    // 1a. Create original entry
    const { data: orig, error: origErr } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: entryNum,
      p_entry_date: "2026-11-16",
      p_description: "Storno test original entry",
      p_source_type: "manual",
      p_lines: [
        { account_code: "5110", debit_amount: amount, credit_amount: 0 },
        { account_code: "4010", debit_amount: 0, credit_amount: amount },
      ],
    });
    if (origErr) throw origErr;

    // 1b. Check General Ledger after original
    const { data: glBefore } = await adminClient.rpc("get_general_ledger", {
      p_entity_id: ENTITY_ID,
      p_account_code: "5110",
      p_from_date: "2026-11-16",
      p_to_date: "2026-11-16",
    });
    const lastRunningBalanceBefore = glBefore?.[glBefore.length - 1]?.running_balance;

    // 1c. Reverse the entry
    const { data: revRes, error: revErr } = await adminClient.rpc("reverse_journal_entry", {
      p_entry_id: orig.id,
      p_reason: "Sinov stornosi: noto'g'ri summa",
    });
    if (revErr) throw revErr;

    // 1d. Check General Ledger after reversal
    const { data: glAfter } = await adminClient.rpc("get_general_ledger", {
      p_entity_id: ENTITY_ID,
      p_account_code: "5110",
      p_from_date: "2026-11-16",
      p_to_date: "2026-11-16",
    });
    const lastRunningBalanceAfter = glAfter?.[glAfter.length - 1]?.running_balance;

    const nettingWorked = Number(lastRunningBalanceAfter) === Number(lastRunningBalanceBefore) - amount;
    report(
      "1.1 Storno & General Ledger: Running balance precisely returns to prior state",
      nettingWorked,
      `Before: ${lastRunningBalanceBefore}, After: ${lastRunningBalanceAfter}`
    );

    // 1e. Guard against double-reversal of original entry
    const { error: doubleRevErr } = await adminClient.rpc("reverse_journal_entry", {
      p_entry_id: orig.id,
      p_reason: "Ikkinchi marta storno qilishga urinish",
    });
    const doubleRevBlocked = doubleRevErr && doubleRevErr.message.includes("allaqachon bekor qilingan");
    report("1.2 Safeguard: Double reversal of original entry blocked", doubleRevBlocked, doubleRevErr?.message);

    // 1f. Guard against reversing the reversal entry itself
    const { error: revOfRevErr } = await adminClient.rpc("reverse_journal_entry", {
      p_entry_id: revRes.reversal_entry_id,
      p_reason: "Stornoni storno qilish",
    });
    const revOfRevBlocked = revOfRevErr && revOfRevErr.message.includes("Storno provodkasini qayta storno qilish taqiqlangan");
    report("1.3 Safeguard: Reversing a reversal entry directly blocked", revOfRevBlocked, revOfRevErr?.message);
  } catch (err) {
    report("1. Storno & Trial Balance Integrity", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 2: RPC SECURITY & MULTI-TENANT ISOLATION
  // -------------------------------------------------------------------------
  console.log("\n--- 2. RPC Security & Multi-Tenant Authorization ---");
  try {
    // 2a. Anonymous execution blocked on create_journal_entry_atomic
    const { error: anonCreateErr } = await anonClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: "JE-ANON-TEST",
      p_entry_date: "2026-11-16",
      p_description: "Anon illicit entry",
      p_lines: [
        { account_code: "5110", debit_amount: 1000, credit_amount: 0 },
        { account_code: "4010", debit_amount: 0, credit_amount: 1000 },
      ],
    });
    const anonCreateBlocked = anonCreateErr && (anonCreateErr.code === "42501" || anonCreateErr.message.includes("permission denied") || anonCreateErr.message.includes("autentifikatsiyadan o'tilmagan"));
    report("2.1 Anonymous Call to create_journal_entry_atomic Rejected", anonCreateBlocked, anonCreateErr?.message);

    // 2b. Anonymous execution blocked on get_trial_balance
    const { error: anonTbErr } = await anonClient.rpc("get_trial_balance", {
      p_entity_id: ENTITY_ID,
    });
    const anonTbBlocked = anonTbErr && (anonTbErr.code === "42501" || anonTbErr.message.includes("permission denied") || anonTbErr.message.includes("autentifikatsiyadan o'tilmagan"));
    report("2.2 Anonymous Call to get_trial_balance Rejected", anonTbBlocked, anonTbErr?.message);

    // 2c. Multi-tenant leak check: external user from other corp attempting to read Entity A's Trial Balance
    const extClient = createClient(supabaseUrl, anonKey);
    await extClient.auth.signInWithPassword({
      email: "external@othercorp.uz",
      password: "Firmus2026!Secured",
    });

    const { error: extTbErr } = await extClient.rpc("get_trial_balance", {
      p_entity_id: ENTITY_ID,
    });
    const extTbBlocked = extTbErr && extTbErr.message.includes("Kirish taqiqlangan");
    report("2.3 Cross-Tenant Data Leak Blocked in get_trial_balance", extTbBlocked, extTbErr?.message);

    // 2d. Multi-tenant leak check: external user attempting to read Entity A's General Ledger
    const { error: extGlErr } = await extClient.rpc("get_general_ledger", {
      p_entity_id: ENTITY_ID,
      p_account_code: "5110",
    });
    const extGlBlocked = extGlErr && extGlErr.message.includes("Kirish taqiqlangan");
    report("2.4 Cross-Tenant Data Leak Blocked in get_general_ledger", extGlBlocked, extGlErr?.message);
  } catch (err) {
    report("2. RPC Security & Multi-Tenant Authorization", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 3: IDEMPOTENCY & CONCURRENT REQUESTS (RACE CONDITIONS)
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Idempotency & High Concurrency Tests ---");
  try {
    // 3a. Idempotency Payload Mismatch test
    const mismatchIdemKey = `idem-mismatch-${Date.now()}`;
    const { data: firstReq } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: `JE-MISMATCH-1-${Date.now()}`,
      p_entry_date: "2026-11-16",
      p_description: "Original 500,000 UZS",
      p_idempotency_key: mismatchIdemKey,
      p_lines: [
        { account_code: "5110", debit_amount: 500000, credit_amount: 0 },
        { account_code: "4010", debit_amount: 0, credit_amount: 500000 },
      ],
    });

    const { error: mismatchErr } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: `JE-MISMATCH-2-${Date.now()}`,
      p_entry_date: "2026-11-16",
      p_description: "Tampered 900,000 UZS",
      p_idempotency_key: mismatchIdemKey,
      p_lines: [
        { account_code: "5110", debit_amount: 900000, credit_amount: 0 }, // Changed amount!
        { account_code: "4010", debit_amount: 0, credit_amount: 900000 },
      ],
    });
    const mismatchBlocked = mismatchErr && mismatchErr.message.includes("Payload mismatch");
    report("3.1 Idempotency Key Payload Mismatch Rejected", mismatchBlocked, mismatchErr?.message);

    // 3b. High Concurrency: 5 parallel requests simultaneously
    const conc5Key = `idem-conc5-${Date.now()}`;
    const conc5Payload = {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: `JE-CONC5-${Date.now()}`,
      p_entry_date: "2026-11-16",
      p_description: "Concurrent 5 test",
      p_idempotency_key: conc5Key,
      p_lines: [
        { account_code: "5110", debit_amount: 1200000, credit_amount: 0 },
        { account_code: "4010", debit_amount: 0, credit_amount: 1200000 },
      ],
    };

    const results5 = await Promise.all([
      adminClient.rpc("create_journal_entry_atomic", conc5Payload),
      adminClient.rpc("create_journal_entry_atomic", conc5Payload),
      adminClient.rpc("create_journal_entry_atomic", conc5Payload),
      adminClient.rpc("create_journal_entry_atomic", conc5Payload),
      adminClient.rpc("create_journal_entry_atomic", conc5Payload),
    ]);

    const successfulIds5 = results5.map((r) => r.data?.id).filter(Boolean);
    const uniqueIds5 = new Set(successfulIds5);
    const duplicatesMarked5 = results5.filter((r) => r.data?.is_duplicate === true).length;

    report(
      "3.2 Concurrency (5 parallel requests): Exactly 1 entry created, 4 marked duplicate",
      uniqueIds5.size === 1 && successfulIds5.length === 5 && duplicatesMarked5 === 4,
      `Unique IDs: ${uniqueIds5.size}, Duplicates marked: ${duplicatesMarked5}`
    );

    // 3c. High Concurrency: 10 parallel requests simultaneously
    const conc10Key = `idem-conc10-${Date.now()}`;
    const conc10Payload = {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: `JE-CONC10-${Date.now()}`,
      p_entry_date: "2026-11-16",
      p_description: "Concurrent 10 test",
      p_idempotency_key: conc10Key,
      p_lines: [
        { account_code: "5110", debit_amount: 3400000, credit_amount: 0 },
        { account_code: "4010", debit_amount: 0, credit_amount: 3400000 },
      ],
    };

    const promises10 = Array.from({ length: 10 }, () =>
      adminClient.rpc("create_journal_entry_atomic", conc10Payload)
    );
    const results10 = await Promise.all(promises10);
    const successfulIds10 = results10.map((r) => r.data?.id).filter(Boolean);
    const uniqueIds10 = new Set(successfulIds10);
    const duplicatesMarked10 = results10.filter((r) => r.data?.is_duplicate === true).length;

    report(
      "3.3 Concurrency (10 parallel requests): Exactly 1 entry created, 9 marked duplicate",
      uniqueIds10.size === 1 && successfulIds10.length === 10 && duplicatesMarked10 === 9,
      `Unique IDs: ${uniqueIds10.size}, Duplicates marked: ${duplicatesMarked10}`
    );
  } catch (err) {
    report("3. Idempotency & Concurrency Tests", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 4: FINANCIAL PRECISION & ARITHMETIC EDGE CASES
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Financial Precision & Arithmetic Edge Cases ---");
  try {
    // 4a. 4-Decimal Tiyin precision: 123456.7891 UZS
    const preciseEntryNum = `JE-PRECISION-${Date.now()}`;
    const { data: precData, error: precErr } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: preciseEntryNum,
      p_entry_date: "2026-11-16",
      p_description: "4-decimal currency test",
      p_lines: [
        { account_code: "5110", debit_amount: 123456.7891, credit_amount: 0 },
        { account_code: "4010", debit_amount: 0, credit_amount: 123456.7891 },
      ],
    });
    if (precErr) throw precErr;
    report(
      "4.1 4-Decimal Precision (NUMERIC 19,4) preserved accurately",
      Number(precData.total_debit) === 123456.7891,
      `Stored: ${precData.total_debit}`
    );

    // 4b. 1 Tiyin / 0.0001 difference strictly rejected
    const { error: tiyinErr } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: `JE-TIYIN-DIFF-${Date.now()}`,
      p_entry_date: "2026-11-16",
      p_description: "0.0001 tiyin imbalance",
      p_lines: [
        { account_code: "5110", debit_amount: 1000.0, credit_amount: 0 },
        { account_code: "4010", debit_amount: 0, credit_amount: 1000.0001 },
      ],
    });
    const tiyinBlocked = tiyinErr && tiyinErr.message.includes("Balanssiz provodka rad etildi");
    report("4.2 Micro-imbalance (0.0001 difference) strictly rejected", tiyinBlocked, tiyinErr?.message);

    // 4c. Extreme Value (Trillion UZS: 5,000,000,000,000 UZS)
    const bigEntryNum = `JE-TRILLION-${Date.now()}`;
    const { data: bigData, error: bigErr } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: bigEntryNum,
      p_entry_date: "2026-11-16",
      p_description: "Large enterprise balance test (5 Trillion UZS)",
      p_lines: [
        { account_code: "8330", debit_amount: 5000000000000.0, credit_amount: 0 },
        { account_code: "5110", debit_amount: 0, credit_amount: 5000000000000.0 },
      ],
    });
    if (bigErr) throw bigErr;
    report(
      "4.3 Large enterprise magnitude (5,000,000,000,000 UZS) processed without overflow",
      Number(bigData.total_debit) === 5000000000000.0,
      `Stored: ${bigData.total_debit}`
    );

    // 4d. Line with both debit and credit rejected
    const { error: bothSideErr } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: `JE-BOTH-SIDE-${Date.now()}`,
      p_entry_date: "2026-11-16",
      p_description: "Line with both debit and credit",
      p_lines: [
        { account_code: "5110", debit_amount: 1000, credit_amount: 1000 },
        { account_code: "4010", debit_amount: 0, credit_amount: 0 },
      ],
    });
    const bothSideBlocked = bothSideErr && bothSideErr.message.includes("bir vaqtning o'zida ham debet, ham kredit");
    report("4.4 Line with simultaneous debit and credit rejected", bothSideBlocked, bothSideErr?.message);
  } catch (err) {
    report("4. Financial Precision & Arithmetic Edge Cases", false, err.message);
  }

  // -------------------------------------------------------------------------
  // SECTION 5: REGRESSION OF SECURITY FOUNDATION (PHASE 1)
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Security Foundation Regression Verification ---");
  try {
    const { data: anonTx } = await anonClient.from("transactions").select("*");
    report("5.1 Anonymous direct access to transactions table remains blocked", !anonTx || anonTx.length === 0, `Returned ${anonTx?.length} rows`);

    const auditorClient = createClient(supabaseUrl, anonKey);
    await auditorClient.auth.signInWithPassword({
      email: "jasur@firmus.uz",
      password: "Firmus2026!Secured",
    });

    const { error: audMutationErr } = await auditorClient.from("transactions").insert({
      business_entity_id: ENTITY_ID,
      date: "2026-11-16",
      amount: 10000,
      type: "income",
      counterparty: "Illicit",
      description: "Auditor test",
    });
    report("5.2 Auditor direct table mutation remains blocked by RLS", Boolean(audMutationErr), audMutationErr?.message);
  } catch (err) {
    report("5. Security Foundation Regression", false, err.message);
  }

  console.log(`\n==================================================================`);
  console.log(`HARDENING AUDIT RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================================\n`);

  if (failed > 0) process.exit(1);
}

runHardeningTests();
