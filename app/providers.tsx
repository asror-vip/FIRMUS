"use client";

import React, { useState } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppStateProvider } from "@/lib/mock/store";
import { Toaster } from "sonner";
import { CommandPalette } from "@/components/shell/command-palette";
import { AiDrawer } from "@/components/shell/ai-drawer";
import { CookieConsent } from "@/components/shared/cookie-consent";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          {children}
          <CommandPalette />
          <AiDrawer />
          <CookieConsent />
          <Toaster position="top-right" richColors closeButton />
        </AppStateProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
