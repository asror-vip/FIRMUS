"use client";

import React from "react";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getShellSharedDict } from "@/lib/i18n/domains/shell-shared";

interface MoneyProps {
  amount: number | string;
  type?: "income" | "expense" | "neutral";
  currency?: string;
  className?: string;
  compact?: boolean;
}

export function Money({
  amount,
  type = "neutral",
  currency,
  className,
  compact = false,
}: MoneyProps) {
  const { t, locale } = useTranslation();
  const d = getShellSharedDict(locale);
  const activeCurrency = currency || t.common.currency;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const isIncome = type === "income" || (type === "neutral" && num > 0 && false);
  const isExpense = type === "expense";

  const absNum = Number.isNaN(num) ? 0 : Math.abs(num);
  let formatted: string;
  if (compact && absNum >= 1_000_000_000) {
    formatted = `${(absNum / 1_000_000_000).toFixed(1)} ${d.shared.money.billion} ${activeCurrency}`;
  } else if (compact && absNum >= 1_000_000) {
    formatted = `${(absNum / 1_000_000).toFixed(1)} ${d.shared.money.million} ${activeCurrency}`;
  } else if (compact && absNum >= 1_000) {
    formatted = `${(absNum / 1_000).toFixed(0)} ${d.shared.money.thousand} ${activeCurrency}`;
  } else {
    formatted = formatMoney(absNum, { currency: activeCurrency, compact: false });
  }
  const sign = type === "income" ? "+" : type === "expense" ? "−" : "";

  return (
    <span
      className={cn(
        "font-mono font-medium tracking-tight text-right whitespace-nowrap",
        isIncome && "text-emerald-600 dark:text-emerald-400",
        isExpense && "text-slate-900 dark:text-slate-100",
        className
      )}
    >
      {sign}
      {formatted}
    </span>
  );
}
