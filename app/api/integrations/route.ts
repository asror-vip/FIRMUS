import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { UUID_REGEX } from "@/lib/ai/agent-types";
import { sanitizeStorageText } from "@/lib/utils/privacy";
import {
  encryptSecret,
  decryptSecret,
  sha256Hex,
  generateSixDigitCode,
} from "@/lib/utils/crypto-secrets";
import {
  validateExternalODataUrl,
  testODataConnection,
  fetchODataCatalogs,
  pushDraftToOData,
  OneCDraftInput,
} from "@/lib/services/onec-connector";

export const dynamic = "force-dynamic";

const MANAGEMENT_ROLES = new Set([
  "workspace_owner",
  "workspace_admin",
  "company_director",
  "chief_accountant",
  "accountant",
  "admin",
  "director",
]);

async function verifyEntityAccess(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  service: ReturnType<typeof getServiceClient>,
  userId: string,
  entityId: string,
  requireMutation = false
): Promise<{ ok: boolean; error?: string; workspaceId?: string; role?: string }> {
  const { data: entity, error: entityErr } = await service
    .from("business_entities")
    .select("id, workspace_id, legal_name, tin_stir")
    .eq("id", entityId)
    .maybeSingle();

  if (entityErr || !entity) {
    return { ok: false, error: "Korxona topilmadi." };
  }

  // Check workspace membership
  const { data: member } = await service
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", entity.workspace_id)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: ws } = await service
    .from("workspaces")
    .select("owner_user_id")
    .eq("id", entity.workspace_id)
    .maybeSingle();

  const isOwner = ws?.owner_user_id === userId;
  const role = isOwner ? "workspace_owner" : member?.role || "viewer";

  if (!isOwner && !member) {
    return { ok: false, error: "Bu korxonaga kirish huquqingiz yoʻq." };
  }

  if (requireMutation && !isOwner && !MANAGEMENT_ROLES.has(role)) {
    return { ok: false, error: "Integratsiya sozlamalarini oʻzgartirish uchun vakolat yetarli emas." };
  }

  return { ok: true, workspaceId: entity.workspace_id, role };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Avtorizatsiyadan oʻtilmagan." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId")?.trim();

    if (!entityId || !UUID_REGEX.test(entityId)) {
      return NextResponse.json({ error: "Yaroqli entityId talab qilinadi." }, { status: 400 });
    }

    const service = getServiceClient();
    const access = await verifyEntityAccess(supabase, service, user.id, entityId, false);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // 1. Fetch connections
    const { data: connections, error: connErr } = await service
      .from("integration_connections")
      .select("id, provider, status, config, pairing_code_expires_at, last_sync_at, last_error, created_at, updated_at")
      .eq("business_entity_id", entityId);

    if (connErr) {
      return NextResponse.json({ error: "Integratsiyalarni yuklashda xatolik." }, { status: 500 });
    }

    const connList = connections || [];
    const onecOdata = connList.find((c) => c.provider === "onec_odata");
    const onecEpf = connList.find((c) => c.provider === "onec_epf");
    const didox = connList.find((c) => c.provider === "didox");
    const bank = connList.find((c) => c.provider === "bank_prefs");

    // 2. Catalog summary counts
    const { data: catalogItems } = await service
      .from("integration_catalog_cache")
      .select("catalog_type")
      .eq("business_entity_id", entityId);

    let counterpartiesCount = 0;
    let accountsCount = 0;
    for (const item of catalogItems || []) {
      if (item.catalog_type === "counterparty") counterpartiesCount++;
      if (item.catalog_type === "account") accountsCount++;
    }

    // 3. Draft Queue
    const { data: queueItems } = await service
      .from("onec_draft_queue")
      .select("id, source_kind, doc_type, doc_date, counterparty_name, amount, status, target_1c_doc_number, error_message, description, payload, created_at")
      .eq("business_entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(50);

    const formattedQueue = (queueItems || []).map((q) => ({
      id: q.id,
      sourceKind: q.source_kind,
      summary: q.description || q.counterparty_name || "—",
      counterparty: q.counterparty_name,
      amount: Number(q.amount || 0),
      status: q.status,
      onecDocNumber: q.target_1c_doc_number,
      errorMessage: q.error_message,
      createdAt: q.created_at,
    }));

    // Resolve active 1C mode and status
    let activeOneCMode: "odata" | "epf" = "odata";
    let activeOneCStatus: "connected" | "awaiting_code" | "disconnected" = "disconnected";
    let baseUrl = "";
    let username = "";
    let hasPassword = false;
    let pairCode: string | null = null;
    let pairCodeExpiresAt: string | null = null;
    let lastSyncedAt: string | null = null;

    if (onecOdata && onecOdata.status === "connected") {
      activeOneCMode = "odata";
      activeOneCStatus = "connected";
      baseUrl = (onecOdata.config as any)?.baseUrl || "";
      username = (onecOdata.config as any)?.username || "";
      hasPassword = Boolean((onecOdata.config as any)?.hasPassword);
      lastSyncedAt = onecOdata.last_sync_at;
    } else if (onecEpf && (onecEpf.status === "connected" || onecEpf.status === "pending_pair")) {
      activeOneCMode = "epf";
      const isExpired =
        onecEpf.pairing_code_expires_at &&
        new Date(onecEpf.pairing_code_expires_at).getTime() < Date.now();

      if (onecEpf.status === "connected") {
        activeOneCStatus = "connected";
      } else if (!isExpired) {
        activeOneCStatus = "awaiting_code";
        pairCode = (onecEpf.config as any)?.pairCode || null;
        pairCodeExpiresAt = onecEpf.pairing_code_expires_at;
      }
      lastSyncedAt = onecEpf.last_sync_at;
    } else if (onecOdata) {
      activeOneCMode = "odata";
      baseUrl = (onecOdata.config as any)?.baseUrl || "";
      username = (onecOdata.config as any)?.username || "";
      hasPassword = Boolean((onecOdata.config as any)?.hasPassword);
      lastSyncedAt = onecOdata.last_sync_at;
    }

    return NextResponse.json({
      connections: connList,
      onec: {
        mode: activeOneCMode,
        status: activeOneCStatus,
        baseUrl,
        username,
        hasPassword,
        pairCode,
        pairCodeExpiresAt,
        lastSyncedAt,
        counterpartiesCount,
        accountsCount,
      },
      didox: {
        status: didox?.status === "connected" ? "connected" : "disconnected",
        stir: (didox?.config as any)?.stir || "",
        mode: (didox?.config as any)?.mode || "manual",
      },
      bank: {
        encoding: (bank?.config as any)?.encoding || "auto",
        defaultAccountCode: (bank?.config as any)?.defaultAccountCode || "5110",
      },
      catalogSummary: {
        counterpartiesCount,
        accountsCount,
      },
      queue: formattedQueue,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server xatosi yuz berdi." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Avtorizatsiyadan oʻtilmagan." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "").trim();
    const entityId = String(body?.entityId || "").trim();

    if (!entityId || !UUID_REGEX.test(entityId)) {
      return NextResponse.json({ error: "Yaroqli entityId talab qilinadi." }, { status: 400 });
    }

    const service = getServiceClient();
    const access = await verifyEntityAccess(supabase, service, user.id, entityId, true);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // --------------------------------------------------------------------------
    // ACTION: save_onec_odata
    // --------------------------------------------------------------------------
    if (action === "save_onec_odata") {
      const rawBaseUrl = String(body?.baseUrl || "").trim();
      const username = sanitizeStorageText(String(body?.username || "").trim());
      const rawPassword = body?.password ? String(body.password) : "";

      if (!rawBaseUrl || !username) {
        return NextResponse.json(
          { error: "1C OData URL va foydalanuvchi logini kiritilishi shart." },
          { status: 400 }
        );
      }

      let validatedUrl: URL;
      try {
        validatedUrl = validateExternalODataUrl(rawBaseUrl);
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }

      // Check existing connection to see if password is unchanged
      const { data: existingConn } = await service
        .from("integration_connections")
        .select("encrypted_secrets, config")
        .eq("business_entity_id", entityId)
        .eq("provider", "onec_odata")
        .maybeSingle();

      let activePassword = rawPassword;
      if (!activePassword) {
        if (existingConn?.encrypted_secrets) {
          try {
            activePassword = decryptSecret(existingConn.encrypted_secrets);
          } catch {
            return NextResponse.json(
              { error: "Oldingi maxfiy kalitni tiklab boʻlmadi, iltimos parolni qayta kiriting." },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json({ error: "Parol kiritilishi shart." }, { status: 400 });
        }
      }

      // Test connection before saving
      const testResult = await testODataConnection({
        baseUrl: validatedUrl.toString(),
        username,
        password: activePassword,
      });

      if (!testResult.ok) {
        return NextResponse.json(
          { error: `1C OData ulanish xatosi: ${testResult.error || testResult.message}` },
          { status: 400 }
        );
      }

      const encryptedSecrets = encryptSecret(activePassword);

      const { error: upsertErr } = await service
        .from("integration_connections")
        .upsert(
          {
            workspace_id: access.workspaceId!,
            business_entity_id: entityId,
            provider: "onec_odata",
            status: "connected",
            config: {
              baseUrl: validatedUrl.toString(),
              username,
              hasPassword: true,
              discoveredEntities: testResult.discoveredEntities,
            },
            encrypted_secrets: encryptedSecrets,
            last_sync_at: new Date().toISOString(),
            last_error: null,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_entity_id,provider" }
        );

      if (upsertErr) {
        return NextResponse.json({ error: "1C OData sozlamalarini saqlashda xatolik." }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        message: "1C OData muvaffaqiyatli ulandi va sinovdan oʻtdi.",
        discoveredEntities: testResult.discoveredEntities,
      });
    }

    // --------------------------------------------------------------------------
    // ACTION: sync_onec_catalog
    // --------------------------------------------------------------------------
    if (action === "sync_onec_catalog") {
      const { data: conn } = await service
        .from("integration_connections")
        .select("config, encrypted_secrets")
        .eq("business_entity_id", entityId)
        .eq("provider", "onec_odata")
        .eq("status", "connected")
        .maybeSingle();

      if (!conn || !conn.encrypted_secrets) {
        return NextResponse.json(
          { error: "1C OData faol ulanishi topilmadi. Avval ulanishni sozlang." },
          { status: 400 }
        );
      }

      const cfg = conn.config as any;
      const baseUrl = cfg?.baseUrl;
      const username = cfg?.username;
      let password = "";

      try {
        password = decryptSecret(conn.encrypted_secrets);
      } catch {
        return NextResponse.json({ error: "Shifrlangan parolni ochib boʻlmadi." }, { status: 500 });
      }

      const catalogResult = await fetchODataCatalogs({ baseUrl, username, password });
      if (!catalogResult.ok && catalogResult.items.length === 0) {
        return NextResponse.json(
          { error: `1C kataloglarini sinxronlab boʻlmadi: ${catalogResult.errors.join("; ")}` },
          { status: 400 }
        );
      }

      // Upsert retrieved items to integration_catalog_cache
      const batch = catalogResult.items.map((item) => ({
        business_entity_id: entityId,
        catalog_type: item.catalogType === "bank_account" ? "account" : item.catalogType,
        external_ref: item.externalRefKey,
        tin_stir: item.tinStir,
        name: item.name,
        code: item.code,
        meta: item.rawData,
        synced_at: new Date().toISOString(),
      }));

      if (batch.length > 0) {
        await service
          .from("integration_catalog_cache")
          .upsert(batch, { onConflict: "business_entity_id,catalog_type,external_ref" });
      }

      await service
        .from("integration_connections")
        .update({
          last_sync_at: new Date().toISOString(),
          last_error: catalogResult.errors.length > 0 ? catalogResult.errors.slice(0, 3).join("; ") : null,
          updated_at: new Date().toISOString(),
        })
        .eq("business_entity_id", entityId)
        .eq("provider", "onec_odata");

      return NextResponse.json({
        ok: true,
        counts: catalogResult.counts,
        errors: catalogResult.errors,
      });
    }

    // --------------------------------------------------------------------------
    // ACTION: generate_epf_pair_code
    // --------------------------------------------------------------------------
    if (action === "generate_epf_pair_code") {
      const pairCode = generateSixDigitCode();
      const pairCodeHash = sha256Hex(pairCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const { error: upsertErr } = await service
        .from("integration_connections")
        .upsert(
          {
            workspace_id: access.workspaceId!,
            business_entity_id: entityId,
            provider: "onec_epf",
            status: "pending_pair",
            pairing_code_hash: pairCodeHash,
            pairing_code_expires_at: expiresAt.toISOString(),
            config: {
              pairCode,
              pairCodeExpiresAt: expiresAt.toISOString(),
            },
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_entity_id,provider" }
        );

      if (upsertErr) {
        return NextResponse.json({ error: "Ulash kodini yaratishda xatolik." }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        code: pairCode,
        expiresAt: expiresAt.toISOString(),
      });
    }

    // --------------------------------------------------------------------------
    // ACTION: save_didox
    // --------------------------------------------------------------------------
    if (action === "save_didox") {
      const stir = sanitizeStorageText(String(body?.stir || "").replace(/\D/g, ""));
      const mode = body?.mode === "auto" ? "auto" : "manual";

      if (stir && !/^\d{9}$/.test(stir)) {
        return NextResponse.json({ error: "Didox STIR 9 ta raqam boʻlishi kerak." }, { status: 400 });
      }

      const { error: upsertErr } = await service
        .from("integration_connections")
        .upsert(
          {
            workspace_id: access.workspaceId!,
            business_entity_id: entityId,
            provider: "didox",
            status: stir ? "connected" : "disconnected",
            config: { stir, mode },
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_entity_id,provider" }
        );

      if (upsertErr) {
        return NextResponse.json({ error: "Didox sozlamalarini saqlashda xatolik." }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    // --------------------------------------------------------------------------
    // ACTION: save_bank
    // --------------------------------------------------------------------------
    if (action === "save_bank") {
      const encoding = body?.encoding === "Windows-1251" || body?.encoding === "UTF-8" ? body.encoding : "auto";
      const defaultAccountCode = sanitizeStorageText(String(body?.defaultAccountCode || "5110").trim());

      const { error: upsertErr } = await service
        .from("integration_connections")
        .upsert(
          {
            workspace_id: access.workspaceId!,
            business_entity_id: entityId,
            provider: "bank_prefs",
            status: "connected",
            config: { encoding, defaultAccountCode },
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_entity_id,provider" }
        );

      if (upsertErr) {
        return NextResponse.json({ error: "Bank sozlamalarini saqlashda xatolik." }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    // --------------------------------------------------------------------------
    // ACTION: revoke_integration
    // --------------------------------------------------------------------------
    if (action === "revoke_integration") {
      const provider = String(body?.provider || "onec");

      if (provider === "onec") {
        await service
          .from("integration_connections")
          .update({
            status: "disconnected",
            pairing_code_hash: null,
            pairing_code_expires_at: null,
            token_hash: null,
            updated_at: new Date().toISOString(),
          })
          .eq("business_entity_id", entityId)
          .in("provider", ["onec_odata", "onec_epf"]);
      } else {
        await service
          .from("integration_connections")
          .update({
            status: "disconnected",
            updated_at: new Date().toISOString(),
          })
          .eq("business_entity_id", entityId)
          .eq("provider", provider);
      }

      return NextResponse.json({ ok: true });
    }

    // --------------------------------------------------------------------------
    // ACTION: push_drafts_to_onec
    // --------------------------------------------------------------------------
    if (action === "push_drafts_to_onec") {
      const draftIds: string[] | undefined = Array.isArray(body?.draftIds) ? body.draftIds : undefined;

      // Select pending items
      let query = service
        .from("onec_draft_queue")
        .select("*")
        .eq("business_entity_id", entityId)
        .in("status", ["pending", "failed"]);

      if (draftIds && draftIds.length > 0) {
        query = query.in("id", draftIds);
      }

      const { data: queueItems, error: queueErr } = await query.limit(25);
      if (queueErr || !queueItems || queueItems.length === 0) {
        return NextResponse.json({ ok: true, pushedCount: 0, message: "Yuboriladigan qoralamalar yoʻq." });
      }

      // Check if OData is connected
      const { data: odataConn } = await service
        .from("integration_connections")
        .select("config, encrypted_secrets")
        .eq("business_entity_id", entityId)
        .eq("provider", "onec_odata")
        .eq("status", "connected")
        .maybeSingle();

      if (odataConn && odataConn.encrypted_secrets) {
        // Push directly via OData
        const cfg = odataConn.config as any;
        let password = "";
        try {
          password = decryptSecret(odataConn.encrypted_secrets);
        } catch {
          return NextResponse.json({ error: "OData parolini shifrdan chiqarib boʻlmadi." }, { status: 500 });
        }

        let successCount = 0;
        for (const item of queueItems) {
          const draftInput: OneCDraftInput = {
            id: item.id,
            docType: item.doc_type,
            docDate: item.doc_date,
            amount: Number(item.amount),
            counterpartyName: item.counterparty_name,
            counterpartyStir: item.counterparty_stir,
            description: item.description,
            payload: item.payload as any,
          };

          const pushRes = await pushDraftToOData({
            baseUrl: cfg.baseUrl,
            username: cfg.username,
            password,
            draft: draftInput,
          });

          if (pushRes.ok) {
            successCount++;
            await service
              .from("onec_draft_queue")
              .update({
                status: "pushed_to_1c_draft",
                target_1c_doc_number: pushRes.docNumber || null,
                target_1c_ref_key: pushRes.refKey || null,
                error_message: null,
                pushed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.id);
          } else {
            await service
              .from("onec_draft_queue")
              .update({
                status: "failed",
                error_message: pushRes.error || "OData push xatosi",
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.id);
          }
        }

        return NextResponse.json({ ok: true, pushedCount: successCount });
      }

      // If local EPF is used: items remain pending for EPF bridge to fetch via /api/1c/outbox
      return NextResponse.json({
        ok: true,
        pushedCount: queueItems.length,
        message: "Qoralamalar navbatga qoʻyildi (1C desktop yuklab olishini kutmoqda).",
      });
    }

    // --------------------------------------------------------------------------
    // ACTION: queue_reconcile_draft (used by Reconcile and scanner)
    // --------------------------------------------------------------------------
    if (action === "queue_reconcile_draft") {
      const drafts = Array.isArray(body?.drafts) ? body.drafts : [];
      if (drafts.length === 0) {
        return NextResponse.json({ error: "Qoralamalar roʻyxati boʻsh." }, { status: 400 });
      }

      const rows = drafts.map((d: any) => ({
        business_entity_id: entityId,
        created_by: user.id,
        source_kind: d.sourceKind || "bank_reconcile",
        external_idempotency_key: d.idempotencyKey || `rec-${entityId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        doc_type: d.docType || "bank_receipt",
        doc_date: d.docDate || new Date().toISOString().slice(0, 10),
        counterparty_name: sanitizeStorageText(String(d.counterpartyName || "Nomaʼlum").trim()),
        counterparty_stir: d.counterpartyStir ? String(d.counterpartyStir).replace(/\D/g, "").slice(0, 9) : null,
        amount: Math.abs(Number(d.amount || 0)),
        vat_amount: Math.abs(Number(d.vatAmount || 0)),
        debit_account: String(d.debitAccount || "5110").trim().slice(0, 20),
        credit_account: String(d.creditAccount || "6010").trim().slice(0, 20),
        description: sanitizeStorageText(String(d.description || "").trim()),
        payload: d.payload || {},
        status: "pending",
      }));

      const { data: inserted, error: insertErr } = await service
        .from("onec_draft_queue")
        .upsert(rows, { onConflict: "business_entity_id,external_idempotency_key" })
        .select("id");

      if (insertErr) {
        return NextResponse.json({ error: "Qoralamalarni navbatga qoʻshishda xatolik." }, { status: 500 });
      }

      return NextResponse.json({ ok: true, count: inserted?.length || rows.length });
    }

    return NextResponse.json({ error: `Nomaʼlum amal: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server xatosi yuz berdi." },
      { status: 500 }
    );
  }
}
