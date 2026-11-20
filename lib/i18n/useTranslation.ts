"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/lib/context/locale-context";
import { uzTranslations } from "./dictionaries/uz";
import type { Translations, Locale } from "./types";

const dictionaryCache: Partial<Record<Locale, Translations>> = {
  uz: uzTranslations,
};

async function loadLocaleDictionary(locale: Locale): Promise<Translations> {
  const cached = dictionaryCache[locale];
  if (cached) return cached;

  if (locale === "ru") {
    const mod = await import("./dictionaries/ru");
    dictionaryCache.ru = mod.ruTranslations;
    return mod.ruTranslations;
  }

  if (locale === "en") {
    const mod = await import("./dictionaries/en");
    dictionaryCache.en = mod.enTranslations;
    return mod.enTranslations;
  }

  return uzTranslations;
}

export function useTranslation() {
  const { language } = useLocale();
  const [dict, setDict] = useState<Translations>(
    () => dictionaryCache[language] ?? uzTranslations
  );

  useEffect(() => {
    const cached = dictionaryCache[language];
    if (cached) {
      setDict(cached);
      return;
    }

    let active = true;
    void loadLocaleDictionary(language).then((loaded) => {
      if (active) {
        setDict(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, [language]);

  return { t: dict, locale: language };
}
