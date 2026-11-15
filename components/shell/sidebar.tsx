"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/mock/store";
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
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bot,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { currentRole, toggleAiDrawer } = useAppState();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigationGroups = [
    {
      label: "Umumiy",
      items: [
        { name: "Boshqaruv (Dashboard)", href: "/", icon: LayoutDashboard },
        { name: "AI Auditor & Istisnolar", href: "/ai-auditor", icon: ShieldAlert, badge: "6" },
      ],
    },
    {
      label: "Buxgalteriya",
      items: [
        { name: "Tranzaksiyalar", href: "/transactions", icon: ArrowLeftRight },
        { name: "Hisoblar rejasi & Ledger", href: "/accounting", icon: BookOpen },
        { name: "Bank va Koʻchirmalar", href: "/banking", icon: Landmark },
        { name: "Didox Hujjatlar", href: "/documents", icon: FileText, badge: "14" },
      ],
    },
    {
      label: "Biznes",
      items: [
        { name: "Soliqlar & Kalendar", href: "/tax", icon: Percent },
        { name: "Moliya & P&L", href: "/finance", icon: TrendingUp },
        { name: "Omborxona & Qoldiq", href: "/inventory", icon: Package },
        { name: "Shartnomalar", href: "/contracts", icon: FileCheck },
        { name: "Xodimlar & HR", href: "/employees", icon: Users },
      ],
    },
    {
      label: "Tizim",
      items: [
        { name: "Integratsiyalar", href: "/integrations", icon: Cable, badgeDot: true },
        { name: "Hisobot shablonlari", href: "/reports", icon: BarChart3 },
        { name: "Jamoa boshqaruvi", href: "/team", icon: Users },
        { name: "Obuna & Tariflar", href: "/billing", icon: CreditCard },
        { name: "Sozlamalar", href: "/settings", icon: Settings },
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
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm tracking-wider shadow-sm">
            AU
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm tracking-tight text-foreground font-sans">
                AUVRIO
              </span>
              <span className="text-[10px] text-muted-foreground font-mono leading-none">
                AI SaaS • Oʻzbekiston
              </span>
            </div>
          )}
        </Link>
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

      {/* Collapse Toggle Footer */}
      <div className="border-t border-border p-2 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-[10px] text-muted-foreground px-2 font-mono">
            {currentRole.replace("_", " ")}
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground mx-auto"
          title={isCollapsed ? "Menyuni kengaytirish" : "Menyuni yig'ish"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
