"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppState } from "@/lib/context/app-state";
import { FEATURES } from "@/lib/config/features";
import {
  fetchBusinessEntities,
  createBusinessEntity,
  updateBusinessEntity,
} from "@/lib/services/supabase-service";
import { businessEntitySchema, getFirstZodError } from "@/lib/validations/accounting";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/shared/status-pill";
import {
  Building,
  Shield,
  Bell,
  Globe,
  CheckCircle2,
  Plus,
  User,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/useTranslation";

function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return email || "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) {
    return `${local[0] || ""}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const {
    user,
    currentWorkspace,
    currentRole,
    subscription,
    language,
    setLanguage,
    refreshContext,
  } = useAppState();

  const [entities, setEntities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddEntityOpen, setIsAddEntityOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newEntity, setNewEntity] = useState({
    legalName: "",
    tradeName: "",
    tinStir: "",
    companyType: "MChJ",
    taxRegime: "vat_profit_tax",
    accountantName: "Bosh buxgalter",
  });

  const [activeTab, setActiveTab] = useState(FEATURES.multiCompanyMode ? "entities" : "profile");
  const [showEmail, setShowEmail] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [telegramAlerts, setTelegramAlerts] = useState(true);

  // Handle URL query params (?action=add-entity or ?tab=security)
  useEffect(() => {
    const action = searchParams.get("action");
    const tabParam = searchParams.get("tab");
    if (action === "add-entity" && FEATURES.multiCompanyMode) {
      setActiveTab("entities");
      setIsAddEntityOpen(true);
    } else if (
      tabParam &&
      (FEATURES.multiCompanyMode
        ? ["entities", "profile", "security", "notifications", "language"]
        : ["profile", "security", "notifications", "language"]
      ).includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load saved preferences
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`firmus_prefs_${user?.id || "default"}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.twoFactorEnabled === "boolean") setTwoFactorEnabled(parsed.twoFactorEnabled);
          if (typeof parsed.emailAlerts === "boolean") setEmailAlerts(parsed.emailAlerts);
          if (typeof parsed.telegramAlerts === "boolean") setTelegramAlerts(parsed.telegramAlerts);
        }
      } catch {
        // ignore invalid json
      }
    }
  }, [user?.id]);

  const persistPrefs = (next: { twoFactorEnabled: boolean; emailAlerts: boolean; telegramAlerts: boolean }) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`firmus_prefs_${user?.id || "default"}`, JSON.stringify(next));
    }
  };

  const loadEntities = useCallback(async () => {
    if (!FEATURES.multiCompanyMode) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchBusinessEntities();
      const filtered = currentWorkspace?.id
        ? (data || []).filter((e: any) => !e.workspaceId || e.workspaceId === currentWorkspace.id)
        : data || [];
      setEntities(filtered);
    } catch (err) {
      console.error("Error loading entities:", err);
      toast.error("Korxonalarni bazadan yuklab boʻlmadi");
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = businessEntitySchema.safeParse({
      legalName: newEntity.legalName,
      tradeName: newEntity.tradeName || undefined,
      tinStir: newEntity.tinStir,
      companyType: newEntity.companyType,
      taxRegime: newEntity.taxRegime,
      accountantName: newEntity.accountantName || undefined,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }

    setIsSubmitting(true);
    try {
      await createBusinessEntity({
        workspaceId: currentWorkspace?.id,
        legalName: parsed.data.legalName,
        tradeName: parsed.data.tradeName || undefined,
        tinStir: parsed.data.tinStir,
        companyType: parsed.data.companyType,
        taxRegime: parsed.data.taxRegime,
        accountantName: parsed.data.accountantName || "Bosh buxgalter",
      });

      await Promise.all([loadEntities(), refreshContext()]);
      toast.success("Yangi yuridik korxona va 22 ta BHMS schyoti Supabase bazasiga saqlandi!");
      setIsAddEntityOpen(false);
      setNewEntity({
        legalName: "",
        tradeName: "",
        tinStir: "",
        companyType: "MChJ",
        taxRegime: "vat_profit_tax",
        accountantName: "Bosh buxgalter",
      });
    } catch (err: any) {
      toast.error("Korxona qoʻshishda xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntity) return;
    const parsed = businessEntitySchema.safeParse({
      legalName: editingEntity.name,
      tradeName: editingEntity.tradeName || undefined,
      tinStir: editingEntity.tinStir,
      companyType: editingEntity.companyType || "MChJ",
      taxRegime: editingEntity.taxRegime || "vat_profit_tax",
      accountantName: editingEntity.accountantName || undefined,
    });
    if (!parsed.success) {
      toast.error(getFirstZodError(parsed.error));
      return;
    }

    setIsSubmitting(true);
    try {
      await updateBusinessEntity(editingEntity.id, {
        legalName: parsed.data.legalName,
        tradeName: parsed.data.tradeName,
        tinStir: parsed.data.tinStir,
        companyType: parsed.data.companyType,
        taxRegime: parsed.data.taxRegime,
        accountantName: parsed.data.accountantName,
      });
      await Promise.all([loadEntities(), refreshContext()]);
      toast.success(`«${parsed.data.legalName}» maʼlumotlari Supabase bazasida yangilandi!`);
      setEditingEntity(null);
    } catch (err: any) {
      toast.error("Tahrirlashda xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t.pages.settings.title}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {FEATURES.multiCompanyMode
            ? t.pages.settings.subtitle
            : "Shaxsiy profil, xavfsizlik, bildirishnomalar va interfeys tili"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 flex-wrap">
          {FEATURES.multiCompanyMode && (
            <TabsTrigger value="entities" className="text-xs gap-1.5">
              <Building className="h-3.5 w-3.5" />
              {t.pages.settings.tabs.entities}
            </TabsTrigger>
          )}
          <TabsTrigger value="profile" className="text-xs gap-1.5">
            <User className="h-3.5 w-3.5" />
            Profil
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

        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Shaxsiy hisob maʼlumotlari</CardTitle>
              <CardDescription className="text-xs">
                Akkauntingiz va joriy obuna holati
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <span className="text-[11px] text-muted-foreground block">Ism / Profil</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {user?.user_metadata?.full_name ||
                      user?.user_metadata?.name ||
                      (user?.email ? user.email.split("@")[0] : "Foydalanuvchi")}
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Elektron pochta</span>
                    <button
                      type="button"
                      onClick={() => setShowEmail((prev) => !prev)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                      title={showEmail ? "Yashirish" : "Koʻrsatish"}
                      aria-label={showEmail ? "Elektron pochtani yashirish" : "Elektron pochtani koʻrsatish"}
                    >
                      {showEmail ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="font-mono font-medium text-foreground mt-0.5 block truncate">
                    {showEmail ? (user?.email || "—") : maskEmail(user?.email)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Joriy tarif</span>
                    <Badge variant="indigo" className="text-[10px]">
                      {subscription.isTrialActive ? "Pro (Sinov)" : subscription.planName}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tarif va oylik foydalanish limitlarini Obunalar sahifasida koʻring
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0">
                  <Link href="/billing">
                    <CreditCard className="h-3.5 w-3.5" />
                    Obunalarni ochish
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 1. Entities Management Tab (Multi-Company B2B mode only) */}
        {FEATURES.multiCompanyMode && (
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
              {currentRole !== "viewer" && currentRole !== "auditor" && (
                <Button
                  size="sm"
                  className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  onClick={() => setIsAddEntityOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t.pages.settings.addEntity}
                </Button>
              )}
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
                  {entities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                        {isLoading
                          ? "Korxonalar yuklanmoqda..."
                          : "Ushbu ishchi maydonda korxonalar kiritilmagan."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    entities.map((ent) => (
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
                        {currentRole !== "viewer" && currentRole !== "auditor" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => setEditingEntity({ ...ent })}
                          >
                            {t.pages.settings.edit}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* 2. Security Tab */}
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
                    persistPrefs({ twoFactorEnabled: val, emailAlerts, telegramAlerts });
                    toast.success(`2FA ${val ? t.statuses.active : t.common.reject}`);
                  }}
                />
              </div>

              <div className="pt-2">
                <h4 className="font-semibold text-foreground text-xs mb-2">{t.pages.settings.activeSessions}:</h4>
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="font-semibold text-foreground">
                      {(user?.email ? maskEmail(user.email) : "Autentifikatsiya qilingan sessiya")} • {t.pages.settings.currentSession}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">{t.pages.settings.online}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Supabase Auth JWT sessiya • {t.common.date}: {t.common.now}
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
                <Switch
                  checked={emailAlerts}
                  onCheckedChange={(val) => {
                    setEmailAlerts(val);
                    persistPrefs({ twoFactorEnabled, emailAlerts: val, telegramAlerts });
                    toast.success(val ? "Email ogohlantirishlari yoqildi" : "Email ogohlantirishlari oʻchirildi");
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <span className="font-semibold text-foreground block">{t.pages.settings.telegramAlerts}</span>
                  <p className="text-muted-foreground text-[11px]">
                    {t.pages.settings.telegramAlertsDesc}
                  </p>
                </div>
                <Switch
                  checked={telegramAlerts}
                  onCheckedChange={(val) => {
                    setTelegramAlerts(val);
                    persistPrefs({ twoFactorEnabled, emailAlerts, telegramAlerts: val });
                    toast.success(val ? "Telegram bildirishnomalari yoqildi" : "Telegram bildirishnomalari oʻchirildi");
                  }}
                />
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

      {/* Add Business Entity Modal Dialog */}
      <Dialog open={isAddEntityOpen} onOpenChange={setIsAddEntityOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {t.pages.settings.addEntity}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Yangi yuridik korxona rekvizitlarini kiritish va Supabase bazasiga saqlash.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEntity} className="space-y-3 pt-2 text-xs">
            <div>
              <Label className="text-[11px] font-medium text-foreground">Yuridik nomi *</Label>
              <Input
                placeholder="Korxona yuridik nomi"
                value={newEntity.legalName}
                onChange={(e) => setNewEntity({ ...newEntity, legalName: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Savdo belgisi</Label>
                <Input
                  placeholder="Qisqa nomi"
                  value={newEntity.tradeName}
                  onChange={(e) => setNewEntity({ ...newEntity, tradeName: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">STIR (9 ta raqam) *</Label>
                <Input
                  placeholder="STIR"
                  maxLength={9}
                  value={newEntity.tinStir}
                  onChange={(e) => setNewEntity({ ...newEntity, tinStir: e.target.value })}
                  className="h-8 text-xs font-mono mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">Tashkiliy shakli *</Label>
                <select
                  value={newEntity.companyType}
                  onChange={(e) => setNewEntity({ ...newEntity, companyType: e.target.value })}
                  className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
                >
                  <option value="MChJ">MChJ (Masʼuliyati cheklangan jamiyat)</option>
                  <option value="YaTT">YaTT (Yakka tartibdagi tadbirkor)</option>
                  <option value="XK">XK (Xususiy korxona)</option>
                  <option value="AJ">AJ (Aksiyadorlik jamiyati)</option>
                  <option value="OK">OK (Oilaviy korxona)</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">Soliq rejimi *</Label>
                <select
                  value={newEntity.taxRegime}
                  onChange={(e) => setNewEntity({ ...newEntity, taxRegime: e.target.value })}
                  className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
                >
                  <option value="vat_profit_tax">QQS (12%) + Foyda soligʻi</option>
                  <option value="turnover_tax">Aylanmadan olinadigan soliq (4%)</option>
                  <option value="fixed_tax">Qatʼiy belgilangan soliq</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-medium text-foreground">Masʼul lavozimi (ixtiyoriy)</Label>
              <Input
                placeholder="Lavozimi"
                value={newEntity.accountantName}
                onChange={(e) => setNewEntity({ ...newEntity, accountantName: e.target.value })}
                className="h-8 text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setIsAddEntityOpen(false)}
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
                {isSubmitting ? "Saqlanmoqda..." : "Korxonani qoʻshish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Entity Dialog */}
      <Dialog open={!!editingEntity} onOpenChange={(open) => !open && setEditingEntity(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Korxona maʼlumotlarini tahrirlash
            </DialogTitle>
            <DialogDescription className="text-xs">
              Yuridik shaxs rekvizitlari va soliq rejimini yangilash
            </DialogDescription>
          </DialogHeader>
          {editingEntity && (
            <form onSubmit={handleUpdateEntity} className="space-y-3 pt-2 text-xs">
              <div>
                <Label className="text-[11px] font-medium">Yuridik nomi *</Label>
                <Input
                  value={editingEntity.name}
                  onChange={(e) => setEditingEntity({ ...editingEntity, name: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-medium">STIR (INN) *</Label>
                  <Input
                    value={editingEntity.tinStir}
                    onChange={(e) => setEditingEntity({ ...editingEntity, tinStir: e.target.value })}
                    className="h-8 text-xs font-mono mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-medium">Soliq rejimi</Label>
                  <select
                    value={editingEntity.taxRegime}
                    onChange={(e) => setEditingEntity({ ...editingEntity, taxRegime: e.target.value })}
                    className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
                  >
                    <option value="vat_profit_tax">QQS + Foyda</option>
                    <option value="turnover_tax">Aylanma soliq (4%)</option>
                    <option value="fixed_tax">Qatʼiy soliq</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-medium">Bosh buxgalter</Label>
                <Input
                  value={editingEntity.accountantName || ""}
                  onChange={(e) => setEditingEntity({ ...editingEntity, accountantName: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <DialogFooter className="pt-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingEntity(null)}>
                  {t.common.cancel}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  {isSubmitting ? "Saqlanmoqda..." : t.common.save}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Yuklanmoqda...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
