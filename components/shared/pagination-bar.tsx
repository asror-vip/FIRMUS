"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationBarProps {
  page: number;
  pageSize?: number;
  totalCount: number;
  isLoading?: boolean;
  itemLabel?: string;
  onPageChange: (nextPage: number) => void;
  className?: string;
}

export function PaginationBar({
  page,
  pageSize = 10,
  totalCount,
  isLoading = false,
  itemLabel = "yozuv",
  onPageChange,
  className = "",
}: PaginationBarProps) {
  const safeTotal = Math.max(0, totalCount);
  const totalPages = Math.max(1, Math.ceil(safeTotal / Math.max(1, pageSize)));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startItem = safeTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = safeTotal === 0 ? 0 : Math.min(currentPage * pageSize, safeTotal);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground ${className}`}
    >
      <span>
        Jami: <strong className="text-foreground">{safeTotal}</strong> ta {itemLabel}
        {safeTotal > 0 ? ` (${startItem}–${endItem})` : ""} • Sahifa{" "}
        <strong className="text-foreground">{currentPage}</strong> / {totalPages}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs gap-1"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Oldingi
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs gap-1"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          Keyingi
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
