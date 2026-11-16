import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ytkrgrajrwgrotuxxtmb.supabase.co";
let projectRef = process.env.SUPABASE_PROJECT_REF || "ytkrgrajrwgrotuxxtmb";
let accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k === "NEXT_PUBLIC_SUPABASE_ANON_KEY") anonKey = v;
    if (k === "SUPABASE_SERVICE_ROLE_KEY") serviceKey = v;
    if (k === "NEXT_PUBLIC_SUPABASE_URL") supabaseUrl = v;
    if (k === "SUPABASE_PROJECT_REF") projectRef = v;
    if (k === "SUPABASE_ACCESS_TOKEN") accessToken = v;
  }
}

const BASE_URL = "http://localhost:3000";
const admin = createClient(supabaseUrl, serviceKey);

let passed = 0;
let failed = 0;

function check(name, ok, detail = "") {
  if (ok) {
    console.log(`PASS: ${name}`);
    passed++;
  } else {
    console.error(`FAIL: ${name} -> ${detail}`);
    failed++;
  }
}

async function runSql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function run() {
  console.log("=== FIRMUS FULL PRODUCTION E2E VERIFICATION ===\n");

  // 1. Public & Auth Route HTTP checks
  const publicChecks = [
    { path: "/api/health", expected: 200 },
    { path: "/login", expected: 200 },
    { path: "/register", expected: 200 },
    { path: "/privacy", expected: 200 },
    { path: "/terms", expected: 200 },
    { path: "/", expected: 307 },
    { path: "/reconcile", expected: 307 },
    { path: "/transactions", expected: 307 },
    { path: "/accounting", expected: 307 },
    { path: "/tax", expected: 307 },
    { path: "/finance", expected: 307 },
    { path: "/settings", expected: 307 },
  ];

  for (const item of publicChecks) {
    const res = await fetch(`${BASE_URL}${item.path}`, { redirect: "manual" });
    check(`GET ${item.path} -> HTTP ${item.expected}`, res.status === item.expected, `got ${res.status}`);
  }

  // 2. Unauthenticated API protection checks
  const unauthApis = [
    "/api/ai-copilot",
    "/api/ai-copilot/execute",
    "/api/ai-reconcile",
  ];
  for (const ep of unauthApis) {
    const res = await fetch(`${BASE_URL}${ep}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    check(`Unauth POST ${ep} -> HTTP 401`, res.status === 401, `got ${res.status}`);
  }

  // 3. Authenticated SSR Cookie API checks (Chief Accountant session)
  const chiefClient = createClient(supabaseUrl, anonKey);
  const { data: chiefAuth, error: chiefErr } = await chiefClient.auth.signInWithPassword({
    email: "azizbek@firmus.uz",
    password: "Firmus2026!Secured",
  });
  check("Chief Accountant sign-in succeeds", !chiefErr && !!chiefAuth.session, chiefErr?.message);

  const authCookieVal = encodeURIComponent(JSON.stringify(chiefAuth.session));
  const cookieHeader = `sb-${projectRef}-auth-token=${authCookieVal}`;

  // Test AI Copilot authenticated call
  const copilotRes = await fetch(`${BASE_URL}/api/ai-copilot`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      message: "QQS holati qanday?",
      entityId: "11111111-1111-1111-1111-111111111111",
    }),
  });
  const copilotJson = await copilotRes.json();
  check(
    "Auth POST /api/ai-copilot -> 200 live_db/gemini reply",
    copilotRes.status === 200 && typeof copilotJson.reply === "string" && copilotJson.reply.length > 10,
    JSON.stringify(copilotJson)
  );

  // Test Zero-PII Bank <-> 1C AI Reconcile API
  const aiRecRes = await fetch(`${BASE_URL}/api/ai-reconcile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({
      items: [
        {
          id: "rec-test-1",
          status: "bank_only",
          date: "2026-11-16",
          type: "expense",
          bankAmount: 350000,
          oneCAmount: 0,
          diffAmount: 350000,
          purpose: "Oylik RKO va bank komissiyasi",
          counterpartyHint: "Kapitalbank",
          currentAccountCode: "9420",
        },
      ],
    }),
  });
  const aiRecJson = await aiRecRes.json();
  check(
    "Auth POST /api/ai-reconcile -> 200 stateless 21-BHMS classification",
    aiRecRes.status === 200 &&
      Array.isArray(aiRecJson.suggestions) &&
      aiRecJson.suggestions[0]?.accountCode === "9420",
    JSON.stringify(aiRecJson)
  );

  // Open redirect guard check on /auth/callback
  const cbRes = await fetch(`${BASE_URL}/auth/callback?next=https://evil.com`, { redirect: "manual" });
  const cbLoc = cbRes.headers.get("location") || "";
  check("Open redirect blocked on /auth/callback", !cbLoc.includes("evil.com"), `location=${cbLoc}`);

  // 4. Full Lifecycle inside Temporary Workspace + Temporary Entity
  let tempWorkspaceId = null;
  let tempEntityId = null;
  const auditorClient = createClient(supabaseUrl, anonKey);
  const { data: auditorAuth } = await auditorClient.auth.signInWithPassword({
    email: "jasur@firmus.uz",
    password: "Firmus2026!Secured",
  });
  const auditorCookieVal = encodeURIComponent(JSON.stringify(auditorAuth.session));
  const auditorCookieHeader = `sb-${projectRef}-auth-token=${auditorCookieVal}`;

  try {
    const { data: wsData, error: wsErr } = await chiefClient.rpc("create_workspace_with_owner", {
      p_name: "E2E TEST WORKSPACE",
      p_type: "accounting_firm",
    });
    check("create_workspace_with_owner succeeds for authenticated user", !wsErr && !!wsData?.id, wsErr?.message);
    tempWorkspaceId = wsData.id;

    const { data: ent, error: entErr } = await chiefClient
      .from("business_entities")
      .insert({
        workspace_id: tempWorkspaceId,
        legal_name: "E2E TEST AUDIT KORXONASI MCHJ",
        tin_stir: "309998877",
        company_type: "MChJ",
        tax_regime: "vat_profit_tax",
      })
      .select()
      .single();
    if (entErr) throw entErr;
    tempEntityId = ent.id;
    check("Create entity inside newly created workspace succeeds via RLS", !!tempEntityId);

    // Test creating custom sub-account, contract, inventory, employee, bank account, document inside tempEntityId
    const [coaIns, bankIns, invIns, empIns, cntIns] = await Promise.all([
      chiefClient.from("chart_of_accounts").insert({
        business_entity_id: tempEntityId,
        code: "5121",
        name: "E2E Maxsus valyuta schyoti",
        type: "asset",
        is_active: true,
      }).select().single(),
      chiefClient.from("bank_accounts").insert({
        business_entity_id: tempEntityId,
        bank_name: "ATB Kapitalbank",
        account_number: "20208000905412340001",
        mfo: "00974",
        currency: "UZS",
        balance: 50000000,
        status: "connected",
      }).select().single(),
      chiefClient.from("inventory_items").insert({
        business_entity_id: tempEntityId,
        sku: "E2E-SKU-1",
        name: "E2E Qog'oz",
        category: "Kanselyariya",
        quantity: 100,
        unit: "dona",
        unit_price: 25000,
        status: "in_stock",
      }).select().single(),
      chiefClient.from("employees").insert({
        business_entity_id: tempEntityId,
        full_name: "E2E Test Xodim",
        position: "Buxgalter",
        department: "Moliya",
        salary: 8000000,
        pinfl: "31502941234567",
        hire_date: "2026-11-01",
        status: "active",
      }).select().single(),
      chiefClient.from("contracts").insert({
        business_entity_id: tempEntityId,
        number: "SH-E2E-001",
        type: "Yetkazib berish",
        counterparty: "E2E Hamkor MCHJ",
        counterparty_stir: "301112233",
        amount: 112000000,
        start_date: "2026-11-01",
        end_date: "2027-11-01",
        status: "active",
      }).select().single(),
    ]);
    check(
      "Entity CRUD (COA subaccount, bank account, inventory, employee, contract) all succeed via RLS",
      !coaIns.error && !bankIns.error && !invIns.error && !empIns.error && !cntIns.error,
      [coaIns.error?.message, bankIns.error?.message, invIns.error?.message, empIns.error?.message, cntIns.error?.message]
        .filter(Boolean)
        .join("; ")
    );

    // Verify 24+ COA accounts seeded (including 0200, 9910, 4310, 6310) + 4 integrations + tax_deadlines
    const { data: coa } = await chiefClient
      .from("chart_of_accounts")
      .select("code")
      .eq("business_entity_id", tempEntityId);
    const codes = new Set((coa || []).map((c) => c.code));
    check(
      "Entity insert trigger seeded 24+ BHMS accounts (incl. 0200, 9910, 4310, 6310)",
      codes.size >= 24 && codes.has("0200") && codes.has("9910") && codes.has("4310") && codes.has("6310"),
      `count=${codes.size}`
    );

    const { data: seededDeadlines, error: dlErr } = await chiefClient
      .from("tax_deadlines")
      .select("id, title")
      .eq("business_entity_id", tempEntityId);
    check(
      "Entity insert trigger seeded >= 3 default tax deadlines",
      !dlErr && (seededDeadlines?.length ?? 0) >= 3,
      `count=${seededDeadlines?.length}, err=${dlErr?.message}`
    );

    // Supabase Storage upload + signed URL + delete
    const storagePath = `${tempEntityId}/e2e_invoice.pdf`;
    const pdfBlob = new Blob(["%PDF-1.4 E2E FIRMUS TEST"], { type: "application/pdf" });
    const { error: upErr } = await chiefClient.storage
      .from("documents")
      .upload(storagePath, pdfBlob, { contentType: "application/pdf" });
    check("Supabase Storage upload PDF succeeds via RLS", !upErr, upErr?.message);

    const { data: signedData, error: sigErr } = await chiefClient.storage
      .from("documents")
      .createSignedUrl(storagePath, 60);
    check("Supabase Storage signed download URL created", !sigErr && !!signedData?.signedUrl, sigErr?.message);
    await chiefClient.storage.from("documents").remove([storagePath]);

    // Post VAT-inclusive E-SF (4010 Dt 112M -> 9010 Kt 100M + 6410 Kt 12M) + Admin Expense (9420 Dt 20M -> 5110 Kt 20M)
    const { error: je1Err } = await chiefClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: tempEntityId,
      p_entry_number: "JE-E2E-ESF-1",
      p_entry_date: "2026-11-10",
      p_description: "E2E E-SF QQS 12% ajratish bilan",
      p_source_type: "didox_invoice",
      p_source_reference_id: "SF-E2E-1",
      p_idempotency_key: `idem-e2e-1-${tempEntityId}`,
      p_lines: [
        { account_code: "4010", debit_amount: 112000000, credit_amount: 0, memo: "Gross" },
        { account_code: "9010", debit_amount: 0, credit_amount: 100000000, memo: "Net" },
        { account_code: "6410", debit_amount: 0, credit_amount: 12000000, memo: "VAT 12%" },
      ],
    });
    check("3-line VAT 12% split entry posted atomically", !je1Err, je1Err?.message);

    const { error: je2Err } = await chiefClient.rpc("create_journal_entry_atomic", {
      p_business_entity_id: tempEntityId,
      p_entry_number: "JE-E2E-EXP-1",
      p_entry_date: "2026-11-12",
      p_description: "E2E ma'muriy xarajat",
      p_source_type: "manual",
      p_source_reference_id: "EXP-1",
      p_idempotency_key: `idem-e2e-2-${tempEntityId}`,
      p_lines: [
        { account_code: "9420", debit_amount: 20000000, credit_amount: 0, memo: "Admin" },
        { account_code: "5110", debit_amount: 0, credit_amount: 20000000, memo: "Bank" },
      ],
    });
    check("Expense entry posted atomically", !je2Err, je2Err?.message);

    // Auditor blocked from closing period
    const { error: audCloseErr } = await auditorClient.rpc("close_accounting_period", {
      p_business_entity_id: tempEntityId,
      p_from_date: "2026-11-01",
      p_to_date: "2026-11-30",
      p_closing_date: "2026-11-30",
    });
    check("RBAC: Auditor blocked from close_accounting_period", !!audCloseErr);

    // Chief Accountant closes period (100M rev - 20M exp = 80M net profit -> 8710)
    const { data: closeRes, error: closeErr } = await chiefClient.rpc("close_accounting_period", {
      p_business_entity_id: tempEntityId,
      p_from_date: "2026-11-01",
      p_to_date: "2026-11-30",
      p_closing_date: "2026-11-30",
    });
    check(
      "Period closing RPC posts 80,000,000 UZS net profit to 8710",
      !closeErr && Number(closeRes?.net_profit) === 80000000,
      closeErr?.message || JSON.stringify(closeRes)
    );

    // Idempotent second close check
    const { data: closeRes2 } = await chiefClient.rpc("close_accounting_period", {
      p_business_entity_id: tempEntityId,
      p_from_date: "2026-11-01",
      p_to_date: "2026-11-30",
      p_closing_date: "2026-11-30",
    });
    check("Period closing is idempotent on repeat call", closeRes2?.idempotent === true);

    // Trial Balance check after closing
    const { data: tb } = await chiefClient.rpc("get_trial_balance", {
      p_entity_id: tempEntityId,
      p_from_date: "2026-11-01",
      p_to_date: "2026-11-30",
    });
    const acc8710 = (tb || []).find((r) => r.account_code === "8710");
    const acc9010 = (tb || []).find((r) => r.account_code === "9010");
    const sumDt = (tb || []).reduce((s, r) => s + Number(r.period_debit || 0), 0);
    const sumCt = (tb || []).reduce((s, r) => s + Number(r.period_credit || 0), 0);
    check(
      "Post-closing Trial Balance: 9010 closed to 0, 8710 = 80M credit, Total Dt == Ct",
      Number(acc8710?.closing_credit) === 80000000 &&
        Number(acc9010?.closing_credit || 0) === 0 &&
        Math.abs(sumDt - sumCt) < 0.01,
      `8710=${acc8710?.closing_credit}, 9010=${acc9010?.closing_credit}, Dt=${sumDt}, Ct=${sumCt}`
    );

    // 5. AI Agent Full Human-in-the-Loop Proposal + Execute + Audit Log + Auditor RBAC Check
    const aiPropRes = await fetch(`${BASE_URL}/api/ai-copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        message: "provodka 1120000 4010 9010 qqs",
        entityId: tempEntityId,
      }),
    });
    const aiPropJson = await aiPropRes.json();
    const proposal = aiPropJson?.actionProposed;
    check(
      "AI Agent creates balanced 3-line VAT 12% journal_entry proposal",
      aiPropRes.status === 200 &&
        proposal?.type === "journal_entry" &&
        proposal?.payload?.lines?.length === 3 &&
        proposal.payload.lines[0].debit_amount === 1120000 &&
        proposal.payload.lines[1].credit_amount === 1000000 &&
        proposal.payload.lines[2].credit_amount === 120000,
      JSON.stringify(aiPropJson)
    );

    const audExecRes = await fetch(`${BASE_URL}/api/ai-copilot/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: auditorCookieHeader },
      body: JSON.stringify({
        entityId: "11111111-1111-1111-1111-111111111111",
        decision: "approve",
        modelUsed: "firmus-agent",
        proposal,
      }),
    });
    check(
      "AI Execute RBAC: Auditor blocked from approving AI mutations -> HTTP 403",
      audExecRes.status === 403,
      `got ${audExecRes.status}`
    );

    const aiExecRes = await fetch(`${BASE_URL}/api/ai-copilot/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        entityId: tempEntityId,
        decision: "approve",
        modelUsed: aiPropJson.modelUsed || "firmus-agent",
        proposal,
      }),
    });
    const aiExecJson = await aiExecRes.json();
    const { data: aiLogs } = await chiefClient
      .from("ai_action_logs")
      .select("action_type, decision")
      .eq("business_entity_id", tempEntityId);
    check(
      "AI Execute approves proposal atomically and records immutable ai_action_logs",
      aiExecRes.status === 200 &&
        aiExecJson.ok === true &&
        (aiLogs || []).some((l) => l.action_type === "journal_entry" && l.decision === "approved"),
      JSON.stringify(aiExecJson)
    );
  } finally {
    if (tempEntityId || tempWorkspaceId) {
      await runSql(`
        BEGIN;
        ALTER TABLE public.journal_lines DISABLE TRIGGER trg_journal_lines_immutable;
        ALTER TABLE public.journal_entries DISABLE TRIGGER trg_journal_entry_immutable;
        ${tempEntityId ? `DELETE FROM public.journal_lines WHERE journal_entry_id IN (SELECT id FROM public.journal_entries WHERE business_entity_id = '${tempEntityId}');` : ""}
        ${tempEntityId ? `DELETE FROM public.journal_entries WHERE business_entity_id = '${tempEntityId}';` : ""}
        ${tempEntityId ? `DELETE FROM public.business_entities WHERE id = '${tempEntityId}';` : ""}
        ${tempWorkspaceId ? `DELETE FROM public.team_members WHERE workspace_id = '${tempWorkspaceId}';` : ""}
        ${tempWorkspaceId ? `DELETE FROM public.workspaces WHERE id = '${tempWorkspaceId}';` : ""}
        ALTER TABLE public.journal_entries ENABLE TRIGGER trg_journal_entry_immutable;
        ALTER TABLE public.journal_lines ENABLE TRIGGER trg_journal_lines_immutable;
        COMMIT;
      `);
      console.log(`Cleaned up temporary test workspace=${tempWorkspaceId} entity=${tempEntityId}`);
    }
  }

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("E2E Fatal Error:", err);
  process.exit(1);
});
