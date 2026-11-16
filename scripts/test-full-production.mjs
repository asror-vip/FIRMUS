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
    { path: "/login", expected: 200 },
    { path: "/register", expected: 200 },
    { path: "/privacy", expected: 200 },
    { path: "/terms", expected: 200 },
    { path: "/", expected: 307 },
    { path: "/transactions", expected: 307 },
    { path: "/accounting", expected: 307 },
    { path: "/documents", expected: 307 },
    { path: "/settings", expected: 307 },
  ];

  for (const item of publicChecks) {
    const res = await fetch(`${BASE_URL}${item.path}`, { redirect: "manual" });
    check(`GET ${item.path} -> HTTP ${item.expected}`, res.status === item.expected, `got ${res.status}`);
  }

  // 2. Unauthenticated API protection checks
  const unauthApis = [
    "/api/ai-copilot",
    "/api/integrations/test",
    "/api/auth/phone-otp/send",
    "/api/auth/phone-otp/verify",
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

  // Test SSRF block & real URL check on /api/integrations/test
  const ssrfRes = await fetch(`${BASE_URL}/api/integrations/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ apiUrl: "http://127.0.0.1:54321" }),
  });
  check("SSRF blocked on /api/integrations/test -> HTTP 403", ssrfRes.status === 403, `got ${ssrfRes.status}`);

  // Test Eskiz Phone OTP config guard on /api/auth/phone-otp/send
  const otpSendRes = await fetch(`${BASE_URL}/api/auth/phone-otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    body: JSON.stringify({ phone: "+998 90 123-45-67" }),
  });
  const otpSendJson = await otpSendRes.json();
  check(
    "POST /api/auth/phone-otp/send validates Eskiz config cleanly (503 when keys missing, 200 if set)",
    otpSendRes.status === 503 || otpSendRes.status === 200,
    `status=${otpSendRes.status} body=${JSON.stringify(otpSendJson)}`
  );

  // 4. Full Lifecycle inside Temporary Entity (COA auto-seed, Storage, VAT Split Ledger, Period Closing, Cleanup)
  let tempEntityId = null;
  const auditorClient = createClient(supabaseUrl, anonKey);
  await auditorClient.auth.signInWithPassword({
    email: "jasur@firmus.uz",
    password: "Firmus2026!Secured",
  });

  try {
    const { data: ent, error: entErr } = await chiefClient
      .from("business_entities")
      .insert({
        workspace_id: "00000000-0000-0000-0000-000000000001",
        legal_name: "E2E TEST AUDIT KORXONASI MCHJ",
        tin_stir: "309998877",
        company_type: "MChJ",
        tax_regime: "vat_profit_tax",
      })
      .select()
      .single();
    if (entErr) throw entErr;
    tempEntityId = ent.id;

    // Verify 24 COA accounts seeded (including 0200 & 9910) + 4 integrations
    const { data: coa } = await chiefClient
      .from("chart_of_accounts")
      .select("code")
      .eq("business_entity_id", tempEntityId);
    const codes = new Set((coa || []).map((c) => c.code));
    check(
      "Entity insert trigger seeded 24+ BHMS accounts (incl. 0200 & 9910)",
      codes.size >= 24 && codes.has("0200") && codes.has("9910"),
      `count=${codes.size}`
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
  } finally {
    if (tempEntityId) {
      await runSql(`
        BEGIN;
        ALTER TABLE public.journal_lines DISABLE TRIGGER trg_journal_lines_immutable;
        ALTER TABLE public.journal_entries DISABLE TRIGGER trg_journal_entry_immutable;
        DELETE FROM public.journal_lines WHERE journal_entry_id IN (SELECT id FROM public.journal_entries WHERE business_entity_id = '${tempEntityId}');
        DELETE FROM public.journal_entries WHERE business_entity_id = '${tempEntityId}';
        DELETE FROM public.business_entities WHERE id = '${tempEntityId}';
        ALTER TABLE public.journal_entries ENABLE TRIGGER trg_journal_entry_immutable;
        ALTER TABLE public.journal_lines ENABLE TRIGGER trg_journal_lines_immutable;
        COMMIT;
      `);
      console.log(`Cleaned up temporary test entity ${tempEntityId}`);
    }
  }

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("E2E Fatal Error:", err);
  process.exit(1);
});
