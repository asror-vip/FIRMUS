"use client";

import React from "react";
import { Globe, Check } from "lucide-react";
import { useAppState } from "@/lib/context/app-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  { value: "uz", flag: "🇺🇿", label: "Oʻzbekcha" },
  { value: "ru", flag: "🇷🇺", label: "Русский" },
  { value: "en", flag: "🇬🇧", label: "English" },
];

export function LanguageToggle({ className, compact = false }: LanguageToggleProps) {
  const { language, setLanguage } = useAppState();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Language"
          className={cn(
            "font-medium text-muted-foreground hover:text-foreground",
            compact ? "h-7 px-1.5 text-[11px]" : "h-8 px-2 text-xs",
            className
          )}
        >
          <Globe className={cn("mr-1", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          <span>{LANGUAGE_LABELS[language] || "OʻZ"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 text-xs">
        {LANGUAGE_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => setLanguage(opt.value)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              language === opt.value && "font-semibold text-foreground"
            )}
          >
            <span>
              {opt.flag} {opt.label}
            </span>
            {language === opt.value && <Check className="h-3.5 w-3.5 text-indigo-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
