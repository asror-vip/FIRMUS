"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/context/app-state";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { createWorkspaceRecord } from "@/lib/services/supabase-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";

export function WorkspaceSwitcher() {
  const { workspaces, currentWorkspace, setCurrentWorkspaceId, refreshContext } = useAppState();
  const { t } = useTranslation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsType, setWsType] = useState<"accounting_firm" | "individual_company">("accounting_firm");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || wsName.trim().length < 2) {
      toast.error("Ishchi maydon nomini kamida 2 ta harfdan iborat kiriting");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createWorkspaceRecord(wsName.trim(), wsType);
      await refreshContext();
      setCurrentWorkspaceId(created.id);
      toast.success(`«${created.name}» ishchi maydoni yaratildi!`);
      setWsName("");
      setIsAddOpen(false);
    } catch (err: any) {
      toast.error("Ishchi maydon yaratishda xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
            onClick={() => setIsAddOpen(true)}
            className="text-xs text-primary font-medium cursor-pointer"
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            {t.workspace.add}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{t.workspace.add}</DialogTitle>
            <DialogDescription className="text-xs">
              Yangi buxgalteriya firmasi yoki alohida kompaniya ishchi maydonini yaratish
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-3 pt-2 text-xs">
            <div>
              <Label className="text-[11px] font-medium">Ishchi maydon nomi *</Label>
              <Input
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="Masalan: Samarqand Audit MChJ"
                className="h-8 text-xs mt-1"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium">Maydon turi *</Label>
              <select
                value={wsType}
                onChange={(e) => setWsType(e.target.value as any)}
                className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
              >
                <option value="accounting_firm">Buxgalteriya firmasi (Koʻp korxonali)</option>
                <option value="individual_company">Yagona kompaniya</option>
              </select>
            </div>
            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                {isSubmitting ? "Yaratilmoqda..." : "Yaratish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
