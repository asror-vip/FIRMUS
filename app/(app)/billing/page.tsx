"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAppState } from "@/lib/context/app-state";
import { FEATURES } from "@/lib/config/features";
import {
  formatUzsByLocale,
  getLocalizedAiModel,
  getLocalizedPlanSpec,
  getLocalizedPlansList,
  normalizePlanId,
  type PlanSpec,
} from "@/lib/config/plans";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getBillingHomeDict, getIntlLocale } from "@/lib/i18n/domains/billing-home";
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
  const { locale } = useTranslation();
  const dict = getBillingHomeDict(locale);
  const b = dict.billing;
  const intlLocale = getIntlLocale(locale);
  const localizedPlans = getLocalizedPlansList(locale);
  const formatUzs = (amount: number) => formatUzsByLocale(amount, locale);

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

  const activePlanSpec = selectedPlanForInfo
    ? getLocalizedPlanSpec(selectedPlanForInfo.id, locale)
    : null;

  // Checkout modal states
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer_didox" | "payme" | "click">("payme");
  const [b2bTinStir, setB2bTinStir] = useState(currentEntity?.tinStir || "");
  const [b2bCompanyName, setB2bCompanyName] = useState(currentEntity?.name || "");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<any | null>(null);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  const initializedEntityRef = useRef<string | null>(null);

  useEffect(() => {
    const entityId = currentEntity?.id ?? null;
    if (entityId && initializedEntityRef.current !== entityId) {
      initializedEntityRef.current = entityId;
      setB2bTinStir(currentEntity?.tinStir || "");
      setB2bCompanyName(currentEntity?.name || "");
    }
  }, [currentEntity]);

  const loadStats = useCallback(async () => {
    setIsLoadingUsage(true);
    try {
      const res = await fetchWorkspaceUsageSummary({
        workspaceId: currentWorkspace?.id,
        entityId: currentEntity?.id,
      });
      setUsage(res);
    } finally {
      setIsLoadingUsage(false);
    }
  }, [currentWorkspace?.id, currentEntity?.id]);

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
        throw new Error(data?.error || b.toast.trialError);
      }
      if (data?.subscription) {
        setSubscriptionSnapshot(data.subscription);
      } else {
        await refreshSubscription();
      }
      toast.success(data?.message || b.toast.trialSuccess);
    } catch (err: any) {
      toast.error(err?.message || b.toast.trialActivateFailed);
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
      return { amount: b.pricing.freeAmount, unit: "" };
    }
    if (billingCycle === "annual") {
      const regularAnnual = plan.monthlyPriceUzs * 12;
      if (!annualDiscountUsed) {
        const savedPerYear = regularAnnual - plan.annualTotalPriceUzs;
        return {
          amount: formatUzs(plan.annualTotalPriceUzs),
          originalAmount: formatUzs(regularAnnual),
          unit: b.pricing.perYear,
          note: b.pricing.annualDiscountNote
            .replace("{monthly}", formatUzs(plan.annualMonthlyPriceUzs))
            .replace("{saved}", formatUzs(savedPerYear)),
        };
      }
      return {
        amount: formatUzs(regularAnnual),
        unit: b.pricing.perYear,
        note: b.pricing.annualStandardNote,
      };
    }
    return {
      amount: formatUzs(plan.monthlyPriceUzs),
      unit: b.pricing.perMonth,
    };
  };

  const handleSwitchPaymentMethod = async () => {
    const orderId = checkoutOrder?.order?.orderId || checkoutOrder?.orderId;
    if (orderId) {
      try {
        await fetch("/api/subscription/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "cancel_order", orderId }),
        });
      } catch (err) {
        console.warn("Could not cancel pending order:", err);
      }
    }
    setCheckoutOrder(null);
  };

  const handleInitiateCheckout = async () => {
    if (!activePlanSpec || activePlanSpec.monthlyPriceUzs === 0 || isCheckingOut || isConfirmingOrder) return;
    setIsCheckingOut(true);
    try {
      const payload: any = {
        planId: activePlanSpec.id,
        billingCycle,
        paymentMethod,
      };

      if (paymentMethod === "bank_transfer_didox") {
        if (!b2bTinStir.trim()) {
          toast.error(b.toast.enterTinError);
          setIsCheckingOut(false);
          return;
        }
        payload.b2bMetadata = {
          tinStir: b2bTinStir.trim(),
          companyName: b2bCompanyName.trim() || currentEntity?.name || b.dialogs.checkout.companyFallback,
        };
      }

      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || b.toast.createOrderFailed);
      }

      if (paymentMethod === "payme" && data?.paymeCheckoutUrl) {
        window.location.assign(data.paymeCheckoutUrl);
        return;
      }
      if (paymentMethod === "click" && data?.clickCheckoutUrl) {
        window.location.assign(data.clickCheckoutUrl);
        return;
      }

      const createdOrderId = data?.order?.orderId || data?.orderId;
      const fallbackInvoiceNumber =
        data?.invoiceDetails?.invoiceNumber ||
        data?.invoiceNumber ||
        (createdOrderId ? `INV-${createdOrderId}` : `INV-${Date.now().toString().slice(-6)}`);
      setCheckoutOrder({ ...data, fallbackInvoiceNumber });
      toast.success(
        paymentMethod === "bank_transfer_didox"
          ? b.toast.invoiceGenerated
          : b.toast.orderCreated
      );
    } catch (err: any) {
      toast.error(err?.message || b.toast.checkoutError);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    if (isConfirmingOrder || isCheckingOut) return;
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
        if (data?.alreadyPaid) {
          toast.info(data?.message || b.toast.orderAlreadyPaid);
          await refreshSubscription();
          setIsPaymentModalOpen(false);
          setCheckoutOrder(null);
          return;
        }
        throw new Error(data?.error || b.toast.confirmOrderFailed);
      }
      if (data?.alreadyPaid) {
        toast.info(data?.message || b.toast.orderAlreadyPaid);
      } else {
        toast.success(data?.message || b.toast.paymentConfirmed);
      }
      await refreshSubscription();
      setIsPaymentModalOpen(false);
      setCheckoutOrder(null);
    } catch (err: any) {
      toast.error(err?.message || b.toast.confirmError);
      if (
        err?.message?.includes("avval toʻlangan") ||
        err?.message?.includes("already paid") ||
        err?.message?.includes("уже оплачен")
      ) {
        await refreshSubscription();
        setIsPaymentModalOpen(false);
        setCheckoutOrder(null);
      }
    } finally {
      setIsConfirmingOrder(false);
    }
  };

  const handleCopyInvoice = async () => {
    if (!activePlanSpec) return;
    const inv = checkoutOrder?.invoiceDetails;
    const ord = checkoutOrder?.order;
    const orderId = ord?.orderId || checkoutOrder?.orderId || "—";
    const invNum =
      inv?.invoiceNumber ||
      checkoutOrder?.invoiceNumber ||
      (orderId !== "—" ? `INV-${orderId}` : checkoutOrder?.fallbackInvoiceNumber || "INV-000000");
    const seller = inv?.sellerName || "«FIRMUS TECH» MChJ";
    const sTin = inv?.sellerTin || "309888777";
    const sAccount = inv?.sellerAccount || "2020 8000 9005 1234 5001";
    const sBank = inv?.sellerBank || "«Oʻzsanoatqurilishbank» ATB";
    const sMfo = inv?.sellerMfo || "00440";
    const bName =
      inv?.buyerName ||
      checkoutOrder?.b2bMetadata?.companyName ||
      b2bCompanyName ||
      currentEntity?.name ||
      b.dialogs.invoice.buyerFallback;
    const bTin =
      inv?.buyerTin ||
      checkoutOrder?.b2bMetadata?.tinStir ||
      b2bTinStir ||
      currentEntity?.tinStir ||
      "—";
    const amountVal =
      inv?.amountUzs ||
      ord?.finalAmountUzs ||
      checkoutOrder?.amountUzs ||
      finalPriceUzs;
    const amountStr = formatUzs(amountVal);
    const tpl = b.dialogs.invoice.copyTemplate;
    const purpose =
      inv?.paymentPurpose ||
      checkoutOrder?.paymentPurpose ||
      tpl.defaultPurpose.replace("{plan}", activePlanSpec.name);

    const text = [
      tpl.header.replace("{invNum}", invNum),
      tpl.date.replace("{date}", new Date().toLocaleDateString(intlLocale)),
      `------------------------------------`,
      tpl.seller.replace("{seller}", seller),
      tpl.tin.replace("{tin}", sTin),
      tpl.account.replace("{account}", sAccount),
      tpl.bank.replace("{bank}", sBank).replace("{mfo}", sMfo),
      `------------------------------------`,
      tpl.buyer.replace("{buyer}", bName),
      tpl.tin.replace("{tin}", bTin),
      `------------------------------------`,
      tpl.amount.replace("{amount}", amountStr),
      tpl.purpose.replace("{purpose}", purpose),
      `------------------------------------`,
      tpl.orderId.replace("{orderId}", orderId),
    ].join("\n");

    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedInvoice(true);
      toast.success(b.toast.invoiceCopied);
      setTimeout(() => setCopiedInvoice(false), 2000);
    } else {
      toast.error(b.toast.copyFailed);
    }
  };

  const trialDaysLeft = daysRemaining(subscription.trialEndsAt);
  const aiUsagePercent =
    subscription.monthlyLimit > 0
      ? Math.min(100, Math.round((subscription.monthlyUsed / subscription.monthlyLimit) * 100))
      : 0;

  const isAnnual = billingCycle === "annual";
  const regularAnnual = activePlanSpec ? activePlanSpec.monthlyPriceUzs * 12 : 0;
  const finalPriceUzs = activePlanSpec
    ? isAnnual
      ? !annualDiscountUsed
        ? activePlanSpec.annualTotalPriceUzs
        : regularAnnual
      : activePlanSpec.monthlyPriceUzs
    : 0;

  const daysLeft = subscription.expiresAt ? daysRemaining(subscription.expiresAt) : null;
  const canRenewSoon = daysLeft !== null && daysLeft <= 5;
  const isAlreadyActivePaid =
    Boolean(activePlanSpec) &&
    !subscription.isTrialActive &&
    subscription.planId !== "starter" &&
    (activePlanSpec?.id === subscription.planId ||
      (subscription.planId === "pro_plus" && activePlanSpec?.id === "professional"));

  const currentLocalizedPlanName = getLocalizedPlanSpec(
    normalizePlanId(subscription.planId),
    locale
  ).name;
  const activeAiModelMeta = getLocalizedAiModel(subscription.preferredModel, locale);

  return (
    <div
      className={cn(
        "space-y-6",
        isPaymentModalOpen && checkoutOrder && paymentMethod === "bank_transfer_didox" && "print:hidden"
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {b.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {b.subtitle}
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
            {b.cycleMonthly}
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
            <span>{b.cycleAnnual}</span>
            {!annualDiscountUsed ? (
              <Badge variant="success" className="text-[9px] px-1.5 py-0 h-4">
                {b.annualDiscountBadge}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                {b.annualStandardBadge}
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
                {FEATURES.multiCompanyMode
                  ? currentWorkspace?.name || b.summary.workspaceFallback
                  : b.summary.personalAccount}
              </CardTitle>
              <Badge variant="indigo" className="text-[10px]">
                {currentLocalizedPlanName}
              </Badge>
              {subscription.isTrialActive ? (
                <Badge variant="warning" className="text-[10px] gap-1">
                  <Clock className="h-3 w-3" />
                  {b.summary.trialRemaining.replace("{days}", String(trialDaysLeft))}
                </Badge>
              ) : (
                <Badge variant="success" className="text-[10px]">
                  {b.summary.activeBadge}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {b.summary.modelHintSubtitle}
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
              {b.summary.trialBtn}
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{b.summary.monthlyAiActivity}</span>
                <Activity className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <div className="mt-1.5 font-mono font-bold text-sm text-foreground">
                {b.summary.usedPercent.replace("{pct}", String(aiUsagePercent))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {subscription.remainingCredits > 0
                  ? b.summary.toolsActive
                  : b.summary.monthlyLimitReached}
              </p>
              <UsageProgressBar
                used={subscription.monthlyUsed}
                max={subscription.monthlyLimit}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{b.summary.activeAiModel}</span>
                <Cpu className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="mt-1.5 font-semibold text-sm text-foreground">
                {activeAiModelMeta.label}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {subscription.planId === "starter"
                  ? b.summary.starterModelHint
                  : b.summary.proModelHint}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{b.summary.savedWorks}</span>
                <FileStack className="h-3.5 w-3.5 text-sky-500" />
              </div>
              <div className="mt-1.5 font-mono font-bold text-sm text-foreground">
                {isLoadingUsage
                  ? "…"
                  : b.summary.worksCount.replace("{count}", String(usage.monthlyBatches))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {isLoadingUsage
                  ? "…"
                  : b.summary.savedChatsCount.replace("{count}", String(usage.aiThreadsCount))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 Plan Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {localizedPlans.map((plan) => {
          const isCurrent = plan.id === subscription.planId;
          const featuresList = FEATURES.multiCompanyMode ? plan.b2bFeatures : plan.soloFeatures;
          const showTrialBtn = plan.id === "professional" && subscription.trialAvailable;
          const priceInfo = getMainPriceLabel(plan);
          const isPaidActive = !subscription.isTrialActive && subscription.planId !== "starter";
          const isIncludedInHigherTier =
            subscription.planId === "pro_plus" && !subscription.isTrialActive && plan.id === "professional";

          let buttonLabel = b.cards.subscribeOrPay;
          if (isCurrent && isPaidActive) {
            buttonLabel = b.cards.activePlanDetails;
          } else if (isIncludedInHigherTier) {
            buttonLabel = b.cards.includedInProPlus;
          } else if (plan.monthlyPriceUzs === 0) {
            buttonLabel = b.cards.basicFreePlan;
          }

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
                        {subscription.isTrialActive ? b.cards.currentTrial : b.cards.currentPlan}
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
                    {b.cards.tryFree7Days}
                  </Button>
                )}

                <Button
                  type="button"
                  variant={isCurrent || showTrialBtn || isIncludedInHigherTier ? "outline" : "default"}
                  className="w-full h-9 text-xs gap-1.5"
                  onClick={() => {
                    setSelectedPlanForInfo(plan);
                    setCheckoutOrder(null);
                    setIsPaymentModalOpen(true);
                  }}
                >
                  {isCurrent || isIncludedInHigherTier ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5" />
                  )}
                  {buttonLabel}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Interactive Low-Commission Payment Checkout Dialog */}
      <Dialog
        open={isPaymentModalOpen}
        onOpenChange={async (open) => {
          if (!open && (isConfirmingOrder || isCheckingOut)) return;
          setIsPaymentModalOpen(open);
          if (!open) {
            const orderId = checkoutOrder?.order?.orderId || checkoutOrder?.orderId;
            if (orderId) {
              try {
                await fetch("/api/subscription/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "cancel_order", orderId }),
                });
              } catch (err) {
                console.warn("Could not cancel pending order on modal close:", err);
              }
            }
            setCheckoutOrder(null);
          }
        }}
      >
        {!activePlanSpec ? null : activePlanSpec.monthlyPriceUzs === 0 ? (
          <DialogContent className="sm:max-w-md text-xs">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">{b.dialogs.starter.title}</DialogTitle>
              <DialogDescription className="text-xs">
                {b.dialogs.starter.description}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 text-muted-foreground leading-relaxed">
              {b.dialogs.starter.body}
            </div>
            <DialogFooter>
              <Button type="button" size="sm" onClick={() => setIsPaymentModalOpen(false)}>
                {b.dialogs.starter.closeBtn}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : isAlreadyActivePaid && !canRenewSoon ? (
          <DialogContent className="sm:max-w-md text-xs">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  {activePlanSpec.name}
                </DialogTitle>
                <Badge variant="success" className="text-[10px]">
                  {b.dialogs.activePaid.activePaidBadge}
                </Badge>
              </div>
              <DialogDescription className="text-xs">
                {b.dialogs.activePaid.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{b.dialogs.activePaid.statusLabel}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {b.dialogs.activePaid.statusValue}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{b.dialogs.activePaid.expiresLabel}</span>
                  <span className="font-medium text-foreground">
                    {subscription.expiresAt
                      ? `${new Date(subscription.expiresAt).toLocaleDateString(intlLocale)}${
                          daysLeft !== null
                            ? ` ${b.dialogs.activePaid.daysLeftSuffix.replace("{days}", String(daysLeft))}`
                            : ""
                        }`
                      : b.dialogs.activePaid.unlimitedDuration}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground">{b.dialogs.activePaid.monthlyLimitLabel}</span>
                  <span className="font-mono font-bold text-foreground">
                    {activePlanSpec.limits.monthlyCredits > 0
                      ? b.dialogs.activePaid.creditsUnit.replace(
                          "{credits}",
                          String(activePlanSpec.limits.monthlyCredits)
                        )
                      : b.dialogs.activePaid.unlimitedCredits}
                  </span>
                </div>
              </div>

              {subscription.planId === "pro_plus" && activePlanSpec.id === "professional" && (
                <div className="rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    {b.dialogs.activePaid.proPlusIncludedNotePrefix}
                    <strong>{getLocalizedPlanSpec("pro_plus", locale).name}</strong>
                    {b.dialogs.activePaid.proPlusIncludedNoteSuffix}
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentModalOpen(false)}
              >
                {b.dialogs.activePaid.closeBtn}
              </Button>
              {subscription.planId === "professional" && activePlanSpec.id === "professional" && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  onClick={() => {
                    setSelectedPlanForInfo(getLocalizedPlanSpec("pro_plus", locale));
                    setCheckoutOrder(null);
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {b.dialogs.activePaid.upgradeToProPlusBtn}
                </Button>
              )}
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
                    {b.dialogs.invoice.title}
                  </DialogTitle>
                  <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                    {checkoutOrder.invoiceDetails?.invoiceNumber ||
                      checkoutOrder.invoiceNumber ||
                      (checkoutOrder.order?.orderId
                        ? `INV-${checkoutOrder.order.orderId}`
                        : checkoutOrder.fallbackInvoiceNumber)}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-3 py-1">
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{b.dialogs.invoice.sellerLabel}</span>
                    <span className="font-medium text-foreground">
                      {checkoutOrder.invoiceDetails?.sellerName || "«FIRMUS TECH» MChJ"} ({b.dialogs.invoice.tinPrefix}:{" "}
                      {checkoutOrder.invoiceDetails?.sellerTin || "309888777"})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{b.dialogs.invoice.accountBankLabel}</span>
                    <span className="font-medium font-mono text-[10px] text-foreground">
                      {checkoutOrder.invoiceDetails?.sellerAccount || "2020 8000 9005 1234 5001"} (
                      {checkoutOrder.invoiceDetails?.sellerBank || "SQB"})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{b.dialogs.invoice.buyerLabel}</span>
                    <span className="font-medium text-foreground">
                      {checkoutOrder.invoiceDetails?.buyerName ||
                        checkoutOrder.b2bMetadata?.companyName ||
                        b2bCompanyName ||
                        currentEntity?.name ||
                        b.dialogs.invoice.buyerFallback}{" "}
                      ({b.dialogs.invoice.tinPrefix}:{" "}
                      {checkoutOrder.invoiceDetails?.buyerTin ||
                        checkoutOrder.b2bMetadata?.tinStir ||
                        b2bTinStir ||
                        currentEntity?.tinStir ||
                        "—"}
                      )
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">{b.dialogs.invoice.amountLabel}</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {formatUzs(
                        checkoutOrder.invoiceDetails?.amountUzs ||
                          checkoutOrder.order?.finalAmountUzs ||
                          checkoutOrder.amountUzs ||
                          finalPriceUzs
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 print:hidden">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={handleCopyInvoice}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedInvoice ? b.dialogs.invoice.copiedBtn : b.dialogs.invoice.copyBtn}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {b.dialogs.invoice.printBtn}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={handleSwitchPaymentMethod}
                  >
                    {b.dialogs.invoice.switchMethodBtn}
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-border print:hidden">
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  disabled={isConfirmingOrder || isCheckingOut}
                  className="w-full h-9 text-xs gap-1.5"
                  onClick={() =>
                    handleConfirmOrder(checkoutOrder.order?.orderId || checkoutOrder.orderId)
                  }
                >
                  {isConfirmingOrder ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {b.dialogs.invoice.confirmDemoBtn}
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
                    {paymentMethod === "payme" ? b.dialogs.sandbox.paymeTitle : b.dialogs.sandbox.clickTitle}
                  </DialogTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {b.dialogs.sandbox.badge}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{b.dialogs.sandbox.planLabel}</span>
                    <span className="font-semibold text-foreground">
                      {activePlanSpec.name} ({isAnnual ? b.dialogs.checkout.cycleAnnualLabel : b.dialogs.checkout.cycleMonthlyLabel})
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">{b.dialogs.sandbox.amountLabel}</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {formatUzs(
                        checkoutOrder.order?.finalAmountUzs ||
                          checkoutOrder.amountUzs ||
                          finalPriceUzs
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchPaymentMethod}
                >
                  {b.dialogs.sandbox.switchMethodBtn}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isConfirmingOrder || isCheckingOut}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  onClick={() =>
                    handleConfirmOrder(checkoutOrder.order?.orderId || checkoutOrder.orderId)
                  }
                >
                  {isConfirmingOrder ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {b.dialogs.sandbox.confirmBtn}
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
                  {activePlanSpec.name}
                </DialogTitle>
                <Badge variant="indigo" className="text-[10px]">
                  {isAnnual ? b.dialogs.checkout.cycleAnnualLabel : b.dialogs.checkout.cycleMonthlyLabel}
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
                    <span className="font-semibold text-foreground block">{b.dialogs.checkout.paymeTitle}</span>
                    <span className="text-[11px] text-muted-foreground">{b.dialogs.checkout.paymeSubtitle}</span>
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
                    <span className="font-semibold text-foreground block">{b.dialogs.checkout.clickTitle}</span>
                    <span className="text-[11px] text-muted-foreground">{b.dialogs.checkout.clickSubtitle}</span>
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
                      <span className="font-semibold text-foreground block">{b.dialogs.checkout.bankTitle}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {b.dialogs.checkout.bankSubtitle}
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
                      <Label className="text-[10px] text-muted-foreground">{b.dialogs.checkout.tinLabel}</Label>
                      <Input
                        placeholder={b.dialogs.checkout.tinPlaceholder}
                        value={b2bTinStir}
                        onChange={(e) => setB2bTinStir(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{b.dialogs.checkout.companyNameLabel}</Label>
                      <Input
                        placeholder={b.dialogs.checkout.companyNamePlaceholder}
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
                disabled={isCheckingOut || isConfirmingOrder}
                onClick={() => setIsPaymentModalOpen(false)}
              >
                {b.dialogs.checkout.cancelBtn}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isCheckingOut || isConfirmingOrder}
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
                  ? b.dialogs.checkout.getInvoiceBtn
                  : b.dialogs.checkout.payAmountBtn.replace("{amount}", formatUzs(finalPriceUzs))}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
