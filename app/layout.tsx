import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { normalizeLocale, type Locale } from "@/lib/i18n/server-locale";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FIRMUS — AI-Powered Business & Accounting Automation",
  description:
    "Oʻzbekiston biznesi uchun avtomatlashtirilgan buxgalteriya, 1C va Didox EDO integratsiyasi, moliyaviy hisobotlar va AI Copilot tizimi.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLocale: Locale =
    normalizeLocale(cookieStore.get("firmus_lang")?.value) || "uz";

  return (
    <html
      lang={initialLocale}
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
