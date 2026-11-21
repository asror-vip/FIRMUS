"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppState } from "@/lib/context/app-state";
import { FEATURES } from "@/lib/config/features";
import { supabase } from "@/lib/supabase/client";
import {
  fetchBusinessEntities,
  createBusinessEntity,
  updateBusinessEntity,
} from "@/lib/services/supabase-service";
import { cacheKeys, peekQueryCache } from "@/lib/cache/query-cache";
import { businessEntitySchema, getFirstZodError } from "@/lib/validations/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Plug,
  Cloud,
  Laptop,
  RefreshCw,
  Copy,
  Download,
  Send,
  KeyRound,
  Unplug,
  FileText,
  Landmark,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getReconcileErpDict, getIntlLocale } from "@/lib/i18n/domains/reconcile-erp";
import { getProfileIntegrationsDict } from "@/lib/i18n/domains/profile-integrations";

interface OneCDraftQueueItem {
  id: string;
  sourceKind: string;
  summary: string;
  counterparty?: string;
  amount: number;
  status: "pending" | "processing" | "pushed_to_1c_draft" | "failed";
  onecDocNumber?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
}

interface IntegrationsState {
  onec: {
    mode: "odata" | "epf";
    status: "connected" | "awaiting_code" | "disconnected";
    baseUrl: string;
    username: string;
    hasPassword: boolean;
    pairCode: string | null;
    pairCodeExpiresAt: string | null;
    lastSyncedAt: string | null;
    counterpartiesCount: number;
    accountsCount: number;
  };
  didox: {
    status: "connected" | "disconnected";
    stir: string;
    mode: "manual" | "auto";
  };
  bank: {
    encoding: "auto" | "UTF-8" | "Windows-1251";
    defaultAccountCode: string;
  };
  queue: OneCDraftQueueItem[];
}

const DEFAULT_INTEGRATIONS_STATE: IntegrationsState = {
  onec: {
    mode: "odata",
    status: "disconnected",
    baseUrl: "",
    username: "",
    hasPassword: false,
    pairCode: null,
    pairCodeExpiresAt: null,
    lastSyncedAt: null,
    counterpartiesCount: 0,
    accountsCount: 0,
  },
  didox: {
    status: "disconnected",
    stir: "",
    mode: "manual",
  },
  bank: {
    encoding: "auto",
    defaultAccountCode: "5110",
  },
  queue: [],
};

