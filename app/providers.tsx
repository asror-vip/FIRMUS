"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ThemeProvider } from "next-themes";
import { LocaleProvider } from "@/lib/context/locale-context";
import { CookieConsent } from "@/components/shared/cookie-consent";
import type { Locale } from "@/lib/i18n/server-locale";

const LazyToaster = dynamic(
  () => import("sonner").then((mod) => mod.Toaster),
  { ssr: false }
);

export function Providers({
  children,
  initialLocale = "uz",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <LocaleProvider initialLocale={initialLocale}>
        {children}
        <CookieConsent />
        <LazyToaster position="top-right" richColors closeButton />
      </LocaleProvider>
    </ThemeProvider>
  );
}
