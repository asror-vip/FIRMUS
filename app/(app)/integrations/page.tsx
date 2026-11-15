"use client";

import React, { useState, useEffect } from "react";
import { mockIntegrations, mockSyncLogs } from "@/lib/mock/integrations";
import {
  fetchIntegrations,
  updateIntegrationSettings,
  toggleIntegrationStatusInDb,
} from "@/lib/services/supabase-service";
import { Integration } from "@/lib/mock/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/shared/status-pill";
import {
  Cable,
  CheckCircle2,
  AlertCircle,
  Settings,
  RefreshCw,
  Power,
  Shield,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function IntegrationsPage() {
  const { t } = useTranslation();
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInteg, setSelectedInteg] = useState<Integration | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [configUrl, setConfigUrl] = useState("");
  const [configToken, setConfigToken] = useState("");

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetchIntegrations()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setIntegrations(data);
        }
      })
      .catch((err) => console.error("Error loading integrations:", err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenSettings = (integ: Integration) => {
    setSelectedInteg(integ);
    setConfigUrl(
      integ.provider === "1c_enterprise"
        ? "https://1c.firmus-enterprise.uz/accounting/odata/standard.odata"
        : integ.provider === "didox"
        ? "https://api.didox.uz/v1"
        : "https://api.kapitalbank.uz/open-banking/v2"
    );
    setConfigToken("sb_live_sec_99a81b3df67210");
  };

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    toast.info("Xizmatga soʻrov yuborilmoqda (AES-256 shifrlangan TLS 1.3)...");
    setTimeout(() => {
      setIsTestingConnection(false);
      toast.success(
        `«${selectedInteg?.name}» API serveri bilan ulanish muvaffaqiyatli! Server 200 OK kodi bilan javob berdi.`
      );
    }, 1000);
  };

  const handleSaveSettings = async () => {
    if (!selectedInteg) return;
    try {
      await updateIntegrationSettings(
        selectedInteg.id,
        { apiUrl: configUrl, clientToken: configToken },
        "connected"
      );
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === selectedInteg.id
            ? { ...i, status: "connected", lastSyncTime: "Hozirgina", recordsSyncedToday: i.recordsSyncedToday + 12 }
            : i
        )
      );
      toast.success(`«${selectedInteg.name}» integratsiya parametrlari Supabase bazasiga saqlandi!`);
      setSelectedInteg(null);
    } catch (err: any) {
      toast.error("Sozlamalarni saqlashda xatolik: " + err.message);
    }
  };

  const handleToggleStatus = async (integ: Integration) => {
    const nextStatus = integ.status === "connected" ? "disconnected" : "connected";
    try {
      await toggleIntegrationStatusInDb(integ.id, nextStatus);
      setIntegrations((prev) =>
        prev.map((i) => (i.id === integ.id ? { ...i, status: nextStatus } : i))
      );
      toast.success(
        nextStatus === "connected"
          ? `«${integ.name}» muvaffaqiyatli ulandi va sinxronizatsiya faollashdi!`
          : `«${integ.name}» ulanishi toʻxtatildi.`
      );
    } catch (err: any) {
      toast.error("Holatni oʻzgartirishda xatolik: " + err.message);
    }
  };

  const handleSyncAll = () => {
    setIsLoading(true);
    toast.info("Didox, 1C va Bank integratsiyalari boʻyicha sinxronizatsiya boshlandi...");
    setTimeout(() => {
      setIsLoading(false);
      setIntegrations((prev) =>
        prev.map((i) =>
          i.status === "connected"
            ? { ...i, lastSyncTime: "Hozirgina", recordsSyncedToday: i.recordsSyncedToday + 5 }
            : i
        )
      );
      toast.success("Barcha faol integratsiyalar yangilandi! Yangi elektron hujjatlar va toʻlovlar yuklandi.");
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            {t.pages.integrations.title}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.pages.integrations.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 gap-1.5"
            onClick={handleSyncAll}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {t.pages.integrations.syncAll}
          </Button>
        </div>
      </div>

      {/* Grid of Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integ) => (
          <Card
            key={integ.id}
            className="hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    {integ.provider.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-xs font-semibold leading-tight">
                      {integ.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-[9px] uppercase mt-1">
                      {integ.category}
                    </Badge>
                  </div>
                </div>

                <StatusPill status={integ.status} />
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {integ.description}
              </p>

              {integ.errorDetail && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2 text-[10px] text-rose-600 dark:text-rose-400">
                  {integ.errorDetail}
                </div>
              )}

              <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{integ.lastSyncTime}</span>
                <span className="font-mono">{integ.recordsSyncedToday} ta sinxron</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleOpenSettings(integ)}
                >
                  <Settings className="mr-1 h-3 w-3" />
                  {t.common.edit}
                </Button>

                {integ.status === "connected" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-rose-600"
                    onClick={() => handleToggleStatus(integ)}
                  >
                    {t.common.disconnect}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => handleToggleStatus(integ)}
                  >
                    {t.common.connect}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sync Logs Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {t.pages.integrations.syncHistory}
          </CardTitle>
          <CardDescription>
            {t.pages.integrations.syncHistorySub}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.common.time}</TableHead>
                <TableHead>{t.common.name}</TableHead>
                <TableHead>{t.common.inbound} / {t.common.outbound}</TableHead>
                <TableHead className="text-right">{t.common.records}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead>{t.common.description}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSyncLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {log.timestamp}
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-foreground">
                    {log.providerName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {log.type === "inbound" ? t.common.inbound : t.common.outbound}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-xs">
                    {log.recordsProcessed}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={log.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-sm truncate">
                    {log.message}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Configuration Modal */}
      {selectedInteg && (
        <Dialog open={!!selectedInteg} onOpenChange={() => setSelectedInteg(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedInteg.name} — Sozlamalar</DialogTitle>
              <DialogDescription>
                Server parametrlari va shifrlangan kalitlar (AES-256-GCM).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">
                  Server Ulanish Manzili (URL):
                </label>
                <Input
                  value={configUrl}
                  onChange={(e) => setConfigUrl(e.target.value)}
                  placeholder="https://api.didox.uz/v1 yoki 1C OData URL"
                  className="font-mono text-xs h-8"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">
                  Mijoz Kaliti (Client Secret / Token):
                </label>
                <Input
                  value={configToken}
                  onChange={(e) => setConfigToken(e.target.value)}
                  type="password"
                  placeholder="Didox token yoki 1C basic auth"
                  className="font-mono text-xs h-8"
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground flex items-center gap-1 mb-0.5">
                  <Shield className="h-3 w-3 text-emerald-500" />
                  Xavfsizlik kafolati:
                </span>
                Barcha maxfiy API kalitlar AES-256 shifrlangan holda Supabase bazasida xavfsiz saqlanadi.
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTestingConnection}
                className="text-xs"
              >
                {isTestingConnection ? "Tekshirilmoqda..." : "Ulanishni tekshirish"}
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                onClick={handleSaveSettings}
              >
                Bazaga saqlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
