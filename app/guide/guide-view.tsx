"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/context/locale-context";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { LEX_UZ_BHMS21_URL, LEX_UZ_TAX_CODE_URL } from "@/lib/services/uz-tax-calculator";
import { guideContentUz } from "./guide-content-uz";
import type { GuideContent } from "./guide-types";

const contentCache: Partial<Record<"uz" | "ru" | "en", GuideContent>> = {
  uz: guideContentUz,
};

async function loadGuideContent(locale: "uz" | "ru" | "en"): Promise<GuideContent> {
  const cached = contentCache[locale];
  if (cached) return cached;
  if (locale === "ru") {
    const mod = await import("./guide-content-ru");
    contentCache.ru = mod.guideContentRu;
    return mod.guideContentRu;
  }
  if (locale === "en") {
    const mod = await import("./guide-content-en");
    contentCache.en = mod.guideContentEn;
    return mod.guideContentEn;
  }
  return guideContentUz;
}

export function GuideView() {
  const { language: locale } = useLocale();
  const [hasSession, setHasSession] = useState(false);
  const [content, setContent] = useState<GuideContent>(() => contentCache[locale] ?? guideContentUz);

  useEffect(() => {
    try {
      setHasSession(document.cookie.includes("sb-"));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const cached = contentCache[locale];
    if (cached) {
      setContent(cached);
      return;
    }
    let active = true;
    void loadGuideContent(locale).then((loaded) => {
      if (active) setContent(loaded);
    });
    return () => {
      active = false;
    };
  }, [locale]);

  const tocItems = [
    ...content.sections.map((s) => ({ id: s.id, title: s.title })),
    { id: content.plansSectionId, title: content.plansTitle },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Top nav */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href={hasSession ? "/" : "/welcome"}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {hasSession ? content.backToApp : content.backToHome}
          </Link>
          <LanguageToggle />
        </div>

        {/* Hero header */}
        <header className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
            <BookOpen className="h-3.5 w-3.5" />
            <span>{content.badge}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{content.title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{content.subtitle}</p>
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
            <span>{content.updatedLabel}</span>
            <span>•</span>
            <a
              href={LEX_UZ_TAX_CODE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:underline"
            >
              Soliq kodeksi (lex.uz) <ExternalLink className="h-3 w-3" />
            </a>
            <span>•</span>
            <a
              href={LEX_UZ_BHMS21_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400 hover:underline"
            >
              21-son BHMS (lex.uz) <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </header>

        {/* Table of contents */}
        <nav className="rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-5 space-y-2.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {content.tocTitle}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
            {tocItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-foreground/90 hover:text-violet-600 dark:hover:text-violet-400 hover:underline transition-colors py-0.5"
              >
                {item.title}
              </a>
            ))}
          </div>
        </nav>

        {/* Main sections */}
        <div className="space-y-6">
          {content.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-6 rounded-2xl border border-border/60 bg-card/50 p-5 sm:p-6 space-y-4"
            >
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">{section.title}</h2>
              {section.lead && (
                <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                  {section.lead}
                </p>
              )}
              {section.paragraphs && (
                <div className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
                  {section.paragraphs.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              )}
              {section.bullets && (
                <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                  {section.bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-violet-600 dark:text-violet-400" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.steps && (
                <div className="space-y-3">
                  {section.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/50 bg-background/70 p-4 space-y-1"
                    >
                      <div className="text-sm font-semibold text-foreground">{step.title}</div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {section.note && (
                <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  {section.note}
                </div>
              )}
            </section>
          ))}

          {/* Subscriptions & Pricing Section */}
          <section
            id={content.plansSectionId}
            className="scroll-mt-6 rounded-2xl border border-border/60 bg-card/50 p-5 sm:p-6 space-y-4"
          >
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">{content.plansTitle}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{content.plansLead}</p>

            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/60 text-muted-foreground">
                    <th className="p-3 font-semibold">{content.plansTableHeaders.plan}</th>
                    <th className="p-3 font-semibold">{content.plansTableHeaders.price}</th>
                    <th className="p-3 font-semibold">{content.plansTableHeaders.credits}</th>
                    <th className="p-3 font-semibold">{content.plansTableHeaders.models}</th>
                    <th className="p-3 font-semibold">{content.plansTableHeaders.files}</th>
                    <th className="p-3 font-semibold">{content.plansTableHeaders.entities}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {content.plans.map((plan) => (
                    <tr key={plan.name} className="align-top bg-background/40">
                      <td className="p-3 font-bold text-foreground whitespace-nowrap">
                        <div>{plan.name}</div>
                        {plan.badge && (
                          <span className="mt-1 inline-block rounded-full bg-violet-600/15 text-violet-700 dark:text-violet-300 px-2 py-0.5 text-[10px] font-semibold">
                            {plan.badge}
                          </span>
                        )}
                      </td>
                      <td className="p-3 space-y-1">
                        <div className="font-semibold text-foreground">{plan.monthlyPrice}</div>
                        <div className="text-[11px] text-muted-foreground">{plan.annualPrice}</div>
                      </td>
                      <td className="p-3 text-muted-foreground">{plan.aiCredits}</td>
                      <td className="p-3 text-muted-foreground">{plan.models}</td>
                      <td className="p-3 space-y-1 text-muted-foreground">
                        <div>{plan.pdfLimit}</div>
                        <div className="text-[11px] opacity-85">{plan.extra}</div>
                      </td>
                      <td className="p-3 text-muted-foreground">{plan.entitiesLimit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed pt-1">
              {content.plansFootnotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Quick links & legal footer */}
        <footer className="rounded-2xl border border-border/60 bg-muted/30 p-5 sm:p-6 space-y-4">
          <div className="space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {content.quickLinksTitle}
            </div>
            <div className="flex flex-wrap gap-2">
              {content.quickLinks.map((ql) => (
                <Link
                  key={ql.href}
                  href={ql.href}
                  className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-violet-500/50 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                  {ql.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t border-border/50 pt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{content.legalLinksLabel}</span>
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {content.privacyLabel}
            </Link>
            <span>•</span>
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {content.termsLabel}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
