"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { AppStateProvider } from "@/lib/context/app-state";
import { Toaster } from "sonner";
import { CookieConsent } from "@/components/shared/cookie-consent";
import type { Locale } from "@/lib/i18n/server-locale";

export function Providers({
  children,
  initialLocale = "uz",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AppStateProvider initialLocale={initialLocale}>
        {children}
        <CookieConsent />
        <Toaster position="top-right" richColors closeButton />
      </AppStateProvider>
    </ThemeProvider>
  );
}
