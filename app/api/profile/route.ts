import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { maskEmail, normalizeUzPhone, sanitizeStorageText } from "@/lib/utils/privacy";
import { UUID_REGEX } from "@/lib/ai/agent-types";
import { getRequestLocale } from "@/lib/i18n/server-locale";
import { getApiMessages, localizeServerError } from "@/lib/i18n/domains/api-messages";

const MANAGEMENT_ROLES = new Set([
  "workspace_owner",
  "workspace_admin",
  "company_director",
  "chief_accountant",
  "admin",
  "director",
]);

const profilePatchSchema = z.object({
  // Personal profile fields
  fullName: z.string().trim().min(2, "F.I.O kamida 2 ta belgidan iborat boʻlishi kerak").max(120).optional(),
  phone: z
    .string()
    .trim()
    .max(30, "Telefon raqami juda uzun")
    .optional(),
  jobTitle: z.string().trim().max(120, "Lavozim nomi juda uzun").optional(),

  // Primary business entity fields
  entityId: z.string().trim().regex(UUID_REGEX, "entityId notoʻgʻri UUID formatida").optional(),
  legalName: z.string().trim().min(2, "Korxona yuridik nomi kamida 2 ta belgi boʻlishi kerak").max(200).optional(),
  tradeName: z.string().trim().max(200).optional(),
  tinStir: z
    .string()
    .trim()
    .regex(/^\d{9}$/, "STIR (INN) aniq 9 ta raqamdan iborat boʻlishi shart")
    .optional(),
  companyType: z.string().trim().min(2).max(50).optional(),
  taxRegime: z.enum(["vat_profit_tax", "turnover_tax", "fixed_tax"]).optional(),
  bankAccount: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{20}$/.test(v), "Bank hisobvaragʻi aniq 20 ta raqamdan iborat boʻlishi kerak")
    .optional(),
  bankName: z.string().trim().max(200).optional(),
  bankMfo: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{5}$/.test(v), "Bank MFO kodi aniq 5 ta raqamdan iborat boʻlishi kerak")
    .optional(),
  accountantName: z.string().trim().max(150).optional(),
});

async function resolveCanManageWorkspace(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  service: ReturnType<typeof getServiceClient>,
  userId: string,
  workspaceId: string
): Promise<{ canManage: boolean; role: string }> {
  const { data: ws } = await service
    .from("workspaces")
    .select("owner_user_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (ws?.owner_user_id === userId) {
    return { canManage: true, role: "workspace_owner" };
  }

  const { data: roleData } = await supabase.rpc("get_auth_user_role", {
    target_workspace_id: workspaceId,
  });
  const role = typeof roleData === "string" && roleData ? roleData : "viewer";

  return {
    canManage: MANAGEMENT_ROLES.has(role),
    role,
  };
}

async function fetchEntityWithOptionalBankCols(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  entityId?: string | null
) {
  const fullSelect =
    "id, workspace_id, legal_name, trade_name, tin_stir, company_type, tax_regime, bank_account, bank_name, bank_mfo, accountant_name";
  const baseSelect =
    "id, workspace_id, legal_name, trade_name, tin_stir, company_type, tax_regime, accountant_name";

  const buildQuery = (columns: string) => {
    let q = supabase.from("business_entities").select(columns);
    if (entityId) {
      q = q.eq("id", entityId);
    } else {
      q = q.order("created_at", { ascending: true }).limit(1);
    }
    return q.maybeSingle();
  };

  const first = await buildQuery(fullSelect);
  if (!first.error) {
    return first.data as Record<string, any> | null;
  }

  // Fallback if bank_account/bank_name/bank_mfo columns are not yet present
  if (first.error.code === "42703" || String(first.error.message || "").includes("bank_")) {
    const fallback = await buildQuery(baseSelect);
    if (fallback.error) throw fallback.error;
    return fallback.data
      ? {
          ...(fallback.data as Record<string, any>),
          bank_account: "",
          bank_name: "",
          bank_mfo: "",
        }
      : null;
  }

  throw first.error;
}

