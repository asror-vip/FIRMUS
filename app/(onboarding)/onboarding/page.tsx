"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/context/app-state";
import { FEATURES } from "@/lib/config/features";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getAuthLegalDict } from "@/lib/i18n/domains/auth-legal";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { createWorkspaceRecord, createBusinessEntity } from "@/lib/services/supabase-service";
import { businessEntitySchema } from "@/lib/validations/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshContext } = useAppState();
  const { locale } = useTranslation();
  const d = getAuthLegalDict(locale).onboarding;

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const [accountType, setAccountType] = useState<"accounting_firm" | "individual_company">("accounting_firm");
  const [workspaceName, setWorkspaceName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [stir, setStir] = useState("");
  const [taxRegime, setTaxRegime] = useState("vat_profit_tax");

  useEffect(() => {
    if (!FEATURES.multiCompanyMode) {
      router.replace("/");
    }
  }, [router]);

  if (!FEATURES.multiCompanyMode) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center p-4 text-xs text-muted-foreground">
        <div className="absolute top-4 right-4">
          <LanguageToggle />
        </div>
        {d.loadingRedirect}
      </div>
    );
  }

  const nextStep = () => {
    if (step === 2 && workspaceName.trim().length < 3) {
      toast.error(d.workspaceMinToast);
      return;
    }
    if (step === 3) {
      const parsed = businessEntitySchema.safeParse({
        legalName: entityName,
        tinStir: stir,
        companyType: "MChJ",
        taxRegime,
      });
      if (!parsed.success) {
        const issueField = parsed.error.issues[0]?.path[0];
        if (issueField === "legalName") {
          toast.error(d.entityNameMinToast);
        } else if (issueField === "tinStir") {
          toast.error(d.tinFormatToast);
        } else {
          toast.error(d.validationFallbackToast);
        }
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleCompleteOnboarding = async () => {
    if (!user?.id) {
      toast.error(d.loginRequiredToast);
      router.push("/login");
      return;
    }

    setIsSaving(true);
    try {
      const ws = await createWorkspaceRecord(workspaceName.trim(), accountType);
      const ent = await createBusinessEntity({
        workspaceId: ws.id,
        legalName: entityName.trim(),
        tinStir: stir.trim(),
        companyType: "MChJ",
        taxRegime,
        accountantName: d.defaultAccountantName,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("firmus_workspace", ws.id);
        localStorage.setItem("firmus_entity", ent.id);
      }

      await refreshContext();
      toast.success(d.saveSuccessToast);
      router.push("/");
    } catch (err: any) {
      toast.error(d.saveErrorPrefix + (err.message || d.unknownError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-1.5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shadow-sm mb-1 border border-border">
            <img
              src="/brand/firmus-f.jpg"
              alt="FIRMUS Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-600">
              {d.badge}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {d.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {d.subtitle.replace("{step}", String(step))}
          </p>
        </div>

        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-600 rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.18)] overflow-hidden">
          {step === 1 && (
            <div>
              <div className="p-6 pb-2">
                <div className="text-base font-bold text-foreground">{d.workspaceTypeLabel}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {d.step1Desc}
                </p>
              </div>
              <div className="p-6 pt-0 space-y-3 text-xs">
                <div
                  onClick={() => setAccountType("accounting_firm")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    accountType === "accounting_firm"
                      ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/50 shadow-sm"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 font-bold">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{d.types.accounting_firm.title}</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {d.types.accounting_firm.desc}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setAccountType("individual_company")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    accountType === "individual_company"
                      ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/50 shadow-sm"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 font-bold">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{d.types.individual_company.title}</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {d.types.individual_company.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="p-6 pb-2">
                <div className="text-base font-bold text-foreground">{d.step2Title}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {d.step2Desc}
                </p>
              </div>
              <div className="p-6 pt-0 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    {d.workspaceNameLabel}
                  </label>
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder={d.workspaceNamePlaceholder}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="p-6 pb-2">
                <div className="text-base font-bold text-foreground">{d.step3Title}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {d.step3Desc}
                </p>
              </div>
              <div className="p-6 pt-0 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-foreground block mb-1">{d.tinLabel}</label>
                  <Input
                    value={stir}
                    maxLength={9}
                    onChange={(e) => setStir(e.target.value)}
                    placeholder={d.tinPlaceholder}
                    className="font-mono text-xs h-9"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">{d.entityNameLabel}</label>
                  <Input
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder={d.entityNamePlaceholder}
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">{d.taxRegimeLabel}</label>
                  <select
                    value={taxRegime}
                    onChange={(e) => setTaxRegime(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground"
                  >
                    <option value="vat_profit_tax">{d.taxRegimes.vat_profit_tax}</option>
                    <option value="turnover_tax">{d.taxRegimes.turnover_tax}</option>
                    <option value="fixed_tax">{d.taxRegimes.fixed_tax}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-6 px-4 space-y-4">
              <div className="h-14 w-14 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{d.step4Title}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                  {d.step4Desc
                    .replace("{workspaceName}", workspaceName)
                    .replace("{entityName}", entityName)}
                </p>
              </div>

              <div className="pt-2">
                <Button
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-9 px-6 shadow-sm transition-all"
                  disabled={isSaving}
                  onClick={handleCompleteOnboarding}
                >
                  {isSaving ? d.savingBtn : d.submitBtn} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step < 4 && (
            <div className="flex items-center justify-between p-4 border-t border-border/50 bg-muted/20">
              {step > 1 ? (
                <Button variant="outline" size="sm" onClick={prevStep} className="text-xs h-8">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  {d.backBtn}
                </Button>
              ) : (
                <div />
              )}

              <Button
                size="sm"
                onClick={nextStep}
                className="text-xs h-8 bg-violet-600 hover:bg-violet-500 text-white shadow-sm transition-all"
              >
                {d.nextBtn} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
