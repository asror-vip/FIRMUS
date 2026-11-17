"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-700",
        onClick && "cursor-pointer hover:shadow-sm active:scale-[0.99]",
        className
      )}
    >
      <CardContent className="p-5">
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
                  trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {trend.value}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
