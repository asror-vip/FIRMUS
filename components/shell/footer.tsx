"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-12 border-t border-border/80 pt-6 pb-8 text-xs text-muted-foreground">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Brand & Standards */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground tracking-tight text-sm">FIRMUS</span>
            <span className="text-muted-foreground/60">•</span>
            <span className="text-[11px] text-muted-foreground">
              {t.footer.standards}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            {t.footer.rights}
          </p>
        </div>

        {/* Right: Status & Quick Links */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t.footer.status}</span>
          </div>

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
            <span>{t.footer.sync}</span>
          </div>

          <span className="text-muted-foreground/40 hidden sm:inline">•</span>

          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
            v1.0.4
          </span>
        </div>
      </div>

      {/* Sub-footer links */}
      <div className="mt-4 pt-4 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-muted-foreground/70">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/settings" className="hover:text-foreground transition-colors">
            {t.footer.settings}
          </Link>
          <Link href="/integrations" className="hover:text-foreground transition-colors">
            {t.footer.integrations}
          </Link>
          <Link href="/reports" className="hover:text-foreground transition-colors">
            {t.footer.reports}
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Maxfiylik siyosati
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Oferta
          </Link>
          <a
            href="https://soliq.uz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <span>{t.footer.soliqPortal}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://didox.uz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <span>{t.footer.didoxEdo}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="text-[10px] text-muted-foreground/60">
          {t.footer.serverTime}
        </div>
      </div>
    </footer>
  );
}
