"use client";

import React, { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { useLocale } from "@/lib/context/locale-context";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/types";

interface LanguageToggleProps {
  className?: string;
  compact?: boolean;
}

const LANGUAGE_LABELS: Record<Locale, string> = {
  uz: "OʻZ",
  ru: "RU",
  en: "EN",
};

const LANGUAGE_OPTIONS: Array<{ value: Locale; flag: string; label: string }> = [
  { value: "uz", flag: "UZ", label: "Oʻzbekcha" },
  { value: "ru", flag: "RU", label: "Русский" },
  { value: "en", flag: "EN", label: "English" },
];

export function LanguageToggle({ className, compact = false }: LanguageToggleProps) {
  const { language, setLanguage } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-label="Language"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "h-7 px-1.5 text-[11px]" : "h-8 px-2 text-xs",
          className
        )}
      >
        <Globe className={cn("mr-1", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        <span>{LANGUAGE_LABELS[language] || "OʻZ"}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1.5 z-50 w-36 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md text-xs"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitem"
              onClick={() => {
                setLanguage(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                language === opt.value && "bg-primary/10 text-primary font-semibold"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">{opt.flag}</span>
                <span>{opt.label}</span>
              </span>
              {language === opt.value && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
