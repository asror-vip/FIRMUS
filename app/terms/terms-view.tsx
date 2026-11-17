"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { useAppState } from "@/lib/context/app-state";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getAuthLegalDict } from "@/lib/i18n/domains/auth-legal";
import { LanguageToggle } from "@/components/shared/language-toggle";

export function TermsView() {
  const { user } = useAppState();
  const { locale } = useTranslation();
  const d = getAuthLegalDict(locale).terms;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={user ? "/" : "/login"}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {user ? d.backToApp : d.backToLogin}
          </Link>

          <LanguageToggle />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{d.title}</h1>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                  {d.badge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{d.subtitle}</p>
            </div>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
            {d.sections.map((section) => (
              <section key={section.heading} className="space-y-1.5">
                <h2 className="text-sm font-bold text-foreground">{section.heading}</h2>
                {section.paragraphs?.map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {section.bullets.map((bullet, bIdx) => (
                      <li key={bIdx}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
