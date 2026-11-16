"use client";

import { useAppState } from "@/lib/context/app-state";
import { uzTranslations } from "./dictionaries/uz";
import { ruTranslations } from "./dictionaries/ru";
import { enTranslations } from "./dictionaries/en";
import { Translations, Locale } from "./types";

const dictionaries: Record<Locale, Translations> = {
  uz: uzTranslations,
  ru: ruTranslations,
  en: enTranslations,
};

export function useTranslation() {
  const { language } = useAppState();
  const t = dictionaries[language] || uzTranslations;
  return { t, locale: language };
}
