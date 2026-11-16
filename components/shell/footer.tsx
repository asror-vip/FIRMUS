"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto shrink-0 border-t border-border bg-card/30 px-4 sm:px-6 lg:px-8 py-3.5 text-[11px] text-muted-foreground">
      <div className="mx-auto max-w-[1400px] w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-foreground tracking-tight text-xs">FIRMUS</span>
          <span className="text-border">•</span>
          <span>{t.footer.rights}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t.footer.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Maxfiylik
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Oferta
          </Link>
          <Link href="/settings" className="hover:text-foreground transition-colors">
            {t.footer.settings}
          </Link>
          <a
            href="https://soliq.uz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <span>{t.footer.soliqPortal}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://didox.uz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <span>{t.footer.didoxEdo}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-muted-foreground/60 hidden md:inline">
            {t.footer.serverTime}
          </span>
        </div>
      </div>
    </footer>
  );
}
