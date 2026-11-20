import React from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/public/public-header";
import { GuideTopBanner } from "@/components/shared/guide-top-banner";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <GuideTopBanner />
      <PublicHeader />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {children}
      </main>
      <footer className="border-t border-border/50 py-6 text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} FIRMUS — Oʻzbekiston buxgalterlari uchun aniq hisob va 1C vositalari</span>
          <div className="flex items-center gap-4">
            <Link href="/calculators" className="hover:text-foreground transition-colors">
              Kalkulyatorlar
            </Link>
            <Link href="/try" className="hover:text-foreground transition-colors">
              Bank ↔ 1C Sverka
            </Link>
            <Link href="/guide" className="hover:text-foreground transition-colors">
              Yoʻriqnoma
            </Link>
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Maxfiylik siyosati
            </Link>
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Ommaviy oferta (Shartlar)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
