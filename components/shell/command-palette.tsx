"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/mock/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  Search,
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
  X,
} from "lucide-react";

export function CommandPalette() {
  const { isSearchOpen, setIsSearchOpen, toggleAiDrawer } = useAppState();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const navigationItems = [
    { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
    { name: t.nav.aiAuditor, href: "/ai-auditor", icon: ShieldAlert },
    { name: t.nav.transactions, href: "/transactions", icon: ArrowLeftRight },
    { name: t.nav.accounting, href: "/accounting", icon: BookOpen },
    { name: t.nav.banking, href: "/banking", icon: Landmark },
    { name: t.nav.documents, href: "/documents", icon: FileText },
    { name: t.nav.tax, href: "/tax", icon: Percent },
    { name: t.nav.finance, href: "/finance", icon: TrendingUp },
    { name: t.nav.inventory, href: "/inventory", icon: Package },
    { name: t.nav.contracts, href: "/contracts", icon: FileCheck },
    { name: t.nav.employees, href: "/employees", icon: Users },
    { name: t.nav.integrations, href: "/integrations", icon: Cable },
    { name: t.nav.reports, href: "/reports", icon: BarChart3 },
    { name: t.nav.team, href: "/team", icon: Users },
    { name: t.nav.billing, href: "/billing", icon: CreditCard },
    { name: t.nav.settings, href: "/settings", icon: Settings },
  ];

  const filtered = navigationItems.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    setIsSearchOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
      <DialogContent hideCloseButton className="p-0 overflow-hidden max-w-xl border-border bg-card shadow-2xl">
        <div className="flex items-center border-b border-border px-3.5 py-2.5">
          <Search className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.commandPalette.placeholder}
            className="border-0 shadow-none focus-visible:ring-0 text-sm h-8 px-0 placeholder:text-muted-foreground/60"
            autoFocus
          />
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none">
              ESC
            </kbd>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title={t.common.close}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="max-h-[340px] overflow-y-auto p-2">
          <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
            {t.commandPalette.modules}
          </div>

          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {t.commandPalette.noResults}
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.href}
                  onClick={() => handleSelect(item.href)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span>{item.name}</span>
                </div>
              );
            })
          )}

          <div className="mt-2 border-t border-border pt-2">
            <div
              onClick={() => {
                setIsSearchOpen(false);
                toggleAiDrawer();
              }}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 cursor-pointer"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/10">
                ✨
              </div>
              <span>{t.commandPalette.askAi}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
