"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../types";
import { authFormsDict as uzAuthFormsDict, type AuthFormsDict } from "./auth-forms-uz";

const cache: Partial<Record<Locale, AuthFormsDict>> = {
  uz: uzAuthFormsDict,
};

async function loadAuthFormsDict(locale: Locale): Promise<AuthFormsDict> {
  const cached = cache[locale];
  if (cached) return cached;

  if (locale === "ru") {
    const mod = await import("./auth-forms-ru");
    cache.ru = mod.authFormsDict;
    return mod.authFormsDict;
  }

  if (locale === "en") {
    const mod = await import("./auth-forms-en");
    cache.en = mod.authFormsDict;
    return mod.authFormsDict;
  }

  return uzAuthFormsDict;
}

export function useAuthFormsDict(locale: Locale): AuthFormsDict {
  const [dict, setDict] = useState<AuthFormsDict>(() => cache[locale] ?? uzAuthFormsDict);

  useEffect(() => {
    const cached = cache[locale];
    if (cached) {
      setDict(cached);
      return;
    }

    let active = true;
    void loadAuthFormsDict(locale).then((loaded) => {
      if (active) setDict(loaded);
    });
    return () => {
      active = false;
    };
  }, [locale]);

  return dict;
}
