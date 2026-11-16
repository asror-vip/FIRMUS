"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/context/app-state";
import { createBusinessEntity, createWorkspaceRecord } from "@/lib/services/supabase-service";
import { businessEntitySchema, getFirstZodError } from "@/lib/validations/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export function QuickEntityBanner() {
  const { user, currentWorkspace, currentEntity, refreshContext } = useAppState();
  const [open, setOpen] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [tinStir, setTinStir] = useState("");
  const [taxRegime, setTaxRegime] = useState<"vat_profit_tax" | "turnover_tax">("vat_profit_tax");
  const [isSaving, setIsSaving] = useState(false);

  if (!user?.id || currentEntity?.id) {
    return null;
  }

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = businessEntitySchema.safeParse({
      legalName,
      tinStir,
      companyType: "MChJ",
      taxRegime,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }

    setIsSaving(true);
    try {
      let wsId = currentWorkspace?.id;
      if (!wsId) {
        const ws = await createWorkspaceRecord(`${legalName.trim().slice(0, 24)} Workspace`, "individual_company");
        wsId = ws.id;
        try {
          localStorage.setItem("firmus_workspace", wsId);
        } catch {}
      }

      const ent = await createBusinessEntity({
        workspaceId: wsId,
        legalName: legalName.trim(),
        tinStir: tinStir.replace(/\D/g, "").slice(0, 9),
        companyType: "MChJ",
        taxRegime,
        accountantName: "Bosh buxgalter",
      });

      try {
        localStorage.setItem("firmus_entity", ent.id);
      } catch {}

      await refreshContext();
      setOpen(false);
      setLegalName("");
      setTinStir("");
      toast.success("Korxona va 21-BHMS schyotlar rejasi yaratildi!");
    } catch (err: any) {
      toast.error("Korxona qoʻshishda xatolik: " + (err?.message || "Nomaʼlum xato"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Building2 className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>Korxona ulanmagan</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5 shrink-0"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Korxona qoʻshish
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Korxona qoʻshish</DialogTitle>
            <DialogDescription className="text-xs">
              Korxona nomi va STIR
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickCreate} className="space-y-3 py-1">
            <div className="space-y-1">
              <Label htmlFor="quick-entity-name" className="text-xs">Korxona nomi</Label>
              <Input
                id="quick-entity-name"
                placeholder='Masalan: MChJ "BARAKA SAVDO"'
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quick-entity-stir" className="text-xs">Korxona STIR (9 raqam)</Label>
              <Input
                id="quick-entity-stir"
                placeholder="9 xonali STIR"
                value={tinStir}
                onChange={(e) => setTinStir(e.target.value.replace(/\D/g, "").slice(0, 9))}
                maxLength={9}
                required
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Soliq rejimi</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={taxRegime === "vat_profit_tax" ? "default" : "outline"}
                  className="h-8 text-[11px]"
                  onClick={() => setTaxRegime("vat_profit_tax")}
                >
                  QQS (12%) + Foyda
                </Button>
                <Button
                  type="button"
                  variant={taxRegime === "turnover_tax" ? "default" : "outline"}
                  className="h-8 text-[11px]"
                  onClick={() => setTaxRegime("turnover_tax")}
                >
                  Aylanmadan (4%)
                </Button>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="gap-1.5">
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Saqlash va 21-BHMS ulash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
