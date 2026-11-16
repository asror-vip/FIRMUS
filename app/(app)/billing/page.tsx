"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppState } from "@/lib/context/app-state";
import { FEATURES } from "@/lib/config/features";
import {
  AI_MODELS,
  PLANS_LIST,
  type PlanSpec,
} from "@/lib/config/plans";
import { fetchWorkspaceUsageSummary } from "@/lib/services/supabase-service";
import { getClientDeviceHash } from "@/lib/utils/device-fingerprint";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Check,
  FileStack,
  ShieldCheck,
  Sparkles,
  Loader2,
  Clock,
  Cpu,
  Activity,
  Building2,
  Printer,
  Copy,
  Receipt,
  QrCode,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    }
  } catch {}
  return false;
}

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
  } = useAppState();

  const annualDiscountUsed = Boolean((subscription as any).annualDiscountUsed);

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlanForInfo, setSelectedPlanForInfo] = useState<PlanSpec | null>(null);
  const [usage, setUsage] = useState({ monthlyBatches: 0, aiThreadsCount: 0 });
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  // Checkout modal states
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer_didox" | "payme" | "click">("payme");
  const [b2bTinStir, setB2bTinStir] = useState(currentEntity?.tinStir || "");
  const [b2bCompanyName, setB2bCompanyName] = useState(currentEntity?.name || "");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<any | null>(null);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  useEffect(() => {
    if (currentEntity?.tinStir && !b2bTinStir) {
      setB2bTinStir(currentEntity.tinStir);
    }
    if (currentEntity?.name && !b2bCompanyName) {
      setB2bCompanyName(currentEntity.name);
    }
  }, [currentEntity, b2bTinStir, b2bCompanyName]);

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
      const deviceHash = await getClientDeviceHash();
      const res = await fetch("/api/subscription/trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(deviceHash ? { "x-firmus-device": deviceHash } : {}),
        },
        body: JSON.stringify({ deviceHash }),
      });
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

  const getMainPriceLabel = (plan: PlanSpec): {
    amount: string;
    unit: string;
    originalAmount?: string;
    note?: string;
  } => {
    if (plan.monthlyPriceUzs === 0) {
      return { amount: "0 soʻm", unit: "" };
    }
    if (billingCycle === "annual") {
      const regularAnnual = plan.monthlyPriceUzs * 12;
      if (!annualDiscountUsed) {
        const savedPerYear = regularAnnual - plan.annualTotalPriceUzs;
        return {
          amount: formatUzs(plan.annualTotalPriceUzs),
          originalAmount: formatUzs(regularAnnual),
          unit: "/ yiliga",
          note: `Oyiga ${formatUzs(plan.annualMonthlyPriceUzs)} • 1-yillik 20% chegirma (${formatUzs(savedPerYear)} tejaladi, faqat 1 marta amal qiladi)`,
        };
      }
      return {
        amount: formatUzs(regularAnnual),
        unit: "/ yiliga",
        note: "Bir martalik 20% yillik chegirma avval foydalanilgan • Standart yillik tarif",
      };
    }
    return {
      amount: formatUzs(plan.monthlyPriceUzs),
      unit: "/ oyiga",
    };
  };

  const handleInitiateCheckout = async () => {
    if (!selectedPlanForInfo || selectedPlanForInfo.monthlyPriceUzs === 0) return;
    setIsCheckingOut(true);
    try {
      const payload: any = {
        planId: selectedPlanForInfo.id,
        billingCycle,
        paymentMethod,
      };

      if (paymentMethod === "bank_transfer_didox") {
        if (!b2bTinStir.trim()) {
          toast.error("Korxona yoki YaTT STIR (INN) raqamini kiriting");
          setIsCheckingOut(false);
          return;
        }
        payload.b2bMetadata = {
          tinStir: b2bTinStir.trim(),
          companyName: b2bCompanyName.trim() || currentEntity?.name || "Korxona",
        };
      }

      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Toʻlov buyurtmasini yaratib boʻlmadi");
      }

      if (paymentMethod === "payme" && data?.paymeCheckoutUrl) {
        window.location.href = data.paymeCheckoutUrl;
        return;
      }
      if (paymentMethod === "click" && data?.clickCheckoutUrl) {
        window.location.href = data.clickCheckoutUrl;
        return;
      }

      setCheckoutOrder(data);
      toast.success(
        paymentMethod === "bank_transfer_didox"
          ? "Rasmiy hisob-faktura (invoys) shakllantirildi"
          : "Toʻlov buyurtmasi yaratildi"
      );
    } catch (err: any) {
      toast.error(err?.message || "Toʻlov jarayonida xatolik yuz berdi");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    setIsConfirmingOrder(true);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_order",
          orderId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Buyurtmani tasdiqlab boʻlmadi");
      }
      toast.success(data?.message || "Toʻlov muvaffaqiyatli tasdiqlandi! Obuna faollashdi.");
      await refreshSubscription();
      setIsPaymentModalOpen(false);
      setCheckoutOrder(null);
    } catch (err: any) {
      toast.error(err?.message || "Tasdiqlashda xatolik yuz berdi");
    } finally {
      setIsConfirmingOrder(false);
    }
  };

  const handleCopyInvoice = async () => {
    if (!selectedPlanForInfo) return;
    const invNum =
      checkoutOrder?.invoiceNumber ||
      checkoutOrder?.order?.orderId ||
      `INV-${Date.now().toString().slice(-6)}`;
    const buyerName =
      checkoutOrder?.b2bMetadata?.companyName ||
      b2bCompanyName ||
      currentEntity?.name ||
      "Mijoz";
    const buyerStir =
      checkoutOrder?.b2bMetadata?.tinStir ||
      b2bTinStir ||
      currentEntity?.tinStir ||
      "—";
    const buyerAccount =
      checkoutOrder?.b2bMetadata?.bankAccount || "—";
    const regularAnnual = selectedPlanForInfo.monthlyPriceUzs * 12;
    const finalPriceUzs =
      billingCycle === "annual"
        ? !annualDiscountUsed
          ? selectedPlanForInfo.annualTotalPriceUzs
          : regularAnnual
        : selectedPlanForInfo.monthlyPriceUzs;
    const amountStr = formatUzs(checkoutOrder?.amountUzs || finalPriceUzs);
    const purpose =
      checkoutOrder?.paymentPurpose ||
      `FIRMUS AI ${selectedPlanForInfo.name} tarifi uchun ${
        billingCycle === "annual" ? "yillik (12 oylik)" : "oylik"
      } dasturiy taʼminot obuna toʻlovi. QQS siz`;

    const text = [
      `HISOB-FAKTURA (INVOYS) № ${invNum}`,
      `Sana: ${new Date().toLocaleDateString("uz-UZ")}`,
      `------------------------------------`,
      `Yetkazib beruvchi (Sotuvchi): «FIRMUS TECH» MChJ`,
      `STIR: 309888777`,
      `H/R: 2020 8000 9005 1234 5001`,
      `Bank: «Oʻzsanoatqurilishbank» ATB, MFO: 00440`,
      `------------------------------------`,
      `Buyurtmachi (Xaridor): ${buyerName}`,
      `STIR: ${buyerStir}`,
      `H/R: ${buyerAccount}`,
      `------------------------------------`,
      `Toʻlov summasi: ${amountStr} (0% komissiya)`,
      `Toʻlov maqsadi: ${purpose}`,
      `------------------------------------`,
      `Buyurtma ID: ${checkoutOrder?.orderId || checkoutOrder?.order?.orderId || "—"}`,
    ].join("\n");

    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedInvoice(true);
      toast.success("Invoys rekvizitlari nusxalandi");
      setTimeout(() => setCopiedInvoice(false), 2000);
    } else {
      toast.error("Nusxalab boʻlmadi");
    }
  };

  const trialDaysLeft = daysRemaining(subscription.trialEndsAt);
  const aiUsagePercent =
    subscription.monthlyLimit > 0
      ? Math.min(100, Math.round((subscription.monthlyUsed / subscription.monthlyLimit) * 100))
      : 0;

  const isAnnual = billingCycle === "annual";
  const regularAnnual = selectedPlanForInfo ? selectedPlanForInfo.monthlyPriceUzs * 12 : 0;
  const finalPriceUzs = selectedPlanForInfo
    ? isAnnual
      ? !annualDiscountUsed
        ? selectedPlanForInfo.annualTotalPriceUzs
        : regularAnnual
      : selectedPlanForInfo.monthlyPriceUzs
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Obuna va Tariflar
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tarif holati, AI imkoniyatlari va yillik yoki oylik rejalarni boshqarish
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
            {!annualDiscountUsed ? (
              <Badge variant="success" className="text-[9px] px-1.5 py-0 h-4">
                -20% (1-marta)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                Standart
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Active Subscription Summary (No raw developer telemetry) */}
      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              AI modelini toʻgʻridan-toʻgʻri chat oynasidagi yozish qatori tepasidan almashtirishingiz mumkin
            </CardDescription>
          </div>

          {subscription.trialAvailable && (
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
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
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Oylik AI faolligi</span>
                <Activity className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div className="mt-1.5 font-mono font-bold text-sm text-foreground">
                {aiUsagePercent}% foydalanildi
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {subscription.remainingCredits > 0
                  ? "Asboblar faol ishlamoqda"
                  : "Oylik chegara toʻldi"}
              </p>
              <UsageProgressBar
                used={subscription.monthlyUsed}
                max={subscription.monthlyLimit}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Faol AI modeli</span>
                <Cpu className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="mt-1.5 font-semibold text-sm text-foreground">
                {AI_MODELS[subscription.preferredModel].label}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {subscription.planId === "starter"
                  ? "Pro tarifida Gemini 4 Hydrogen ochiladi"
                  : "Chat oynasidan modellarni almashtirish mumkin"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Saqlangan ishlar</span>
                <FileStack className="h-3.5 w-3.5 text-sky-500" />
              </div>
              <div className="mt-1.5 font-mono font-bold text-sm text-foreground">
                {isLoadingUsage ? "…" : `${usage.monthlyBatches} ta ish`}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isLoadingUsage ? "…" : `${usage.aiThreadsCount} ta saqlangan chat`}
              </p>
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
          const priceInfo = getMainPriceLabel(plan);

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
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      {priceInfo.originalAmount && (
                        <span className="text-sm font-semibold line-through text-muted-foreground font-mono">
                          {priceInfo.originalAmount}
                        </span>
                      )}
                      <span className="text-2xl font-bold tracking-tight font-mono text-foreground">
                        {priceInfo.amount}
                      </span>
                      {priceInfo.unit && (
                        <span className="text-xs text-muted-foreground">{priceInfo.unit}</span>
                      )}
                    </div>
                    {priceInfo.note && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                        {priceInfo.note}
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-2.5 text-xs">
                    {featuresList.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-foreground/90">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>

              <div className="p-6 pt-3 space-y-2">
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
                    setCheckoutOrder(null);
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

      {/* Interactive Low-Commission Payment Checkout Dialog */}
      <Dialog
        open={isPaymentModalOpen}
        onOpenChange={(open) => {
          setIsPaymentModalOpen(open);
          if (!open) {
            setCheckoutOrder(null);
          }
        }}
      >
        {!selectedPlanForInfo ? null : selectedPlanForInfo.monthlyPriceUzs === 0 ? (
          <DialogContent className="sm:max-w-md text-xs">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Starter — Boshlangʻich tarif</DialogTitle>
              <DialogDescription className="text-xs">
                Ushbu tarif barcha foydalanuvchilar uchun 0 soʻm toʻlovsiz faol.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 text-muted-foreground leading-relaxed">
              Qoʻshimcha AI kreditlari, Gemini 4 Hydrogen modeli, PDF tahlili va kengaytirilgan 1C solishtirish imkoniyatlaridan foydalanish uchun Pro yoki Pro+ tarifini tanlashingiz mumkin.
            </div>
            <DialogFooter>
              <Button type="button" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
                Tushunarli
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : checkoutOrder ? (
          paymentMethod === "bank_transfer_didox" ? (
            /* 1. Bank transfer Didox Invoice card */
            <DialogContent className="sm:max-w-md text-xs">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-indigo-600" />
                    Hisob-faktura (Invoys)
                  </DialogTitle>
                  <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                    {checkoutOrder.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Yetkazib beruvchi:</span>
                    <span className="font-medium text-foreground">«FIRMUS TECH» MChJ (STIR: 309888777)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buyurtmachi:</span>
                    <span className="font-medium text-foreground">
                      {checkoutOrder.b2bMetadata?.companyName || b2bCompanyName || currentEntity?.name || "Mijoz"} (STIR: {checkoutOrder.b2bMetadata?.tinStir || b2bTinStir || currentEntity?.tinStir || "—"})
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Summa:</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {formatUzs(checkoutOrder.amountUzs || finalPriceUzs)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={handleCopyInvoice}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedInvoice ? "Nusxalandi!" : "Nusxa olish"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Chop etish
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setCheckoutOrder(null)}
                  >
                    Boshqa usul
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  disabled={isConfirmingOrder}
                  className="w-full h-9 text-xs gap-1.5"
                  onClick={() =>
                    handleConfirmOrder(checkoutOrder.orderId || checkoutOrder.order?.orderId)
                  }
                >
                  {isConfirmingOrder ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Toʻlovni tasdiqlash (Demo)
                </Button>
              </DialogFooter>
            </DialogContent>
          ) : (
            /* 2/3. Payme / Click Sandbox Order Confirmation */
            <DialogContent className="sm:max-w-md text-xs">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    {paymentMethod === "payme" ? (
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <QrCode className="h-4 w-4 text-sky-600" />
                    )}
                    {paymentMethod === "payme" ? "Payme" : "Click"} toʻlovi
                  </DialogTitle>
                  <Badge variant="outline" className="text-[10px]">
                    Sandbox
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tarif:</span>
                    <span className="font-semibold text-foreground">
                      {selectedPlanForInfo.name} ({isAnnual ? "Yillik" : "Oylik"})
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Toʻlov summasi:</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {formatUzs(checkoutOrder.amountUzs || finalPriceUzs)}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckoutOrder(null)}
                >
                  Boshqa usul
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isConfirmingOrder}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  onClick={() =>
                    handleConfirmOrder(checkoutOrder.orderId || checkoutOrder.order?.orderId)
                  }
                >
                  {isConfirmingOrder ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Toʻlovni tasdiqlash
                </Button>
              </DialogFooter>
            </DialogContent>
          )
        ) : (
          /* Payment Method Selection */
          <DialogContent className="sm:max-w-md text-xs">
            <DialogHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold">
                  {selectedPlanForInfo.name}
                </DialogTitle>
                <Badge variant="indigo" className="text-[10px]">
                  {isAnnual ? "Yillik" : "Oylik"}
                </Badge>
              </div>
              <div className="text-xl font-bold font-mono tracking-tight text-foreground">
                {formatUzs(finalPriceUzs)}
              </div>
            </DialogHeader>

            <div className="space-y-2 py-1">
              {/* 1. Payme */}
              <div
                onClick={() => setPaymentMethod("payme")}
                className={cn(
                  "cursor-pointer rounded-xl border p-3 transition-all text-xs flex items-center justify-between",
                  paymentMethod === "payme"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-600"
                    : "border-border hover:border-slate-300 dark:hover:border-slate-700 bg-muted/20"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground block">Payme</span>
                    <span className="text-[11px] text-muted-foreground">Uzcard / Humo</span>
                  </div>
                </div>
                {paymentMethod === "payme" && (
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                )}
              </div>

              {/* 2. Click */}
              <div
                onClick={() => setPaymentMethod("click")}
                className={cn(
                  "cursor-pointer rounded-xl border p-3 transition-all text-xs flex items-center justify-between",
                  paymentMethod === "click"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-600"
                    : "border-border hover:border-slate-300 dark:hover:border-slate-700 bg-muted/20"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <QrCode className="h-4 w-4 text-sky-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground block">Click</span>
                    <span className="text-[11px] text-muted-foreground">Click Up / QR / Karta</span>
                  </div>
                </div>
                {paymentMethod === "click" && (
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                )}
              </div>

              {/* 3. Bank oʻtkazmasi */}
              <div
                onClick={() => setPaymentMethod("bank_transfer_didox")}
                className={cn(
                  "cursor-pointer rounded-xl border p-3 transition-all text-xs space-y-2.5",
                  paymentMethod === "bank_transfer_didox"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-600"
                    : "border-border hover:border-slate-300 dark:hover:border-slate-700 bg-muted/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground block">Bank oʻtkazmasi</span>
                      <span className="text-[11px] text-muted-foreground">
                        Yuridik shaxslar (Hisob-faktura)
                      </span>
                    </div>
                  </div>
                  {paymentMethod === "bank_transfer_didox" && (
                    <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  )}
                </div>

                {paymentMethod === "bank_transfer_didox" && (
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/60"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">STIR (INN) *</Label>
                      <Input
                        placeholder="301234567"
                        value={b2bTinStir}
                        onChange={(e) => setB2bTinStir(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Korxona / YaTT nomi *</Label>
                      <Input
                        placeholder="MChJ yoki YaTT"
                        value={b2bCompanyName}
                        onChange={(e) => setB2bCompanyName(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCheckingOut}
                onClick={() => setIsPaymentModalOpen(false)}
              >
                Bekor qilish
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isCheckingOut}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                onClick={handleInitiateCheckout}
              >
                {isCheckingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : paymentMethod === "bank_transfer_didox" ? (
                  <Receipt className="h-3.5 w-3.5" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
                {paymentMethod === "bank_transfer_didox"
                  ? "Hisob-faktura olish"
                  : `Toʻlash — ${formatUzs(finalPriceUzs)}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
