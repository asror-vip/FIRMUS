"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getShellSharedDict } from "@/lib/i18n/domains/shell-shared";

export type StatusPillType =
  | "success"
  | "pending"
  | "failed"
  | "draft"
  | "posted"
  | "reconciled"
  | "exception"
  | "signed"
  | "active"
  | "read-only";

interface StatusPillProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  const { t, locale } = useTranslation();
  const d = getShellSharedDict(locale);
  const sp = d.shared.statusPill;
  const norm = status.toLowerCase();

  let variant: "success" | "warning" | "destructive" | "indigo" | "slate" | "secondary" = "slate";
  let displayLabel = label || status;

  if (["success", "posted", "signed", "active", "connected", "paid", "in_stock", "completed", "resolved"].includes(norm)) {
    variant = "success";
    if (!label) {
      if (norm === "posted") displayLabel = t.statuses.posted;
      else if (norm === "signed") displayLabel = t.statuses.signed;
      else if (norm === "active") displayLabel = t.statuses.active;
      else if (norm === "connected") displayLabel = t.statuses.connected;
      else if (norm === "paid") displayLabel = t.statuses.paid;
      else if (norm === "success") displayLabel = t.statuses.success;
      else if (norm === "in_stock") displayLabel = t.statuses.in_stock;
      else if (norm === "completed") displayLabel = t.statuses.completed;
      else if (norm === "resolved") displayLabel = sp.resolved;
    }
  } else if (["pending", "pending_signature", "due_soon", "syncing", "low_stock", "invited", "trialing", "in_review"].includes(norm)) {
    variant = "warning";
    if (!label) {
      if (norm === "pending") displayLabel = t.statuses.pending;
      else if (norm === "pending_signature") displayLabel = t.statuses.pending_signature;
      else if (norm === "due_soon") displayLabel = t.statuses.due_soon;
      else if (norm === "syncing") displayLabel = t.statuses.syncing;
      else if (norm === "low_stock") displayLabel = t.statuses.low_stock;
      else if (norm === "invited") displayLabel = t.statuses.invited;
      else if (norm === "trialing") displayLabel = sp.trialing;
      else if (norm === "in_review") displayLabel = sp.inReview;
    }
  } else if (["failed", "exception", "rejected", "error", "overdue", "critical", "urgent", "expired", "cancelled"].includes(norm)) {
    variant = "destructive";
    if (!label) {
      if (norm === "failed") displayLabel = sp.failed;
      else if (norm === "exception") displayLabel = t.statuses.exception;
      else if (norm === "rejected") displayLabel = t.statuses.rejected;
      else if (norm === "error") displayLabel = t.statuses.error;
      else if (norm === "overdue") displayLabel = t.statuses.overdue;
      else if (norm === "critical") displayLabel = t.statuses.critical;
      else if (norm === "urgent") displayLabel = t.statuses.urgent;
      else if (norm === "expired") displayLabel = sp.expired;
      else if (norm === "cancelled") displayLabel = sp.cancelled;
    }
  } else if (["reconciled", "indigo", "open"].includes(norm)) {
    variant = "indigo";
    if (!label) {
      if (norm === "reconciled") displayLabel = t.statuses.reconciled;
      else if (norm === "open") displayLabel = sp.open;
    }
  } else if (["draft", "read-only", "inactive"].includes(norm)) {
    variant = "slate";
    if (!label) {
      if (norm === "draft") displayLabel = t.statuses.draft;
      else if (norm === "read-only") displayLabel = sp.readOnly;
      else if (norm === "inactive") displayLabel = sp.inactive;
    }
  }

  return (
    <Badge variant={variant} className={cn("text-[11px] font-medium tracking-wide", className)}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {displayLabel}
    </Badge>
  );
}
