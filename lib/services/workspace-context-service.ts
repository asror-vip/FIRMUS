import { supabase } from "@/lib/supabase/client";
import { FEATURES } from "@/lib/config/features";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id?: string | null): id is string {
  return Boolean(id && UUID_REGEX.test(id));
}

async function resolveActiveWorkspaceId(explicitWorkspaceId?: string): Promise<string | null> {
  if (isValidUuid(explicitWorkspaceId)) return explicitWorkspaceId;
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id || null;
}

export async function fetchWorkspaces() {
  try {
    const selectColumns = FEATURES.multiCompanyMode
      ? "id, name, type, plan_id, business_entities(id), team_members(id)"
      : "id, name, type, plan_id";

    const { data, error } = await supabase
      .from("workspaces")
      .select(selectColumns)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("fetchWorkspaces error:", error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((ws: any) => ({
      id: ws.id,
      name: ws.name,
      type: ws.type || "accounting_firm",
      ownerName: "FIRMUS Rahbari",
      currentPlan: ws.plan_id || "professional",
      entitiesCount: FEATURES.multiCompanyMode ? (ws.business_entities?.length ?? 0) : 0,
      membersCount: FEATURES.multiCompanyMode ? (ws.team_members?.length ?? 0) : 1,
    }));
  } catch (err) {
    console.error("fetchWorkspaces exception:", err);
    return [];
  }
}

export async function createWorkspaceRecord(
  name: string,
  type: "accounting_firm" | "individual_company"
) {
  const { data, error } = await supabase.rpc("create_workspace_with_owner", {
    p_name: name,
    p_type: type,
  });
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    ownerName: "Siz",
    currentPlan: data.plan_id || "professional",
    entitiesCount: 0,
    membersCount: 1,
  };
}

export async function fetchBusinessEntities() {
  try {
    const { data, error } = await supabase
      .from("business_entities")
      .select(
        "id, workspace_id, legal_name, trade_name, tin_stir, company_type, tax_regime, currency, accountant_name, is_active"
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("fetchBusinessEntities error:", error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((ent: any) => ({
      id: ent.id,
      workspaceId: ent.workspace_id,
      name: ent.legal_name,
      tradeName: ent.trade_name || undefined,
      tinStir: ent.tin_stir,
      companyType: ent.company_type || "MChJ",
      taxRegime: ent.tax_regime || "vat_profit_tax",
      currency: ent.currency || "UZS",
      accountantName: ent.accountant_name || "Bosh buxgalter",
      isActive: ent.is_active,
      directorName: "",
      bankAccount: "",
      bankName: "",
    }));
  } catch (err) {
    console.error("fetchBusinessEntities exception:", err);
    return [];
  }
}

export async function createBusinessEntity(entity: {
  workspaceId?: string;
  legalName: string;
  tradeName?: string;
  tinStir: string;
  companyType: string;
  taxRegime: string;
  accountantName?: string;
}) {
  const workspaceId = await resolveActiveWorkspaceId(entity.workspaceId);
  if (!workspaceId) {
    throw new Error("Faol ishchi maydon (Workspace) topilmadi. Avval tizimga kiring.");
  }

  const { data, error } = await supabase
    .from("business_entities")
    .insert({
      workspace_id: workspaceId,
      legal_name: entity.legalName,
      trade_name: entity.tradeName || null,
      tin_stir: entity.tinStir,
      company_type: entity.companyType,
      tax_regime: entity.taxRegime,
      accountant_name: entity.accountantName || "Bosh buxgalter",
      currency: "UZS",
      is_active: true,
    })
    .select(
      "id, workspace_id, legal_name, trade_name, tin_stir, company_type, tax_regime, currency, accountant_name, is_active"
    )
    .single();

  if (error) throw error;
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    name: data.legal_name,
    tradeName: data.trade_name || undefined,
    tinStir: data.tin_stir,
    companyType: data.company_type,
    taxRegime: data.tax_regime,
    currency: data.currency,
    accountantName: data.accountant_name,
    isActive: data.is_active,
    directorName: "Masʼul rahbar",
    bankAccount: "20208000700543210001",
    bankName: "ATB Kapitalbank",
  };
}
