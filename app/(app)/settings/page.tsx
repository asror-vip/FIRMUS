"use client";

import React, { useState } from "react";
import { useAppState } from "@/lib/mock/store";
import { mockBusinessEntities } from "@/lib/mock/entities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import { UserRole } from "@/lib/mock/types";
import {
  Settings,
  Building,
  Shield,
  Bell,
  Globe,
  User,
  CheckCircle2,
  Lock,
  Smartphone,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function SettingsPage() {
  const { t } = useTranslation();
  const {
    currentWorkspace,
    currentRole,
    setCurrentRole,
    language,
    setLanguage,
  } = useAppState();

  const [activeTab, setActiveTab] = useState("entities");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [telegramAlerts, setTelegramAlerts] = useState(true);

  const roleLabels: Record<UserRole, string> = {
    workspace_owner: "Workspace Owner (Toʻliq ega)",
    chief_accountant: "Bosh buxgalter (Tasdiqlovchi)",
    accountant: "Buxgalter (Mijoz operatori)",
    auditor: "Auditor (Faqat oʻqish)",
    company_director: "Bosh direktor",
    viewer: "Kuzatuvchi",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t.pages.settings.title}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t.pages.settings.subtitle}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="entities" className="text-xs gap-1.5">
            <Building className="h-3.5 w-3.5" />
            {t.pages.settings.tabs.entities}
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            {t.pages.settings.tabs.security}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            {t.pages.settings.tabs.notifications}
          </TabsTrigger>
          <TabsTrigger value="language" className="text-xs gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            {t.pages.settings.tabs.language}
          </TabsTrigger>
        </TabsList>

        {/* 1. Entities Management Tab */}
        <TabsContent value="entities" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  {t.pages.settings.entitiesTitle}
                </CardTitle>
                <CardDescription>
                  {t.pages.settings.entitiesDesc}
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => toast.info(`${t.pages.settings.addEntity}...`)}
              >
                {t.pages.settings.addEntity}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.pages.settings.companyName}</TableHead>
                    <TableHead>{t.pages.settings.tinStir}</TableHead>
                    <TableHead>{t.pages.settings.legalForm}</TableHead>
                    <TableHead>{t.pages.settings.taxRegime}</TableHead>
                    <TableHead>{t.pages.settings.managingAccountant}</TableHead>
                    <TableHead>{t.pages.settings.status}</TableHead>
                    <TableHead className="text-right">{t.pages.settings.action}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockBusinessEntities.map((ent) => (
                    <TableRow key={ent.id} className="hover:bg-muted/50">
                      <TableCell className="font-semibold text-xs text-foreground">
                        {ent.name}
                        {ent.tradeName && (
                          <span className="text-[10px] text-muted-foreground block">
                            {ent.tradeName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-primary font-bold">
                        {ent.tinStir}
                      </TableCell>
                      <TableCell className="text-xs">{ent.companyType}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {ent.taxRegime === "vat_profit_tax"
                            ? "QQS + Foyda"
                            : ent.taxRegime === "turnover_tax"
                            ? "Aylanma soliq (4%)"
                            : "Qatʼiy soliq"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ent.accountantName}
                      </TableCell>
                      <TableCell>
                        <StatusPill status="active" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2"
                          onClick={() => toast.info(`${ent.name}`)}
                        >
                          {t.pages.settings.edit}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Security & E-IMZO Tab */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t.pages.settings.securityTitle}</CardTitle>
              <CardDescription>{t.pages.settings.securityDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground text-xs block">
                    {t.pages.settings.twoFactorTitle}
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    {t.pages.settings.twoFactorDesc}
                  </p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={(val) => {
                    setTwoFactorEnabled(val);
                    toast.success(`2FA ${val ? t.statuses.active : t.common.reject}`);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground text-xs block">
                    {t.pages.settings.zeroTrustTitle}
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    {t.pages.settings.zeroTrustDesc}
                  </p>
                </div>
                <Badge variant="success" className="text-[10px]">
                  {t.pages.settings.guaranteed}
                </Badge>
              </div>

              <div className="pt-2">
                <h4 className="font-semibold text-foreground text-xs mb-2">{t.pages.settings.activeSessions}:</h4>
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="font-semibold text-foreground">Google Chrome (Windows 11) • {t.pages.settings.currentSession}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{t.pages.settings.online}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    IP: 213.230.77.12 (Tashkent) • {t.common.date}: {t.common.now}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t.pages.settings.notificationsTitle}</CardTitle>
              <CardDescription>{t.pages.settings.notificationsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <span className="font-semibold text-foreground block">{t.pages.settings.emailAlerts}</span>
                  <p className="text-muted-foreground text-[11px]">
                    {t.pages.settings.emailAlertsDesc}
                  </p>
                </div>
                <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <span className="font-semibold text-foreground block">{t.pages.settings.telegramAlerts}</span>
                  <p className="text-muted-foreground text-[11px]">
                    {t.pages.settings.telegramAlertsDesc}
                  </p>
                </div>
                <Switch checked={telegramAlerts} onCheckedChange={setTelegramAlerts} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Language Tab */}
        <TabsContent value="language" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{t.pages.settings.interfaceLangTitle}</CardTitle>
              <CardDescription>{t.pages.settings.interfaceLangDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {[
                { code: "uz", name: "Oʻzbekcha (Lotin)", flag: "🇺🇿" },
                { code: "ru", name: "Русский (Официальный)", flag: "🇷🇺" },
                { code: "en", name: "English (Global)", flag: "🇬🇧" },
              ].map((lang) => (
                <div
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as any);
                    toast.success(`Til oʻzgartirildi: ${lang.name}`);
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    language === lang.code
                      ? "border-primary bg-primary/5 font-semibold"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                  {language === lang.code && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
