"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/mock/store";
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

export function QuickEntityBanner({
  contextNote = "Bosh kitobga yozish va bazada saqlash uchun korxonani 10 soniyada qoʻshing (Bank ↔ 1C Sverka korxona qoʻshmasdan ham ishlaydi).",
}: {
  contextNote?: string;
}) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Building2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-foreground">
              Korxona ulanmagan (Ixtiyoriy tezkor sozlash)
            </div>
            <p className="text-[11px] text-muted-foreground">{contextNote}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 border-indigo-500/40 shrink-0"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          10 soniyada korxona qoʻshish
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Korxonani tezkor qoʻshish (Zero-PII)</DialogTitle>
            <DialogDescription className="text-xs">
              Shaxsiy telefon yoki JShShIR talab qilinmaydi — faqat korxona yuridik nomi va STIR kiritiladi.
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
                placeholder="308554433"
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
