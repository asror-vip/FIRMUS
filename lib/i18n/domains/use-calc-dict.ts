"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../types";
import { calcDict as uzCalcDict, type CalcDict } from "./calc-uz";

const cache: Partial<Record<Locale, CalcDict>> = {
  uz: uzCalcDict,
};

async function loadCalcDict(locale: Locale): Promise<CalcDict> {
  const cached = cache[locale];
  if (cached) return cached;

  if (locale === "ru") {
    const mod = await import("./calc-ru");
    cache.ru = mod.calcDict;
    return mod.calcDict;
  }

  if (locale === "en") {
    const mod = await import("./calc-en");
    cache.en = mod.calcDict;
    return mod.calcDict;
  }

  return uzCalcDict;
}

export function useCalcDict(locale: Locale): CalcDict {
  const [dict, setDict] = useState<CalcDict>(() => cache[locale] ?? uzCalcDict);

  useEffect(() => {
    const cached = cache[locale];
    if (cached) {
      setDict(cached);
      return;
    }

    let active = true;
    void loadCalcDict(locale).then((loaded) => {
      if (active) setDict(loaded);
    });
    return () => {
      active = false;
    };
  }, [locale]);

  return dict;
}
