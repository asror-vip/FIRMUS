"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SquarePen,
  Search,
  MessageSquare,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getShellSharedDict, getIntlLocale } from "@/lib/i18n/domains/shell-shared";
import {
  fetchAiChatThreadsPaginated,
  fetchAiChatThreadById,
  renameAiChatThread,
  deleteAiChatThread,
  type AiChatThreadMeta,
  type AiChatThreadDetail,
} from "@/lib/services/supabase-service";
import { cacheKeys, peekQueryCache } from "@/lib/cache/query-cache";

interface AiThreadHistoryPanelProps {
  entityId?: string;
  activeThreadId: string | null;
  onSelectThread: (thread: AiChatThreadDetail) => void;
  onNewChat: () => void;
  onDeletedThread?: (deletedId: string) => void;
  refreshTrigger?: number;
  compact?: boolean;
}

const THREAD_PAGE_SIZE = 10;

function formatShortDate(iso: string, intlLocale: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(intlLocale, { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString(intlLocale, { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

export function AiThreadHistoryPanel({
  entityId,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onDeletedThread,
  refreshTrigger = 0,
  compact = false,
}: AiThreadHistoryPanelProps) {
  const { t, locale } = useTranslation();
  const d = getShellSharedDict(locale);
  const intlLocale = getIntlLocale(locale);
  const th = d.shared.aiThreadHistoryPanel;

  const initialThreadsCache = peekQueryCache<{ data: AiChatThreadMeta[]; count: number }>(
    cacheKeys.aiThreads({
      entityId,
      page: 1,
      pageSize: THREAD_PAGE_SIZE,
    })
  );

  const [threads, setThreads] = useState<AiChatThreadMeta[]>(
    () => initialThreadsCache?.data.data ?? []
  );
  const [totalCount, setTotalCount] = useState(
    () => initialThreadsCache?.data.count ?? 0
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(!initialThreadsCache);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const loadThreads = useCallback(async () => {
    const trimmedSearch = search.trim();
    const cached = peekQueryCache<{ data: AiChatThreadMeta[]; count: number }>(
      cacheKeys.aiThreads({
        entityId,
        page,
        pageSize: THREAD_PAGE_SIZE,
        search: trimmedSearch || undefined,
      })
    );
    if (cached) {
      setThreads(cached.data.data);
      setTotalCount(cached.data.count);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    try {
      const { data, count } = await fetchAiChatThreadsPaginated({
        entityId,
        search,
        page,
        pageSize: THREAD_PAGE_SIZE,
      });
      setThreads(data);
      setTotalCount(count);
    } finally {
      setIsLoading(false);
    }
  }, [entityId, search, page]);

  useEffect(() => {
    setPage(1);
  }, [entityId, search]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads, refreshTrigger]);

  useEffect(() => {
    const onUpdated = () => {
      loadThreads();
    };
    window.addEventListener("firmus:ai-threads-updated", onUpdated);
    return () => window.removeEventListener("firmus:ai-threads-updated", onUpdated);
  }, [loadThreads]);

  const handleOpen = async (meta: AiChatThreadMeta) => {
    if (editingId === meta.id) return;
    const cachedDetail = peekQueryCache<AiChatThreadDetail | null>(
      cacheKeys.aiThreadById(meta.id)
    );
    if (!cachedDetail?.data) {
      setOpeningId(meta.id);
    }
    try {
      const detail = await fetchAiChatThreadById(meta.id);
      if (detail) {
        onSelectThread(detail);
      }
    } catch (err: any) {
      toast.error(th.loadErrorToast(err.message));
    } finally {
      setOpeningId(null);
    }
  };

  const handleSaveRename = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await renameAiChatThread(id, editTitle.trim());
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, title: editTitle.trim() } : t))
      );
      window.dispatchEvent(new CustomEvent("firmus:ai-threads-updated"));
    } catch (err: any) {
      toast.error(th.renameErrorToast(err.message));
    } finally {
      setEditingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteAiChatThread(id);
      onDeletedThread?.(id);
      await loadThreads();
      window.dispatchEvent(new CustomEvent("firmus:ai-threads-updated"));
    } catch (err: any) {
      toast.error(th.deleteErrorToast(err.message));
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / THREAD_PAGE_SIZE));

  return (
    <div className="flex flex-col h-full text-xs">
      <div className={cn("space-y-2 border-b border-border/70", compact ? "p-2.5" : "p-3")}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full h-8 justify-start gap-2 text-xs font-medium bg-background hover:bg-accent"
          onClick={onNewChat}
        >
          <SquarePen className="h-3.5 w-3.5 text-indigo-500" />
          {th.newChatBtn}
        </Button>

        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={th.searchPlaceholder}
            className="h-7 pl-8 text-[11px]"
          />
        </div>
      </div>

      <div className={cn("flex-1 overflow-y-auto space-y-1", compact ? "p-2" : "p-2.5")}>
        {isLoading && threads.length === 0 ? (
          <div className="py-8 flex items-center justify-center text-muted-foreground gap-1.5 text-[11px]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t.common.loading}
          </div>
        ) : threads.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-muted-foreground px-2">
            {th.empty}
          </div>
        ) : (
          threads.map((item) => {
            const isActive = activeThreadId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleOpen(item)}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors",
                  isActive
                    ? "bg-indigo-500/15 text-foreground font-medium border border-indigo-500/30"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-transparent"
                )}
              >
                {openingId === item.id ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-500" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                )}

                {editingId === item.id ? (
                  <div
                    className="flex-1 flex items-center gap-1 min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(item.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 min-w-0 h-6 rounded border border-input bg-background px-1.5 text-[11px] text-foreground focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(item.id)}
                      className="p-0.5 text-emerald-500 hover:opacity-80"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[11px]">{item.title}</div>
                      <div className="text-[9px] text-muted-foreground/70 font-mono">
                        {formatShortDate(item.updatedAt, intlLocale)}
                      </div>
                    </div>
                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        aria-label={th.renameLabel}
                        title={th.renameLabel}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(item.id);
                          setEditTitle(item.title);
                        }}
                        className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        aria-label={th.deleteLabel}
                        title={th.deleteLabel}
                        onClick={(e) => handleDelete(e, item.id)}
                        className="p-1 rounded hover:bg-background/80 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {totalCount > THREAD_PAGE_SIZE && (
        <div className="border-t border-border/70 px-2.5 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {page}/{totalPages} ({totalCount})
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded hover:bg-muted disabled:opacity-40"
              aria-label={d.shared.paginationBar.previous}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded hover:bg-muted disabled:opacity-40"
              aria-label={d.shared.paginationBar.next}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
