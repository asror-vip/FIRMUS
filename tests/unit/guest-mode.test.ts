import { describe, it, expect } from "vitest";
import {
  analyticsEventSchema,
  isPublicGuestRoute,
} from "@/lib/analytics/track-event";
import { reconcileBankAnd1C } from "@/lib/services/reconcile-engine";
import type { ParsedBankTransaction } from "@/lib/services/bank-import";

describe("Guest Mode Routing, Privacy-First Analytics, and Local Reconciliation", () => {
  it("opens only guest public routes and keeps AI/private endpoints protected", () => {
    expect(isPublicGuestRoute("/welcome")).toBe(true);
    expect(isPublicGuestRoute("/calculators")).toBe(true);
    expect(isPublicGuestRoute("/try")).toBe(true);
    expect(isPublicGuestRoute("/api/events")).toBe(true);

    expect(isPublicGuestRoute("/reconcile")).toBe(false);
    expect(isPublicGuestRoute("/assistant")).toBe(false);
    expect(isPublicGuestRoute("/settings")).toBe(false);
    expect(isPublicGuestRoute("/api/ai-copilot")).toBe(false);
    expect(isPublicGuestRoute("/api/ai-reconcile")).toBe(false);
    expect(isPublicGuestRoute("/api/ai-document-scan")).toBe(false);
  });

  it("validates allowed non-PII funnel events and rejects personal data fields", () => {
    expect(
      analyticsEventSchema.safeParse({
        eventName: "page_view",
        pagePath: "/calculators",
        locale: "uz",
      }).success
    ).toBe(true);

    expect(
      analyticsEventSchema.safeParse({
        eventName: "tool_used",
        pagePath: "/try",
        toolName: "guest_reconcile_file",
        locale: "ru",
      }).success
    ).toBe(true);

    expect(
      analyticsEventSchema.safeParse({
        eventName: "register_clicked",
        pagePath: "/try",
        toolName: "gate_modal_export",
      }).success
    ).toBe(true);

    expect(
      analyticsEventSchema.safeParse({
        eventName: "registered",
        pagePath: "/register",
        toolName: "email_signup",
      }).success
    ).toBe(true);

    // Must reject extra PII fields
    expect(
      analyticsEventSchema.safeParse({
        eventName: "page_view",
        pagePath: "/try",
        email: "user@example.com",
      }).success
    ).toBe(false);

    // Must reject query strings or emails inside pagePath
    expect(
      analyticsEventSchema.safeParse({
        eventName: "page_view",
        pagePath: "/try?email=test@example.com",
      }).success
    ).toBe(false);

    // Must reject unknown event names
    expect(
      analyticsEventSchema.safeParse({
        eventName: "file_uploaded_raw",
        pagePath: "/try",
      }).success
    ).toBe(false);
  });

  it("reconciles Bank and 1C statements 100% locally in memory without network calls", () => {
    const bank: ParsedBankTransaction[] = [
      {
        date: "2026-11-05",
        counterparty: "BARAKA SAVDO MCHJ",
        counterpartyStir: "305112233",
        amount: 22_400_000,
        type: "income",
        description: "Shartnoma tolov QQS 12%",
        accountCode: "4010",
        accountName: "Xaridorlar",
      },
      {
        date: "2026-11-08",
        counterparty: "LOGISTIKA MCHJ",
        counterpartyStir: "301998877",
        amount: 4_500_000,
        type: "expense",
        description: "Xizmat tolov",
        accountCode: "6010",
        accountName: "Yetkazib beruvchilar",
      },
      {
        date: "2026-11-12",
        counterparty: "KAPITALBANK",
        amount: 300_000,
        type: "expense",
        description: "RKO komissiya",
        accountCode: "9420",
        accountName: "Mamuriy xarajatlar",
      },
    ];

    const oneC: ParsedBankTransaction[] = [
      {
        date: "2026-11-05",
        counterparty: "BARAKA SAVDO MCHJ",
        counterpartyStir: "305112233",
        amount: 22_400_000,
        type: "income",
        description: "Tushum",
        accountCode: "4010",
        accountName: "Xaridorlar",
      },
      {
        date: "2026-11-08",
        counterparty: "LOGISTIKA MCHJ",
        counterpartyStir: "301998877",
        amount: 4_200_000,
        type: "expense",
        description: "Xizmat tolov",
        accountCode: "6010",
        accountName: "Yetkazib beruvchilar",
      },
      {
        date: "2026-11-14",
        counterparty: "NUR ELEKTRO MCHJ",
        amount: 1_500_000,
        type: "expense",
        description: "Faqat 1C da bor",
        accountCode: "6010",
        accountName: "Yetkazib beruvchilar",
      },
    ];

    const { rows, summary } = reconcileBankAnd1C(bank, oneC);
    expect(summary.matchedCount).toBe(1);
    expect(summary.mismatchCount).toBe(1);
    expect(summary.bankOnlyCount).toBe(1);
    expect(summary.oneCOnlyCount).toBe(1);
    expect(rows).toHaveLength(4);
  });
});
