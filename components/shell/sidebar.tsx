"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppState } from "@/lib/context/app-state";
import { FEATURES } from "@/lib/config/features";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getShellSharedDict } from "@/lib/i18n/domains/shell-shared";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShieldAlert,
  ArrowLeftRight,
  BookOpen,
  Percent,
  TrendingUp,
  Settings,
  Sparkles,
  PanelLeft,
  Scale,
  CreditCard,
  Camera,
  Calculator,
  FileWarning,
  History,
} from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

function SidebarNavigation({
  pathname,
  isCollapsed,
  groups,
}: {
  pathname: string;
  isCollapsed: boolean;
  groups: NavigationGroup[];
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  return (
    <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
      {groups.map((group, groupIdx) => (
        <div key={groupIdx} className="space-y-0.5">
          {!isCollapsed && (
            <div className="px-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1">
              {group.label}
            </div>
          )}

          {group.items.map((item) => {
            const Icon = item.icon;
            const [basePath, queryStr] = item.href.split("?");
            const itemTab = queryStr ? new URLSearchParams(queryStr).get("tab") : null;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : itemTab
                ? pathname.startsWith(basePath) && tabParam === itemTab
                : basePath === "/assistant"
                ? pathname.startsWith("/assistant") && (!tabParam || tabParam === "chat")
                : pathname.startsWith(basePath);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors relative group",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />

                {!isCollapsed && (
                  <span className="truncate flex-1">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { toggleAiDrawer } = useAppState();
  const { t, locale } = useTranslation();
  const d = getShellSharedDict(locale);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const soloToolsGroups: NavigationGroup[] = [
    {
      label: d.sidebar.toolsGroupLabel,
      items: [
        { name: d.sidebar.solo.home, href: "/", icon: LayoutDashboard },
        { name: d.sidebar.solo.aiChat, href: "/assistant", icon: Sparkles },
        { name: d.sidebar.solo.reconcile, href: "/reconcile", icon: Scale },
        { name: d.sidebar.solo.scanner, href: "/assistant?tab=scan", icon: Camera },
        { name: d.sidebar.solo.calculator, href: "/assistant?tab=calc", icon: Calculator },
        { name: d.sidebar.solo.contract, href: "/assistant?tab=contract", icon: FileWarning },
        { name: d.sidebar.solo.history, href: "/assistant?tab=history", icon: History },
      ],
    },
    {
      label: t.nav.groups.system,
      items: [
        { name: d.sidebar.solo.billing, href: "/billing", icon: CreditCard },
        { name: t.nav.settings, href: "/settings", icon: Settings },
      ],
    },
  ];

  const fullErpGroups: NavigationGroup[] = [
    {
      label: t.nav.groups.overview,
      items: [
        { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
        { name: d.sidebar.erp.reconcile, href: "/reconcile", icon: Scale },
        { name: d.sidebar.erp.assistant, href: "/assistant", icon: Sparkles },
        { name: t.nav.aiAuditor, href: "/ai-auditor", icon: ShieldAlert },
      ],
    },
    {
      label: t.nav.groups.accounting,
      items: [
        { name: t.nav.transactions, href: "/transactions", icon: ArrowLeftRight },
        { name: t.nav.accounting, href: "/accounting", icon: BookOpen },
      ],
    },
    {
      label: t.nav.groups.business,
      items: [
        { name: t.nav.tax, href: "/tax", icon: Percent },
        { name: t.nav.finance, href: "/finance", icon: TrendingUp },
      ],
    },
    {
      label: t.nav.groups.system,
      items: [
        { name: d.sidebar.erp.billing, href: "/billing", icon: CreditCard },
        { name: t.nav.settings, href: "/settings", icon: Settings },
      ],
    },
  ];

  const navigationGroups = FEATURES.fullAccountingErp ? fullErpGroups : soloToolsGroups;

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-card transition-all duration-200 select-none z-20 shrink-0 overflow-hidden",
        isCollapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-border transition-colors",
          isCollapsed ? "justify-center px-2" : "justify-between px-3.5"
        )}
      >
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all group relative"
            title={d.sidebar.expandSidebar}
            aria-label={d.sidebar.expandSidebar}
          >
            <PanelLeft className="h-5 w-5 transition-transform group-hover:scale-110 text-foreground" />
          </button>
        ) : (
          <>
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-blue-400/40 shadow-sm bg-black">
                <img
                  src="/brand/firmus-f.jpg"
                  alt="FIRMUS"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-tight text-foreground font-sans">
                  FIRMUS
                </span>
                <span className="text-[10px] text-muted-foreground font-mono leading-none">
                  {FEATURES.multiCompanyMode ? d.sidebar.brandSubMulti : d.sidebar.brandSubSolo}
                </span>
              </div>
            </Link>
            <button
              onClick={() => setIsCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title={d.sidebar.collapseSidebar}
              aria-label={d.sidebar.collapseSidebar}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation Groups */}
      <Suspense fallback={<div className="flex-1 px-2.5 py-3" />}>
        <SidebarNavigation
          pathname={pathname}
          isCollapsed={isCollapsed}
          groups={navigationGroups}
        />
      </Suspense>

      {/* AI Quick Trigger Box (when expanded) */}
      {!isCollapsed && (
        <div className="p-3 mx-2.5 mb-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{d.sidebar.aiAgentTitle}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight mb-2">
            {t.sidebarFooter.copilotSubtitle}
          </p>
          <button
            onClick={toggleAiDrawer}
            className="w-full text-center text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 py-1 rounded-md transition-colors"
          >
            {t.sidebarFooter.copilotButton}
          </button>
        </div>
      )}

      {/* Sidebar Footer: Status & Version (h-14 aligned with main Footer border) */}
      <div className="h-14 shrink-0 border-t border-border mt-auto bg-card/30">
        {!isCollapsed ? (
          <div className="h-full px-3 flex flex-col justify-center gap-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">{t.sidebarFooter.syncStatus}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                v1.0.4
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground/60 leading-none">
              {t.sidebarFooter.rights}
            </p>
          </div>
        ) : (
          <div className="h-full px-3 flex items-center justify-center">
            <div
              className="h-2 w-2 rounded-full bg-emerald-500"
              title={d.sidebar.activeBadge}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
