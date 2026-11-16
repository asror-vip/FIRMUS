"use client";

import React, { useState, useEffect, useCallback } from "react";
import { fetchInventoryItems, createInventoryItem, createJournalEntryRecord } from "@/lib/services/supabase-service";
import { inventorySchema, getFirstZodError } from "@/lib/validations/accounting";
import { useAppState } from "@/lib/mock/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { AlertTriangle, Plus, Search, Download, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function InventoryPage() {
  const { currentEntity, currentRole } = useAppState();
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newItem, setNewItem] = useState({
    sku: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    name: "",
    category: "Qadoqlash",
    quantity: "",
    unit: "dona",
    unitPrice: "",
  });

  const loadInventory = useCallback(async () => {
    if (!currentEntity?.id) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchInventoryItems(currentEntity.id);
      const mapped = (data || []).map((d: any) => ({
        id: d.id,
        sku: d.sku,
        name: d.name,
        category: d.category,
        quantity: d.quantity,
        unit: d.unit,
        costPrice: d.unitPrice || d.costPrice,
        totalValue: d.totalValue,
        status: d.status,
      }));
      setItems(mapped);
    } catch (err) {
      console.error("Error loading inventory:", err);
      toast.error("Ombor qoldiqlarini yuklashda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, [currentEntity?.id]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleExport = () => {
    const headers = ["ID", "SKU", "Nomi", "Kategoriya", "Miqdor", "Birlik", "Tannarx", "Jami qiymat", "Holat"];
    const rows = items.map((i) => [
      i.id,
      i.sku,
      `"${(i.name || "").replace(/"/g, '""')}"`,
      i.category,
      i.quantity,
      i.unit,
      i.costPrice,
      i.totalValue,
      i.status,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `firmus_inventory_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ombor qoldiqlari CSV formatida yuklab olindi");
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = inventorySchema.safeParse({
      sku: newItem.sku,
      name: newItem.name,
      category: newItem.category,
      quantity: newItem.quantity,
      unit: newItem.unit,
      unitPrice: newItem.unitPrice,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }

    setIsSubmitting(true);
    try {
      const qty = parsed.data.quantity;
      const price = parsed.data.unitPrice;
      const totalVal = qty * price;

      const created = await createInventoryItem({
        entityId: currentEntity?.id,
        sku: parsed.data.sku,
        name: parsed.data.name,
        category: parsed.data.category,
        quantity: qty,
        unit: parsed.data.unit,
        unitPrice: price,
      });

      let ledgerPosted = false;
      if (currentEntity?.id && totalVal > 0) {
        await createJournalEntryRecord({
          entityId: currentEntity.id,
          entryNumber: `JE-INV-${parsed.data.sku}-${String(created.id).slice(0, 4).toUpperCase()}`,
          entryDate: new Date().toISOString().split("T")[0],
          description: `Omborga tovar kirimi: ${parsed.data.name} (${qty} ${parsed.data.unit})`,
          debitAccountCode: "2910",
          debitAccountName: "Ombordagi tovarlar",
          creditAccountCode: "6010",
          creditAccountName: "Mol yetkazib beruvchilarga toʻlanadigan schyotlar",
          amount: totalVal,
          sourceType: "inventory_receipt",
          sourceReferenceId: String(created.id),
          idempotencyKey: `idem-inv-${created.id}`,
        });
        ledgerPosted = true;
      }

      await loadInventory();
      toast.success(
        ledgerPosted
          ? "Yangi tovar-moddiy boylik omborga va Bosh kitobga (Dt 2910 / Kt 6010) saqlandi!"
          : "Yangi tovar-moddiy boylik ombor bazasiga saqlandi!"
      );
      setIsAddOpen(false);
      setNewItem({
        sku: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        name: "",
        category: "Qadoqlash",
        quantity: "",
        unit: "dona",
        unitPrice: "",
      });
    } catch (err: any) {
      await loadInventory();
      toast.error("Tovar/provodka saqlashda xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOrderLowStock = () => {
    const lowStockItems = items.filter((i) => i.status === "low_stock");
    if (lowStockItems.length === 0) return;

    const headers = ["SKU", "Tovar nomi", "Joriy qoldiq", "Buyurtma miqdori", "Birlik", "Taxminiy narx", "Jami buyurtma summasi"];
    const rows = lowStockItems.map((i) => {
      const orderQty = 500;
      return [
        i.sku,
        `"${(i.name || "").replace(/"/g, '""')}"`,
        i.quantity,
        orderQty,
        i.unit,
        i.costPrice,
        orderQty * (i.costPrice || 0),
      ];
    });
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `xarid_buyurtmasi_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${lowStockItems.length} ta kam qolgan tovar uchun Taʼminot xarid buyurtmasi (CSV) yuklab olindi!`);
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = items.filter((i) => i.status === "low_stock").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.inventory.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.inventory.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleExport}
          >
            <Download className="h-3.5 w-3.5" />
            {t.common.export}
          </Button>

          {currentRole !== "viewer" && currentRole !== "auditor" && (
            <Button
              size="sm"
              className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t.pages.inventory.addItem}
            </Button>
          )}
        </div>
      </div>

      {/* Low stock alert banner */}
      {lowStockCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold">Diqqat: {lowStockCount} ta tovar kritik meʼyordan kam qolgan!</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Gofrokarton qutilari va Strech plyonka minimal zaxiradan past. Taʼminot boʻlimiga buyurtma berish tavsiya etiladi.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/40 text-amber-900 dark:text-amber-100"
            onClick={handleOrderLowStock}
          >
            Buyurtma berish (CSV)
          </Button>
        </div>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">{t.pages.inventory.title}</CardTitle>
            <CardDescription>{t.pages.inventory.subtitle}</CardDescription>
          </div>
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.common.search}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>{t.pages.accounting.name}</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">{t.pages.accounting.balance}</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">{t.common.amount}</TableHead>
                <TableHead>{t.common.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    {isLoading
                      ? "Ombor qoldiqlari yuklanmoqda..."
                      : "Ushbu korxonada tovar-moddiy boyliklar topilmadi."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    {item.sku}
                  </TableCell>
                  <TableCell className="font-medium text-foreground max-w-[240px] truncate">
                    {item.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.category}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">
                    {item.quantity.toLocaleString()} {item.unit}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    <Money amount={item.costPrice} />
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-foreground">
                    <Money amount={item.totalValue} />
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      status={item.status}
                    />
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stock Movements Feed (Derived from real inventory items) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-indigo-500" />
            Ombor kirim-chiqim qaydnomasi
          </CardTitle>
          <CardDescription>2910 schyot boʻyicha tovar harakati</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.date}</TableHead>
                <TableHead>Turi</TableHead>
                <TableHead>{t.pages.inventory.tabs.goods}</TableHead>
                <TableHead>Miqdor</TableHead>
                <TableHead>Schyot</TableHead>
                <TableHead>Qiymat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                    Hozircha tovar harakati mavjud emas.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={`mov-${item.id}`}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date().toISOString().split("T")[0]}
                    </TableCell>
                    <TableCell className="font-medium text-xs text-foreground">Kirim (Prixod)</TableCell>
                    <TableCell className="text-xs text-foreground">{item.name}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      +{item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-xs text-primary font-mono">Dt 2910 / Kt 6010</TableCell>
                    <TableCell className="text-xs font-mono font-semibold text-foreground">
                      <Money amount={item.totalValue} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Inventory Item Modal Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {t.pages.inventory.addItem}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Yangi tovar-moddiy zaxira yoki xom-ashyoni ombor roʻyxatiga qoʻshish.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateItem} className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">SKU / Kod *</Label>
                <Input
                  value={newItem.sku}
                  onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Kategoriya *</Label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
                >
                  <option value="Qadoqlash">Qadoqlash</option>
                  <option value="Xom-ashyo">Xom-ashyo</option>
                  <option value="Tayyor mahsulot">Tayyor mahsulot</option>
                  <option value="Ehtiyot qismlar">Ehtiyot qismlar</option>
                  <option value="Kanselyariya">Kanselyariya</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-medium text-foreground">Tovar / Mahsulot nomi *</Label>
              <Input
                placeholder="Gofrokarton qutilari 5 qatlamli (60x40x40)"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Miqdori *</Label>
                <Input
                  type="number"
                  placeholder="1500"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Oʻlchov birligi *</Label>
                <select
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
                >
                  <option value="dona">dona</option>
                  <option value="kg">kg</option>
                  <option value="tonna">tonna</option>
                  <option value="metr">metr</option>
                  <option value="litr">litr</option>
                  <option value="quti">quti</option>
                  <option value="rulon">rulon</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Birlik narxi (UZS) *</Label>
                <Input
                  type="number"
                  placeholder="8500"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsAddOpen(false)}
                disabled={isSubmitting}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saqlanmoqda..." : "Omborga kiritish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
