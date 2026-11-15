"use client";

import React from "react";
import { formatMoney } from "@/lib/format/money";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

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
  const { t } = useTranslation();
  const activeCurrency = currency || t.common.currency;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  const isIncome = type === "income" || (type === "neutral" && num > 0 && false);
  const isExpense = type === "expense";

  const formatted = formatMoney(Math.abs(num), { currency: activeCurrency, compact });
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
