"use client";

import React, { useState, useEffect } from "react";
import {
  fetchIntegrations,
  updateIntegrationSettings,
  toggleIntegrationStatusInDb,
  fetchSyncLogs,
  recordIntegrationSyncInDb,
} from "@/lib/services/supabase-service";
import { useAppState } from "@/lib/mock/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/shared/status-pill";
import { Settings, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function IntegrationsPage() {
  const { currentEntity } = useAppState();
  const { t } = useTranslation();

  const [integrations, setIntegrations] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInteg, setSelectedInteg] = useState<any | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [configUrl, setConfigUrl] = useState("");
  const [configToken, setConfigToken] = useState("");

  const loadData = async () => {
    if (!currentEntity?.id) return;
    setIsLoading(true);
    try {
      const [integs, logs] = await Promise.all([
        fetchIntegrations(currentEntity.id),
        fetchSyncLogs(currentEntity.id),
      ]);
      setIntegrations(integs || []);
      setSyncLogs(logs || []);
    } catch (err) {
      console.error("Error loading integrations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentEntity?.id]);

  const handleOpenSettings = (integ: any) => {
    setSelectedInteg(integ);
    setTestResultMsg(null);
    setConfigUrl(
      integ.settings?.apiUrl ||
        (integ.provider === "1c_enterprise"
          ? "https://1c.firmus-enterprise.uz/accounting/odata/standard.odata"
          : integ.provider === "didox"
          ? "https://api.didox.uz/v1"
          : "https://api.kapitalbank.uz/open-banking/v2")
    );
    setConfigToken(integ.settings?.clientToken || "");
  };

  const handleTestConnection = async () => {
    if (!configUrl.trim()) {
      toast.error("Avval Server Ulanish Manzilini (URL) kiriting");
      return;
    }
    setIsTestingConnection(true);
    setTestResultMsg(null);

    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiUrl: configUrl.trim(),
          provider: selectedInteg?.provider,
        }),
      });
      const data = await res.json();

      if (data.reachable) {
        const msg = `Haqiqiy ulanish muvaffaqiyatli! ${data.message}`;
        setTestResultMsg({ ok: true, text: msg });
        toast.success(msg);
      } else {
        const errMsg = data.error || "Tashqi serverga ulanib boʻlmadi";
        setTestResultMsg({ ok: false, text: errMsg });
        toast.error(errMsg);
      }
    } catch (err: any) {
      const msg = "Tekshiruv soʻrovida xatolik: " + err.message;
      setTestResultMsg({ ok: false, text: msg });
      toast.error(msg);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedInteg) return;
    if (!configUrl.trim()) {
      toast.error("Server manzili boʻsh boʻlishi mumkin emas");
      return;
    }
    try {
      await updateIntegrationSettings(
        selectedInteg.id,
        { apiUrl: configUrl.trim(), clientToken: configToken.trim() },
        "connected"
      );
      await loadData();
      toast.success(`«${selectedInteg.name}» parametrlari Supabase bazasiga saqlandi!`);
      setSelectedInteg(null);
    } catch (err: any) {
      toast.error("Sozlamalarni saqlashda xatolik: " + err.message);
    }
  };

  const handleToggleStatus = async (integ: any) => {
    const nextStatus = integ.status === "connected" ? "disconnected" : "connected";
    try {
      await toggleIntegrationStatusInDb(integ.id, nextStatus);
      setIntegrations((prev) =>
        prev.map((i) => (i.id === integ.id ? { ...i, status: nextStatus } : i))
      );
      toast.success(
        nextStatus === "connected"
          ? `«${integ.name}» ulandi!`
          : `«${integ.name}» ulanishi toʻxtatildi.`
      );
    } catch (err: any) {
      toast.error("Holatni oʻzgartirishda xatolik: " + err.message);
    }
  };

  const handleSyncAll = async () => {
    if (!currentEntity?.id) return;
    const connectedOnes = integrations.filter((i) => i.status === "connected");
    if (connectedOnes.length === 0) {
      toast.info("Sinxronlash uchun kamida bitta faol (connected) integratsiya boʻlishi kerak.");
      return;
    }
    setIsLoading(true);
    try {
      for (const integ of connectedOnes) {
        await recordIntegrationSyncInDb(
          integ.id,
          currentEntity.id,
          integ.name,
          `${integ.name} holati tekshirildi va bazadagi oxirgi vaqt yangilandi.`,
          0
        );
      }
      await loadData();
      toast.success(`${connectedOnes.length} ta faol integratsiya jurnali yangilandi!`);
    } catch (err: any) {
      toast.error("Sinxronizatsiya xatosi: " + err.message);
    } finally {
      setIsLoading(false);
    }
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
              {syncLogs.length > 0 ? (
                syncLogs.map((log) => (
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                    Hozircha sinxronizatsiya jurnali yozuvlari mavjud emas.
                  </TableCell>
                </TableRow>
              )}
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
                Server parametrlari va real ulanishni tekshirish
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

              {testResultMsg && (
                <div
                  className={`rounded-lg border p-2.5 text-[11px] ${
                    testResultMsg.ok
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {testResultMsg.text}
                </div>
              )}

              <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground flex items-center gap-1 mb-0.5">
                  <Shield className="h-3 w-3 text-emerald-500" />
                  Server-side tekshiruv:
                </span>
                «Ulanishni tekshirish» tugmasi real HTTPS/DNS soʻrovi yuborib, server javob vaqtini (ms) oʻlchaydi.
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
