"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/context/locale-context";
import { useCalcDict } from "@/lib/i18n/domains/use-calc-dict";
import { trackEvent } from "@/lib/analytics/track-event";
import {
  calculatePayrollUz,
  calculateVatUz,
  calculateTurnoverTaxUz,
  calculateVacationPayUz,
  getUnverifiedTaxRules,
  resolveUzTaxRules,
  type TaxpayerStatus,
} from "@/lib/services/uz-tax-calculator";
import { Money } from "@/components/shared/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Scale, ShieldCheck } from "lucide-react";

const PAGE_COPY = {
  uz: {
    title: "Bepul soliq va maosh kalkulyatorlari (2026)",
    subtitle:
      "QQS 12%, ish haqi (brutto/netto), aylanmadan soliq (MChJ 4%, YaTT/oʻzini band 1%) va taʼtil pulini loginsiz, brauzerning oʻzida aniq hisoblang.",
    disclaimer: "Taxminiy hisob. Yakuniy qarorni buxgalter tasdiqlaydi.",
    sourceLabel: "Manba (lex.uz)",
    trySverkaCta: "Bank ↔ 1C Sverkada sinash",
    registerCta: "Mijozlarni saqlash uchun bepul roʻyxatdan oʻting",
    zeroServerNote: "Barcha hisob-kitoblar brauzeringiz ichida bajariladi — raqamlaringiz serverga yuborilmaydi.",
  },
  ru: {
    title: "Бесплатные налоговые и зарплатные калькуляторы (2026)",
    subtitle:
      "Точный расчёт НДС 12%, зарплаты (брутто/нетто), налога с оборота (ООО 4%, ИП/самозанятые 1%) и отпускных прямо в браузере без регистрации.",
    disclaimer: "Предварительный расчёт. Итоговое решение подтверждает бухгалтер.",
    sourceLabel: "Источник (lex.uz)",
    trySverkaCta: "Попробовать сверку Банк ↔ 1С",
    registerCta: "Зарегистрироваться бесплатно для сохранения клиентов",
    zeroServerNote: "Все расчёты выполняются локально в браузере — данные не отправляются на сервер.",
  },
  en: {
    title: "Free Uzbekistan Tax & Payroll Calculators (2026)",
    subtitle:
      "Calculate 12% VAT, Gross/Net payroll, turnover tax (LLC 4%, YaTT/Self-employed 1%), and vacation pay locally in your browser.",
    disclaimer: "Estimated calculation. Final decision is confirmed by the accountant.",
    sourceLabel: "Source (lex.uz)",
    trySverkaCta: "Try Bank ↔ 1C Reconcile",
    registerCta: "Sign up free to save clients & history",
    zeroServerNote: "All math runs locally in your browser — nothing is sent to a server.",
  },
};

