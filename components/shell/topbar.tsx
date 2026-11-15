"use client";

import React, { useState } from "react";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { EntitySwitcher } from "./entity-switcher";
import { useAppState } from "@/lib/mock/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Bell,
  Sparkles,
  Sun,
  Moon,
  Globe,
  UserCheck,
  LogOut,
  Settings,
  Shield,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/lib/mock/types";

export function Topbar() {
  const {
    isSearchOpen,
    setIsSearchOpen,
    toggleAiDrawer,
    currentRole,
    setCurrentRole,
    language,
    setLanguage,
  } = useAppState();

  const { theme, setTheme } = useTheme();
  const [unreadNotifications, setUnreadNotifications] = useState(4);

  const roleLabels: Record<UserRole, string> = {
    workspace_owner: "Workspace Owner",
    chief_accountant: "Bosh buxgalter",
    accountant: "Buxgalter",
    auditor: "Auditor (Faqat oʻqish)",
    company_director: "Bosh direktor",
    viewer: "Kuzatuvchi",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Left side: Workspace & Entity switchers */}
      <div className="flex items-center gap-2">
        <WorkspaceSwitcher />
        <span className="text-muted-foreground/40 hidden sm:inline">/</span>
        <EntitySwitcher />
      </div>

      {/* Middle: Command Palette Search */}
      <div className="hidden md:flex flex-1 max-w-sm mx-4">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-muted/40 px-3 text-xs text-muted-foreground hover:bg-muted/70 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Sahifa yoki hujjat qidiring...</span>
          </div>
          <kbd className="pointer-events-none flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side: Actions & User menu */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* AI Assistant Button */}
        <Button
          onClick={toggleAiDrawer}
          size="sm"
          className="h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm px-2.5 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI Copilot</span>
          <Badge variant="indigo" className="h-4 px-1 py-0 text-[9px] bg-white/20 text-white border-0">
            GPT-6
          </Badge>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[300px]">
            <DropdownMenuLabel className="flex items-center justify-between text-xs">
              <span>Bildirishnomalar</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                4 ta yangi
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex flex-col gap-1 p-1 text-xs">
              <div className="p-2 hover:bg-accent rounded-md cursor-pointer">
                <p className="font-medium text-rose-600 dark:text-rose-400">Yangi istisno aniqlandi</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Universal Logistics E-SF va bank toʻlovida 1,300,000 soʻm farq.
                </p>
                <span className="text-[9px] text-muted-foreground">10 daqiqa oldin</span>
              </div>
              <div className="p-2 hover:bg-accent rounded-md cursor-pointer">
                <p className="font-medium text-emerald-600 dark:text-emerald-400">Didox sinxronizatsiyasi</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  14 ta yangi elektron hisob-faktura qabul qilindi.
                </p>
                <span className="text-[9px] text-muted-foreground">Bugun 14:32</span>
              </div>
              <div className="p-2 hover:bg-accent rounded-md cursor-pointer">
                <p className="font-medium text-amber-600 dark:text-amber-400">Soliq toʻlovi eslatmasi</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  QQS hisoboti topshirishga 5 kun qoldi.
                </p>
                <span className="text-[9px] text-muted-foreground">Bugun 09:00</span>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-3.5 w-3.5 mr-1" />
              <span className="uppercase">{language}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-28 text-xs">
            <DropdownMenuItem onClick={() => setLanguage("uz")} className="cursor-pointer">
              🇺🇿 Oʻzbekcha
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("ru")} className="cursor-pointer">
              🇷🇺 Русский
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer">
              🇬🇧 English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu & Dev Role Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-8 w-8 rounded-full p-0 ring-1 ring-border"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-indigo-600 text-white font-semibold text-xs">
                  DX
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-xs font-semibold leading-none text-foreground">
                Dilnoza Xalilova
              </p>
              <p className="text-[11px] leading-none text-muted-foreground">
                dilnoza.bux@auvrio.uz
              </p>
              <div className="pt-1.5 flex items-center gap-1.5">
                <Badge variant="indigo" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                  {roleLabels[currentRole]}
                </Badge>
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Dev Role Switcher */}
            <DropdownMenuLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Shield className="h-3 w-3 text-amber-500" />
              Testlash: Foydalanuvchi roli
            </DropdownMenuLabel>
            {(
              [
                "workspace_owner",
                "chief_accountant",
                "accountant",
                "auditor",
                "company_director",
                "viewer",
              ] as UserRole[]
            ).map((role) => (
              <DropdownMenuItem
                key={role}
                onClick={() => {
                  setCurrentRole(role);
                  toast.success(`Rol oʻzgartirildi: ${roleLabels[role]}`);
                }}
                className="text-xs py-1.5 cursor-pointer flex items-center justify-between"
              >
                <span>{roleLabels[role]}</span>
                {currentRole === role && <UserCheck className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => toast.info("Profil sozlamalari...")}
              className="text-xs cursor-pointer"
            >
              <Settings className="mr-2 h-3.5 w-3.5" />
              Sozlamalar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.info("Demo rejimida chiqish simulyatsiyasi")}
              className="text-xs text-rose-600 cursor-pointer"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
