"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/context/locale-context";

const DISMISS_KEY = "firmus_guide_banner_dismissed_v1";

const BANNER_COPY = {
  uz: {
    text: "Saytda ishlashdan oldin yoʻriqnoma bilan tanishing:",
    link: "Toʻliq yoʻriqnoma →",
    close: "Yopish",
  },
  ru: {
    text: "Перед началом работы ознакомьтесь с руководством:",
    link: "Открыть руководство →",
    close: "Закрыть",
  },
  en: {
    text: "Before getting started, please read the user guide:",
    link: "Open full guide →",
    close: "Close",
  },
} as const;

export function GuideTopBanner() {
  const pathname = usePathname();
  const { language: locale } = useLocale();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  if (dismissed || pathname === "/guide") {
    return null;
  }

  const copy = BANNER_COPY[locale] ?? BANNER_COPY.uz;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full bg-violet-600 text-white border-b border-violet-700/60 shrink-0">
      <div className="mx-auto max-w-6xl pl-3 pr-10 py-1 min-h-[28px] flex items-center justify-center gap-3 text-[11px] leading-tight relative">
        <span className="truncate opacity-95">{copy.text}</span>
        <Link
          href="/guide"
          className="inline-flex items-center min-h-[24px] px-1.5 font-semibold underline underline-offset-2 hover:text-violet-100 whitespace-nowrap shrink-0"
        >
          {copy.link}
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={copy.close}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-h-[24px] min-w-[24px] rounded text-[14px] leading-none text-white/85 hover:text-white hover:bg-violet-700/60 cursor-pointer"
        >
          ×
        </button>
      </div>
    </div>
  );
}