export function PublicCalculatorsClient() {
  const { language: locale } = useLocale();
  const d = useCalcDict(locale);
  const copy = PAGE_COPY[locale] ?? PAGE_COPY.uz;
  const activeRules = resolveUzTaxRules();
  const unverifiedRules = useMemo(() => getUnverifiedTaxRules(), []);

  const [salaryAmount, setSalaryAmount] = useState("5000000");
  const [salaryDir, setSalaryDir] = useState<"gross_to_net" | "net_to_gross">("gross_to_net");
  const [vatAmount, setVatAmount] = useState("11200000");
  const [vatMode, setVatMode] = useState<"included" | "excluded">("included");
  const [turnoverRev, setTurnoverRev] = useState("100000000");
  const [turnoverStatus, setTurnoverStatus] = useState<TaxpayerStatus>("llc");
  const [vacationDays, setVacationDays] = useState("21");
  const [draftHydrated, setDraftHydrated] = useState(false);

  const trackedToolsRef = useRef<Set<string>>(new Set());

  // Restore calculator inputs on mount (prevents work reset on browser Back / reload)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("firmus_public_calculators_v1");
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.salaryAmount === "string") setSalaryAmount(saved.salaryAmount);
        if (saved.salaryDir === "gross_to_net" || saved.salaryDir === "net_to_gross") {
          setSalaryDir(saved.salaryDir);
        }
        if (typeof saved.vatAmount === "string") setVatAmount(saved.vatAmount);
        if (saved.vatMode === "included" || saved.vatMode === "excluded") setVatMode(saved.vatMode);
        if (typeof saved.turnoverRev === "string") setTurnoverRev(saved.turnoverRev);
        if (
          saved.turnoverStatus === "llc" ||
          saved.turnoverStatus === "yatt" ||
          saved.turnoverStatus === "self_employed"
        ) {
          setTurnoverStatus(saved.turnoverStatus);
        }
        if (typeof saved.vacationDays === "string") setVacationDays(saved.vacationDays);
      }
    } catch {
      // ignore storage errors
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    try {
      sessionStorage.setItem(
        "firmus_public_calculators_v1",
        JSON.stringify({
          salaryAmount,
          salaryDir,
          vatAmount,
          vatMode,
          turnoverRev,
          turnoverStatus,
          vacationDays,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [
    draftHydrated,
    salaryAmount,
    salaryDir,
    vatAmount,
    vatMode,
    turnoverRev,
    turnoverStatus,
    vacationDays,
  ]);

  useEffect(() => {
    trackEvent({ eventName: "page_view", pagePath: "/calculators", locale });
  }, [locale]);

  const markToolUsed = (toolName: string) => {
    if (trackedToolsRef.current.has(toolName)) return;
    trackedToolsRef.current.add(toolName);
    trackEvent({ eventName: "tool_used", pagePath: "/calculators", toolName, locale });
  };

  const payrollCalc = useMemo(
    () => calculatePayrollUz({ amount: parseFloat(salaryAmount) || 0, direction: salaryDir }),
    [salaryAmount, salaryDir]
  );

  const vatCalc = useMemo(
    () => calculateVatUz({ amount: parseFloat(vatAmount) || 0, mode: vatMode }),
    [vatAmount, vatMode]
  );

  const turnoverCalc = useMemo(
    () =>
      calculateTurnoverTaxUz({
        revenue: parseFloat(turnoverRev) || 0,
        taxpayerStatus: turnoverStatus,
      }),
    [turnoverRev, turnoverStatus]
  );

  const vacationCalc = useMemo(() => {
    const parsed = parseInt(vacationDays, 10);
    const safeDays = Number.isNaN(parsed) ? 21 : Math.max(1, Math.min(60, parsed));
    return calculateVacationPayUz({
      monthlySalary: parseFloat(salaryAmount) || 0,
      days: safeDays,
    });
  }, [salaryAmount, vacationDays]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {copy.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {copy.subtitle}
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>{copy.zeroServerNote}</span>
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="h-9 text-xs gap-1.5 shrink-0">
          <Link href="/try">
            <Scale className="h-3.5 w-3.5" />
            {copy.trySverkaCta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {/* 2-Column Minimalist Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Payroll Calculator */}
        <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{d.payroll.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{d.payroll.taxArticleRef}</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={salaryDir === "gross_to_net" ? "default" : "outline"}
                className="h-8 text-[11px] flex-1"
                onClick={() => {
                  setSalaryDir("gross_to_net");
                  markToolUsed("calculator_payroll");
                }}
              >
                {d.payroll.grossToNet}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={salaryDir === "net_to_gross" ? "default" : "outline"}
                className="h-8 text-[11px] flex-1"
                onClick={() => {
                  setSalaryDir("net_to_gross");
                  markToolUsed("calculator_payroll");
                }}
              >
                {d.payroll.netToGross}
              </Button>
            </div>

            <Input
              type="number"
              min={0}
              value={salaryAmount}
              onChange={(e) => {
                setSalaryAmount(e.target.value);
                markToolUsed("calculator_payroll");
              }}
              className="h-9 font-mono text-xs"
              placeholder={d.payroll.amountPlaceholder}
            />

            <div className="rounded-lg bg-muted/40 p-3.5 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{d.payroll.grossLabel}</span>
                <span className="font-mono font-semibold"><Money amount={payrollCalc.gross} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{d.payroll.pitLabel}</span>
                <span className="font-mono text-rose-600 dark:text-rose-400">
                  -<Money amount={payrollCalc.jshds12} />
                </span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-1.5">
                <span className="font-semibold">{d.payroll.netLabel}</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  <Money amount={payrollCalc.net} />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{d.payroll.socialTaxLabel}</span>
                <span className="font-mono"><Money amount={payrollCalc.socialTax12} /></span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{d.payroll.totalEmployerCostLabel}</span>
                <span className="font-mono font-semibold"><Money amount={payrollCalc.totalEmployerCost} /></span>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="text-[11px] font-semibold text-foreground">{d.payroll.entriesLabel}</div>
              {payrollCalc.provodka.map((p, i) => {
                const entryKey = `${p.debitCode}-${p.creditCode}`;
                const localizedDesc = d.payroll.entryDescriptions[entryKey] || p.description;
                return (
                  <div key={i} className="flex justify-between text-[11px] font-mono text-muted-foreground">
                    <span>{d.debitAbbr} {p.debitCode} / {d.creditAbbr} {p.creditCode} ({localizedDesc})</span>
                    <span><Money amount={p.amount} /></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: VAT + Turnover + Vacation */}
        <div className="space-y-5">
          {/* 2. VAT Calculator */}
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{d.vat.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{d.vat.taxArticleRef}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={vatMode === "included" ? "default" : "outline"}
                  className="h-8 text-[11px] flex-1"
                  onClick={() => {
                    setVatMode("included");
                    markToolUsed("calculator_vat");
                  }}
                >
                  {d.vat.extractMode}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={vatMode === "excluded" ? "default" : "outline"}
                  className="h-8 text-[11px] flex-1"
                  onClick={() => {
                    setVatMode("excluded");
                    markToolUsed("calculator_vat");
                  }}
                >
                  {d.vat.addMode}
                </Button>
              </div>
              <Input
                type="number"
                min={0}
                value={vatAmount}
                onChange={(e) => {
                  setVatAmount(e.target.value);
                  markToolUsed("calculator_vat");
                }}
                className="h-9 font-mono text-xs"
              />
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-center">
                <div>
                  <div className="text-[10px] text-muted-foreground">{d.vat.netLabel}</div>
                  <div className="font-mono font-semibold"><Money amount={vatCalc.net} /></div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">{d.vat.vatLabel}</div>
                  <div className="font-mono font-bold text-violet-600 dark:text-violet-400">
                    <Money amount={vatCalc.vat12} />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">{d.vat.totalLabel}</div>
                  <div className="font-mono font-bold"><Money amount={vatCalc.total} /></div>
                </div>
              </div>
            </div>
          </div>

          {/* 3 & 4. Turnover Tax & Vacation Pay */}
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{d.other.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                <div className="font-semibold">{d.other.turnoverTitle(turnoverCalc.ratePercent)}</div>
                <div className="grid grid-cols-3 gap-1">
                  {(["llc", "yatt", "self_employed"] as TaxpayerStatus[]).map((st) => (
                    <Button
                      key={st}
                      type="button"
                      size="sm"
                      variant={turnoverStatus === st ? "default" : "outline"}
                      className="h-6 px-1.5 text-[10px]"
                      onClick={() => {
                        setTurnoverStatus(st);
                        markToolUsed("calculator_turnover");
                      }}
                    >
                      {d.other.turnoverStatuses[st]}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={0}
                  value={turnoverRev}
                  onChange={(e) => {
                    setTurnoverRev(e.target.value);
                    markToolUsed("calculator_turnover");
                  }}
                  className="h-8 font-mono text-xs"
                />
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{d.other.turnoverTaxLabel}</span>
                  <span className="font-mono font-bold"><Money amount={turnoverCalc.tax} /></span>
                </div>
                {turnoverCalc.annualThresholdUzs !== null && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{d.other.turnoverThresholdLabel}</span>
                    <span className="font-mono">
                      <Money amount={turnoverCalc.annualThresholdUzs} />
                    </span>
                  </div>
                )}
                {turnoverCalc.exceedsThreshold && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    {d.other.turnoverExceedsWarning}
                  </div>
                )}
                {turnoverCalc.verificationStatus === "unverified" ? (
                  <div className="rounded-md border border-amber-500/35 bg-amber-500/10 p-2 text-[10px] text-amber-800 dark:text-amber-300 space-y-0.5">
                    <div className="flex items-center gap-1 font-semibold">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>
                        {locale === "ru"
                          ? "Неподтверждённое правило — требуется проверка"
                          : locale === "en"
                          ? "Unverified rule — manual check required"
                          : "Tasdiqlanmagan qoida — qoʻshimcha tekshiring"}
                      </span>
                    </div>
                    {turnoverCalc.ruleNote && (
                      <p className="leading-snug opacity-90">{turnoverCalc.ruleNote}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>
                      {locale === "ru"
                        ? `Проверено: ${turnoverCalc.lastVerifiedAt}`
                        : locale === "en"
                        ? `Verified: ${turnoverCalc.lastVerifiedAt}`
                        : `Tasdiqlangan: ${turnoverCalc.lastVerifiedAt}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                <div className="font-semibold">{d.other.vacationTitle(vacationCalc.days)}</div>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={vacationDays}
                  onChange={(e) => {
                    setVacationDays(e.target.value);
                    markToolUsed("calculator_vacation");
                  }}
                  className="h-8 font-mono text-xs"
                />
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">{d.other.vacationNetLabel}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    <Money amount={vacationCalc.netVacation} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note & CTA */}
      <div className="rounded-xl border border-border/50 bg-card/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5 text-muted-foreground">
          <div className="font-medium text-foreground">{copy.disclaimer}</div>
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="font-mono">{activeRules.versionId}</span>
            <span>•</span>
            <span>BHM: {activeRules.bhmUzs.toLocaleString("en-US")} soʻm</span>
            {unverifiedRules.length > 0 && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  {locale === "ru"
                    ? `${unverifiedRules.length} правила не подтверждены`
                    : locale === "en"
                    ? `${unverifiedRules.length} rules unverified`
                    : `${unverifiedRules.length} ta qoida tasdiqlanmagan`}
                </span>
              </>
            )}
            <span>•</span>
            <a
              href={activeRules.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:underline"
            >
              {copy.sourceLabel} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <Button
          asChild
          size="sm"
          className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white shadow-sm shrink-0"
          onClick={() =>
            trackEvent({
              eventName: "register_clicked",
              pagePath: "/calculators",
              toolName: "calculators_bottom_cta",
              locale,
            })
          }
        >
          <Link href="/register">{copy.registerCta}</Link>
        </Button>
      </div>
    </div>
  );
}
