"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAppState } from "@/lib/context/app-state";
import {
  updateWorkspacePlanInDb,
  fetchWorkspaceUsageSummary,
} from "@/lib/services/supabase-service";
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
  Building2,
  Users,
  FileStack,
  MessageSquare,
  Sparkles,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PlanId = "starter" | "professional" | "enterprise";

interface PlanDefinition {
  id: PlanId;
  name: string;
  subtitle: string;
  monthlyPriceUzs: number | null;
  badge?: string;
  limits: {
    entities: number | null;
    members: number | null;
    monthlyBatches: number | null;
  };
  features: string[];
}

const PLANS: PlanDefinition[] = [
  {
    id: "starter",
    name: "Starter",
    subtitle: "Yakka tadbirkor va 1 ta korxona uchun",
    monthlyPriceUzs: 0,
    limits: {
      entities: 1,
      members: 3,
      monthlyBatches: 20,
    },
    features: [
      "1 ta korxona (STIR)",
      "3 nafargacha jamoa aʼzosi",
      "Bank ↔ 1C solishtirish",
      "Oyiga 20 tagacha chek skan va fayl paketi",
      "AI Chat va soʻnggi tarix",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    subtitle: "Buxgalteriya firmalari va faol MChJlar uchun",
    monthlyPriceUzs: 290_000,
    badge: "Tavsiya etiladi",
    limits: {
      entities: 10,
      members: 15,
      monthlyBatches: 300,
    },
    features: [
      "10 tagacha korxona (STIR)",
      "15 nafargacha jamoa aʼzosi",
      "Bank ↔ 1C + 1C XML / TXT eksport",
      "Oyiga 300 tagacha chek skan va fayl paketi",
      "Cheksiz AI Chat tarixi va shartnoma tekshiruvi",
      "Soliq taqvimi, Bosh kitob va Moliya P&L",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    subtitle: "Yirik xoldinglar va BPO markazlar uchun",
    monthlyPriceUzs: null,
    limits: {
      entities: null,
      members: null,
      monthlyBatches: null,
    },
    features: [
      "Cheksiz korxonalar va filiallar",
      "Cheksiz foydalanuvchi va rollar",
      "Shaxsiy 1C / Didox / E-IMZO ulanishlari",
      "Cheksiz fayl paketlari va tezkor ustuvor AI",
      "Ajratilgan qoʻllab-quvvatlash",
    ],
  },
];

function formatUzs(amount: number): string {
  return `${new Intl.NumberFormat("uz-UZ").format(amount)} soʻm`;
}

function UsageProgressBar({ used, max }: { used: number; max: number | null }) {
  const pct = max && max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 12;
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

export default function BillingPage() {
  const { currentWorkspace, currentEntity, currentRole, refreshContext } = useAppState();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [updatingPlanId, setUpdatingPlanId] = useState<PlanId | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingInfoPlan, setPendingInfoPlan] = useState<PlanDefinition | null>(null);
  const [usage, setUsage] = useState({ monthlyBatches: 0, aiThreadsCount: 0 });
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  const activePlanId = (currentWorkspace?.currentPlan || "professional") as PlanId;
  const activePlan = PLANS.find((p) => p.id === activePlanId) || PLANS[1];
  const canManagePlan =
    currentRole === "workspace_owner" || currentRole === "company_director";

  const loadUsage = useCallback(async () => {
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
    loadUsage();
  }, [loadUsage]);

  const handleSelectPlan = async (plan: PlanDefinition) => {
    if (plan.id === activePlanId) {
      setPendingInfoPlan(plan);
      setIsPaymentModalOpen(true);
      return;
    }

    if (!currentWorkspace?.id) {
      toast.error("Avval ishchi maydon (Workspace) tanlang");
      return;
    }

    if (!canManagePlan) {
      toast.error("Tarifni faqat ishchi maydon egasi yoki rahbar oʻzgartira oladi");
      return;
    }

    setUpdatingPlanId(plan.id);
    try {
      await updateWorkspacePlanInDb(currentWorkspace.id, plan.id);
      await refreshContext();
      toast.success(`Tarif «${plan.name}» ga oʻzgartirildi!`);
      if (plan.id === "enterprise" || (plan.monthlyPriceUzs ?? 0) > 0) {
        setPendingInfoPlan(plan);
        setIsPaymentModalOpen(true);
      }
    } catch (err: any) {
      toast.error("Tarifni saqlashda xatolik: " + (err?.message || "Ruxsat cheklangan"));
    } finally {
      setUpdatingPlanId(null);
    }
  };

  const getDisplayPrice = (plan: PlanDefinition) => {
    if (plan.monthlyPriceUzs === null) return "Kelishuv asosida";
    if (plan.monthlyPriceUzs === 0) return "0 soʻm";
    const price =
      billingCycle === "annual"
        ? Math.round(plan.monthlyPriceUzs * 0.8)
        : plan.monthlyPriceUzs;
    return formatUzs(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Obuna va Tariflar
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ishchi maydon tarifi va joriy oydagi resurslardan foydalanish holati
          </p>
        </div>

        {/* Monthly / Annual Billing Toggle */}
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

      {/* Active Workspace Status + Live Quotas */}
      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm font-semibold">
                {currentWorkspace?.name || "Ishchi maydon"}
              </CardTitle>
              <Badge variant="indigo" className="text-[10px]">
                {activePlan.name}
              </Badge>
              <Badge variant="success" className="text-[10px]">
                Faol
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {activePlan.subtitle}
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 shrink-0"
            onClick={() => {
              setPendingInfoPlan(activePlan);
              setIsPaymentModalOpen(true);
            }}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Toʻlov va shartnoma
          </Button>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Korxonalar</span>
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div className="mt-1.5 font-mono font-bold text-sm text-foreground">
                {currentWorkspace?.entitiesCount ?? 0} /{" "}
                {activePlan.limits.entities ?? "∞"}
              </div>
              <UsageProgressBar
                used={currentWorkspace?.entitiesCount ?? 0}
                max={activePlan.limits.entities}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Jamoa aʼzolari</span>
                <Users className="h-3.5 w-3.5" />
              </div>
              <div className="mt-1.5 font-mono font-bold text-sm text-foreground">
                {currentWorkspace?.membersCount ?? 1} /{" "}
                {activePlan.limits.members ?? "∞"}
              </div>
              <UsageProgressBar
                used={currentWorkspace?.membersCount ?? 1}
                max={activePlan.limits.members}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Shu oydagi ishlar</span>
                <FileStack className="h-3.5 w-3.5" />
              </div>
              <div className="mt-1.5 font-mono font-bold text-sm text-foreground">
                {isLoadingUsage ? "…" : usage.monthlyBatches} /{" "}
                {activePlan.limits.monthlyBatches ?? "∞"}
              </div>
              <UsageProgressBar
                used={usage.monthlyBatches}
                max={activePlan.limits.monthlyBatches}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>AI Suhbatlar</span>
                <MessageSquare className="h-3.5 w-3.5" />
              </div>
              <div className="mt-1.5 font-mono font-bold text-sm text-foreground">
                {isLoadingUsage ? "…" : usage.aiThreadsCount} ta suhbat
              </div>
              <UsageProgressBar used={usage.aiThreadsCount} max={null} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === activePlanId;
          const isUpdating = updatingPlanId === plan.id;

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
                        Joriy tarif
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
                    {plan.monthlyPriceUzs !== null && plan.monthlyPriceUzs > 0 && (
                      <span className="text-xs text-muted-foreground ml-1.5">
                        / oyiga
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-2 text-xs">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-foreground/90">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>

              <div className="p-6 pt-2">
                <Button
                  type="button"
                  variant={isCurrent ? "outline" : plan.id === "professional" ? "default" : "outline"}
                  className="w-full h-9 text-xs gap-1.5"
                  disabled={Boolean(updatingPlanId)}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isCurrent ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  ) : null}
                  {isCurrent ? "Toʻlov maʼlumotlari" : "Tarifni tanlash"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Honest Payment & Contract Info Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {pendingInfoPlan ? `${pendingInfoPlan.name} — Toʻlov tartibi` : "Toʻlov tartibi"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ishchi maydon tarifi saqlandi. Toʻlov usullari:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
              <div className="font-semibold text-foreground">
                1. Yuridik shaxslar uchun (Hisob-faktura / Didox E-SF)
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Korxona rekvizitlari (STIR) asosida shartnoma va E-SF rasmiylashtirilib, hisob raqamdan koʻchirish yoʻli bilan toʻlov qabul qilinadi.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
              <div className="font-semibold text-foreground">
                2. Payme / Click / Uzum Business
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Avtomatik karta orqali toʻlov shlyuzi hozir ulanish bosqichida. Hozirgi sinov davrida tanlangan tarif ishchi maydoningizda cheklovlarsiz faol turadi.
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
