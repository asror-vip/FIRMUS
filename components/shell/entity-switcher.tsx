"use client";

import React from "react";
import { useAppState } from "@/lib/mock/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Briefcase, Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function EntitySwitcher() {
  const { entities, currentEntity, setCurrentEntityId } = useAppState();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-[230px] justify-between border-border/80 bg-background/50 px-2.5 text-xs font-normal hover:bg-accent"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Briefcase className="h-3 w-3" />
            </div>
            <div className="flex flex-col text-left truncate leading-tight">
              <span className="truncate font-semibold text-foreground">
                {currentEntity.tradeName || currentEntity.name}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                STIR: {currentEntity.tinStir}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Biriktirilgan korxonalar (Client Entities)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {entities.map((ent) => (
          <DropdownMenuItem
            key={ent.id}
            onClick={() => {
              setCurrentEntityId(ent.id);
              toast.success(`Faol korxona tanlandi: ${ent.name}`);
            }}
            className="flex items-center justify-between text-xs py-2 cursor-pointer"
          >
            <div className="flex flex-col truncate pr-2">
              <span className="font-medium truncate text-foreground">{ent.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-muted-foreground">
                  STIR: {ent.tinStir}
                </span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                  {ent.taxRegime === "vat_profit_tax"
                    ? "QQS + Foyda"
                    : ent.taxRegime === "turnover_tax"
                    ? "Aylanma 4%"
                    : "Qatʼiy soliq"}
                </Badge>
              </div>
            </div>
            {ent.id === currentEntity.id && (
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => toast.info("Yangi korxona qoʻshish (STIR orqali) ochilmoqda...")}
          className="text-xs text-primary font-medium cursor-pointer"
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Yangi korxona biriktirish
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
