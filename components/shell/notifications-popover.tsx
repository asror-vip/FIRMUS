"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchExceptions, fetchTaxDeadlines } from "@/lib/services/supabase-service";
import { cacheKeys, peekQueryCache } from "@/lib/cache/query-cache";
import { useAppState } from "@/lib/context/app-state";
import { FEATURES } from "@/lib/config/features";

export interface NotificationItem {
  id: string;
  category: "tax" | "exception" | "sync" | "system";
  severity: "critical" | "warning" | "success" | "info";
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getShellSharedDict } from "@/lib/i18n/domains/shell-shared";

function getReadNotificationIds(entityId: string): string[] {
  try {
    const saved = localStorage.getItem(`firmus_read_notifs_${entityId}`);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function buildNotificationItems(
  excs: any[],
  deadlines: any[],
  readIds: string[],
  labels: { today: string; viewInAuditor: string; duePrefix: string; goToTax: string }
): NotificationItem[] {
  const built: NotificationItem[] = [];

  (excs || [])
    .filter((e: any) => e.status === "open" || e.status === "in_review")
    .forEach((e: any) => {
      const nid = `exc-${e.id}`;
      built.push({
        id: nid,
        category: "exception",
        severity: e.severity === "critical" ? "critical" : "warning",
        title: e.title,
        description: e.description,
        timestamp: e.date || labels.today,
        isRead: readIds.includes(nid),
        actionLabel: labels.viewInAuditor,
        actionUrl: `/ai-auditor?id=${e.id}`,
      });
    });

  (deadlines || [])
    .filter((item: any) => item.status !== "completed")
    .forEach((item: any) => {
      const nid = `tax-${item.id}`;
      built.push({
        id: nid,
        category: "tax",
        severity: item.status === "urgent" ? "warning" : "info",
        title: item.title,
        description: item.description || `${labels.duePrefix}: ${item.date}`,
        timestamp: item.date,
        isRead: readIds.includes(nid),
        actionLabel: labels.goToTax,
        actionUrl: "/tax",
      });
    });

  return built;
}

export function NotificationsPopover() {
  const router = useRouter();
  const { currentEntity } = useAppState();
  const { t, locale } = useTranslation();
  const d = getShellSharedDict(locale);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [unreadOnly] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!FEATURES.fullAccountingErp || !currentEntity?.id) {
      setNotifications([]);
      return;
    }

    const readIds = getReadNotificationIds(currentEntity.id);
    const notifLabels = {
      today: d.notifications.today,
      viewInAuditor: d.notifications.viewInAuditor,
      duePrefix: d.notifications.duePrefix,
      goToTax: d.notifications.goToTax,
    };

    const peekExcs = peekQueryCache<any[]>(cacheKeys.exceptions(currentEntity.id));
    const peekDeadlines = peekQueryCache<any[]>(cacheKeys.taxDeadlines(currentEntity.id));
    if (peekExcs && peekDeadlines) {
      setNotifications(
        buildNotificationItems(peekExcs.data, peekDeadlines.data, readIds, notifLabels)
      );
    }

    try {
      const [excs, deadlines] = await Promise.all([
        fetchExceptions(currentEntity.id),
        fetchTaxDeadlines(currentEntity.id),
      ]);

      setNotifications(buildNotificationItems(excs, deadlines, readIds, notifLabels));
    } catch (err) {
      console.error("Failed loading notifications:", err);
    }
  }, [currentEntity?.id, d.notifications.duePrefix, d.notifications.goToTax, d.notifications.today, d.notifications.viewInAuditor]);

  useEffect(() => {
    if (!FEATURES.fullAccountingErp || !currentEntity?.id) {
      setNotifications([]);
      return;
    }
    const peekExcs = peekQueryCache<any[]>(cacheKeys.exceptions(currentEntity.id));
    const peekDeadlines = peekQueryCache<any[]>(cacheKeys.taxDeadlines(currentEntity.id));
    if (peekExcs && peekDeadlines) {
      const readIds = getReadNotificationIds(currentEntity.id);
      setNotifications(
        buildNotificationItems(peekExcs.data, peekDeadlines.data, readIds, {
          today: d.notifications.today,
          viewInAuditor: d.notifications.viewInAuditor,
          duePrefix: d.notifications.duePrefix,
          goToTax: d.notifications.goToTax,
        })
      );
    } else {
      setNotifications([]);
    }
  }, [currentEntity?.id, d.notifications.duePrefix, d.notifications.goToTax, d.notifications.today, d.notifications.viewInAuditor]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    if (selectedCategory !== "all" && n.category !== selectedCategory) return false;
    if (unreadOnly && n.isRead) return false;
    return true;
  });

  const persistReadIds = (items: NotificationItem[]) => {
    if (!currentEntity?.id) return;
    try {
      const readList = items.filter((n) => n.isRead).map((n) => n.id);
      localStorage.setItem(`firmus_read_notifs_${currentEntity.id}`, JSON.stringify(readList));
    } catch {}
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, isRead: true }));
      persistReadIds(next);
      return next;
    });
    toast.success(d.notifications.markAllReadToast);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n));
      persistReadIds(next);
      return next;
    });
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />;
    }
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && FEATURES.fullAccountingErp) {
          loadNotifications();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-xs animate-in zoom-in-50">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[420px] max-w-[95vw] p-0 shadow-2xl rounded-xl border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5 bg-muted/20">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-semibold text-xs text-foreground whitespace-nowrap">
              {t.notifications.title}
            </h3>
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="h-5 px-2 py-0 text-[10px] font-semibold whitespace-nowrap shrink-0 rounded-full flex items-center gap-1 shadow-xs"
              >
                <span>{unreadCount}</span>
                <span>{t.notifications.unreadCount}</span>
              </Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium whitespace-nowrap shrink-0 px-2 py-1 rounded-md hover:bg-muted/50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>{t.notifications.markAllRead}</span>
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center border-b border-border bg-muted/10 px-2 py-1 gap-1 text-[11px] overflow-x-auto scrollbar-none">
          {[
            { id: "all", label: t.notifications.tabs.all },
            { id: "tax", label: t.notifications.tabs.tax },
            { id: "exception", label: t.notifications.tabs.exceptions },
            { id: "sync", label: t.notifications.tabs.sync },
            { id: "system", label: t.notifications.tabs.system },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-background text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/60">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              {t.notifications.empty}
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-3.5 transition-colors cursor-pointer hover:bg-muted/40 relative ${
                  !item.isRead ? "bg-indigo-500/5 dark:bg-indigo-500/10" : ""
                }`}
              >
                {!item.isRead && (
                  <span className="absolute top-4 left-1.5 h-1.5 w-1.5 rounded-full bg-indigo-600" />
                )}

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">{getSeverityIcon(item.severity)}</div>

                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-xs text-foreground leading-snug truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {item.timestamp}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {item.description}
                    </p>

                    {item.actionLabel && (
                      <div className="pt-1 flex items-center gap-1 text-[11px] text-primary font-medium hover:underline">
                        <span>{item.actionLabel}</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-border bg-muted/20 text-center">
          <span className="text-[10px] text-muted-foreground">
            {t.notifications.footerSync}
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
