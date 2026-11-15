"use client";

import React from "react";
import { useAppState } from "@/lib/mock/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, setCurrentWorkspaceId } = useAppState();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-[210px] justify-between border-border/80 bg-background/50 px-2.5 text-xs font-normal hover:bg-accent"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
              <Building2 className="h-3 w-3" />
            </div>
            <span className="truncate font-medium text-foreground">
              {currentWorkspace.name}
            </span>
          </div>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {t.workspace.title}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => {
              setCurrentWorkspaceId(ws.id);
              toast.success(`${t.workspace.title}: ${ws.name}`);
            }}
            className="flex items-center justify-between text-xs py-2 cursor-pointer"
          >
            <div className="flex flex-col truncate pr-2">
              <span className="font-medium truncate text-foreground">{ws.name}</span>
              <span className="text-[10px] text-muted-foreground capitalize">
                {ws.type === "accounting_firm" ? t.workspace.firm : t.workspace.single}
              </span>
            </div>
            {ws.id === currentWorkspace.id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => toast.info(`${t.workspace.add}...`)}
          className="text-xs text-primary font-medium cursor-pointer"
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          {t.workspace.add}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
