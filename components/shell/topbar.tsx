"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { EntitySwitcher } from "./entity-switcher";
import { NotificationsPopover } from "./notifications-popover";
import { useAppState } from "@/lib/mock/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
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
  const router = useRouter();
  const {
    setIsSearchOpen,
    toggleAiDrawer,
    currentRole,
    setCurrentRole,
    language,
    setLanguage,
  } = useAppState();

  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

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
            <span>{t.common.search}</span>
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
          className="h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm px-2.5 text-xs transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-100" />
          <span className="hidden sm:inline">AI Copilot</span>
          <span className="inline-flex items-center h-4 px-1.5 rounded-full text-[9px] font-bold bg-white text-indigo-700 shadow-xs tracking-wide">
            GPT-6
          </span>
        </Button>

        {/* Enhanced Multi-Category Notifications Popover */}
        <NotificationsPopover />

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
          <DropdownMenuContent align="end" className="w-32 text-xs">
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
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-xs font-semibold leading-none text-foreground">
                Dilnoza Xalilova
              </p>
              <p className="text-[11px] leading-none text-muted-foreground font-mono">
                dilnoza.bux@firmus.uz
              </p>
              <div className="pt-1.5 flex items-center gap-1.5">
                <Badge variant="indigo" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                  {t.roles[currentRole]}
                </Badge>
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="text-xs cursor-pointer"
            >
              <Settings className="mr-2 h-3.5 w-3.5" />
              Sozlamalar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.info("Tizimdan chiqish tasdiqlandi")}
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
