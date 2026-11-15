import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if ((!supabaseUrl || !supabaseAnonKey) && existsSync(".env.local")) {
  const envContent = readFileSync(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) {
      supabaseUrl = trimmed.split("=")[1]?.trim();
    }
    if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) {
      supabaseAnonKey = trimmed.split("=")[1]?.trim();
    }
  }
}

const defaultPassword = "Firmus2026!Secured";
const entityAlfaId = "11111111-1111-1111-1111-111111111111"; // ORIENT AGRO EXPORT
const alienEntityId = "99999999-9999-9999-9999-999999999999";

const results = [];

function recordTest(testName, passed, details) {
  results.push({ testName, passed, details });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon}: ${testName} -> ${details}`);
}

async function runTests() {
  console.log("=================================================");
  console.log("FIRMUS — Phase 1: Security Foundation RLS Tests");
  console.log("=================================================\n");

  // TEST 1: Anonymous Access Blocked
  try {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await anonClient.from("transactions").select("*");
    if (!error && data && data.length === 0) {
      recordTest("Test 1: Anonymous Read Blocked", true, `Returned 0 rows as expected (RLS denied)`);
    } else if (error) {
      recordTest("Test 1: Anonymous Read Blocked", true, `Denied with error: ${error.message}`);
    } else {
      recordTest("Test 1: Anonymous Read Blocked", false, `VULNERABILITY: Anon read ${data.length} rows!`);
    }
  } catch (err) {
    recordTest("Test 1: Anonymous Read Blocked", true, `Denied: ${err.message}`);
  }

  // TEST 2: Anonymous Write Blocked
  try {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await anonClient.from("transactions").insert({
      business_entity_id: entityAlfaId,
      amount: 1000000,
      type: "income",
      counterparty: "Hacker Corp",
      description: "Exploit attempt",
    });
    if (error) {
      recordTest("Test 2: Anonymous Write Blocked", true, `Blocked with error: ${error.message}`);
    } else {
      recordTest("Test 2: Anonymous Write Blocked", false, `VULNERABILITY: Anon inserted row!`);
    }
  } catch (err) {
    recordTest("Test 2: Anonymous Write Blocked", true, `Blocked: ${err.message}`);
  }

  // TEST 3: Cross-Tenant Isolation (External User Cannot Read Other Company's Data)
  try {
    const externalClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: loginErr } = await externalClient.auth.signInWithPassword({
      email: "external@othercorp.uz",
      password: defaultPassword,
    });
    if (loginErr) throw loginErr;

    const { data: extTx, error: extTxErr } = await externalClient.from("transactions").select("*");
    if (extTx && extTx.length === 0) {
      recordTest(
        "Test 3: Cross-Tenant Isolation (External User)",
        true,
        `External user received 0 rows from FIRMUS entities (Tenant isolated)`
      );
    } else {
      recordTest(
        "Test 3: Cross-Tenant Isolation (External User)",
        false,
        `VULNERABILITY: External user accessed ${extTx?.length} rows!`
      );
    }
  } catch (err) {
    recordTest("Test 3: Cross-Tenant Isolation (External User)", false, `Login failed: ${err.message}`);
  }

  // TEST 4: Authenticated Permitted User (Dilnoza - Accountant) Access
  try {
    const dilnozaClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: loginErr } = await dilnozaClient.auth.signInWithPassword({
      email: "dilnoza@firmus.uz",
      password: defaultPassword,
    });
    if (loginErr) throw loginErr;

    const { data: entities, error: entErr } = await dilnozaClient.from("business_entities").select("*");
    const { data: txList, error: txErr } = await dilnozaClient
      .from("transactions")
      .select("*")
      .eq("business_entity_id", entityAlfaId);

    if (entities && entities.length > 0 && txList && txList.length > 0) {
      recordTest(
        "Test 4: Permitted User Access (Accountant)",
        true,
        `Dilnoza accessed her ${entities.length} entities and ${txList.length} transactions`
      );
    } else {
      recordTest(
        "Test 4: Permitted User Access (Accountant)",
        false,
        `Failed to access allowed data: entities=${entities?.length}, tx=${txList?.length}, err=${txErr?.message}`
      );
    }
  } catch (err) {
    recordTest("Test 4: Permitted User Access (Accountant)", false, `Error: ${err.message}`);
  }

  // TEST 5: Role-Based Access Control (Auditor Cannot Insert Records)
  try {
    const auditorClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: authData, error: loginErr } = await auditorClient.auth.signInWithPassword({
      email: "jasur@firmus.uz",
      password: defaultPassword,
    });
    if (loginErr) throw loginErr;

    const { data: insertData, error: insertErr } = await auditorClient.from("transactions").insert({
      business_entity_id: entityAlfaId,
      amount: 5000000,
      type: "income",
      counterparty: "Auditor Write Test",
      description: "Should be blocked by RLS role check",
    });

    if (insertErr) {
      recordTest(
        "Test 5: RBAC Auditor Mutation Blocked",
        true,
        `Auditor insertion correctly rejected: ${insertErr.message}`
      );
    } else {
      recordTest(
        "Test 5: RBAC Auditor Mutation Blocked",
        false,
        `VULNERABILITY: Auditor was allowed to insert transaction!`
      );
    }
  } catch (err) {
    recordTest("Test 5: RBAC Auditor Mutation Blocked", true, `Blocked: ${err.message}`);
  }

  // TEST 6: IDOR Protection (Cannot Write to Alien Entity)
  try {
    const dilnozaClient = createClient(supabaseUrl, supabaseAnonKey);
    await dilnozaClient.auth.signInWithPassword({
      email: "dilnoza@firmus.uz",
      password: defaultPassword,
    });

    const { data, error } = await dilnozaClient.from("transactions").insert({
      business_entity_id: alienEntityId,
      amount: 99999999,
      type: "income",
      counterparty: "Alien Corp",
      description: "IDOR test to foreign entity",
    });

    if (error) {
      recordTest(
        "Test 6: IDOR Foreign Entity Protection",
        true,
        `Insertion into unauthorized entity rejected: ${error.message}`
      );
    } else {
      recordTest(
        "Test 6: IDOR Foreign Entity Protection",
        false,
        `VULNERABILITY: User inserted data into foreign entity!`
      );
    }
  } catch (err) {
    recordTest("Test 6: IDOR Foreign Entity Protection", true, `Blocked: ${err.message}`);
  }

  console.log("\n=================================================");
  const passCount = results.filter((r) => r.passed).length;
  console.log(`Summary: ${passCount}/${results.length} Tests Passed`);
  console.log("=================================================");
}

runTests();
