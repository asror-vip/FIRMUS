"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getShellSharedDict } from "@/lib/i18n/domains/shell-shared";

interface KpiCardProps {
  title?: string;
  value?: string | number;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  badge,
  icon,
  trend,
  onClick,
  className,
}: KpiCardProps) {
  const { locale } = useTranslation();
  const d = getShellSharedDict(locale);
  const kc = d.shared.kpiCard;

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm p-5 relative overflow-hidden transition-all duration-150 hover:border-violet-500/40 hover:bg-violet-500/5",
        onClick && "cursor-pointer hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] active:scale-[0.99]",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground tracking-tight">
          {title || kc.defaultTitle}
        </span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
          {value !== undefined && value !== null && value !== "" ? value : kc.noData}
        </span>
        {badge}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          {trend && (
            <span
              className={cn(
                "font-medium",
                trend.isPositive ? "text-violet-400 dark:text-violet-300" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
