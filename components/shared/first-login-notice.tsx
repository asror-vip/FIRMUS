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
  const [checked, setChecked] = useState(true);

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
    if (!checked) return;
    try {
      const key = `${NOTICE_KEY_PREFIX}${user.id}`;
      localStorage.setItem(
        key,
        JSON.stringify({ accepted: true, version: "2026-11-20", at: new Date().toISOString() })
      );
    } catch {}
    setVisible(false);
  };

  const checkboxLabel =
    locale === "ru"
      ? "Я ознакомился с условиями и подтверждаю, что все расчеты носят рекомендательный характер, а итоговое решение принимает бухгалтер."
      : locale === "en"
      ? "I have reviewed the terms and confirm that all calculations are advisory and final accounting decisions remain my responsibility."
      : "Shartlar bilan tanishdim hamda barcha hisob-kitoblar yordamchi tavsiya ekanini va yakuniy javobgarlik oʻz zimmamda ekanini tasdiqlayman.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="firmus-first-login-notice-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-150"
    >
      <div className="w-full max-w-[420px] rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-4">
        <div className="space-y-2.5">
          <h2
            id="firmus-first-login-notice-title"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {d.shared.firstLoginNotice.title}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {d.shared.firstLoginNotice.bodyBeforeTerms}{" "}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-semibold underline decoration-dotted underline-offset-4 hover:text-primary transition-colors"
            >
              {d.shared.firstLoginNotice.termsLink}
            </Link>{" "}
            {d.shared.firstLoginNotice.bodyBetweenLinks}{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-semibold underline decoration-dotted underline-offset-4 hover:text-primary transition-colors"
            >
              {d.shared.firstLoginNotice.privacyLink}
            </Link>{" "}
            {d.shared.firstLoginNotice.bodyAfterPrivacy}
          </p>

          <label className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-violet-600 shrink-0 cursor-pointer"
            />
            <span>{checkboxLabel}</span>
          </label>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            disabled={!checked}
            onClick={handleDismiss}
            className="h-9 rounded-lg px-6 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white"
          >
            {d.shared.firstLoginNotice.acceptBtn}
          </Button>
        </div>
      </div>
    </div>
  );
}
