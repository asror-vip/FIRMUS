"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/mock/store";
import { createWorkspaceRecord, createBusinessEntity } from "@/lib/services/supabase-service";
import { businessEntitySchema, getFirstZodError } from "@/lib/validations/accounting";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const [accountType, setAccountType] = useState<"accounting_firm" | "individual_company">("accounting_firm");
  const [workspaceName, setWorkspaceName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [stir, setStir] = useState("");
  const [taxRegime, setTaxRegime] = useState("vat_profit_tax");

  const nextStep = () => {
    if (step === 2 && workspaceName.trim().length < 3) {
      toast.error("Ishchi maydon (Workspace) nomini kamida 3 ta belgi bilan kiriting");
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
        toast.error(getFirstZodError(parsed.error));
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleCompleteOnboarding = async () => {
    if (!user?.id) {
      toast.error("Saqlash uchun avval tizimga kiring.");
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
        accountantName: "Bosh buxgalter",
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("firmus_workspace", ws.id);
        localStorage.setItem("firmus_entity", ent.id);
      }

      await refreshContext();
      toast.success("Ishchi maydon, korxona va 21-BHMS schyotlar rejasi yaratildi!");
      router.push("/");
    } catch (err: any) {
      toast.error("Sozlashni saqlashda xatolik: " + (err.message || "Nomaʼlum xatolik"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden shadow-sm mb-2 border border-border">
            <img
              src="/brand/firmus-f.jpg"
              alt="FIRMUS Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            FIRMUS ga xush kelibsiz!
          </h1>
          <p className="text-xs text-muted-foreground">
            {step}-bosqich / 4: Korxonani 1 daqiqada sozlash
          </p>
        </div>

        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <Card className="shadow-lg border-border">
          {step === 1 && (
            <div>
              <CardHeader>
                <CardTitle className="text-base font-bold">1. Faoliyat turini tanlang</CardTitle>
                <CardDescription className="text-xs">
                  Siz bitta kompaniyani boshqarasizmi yoki buxgalteriya firmasimisiz?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div
                  onClick={() => setAccountType("accounting_firm")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    accountType === "accounting_firm"
                      ? "border-primary bg-indigo-500/5 ring-1 ring-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 font-bold">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Buxgalteriya Firmasi (BPO)</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Bir nechta mijoz korxonalarini bitta oynadan yuritish.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setAccountType("individual_company")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    accountType === "individual_company"
                      ? "border-primary bg-indigo-500/5 ring-1 ring-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 font-bold">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Yagona Korxona (Kompaniya)</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        Oʻz korxonangizning bank koʻchirmalari va 21-BHMS hisobini yuritish.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          )}

          {step === 2 && (
            <div>
              <CardHeader>
                <CardTitle className="text-base font-bold">2. Ishchi maydon yaratish</CardTitle>
                <CardDescription className="text-xs">
                  Korxonalaringiz jamlanadigan ishchi maydon nomi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0 text-xs">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Ishchi maydon (Workspace) nomi:
                  </label>
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Masalan: Toshkent Buxgalteriya Xizmatlari"
                    className="text-xs h-9"
                  />
                </div>
              </CardContent>
            </div>
          )}

          {step === 3 && (
            <div>
              <CardHeader>
                <CardTitle className="text-base font-bold">3. Korxonani qoʻshish</CardTitle>
                <CardDescription className="text-xs">
                  Soliq toʻlovchi identifikatsion raqami (STIR) va soliq rejimi.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div>
                  <label className="font-semibold text-foreground block mb-1">STIR (9 ta raqam) *:</label>
                  <Input
                    value={stir}
                    maxLength={9}
                    onChange={(e) => setStir(e.target.value)}
                    placeholder="309118742"
                    className="font-mono text-xs h-9"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Yuridik nomi:</label>
                  <Input
                    value={entityName}
                    onChange={(e) => setEntityName(e.target.value)}
                    placeholder="MCHJ Yangi Davr Savdo"
                    className="text-xs h-9"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">Soliq rejimi:</label>
                  <select
                    value={taxRegime}
                    onChange={(e) => setTaxRegime(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground"
                  >
                    <option value="vat_profit_tax">Umumbelgilangan (QQS 12% + Foyda soligʻi)</option>
                    <option value="turnover_tax">Aylanmadan olinadigan soliq (4%)</option>
                    <option value="fixed_tax">Qatʼiy belgilangan soliq (YaTT)</option>
                  </select>
                </div>
              </CardContent>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-6 px-4 space-y-4">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Barchasi tayyor!</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 leading-relaxed">
                  FIRMUS AI buxgalteriya tizimi «{workspaceName}» maydoni va «{entityName}» korxonasi uchun ishga tushirishga tayyor.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-6"
                  disabled={isSaving}
                  onClick={handleCompleteOnboarding}
                >
                  {isSaving ? "Saqlanmoqda..." : "Saqlash va Dashboardga oʻtish"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step < 4 && (
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20 rounded-b-xl">
              {step > 1 ? (
                <Button variant="outline" size="sm" onClick={prevStep} className="text-xs h-8">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Orqaga
                </Button>
              ) : (
                <div />
              )}

              <Button
                size="sm"
                onClick={nextStep}
                className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Keyingisi <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
