"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppState } from "@/lib/context/app-state";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  createBusinessEntity,
  updateBusinessEntity,
} from "@/lib/services/supabase-service";
import {
  ACTIVITY_TYPE_OPTIONS,
  ONEC_PROFILE_PLACEHOLDERS,
  addClientBankAccount,
  canAddClientForPlan,
  deleteClientBankAccount,
  fetchClientBankAccounts,
  fetchClientOverviewBatches,
  filterBatchesByPeriod,
  getPeriodKey,
  type ClientBatchSummaryItem,
  type PeriodGroupingMode,
} from "@/lib/services/multi-client-service";
import { BANK_SOURCE_PROFILES } from "@/lib/services/onec-profiles";
import { getTurnoverRuleForStatus, type TaxpayerStatus } from "@/lib/services/uz-tax-calculator";
import { PLANS_CONFIG } from "@/lib/config/plans";
import type { BusinessEntity, ClientBankAccount } from "@/lib/types/accounting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Plus,
  CheckCircle2,
  Pencil,
  Landmark,
  Trash2,
  Calendar,
  ArrowUpRight,
  Lock,
  Loader2,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<TaxpayerStatus, { uz: string; ru: string; en: string }> = {
  llc: { uz: "MChJ / Yuridik shaxs", ru: "ООО / Юрлицо", en: "LLC / Legal entity" },
  yatt: { uz: "YaTT", ru: "ИП", en: "Sole Proprietor (YaTT)" },
  self_employed: { uz: "Oʻzini oʻzi band", ru: "Самозанятый", en: "Self-employed" },
};

