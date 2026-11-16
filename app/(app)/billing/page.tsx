"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppState } from "@/lib/context/app-state";
import { FEATURES } from "@/lib/config/features";
import {
  AI_MODELS,
  PLANS_LIST,
  type AiModelId,
  type PlanSpec,
} from "@/lib/config/plans";
import { fetchWorkspaceUsageSummary } from "@/lib/services/supabase-service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Check,
  Coins,
  FileStack,
  HardDrive,
  ShieldCheck,
  Sparkles,
  Loader2,
  Zap,
  Lock,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatUzs(amount: number): string {
  return `${new Intl.NumberFormat("uz-UZ").format(amount)} soʻm`;
}

function UsageProgressBar({ used, max }: { used: number; max: number | null }) {
  const pct = max && max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 8;
  const isNearLimit = Boolean(max && used >= max);

  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-2">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          isNearLimit ? "bg-amber-500" : "bg-indigo-600"
        )}
        style={{ width: `${Math.max(4, pct)}%` }}
      />
    </div>
  );
}

function daysRemaining(isoDate: string | null): number {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function BillingPage() {
  const {
    currentWorkspace,
    currentEntity,
    subscription,
    setSubscriptionSnapshot,
    refreshSubscription,
    setPreferredAiModel,
  } = useAppState();

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);
  const [isSwitchingModel, setIsSwitchingModel] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlanForInfo, setSelectedPlanForInfo] = useState<PlanSpec | null>(null);
  const [usage, setUsage] = useState({ monthlyBatches: 0, aiThreadsCount: 0 });
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  const loadStats = useCallback(async () => {
    setIsLoadingUsage(true);
    try {
      const [res] = await Promise.all([
        fetchWorkspaceUsageSummary({
          workspaceId: currentWorkspace?.id,
          entityId: currentEntity?.id,
        }),
        refreshSubscription(),
      ]);
      setUsage(res);
    } finally {
      setIsLoadingUsage(false);
    }
  }, [currentWorkspace?.id, currentEntity?.id, refreshSubscription]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleActivateTrial = async () => {
    setIsActivatingTrial(true);
    try {
      const res = await fetch("/api/subscription/trial", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Sinovni yoqib boʻlmadi");
      }
      if (data?.subscription) {
        setSubscriptionSnapshot(data.subscription);
      } else {
        await refreshSubscription();
      }
      toast.success(data?.message || "7 kunlik bepul Pro sinov yoqildi!");
    } catch (err: any) {
      toast.error(err?.message || "Sinov muddatini yoqib boʻlmadi");
    } finally {
      setIsActivatingTrial(false);
    }
  };

  const handleModelSwitch = async (modelId: AiModelId) => {
    if (!subscription.limits.allowedModels.includes(modelId)) {
      toast.info("Gemini 4 Hydrogen modeli Pro va Pro+ tariflarida mavjud.");
      return;
    }
    if (subscription.preferredModel === modelId) return;
    setIsSwitchingModel(true);
    try {
      await setPreferredAiModel(modelId);
      toast.success(`Standart AI modeli: ${AI_MODELS[modelId].label}`);
    } catch (err: any) {
      toast.error(err?.message || "Modelni almashtirib boʻlmadi");
    } finally {
      setIsSwitchingModel(false);
    }
  };

  const getDisplayPrice = (plan: PlanSpec) => {
    if (plan.monthlyPriceUzs === 0) return "0 soʻm";
    const price =
      billingCycle === "annual" ? plan.annualMonthlyPriceUzs : plan.monthlyPriceUzs;
    return formatUzs(price);
  };

  const trialDaysLeft = daysRemaining(subscription.trialEndsAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Obuna va Tariflar
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI kredit balansi, model tanlash va oylik tizim limitlari
          </p>
        </div>

        {/* Monthly / Annual Toggle */}
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 text-xs self-start">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "rounded-md px-3 py-1 font-medium transition-colors",
              billingCycle === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Oylik
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={cn(
              "rounded-md px-3 py-1 font-medium transition-colors flex items-center gap-1.5",
              billingCycle === "annual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Yillik</span>
            <Badge variant="success" className="text-[9px] px-1.5 py-0 h-4">
              -20%
            </Badge>
          </button>
        </div>
      </div>

      {/* Active Subscription & Live Usage Card */}
      <Card>
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-semibold">
                {FEATURES.multiCompanyMode ? currentWorkspace?.name || "Ishchi maydon" : "Shaxsiy hisob"}
              </CardTitle>
              <Badge variant="indigo" className="text-[10px]">
                {subscription.planName}
              </Badge>
              {subscription.isTrialActive ? (
                <Badge variant="warning" className="text-[10px] gap-1">
                  <Clock className="h-3 w-3" />
                  Sinov: {trialDaysLeft} kun qoldi
                </Badge>
              ) : (
                <Badge variant="success" className="text-[10px]">
                  Faol
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Asosiy AI modeli: <strong>{AI_MODELS[subscription.preferredModel].label}</strong>{" "}
              ({AI_MODELS[subscription.preferredModel].creditCost} kredit / soʻrov)
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Inline Model Selector */}
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-[11px]">
              {(["gemini-3.8-flash", "gemini-4-hydrogen"] as AiModelId[]).map((mId) => {
                const meta = AI_MODELS[mId];
                const isSelected = subscription.preferredModel === mId;
                const isLocked = !subscription.limits.allowedModels.includes(mId);
                return (
                  <button
                    key={mId}
                    type="button"
                    disabled={isSwitchingModel}
                    onClick={() => handleModelSwitch(mId)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors",
                      isSelected
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                    <span>{meta.shortLabel}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {meta.creditCost}kr
                    </span>
                  </button>
                );
              })}
            </div>

            {subscription.trialAvailable && (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isActivatingTrial}
                onClick={handleActivateTrial}
              >
                {isActivatingTrial ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                7 kun Pro sinov
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Oylik AI kreditlar</span>
                <Coins className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="mt-1.5 font-mono font-bold text-sm text-foreground">
                {subscription.monthlyUsed} / {subscription.monthlyLimit}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Qoldiq: {subscription.remainingCredits} kredit
              </p>
              <UsageProgressBar
                used={subscription.monthlyUsed}
                max={subscription.monthlyLimit}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Bugungi sarf</span>
                <Zap className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div className="mt-1.5 font-mono font-bold text-sm text-foreground">
                {subscription.dailyUsed} / {subscription.dailyLimit}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Kunlik xavfsiz chegara (UTC+5)
              </p>
              <UsageProgressBar
                used={subscription.dailyUsed}
                max={subscription.dailyLimit}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Saqlangan ishlar</span>
                <FileStack className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="mt-1.5 font-mono font-bold text-sm text-foreground">
                {isLoadingUsage ? "…" : usage.monthlyBatches} / {subscription.limits.maxSavedBatches}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Chatlar limiti: {usage.aiThreadsCount} / {subscription.limits.maxChatThreads}
              </p>
              <UsageProgressBar
                used={usage.monthlyBatches}
                max={subscription.limits.maxSavedBatches}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Yuklash limitlari</span>
                <HardDrive className="h-3.5 w-3.5" />
              </div>
              <div className="mt-1.5 text-xs font-medium text-foreground space-y-0.5">
                <div>
                  Rasm: {subscription.limits.imageMaxDimensionPx}px /{" "}
                  {(subscription.limits.imageMaxBytes / (1024 * 1024)).toFixed(1)} MB
                </div>
                <div>
                  PDF:{" "}
                  {subscription.limits.pdfAllowed
                    ? `${Math.round(subscription.limits.pdfMaxBytes / (1024 * 1024))} MB`
                    : "Yopiq (Pro da ochiq)"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Bank ↔ 1C: max {subscription.limits.reconcileMaxRows.toLocaleString("uz-UZ")} qator
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 Plan Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {PLANS_LIST.map((plan) => {
          const isCurrent = plan.id === subscription.planId;
          const featuresList = FEATURES.multiCompanyMode ? plan.b2bFeatures : plan.soloFeatures;
          const showTrialBtn = plan.id === "professional" && subscription.trialAvailable;

          return (
            <Card
              key={plan.id}
              className={cn(
                "flex flex-col justify-between transition-all",
                isCurrent
                  ? "border-indigo-600 ring-1 ring-indigo-600 shadow-sm"
                  : "hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-bold text-foreground">
                      {plan.name}
                    </CardTitle>
                    {isCurrent ? (
                      <Badge variant="success" className="text-[10px]">
                        {subscription.isTrialActive ? "Joriy (Sinov)" : "Joriy tarif"}
                      </Badge>
                    ) : plan.badge ? (
                      <Badge variant="indigo" className="text-[10px] gap-1">
                        <Sparkles className="h-3 w-3" />
                        {plan.badge}
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription className="text-xs min-h-[32px]">
                    {plan.subtitle}
                  </CardDescription>

                  <div className="pt-2">
                    <span className="text-2xl font-bold tracking-tight font-mono text-foreground">
                      {getDisplayPrice(plan)}
                    </span>
                    {plan.monthlyPriceUzs > 0 && (
                      <span className="text-xs text-muted-foreground ml-1.5">
                        / oyiga
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-2 text-xs">
                    {featuresList.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-foreground/90">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>

              <div className="p-6 pt-2 space-y-2">
                {showTrialBtn && (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={isActivatingTrial}
                    onClick={handleActivateTrial}
                  >
                    {isActivatingTrial ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    7 kun bepul sinab koʻrish
                  </Button>
                )}

                <Button
                  type="button"
                  variant={isCurrent || showTrialBtn ? "outline" : "default"}
                  className="w-full h-9 text-xs gap-1.5"
                  onClick={() => {
                    setSelectedPlanForInfo(plan);
                    setIsPaymentModalOpen(true);
                  }}
                >
                  {isCurrent ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5" />
                  )}
                  {isCurrent
                    ? "Tarif va toʻlov maʼlumotlari"
                    : plan.monthlyPriceUzs === 0
                    ? "Asosiy bepul tarif"
                    : "Ulanish / Toʻlov tartibi"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Honest Payment & Activation Info Modal (Zero fake card inputs) */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {selectedPlanForInfo ? `${selectedPlanForInfo.name} — Toʻlov tartibi` : "Toʻlov tartibi"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedPlanForInfo && selectedPlanForInfo.monthlyPriceUzs > 0
                ? `Tanlangan narx: ${getDisplayPrice(selectedPlanForInfo)} / oy (${
                    billingCycle === "annual" ? "yillik -20%" : "oylik"
                  })`
                : "Bepul boshlangʻich tarif"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-1.5">
              <div className="font-semibold text-foreground">
                1. Click / Payme (tayyorlanmoqda)
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Avtomatik karta toʻlov shlyuzi hozir ulanish bosqichida. Toʻlov tasdiqlangach obuna serverda avtomatik faollashadi.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-1.5">
              <div className="font-semibold text-foreground">
                2. Bank oʻtkazmasi (Hisob-faktura / Didox E-SF)
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Yuridik shaxslar va YaTT lar uchun hisob raqamdan koʻchirish hamda E-SF asosida tarif faollashtirish qoʻllab-quvvatlanadi.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
              Tushunarli
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
