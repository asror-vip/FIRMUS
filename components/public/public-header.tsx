"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useLocale } from "@/lib/context/locale-context";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/track-event";
import { Sun, Moon, Calculator, Scale, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LABELS = {
  uz: {
    home: "Bosh sahifa",
    calculators: "Kalkulyatorlar",
    sverka: "Bank ↔ 1C Sverka",
    login: "Kirish",
    register: "Bepul boshlash",
  },
  ru: {
    home: "Главная",
    calculators: "Калькуляторы",
    sverka: "Сверка Банк ↔ 1С",
    login: "Войти",
    register: "Начать бесплатно",
  },
  en: {
    home: "Home",
    calculators: "Calculators",
    sverka: "Bank ↔ 1C Reconcile",
    login: "Sign in",
    register: "Start free",
  },
};

export function PublicHeader() {
  const pathname = usePathname();
  const { language: locale } = useLocale();
  const { theme, setTheme } = useTheme();
  const labels = NAV_LABELS[locale] ?? NAV_LABELS.uz;

  const navItems = [
    { href: "/", match: ["/", "/welcome"], label: labels.home, icon: Home },
    { href: "/calculators", match: ["/calculators"], label: labels.calculators, icon: Calculator },
    { href: "/try", match: ["/try"], label: labels.sverka, icon: Scale },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/brand/firmus-wordmark.png"
            alt="FIRMUS"
            width={127}
            height={32}
            priority
            className="h-8 w-auto object-contain dark:hidden"
          />
          <Image
            src="/brand/firmus-wordmark-dark.png"
            alt="FIRMUS"
            width={127}
            height={32}
            priority
            className="h-8 w-auto object-contain hidden dark:block"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.match.includes(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 hidden dark:block" />
            <Moon className="h-4 w-4 block dark:hidden" />
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 text-xs px-2.5">
            <Link href="/login">{labels.login}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="h-8 text-xs px-3 bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
            onClick={() =>
              trackEvent({
                eventName: "register_clicked",
                pagePath: pathname === "/welcome" ? "/" : pathname,
                toolName: "header_cta",
                locale,
              })
            }
          >
            <Link href="/register">{labels.register}</Link>
          </Button>
        </div>
      </div>

      {/* Mobile quick links */}
      <div className="md:hidden border-t border-border/40 px-4 py-1.5 flex items-center gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.match.includes(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap",
                active
                  ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
