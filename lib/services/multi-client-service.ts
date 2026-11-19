import { supabase } from "@/lib/supabase/client";
import { PLANS_CONFIG, normalizePlanId, type PlanId } from "@/lib/config/plans";
import type { ClientBankAccount } from "@/lib/types/accounting";
import { ONEC_VERSION_PROFILES } from "@/lib/services/onec-profiles";

export type PeriodGroupingMode = "month" | "quarter";

export const ACTIVITY_TYPE_OPTIONS = [
  "Savdo va xizmatlar",
  "Chakana savdo",
  "Ulgurji savdo",
  "Xizmat koʻrsatish",
  "Ishlab chiqarish",
  "Umumiy ovqatlanish",
  "IT va elektron tijorat",
  "Qurilish va logistika",
] as const;

export const ONEC_PROFILE_PLACEHOLDERS = ONEC_VERSION_PROFILES.map((p) => ({
  id: p.id,
  label: p.label,
}));

export interface ClientBatchSummaryItem {
  id: string;
  businessEntityId: string;
  batchType: string;
  periodMonth: string;
  status: string;
  rowCount: number;
  totalIncome: number;
  totalExpense: number;
  createdAt: string;
}

export function getClientLimitForPlan(planId?: string | null): number | null {
  const normalized: PlanId = normalizePlanId(planId);
  return PLANS_CONFIG[normalized].limits.entitiesLimit;
}

export function canAddClientForPlan(planId: string | null | undefined, currentCount: number): {
  allowed: boolean;
  limit: number | null;
  remaining: number | null;
  planId: PlanId;
} {
  const normalized = normalizePlanId(planId);
  const limit = PLANS_CONFIG[normalized].limits.entitiesLimit;
  if (limit === null) {
    return { allowed: true, limit: null, remaining: null, planId: normalized };
  }
  const safeCount = Math.max(0, Math.trunc(currentCount));
  const remaining = Math.max(0, limit - safeCount);
  return {
    allowed: safeCount < limit,
    limit,
    remaining,
    planId: normalized,
  };
}

/**
 * Converts a YYYY-MM month string into YYYY-Q[1-4] quarter key.
 */
export function getQuarterFromMonth(periodMonth: string): string {
  const m = periodMonth.match(/^(\d{4})-(\d{2})$/);
  if (!m) return "Nomaʼlum";
  const year = m[1];
  const monthNum = Math.min(12, Math.max(1, Number(m[2])));
  const quarter = Math.ceil(monthNum / 3);
  return `${year}-Q${quarter}`;
}

export function getPeriodKey(periodMonth: string, mode: PeriodGroupingMode): string {
  return mode === "quarter" ? getQuarterFromMonth(periodMonth) : periodMonth;
}

export function filterBatchesByPeriod<T extends { periodMonth: string }>(
  batches: T[],
  mode: PeriodGroupingMode,
  selectedPeriod: string
): T[] {
  if (!selectedPeriod || selectedPeriod === "all") return batches;
  return batches.filter((b) => getPeriodKey(b.periodMonth, mode) === selectedPeriod);
}

export function groupBatchesByPeriod<T extends { periodMonth: string }>(
  batches: T[],
  mode: PeriodGroupingMode
): Array<{ period: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const item of batches) {
    const key = getPeriodKey(item.periodMonth, mode);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([period, items]) => ({ period, items }));
}

/**
 * Strict client isolation filter — ensures only records matching the active entityId are shown.
 */
export function filterRecordsForEntity<T extends { businessEntityId?: string; entityId?: string }>(
  records: T[],
  activeEntityId: string | null | undefined
): T[] {
  if (!activeEntityId) return [];
  return records.filter((r) => (r.businessEntityId ?? r.entityId) === activeEntityId);
}

export async function fetchClientBankAccounts(entityId: string): Promise<ClientBankAccount[]> {
  if (!entityId) return [];
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, business_entity_id, bank_name, account_number, mfo, currency, is_primary")
    .eq("business_entity_id", entityId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchClientBankAccounts error:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    businessEntityId: row.business_entity_id,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    mfo: row.mfo || undefined,
    currency: (row.currency || "UZS").trim(),
    isPrimary: Boolean(row.is_primary),
  }));
}

export async function addClientBankAccount(params: {
  businessEntityId: string;
  bankName: string;
  accountNumber: string;
  mfo?: string;
  currency?: string;
  isPrimary?: boolean;
}): Promise<ClientBankAccount> {
  const { data, error } = await supabase
    .from("bank_accounts")
    .insert({
      business_entity_id: params.businessEntityId,
      bank_name: params.bankName.trim(),
      account_number: params.accountNumber.replace(/\s+/g, ""),
      mfo: params.mfo?.trim() || "00000",
      currency: (params.currency || "UZS").trim().toUpperCase().slice(0, 3),
      is_primary: Boolean(params.isPrimary),
    })
    .select("id, business_entity_id, bank_name, account_number, mfo, currency, is_primary")
    .single();

  if (error) throw error;
  return {
    id: data.id,
    businessEntityId: data.business_entity_id,
    bankName: data.bank_name,
    accountNumber: data.account_number,
    mfo: data.mfo || undefined,
    currency: (data.currency || "UZS").trim(),
    isPrimary: Boolean(data.is_primary),
  };
}

export async function deleteClientBankAccount(accountId: string): Promise<void> {
  const { error } = await supabase.from("bank_accounts").delete().eq("id", accountId);
  if (error) throw error;
}

export async function fetchClientOverviewBatches(
  entityIds: string[]
): Promise<ClientBatchSummaryItem[]> {
  if (!entityIds || entityIds.length === 0) return [];
  const { data, error } = await supabase
    .from("work_batches")
    .select(
      "id, business_entity_id, batch_type, period_month, status, row_count, total_income, total_expense, created_at"
    )
    .in("business_entity_id", entityIds)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("fetchClientOverviewBatches error:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    businessEntityId: row.business_entity_id,
    batchType: row.batch_type,
    periodMonth: row.period_month,
    status: row.status,
    rowCount: Number(row.row_count || 0),
    totalIncome: Number(row.total_income || 0),
    totalExpense: Number(row.total_expense || 0),
    createdAt: row.created_at,
  }));
}