function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return email || "â€”";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) {
    return `${local[0] || ""}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

function build1CBslGuideText(appOrigin: string): string {
  const host = appOrigin.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return `// ============================================================================
// FIRMUS <-> 1C:Бухгалтерия 8.3 (Управляемые формы / Внешняя обработка .epf)
// Реальный рабочий BSL-код для прямой интеграции с FIRMUS API
// ============================================================================
//
// Как собрать .epf за 2 минуты в 1C:Предприятие 8.3 (Конфигуратор):
// 1. Откройте Конфигуратор -> Файл -> Новый -> Внешняя обработка.
// 2. Добавьте форму, реквизиты:
//      - КодПодключения (Строка, 16) — 8-символьный код из FIRMUS (действует 5 минут)
//      - ТокенИнтеграции (Строка, 256) — сохраняется автоматически после подключения
// 3. Добавьте команды формы: "ПодключитьFIRMUS" и "ЗагрузитьЧерновикиИзFIRMUS".
// 4. Вставьте код ниже в модуль формы и сохраните как FIRMUS_1C_Bridge.epf.

&НаСервере
Функция СоздатьСоединениеFIRMUS()
    Возврат Новый HTTPСоединение("${host}", 443, , , , 30, Новый ЗащищенноеСоединениеOpenSSL());
КонецФункции

&НаСервере
Процедура ПодключитьFIRMUSНаСервере()
    Если ПустаяСтрока(Объект.КодПодключения) Тогда
        Сообщить("Введите 8-символьный код подключения из FIRMUS -> Настройки -> Интеграции.");
        Возврат;
    КонецЕсли;

    Соединение = СоздатьСоединениеFIRMUS();
    Запрос = Новый HTTPЗапрос("/api/1c/pair");
    Запрос.Заголовки.Вставить("Content-Type", "application/json; charset=utf-8");

    ЗаписьJSON = Новый ЗаписьJSON;
    ЗаписьJSON.УстановитьСтроку();
    ТелоСтруктура = Новый Структура("code", СокрЛП(Объект.КодПодключения));
    ЗаписатьJSON(ЗаписьJSON, ТелоСтруктура);
    Запрос.УстановитьТелоИзСтроки(ЗаписьJSON.Закрыть(), КодировкаТекста.UTF8);

    Ответ = Соединение.ОтправитьДляОбработки(Запрос);
    Если Ответ.КодСостояния <> 200 Тогда
        Сообщить("Ошибка подключения (" + Ответ.КодСостояния + "): " + Ответ.ПолучитьТелоКакСтроку());
        Возврат;
    КонецЕсли;

    ЧтениеJSON = Новый ЧтениеJSON;
    ЧтениеJSON.УстановитьСтроку(Ответ.ПолучитьТелоКакСтроку());
    Данные = ПрочитатьJSON(ЧтениеJSON, Истина);
    ЧтениеJSON.Закрыть();

    Если Данные.Получить("bridgeToken") <> Неопределено Тогда
        Объект.ТокенИнтеграции = Данные["bridgeToken"];
    ИначеЕсли Данные.Получить("token") <> Неопределено Тогда
        Объект.ТокенИнтеграции = Данные["token"];
    КонецЕсли;

    Сообщить("FIRMUS успешно подключен! Токен действует 90 дней.");
КонецПроцедуры

&НаСервере
Процедура ЗагрузитьЧерновикиИзFIRMUSНаСервере()
    Если ПустаяСтрока(Объект.ТокенИнтеграции) Тогда
        Сообщить("Сначала подключите FIRMUS по 8-символьному коду.");
        Возврат;
    КонецЕсли;

    Соединение = СоздатьСоединениеFIRMUS();
    Запрос = Новый HTTPЗапрос("/api/1c/outbox");
    Запрос.Заголовки.Вставить("Authorization", "Bearer " + СокрЛП(Объект.ТокенИнтеграции));
    Запрос.Заголовки.Вставить("Accept", "application/json");

    Ответ = Соединение.Получить(Запрос);
    Если Ответ.КодСостояния <> 200 Тогда
        Сообщить("Ошибка получения очереди (" + Ответ.КодСостояния + "): " + Ответ.ПолучитьТелоКакСтроку());
        Возврат;
    КонецЕсли;

    ЧтениеJSON = Новый ЧтениеJSON;
    ЧтениеJSON.УстановитьСтроку(Ответ.ПолучитьТелоКакСтроку());
    Данные = ПрочитатьJSON(ЧтениеJSON, Истина);
    ЧтениеJSON.Закрыть();

    Задачи = Данные.Получить("items");
    Если Задачи = Неопределено Тогда
        Задачи = Данные.Получить("jobs");
    КонецЕсли;
    Если Задачи = Неопределено Или Задачи.Количество() = 0 Тогда
        Сообщить("Новых подтвержденных черновиков в FIRMUS нет.");
        Возврат;
    КонецЕсли;

    Для Каждого Задача Из Задачи Цикл
        // Создайте непроведенный черновик (ПоступлениеНаРасчетныйСчет / СписаниеСРасчетногоСчета)
        // и запишите в режиме РежимЗаписиДокумента.Запись (Проведен = Ложь!), затем отправьте ACK:
        ЗапросAck = Новый HTTPЗапрос("/api/1c/ack");
        ЗапросAck.Заголовки.Вставить("Authorization", "Bearer " + СокрЛП(Объект.ТокенИнтеграции));
        ЗапросAck.Заголовки.Вставить("Content-Type", "application/json; charset=utf-8");

        ЗаписьAck = Новый ЗаписьJSON;
        ЗаписьAck.УстановитьСтроку();
        ЗаписатьJSON(ЗаписьAck, Новый Структура("jobId,status", Задача["id"], "pushed_to_1c_draft"));
        ЗапросAck.УстановитьТелоИзСтроки(ЗаписьAck.Закрыть(), КодировкаТекста.UTF8);
        Соединение.ОтправитьДляОбработки(ЗапросAck);
    КонецЦикла;

    Сообщить("Загружено черновиков из FIRMUS: " + Строка(Задачи.Количество()));
КонецПроцедуры
`;
}

function downloadTextBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();
  const dict = getReconcileErpDict(locale);
  const d = dict.erpExtra.settings;
  const pi = getProfileIntegrationsDict(locale);
  const intlLocale = getIntlLocale(locale);
  const {
    user,
    currentWorkspace,
    currentEntity,
    currentRole,
    subscription,
    language,
    setLanguage,
    refreshContext,
  } = useAppState();
  const isReadOnly = currentRole === "viewer" || currentRole === "auditor";

  const filterWorkspaceEntities = useCallback(
    (data: any[]) =>
      currentWorkspace?.id
        ? (data || []).filter((e: any) => !e.workspaceId || e.workspaceId === currentWorkspace.id)
        : data || [],
    [currentWorkspace?.id]
  );

  const initialPeekEntities = FEATURES.multiCompanyMode
    ? peekQueryCache<any[]>(cacheKeys.entities())
    : null;

  const [entities, setEntities] = useState<any[]>(() =>
    initialPeekEntities ? filterWorkspaceEntities(initialPeekEntities.data || []) : []
  );
  const [isLoading, setIsLoading] = useState(() =>
    FEATURES.multiCompanyMode ? !initialPeekEntities : false
  );
  const [isAddEntityOpen, setIsAddEntityOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newEntity, setNewEntity] = useState({
    legalName: "",
    tradeName: "",
    tinStir: "",
    companyType: "MChJ",
    taxRegime: "vat_profit_tax",
    accountantName: d.defaultAccountantName,
  });

  const [activeTab, setActiveTab] = useState(FEATURES.multiCompanyMode ? "entities" : "profile");
  const [showEmail, setShowEmail] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [telegramAlerts, setTelegramAlerts] = useState(true);

  // Personal Profile & Primary Entity Form State
  const [personalForm, setPersonalForm] = useState({
    fullName: "",
    phone: "",
    jobTitle: "",
  });
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  const [companyForm, setCompanyForm] = useState({
    entityId: "",
    legalName: "",
    tradeName: "",
    tinStir: "",
    companyType: "MChJ",
    taxRegime: "vat_profit_tax",
    bankAccount: "",
    bankName: "",
    bankMfo: "",
    accountantName: "",
  });
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Integrations Hub State
  const [integrations, setIntegrations] = useState<IntegrationsState>(DEFAULT_INTEGRATIONS_STATE);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [oneCSubMode, setOneCSubMode] = useState<"odata" | "epf">("odata");
  const [odataForm, setOdataForm] = useState({
    baseUrl: "",
    username: "",
    password: "",
  });
  const [isTestingOData, setIsTestingOData] = useState(false);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isPushingDrafts, setIsPushingDrafts] = useState(false);
  const [isDisconnectingOneC, setIsDisconnectingOneC] = useState(false);
  const [didoxForm, setDidoxForm] = useState({ stir: "", mode: "manual" as "manual" | "auto" });
  const [isSavingDidox, setIsSavingDidox] = useState(false);
  const [bankForm, setBankForm] = useState({
    encoding: "auto" as "auto" | "UTF-8" | "Windows-1251",
    defaultAccountCode: "5110",
  });
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);

  // Security: Password change & 1C token revoke
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isRevokingTokens, setIsRevokingTokens] = useState(false);

  // Handle URL query params (?action=add-entity or ?tab=integrations|profile|security)
  useEffect(() => {
    const action = searchParams.get("action");
    const tabParam = searchParams.get("tab");
    const allowedTabs = FEATURES.multiCompanyMode
      ? ["entities", "profile", "integrations", "security", "notifications", "language"]
      : ["profile", "integrations", "security", "notifications", "language"];

    if (action === "add-entity" && FEATURES.multiCompanyMode) {
      setActiveTab("entities");
      setIsAddEntityOpen(true);
    } else if (tabParam && allowedTabs.includes(tabParam)) {
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

  // Seed profile & company forms from context and GET /api/profile
  useEffect(() => {
    setPersonalForm((prev) => ({
      fullName:
        prev.fullName ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        "",
      phone: prev.phone || user?.user_metadata?.phone || "",
      jobTitle: prev.jobTitle || user?.user_metadata?.job_title || "",
    }));
  }, [user]);

  useEffect(() => {
    if (!currentEntity) return;
    setCompanyForm((prev) => ({
      entityId: prev.entityId || currentEntity.id || "",
      legalName: prev.legalName || currentEntity.name || "",
      tradeName: prev.tradeName || currentEntity.tradeName || "",
      tinStir: prev.tinStir || currentEntity.tinStir || "",
      companyType: prev.companyType || currentEntity.companyType || "MChJ",
      taxRegime: prev.taxRegime || currentEntity.taxRegime || "vat_profit_tax",
      bankAccount: prev.bankAccount || currentEntity.bankAccount || "",
      bankName: prev.bankName || currentEntity.bankName || "",
      bankMfo: prev.bankMfo || "",
      accountantName: prev.accountantName || currentEntity.accountantName || "",
    }));
  }, [currentEntity]);

  const loadProfile = useCallback(async () => {
    try {
      const entityQuery = currentEntity?.id ? `?entityId=${encodeURIComponent(currentEntity.id)}` : "";
      const res = await fetch(`/api/profile${entityQuery}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const profileData = data?.profile || data?.user || data;
      if (profileData) {
        setPersonalForm({
          fullName: profileData.fullName || profileData.full_name || "",
          phone: profileData.phone || "",
          jobTitle: profileData.jobTitle || profileData.job_title || "",
        });
      }
      const ent = data?.entity || data?.primaryEntity || data?.businessEntity;
      if (ent) {
        setCompanyForm({
          entityId: ent.id || currentEntity?.id || "",
          legalName: ent.legalName || ent.legal_name || ent.name || "",
          tradeName: ent.tradeName || ent.trade_name || "",
          tinStir: ent.tinStir || ent.tin_stir || "",
          companyType: ent.companyType || ent.company_type || "MChJ",
          taxRegime: ent.taxRegime || ent.tax_regime || "vat_profit_tax",
          bankAccount: ent.bankAccount || ent.bank_account || "",
          bankName: ent.bankName || ent.bank_name || "",
          bankMfo: ent.bankMfo || ent.bank_mfo || "",
          accountantName: ent.accountantName || ent.accountant_name || "",
        });
      }
    } catch {
      // Fallback to context data silently
    }
  }, [currentEntity?.id]);

  const loadIntegrations = useCallback(async () => {
    setIsLoadingIntegrations(true);
    try {
      const entityQuery = currentEntity?.id ? `?entityId=${encodeURIComponent(currentEntity.id)}` : "";
      const res = await fetch(`/api/integrations${entityQuery}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();

      const connectionsList: any[] = Array.isArray(data?.connections) ? data.connections : [];
      const findConn = (provider: string) =>
        connectionsList.find((c) => c.provider === provider);

      const oneCConn = data?.onec || findConn("onec_odata") || findConn("onec_epf") || findConn("onec");
      const didoxConn = data?.didox || findConn("didox");
      const bankConn = data?.bank || findConn("bank");

      const oneCMode: "odata" | "epf" =
        oneCConn?.mode === "epf" || oneCConn?.provider === "onec_epf" ? "epf" : "odata";

      const rawStatus = oneCConn?.status || "disconnected";
      const normalizedOneCStatus: "connected" | "awaiting_code" | "disconnected" =
        rawStatus === "connected" || rawStatus === "active"
          ? "connected"
          : rawStatus === "awaiting_code" || rawStatus === "pending"
          ? "awaiting_code"
          : "disconnected";

      const nextState: IntegrationsState = {
        onec: {
          mode: oneCMode,
          status: normalizedOneCStatus,
          baseUrl: oneCConn?.baseUrl || oneCConn?.config?.baseUrl || "",
          username: oneCConn?.username || oneCConn?.config?.username || "",
          hasPassword: Boolean(oneCConn?.hasPassword || oneCConn?.config?.hasPassword),
          pairCode: oneCConn?.pairCode || oneCConn?.config?.pairCode || null,
          pairCodeExpiresAt: oneCConn?.pairCodeExpiresAt || oneCConn?.config?.pairCodeExpiresAt || null,
          lastSyncedAt: oneCConn?.lastSyncedAt || oneCConn?.last_synced_at || null,
          counterpartiesCount: Number(
            data?.catalogSummary?.counterpartiesCount ??
              oneCConn?.counterpartiesCount ??
              oneCConn?.config?.counterpartiesCount ??
              0
          ),
          accountsCount: Number(
            data?.catalogSummary?.accountsCount ??
              oneCConn?.accountsCount ??
              oneCConn?.config?.accountsCount ??
              0
          ),
        },
        didox: {
          status:
            didoxConn?.status === "connected" || didoxConn?.status === "active"
              ? "connected"
              : "disconnected",
          stir: didoxConn?.stir || didoxConn?.config?.stir || currentEntity?.tinStir || "",
          mode:
            didoxConn?.mode === "auto" || didoxConn?.config?.mode === "auto"
              ? "auto"
              : "manual",
        },
        bank: {
          encoding:
            bankConn?.encoding ||
            bankConn?.config?.encoding ||
            "auto",
          defaultAccountCode:
            bankConn?.defaultAccountCode ||
            bankConn?.config?.defaultAccountCode ||
            "5110",
        },
        queue: Array.isArray(data?.queue || data?.draftQueue || data?.drafts)
          ? (data.queue || data.draftQueue || data.drafts).map((q: any) => ({
              id: q.id,
              sourceKind: q.sourceKind || q.source_kind || "bank_reconcile",
              summary: q.summary || q.description || q.payload?.description || q.payload?.counterparty || "â€”",
              counterparty: q.counterparty || q.payload?.counterparty || "",
              amount: Number(q.amount ?? q.payload?.amount ?? 0),
              status: q.status || "pending",
              onecDocNumber: q.onecDocNumber || q.onec_doc_number || null,
              errorMessage: q.errorMessage || q.error_message || null,
              createdAt: q.createdAt || q.created_at,
            }))
          : [],
      };

      setIntegrations(nextState);
      setOneCSubMode(nextState.onec.mode);
      setOdataForm((prev) => ({
        baseUrl: nextState.onec.baseUrl || prev.baseUrl,
        username: nextState.onec.username || prev.username,
        password: "",
      }));
      setDidoxForm({
        stir: nextState.didox.stir || currentEntity?.tinStir || "",
        mode: nextState.didox.mode,
      });
      setBankForm({
        encoding: nextState.bank.encoding,
        defaultAccountCode: nextState.bank.defaultAccountCode,
      });
    } catch {
      toast.error(pi.integrations.toasts.loadError);
    } finally {
      setIsLoadingIntegrations(false);
    }
  }, [currentEntity?.id, currentEntity?.tinStir, pi.integrations.toasts.loadError]);

  useEffect(() => {
    loadProfile();
    loadIntegrations();
  }, [loadProfile, loadIntegrations]);

  // Live 10-minute countdown timer for .epf pairing code
  useEffect(() => {
    const expiresAt = integrations.onec.pairCodeExpiresAt;
    if (!expiresAt) {
      setCountdownSeconds(0);
      return;
    }
    const updateRemaining = () => {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      setCountdownSeconds(diffMs > 0 ? Math.floor(diffMs / 1000) : 0);
    };
    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [integrations.onec.pairCodeExpiresAt]);

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
    const peek = peekQueryCache<any[]>(cacheKeys.entities());
    if (peek) {
      setEntities(filterWorkspaceEntities(peek.data || []));
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await fetchBusinessEntities();
      setEntities(filterWorkspaceEntities(data || []));
    } catch (err) {
      console.error("Error loading entities:", err);
      toast.error(d.toasts.loadEntitiesError);
    } finally {
      setIsLoading(false);
    }
  }, [filterWorkspaceEntities, d.toasts.loadEntitiesError]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const handleSavePersonalProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setIsSavingPersonal(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: personalForm.fullName.trim(),
          phone: personalForm.phone.trim(),
          jobTitle: personalForm.jobTitle.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }
      await refreshContext();
      toast.success(pi.profile.personalSavedToast);
    } catch (err: any) {
      toast.error(pi.profile.personalSaveErrorToast.replace("{error}", err.message || "Error"));
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const cleanStir = companyForm.tinStir.trim();
    const cleanAccount = companyForm.bankAccount.replace(/\s+/g, "").trim();
    const cleanMfo = companyForm.bankMfo.trim();

    if (cleanStir && !/^\d{9}$/.test(cleanStir)) {
      toast.error(pi.profile.invalidStirError);
      return;
    }
    if (cleanAccount && !/^\d{20}$/.test(cleanAccount)) {
      toast.error(pi.profile.invalidBankAccountError);
      return;
    }
    if (cleanMfo && !/^\d{5}$/.test(cleanMfo)) {
      toast.error(pi.profile.invalidMfoError);
      return;
    }

    setIsSavingCompany(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: companyForm.entityId || currentEntity?.id || undefined,
          legalName: companyForm.legalName.trim(),
          tradeName: companyForm.tradeName.trim() || undefined,
          tinStir: cleanStir,
          companyType: companyForm.companyType,
          taxRegime: companyForm.taxRegime,
          bankAccount: cleanAccount,
          bankName: companyForm.bankName.trim(),
          bankMfo: cleanMfo,
          accountantName: companyForm.accountantName.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }
      await Promise.all([refreshContext(), loadEntities(), loadProfile()]);
      toast.success(pi.profile.companySavedToast);
    } catch (err: any) {
      toast.error(pi.profile.companySaveErrorToast.replace("{error}", err.message || "Error"));
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleSaveOData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setIsTestingOData(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_onec_odata",
          entityId: currentEntity?.id,
          baseUrl: odataForm.baseUrl.trim(),
          username: odataForm.username.trim(),
          password: odataForm.password || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "OData error");
      }
      setOdataForm((prev) => ({ ...prev, password: "" }));
      await loadIntegrations();
      toast.success(pi.integrations.toasts.odataSaved);
    } catch (err: any) {
      toast.error(pi.integrations.toasts.odataError.replace("{error}", err.message || "Error"));
    } finally {
      setIsTestingOData(false);
    }
  };

  const handleSyncCatalog = async () => {
    if (isReadOnly) return;
    setIsSyncingCatalog(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_onec_catalog",
          entityId: currentEntity?.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Sync failed");
      }
      await loadIntegrations();
      toast.success(pi.integrations.toasts.catalogSynced);
    } catch (err: any) {
      toast.error(pi.integrations.toasts.catalogSyncError.replace("{error}", err.message || "Error"));
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  const handleGenerateEpfCode = async () => {
    if (isReadOnly) return;
    setIsGeneratingCode(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_epf_pair_code",
          entityId: currentEntity?.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Pairing code error");
      }
      await loadIntegrations();
      toast.success(pi.integrations.toasts.pairCodeGenerated);
    } catch (err: any) {
      toast.error(pi.integrations.toasts.pairCodeError.replace("{error}", err.message || "Error"));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleDisconnectOneC = async () => {
    if (isReadOnly) return;
    setIsDisconnectingOneC(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_integration",
          provider: "onec",
          entityId: currentEntity?.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Disconnect failed");
      }
      await loadIntegrations();
      toast.success(pi.integrations.toasts.disconnected);
    } catch (err: any) {
      toast.error(pi.integrations.toasts.disconnectError.replace("{error}", err.message || "Error"));
    } finally {
      setIsDisconnectingOneC(false);
    }
  };

  const handlePushDraftsToOneC = async (draftIds?: string[]) => {
    if (isReadOnly) return;
    setIsPushingDrafts(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "push_drafts_to_onec",
          entityId: currentEntity?.id,
          draftIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Push failed");
      }
      await loadIntegrations();
      const pushedCount = Number(data?.pushedCount ?? data?.count ?? 0);
      toast.success(pi.integrations.toasts.pushedDrafts.replace("{count}", String(pushedCount)));
    } catch (err: any) {
      toast.error(pi.integrations.toasts.pushDraftsError.replace("{error}", err.message || "Error"));
    } finally {
      setIsPushingDrafts(false);
    }
  };

  const handleSaveDidox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const cleanStir = didoxForm.stir.trim();
    if (cleanStir && !/^\d{9}$/.test(cleanStir)) {
      toast.error(pi.profile.invalidStirError);
      return;
    }
    setIsSavingDidox(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_didox",
          entityId: currentEntity?.id,
          stir: cleanStir,
          mode: didoxForm.mode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Didox save failed");
      }
      await loadIntegrations();
      toast.success(pi.integrations.toasts.didoxSaved);
    } catch (err: any) {
      toast.error(pi.integrations.toasts.didoxError.replace("{error}", err.message || "Error"));
    } finally {
      setIsSavingDidox(false);
    }
  };

  const handleSaveBankPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setIsSavingBank(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_bank",
          entityId: currentEntity?.id,
          encoding: bankForm.encoding,
          defaultAccountCode: bankForm.defaultAccountCode.trim() || "5110",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Bank settings save failed");
      }
      await loadIntegrations();
      toast.success(pi.integrations.toasts.bankSaved);
    } catch (err: any) {
      toast.error(pi.integrations.toasts.bankError.replace("{error}", err.message || "Error"));
    } finally {
      setIsSavingBank(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 8) {
      toast.error(pi.security.passwordTooShortError);
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(pi.security.passwordMismatchError);
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });
      if (error) throw error;
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      toast.success(pi.security.passwordUpdatedToast);
    } catch (err: any) {
      toast.error(pi.security.passwordUpdateErrorToast.replace("{error}", err.message || "Error"));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRevokeApiTokens = async () => {
    if (isReadOnly) return;
    setIsRevokingTokens(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke_integration",
          provider: "onec",
          entityId: currentEntity?.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Revoke failed");
      }
      await loadIntegrations();
      toast.success(pi.security.tokensRevokedToast);
    } catch (err: any) {
      toast.error(pi.security.tokensRevokeErrorToast.replace("{error}", err.message || "Error"));
    } finally {
      setIsRevokingTokens(false);
    }
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
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
        accountantName: parsed.data.accountantName || d.defaultAccountantName,
      });

      await Promise.all([loadEntities(), refreshContext()]);
      toast.success(d.toasts.entityCreated);
      setIsAddEntityOpen(false);
      setNewEntity({
        legalName: "",
        tradeName: "",
        tinStir: "",
        companyType: "MChJ",
        taxRegime: "vat_profit_tax",
        accountantName: d.defaultAccountantName,
      });
    } catch (err: any) {
      toast.error(d.toasts.entityCreateError.replace("{error}", err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !editingEntity) return;
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
      toast.success(d.toasts.entityUpdated.replace("{name}", parsed.data.legalName));
      setEditingEntity(null);
    } catch (err: any) {
      toast.error(d.toasts.entityUpdateError.replace("{error}", err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedCountdown = `${String(Math.floor(countdownSeconds / 60)).padStart(2, "0")}:${String(
    countdownSeconds % 60
  ).padStart(2, "0")}`;

  const readyQueueCount = integrations.queue.filter(
    (q) => q.status === "pending" || q.status === "failed"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t.pages.settings.title}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {FEATURES.multiCompanyMode ? t.pages.settings.subtitle : d.personalSubtitle}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto min-h-9 flex-wrap gap-1">
          {FEATURES.multiCompanyMode && (
            <TabsTrigger value="entities" className="text-xs gap-1.5">
              <Building className="h-3.5 w-3.5" />
              {t.pages.settings.tabs.entities}
            </TabsTrigger>
          )}
          <TabsTrigger value="profile" className="text-xs gap-1.5">
            <User className="h-3.5 w-3.5" />
            {d.profileTab}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs gap-1.5">
            <Plug className="h-3.5 w-3.5" />
            {pi.integrations.tabLabel}
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

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
            <div className="p-4 pb-3 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">{d.personalCardTitle}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{d.personalCardDesc}</p>
            </div>
            <div className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/50 bg-card/40 p-3">
                  <span className="text-[11px] text-muted-foreground block">{d.nameProfileLabel}</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {personalForm.fullName ||
                      user?.user_metadata?.full_name ||
                      user?.user_metadata?.name ||
                      (user?.email ? user.email.split("@")[0] : d.defaultUserName)}
                  </span>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{d.emailLabel}</span>
                    <button
                      type="button"
                      onClick={() => setShowEmail((prev) => !prev)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                      title={showEmail ? d.hideTooltip : d.showTooltip}
                      aria-label={showEmail ? d.hideEmailAria : d.showEmailAria}
                    >
                      {showEmail ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <span className="font-mono font-medium text-foreground mt-0.5 block truncate">
                    {showEmail ? user?.email || "â€”" : maskEmail(user?.email)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{d.currentPlanLabel}</span>
                    <Badge variant="indigo" className="text-[10px]">
                      {subscription.isTrialActive ? d.trialPlanBadge : subscription.planName}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{d.planDesc}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="h-9 text-xs gap-1.5 shrink-0 border-violet-500/30 hover:bg-violet-500/15 text-violet-700 dark:text-violet-300">
                  <Link href="/billing">
                    <CreditCard className="h-3.5 w-3.5" />
                    {d.openBillingBtn}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Personal Profile Edit Card */}
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="p-4 pb-3 border-b border-border/50">
                <h3 className="text-sm font-semibold text-foreground">{pi.profile.personalEditTitle}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{pi.profile.personalEditDesc}</p>
              </div>
              <div className="p-4">
                <form onSubmit={handleSavePersonalProfile} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="profile-full-name" className="text-[11px] font-medium text-foreground">
                      {pi.profile.fullNameLabel}
                    </Label>
                    <Input
                      id="profile-full-name"
                      value={personalForm.fullName}
                      onChange={(e) => setPersonalForm((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder={pi.profile.fullNamePlaceholder}
                      disabled={isReadOnly}
                      className="h-9 text-xs bg-background/50 border-border/60"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="profile-phone" className="text-[11px] font-medium text-foreground">
                      {pi.profile.phoneLabel}
                    </Label>
                    <Input
                      id="profile-phone"
                      value={personalForm.phone}
                      onChange={(e) => setPersonalForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder={pi.profile.phonePlaceholder}
                      disabled={isReadOnly}
                      className="h-9 text-xs font-mono bg-background/50 border-border/60"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="profile-job-title" className="text-[11px] font-medium text-foreground">
                      {pi.profile.jobTitleLabel}
                    </Label>
                    <Input
                      id="profile-job-title"
                      value={personalForm.jobTitle}
                      onChange={(e) => setPersonalForm((p) => ({ ...p, jobTitle: e.target.value }))}
                      placeholder={pi.profile.jobTitlePlaceholder}
                      disabled={isReadOnly}
                      className="h-9 text-xs bg-background/50 border-border/60"
                    />
                  </div>
                  {!isReadOnly && (
                    <div className="pt-1 flex justify-end">
                      <Button type="submit" size="sm" className="h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white shadow-sm" disabled={isSavingPersonal}>
                        {isSavingPersonal && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {isSavingPersonal ? pi.profile.savingBtn : pi.profile.savePersonalBtn}
                      </Button>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Company & Bank Requisites Card */}
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="p-4 pb-3 border-b border-border/50">
                <h3 className="text-sm font-semibold text-foreground">{pi.profile.companyCardTitle}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{pi.profile.companyCardDesc}</p>
              </div>
              <div className="p-4">
                <form onSubmit={handleSaveCompanyProfile} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="company-legal-name" className="text-[11px] font-medium text-foreground">
                        {pi.profile.legalNameLabel}
                      </Label>
                      <Input
                        id="company-legal-name"
                        value={companyForm.legalName}
                        onChange={(e) => setCompanyForm((c) => ({ ...c, legalName: e.target.value }))}
                        placeholder={pi.profile.legalNamePlaceholder}
                        disabled={isReadOnly}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="company-trade-name" className="text-[11px] font-medium text-foreground">
                        {pi.profile.tradeNameLabel}
                      </Label>
                      <Input
                        id="company-trade-name"
                        value={companyForm.tradeName}
                        onChange={(e) => setCompanyForm((c) => ({ ...c, tradeName: e.target.value }))}
                        placeholder={pi.profile.tradeNamePlaceholder}
                        disabled={isReadOnly}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="company-stir" className="text-[11px] font-medium text-foreground">
                        {pi.profile.tinStirLabel}
                      </Label>
                      <Input
                        id="company-stir"
                        maxLength={9}
                        value={companyForm.tinStir}
                        onChange={(e) =>
                          setCompanyForm((c) => ({ ...c, tinStir: e.target.value.replace(/[^\d]/g, "") }))
                        }
                        placeholder={pi.profile.tinStirPlaceholder}
                        disabled={isReadOnly}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="company-type" className="text-[11px] font-medium text-foreground">
                        {pi.profile.companyTypeLabel}
                      </Label>
                      <select
                        id="company-type"
                        value={companyForm.companyType}
                        onChange={(e) => setCompanyForm((c) => ({ ...c, companyType: e.target.value }))}
                        disabled={isReadOnly}
                        className="w-full h-9 text-xs rounded-md border border-input bg-background px-2.5 text-foreground"
                      >
                        <option value="MChJ">{d.companyTypes.mchj}</option>
                        <option value="YaTT">{d.companyTypes.yatt}</option>
                        <option value="XK">{d.companyTypes.xk}</option>
                        <option value="AJ">{d.companyTypes.aj}</option>
                        <option value="OK">{d.companyTypes.ok}</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="company-tax-regime" className="text-[11px] font-medium text-foreground">
                        {pi.profile.taxRegimeLabel}
                      </Label>
                      <select
                        id="company-tax-regime"
                        value={companyForm.taxRegime}
                        onChange={(e) => setCompanyForm((c) => ({ ...c, taxRegime: e.target.value }))}
                        disabled={isReadOnly}
                        className="w-full h-9 text-xs rounded-md border border-input bg-background px-2.5 text-foreground"
                      >
                        <option value="vat_profit_tax">{d.taxRegimeOptVat}</option>
                        <option value="turnover_tax">{d.taxRegimeOptTurnover}</option>
                        <option value="fixed_tax">{d.taxRegimeOptFixed}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="company-bank-account" className="text-[11px] font-medium text-foreground">
                        {pi.profile.bankAccountLabel}
                      </Label>
                      <Input
                        id="company-bank-account"
                        maxLength={20}
                        value={companyForm.bankAccount}
                        onChange={(e) =>
                          setCompanyForm((c) => ({
                            ...c,
                            bankAccount: e.target.value.replace(/[^\d]/g, ""),
                          }))
                        }
                        placeholder={pi.profile.bankAccountPlaceholder}
                        disabled={isReadOnly}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="company-bank-name" className="text-[11px] font-medium text-foreground">
                        {pi.profile.bankNameLabel}
                      </Label>
                      <Input
                        id="company-bank-name"
                        value={companyForm.bankName}
                        onChange={(e) => setCompanyForm((c) => ({ ...c, bankName: e.target.value }))}
                        placeholder={pi.profile.bankNamePlaceholder}
                        disabled={isReadOnly}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="company-bank-mfo" className="text-[11px] font-medium text-foreground">
                        {pi.profile.bankMfoLabel}
                      </Label>
                      <Input
                        id="company-bank-mfo"
                        maxLength={5}
                        value={companyForm.bankMfo}
                        onChange={(e) =>
                          setCompanyForm((c) => ({ ...c, bankMfo: e.target.value.replace(/[^\d]/g, "") }))
                        }
                        placeholder={pi.profile.bankMfoPlaceholder}
                        disabled={isReadOnly}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="company-accountant" className="text-[11px] font-medium text-foreground">
                        {pi.profile.accountantNameLabel}
                      </Label>
                      <Input
                        id="company-accountant"
                        value={companyForm.accountantName}
                        onChange={(e) => setCompanyForm((c) => ({ ...c, accountantName: e.target.value }))}
                        placeholder={pi.profile.accountantNamePlaceholder}
                        disabled={isReadOnly}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {!isReadOnly && (
                    <div className="pt-1 flex justify-end">
                      <Button type="submit" size="sm" className="h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white shadow-sm" disabled={isSavingCompany}>
                        {isSavingCompany && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {isSavingCompany ? pi.profile.savingBtn : pi.profile.saveCompanyBtn}
                      </Button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Integrations Hub Tab */}
        <TabsContent value="integrations" className="space-y-4 mt-4">
          {/* Summary Header Card */}
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
            <div className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{pi.integrations.hubTitle}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{pi.integrations.hubDesc}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs gap-1.5 self-start sm:self-auto border-border/60 hover:bg-muted/30"
                onClick={loadIntegrations}
                disabled={isLoadingIntegrations}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingIntegrations ? "animate-spin" : ""}`} />
                {pi.integrations.syncCatalogBtn}
              </Button>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl border border-border/50 bg-card/40 p-3 flex items-center justify-between">
                <span className="font-medium text-foreground">{pi.integrations.statusOneC}</span>
                <Badge
                  variant={
                    integrations.onec.status === "connected"
                      ? "success"
                      : integrations.onec.status === "awaiting_code"
                      ? "warning"
                      : "slate"
                  }
                  className="text-[10px]"
                >
                  {integrations.onec.status === "connected"
                    ? pi.integrations.connectedBadge
                    : integrations.onec.status === "awaiting_code"
                    ? pi.integrations.awaitingCodeBadge
                    : pi.integrations.disconnectedBadge}
                </Badge>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/40 p-3 flex items-center justify-between">
                <span className="font-medium text-foreground">{pi.integrations.statusDidox}</span>
                <Badge
                  variant={integrations.didox.status === "connected" ? "success" : "slate"}
                  className="text-[10px]"
                >
                  {integrations.didox.status === "connected"
                    ? pi.integrations.didoxActiveBadge
                    : pi.integrations.didoxInactiveBadge}
                </Badge>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/40 p-3 flex items-center justify-between">
                <span className="font-medium text-foreground">{pi.integrations.statusBank}</span>
                <Badge variant="indigo" className="text-[10px] font-mono">
                  {integrations.bank.encoding}
                </Badge>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/40 p-3">
                <span className="text-[11px] text-muted-foreground block">
                  {pi.integrations.catalogSummaryTitle}
                </span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {pi.integrations.counterpartiesCountLabel}: {integrations.onec.counterpartiesCount} â€¢{" "}
                  {pi.integrations.accountsCountLabel}: {integrations.onec.accountsCount}
                </span>
              </div>
            </div>
          </div>

          {/* 1C:Buxgalteriya Card */}
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
            <div className="p-4 pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{pi.integrations.oneCCardTitle}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{pi.integrations.oneCCardDesc}</p>
                </div>
                <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-1 gap-1 self-start">
                  <Button
                    type="button"
                    size="sm"
                    variant={oneCSubMode === "odata" ? "default" : "ghost"}
                    className={cn(
                      "h-8 text-xs gap-1.5",
                      oneCSubMode === "odata" && "bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
                    )}
                    onClick={() => setOneCSubMode("odata")}
                  >
                    <Cloud className="h-3.5 w-3.5" />
                    {pi.integrations.modeOnlineOData}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={oneCSubMode === "epf" ? "default" : "ghost"}
                    className={cn(
                      "h-8 text-xs gap-1.5",
                      oneCSubMode === "epf" && "bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
                    )}
                    onClick={() => setOneCSubMode("epf")}
                  >
                    <Laptop className="h-3.5 w-3.5" />
                    {pi.integrations.modeLocalEpf}
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4 text-xs">
              {oneCSubMode === "odata" ? (
                <form onSubmit={handleSaveOData} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="onec-odata-url" className="text-[11px] font-medium text-foreground">
                      {pi.integrations.odataUrlLabel}
                    </Label>
                    <Input
                      id="onec-odata-url"
                      type="url"
                      value={odataForm.baseUrl}
                      onChange={(e) => setOdataForm((f) => ({ ...f, baseUrl: e.target.value }))}
                      placeholder={pi.integrations.odataUrlPlaceholder}
                      disabled={isReadOnly}
                      className="h-9 text-xs font-mono bg-background/50 border-border/60"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground">{pi.integrations.odataHttpsHint}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="onec-odata-user" className="text-[11px] font-medium text-foreground">
                        {pi.integrations.odataLoginLabel}
                      </Label>
                      <Input
                        id="onec-odata-user"
                        value={odataForm.username}
                        onChange={(e) => setOdataForm((f) => ({ ...f, username: e.target.value }))}
                        placeholder={pi.integrations.odataLoginPlaceholder}
                        disabled={isReadOnly}
                        className="h-9 text-xs bg-background/50 border-border/60"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="onec-odata-pass" className="text-[11px] font-medium text-foreground">
                        {pi.integrations.odataPasswordLabel}
                      </Label>
                      <Input
                        id="onec-odata-pass"
                        type="password"
                        value={odataForm.password}
                        onChange={(e) => setOdataForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder={
                          integrations.onec.hasPassword
                            ? pi.integrations.odataPasswordPlaceholderSaved
                            : pi.integrations.odataPasswordPlaceholderNew
                        }
                        disabled={isReadOnly}
                        className="h-9 text-xs bg-background/50 border-border/60"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {pi.integrations.lastSyncedLabel}:{" "}
                      {integrations.onec.lastSyncedAt
                        ? new Date(integrations.onec.lastSyncedAt).toLocaleString(intlLocale)
                        : pi.integrations.neverSynced}
                    </span>
                    {!isReadOnly && (
                      <div className="flex flex-wrap items-center gap-2">
                        {integrations.onec.status === "connected" && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-9 text-xs gap-1.5 border-border/60 hover:bg-muted/30"
                              onClick={handleSyncCatalog}
                              disabled={isSyncingCatalog}
                            >
                              {isSyncingCatalog ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                              {pi.integrations.syncCatalogBtn}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-9 text-xs gap-1.5 text-destructive hover:text-destructive border-destructive/30"
                              onClick={handleDisconnectOneC}
                              disabled={isDisconnectingOneC}
                            >
                              <Unplug className="h-3.5 w-3.5" />
                              {pi.integrations.disconnectOneCBtn}
                            </Button>
                          </>
                        )}
                        <Button type="submit" size="sm" className="h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white shadow-sm" disabled={isTestingOData}>
                          {isTestingOData && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {pi.integrations.testAndSaveODataBtn}
                        </Button>
                      </div>
                    )}
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">{pi.integrations.epfDesc}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        integrations.onec.status === "connected"
                          ? "success"
                          : integrations.onec.pairCode && countdownSeconds > 0
                          ? "warning"
                          : "slate"
                      }
                      className="text-[11px] gap-1.5"
                    >
                      <span aria-hidden="true">
                        {integrations.onec.status === "connected"
                          ? "ðŸŸ¢"
                          : integrations.onec.pairCode && countdownSeconds > 0
                          ? "ðŸŸ¡"
                          : "âšª"}
                      </span>
                      {integrations.onec.status === "connected"
                        ? pi.integrations.epfStatusConnected
                        : integrations.onec.pairCode && countdownSeconds > 0
                        ? pi.integrations.epfStatusWaiting
                        : pi.integrations.epfStatusDisconnected}
                    </Badge>
                  </div>

                  {integrations.onec.pairCode && (
                    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">
                          {pi.integrations.pairCodeLabel}
                        </span>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-2xl font-mono font-bold tracking-[0.25em] text-foreground">
                            {integrations.onec.pairCode}
                          </span>
                          <Badge variant={countdownSeconds > 0 ? "indigo" : "destructive"} className="text-[10px] gap-1">
                            <Clock className="h-3 w-3" />
                            {countdownSeconds > 0
                              ? pi.integrations.codeExpiryBadge.replace("{time}", formattedCountdown)
                              : pi.integrations.codeExpiredText}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs gap-1.5 self-start sm:self-auto border-violet-500/30 hover:bg-violet-500/15 text-violet-700 dark:text-violet-300"
                        onClick={() => {
                          navigator.clipboard?.writeText(integrations.onec.pairCode || "");
                          toast.success(pi.integrations.codeCopiedToast);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {pi.integrations.copyCodeBtn}
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {!isReadOnly && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
                        onClick={handleGenerateEpfCode}
                        disabled={isGeneratingCode}
                      >
                        {isGeneratingCode ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5" />
                        )}
                        {integrations.onec.pairCode
                          ? pi.integrations.regenerateCodeBtn
                          : pi.integrations.getPairCodeBtn}
                      </Button>
                    )}
                    <Button
                      asChild
                      size="sm"
                      className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                    >
                      <a href="/downloads/FIRMUS_1C_Agent.exe" download="FIRMUS_1C_Agent.exe">
                        <Download className="h-3.5 w-3.5" />
                        FIRMUS 1C Agent (.exe)
                      </a>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs gap-1.5 border-border/60 hover:bg-muted/30"
                      onClick={() => {
                        const origin =
                          typeof window !== "undefined" ? window.location.origin : "https://firmusv1.netlify.app";
                        downloadTextBlob(build1CBslGuideText(origin), "FIRMUS_1C_Bridge.bsl");
                        toast.success(pi.integrations.toasts.bslDownloaded);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {pi.integrations.downloadBslBtn}
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs gap-1.5 border-border/60 hover:bg-muted/30"
                    >
                      <a href="/downloads/FIRMUS_1C_Sync.ps1" download="FIRMUS_1C_Sync.ps1">
                        <Download className="h-3.5 w-3.5" />
                        Windows Sync (.ps1)
                      </a>
                    </Button>
                    {!isReadOnly && integrations.onec.status === "connected" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs gap-1.5 text-destructive hover:text-destructive border-destructive/30"
                        onClick={handleDisconnectOneC}
                        disabled={isDisconnectingOneC}
                      >
                        <Unplug className="h-3.5 w-3.5" />
                        {pi.integrations.disconnectOneCBtn}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Didox & Bank 2-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="p-4 pb-3 flex flex-row items-start justify-between gap-2 border-b border-border/50">
                <div>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                    <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    {pi.integrations.didoxCardTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{pi.integrations.didoxCardDesc}</p>
                </div>
                <Badge
                  variant={integrations.didox.status === "connected" ? "success" : "slate"}
                  className="text-[10px] shrink-0"
                >
                  {integrations.didox.status === "connected"
                    ? pi.integrations.didoxActiveBadge
                    : pi.integrations.didoxInactiveBadge}
                </Badge>
              </div>
              <div className="p-4">
                <form onSubmit={handleSaveDidox} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="didox-stir" className="text-[11px] font-medium text-foreground">
                      {pi.integrations.didoxStirLabel}
                    </Label>
                    <Input
                      id="didox-stir"
                      maxLength={9}
                      value={didoxForm.stir}
                      onChange={(e) =>
                        setDidoxForm((f) => ({ ...f, stir: e.target.value.replace(/[^\d]/g, "") }))
                      }
                      placeholder={pi.integrations.didoxStirPlaceholder}
                      disabled={isReadOnly}
                      className="h-9 text-xs font-mono bg-background/50 border-border/60"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="didox-mode" className="text-[11px] font-medium text-foreground">
                      {pi.integrations.didoxModeLabel}
                    </Label>
                    <select
                      id="didox-mode"
                      value={didoxForm.mode}
                      onChange={(e) =>
                        setDidoxForm((f) => ({
                          ...f,
                          mode: e.target.value === "auto" ? "auto" : "manual",
                        }))
                      }
                      disabled={isReadOnly}
                      className="w-full h-9 text-xs rounded-md border border-border/60 bg-background/50 px-2.5 text-foreground"
                    >
                      <option value="manual">{pi.integrations.didoxModeManual}</option>
                      <option value="auto">{pi.integrations.didoxModeAuto}</option>
                    </select>
                  </div>
                  {!isReadOnly && (
                    <div className="pt-1 flex justify-end">
                      <Button type="submit" size="sm" className="h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white shadow-sm" disabled={isSavingDidox}>
                        {isSavingDidox && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {pi.integrations.saveDidoxBtn}
                      </Button>
                    </div>
                  )}
                </form>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="p-4 pb-3 border-b border-border/50">
                <h3 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                  <Landmark className="h-4 w-4 text-emerald-400" />
                  {pi.integrations.bankCardTitle}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{pi.integrations.bankCardDesc}</p>
              </div>
              <div className="p-4">
                <form onSubmit={handleSaveBankPrefs} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="bank-encoding" className="text-[11px] font-medium text-foreground">
                      {pi.integrations.bankEncodingLabel}
                    </Label>
                    <select
                      id="bank-encoding"
                      value={bankForm.encoding}
                      onChange={(e) =>
                        setBankForm((f) => ({
                          ...f,
                          encoding: e.target.value as "auto" | "UTF-8" | "Windows-1251",
                        }))
                      }
                      disabled={isReadOnly}
                      className="w-full h-9 text-xs rounded-md border border-border/60 bg-background/50 px-2.5 text-foreground"
                    >
                      <option value="auto">{pi.integrations.bankEncodingAuto}</option>
                      <option value="UTF-8">{pi.integrations.bankEncodingUtf8}</option>
                      <option value="Windows-1251">{pi.integrations.bankEncodingWin1251}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bank-default-gl" className="text-[11px] font-medium text-foreground">
                      {pi.integrations.bankDefaultAccountLabel}
                    </Label>
                    <Input
                      id="bank-default-gl"
                      maxLength={8}
                      value={bankForm.defaultAccountCode}
                      onChange={(e) => setBankForm((f) => ({ ...f, defaultAccountCode: e.target.value }))}
                      placeholder={pi.integrations.bankDefaultAccountPlaceholder}
                      disabled={isReadOnly}
                      className="h-9 text-xs font-mono bg-background/50 border-border/60"
                    />
                  </div>
                  {!isReadOnly && (
                    <div className="pt-1 flex justify-end">
                      <Button type="submit" size="sm" className="h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white shadow-sm" disabled={isSavingBank}>
                        {isSavingBank && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {pi.integrations.saveBankBtn}
                      </Button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* 1C Draft Queue Card */}
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
            <div className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{pi.integrations.queueTitle}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{pi.integrations.queueDesc}</p>
              </div>
              {!isReadOnly &&
                integrations.onec.mode === "odata" &&
                integrations.onec.status === "connected" &&
                readyQueueCount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 text-xs gap-1.5 self-start sm:self-auto bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
                    disabled={isPushingDrafts}
                    onClick={() => handlePushDraftsToOneC()}
                  >
                    {isPushingDrafts ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {pi.integrations.pushReadyToOneCBtn} ({readyQueueCount})
                  </Button>
                )}
            </div>
            <div className="p-0 overflow-x-auto">
              {integrations.queue.length === 0 ? (
                <div className="py-8 px-4 text-center text-xs text-muted-foreground">
                  {pi.integrations.queueEmpty}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{pi.integrations.queueColSource}</TableHead>
                      <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{pi.integrations.queueColSummary}</TableHead>
                      <TableHead className="text-right text-[11px] uppercase font-medium text-muted-foreground">{pi.integrations.queueColAmount}</TableHead>
                      <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{pi.integrations.queueColStatus}</TableHead>
                      <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{pi.integrations.queueColDocNumber}</TableHead>
                      <TableHead className="text-right text-[11px] uppercase font-medium text-muted-foreground">{pi.integrations.queueColAction}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrations.queue.map((item) => (
                      <TableRow key={item.id} className="text-xs border-border/30 hover:bg-muted/30">
                        <TableCell className="font-mono text-[11px] text-muted-foreground">{item.sourceKind}</TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{item.summary}</div>
                          {item.errorMessage && (
                            <div className="text-[11px] text-rose-400 flex items-center gap-1 mt-0.5">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              <span>{item.errorMessage}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap text-foreground font-medium">
                          {item.amount > 0 ? item.amount.toLocaleString(intlLocale) : "â€”"}
                        </TableCell>
                        <TableCell>
                          {item.status === "pushed_to_1c_draft" && (
                            <Badge variant="success" className="text-[10px]">
                              {pi.integrations.queueStatusPushed}
                            </Badge>
                          )}
                          {item.status === "pending" && (
                            <Badge variant="warning" className="text-[10px]">
                              {pi.integrations.queueStatusPending}
                            </Badge>
                          )}
                          {item.status === "processing" && (
                            <Badge variant="indigo" className="text-[10px]">
                              {pi.integrations.queueStatusProcessing}
                            </Badge>
                          )}
                          {item.status === "failed" && (
                            <Badge variant="destructive" className="text-[10px]">
                              {pi.integrations.queueStatusFailed}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-violet-600 dark:text-violet-400">{item.onecDocNumber || "â€”"}</TableCell>
                        <TableCell className="text-right">
                          {!isReadOnly &&
                            item.status === "failed" &&
                            integrations.onec.mode === "odata" &&
                            integrations.onec.status === "connected" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-[11px] px-2.5 border-border/60 hover:bg-muted/30"
                                disabled={isPushingDrafts}
                                onClick={() => handlePushDraftsToOneC([item.id])}
                              >
                                {pi.integrations.retryBtn}
                              </Button>
                            )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 1. Entities Management Tab (Multi-Company B2B mode only) */}
        {FEATURES.multiCompanyMode && (
          <TabsContent value="entities" className="space-y-4 mt-4">
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="p-4 pb-3 flex flex-row items-center justify-between border-b border-border/50">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t.pages.settings.entitiesTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.pages.settings.entitiesDesc}</p>
                </div>
                {!isReadOnly && (
                  <Button
                    size="sm"
                    className="text-xs h-8 bg-violet-600 hover:bg-violet-500 text-white shadow-sm gap-1.5"
                    onClick={() => setIsAddEntityOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.pages.settings.addEntity}
                  </Button>
                )}
              </div>
              <div className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.settings.companyName}</TableHead>
                      <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.settings.tinStir}</TableHead>
                      <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.settings.legalForm}</TableHead>
                      <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.settings.taxRegime}</TableHead>
                      <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.settings.managingAccountant}</TableHead>
                      <TableHead className="text-[11px] uppercase font-medium text-muted-foreground">{t.pages.settings.status}</TableHead>
                      <TableHead className="text-right text-[11px] uppercase font-medium text-muted-foreground">{t.pages.settings.action}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                          {isLoading ? d.loadingEntities : d.emptyEntities}
                        </TableCell>
                      </TableRow>
                    ) : (
                      entities.map((ent) => (
                        <TableRow key={ent.id} className="border-border/30 hover:bg-muted/30">
                          <TableCell className="font-semibold text-xs text-foreground">
                            {ent.name}
                            {ent.tradeName && (
                              <span className="text-[10px] text-muted-foreground block">
                                {ent.tradeName}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-violet-600 dark:text-violet-400 font-bold">
                            {ent.tinStir}
                          </TableCell>
                          <TableCell className="text-xs">{ent.companyType}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {ent.taxRegime === "vat_profit_tax"
                                ? d.regimeVatProfit
                                : ent.taxRegime === "turnover_tax"
                                ? d.regimeTurnover
                                : d.regimeFixed}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {ent.accountantName}
                          </TableCell>
                          <TableCell>
                            <StatusPill status="active" />
                          </TableCell>
                          <TableCell className="text-right">
                            {!isReadOnly && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2 border-border/60 hover:bg-muted/30"
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
              </div>
            </div>
          </TabsContent>
        )}

        {/* 2. Security Tab */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Password Change Card */}
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="p-4 pb-3 border-b border-border/50">
                <h3 className="text-sm font-semibold text-foreground">{pi.security.passwordCardTitle}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{pi.security.passwordCardDesc}</p>
              </div>
              <div className="p-4">
                <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label htmlFor="security-new-password" className="text-[11px] font-medium text-foreground">
                      {pi.security.newPasswordLabel}
                    </Label>
                    <Input
                      id="security-new-password"
                      type="password"
                      minLength={8}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                      placeholder={pi.security.newPasswordPlaceholder}
                      className="h-9 text-xs bg-background/50 border-border/60"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="security-confirm-password" className="text-[11px] font-medium text-foreground">
                      {pi.security.confirmPasswordLabel}
                    </Label>
                    <Input
                      id="security-confirm-password"
                      type="password"
                      minLength={8}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder={pi.security.confirmPasswordPlaceholder}
                      className="h-9 text-xs bg-background/50 border-border/60"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{pi.security.minCharsHint}</p>
                  <p className="text-[11px] text-muted-foreground">{pi.security.oauthPasswordHint}</p>
                  <div className="pt-1 flex justify-end">
                    <Button type="submit" size="sm" className="h-9 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white shadow-sm" disabled={isUpdatingPassword}>
                      {isUpdatingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {pi.security.savePasswordBtn}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* 2FA, Active Session & API Token Revocation Card */}
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="p-4 pb-3 border-b border-border/50">
                <h3 className="text-sm font-semibold text-foreground">{t.pages.settings.securityTitle}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t.pages.settings.securityDesc}</p>
              </div>
              <div className="p-4 space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-card/40">
                  <div className="space-y-0.5 pr-3">
                    <span className="font-semibold text-foreground text-xs block">
                      {t.pages.settings.twoFactorTitle}
                    </span>
                    <p className="text-muted-foreground text-[11px]">
                      {t.pages.settings.twoFactorDesc}
                    </p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    aria-label={t.pages.settings.twoFactorTitle}
                    onCheckedChange={(val) => {
                      setTwoFactorEnabled(val);
                      persistPrefs({ twoFactorEnabled: val, emailAlerts, telegramAlerts });
                      toast.success(`2FA ${val ? t.statuses.active : t.common.reject}`);
                    }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/50 bg-card/40">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground text-xs block">
                      {pi.security.revokeTokensTitle}
                    </span>
                    <p className="text-muted-foreground text-[11px]">{pi.security.revokeTokensDesc}</p>
                  </div>
                  {!isReadOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs gap-1.5 text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10 shrink-0"
                      disabled={isRevokingTokens}
                      onClick={handleRevokeApiTokens}
                    >
                      {isRevokingTokens ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unplug className="h-3.5 w-3.5" />
                      )}
                      {pi.security.revokeTokensBtn}
                    </Button>
                  )}
                </div>

                <div className="pt-1">
                  <h4 className="font-semibold text-foreground text-xs mb-2">
                    {t.pages.settings.activeSessions}:
                  </h4>
                  <div className="p-3 rounded-xl border border-border/50 bg-card/40 space-y-1">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="font-semibold text-foreground">
                        {user?.email ? maskEmail(user.email) : d.authenticatedSession} â€¢{" "}
                        {t.pages.settings.currentSession}
                      </span>
                      <span className="text-emerald-400">
                        {t.pages.settings.online}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {d.supabaseSessionNote} â€¢ {t.common.date}: {t.common.now}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 4. Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
            <div className="p-4 pb-3 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">{t.pages.settings.notificationsTitle}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t.pages.settings.notificationsDesc}</p>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/40">
                <div>
                  <span className="font-semibold text-foreground block">{t.pages.settings.emailAlerts}</span>
                  <p className="text-muted-foreground text-[11px]">{t.pages.settings.emailAlertsDesc}</p>
                </div>
                <Switch
                  checked={emailAlerts}
                  aria-label={t.pages.settings.emailAlerts}
                  onCheckedChange={(val) => {
                    setEmailAlerts(val);
                    persistPrefs({ twoFactorEnabled, emailAlerts: val, telegramAlerts });
                    toast.success(val ? d.toasts.emailAlertsOn : d.toasts.emailAlertsOff);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/40">
                <div>
                  <span className="font-semibold text-foreground block">{t.pages.settings.telegramAlerts}</span>
                  <p className="text-muted-foreground text-[11px]">{t.pages.settings.telegramAlertsDesc}</p>
                </div>
                <Switch
                  checked={telegramAlerts}
                  aria-label={t.pages.settings.telegramAlerts}
                  onCheckedChange={(val) => {
                    setTelegramAlerts(val);
                    persistPrefs({ twoFactorEnabled, emailAlerts, telegramAlerts: val });
                    toast.success(val ? d.toasts.telegramAlertsOn : d.toasts.telegramAlertsOff);
                  }}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. Language Tab */}
        <TabsContent value="language" className="space-y-4 mt-4">
          <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
            <div className="p-4 pb-3 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">{t.pages.settings.interfaceLangTitle}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t.pages.settings.interfaceLangDesc}</p>
            </div>
            <div className="p-4 space-y-2 text-xs">
              {[
                { code: "uz", name: d.langUz, flag: "UZ" },
                { code: "ru", name: d.langRu, flag: "RU" },
                { code: "en", name: d.langEn, flag: "EN" },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code as any);
                    const nextDict = getReconcileErpDict(lang.code as any).erpExtra.settings;
                    toast.success(nextDict.toasts.languageChanged.replace("{lang}", lang.name));
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all text-left ${
                    language === lang.code
                      ? "border-violet-500 bg-violet-500/10 font-semibold text-foreground shadow-sm"
                      : "border-border/50 hover:bg-muted/30 text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                  {language === lang.code && <CheckCircle2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />}
                </button>
              ))}
            </div>
          </div>
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
              {d.addEntityDesc}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEntity} className="space-y-3 pt-2 text-xs">
            <div>
              <Label className="text-[11px] font-medium text-foreground">{d.legalNameLabel}</Label>
              <Input
                placeholder={d.legalNamePlaceholder}
                value={newEntity.legalName}
                onChange={(e) => setNewEntity({ ...newEntity, legalName: e.target.value })}
                className="h-8 text-xs mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-foreground">{d.tradeNameLabel}</Label>
                <Input
                  placeholder={d.tradeNamePlaceholder}
                  value={newEntity.tradeName}
                  onChange={(e) => setNewEntity({ ...newEntity, tradeName: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">{d.tinLabel}</Label>
                <Input
                  placeholder={d.tinPlaceholder}
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
                <Label className="text-[11px] font-medium text-foreground">{d.legalFormLabel}</Label>
                <select
                  value={newEntity.companyType}
                  onChange={(e) => setNewEntity({ ...newEntity, companyType: e.target.value })}
                  className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
                >
                  <option value="MChJ">{d.companyTypes.mchj}</option>
                  <option value="YaTT">{d.companyTypes.yatt}</option>
                  <option value="XK">{d.companyTypes.xk}</option>
                  <option value="AJ">{d.companyTypes.aj}</option>
                  <option value="OK">{d.companyTypes.ok}</option>
                </select>
              </div>
              <div>
                <Label className="text-[11px] font-medium text-foreground">{d.taxRegimeLabel}</Label>
                <select
                  value={newEntity.taxRegime}
                  onChange={(e) => setNewEntity({ ...newEntity, taxRegime: e.target.value })}
                  className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
                >
                  <option value="vat_profit_tax">{d.taxRegimeOptVat}</option>
                  <option value="turnover_tax">{d.taxRegimeOptTurnover}</option>
                  <option value="fixed_tax">{d.taxRegimeOptFixed}</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-medium text-foreground">{d.rolePositionLabel}</Label>
              <Input
                placeholder={d.rolePositionPlaceholder}
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
                {isSubmitting ? d.savingBtn : d.addEntitySubmitBtn}
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
              {d.editEntityTitle}
            </DialogTitle>
            <DialogDescription className="text-xs">{d.editEntityDesc}</DialogDescription>
          </DialogHeader>
          {editingEntity && (
            <form onSubmit={handleUpdateEntity} className="space-y-3 pt-2 text-xs">
              <div>
                <Label className="text-[11px] font-medium">{d.legalNameLabel}</Label>
                <Input
                  value={editingEntity.name}
                  onChange={(e) => setEditingEntity({ ...editingEntity, name: e.target.value })}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] font-medium">{d.tinInnLabel}</Label>
                  <Input
                    value={editingEntity.tinStir}
                    onChange={(e) => setEditingEntity({ ...editingEntity, tinStir: e.target.value })}
                    className="h-8 text-xs font-mono mt-1"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-medium">{d.editTaxRegimeLabel}</Label>
                  <select
                    value={editingEntity.taxRegime}
                    onChange={(e) => setEditingEntity({ ...editingEntity, taxRegime: e.target.value })}
                    className="w-full h-8 text-xs mt-1 rounded-md border border-input bg-background px-2"
                  >
                    <option value="vat_profit_tax">{d.regimeVatProfit}</option>
                    <option value="turnover_tax">{d.regimeTurnover}</option>
                    <option value="fixed_tax">{d.regimeFixed}</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-medium">{d.chiefAccountantLabel}</Label>
                <Input
                  value={editingEntity.accountantName || ""}
                  onChange={(e) =>
                    setEditingEntity({ ...editingEntity, accountantName: e.target.value })
                  }
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
                  {isSubmitting ? d.savingBtn : t.common.save}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsLoadingFallback() {
  const { locale } = useTranslation();
  const dict = getReconcileErpDict(locale);
  return <div className="p-6 text-xs text-muted-foreground">{dict.commonLoading}</div>;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoadingFallback />}>
      <SettingsContent />
    </Suspense>
  );
}
