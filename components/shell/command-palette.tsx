"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/mock/store";
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
} from "lucide-react";

export function CommandPalette() {
  const { isSearchOpen, setIsSearchOpen, toggleAiDrawer } = useAppState();
  const [query, setQuery] = useState("");
  const router = useRouter();

  const navigationItems = [
    { name: "Asosiy boshqaruv (Dashboard)", href: "/", icon: LayoutDashboard },
    { name: "AI Auditor & Istisnolar", href: "/ai-auditor", icon: ShieldAlert },
    { name: "Bank va hisob-faktura tranzaksiyalari", href: "/transactions", icon: ArrowLeftRight },
    { name: "Buxgalteriya va Hisoblar rejasi", href: "/accounting", icon: BookOpen },
    { name: "Bank hisoblari va koʻchirmalar", href: "/banking", icon: Landmark },
    { name: "Didox elektron hujjatlari", href: "/documents", icon: FileText },
    { name: "Soliq hisob-kitoblari va kalendar", href: "/tax", icon: Percent },
    { name: "Moliyaviy hisobotlar (P&L, Balans)", href: "/finance", icon: TrendingUp },
    { name: "Omborxona va tovar qoldiqlari", href: "/inventory", icon: Package },
    { name: "Shartnomalar va yuridik hujjatlar", href: "/contracts", icon: FileCheck },
    { name: "Xodimlar va mehnat haqi", href: "/employees", icon: Users },
    { name: "Integratsiyalar (1C, Didox, E-IMZO)", href: "/integrations", icon: Cable },
    { name: "Hisobot shablonlari", href: "/reports", icon: BarChart3 },
    { name: "Jamoa aʼzolari va ruxsatlar", href: "/team", icon: Users },
    { name: "Obuna va toʻlovlar", href: "/billing", icon: CreditCard },
    { name: "Tizim sozlamalari", href: "/settings", icon: Settings },
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
      <DialogContent className="p-0 overflow-hidden max-w-xl border-border bg-card shadow-2xl [&>button]:hidden">
        <div className="flex items-center border-b border-border px-3.5 py-2.5">
          <Search className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sahifa, hisobot yoki modul qidiring (masalan: Soliq, Tranzaksiyalar, 1C)..."
            className="border-0 shadow-none focus-visible:ring-0 text-sm h-8 px-0 placeholder:text-muted-foreground/60"
            autoFocus
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="hidden sm:flex h-5 items-center gap-1 rounded border border-border bg-muted/80 hover:bg-accent px-1.5 font-mono text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            title="Yopish (ESC)"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[340px] overflow-y-auto p-2">
          <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
            Navigatsiya va Modullar
          </div>

          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Soʻrovingiz boʻyicha natija topilmadi.
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
              <span>GPT-6 Luna AI yordamchisidan soʻrash</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
