"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/mock/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";
import type { OptionalModuleKey } from "@/lib/config/modules";
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
  Scale,
  SlidersHorizontal,
} from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleKey?: OptionalModuleKey;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { toggleAiDrawer, enabledModules } = useAppState();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const rawGroups: NavigationGroup[] = [
    {
      label: t.nav.groups.overview,
      items: [
        { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
        { name: "Bank ↔ 1C AI Sverka", href: "/reconcile", icon: Scale },
        { name: t.nav.aiAuditor, href: "/ai-auditor", icon: ShieldAlert },
      ],
    },
    {
      label: t.nav.groups.accounting,
      items: [
        { name: t.nav.transactions, href: "/transactions", icon: ArrowLeftRight },
        { name: t.nav.accounting, href: "/accounting", icon: BookOpen },
        { name: t.nav.banking, href: "/banking", icon: Landmark, moduleKey: "banking" },
        { name: t.nav.documents, href: "/documents", icon: FileText, moduleKey: "documents" },
      ],
    },
    {
      label: t.nav.groups.business,
      items: [
        { name: t.nav.tax, href: "/tax", icon: Percent },
        { name: t.nav.finance, href: "/finance", icon: TrendingUp },
        { name: t.nav.inventory, href: "/inventory", icon: Package, moduleKey: "inventory" },
        { name: t.nav.contracts, href: "/contracts", icon: FileCheck, moduleKey: "contracts" },
        { name: t.nav.employees, href: "/employees", icon: Users, moduleKey: "employees" },
      ],
    },
    {
      label: t.nav.groups.system,
      items: [
        { name: t.nav.integrations, href: "/integrations", icon: Cable, moduleKey: "integrations" },
        { name: t.nav.reports, href: "/reports", icon: BarChart3, moduleKey: "reports" },
        { name: t.nav.team, href: "/team", icon: Users, moduleKey: "team" },
        { name: t.nav.billing, href: "/billing", icon: CreditCard, moduleKey: "billing" },
        { name: t.nav.settings, href: "/settings", icon: Settings },
        { name: "Qoʻshimcha modullar", href: "/settings?tab=modules", icon: SlidersHorizontal },
      ],
    },
  ];

  const navigationGroups = rawGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !it.moduleKey || enabledModules[it.moduleKey]),
    }))
    .filter((g) => g.items.length > 0);

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
              const cleanHref = item.href.split("?")[0];
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : item.href.includes("?")
                  ? false
                  : pathname.startsWith(cleanHref);

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

      {/* AI Quick Trigger Box (when expanded) */}
      {!isCollapsed && (
        <div className="p-3 mx-2.5 mb-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            <span>FIRMUS AI Agent</span>
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
