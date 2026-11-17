"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppState } from "@/lib/context/app-state";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getShellSharedDict } from "@/lib/i18n/domains/shell-shared";
import { Button } from "@/components/ui/button";

const NOTICE_KEY_PREFIX = "firmus_first_login_notice_v1:";

export function FirstLoginNotice() {
  const { user } = useAppState();
  const { locale } = useTranslation();
  const d = getShellSharedDict(locale);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const key = `${NOTICE_KEY_PREFIX}${user.id}`;
      if (!localStorage.getItem(key)) {
        setVisible(true);
      }
    } catch {
      // Ignore storage access errors
    }
  }, [user?.id]);

  if (!visible || !user?.id) return null;

  const handleDismiss = () => {
    try {
      const key = `${NOTICE_KEY_PREFIX}${user.id}`;
      localStorage.setItem(key, JSON.stringify({ accepted: true, at: new Date().toISOString() }));
    } catch {}
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="firmus-first-login-notice-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      <div className="w-full max-w-[380px] rounded-3xl border border-border/80 bg-card p-6 shadow-2xl space-y-4">
        <div className="space-y-2.5">
          <h2
            id="firmus-first-login-notice-title"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {d.shared.firstLoginNotice.title}
          </h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {d.shared.firstLoginNotice.bodyBeforeTerms}{" "}
            <Link
              href="/terms"
              onClick={handleDismiss}
              className="text-foreground underline decoration-dotted underline-offset-4 hover:text-primary transition-colors"
            >
              {d.shared.firstLoginNotice.termsLink}
            </Link>{" "}
            {d.shared.firstLoginNotice.bodyBetweenLinks}{" "}
            <Link
              href="/privacy"
              onClick={handleDismiss}
              className="text-foreground underline decoration-dotted underline-offset-4 hover:text-primary transition-colors"
            >
              {d.shared.firstLoginNotice.privacyLink}
            </Link>{" "}
            {d.shared.firstLoginNotice.bodyAfterPrivacy}
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            onClick={handleDismiss}
            className="h-9 rounded-full px-6 text-xs font-semibold"
          >
            {d.shared.firstLoginNotice.acceptBtn}
          </Button>
        </div>
      </div>
    </div>
  );
}
