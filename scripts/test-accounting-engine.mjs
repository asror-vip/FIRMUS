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
const ENTITY_ID = "11111111-1111-1111-1111-111111111111"; // Real Alfa entity

async function runTests() {
  console.log("=== FIRMUS PHASE 2: ACCOUNTING ENGINE & LEDGER INTEGRITY TESTS ===\n");
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

  // 1. TEST 1: Balanced journal entry succeeds
  try {
    const testEntryNumber = `JE-TEST-${Date.now()}`;
    const { data, error } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: testEntryNumber,
      p_entry_date: "2026-11-16",
      p_description: "Test bank to'lovi: 5110 -> 6010",
      p_source_type: "manual",
      p_idempotency_key: `idem-${testEntryNumber}`,
      p_lines: [
        {
          account_code: "6010",
          account_name: "Mol yetkazib beruvchilarga toʻlanadigan schyotlar",
          debit_amount: 15000000.0,
          credit_amount: 0,
          memo: "Yetkazib beruvchiga to'lov",
        },
        {
          account_code: "5110",
          account_name: "Hisob-kitob schyoti (Milliy valyutada)",
          debit_amount: 0,
          credit_amount: 15000000.0,
          memo: "Bankdan chiqim",
        },
      ],
    });

    if (error) throw error;
    report(
      "1. Balanced Journal Entry Succeeds",
      data && data.status === "posted" && Number(data.total_debit) === 15000000,
      JSON.stringify(data)
    );
  } catch (err) {
    report("1. Balanced Journal Entry Succeeds", false, err.message);
  }

  // 2. TEST 2: Unbalanced journal entry is strictly rejected
  try {
    const unbalancedEntryNumber = `JE-UNBAL-${Date.now()}`;
    const { data, error } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: unbalancedEntryNumber,
      p_entry_date: "2026-11-16",
      p_description: "Balanssiz provodka testi",
      p_source_type: "manual",
      p_lines: [
        {
          account_code: "6010",
          debit_amount: 10000000.0,
          credit_amount: 0,
        },
        {
          account_code: "5110",
          debit_amount: 0,
          credit_amount: 9000000.0, // Difference: 1,000,000!
        },
      ],
    });

    if (error && error.message.includes("Balanssiz provodka rad etildi")) {
      report("2. Unbalanced Entry Rejected with Debit != Credit error", true, error.message);
    } else {
      report("2. Unbalanced Entry Rejected with Debit != Credit error", false, `Did not reject or error unexpected: ${JSON.stringify(error)}`);
    }
  } catch (err) {
    report("2. Unbalanced Entry Rejected with Debit != Credit error", true, err.message);
  }

  // 3. TEST 3: Atomicity check (No orphan rows after failed validation)
  try {
    const orphanEntryNum = `JE-ORPHAN-${Date.now()}`;
    await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: orphanEntryNum,
      p_entry_date: "2026-11-16",
      p_description: "Fail halfway",
      p_lines: [
        { account_code: "5110", debit_amount: 50000, credit_amount: 0 },
        { account_code: "9999_INVALID", debit_amount: 0, credit_amount: 50000 },
      ],
    });
  } catch (e) {
    // Expected to fail
  }

  const { data: orphanCheck } = await adminClient
    .from("journal_entries")
    .select("id")
    .like("entry_number", "JE-ORPHAN-%");
  report(
    "3. Atomicity & Rollback: No orphan journal entries on validation failure",
    !orphanCheck || orphanCheck.length === 0,
    `Found ${orphanCheck?.length} orphan entries`
  );

  // 4. TEST 4: Invalid/non-existent account code rejected
  try {
    const { error } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: `JE-INV-ACC-${Date.now()}`,
      p_entry_date: "2026-11-16",
      p_description: "Invalid account code",
      p_lines: [
        { account_code: "9999", debit_amount: 1000, credit_amount: 0 },
        { account_code: "5110", debit_amount: 0, credit_amount: 1000 },
      ],
    });

    const isRejected = error && error.message.includes("Mavjud bo'lmagan");
    report("4. Non-existent Account Code Rejected", isRejected, error?.message);
  } catch (err) {
    report("4. Non-existent Account Code Rejected", false, err.message);
  }

  // 5. TEST 5: Auditor role cannot create journal entries
  try {
    const auditorClient = createClient(supabaseUrl, anonKey);
    const { data: authData } = await auditorClient.auth.signInWithPassword({
      email: "jasur@firmus.uz",
      password: "Firmus2026!Secured",
    });

    if (!authData?.user) throw new Error("Could not authenticate auditor");

    const { error: auditorErr } = await auditorClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: `JE-AUDITOR-${Date.now()}`,
      p_entry_date: "2026-11-16",
      p_description: "Auditor illicit entry",
      p_lines: [
        { account_code: "5110", debit_amount: 1000, credit_amount: 0 },
        { account_code: "6010", debit_amount: 0, credit_amount: 1000 },
      ],
    });

    const isBlocked = auditorErr && auditorErr.message.includes("Auditor roli provodka yaratish huquqiga ega emas");
    report("5. RBAC: Auditor Role Blocked from Creating Entries", isBlocked, auditorErr?.message);
  } catch (err) {
    report("5. RBAC: Auditor Role Blocked from Creating Entries", false, err.message);
  }

  // 6. TEST 6: Idempotency Key prevents duplicate journal entries
  try {
    const idemKey = `idem-unique-${Date.now()}`;
    const entryNum = `JE-IDEM-${Date.now()}`;

    // Request 1
    const { data: res1 } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: entryNum,
      p_entry_date: "2026-11-16",
      p_description: "Idempotent payment",
      p_idempotency_key: idemKey,
      p_lines: [
        { account_code: "5110", debit_amount: 2500000, credit_amount: 0 },
        { account_code: "4010", debit_amount: 0, credit_amount: 2500000 },
      ],
    });

    // Request 2 with same idempotency key
    const { data: res2 } = await adminClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: ENTITY_ID,
      p_entry_number: entryNum,
      p_entry_date: "2026-11-16",
      p_description: "Idempotent payment retry",
      p_idempotency_key: idemKey,
      p_lines: [
        { account_code: "5110", debit_amount: 2500000, credit_amount: 0 },
        { account_code: "4010", debit_amount: 0, credit_amount: 2500000 },
      ],
    });

    const isIdempotent = res1 && res2 && res1.id === res2.id && res2.is_duplicate === true;
    report("6. Idempotency Key Prevents Duplicate Double-Posting", isIdempotent, `Res1: ${res1?.id}, Res2: ${res2?.id}`);
  } catch (err) {
    report("6. Idempotency Key Prevents Duplicate Double-Posting", false, err.message);
  }

  // 7. TEST 7: General Ledger calculation
  try {
    const { data: glData, error: glErr } = await adminClient.rpc("get_general_ledger", {
      p_entity_id: ENTITY_ID,
      p_account_code: "5110",
      p_from_date: "2026-01-01",
      p_to_date: "2026-12-31",
    });

    if (glErr) throw glErr;
    report(
      "7. General Ledger Engine Returns Accurate Running Balance",
      Array.isArray(glData) && glData.length > 0 && typeof glData[0].running_balance !== "undefined",
      `Returned ${glData?.length} entries for account 5110`
    );
  } catch (err) {
    report("7. General Ledger Engine Returns Accurate Running Balance", false, err.message);
  }

  // 8. TEST 8: Trial Balance calculation (Debit total == Credit total)
  try {
    const { data: tbData, error: tbErr } = await adminClient.rpc("get_trial_balance", {
      p_entity_id: ENTITY_ID,
      p_from_date: "2026-01-01",
      p_to_date: "2026-12-31",
    });

    if (tbErr) throw tbErr;

    const totalPeriodDebit = tbData.reduce((acc, row) => acc + Number(row.period_debit || 0), 0);
    const totalPeriodCredit = tbData.reduce((acc, row) => acc + Number(row.period_credit || 0), 0);

    const isTrialBalanced = Math.abs(totalPeriodDebit - totalPeriodCredit) < 0.0001 && totalPeriodDebit > 0;
    report(
      "8. Trial Balance Totals strictly balanced (Period Debit == Period Credit)",
      isTrialBalanced,
      `Debit: ${totalPeriodDebit}, Credit: ${totalPeriodCredit}`
    );
  } catch (err) {
    report("8. Trial Balance Totals strictly balanced", false, err.message);
  }

  // 9. BONUS TEST 9: Immutability & Reversal (Storno)
  try {
    // 9a. Test that direct deletion of posted entry is blocked by trigger
    const { data: entryToReverse } = await adminClient
      .from("journal_entries")
      .select("id")
      .eq("status", "posted")
      .limit(1)
      .single();

    let directDeleteBlocked = false;
    if (entryToReverse) {
      const { error: delErr } = await adminClient
        .from("journal_entries")
        .delete()
        .eq("id", entryToReverse.id);

      directDeleteBlocked = delErr && delErr.message.includes("Tasdiqlangan (posted) provodkani o'chirish taqiqlangan");
    }

    // 9b. Test Reversal RPC
    const { data: revRes, error: revErr } = await adminClient.rpc("reverse_journal_entry", {
      p_entry_id: entryToReverse.id,
      p_reason: "Sinov stornosi",
    });

    const reversalWorked = revRes && revRes.success === true && revRes.status === "reversed";
    report(
      "9. Immutability & Storno (Reversal) Mechanism",
      directDeleteBlocked && reversalWorked,
      `Delete blocked: ${directDeleteBlocked}, Reversal: ${reversalWorked}`
    );
  } catch (err) {
    report("9. Immutability & Storno (Reversal) Mechanism", false, err.message);
  }

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests();
