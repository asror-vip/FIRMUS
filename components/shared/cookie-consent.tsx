"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { useLocale } from "@/lib/context/locale-context";

const COOKIE_KEY = "firmus_cookie_consent_v1";

const COOKIE_COPY = {
  uz: {
    message:
      "FIRMUS xizmat sifati va seans xavfsizligi uchun texnik cookie fayllardan foydalanadi.",
    privacyLink: "Maxfiylik siyosati",
    acceptBtn: "Roziman",
  },
  ru: {
    message:
      "FIRMUS использует технические файлы cookie для качества сервиса и безопасности сессии.",
    privacyLink: "Политика конфиденциальности",
    acceptBtn: "Принять",
  },
  en: {
    message:
      "FIRMUS uses essential technical cookies for service quality and session security.",
    privacyLink: "Privacy Policy",
    acceptBtn: "Accept",
  },
} as const;

export function CookieConsent() {
  const { language: locale } = useLocale();
  const copy = COOKIE_COPY[locale] ?? COOKIE_COPY.uz;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COOKIE_KEY);
      if (!saved) {
        setVisible(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    } catch {}
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 rounded-xl border border-border bg-card/95 backdrop-blur-md p-4 shadow-2xl">
      <div className="flex items-start gap-3 text-xs">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
          <Cookie className="h-4 w-4" />
        </div>
        <div className="space-y-2 flex-1">
          <p className="text-foreground leading-relaxed">
            {copy.message}{" "}
            <Link href="/privacy" className="text-primary underline">
              {copy.privacyLink}
            </Link>
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md px-3 h-7 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              onClick={handleAccept}
            >
              {copy.acceptBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
