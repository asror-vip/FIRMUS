"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FolderSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getShellSharedDict } from "@/lib/i18n/domains/shell-shared";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const { locale } = useTranslation();
  const d = getShellSharedDict(locale);
  const es = d.shared.emptyState;

  return (
    <div
      className={cn(
        "flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
        {icon || <FolderSearch className="h-6 w-6" />}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title || es.defaultTitle}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
        {description || es.defaultDescription}
      </p>
      {(actionLabel || onAction) && (
        <Button size="sm" onClick={onAction}>
          {actionLabel || es.defaultAction}
        </Button>
      )}
    </div>
  );
}
