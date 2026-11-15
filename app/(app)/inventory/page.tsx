"use client";

import React, { useState } from "react";
import { mockInventoryItems, mockStockMovements } from "@/lib/mock/inventory";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/shared/status-pill";
import { Money } from "@/components/shared/money";
import { Package, AlertTriangle, Plus, Search, Download, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";

export default function InventoryPage() {
  const [search, setSearch] = useState("");

  const filteredItems = mockInventoryItems.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = mockInventoryItems.filter((i) => i.status === "low_stock").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Omborxona & Tovar Qoldiqlari
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            1C:Enterprise va Didox yuk xatlari orqali avtomatik yangilanuvchi tovar-moddiy zaxiralar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={() => toast.success("Inventarizatsiya vedomosti eksport qilindi")}
          >
            <Download className="h-3.5 w-3.5" />
            Eksport
          </Button>

          <Button
            size="sm"
            className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => toast.info("Yangi tovar kartochkasi kiritish...")}
          >
            <Plus className="h-3.5 w-3.5" />
            Tovar qoʻshish
          </Button>
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
            onClick={() => toast.info("Xarid buyurtmasi shakllantirilmoqda...")}
          >
            Buyurtma berish
          </Button>
        </div>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold">Ombordagi Mahsulotlar Roʻyxati</CardTitle>
            <CardDescription>Barcha tovarlar, xomashyo va materiallar qoldigʻi</CardDescription>
          </div>
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SKU yoki tovar nomi..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU / Artikil</TableHead>
                <TableHead>Mahsulot Nomi</TableHead>
                <TableHead>Kategoriya</TableHead>
                <TableHead className="text-right">Qoldiq</TableHead>
                <TableHead className="text-right">Tannarx</TableHead>
                <TableHead className="text-right">Umumiy Qiymati</TableHead>
                <TableHead>Holat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
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
                      status={item.status === "in_stock" ? "active" : "pending"}
                      label={item.status === "in_stock" ? "Yetarli" : "Kam qoldi"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stock Movements Feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-indigo-500" />
            Soʻnggi Tovar Harakatlari (Kirim / Chiqim)
          </CardTitle>
          <CardDescription>Didox E-SF va talabnomalar boʻyicha hisobdan chiqarishlar</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sana</TableHead>
                <TableHead>Operatsiya Turi</TableHead>
                <TableHead>Mahsulot</TableHead>
                <TableHead>Miqdor</TableHead>
                <TableHead>Hujjat Asosi</TableHead>
                <TableHead>Javobgar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockStockMovements.map((sm) => (
                <TableRow key={sm.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{sm.date}</TableCell>
                  <TableCell className="font-medium text-xs text-foreground">{sm.type}</TableCell>
                  <TableCell className="text-xs text-foreground">{sm.itemName}</TableCell>
                  <TableCell className={`font-mono text-xs font-bold ${sm.quantity.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                    {sm.quantity}
                  </TableCell>
                  <TableCell className="text-xs text-primary font-mono">{sm.docRef}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{sm.user}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
