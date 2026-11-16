import { describe, it, expect } from "vitest";
import {
  AI_MODELS,
  PLANS_CONFIG,
  getModelCreditCost,
  normalizeModelId,
  normalizePlanId,
} from "../../lib/config/plans";
import {
  canonicalizeEmail,
  isDisposableEmailDomain,
  maskEmail,
} from "../../lib/utils/email-guard";

describe("Subscription Plans, AI Models & Memory Limits", () => {
  it("defines exact UZS prices and credit quotas across Starter, Pro, and Pro+", () => {
    expect(PLANS_CONFIG.starter.monthlyPriceUzs).toBe(0);
    expect(PLANS_CONFIG.starter.annualTotalPriceUzs).toBe(0);
    expect(PLANS_CONFIG.starter.limits.monthlyCredits).toBe(25);
    expect(PLANS_CONFIG.starter.limits.dailyCredits).toBe(6);
    expect(PLANS_CONFIG.starter.limits.pdfAllowed).toBe(false);

    expect(PLANS_CONFIG.professional.monthlyPriceUzs).toBe(99_000);
    expect(PLANS_CONFIG.professional.annualMonthlyPriceUzs).toBe(79_000);
    expect(PLANS_CONFIG.professional.annualTotalPriceUzs).toBe(948_000);
    expect(PLANS_CONFIG.professional.trialDays).toBe(7);
    expect(PLANS_CONFIG.professional.limits.monthlyCredits).toBe(350);
    expect(PLANS_CONFIG.professional.limits.trialMonthlyCredits).toBe(40);
    expect(PLANS_CONFIG.professional.limits.pdfAllowed).toBe(true);

    expect(PLANS_CONFIG.pro_plus.monthlyPriceUzs).toBe(249_000);
    expect(PLANS_CONFIG.pro_plus.annualMonthlyPriceUzs).toBe(199_000);
    expect(PLANS_CONFIG.pro_plus.annualTotalPriceUzs).toBe(2_388_000);
    expect(PLANS_CONFIG.pro_plus.limits.monthlyCredits).toBe(1000);
    expect(PLANS_CONFIG.pro_plus.limits.maxSavedBatches).toBe(1000);
  });

  it("keeps only Gemini 3.8 Flash and Gemini 4 Hydrogen models with exact credit costs", () => {
    expect(Object.keys(AI_MODELS).sort()).toEqual([
      "gemini-3.8-flash",
      "gemini-4-hydrogen",
    ]);
    expect(getModelCreditCost("gemini-3.8-flash")).toBe(1);
    expect(getModelCreditCost("gemini-4-hydrogen")).toBe(2);

    expect(PLANS_CONFIG.starter.limits.allowedModels).toEqual(["gemini-3.8-flash"]);
    expect(PLANS_CONFIG.professional.limits.allowedModels).toEqual([
      "gemini-3.8-flash",
      "gemini-4-hydrogen",
    ]);
    expect(PLANS_CONFIG.pro_plus.limits.allowedModels).toEqual([
      "gemini-3.8-flash",
      "gemini-4-hydrogen",
    ]);
  });

  it("normalizes legacy enterprise plan and disallowed model strings safely", () => {
    expect(normalizePlanId("enterprise")).toBe("pro_plus");
    expect(normalizePlanId("professional")).toBe("professional");
    expect(normalizePlanId("unknown")).toBe("starter");

    expect(normalizeModelId("gemini-4-hydrogen")).toBe("gemini-4-hydrogen");
    expect(normalizeModelId("gemini-3.1-pro-preview")).toBe("gemini-3.8-flash");
    expect(normalizeModelId(null)).toBe("gemini-3.8-flash");
  });

  it("canonicalizes Gmail aliases/dots and detects disposable email domains including subdomains", () => {
    expect(canonicalizeEmail("A.Sad.Bek+trial1@gmail.com")).toBe("asadbek@gmail.com");
    expect(canonicalizeEmail("user+promo@googlemail.com")).toBe("user@gmail.com");
    expect(canonicalizeEmail("finance.dept+1@firm.uz")).toBe("finance.dept@firm.uz");

    expect(isDisposableEmailDomain("test@mailinator.com")).toBe(true);
    expect(isDisposableEmailDomain("abc@tempmail.com")).toBe(true);
    expect(isDisposableEmailDomain("test@sub.mailinator.com")).toBe(true);
    expect(isDisposableEmailDomain("test@deep.sub.temp-mail.org")).toBe(true);
    expect(isDisposableEmailDomain("real.user@gmail.com")).toBe(false);
    expect(isDisposableEmailDomain("accountant@korxona.uz")).toBe(false);
  });

  it("masks emails safely via email-guard helper", () => {
    expect(maskEmail("asror@gmail.com")).toBe("as***r@gmail.com");
    expect(maskEmail("ab@mail.uz")).toBe("a***@mail.uz");
    expect(maskEmail("")).toBe("—");
  });
});
