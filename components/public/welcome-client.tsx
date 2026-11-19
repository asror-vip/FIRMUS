"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { trackEvent } from "@/lib/analytics/track-event";
import { getTurnoverRateRangeLabel, resolveUzTaxRules } from "@/lib/services/uz-tax-calculator";
import { Button } from "@/components/ui/button";
import {
  Scale,
  Calculator,
  ShieldCheck,
  Building2,
  ArrowRight,
  Lock,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";

const COPY = {
  uz: {
    badge: "Oʻzbekiston buxgalterlari uchun • 2026 soliq qoidalari",
    headline: "Bank koʻchirmasi, 1C sverka va aniq soliq hisobi — bir joyda",
    subhead:
      "Bir nechta mijozga xizmat qiladigan buxgalterlar uchun tez va maxfiy ish vositasi. Roʻyxatdan oʻtmasdan hoziroq brauzeringiz ichida sinab koʻring.",
    ctaTry: "Bank ↔ 1C Sverkadan boshlash (Loginsiz)",
    ctaCalc: "Bepul soliq kalkulyatorlari",
    privacyNote: "Mehmon rejimida yuklangan fayllar serverga ketmaydi — hisob-kitob brauzeringiz ichida bajariladi.",
    pillarsTitle: "Nega buxgalterlar FIRMUS ni tanlaydi?",
    pillars: [
      {
        icon: Scale,
        title: "Bank ↔ 1C tezkor sverka",
        desc: "Excel, CSV va 1CClientBankExchange (.txt) fayllarini bir necha soniyada solishtiring, farqlarni va 21-BHMS schyotlarini koʻring.",
      },
      {
        icon: Calculator,
        title: "2026-yil rasmiy soliq qoidalari",
        desc: "QQS 12%, Maosh (JShDS/Ijtimoiy), YaTT va oʻzini bandlar uchun 1%, MChJ 4% va 12 000 BHM QQS chegarasi bitta tekshirilgan jadvalda.",
      },
      {
        icon: Building2,
        title: "Koʻp mijozli boshqaruv",
        desc: "Bitta akkaunt ichida bir nechta MChJ va YaTT mijozlarni ajratib yuriting, har bir mijozning fayli va tarixi alohida saqlanadi.",
      },
      {
        icon: ShieldCheck,
        title: "Maxfiylik va xavfsizlik",
        desc: "Mehmon rejimida fayllar kompyuteringizdan chiqmaydi. Roʻyxatdan oʻtganingizda esa har bir korxona maʼlumoti qator darajasida (RLS) himoyalanadi.",
      },
    ],
    freeVsRegTitle: "Loginsiz nima ishlaydi va roʻyxatdan oʻtsangiz nima ochiladi?",
    guestColTitle: "Loginsiz (hoziroq bepul)",
    guestItems: [
      "4 ta aniq kalkulyator: QQS, Maosh, Aylanma soliq, Taʼtil puli",
      "Bank ↔ 1C fayllarini brauzer ichida solishtirish (Excel/CSV/TXT)",
      "Farqlar jadvali va 21-BHMS schyot takliflarini koʻrish",
      "Fayllar serverga yuklanmaydi (100% maxfiy)",
    ],
    memberColTitle: "Bepul roʻyxatdan oʻtgach ochiladi",
    memberItems: [
      "Natijalarni 1C (.txt / .xml) va Excel/CSV koʻrinishida yuklab olish",
      "Bajarilgan sverkalar va hujjatlar tarixini oyma-oy saqlash",
      "Koʻp mijoz (MChJ / YaTT) profillari va 1C integratsiyasi",
      "Noaniq qatorlar va shartnomalar uchun AI yordamchi tekshiruvi",
    ],
    ctaRegister: "Bepul roʻyxatdan oʻtish",
    rulesFootnotePrefix: "Amaldagi soliq qoidalari:",
  },
  ru: {
    badge: "Для бухгалтеров Узбекистана • Налоговые правила 2026",
    headline: "Банковская выписка, сверка с 1С и точный расчёт налогов — в одном окне",
    subhead:
      "Быстрый и приватный инструмент для бухгалтеров, ведущих несколько клиентов. Попробуйте прямо сейчас в браузере без регистрации.",
    ctaTry: "Открыть сверку Банк ↔ 1С (Без входа)",
    ctaCalc: "Бесплатные калькуляторы",
    privacyNote: "В гостевом режиме файлы не отправляются на сервер — вся обработка идёт локально в вашем браузере.",
    pillarsTitle: "Почему бухгалтеры выбирают FIRMUS",
    pillars: [
      {
        icon: Scale,
        title: "Быстрая сверка Банк ↔ 1С",
        desc: "Сравнивайте Excel, CSV и 1CClientBankExchange (.txt) за секунды, находите расхождения и получайте проводки по НСБУ №21.",
      },
      {
        icon: Calculator,
        title: "Актуальные ставки 2026 года",
        desc: "НДС 12%, зарплата (НДФЛ/Соцналог), 1% для ИП и самозанятых, 4% для ООО и порог НДС 12 000 БРВ из единого проверенного справочника.",
      },
      {
        icon: Building2,
        title: "Ведение нескольких клиентов",
        desc: "Управляйте несколькими ООО и ИП в одном аккаунте: документы, сверки и история по каждому клиенту строго изолированы.",
      },
      {
        icon: ShieldCheck,
        title: "Приватность данных",
        desc: "В гостевом режиме файлы не покидают ваш компьютер. После регистрации данные защищены изоляцией на уровне строк (RLS).",
      },
    ],
    freeVsRegTitle: "Что доступно без входа и что открывается после регистрации",
    guestColTitle: "Без регистрации (сразу бесплатно)",
    guestItems: [
      "4 точных калькулятора: НДС, Зарплата, Налог с оборота, Отпускные",
      "Сверка файлов Банк ↔ 1С прямо в браузере (Excel/CSV/TXT)",
      "Таблица расхождений и подсказки счетов НСБУ №21",
      "Файлы не загружаются на сервер",
    ],
    memberColTitle: "Открывается после бесплатной регистрации",
    memberItems: [
      "Экспорт и скачивание результатов в 1С (.txt / .xml) и CSV",
      "Сохранение истории сверок и документов по месяцам",
      "Несколько клиентов (ООО / ИП) и подключение к 1С",
      "AI-проверка спорных строк, чеков и договоров",
    ],
    ctaRegister: "Зарегистрироваться бесплатно",
    rulesFootnotePrefix: "Актуальная версия правил:",
  },
  en: {
    badge: "For Uzbekistan accountants • 2026 Tax Rules",
    headline: "Bank statements, 1C reconciliation, and exact tax math — in one workspace",
    subhead:
      "A fast, privacy-first toolkit built for multi-client accountants. Try right now inside your browser with no signup required.",
    ctaTry: "Try Bank ↔ 1C Reconcile (No login)",
    ctaCalc: "Free Tax Calculators",
    privacyNote: "In guest mode your files never leave your browser — zero server uploads and zero AI calls.",
    pillarsTitle: "Built for everyday accounting speed",
    pillars: [
      {
        icon: Scale,
        title: "Instant Bank ↔ 1C Reconciliation",
        desc: "Match Excel, CSV, and 1CClientBankExchange (.txt) statements locally, spot mismatches, and map 21-BHMS accounts.",
      },
      {
        icon: Calculator,
        title: "Verified 2026 Tax Rules",
        desc: "12% VAT, payroll (PIT/Social), 1% turnover tax for sole proprietors & self-employed, 4% for LLCs, and 12,000 BHM VAT limit.",
      },
      {
        icon: Building2,
        title: "Multi-Client Management",
        desc: "Switch between LLC and YaTT clients inside one account with strict per-client isolation.",
      },
      {
        icon: ShieldCheck,
        title: "Privacy First",
        desc: "Guest tools run 100% locally in your browser; registered workspaces are isolated with database-level RLS.",
      },
    ],
    freeVsRegTitle: "Free without signup vs free account",
    guestColTitle: "Guest mode (instant)",
    guestItems: [
      "4 tax calculators: VAT, Payroll, Turnover Tax, Vacation Pay",
      "Browser-side Bank ↔ 1C file reconciliation (Excel/CSV/TXT)",
      "Mismatch table & 21-BHMS account mapping",
      "Files stay on your device",
    ],
    memberColTitle: "Unlocked with a free account",
    memberItems: [
      "Download 1C (.txt / .xml) and CSV exports",
      "Save monthly reconciliation and document history",
      "Manage multiple clients & 1C integration",
      "AI assistance for ambiguous lines & contracts",
    ],
    ctaRegister: "Create free account",
    rulesFootnotePrefix: "Active tax rules version:",
  },
};

export function WelcomeClient() {
  const { locale } = useTranslation();
  const c = COPY[locale] ?? COPY.uz;
  const rules = resolveUzTaxRules();
  const turnoverRange = getTurnoverRateRangeLabel();

  useEffect(() => {
    trackEvent({ eventName: "page_view", pagePath: "/", locale });
  }, [locale]);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="max-w-3xl space-y-5 pt-2 sm:pt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>{c.badge}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
          {c.headline}
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
          {c.subhead}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            asChild
            size="lg"
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm h-10 px-5 shadow-sm gap-2"
          >
            <Link href="/try">
              <Scale className="h-4 w-4" />
              {c.ctaTry}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="text-xs sm:text-sm h-10 px-5 gap-2">
            <Link href="/calculators">
              <Calculator className="h-4 w-4" />
              {c.ctaCalc}
            </Link>
          </Button>
        </div>

        <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>{c.privacyNote}</span>
        </p>
      </section>

      {/* 4 Core Pillars — Unified Segmented Ribbon */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {c.pillarsTitle}
        </h2>
        <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/50 overflow-hidden">
          {c.pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-5 space-y-2.5">
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Guest vs Registered Comparison — 2-segment panel */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {c.freeVsRegTitle}
        </h2>
        <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{c.guestColTitle}</span>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              {c.guestItems.map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5 sm:p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <span>{c.memberColTitle}</span>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {c.memberItems.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2">
              <Button
                asChild
                size="sm"
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-9 px-4 shadow-sm gap-1.5"
                onClick={() =>
                  trackEvent({
                    eventName: "register_clicked",
                    pagePath: "/",
                    toolName: "welcome_comparison_cta",
                    locale,
                  })
                }
              >
                <Link href="/register">
                  {c.ctaRegister}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          {c.rulesFootnotePrefix}{" "}
          <span className="font-mono">{rules.versionId}</span> • Aylanma soligʻi {turnoverRange} •
          BHM {rules.bhmUzs.toLocaleString("en-US")} soʻm ({rules.lastVerifiedAt})
        </p>
      </section>
    </div>
  );
}
