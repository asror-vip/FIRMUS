"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppState } from "@/lib/context/app-state";
import { Button } from "@/components/ui/button";

const NOTICE_KEY_PREFIX = "firmus_first_login_notice_v1:";

export function FirstLoginNotice() {
  const { user } = useAppState();
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
            Yodda tuting
          </h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            FIRMUS AI — bu yordamchi vosita boʻlib, ayrim javob yoki hisoblarda xato qilishi mumkin. Yakuniy provodka va soliq hisobotlarini tasdiqlashdan oldin tekshirib oling. Yuklangan maʼlumotlar{" "}
            <Link
              href="/terms"
              onClick={handleDismiss}
              className="text-foreground underline decoration-dotted underline-offset-4 hover:text-primary transition-colors"
            >
              Foydalanish shartlari
            </Link>{" "}
            va{" "}
            <Link
              href="/privacy"
              onClick={handleDismiss}
              className="text-foreground underline decoration-dotted underline-offset-4 hover:text-primary transition-colors"
            >
              Maxfiylik siyosati
            </Link>{" "}
            asosida himoyalanadi (karta va JShShIR maʼlumotlari avtomatik yashiriladi).
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            onClick={handleDismiss}
            className="h-9 rounded-full px-6 text-xs font-semibold"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