const COPY = {
  uz: {
    title: "Mijozlar (Koʻp mijozli boshqaruv)",
    subtitle: "Har bir mijozning soliq profili, bank hisoblari, 1C profili va davr boʻyicha holatini bir joydan boshqaring.",
    addClientBtn: "Yangi mijoz qoʻshish",
    upgradeBtn: "Tarifni oshirish",
    limitReachedTitle: "Tarif limiti toʻldi",
    limitReachedDesc: (planName: string, limit: number) =>
      `Sizning ${planName} tarifingizda maksimal ${limit} ta mijoz qoʻshish mumkin. Koʻproq mijoz yuritish uchun Pro yoki Pro+ tarifiga oʻting.`,
    kpiTotalClients: "Jami mijozlar",
    kpiVatPayers: "QQS toʻlovchilar",
    kpiTurnoverClients: "Aylanma soliq",
    kpiPeriodWorks: "Tanlangan davrdagi ishlar",
    unlimited: "Cheksiz",
    periodModeMonth: "Oy boʻyicha",
    periodModeQuarter: "Chorak boʻyicha",
    allPeriods: "Barcha davrlar",
    colClient: "Mijoz va STIR",
    colTaxProfile: "Soliq profili",
    colOneC: "1C profili",
    colBank: "Asosiy bank",
    colStatus: "Davr holati",
    colActions: "Amal",
    activeBadge: "Tanlangan",
    selectBtn: "Tanlash",
    editBtn: "Tahrirlash",
    vatBadge: "QQS toʻlovchi",
    noVatBadge: "QQSsiz",
    worksSuffix: "ta ish",
    noWorksInPeriod: "Bu davrda ish yoʻq",
    createTitle: "Yangi mijoz qoʻshish",
    editTitle: "Mijoz profilini tahrirlash",
    legalName: "Mijoz yuridik nomi *",
    tinStir: "STIR (9 ta raqam) *",
    taxpayerStatus: "Soliq toʻlovchi maqomi",
    taxRegime: "Soliq rejimi",
    regimeTurnover: "Aylanmadan olinadigan soliq",
    regimeVatProfit: "Umumbelgilangan (QQS + Foyda)",
    regimeFixed: "Qatʼiy belgilangan (eski)",
    isVatPayer: "QQS toʻlovchisimi?",
    activityType: "Faoliyat turi",
    oneCProfile: "1C versiya profili",
    primaryBankName: "Asosiy bank nomi",
    primaryBankAccount: "Hisob raqami (20 xonali)",
    primaryBankMfo: "MFO (5 xonali)",
    bankAccountsTitle: "Mijozning bank hisoblari",
    addBankBtn: "Hisob qoʻshish",
    noExtraBanks: "Qoʻshimcha bank hisoblari kiritilmagan.",
    saveBtn: "Saqlash",
    savingBtn: "Saqlanmoqda...",
    cancelBtn: "Bekor qilish",
    switchedToast: (name: string) => `Faol mijoz «${name}» ga almashtirildi`,
    savedToast: "Mijoz maʼlumotlari saqlandi",
    createdToast: "Yangi mijoz qoʻshildi",
    bankAddedToast: "Bank hisobi qoʻshildi",
    bankDeletedToast: "Bank hisobi oʻchirildi",
    tinErr: "STIR aniq 9 ta raqamdan iborat boʻlishi kerak",
    emptyClients: "Hali mijozlar yoʻq. Birinchi mijozingizni qoʻshing.",
  },
  ru: {
    title: "Клиенты (Мультиклиентский режим)",
    subtitle: "Управляйте налоговым профилем, банковскими счетами, профилем 1С и статусом по периодам для каждого клиента.",
    addClientBtn: "Добавить клиента",
    upgradeBtn: "Улучшить тариф",
    limitReachedTitle: "Достигнут лимит тарифа",
    limitReachedDesc: (planName: string, limit: number) =>
      `На вашем тарифе ${planName} доступно максимум ${limit} клиентов. Перейдите на Pro или Pro+ для расширения.`,
    kpiTotalClients: "Всего клиентов",
    kpiVatPayers: "Плательщики НДС",
    kpiTurnoverClients: "Налог с оборота",
    kpiPeriodWorks: "Работ за период",
    unlimited: "Без лимита",
    periodModeMonth: "По месяцам",
    periodModeQuarter: "По кварталам",
    allPeriods: "Все периоды",
    colClient: "Клиент и ИНН",
    colTaxProfile: "Налоговый профиль",
    colOneC: "Профиль 1С",
    colBank: "Основной банк",
    colStatus: "Статус периода",
    colActions: "Действие",
    activeBadge: "Активен",
    selectBtn: "Выбрать",
    editBtn: "Изменить",
    vatBadge: "Плательщик НДС",
    noVatBadge: "Без НДС",
    worksSuffix: "работ",
    noWorksInPeriod: "Нет работ",
    createTitle: "Добавить нового клиента",
    editTitle: "Редактировать профиль клиента",
    legalName: "Юридическое название *",
    tinStir: "ИНН (9 цифр) *",
    taxpayerStatus: "Статус налогоплательщика",
    taxRegime: "Налоговый режим",
    regimeTurnover: "Налог с оборота",
    regimeVatProfit: "Общеустановленный (НДС + Прибыль)",
    regimeFixed: "Фиксированный (старый)",
    isVatPayer: "Плательщик НДС?",
    activityType: "Вид деятельности",
    oneCProfile: "Профиль версии 1С",
    primaryBankName: "Основной банк",
    primaryBankAccount: "Расчётный счёт (20 цифр)",
    primaryBankMfo: "МФО (5 цифр)",
    bankAccountsTitle: "Банковские счета клиента",
    addBankBtn: "Добавить счёт",
    noExtraBanks: "Дополнительные счета не добавлены.",
    saveBtn: "Сохранить",
    savingBtn: "Сохранение...",
    cancelBtn: "Отмена",
    switchedToast: (name: string) => `Активный клиент переключён на «${name}»`,
    savedToast: "Профиль клиента сохранён",
    createdToast: "Новый клиент добавлен",
    bankAddedToast: "Банковский счёт добавлен",
    bankDeletedToast: "Банковский счёт удалён",
    tinErr: "ИНН должен состоять ровно из 9 цифр",
    emptyClients: "Клиентов пока нет. Добавьте первого клиента.",
  },
  en: {
    title: "Clients (Multi-Client Accountant Hub)",
    subtitle: "Manage each client's tax profile, bank accounts, 1C profile, and period activity in one view.",
    addClientBtn: "Add client",
    upgradeBtn: "Upgrade plan",
    limitReachedTitle: "Plan client limit reached",
    limitReachedDesc: (planName: string, limit: number) =>
      `Your ${planName} plan allows up to ${limit} client(s). Upgrade to Pro or Pro+ to add more.`,
    kpiTotalClients: "Total clients",
    kpiVatPayers: "VAT payers",
    kpiTurnoverClients: "Turnover tax",
    kpiPeriodWorks: "Works in period",
    unlimited: "Unlimited",
    periodModeMonth: "By month",
    periodModeQuarter: "By quarter",
    allPeriods: "All periods",
    colClient: "Client & TIN",
    colTaxProfile: "Tax profile",
    colOneC: "1C profile",
    colBank: "Primary bank",
    colStatus: "Period status",
    colActions: "Action",
    activeBadge: "Active",
    selectBtn: "Select",
    editBtn: "Edit",
    vatBadge: "VAT payer",
    noVatBadge: "Non-VAT",
    worksSuffix: "works",
    noWorksInPeriod: "No activity",
    createTitle: "Add new client",
    editTitle: "Edit client profile",
    legalName: "Legal name *",
    tinStir: "TIN / STIR (9 digits) *",
    taxpayerStatus: "Taxpayer status",
    taxRegime: "Tax regime",
    regimeTurnover: "Turnover tax",
    regimeVatProfit: "General (VAT + Profit)",
    regimeFixed: "Fixed tax (legacy)",
    isVatPayer: "Is VAT payer?",
    activityType: "Activity type",
    oneCProfile: "1C version profile",
    primaryBankName: "Primary bank name",
    primaryBankAccount: "Account number (20 digits)",
    primaryBankMfo: "MFO (5 digits)",
    bankAccountsTitle: "Client bank accounts",
    addBankBtn: "Add account",
    noExtraBanks: "No extra bank accounts added.",
    saveBtn: "Save",
    savingBtn: "Saving...",
    cancelBtn: "Cancel",
    switchedToast: (name: string) => `Switched active client to «${name}»`,
    savedToast: "Client profile saved",
    createdToast: "New client added",
    bankAddedToast: "Bank account added",
    bankDeletedToast: "Bank account removed",
    tinErr: "TIN/STIR must be exactly 9 digits",
    emptyClients: "No clients yet. Add your first client.",
  },
};

