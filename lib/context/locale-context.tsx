"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getLocaleFromBrowserCookie, type Locale } from "@/lib/i18n/server-locale";

interface LocaleContextType {
  language: Locale;
  setLanguage: (lang: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({
  children,
  initialLocale = "uz",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [language, setLanguageState] = useState<Locale>(initialLocale);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("firmus_lang") || localStorage.getItem("auvrio_lang");
      const cookieLang = getLocaleFromBrowserCookie();
      const resolvedLang: Locale =
        savedLang === "uz" || savedLang === "ru" || savedLang === "en"
          ? savedLang
          : cookieLang;

      setLanguageState(resolvedLang);
      localStorage.setItem("firmus_lang", resolvedLang);
      document.cookie = `firmus_lang=${resolvedLang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = resolvedLang;
    } catch {
      // Ignore storage errors in restricted environments
    }
  }, []);

  const setLanguage = useCallback((lang: Locale) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("firmus_lang", lang);
      document.cookie = `firmus_lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = lang;
    } catch {
      // Ignore storage errors
    }
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextType {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      language: "uz",
      setLanguage: () => {},
    };
  }
  return ctx;
}