export async function GET(req: NextRequest) {
  const locale = getRequestLocale(req);
  const msg = getApiMessages(locale);

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: msg.authRequired }, { status: 401 });
    }

    const requestedEntityId = req.nextUrl.searchParams.get("entityId")?.trim() || null;
    if (requestedEntityId && !UUID_REGEX.test(requestedEntityId)) {
      return NextResponse.json({ error: msg.invalidRequest }, { status: 400 });
    }

    const service = getServiceClient();

    const { data: profileRow, error: profileErr } = await service
      .from("user_profiles")
      .select("user_id, full_name, phone, job_title, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileErr && profileErr.code !== "42P01") {
      console.error("GET /api/profile user_profiles error:", profileErr);
    }

    const entity = await fetchEntityWithOptionalBankCols(supabase, requestedEntityId);

    let canManageEntity = false;
    let role = "viewer";
    if (entity?.workspace_id) {
      const perm = await resolveCanManageWorkspace(supabase, service, user.id, entity.workspace_id);
      canManageEntity = perm.canManage;
      role = perm.role;
    }

    const fallbackName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

    return NextResponse.json({
      profile: {
        user_id: user.id,
        email: user.email || "",
        masked_email: maskEmail(user.email),
        full_name: profileRow?.full_name ?? fallbackName,
        phone: profileRow?.phone ?? user.phone ?? "",
        job_title: profileRow?.job_title ?? "",
        updated_at: profileRow?.updated_at ?? null,
      },
      entity: entity
        ? {
            id: entity.id,
            workspace_id: entity.workspace_id,
            legal_name: entity.legal_name,
            trade_name: entity.trade_name ?? "",
            tin_stir: entity.tin_stir,
            company_type: entity.company_type,
            tax_regime: entity.tax_regime,
            bank_account: entity.bank_account ?? "",
            bank_name: entity.bank_name ?? "",
            bank_mfo: entity.bank_mfo ?? "",
            accountant_name: entity.accountant_name ?? "",
          }
        : null,
      canManageEntity,
      role,
    });
  } catch (err: any) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json(
      { error: err?.message ? localizeServerError(err.message, locale) : msg.systemError },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const locale = getRequestLocale(req);
  const msg = getApiMessages(locale);

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: msg.authRequired }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: msg.invalidRequest }, { status: 400 });
    }

    const parsed = profilePatchSchema.safeParse(body);
    if (!parsed.success) {
      const issueMsg = parsed.error.issues[0]?.message;
      return NextResponse.json(
        { error: issueMsg ? localizeServerError(issueMsg, locale) : msg.invalidRequest },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const service = getServiceClient();

    const hasPersonalUpdate =
      data.fullName !== undefined || data.phone !== undefined || data.jobTitle !== undefined;

    if (hasPersonalUpdate) {
      const { data: existingProfile } = await service
        .from("user_profiles")
        .select("full_name, phone, job_title")
        .eq("user_id", user.id)
        .maybeSingle();

      const resolvedPhone =
        data.phone !== undefined
          ? data.phone === ""
            ? ""
            : normalizeUzPhone(data.phone) || sanitizeStorageText(data.phone)
          : existingProfile?.phone ?? user.phone ?? "";

      const resolvedFullName =
        data.fullName !== undefined
          ? sanitizeStorageText(data.fullName)
          : existingProfile?.full_name ??
            (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "");

      const resolvedJobTitle =
        data.jobTitle !== undefined
          ? sanitizeStorageText(data.jobTitle)
          : existingProfile?.job_title ?? "";

      const { error: upsertErr } = await service.from("user_profiles").upsert(
        {
          user_id: user.id,
          full_name: resolvedFullName,
          phone: resolvedPhone,
          job_title: resolvedJobTitle,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (upsertErr) {
        console.error("PATCH /api/profile user_profiles upsert error:", upsertErr);
        return NextResponse.json({ error: msg.systemError }, { status: 500 });
      }

      if (data.fullName !== undefined) {
        // Display-only user_metadata sync; never store roles or permissions here
        await service.auth.admin
          .updateUserById(user.id, {
            user_metadata: {
              ...(user.user_metadata || {}),
              full_name: resolvedFullName,
              name: resolvedFullName,
            },
          })
          .catch((metaErr) => {
            console.warn("PATCH /api/profile auth display name sync warning:", metaErr);
          });
      }
    }

    const hasEntityUpdate =
      data.legalName !== undefined ||
      data.tradeName !== undefined ||
      data.tinStir !== undefined ||
      data.companyType !== undefined ||
      data.taxRegime !== undefined ||
      data.bankAccount !== undefined ||
      data.bankName !== undefined ||
      data.bankMfo !== undefined ||
      data.accountantName !== undefined;

    let updatedEntity: Record<string, any> | null = null;

    if (hasEntityUpdate) {
      if (!data.entityId) {
        return NextResponse.json(
          { error: "Korxona identifikatori (entityId) yuborilishi shart." },
          { status: 400 }
        );
      }

      const { data: targetEntity } = await supabase
        .from("business_entities")
        .select("id, workspace_id")
        .eq("id", data.entityId)
        .maybeSingle();

      if (!targetEntity) {
        return NextResponse.json({ error: msg.entityNotFoundOrForbidden }, { status: 403 });
      }

      const perm = await resolveCanManageWorkspace(
        supabase,
        service,
        user.id,
        targetEntity.workspace_id
      );

      if (!perm.canManage) {
        return NextResponse.json({ error: msg.roleInsufficient(perm.role) }, { status: 403 });
      }

      const entityPatch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (data.legalName !== undefined) entityPatch.legal_name = sanitizeStorageText(data.legalName);
      if (data.tradeName !== undefined) entityPatch.trade_name = sanitizeStorageText(data.tradeName) || null;
      if (data.tinStir !== undefined) entityPatch.tin_stir = data.tinStir;
      if (data.companyType !== undefined) entityPatch.company_type = sanitizeStorageText(data.companyType);
      if (data.taxRegime !== undefined) entityPatch.tax_regime = data.taxRegime;
      if (data.bankAccount !== undefined) entityPatch.bank_account = data.bankAccount || null;
      if (data.bankName !== undefined) entityPatch.bank_name = sanitizeStorageText(data.bankName) || null;
      if (data.bankMfo !== undefined) entityPatch.bank_mfo = data.bankMfo || null;
      if (data.accountantName !== undefined) {
        entityPatch.accountant_name = sanitizeStorageText(data.accountantName) || null;
      }

      const { error: entityUpdateErr } = await supabase
        .from("business_entities")
        .update(entityPatch)
        .eq("id", targetEntity.id);

      if (entityUpdateErr) {
        console.error("PATCH /api/profile entity update error:", entityUpdateErr);
        return NextResponse.json(
          { error: localizeServerError(entityUpdateErr.message, locale) },
          { status: 400 }
        );
      }

      updatedEntity = await fetchEntityWithOptionalBankCols(supabase, targetEntity.id);
    } else if (data.entityId) {
      updatedEntity = await fetchEntityWithOptionalBankCols(supabase, data.entityId);
    }

    const { data: latestProfile } = await service
      .from("user_profiles")
      .select("user_id, full_name, phone, job_title, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      profile: {
        user_id: user.id,
        email: user.email || "",
        masked_email: maskEmail(user.email),
        full_name: latestProfile?.full_name ?? "",
        phone: latestProfile?.phone ?? "",
        job_title: latestProfile?.job_title ?? "",
        updated_at: latestProfile?.updated_at ?? null,
      },
      entity: updatedEntity,
    });
  } catch (err: any) {
    console.error("PATCH /api/profile error:", err);
    return NextResponse.json(
      { error: err?.message ? localizeServerError(err.message, locale) : msg.systemError },
      { status: 500 }
    );
  }
}
