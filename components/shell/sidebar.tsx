"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/mock/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShieldAlert,
  ArrowLeftRight,
  BookOpen,
  Landmark,
  FileText,
  Percent,
  TrendingUp,
  Package,
  FileCheck,
  Users,
  Cable,
  BarChart3,
  CreditCard,
  Settings,
  Sparkles,
  PanelLeft,
  ShieldCheck,
} from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeDot?: boolean;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { currentRole, toggleAiDrawer } = useAppState();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationGroups: NavigationGroup[] = [
    {
      label: t.nav.groups.overview,
      items: [
        { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
        { name: t.nav.aiAuditor, href: "/ai-auditor", icon: ShieldAlert, badge: "6" },
      ],
    },
    {
      label: t.nav.groups.accounting,
      items: [
        { name: t.nav.transactions, href: "/transactions", icon: ArrowLeftRight },
        { name: t.nav.accounting, href: "/accounting", icon: BookOpen },
        { name: t.nav.banking, href: "/banking", icon: Landmark },
        { name: t.nav.documents, href: "/documents", icon: FileText, badge: "14" },
      ],
    },
    {
      label: t.nav.groups.business,
      items: [
        { name: t.nav.tax, href: "/tax", icon: Percent },
        { name: t.nav.finance, href: "/finance", icon: TrendingUp },
        { name: t.nav.inventory, href: "/inventory", icon: Package },
        { name: t.nav.contracts, href: "/contracts", icon: FileCheck },
        { name: t.nav.employees, href: "/employees", icon: Users },
      ],
    },
    {
      label: t.nav.groups.system,
      items: [
        { name: t.nav.integrations, href: "/integrations", icon: Cable, badgeDot: true },
        { name: t.nav.reports, href: "/reports", icon: BarChart3 },
        { name: t.nav.team, href: "/team", icon: Users },
        { name: t.nav.billing, href: "/billing", icon: CreditCard },
        { name: t.nav.settings, href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card transition-all duration-200 select-none z-20 shrink-0",
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
            title="Menyuni ochish (Expand sidebar)"
          >
            <PanelLeft className="h-5 w-5 transition-transform group-hover:scale-110 text-foreground" />
          </button>
        ) : (
          <>
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm tracking-wider shadow-sm">
                FI
              </div>
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-tight text-foreground font-sans">
                  FIRMUS
                </span>
                <span className="text-[10px] text-muted-foreground font-mono leading-none">
                  AI SaaS • Oʻzbekiston
                </span>
              </div>
            </Link>
            <button
              onClick={() => setIsCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Menyuni yigʻish (Collapse sidebar)"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
        {navigationGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-0.5">
            {!isCollapsed && (
              <div className="px-2 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1">
                {group.label}
              </div>
            )}

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

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

                  {!isCollapsed && item.badge && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-mono font-semibold",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}

                  {!isCollapsed && item.badgeDot && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* AI Quick Trigger Box (when expanded) */}
      {!isCollapsed && (
        <div className="p-3 mx-2.5 mb-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>GPT-6 Luna Copilot</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight mb-2">
            6 ta kutilayotgan istisno mavjud.
          </p>
          <button
            onClick={toggleAiDrawer}
            className="w-full text-center text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 py-1 rounded-md transition-colors"
          >
            Tekshirish
          </button>
        </div>
      )}

      {/* Sidebar Footer: Security & Version */}
      <div className="border-t border-border mt-auto">
        {!isCollapsed ? (
          <div className="p-3 space-y-2 bg-muted/10">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">{t.sidebarFooter.syncStatus}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                v1.0.4
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span className="truncate">{t.sidebarFooter.security}</span>
            </div>
            <p className="text-[9px] text-muted-foreground/60 leading-tight">
              {t.sidebarFooter.rights}
            </p>
          </div>
        ) : (
          <div className="p-3 flex flex-col items-center justify-center gap-2.5">
            <div
              className="h-2 w-2 rounded-full bg-emerald-500"
              title="Barcha xizmatlar faol (99.9%)"
            />
            <span title="256-bit shifrlangan • Barcha huquqlar himoyalangan">
              <ShieldCheck className="h-4 w-4 text-indigo-500 hover:scale-110 transition-transform cursor-help" />
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
