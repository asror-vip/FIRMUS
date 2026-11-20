"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useLocale } from "@/lib/context/locale-context";
import { getAuthLegalDict } from "@/lib/i18n/domains/auth-legal";
import { LanguageToggle } from "@/components/shared/language-toggle";

function renderFormattedText(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function PrivacyView() {
  const { language: locale } = useLocale();
  const [hasSession, setHasSession] = React.useState(false);

  React.useEffect(() => {
    try {
      setHasSession(document.cookie.includes("sb-"));
    } catch {}
  }, []);

  const d = getAuthLegalDict(locale).privacy;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={hasSession ? "/" : "/login"}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {hasSession ? d.backToApp : d.backToLogin}
          </Link>

          <LanguageToggle />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{d.title}</h1>
                <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                  {d.badge}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{d.lastUpdated}</p>
            </div>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-foreground/90">
            {d.sections.map((section) => (
              <section key={section.heading} className="space-y-1.5">
                <h2 className="text-sm font-bold text-foreground">{section.heading}</h2>
                {section.paragraphs?.map((paragraph, pIdx) => (
                  <p key={pIdx}>{renderFormattedText(paragraph)}</p>
                ))}
                {section.bullets && (
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    {section.bullets.map((bullet, bIdx) => (
                      <li key={bIdx}>{renderFormattedText(bullet)}</li>
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
