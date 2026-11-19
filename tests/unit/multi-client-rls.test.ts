import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@/lib/supabase/client", () => ({
  supabase: {},
}));

import {
  canAddClientForPlan,
  getClientLimitForPlan,
  getQuarterFromMonth,
  filterBatchesByPeriod,
  groupBatchesByPeriod,
  filterRecordsForEntity,
} from "@/lib/services/multi-client-service";

describe("Multi-Client Accountant Mode: Limits, Period Grouping & Isolation", () => {
  it("enforces client limits matching plans.ts (Starter 1, Pro 5, Pro+ unlimited)", () => {
    expect(getClientLimitForPlan("starter")).toBe(1);
    expect(getClientLimitForPlan("professional")).toBe(5);
    expect(getClientLimitForPlan("pro_plus")).toBeNull();

    expect(canAddClientForPlan("starter", 0).allowed).toBe(true);
    expect(canAddClientForPlan("starter", 1).allowed).toBe(false);
    expect(canAddClientForPlan("starter", 1).remaining).toBe(0);

    expect(canAddClientForPlan("professional", 4).allowed).toBe(true);
    expect(canAddClientForPlan("professional", 4).remaining).toBe(1);
    expect(canAddClientForPlan("professional", 5).allowed).toBe(false);

    expect(canAddClientForPlan("pro_plus", 50).allowed).toBe(true);
    expect(canAddClientForPlan("pro_plus", 50).limit).toBeNull();
  });

  it("groups and filters client work batches by month and quarter accurately", () => {
    expect(getQuarterFromMonth("2026-01")).toBe("2026-Q1");
    expect(getQuarterFromMonth("2026-04")).toBe("2026-Q2");
    expect(getQuarterFromMonth("2026-09")).toBe("2026-Q3");
    expect(getQuarterFromMonth("2026-11")).toBe("2026-Q4");

    const batches = [
      { id: "1", businessEntityId: "ent-a", periodMonth: "2026-10" },
      { id: "2", businessEntityId: "ent-a", periodMonth: "2026-11" },
      { id: "3", businessEntityId: "ent-a", periodMonth: "2026-08" },
    ];

    const q4 = filterBatchesByPeriod(batches, "quarter", "2026-Q4");
    expect(q4.map((b) => b.id)).toEqual(["1", "2"]);

    const grouped = groupBatchesByPeriod(batches, "quarter");
    expect(grouped.map((g) => g.period)).toEqual(["2026-Q4", "2026-Q3"]);
    expect(grouped[0].items).toHaveLength(2);
    expect(grouped[1].items).toHaveLength(1);
  });

  it("isolates Client A records from Client B strictly by entity ID", () => {
    const allRecords = [
      { id: "rec-1", businessEntityId: "client-A", title: "Client A bank statement" },
      { id: "rec-2", businessEntityId: "client-B", title: "Client B bank statement" },
      { id: "rec-3", businessEntityId: "client-A", title: "Client A Didox invoice" },
    ];

    const clientAView = filterRecordsForEntity(allRecords, "client-A");
    const clientBView = filterRecordsForEntity(allRecords, "client-B");
    const emptyView = filterRecordsForEntity(allRecords, null);

    expect(clientAView.map((r) => r.id)).toEqual(["rec-1", "rec-3"]);
    expect(clientAView.some((r) => r.businessEntityId === "client-B")).toBe(false);
    expect(clientBView.map((r) => r.id)).toEqual(["rec-2"]);
    expect(clientBView.some((r) => r.businessEntityId === "client-A")).toBe(false);
    expect(emptyView).toEqual([]);
  });

  it("verifies Stage 3 SQL migration enables RLS on client tables and enforces plan limits", () => {
    const migPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "20261119010000_multi_client_profiles_and_limits.sql"
    );
    const sql = fs.readFileSync(migPath, "utf8");
    expect(sql).toContain("ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE public.business_entities ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE public.work_batches ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("trg_enforce_workspace_entity_limit");
    expect(sql).toContain("v_limit := 5");
    expect(sql).toContain("v_limit := 1");
  });
});