function ClientsContent() {
  const searchParams = useSearchParams();
  const { locale } = useTranslation();
  const c = COPY[locale] ?? COPY.uz;

  const {
    entities,
    currentEntity,
    currentWorkspace,
    subscription,
    setCurrentEntityId,
    refreshContext,
  } = useAppState();

  const [batches, setBatches] = useState<ClientBatchSummaryItem[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [periodMode, setPeriodMode] = useState<PeriodGroupingMode>("month");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<BusinessEntity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    legalName: "",
    tinStir: "",
    taxpayerStatus: "llc" as TaxpayerStatus,
    taxRegime: "turnover_tax" as "turnover_tax" | "vat_profit_tax" | "fixed_tax",
    isVatPayer: false,
    activityType: ACTIVITY_TYPE_OPTIONS[0] as string,
    oneCProfileId: ONEC_PROFILE_PLACEHOLDERS[0].id as string,
    bankName: "",
    bankAccount: "",
    bankMfo: "",
  });

  // Extra bank accounts inside Edit modal
  const [bankAccounts, setBankAccounts] = useState<ClientBankAccount[]>([]);
  const [newBankName, setNewBankName] = useState("");
  const [newBankAcc, setNewBankAcc] = useState("");
  const [newBankMfo, setNewBankMfo] = useState("");
  const [isAddingBank, setIsAddingBank] = useState(false);

  const planCheck = canAddClientForPlan(
    subscription.planId || currentWorkspace?.currentPlan,
    entities.length
  );
  const planName = PLANS_CONFIG[planCheck.planId].name;

  const entityIdsKey = useMemo(() => entities.map((e) => e.id).join(","), [entities]);

  const loadOverviewBatches = useCallback(async () => {
    const ids = entityIdsKey ? entityIdsKey.split(",") : [];
    if (ids.length === 0) {
      setBatches([]);
      return;
    }
    setIsLoadingBatches(true);
    try {
      const data = await fetchClientOverviewBatches(ids);
      setBatches(data);
    } finally {
      setIsLoadingBatches(false);
    }
  }, [entityIdsKey]);

  useEffect(() => {
    void loadOverviewBatches();
  }, [loadOverviewBatches]);

  const openCreateModal = useCallback(() => {
    if (!planCheck.allowed) {
      toast.error(c.limitReachedDesc(planName, planCheck.limit ?? 1));
      return;
    }
    setEditingEntity(null);
    setBankAccounts([]);
    setForm({
      legalName: "",
      tinStir: "",
      taxpayerStatus: "llc",
      taxRegime: "turnover_tax",
      isVatPayer: false,
      activityType: ACTIVITY_TYPE_OPTIONS[0],
      oneCProfileId: "1c_83_uz_venkon",
      bankName: "",
      bankAccount: "",
      bankMfo: "",
    });
    setIsModalOpen(true);
  }, [planCheck.allowed, planCheck.limit, planName, c]);

  const handleSmartNameChange = (nextName: string) => {
    const lower = nextName.toLowerCase();
    let nextStatus = form.taxpayerStatus;
    let nextRegime = form.taxRegime;
    let nextVat = form.isVatPayer;
    let nextActivity = form.activityType;

    // Auto-detect taxpayer status from legal name when creating a new client
    if (!editingEntity) {
      if (/(^|\s)(yatt|ytt|ип|yakka)(\s|$|\.)/i.test(lower)) {
        nextStatus = "yatt";
        if (nextRegime !== "vat_profit_tax") {
          nextRegime = "turnover_tax";
          nextVat = false;
        }
      } else if (/(o'zini|oʻzini|самозанят)/i.test(lower)) {
        nextStatus = "self_employed";
        nextRegime = "turnover_tax";
        nextVat = false;
      } else if (/(^|\s)(mchj|m\.ch\.j|ооо|llc|xk|qk|aj)(\s|$|"|»)/i.test(lower)) {
        nextStatus = "llc";
      }

      // Auto-detect activity type from keywords in company name
      if (/(\bit\b|soft|tech|digital|dastur|ai\b|cyber)/i.test(lower)) {
        nextActivity = "IT va elektron tijorat";
      } else if (/(qurilish|stroy|build|logist|trans|yuk)/i.test(lower)) {
        nextActivity = "Qurilish va logistika";
      } else if (/(kafe|restoran|food|oshxona|coffee|burger)/i.test(lower)) {
        nextActivity = "Umumiy ovqatlanish";
      } else if (/(zavod|tekstil|textile|sanoat|ishlab chiqar|fabrika)/i.test(lower)) {
        nextActivity = "Ishlab chiqarish";
      } else if (/(market|do'kon|dukon|chakana|minimarket)/i.test(lower)) {
        nextActivity = "Chakana savdo";
      } else if (/(ulgurji|optom|trade|savdo)/i.test(lower)) {
        nextActivity = "Savdo va xizmatlar";
      }
    }

    setForm((prev) => ({
      ...prev,
      legalName: nextName,
      taxpayerStatus: nextStatus,
      taxRegime: nextRegime,
      isVatPayer: nextVat,
      activityType: nextActivity,
    }));
  };

  const handleSmartStirChange = (rawStir: string) => {
    const digits = rawStir.replace(/\D/g, "").slice(0, 9);
    let nextStatus = form.taxpayerStatus;

    // In Uzbekistan, TIN/STIR starting with 4, 5, 6 belongs to individuals (YaTT / self-employed), 2 or 3 belongs to legal entities (MChJ)
    if (!editingEntity && digits.length >= 1) {
      const first = digits[0];
      const lowerName = form.legalName.toLowerCase();
      const hasExplicitMchj = /(mchj|ооо|llc|xk|qk|aj)/i.test(lowerName);
      const hasExplicitYatt = /(yatt|ytt|ип|yakka)/i.test(lowerName);

      if ((first === "4" || first === "5" || first === "6") && !hasExplicitMchj) {
        nextStatus = "yatt";
      } else if ((first === "2" || first === "3") && !hasExplicitYatt) {
        nextStatus = "llc";
      }
    }

    setForm((prev) => ({
      ...prev,
      tinStir: digits,
      taxpayerStatus: nextStatus,
    }));
  };

  const handleSmartMfoChange = (rawMfo: string) => {
    const digits = rawMfo.replace(/\D/g, "").slice(0, 5);
    let nextBankName = form.bankName;
    if (digits.length === 5) {
      const matched = BANK_SOURCE_PROFILES.find(
        (b) => b.id !== "bank_other" && b.mfos.includes(digits)
      );
      if (matched) {
        nextBankName = matched.shortLabel;
      }
    }
    setForm((prev) => ({
      ...prev,
      bankMfo: digits,
      bankName: nextBankName,
    }));
  };

  const combinedTaxPreset = useMemo(() => {
    if (form.taxRegime === "vat_profit_tax" || form.isVatPayer) {
      return form.taxpayerStatus === "yatt" ? "yatt_vat" : "llc_vat";
    }
    if (form.taxpayerStatus === "self_employed") return "self_employed";
    if (form.taxpayerStatus === "yatt") return "yatt_turnover";
    return "llc_turnover";
  }, [form.taxpayerStatus, form.taxRegime, form.isVatPayer]);

  const handleCombinedTaxPresetChange = (preset: string) => {
    switch (preset) {
      case "yatt_turnover":
        setForm((prev) => ({
          ...prev,
          taxpayerStatus: "yatt",
          taxRegime: "turnover_tax",
          isVatPayer: false,
        }));
        break;
      case "llc_vat":
        setForm((prev) => ({
          ...prev,
          taxpayerStatus: "llc",
          taxRegime: "vat_profit_tax",
          isVatPayer: true,
        }));
        break;
      case "yatt_vat":
        setForm((prev) => ({
          ...prev,
          taxpayerStatus: "yatt",
          taxRegime: "vat_profit_tax",
          isVatPayer: true,
        }));
        break;
      case "self_employed":
        setForm((prev) => ({
          ...prev,
          taxpayerStatus: "self_employed",
          taxRegime: "turnover_tax",
          isVatPayer: false,
        }));
        break;
      case "llc_turnover":
      default:
        setForm((prev) => ({
          ...prev,
          taxpayerStatus: "llc",
          taxRegime: "turnover_tax",
          isVatPayer: false,
        }));
        break;
    }
  };

  useEffect(() => {
    if (searchParams.get("action") === "add") {
      openCreateModal();
    }
  }, [searchParams, openCreateModal]);

  const openEditModal = async (ent: BusinessEntity) => {
    setEditingEntity(ent);
    const status: TaxpayerStatus =
      ent.taxpayerStatus ??
      (ent.companyType === "YaTT"
        ? "yatt"
        : ent.companyType === "Oʻzini band"
        ? "self_employed"
        : "llc");
    setForm({
      legalName: ent.name,
      tinStir: ent.tinStir,
      taxpayerStatus: status,
      taxRegime: ent.taxRegime,
      isVatPayer: Boolean(ent.isVatPayer ?? ent.taxRegime === "vat_profit_tax"),
      activityType: ent.activityType || ACTIVITY_TYPE_OPTIONS[0],
      oneCProfileId: ent.oneCProfileId || ONEC_PROFILE_PLACEHOLDERS[0].id,
      bankName: ent.bankName || "",
      bankAccount: ent.bankAccount || "",
      bankMfo: ent.bankMfo || "",
    });
    setIsModalOpen(true);
    const accounts = await fetchClientBankAccounts(ent.id);
    setBankAccounts(accounts);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStir = form.tinStir.replace(/\D/g, "");
    if (!/^\d{9}$/.test(cleanStir)) {
      toast.error(c.tinErr);
      return;
    }

    const companyType =
      form.taxpayerStatus === "yatt"
        ? "YaTT"
        : form.taxpayerStatus === "self_employed"
        ? "Oʻzini band"
        : "MCHJ";

    setIsSaving(true);
    try {
      if (editingEntity) {
        await updateBusinessEntity(editingEntity.id, {
          legalName: form.legalName.trim(),
          tinStir: cleanStir,
          companyType,
          taxpayerStatus: form.taxpayerStatus,
          taxRegime: form.taxRegime,
          isVatPayer: form.isVatPayer,
          activityType: form.activityType,
          oneCProfileId: form.oneCProfileId,
          bankName: form.bankName,
          bankAccount: form.bankAccount,
          bankMfo: form.bankMfo,
        });
        toast.success(c.savedToast);
      } else {
        const created = await createBusinessEntity({
          workspaceId: currentWorkspace?.id,
          legalName: form.legalName.trim(),
          tinStir: cleanStir,
          companyType,
          taxpayerStatus: form.taxpayerStatus,
          taxRegime: form.taxRegime,
          isVatPayer: form.isVatPayer,
          activityType: form.activityType,
          oneCProfileId: form.oneCProfileId,
          bankName: form.bankName,
          bankAccount: form.bankAccount,
          bankMfo: form.bankMfo,
        });
        if (form.bankName.trim() && form.bankAccount.trim()) {
          await addClientBankAccount({
            businessEntityId: created.id,
            bankName: form.bankName,
            accountNumber: form.bankAccount,
            mfo: form.bankMfo,
            isPrimary: true,
          }).catch(() => {});
        }
        setCurrentEntityId(created.id);
        toast.success(c.createdToast);
      }
      setIsModalOpen(false);
      await refreshContext();
    } catch (err: any) {
      toast.error(err?.message || "Xatolik yuz berdi");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBankAccount = async () => {
    if (!editingEntity?.id || !newBankName.trim() || !newBankAcc.trim()) return;
    setIsAddingBank(true);
    try {
      const added = await addClientBankAccount({
        businessEntityId: editingEntity.id,
        bankName: newBankName,
        accountNumber: newBankAcc,
        mfo: newBankMfo,
        isPrimary: bankAccounts.length === 0,
      });
      setBankAccounts((prev) => [...prev, added]);
      setNewBankName("");
      setNewBankAcc("");
      setNewBankMfo("");
      toast.success(c.bankAddedToast);
    } catch (err: any) {
      toast.error(err?.message || "Xatolik");
    } finally {
      setIsAddingBank(false);
    }
  };

  const handleDeleteBankAccount = async (id: string) => {
    try {
      await deleteClientBankAccount(id);
      setBankAccounts((prev) => prev.filter((b) => b.id !== id));
      toast.success(c.bankDeletedToast);
    } catch (err: any) {
      toast.error(err?.message || "Xatolik");
    }
  };

  const availablePeriods = useMemo(() => {
    const keys = Array.from(new Set(batches.map((b) => getPeriodKey(b.periodMonth, periodMode))));
    return keys.sort((a, b) => b.localeCompare(a));
  }, [batches, periodMode]);

  const filteredBatches = useMemo(
    () => filterBatchesByPeriod(batches, periodMode, selectedPeriod),
    [batches, periodMode, selectedPeriod]
  );

  const clientBatchStats = useMemo(() => {
    const map = new Map<string, { count: number; lastDate: string | null }>();
    for (const b of filteredBatches) {
      const prev = map.get(b.businessEntityId) ?? { count: 0, lastDate: null };
      prev.count += 1;
      if (!prev.lastDate || b.createdAt > prev.lastDate) {
        prev.lastDate = b.createdAt;
      }
      map.set(b.businessEntityId, prev);
    }
    return map;
  }, [filteredBatches]);

  const vatCount = entities.filter((e) => e.isVatPayer || e.taxRegime === "vat_profit_tax").length;
  const turnoverCount = entities.filter((e) => e.taxRegime === "turnover_tax").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{c.title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{c.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {planCheck.allowed ? (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
              onClick={openCreateModal}
            >
              <Plus className="h-3.5 w-3.5" />
              {c.addClientBtn}
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              className="h-8 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
            >
              <Link href="/billing">
                <Lock className="h-3.5 w-3.5" />
                {c.upgradeBtn}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Unified Overview Ribbon */}
      <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm divide-y sm:divide-y-0 sm:divide-x divide-border/60 grid grid-cols-2 lg:grid-cols-4 overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            <span>{c.kpiTotalClients}</span>
            <span className={`h-2 w-2 rounded-full ${planCheck.allowed ? "bg-emerald-500" : "bg-amber-500"}`} />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {entities.length}
            <span className="text-xs font-normal text-muted-foreground ml-1.5">
              / {planCheck.limit === null ? c.unlimited : planCheck.limit} ({planName})
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            <span>{c.kpiVatPayers}</span>
            <span className="h-2 w-2 rounded-full bg-violet-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{vatCount}</div>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            <span>{c.kpiTurnoverClients}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">{turnoverCount}</div>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            <span>{c.kpiPeriodWorks}</span>
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {isLoadingBatches ? "…" : filteredBatches.length}
          </div>
        </div>
      </div>

      {/* Plan Limit Banner if full */}
      {!planCheck.allowed && planCheck.limit !== null && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-semibold text-foreground">{c.limitReachedTitle}: </span>
            <span className="text-muted-foreground">
              {c.limitReachedDesc(planName, planCheck.limit)}
            </span>
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 text-[11px] shrink-0">
            <Link href="/billing">{c.upgradeBtn}</Link>
          </Button>
        </div>
      )}

      {/* Period Grouping Bar (Month / Quarter) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-card/30 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Button
            type="button"
            size="sm"
            variant={periodMode === "month" ? "default" : "outline"}
            className="h-7 text-[11px] px-2.5"
            onClick={() => {
              setPeriodMode("month");
              setSelectedPeriod("all");
            }}
          >
            {c.periodModeMonth}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={periodMode === "quarter" ? "default" : "outline"}
            className="h-7 text-[11px] px-2.5"
            onClick={() => {
              setPeriodMode("quarter");
              setSelectedPeriod("all");
            }}
          >
            {c.periodModeQuarter}
          </Button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant={selectedPeriod === "all" ? "default" : "outline"}
            className="h-6 text-[11px] px-2"
            onClick={() => setSelectedPeriod("all")}
          >
            {c.allPeriods}
          </Button>
          {availablePeriods.slice(0, 8).map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={selectedPeriod === p ? "default" : "outline"}
              className="h-6 text-[11px] px-2 font-mono"
              onClick={() => setSelectedPeriod(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Clients Edge-to-Edge Table */}
      <div className="rounded-xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-x-auto">
        {entities.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">{c.emptyClients}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] uppercase text-muted-foreground">
                <TableHead>{c.colClient}</TableHead>
                <TableHead>{c.colTaxProfile}</TableHead>
                <TableHead>{c.colOneC}</TableHead>
                <TableHead>{c.colBank}</TableHead>
                <TableHead>{c.colStatus}</TableHead>
                <TableHead className="text-right">{c.colActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entities.map((ent) => {
                const isSelected = ent.id === currentEntity?.id;
                const status: TaxpayerStatus =
                  ent.taxpayerStatus ?? (ent.companyType === "YaTT" ? "yatt" : "llc");
                const turnoverRule = getTurnoverRuleForStatus(status);
                const stats = clientBatchStats.get(ent.id);
                const oneCLabel =
                  ONEC_PROFILE_PLACEHOLDERS.find((p) => p.id === ent.oneCProfileId)?.label ||
                  ONEC_PROFILE_PLACEHOLDERS[0].label;

                return (
                  <TableRow
                    key={ent.id}
                    className={`text-xs ${isSelected ? "bg-violet-500/[0.06]" : ""}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span className="truncate max-w-[200px]">{ent.name}</span>
                            {isSelected && (
                              <Badge variant="violet" className="text-[9px] h-4 px-1.5">
                                {c.activeBadge}
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            STIR: {ent.tinStir}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-foreground">
                            {STATUS_LABELS[status][locale]}
                          </span>
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                            {ent.taxRegime === "turnover_tax"
                              ? `${c.regimeTurnover} (${turnoverRule.ratePercent}%)`
                              : ent.taxRegime === "vat_profit_tax"
                              ? c.regimeVatProfit
                              : c.regimeFixed}
                          </Badge>
                          {(ent.isVatPayer || ent.taxRegime === "vat_profit_tax") && (
                            <Badge variant="violet" className="text-[9px] h-4 px-1.5">
                              {c.vatBadge}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {ent.activityType || ACTIVITY_TYPE_OPTIONS[0]}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-[11px] text-muted-foreground max-w-[180px] truncate">
                      {oneCLabel}
                    </TableCell>

                    <TableCell className="text-[11px]">
                      {ent.bankName || ent.bankAccount ? (
                        <div>
                          <div className="font-medium text-foreground truncate max-w-[150px]">
                            {ent.bankName || "—"}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {ent.bankAccount || "—"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {stats && stats.count > 0 ? (
                        <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>
                            {stats.count} {c.worksSuffix}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {c.noWorksInPeriod}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {!isSelected && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2.5 gap-1"
                            onClick={() => {
                              setCurrentEntityId(ent.id);
                              toast.success(c.switchedToast(ent.name));
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            {c.selectBtn}
                          </Button>
                        )}
                        {isSelected && (
                          <Button asChild size="sm" variant="outline" className="h-7 text-[11px] px-2 gap-1">
                            <Link href="/reconcile">
                              <Scale className="h-3 w-3" />
                              Sverka
                            </Link>
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => void openEditModal(ent)}
                          title={c.editBtn}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add / Edit Client Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingEntity ? c.editTitle : c.createTitle}
            </DialogTitle>
            <DialogDescription className="text-xs">{c.subtitle}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveClient} className="space-y-3.5 text-xs pt-1">
            {/* Step 1: Only 2 required fields (Legal Name + 9-digit STIR) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">{c.legalName}</Label>
                <Input
                  value={form.legalName}
                  onChange={(e) => handleSmartNameChange(e.target.value)}
                  placeholder="Masalan: Baraka Savdo MChJ yoki YaTT Aliyev"
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>
              <div>
                <Label className="text-[11px]">{c.tinStir}</Label>
                <Input
                  value={form.tinStir}
                  maxLength={9}
                  onChange={(e) => handleSmartStirChange(e.target.value)}
                  className="h-8 font-mono text-xs mt-1"
                  placeholder="305112233"
                  required
                />
              </div>
            </div>

            {/* Step 2: Single Unified Tax Profile Selector (Auto-selected from Name & STIR) */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-[11px]">{c.colTaxProfile}</Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Avto-tanlandi ({getTurnoverRuleForStatus(form.taxpayerStatus).ratePercent}% / {form.isVatPayer ? "QQS 12%" : "QQSsiz"})
                </span>
              </div>
              <select
                value={combinedTaxPreset}
                onChange={(e) => handleCombinedTaxPresetChange(e.target.value)}
                className="w-full h-8 mt-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium"
              >
                <option value="llc_turnover">
                  MChJ — Aylanmadan olinadigan soliq (4%, QQSsiz)
                </option>
                <option value="yatt_turnover">
                  YaTT — Aylanmadan olinadigan soliq (1%, 1 mlrd soʻmgacha)
                </option>
                <option value="llc_vat">
                  MChJ — Umumbelgilangan soliq (QQS 12% + Foyda soligʻi 15%)
                </option>
                <option value="yatt_vat">
                  YaTT — QQS (12%) va Daromad soligʻi toʻlovchi
                </option>
                <option value="self_employed">
                  Oʻzini oʻzi band qilgan shaxs (1%, 1 mlrd soʻmgacha)
                </option>
              </select>
            </div>

            {/* Step 3: Auto-filled fields (remain visible & pre-filled, optional to touch when adding without documents) */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-foreground">
                  Avtomatik toʻldirilgan rekvizitlar
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                  Hujjat yuklanganda ham oʻzi yangilanadi
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[11px] text-muted-foreground">{c.oneCProfile}</Label>
                  <select
                    value={form.oneCProfileId}
                    onChange={(e) => setForm({ ...form, oneCProfileId: e.target.value })}
                    className="w-full h-8 mt-1 rounded-md border border-input bg-background px-2.5 text-xs"
                  >
                    {ONEC_PROFILE_PLACEHOLDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">{c.activityType}</Label>
                  <select
                    value={form.activityType}
                    onChange={(e) => setForm({ ...form, activityType: e.target.value })}
                    className="w-full h-8 mt-1 rounded-md border border-input bg-background px-2.5 text-xs"
                  >
                    {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-border/40">
                <div>
                  <Label className="text-[11px] text-muted-foreground">{c.primaryBankName}</Label>
                  <select
                    value={form.bankName}
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = BANK_SOURCE_PROFILES.find(
                        (b) => b.id !== "bank_other" && b.shortLabel === val
                      );
                      setForm((prev) => ({
                        ...prev,
                        bankName: val,
                        bankMfo: found && found.mfos[0] ? found.mfos[0] : prev.bankMfo,
                      }));
                    }}
                    className="w-full h-8 mt-1 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">Avto (koʻchirmadan olinadi)</option>
                    {BANK_SOURCE_PROFILES.filter((b) => b.id !== "bank_other").map((b) => (
                      <option key={b.id} value={b.shortLabel}>
                        {b.shortLabel} ({b.mfos[0]})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">{c.primaryBankMfo}</Label>
                  <Input
                    value={form.bankMfo}
                    maxLength={5}
                    onChange={(e) => handleSmartMfoChange(e.target.value)}
                    className="h-8 font-mono text-xs mt-1"
                    placeholder="Avto (masalan 00445)"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">{c.primaryBankAccount}</Label>
                  <Input
                    value={form.bankAccount}
                    onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                    className="h-8 font-mono text-xs mt-1"
                    placeholder="Ixtiyoriy (20208...)"
                  />
                </div>
              </div>
            </div>

            {/* Extra Bank Accounts Section when editing */}
            {editingEntity && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Landmark className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  <span>{c.bankAccountsTitle} ({bankAccounts.length})</span>
                </div>
                {bankAccounts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">{c.noExtraBanks}</p>
                ) : (
                  <div className="space-y-1">
                    {bankAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px]"
                      >
                        <div>
                          <span className="font-medium">{acc.bankName}</span>
                          <span className="font-mono text-muted-foreground ml-2">
                            {acc.accountNumber}
                          </span>
                          {acc.mfo && (
                            <span className="font-mono text-muted-foreground ml-1.5">
                              MFO {acc.mfo}
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => void handleDeleteBankAccount(acc.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <Input
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                    placeholder={c.primaryBankName}
                    className="h-7 text-[11px]"
                  />
                  <Input
                    value={newBankAcc}
                    onChange={(e) => setNewBankAcc(e.target.value)}
                    placeholder="20208000..."
                    className="h-7 font-mono text-[11px]"
                  />
                  <div className="flex gap-1">
                    <Input
                      value={newBankMfo}
                      maxLength={5}
                      onChange={(e) => setNewBankMfo(e.target.value.replace(/\D/g, ""))}
                      placeholder="MFO"
                      className="h-7 font-mono text-[11px]"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isAddingBank || !newBankName.trim() || !newBankAcc.trim()}
                      className="h-7 text-[11px] px-2 shrink-0"
                      onClick={() => void handleAddBankAccount()}
                    >
                      {isAddingBank ? <Loader2 className="h-3 w-3 animate-spin" /> : "+"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                {c.cancelBtn}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="bg-violet-600 hover:bg-violet-500 text-white shadow-sm"
              >
                {isSaving ? c.savingBtn : c.saveBtn}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-muted-foreground">Yuklanmoqda...</div>}>
      <ClientsContent />
    </Suspense>
  );
}
