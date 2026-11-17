"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getShellSharedDict } from "@/lib/i18n/domains/shell-shared";

const COOKIE_KEY = "firmus_cookie_consent_v1";

export function CookieConsent() {
  const { locale } = useTranslation();
  const d = getShellSharedDict(locale);
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
            {d.shared.cookieConsent.message}{" "}
            <Link href="/privacy" className="text-primary underline">
              {d.shared.cookieConsent.privacyLink}
            </Link>
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleAccept}>
              {d.shared.cookieConsent.acceptBtn}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
