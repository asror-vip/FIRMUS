import { describe, it, expect } from "vitest";
import {
  journalProposalPayloadSchema,
  agentExecuteRequestSchema,
  contractPayloadSchema,
  employeePayloadSchema,
  reverseEntryPayloadSchema,
} from "../../lib/ai/agent-types";

describe("FIRMUS AI Agent Strict Zod Guardrails", () => {
  it("accepts a balanced 3-line 12% VAT journal entry proposal", () => {
    const res = journalProposalPayloadSchema.safeParse({
      entry_date: "2026-11-16",
      description: "E-SF xizmat sotish QQS bilan",
      lines: [
        { account_code: "4010", account_name: "Xaridorlar", debit_amount: 1120000, credit_amount: 0 },
        { account_code: "9030", account_name: "Xizmat tushumi", debit_amount: 0, credit_amount: 1000000 },
        { account_code: "6410", account_name: "Budjetga QQS", debit_amount: 0, credit_amount: 120000 },
      ],
    });
    expect(res.success).toBe(true);
  });

  it("rejects unbalanced debit/credit journal entry proposals", () => {
    const res = journalProposalPayloadSchema.safeParse({
      entry_date: "2026-11-16",
      description: "Balanssiz xato provodka",
      lines: [
        { account_code: "5110", account_name: "Hisob-kitob", debit_amount: 500000, credit_amount: 0 },
        { account_code: "4010", account_name: "Xaridorlar", debit_amount: 0, credit_amount: 450000 },
      ],
    });
    expect(res.success).toBe(false);
  });

  it("rejects single line having both debit and credit > 0", () => {
    const res = journalProposalPayloadSchema.safeParse({
      entry_date: "2026-11-16",
      description: "Ikki tomonli qator xatosi",
      lines: [
        { account_code: "5110", account_name: "Hisob-kitob", debit_amount: 100000, credit_amount: 100000 },
        { account_code: "4010", account_name: "Xaridorlar", debit_amount: 0, credit_amount: 0 },
      ],
    });
    expect(res.success).toBe(false);
  });

  it("validates STIR (9 digits) and PINFL (14 digits) strictly", () => {
    expect(
      contractPayloadSchema.safeParse({
        number: "SH-01",
        type: "Xizmat ko'rsatish",
        counterparty: "Test MCHJ",
        counterparty_stir: "12345", // Invalid
        amount: 1000000,
        start_date: "2026-11-01",
        end_date: "2026-12-31",
      }).success
    ).toBe(false);

    expect(
      employeePayloadSchema.safeParse({
        full_name: "Ali Valiyev",
        position: "Buxgalter",
        department: "Moliya",
        salary: 5000000,
        pinfl: "1234", // Invalid
        hire_date: "2026-11-01",
      }).success
    ).toBe(false);

    expect(
      reverseEntryPayloadSchema.safeParse({
        entry_id: "11111111-1111-1111-1111-111111111111",
        reason: "ok", // Too short (< 3)
      }).success
    ).toBe(false);
  });

  it("validates full agentExecuteRequestSchema discriminated union", () => {
    const parsed = agentExecuteRequestSchema.safeParse({
      entityId: "11111111-1111-1111-1111-111111111111",
      decision: "approve",
      modelUsed: "gemini-2.5-flash",
      proposal: {
        type: "close_period",
        title: "Davr yopish",
        payload: {
          from_date: "2026-11-01",
          to_date: "2026-11-30",
          closing_date: "2026-11-30",
        },
      },
    });
    expect(parsed.success).toBe(true);
  });
});
