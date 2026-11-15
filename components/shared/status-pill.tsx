import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const norm = status.toLowerCase();

  let variant: "success" | "warning" | "destructive" | "indigo" | "slate" | "secondary" = "slate";
  let displayLabel = label || status;

  if (["success", "posted", "signed", "active", "connected", "paid"].includes(norm)) {
    variant = "success";
    if (!label) {
      if (norm === "posted") displayLabel = "Tasdiqlangan";
      if (norm === "signed") displayLabel = "Imzolangan";
      if (norm === "active") displayLabel = "Faol";
      if (norm === "connected") displayLabel = "Ulangan";
      if (norm === "paid") displayLabel = "Toʻlangan";
    }
  } else if (["pending", "pending_signature", "due_soon", "syncing"].includes(norm)) {
    variant = "warning";
    if (!label) {
      if (norm === "pending") displayLabel = "Kutilmoqda";
      if (norm === "pending_signature") displayLabel = "Imzo kutilmoqda";
      if (norm === "due_soon") displayLabel = "Muddati yaqin";
      if (norm === "syncing") displayLabel = "Sinxronlanmoqda";
    }
  } else if (["failed", "exception", "rejected", "error", "overdue", "critical"].includes(norm)) {
    variant = "destructive";
    if (!label) {
      if (norm === "exception") displayLabel = "Istisno";
      if (norm === "rejected") displayLabel = "Rad etilgan";
      if (norm === "error") displayLabel = "Xatolik";
      if (norm === "overdue") displayLabel = "Muddati oʻtgan";
    }
  } else if (["reconciled", "indigo"].includes(norm)) {
    variant = "indigo";
    if (!label && norm === "reconciled") displayLabel = "Solishtirilgan";
  } else if (["draft"].includes(norm)) {
    variant = "slate";
    if (!label) displayLabel = "Qoralama";
  }

  return (
    <Badge variant={variant} className={cn("text-[11px] font-medium tracking-wide", className)}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {displayLabel}
    </Badge>
  );
}
