import type { Locale } from "../types";
import type { AiModelId } from "@/lib/config/plans";

export function getIntlLocale(locale: Locale): "uz-UZ" | "ru-RU" | "en-US" {
  switch (locale) {
    case "ru":
      return "ru-RU";
    case "en":
      return "en-US";
    default:
      return "uz-UZ";
  }
}

export interface CommandPaletteItemMeta {
  name: string;
  description: string;
  keywords: string[];
}

export interface ShellSharedDict {
  sidebar: {
    toolsGroupLabel: string;
    solo: {
      home: string;
      aiChat: string;
      reconcile: string;
      scanner: string;
      calculator: string;
      contract: string;
      history: string;
      billing: string;
    };
    erp: {
      reconcile: string;
      assistant: string;
      billing: string;
    };
    brandSubMulti: string;
    brandSubSolo: string;
    aiAgentTitle: string;
    expandSidebar: string;
    collapseSidebar: string;
    activeBadge: string;
  };
  topbar: {
    defaultDisplayName: string;
    billingMenuLabel: string;
    signOutToast: string;
    toggleThemeLabel: string;
  };
  footer: {
    privacy: string;
    terms: string;
    billing: string;
  };
  commandPalette: {
    soloItems: {
      home: CommandPaletteItemMeta;
      aiChat: CommandPaletteItemMeta;
      reconcile: CommandPaletteItemMeta;
      scanner: CommandPaletteItemMeta;
      calculator: CommandPaletteItemMeta;
      contract: CommandPaletteItemMeta;
      history: CommandPaletteItemMeta;
      billing: CommandPaletteItemMeta;
      settings: CommandPaletteItemMeta;
    };
    erpItems: {
      dashboard: CommandPaletteItemMeta;
      reconcile: CommandPaletteItemMeta;
      assistant: CommandPaletteItemMeta;
      aiAuditor: CommandPaletteItemMeta;
      transactions: CommandPaletteItemMeta;
      accounting: CommandPaletteItemMeta;
      tax: CommandPaletteItemMeta;
      finance: CommandPaletteItemMeta;
      billing: CommandPaletteItemMeta;
      settings: CommandPaletteItemMeta;
    };
  };
  notifications: {
    today: string;
    duePrefix: string;
    viewInAuditor: string;
    goToTax: string;
    markAllReadToast: string;
    clearAllToast: string;
  };
  workspaceSwitcher: {
    dialogTitle: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    typeLabel: string;
    types: {
      accounting_firm: string;
      individual_company: string;
    };
    submitBtn: string;
    submittingBtn: string;
    cancelBtn: string;
    nameMinLengthError: string;
    createdToast: (name: string) => string;
    createErrorToast: (msg: string) => string;
    switchedToast: (name: string) => string;
  };
  entitySwitcher: {
    noEntitySelected: string;
    switchedToast: (name: string) => string;
    taxRegimes: {
      vat_profit_tax: string;
      turnover_tax: string;
      fixed_tax: string;
    };
  };
  aiDrawer: {
    tooltips: {
      newChat: string;
      chatHistory: string;
    };
    inputPlaceholder: string;
    personalLabel: string;
    defaultDocName: string;
    imageSentLabel: (fileName: string) => string;
    entryPrepared: string;
    noReplyError: string;
    copilotErrorToast: (msg: string) => string;
    errorMessage: (msg: string) => string;
    selectEntityFirstError: string;
    scanPostedToast: string;
    scanPostErrorToast: (msg: string) => string;
    executeActionError: string;
    actionApprovedToast: string;
    actionRejectedToast: string;
    executeErrorToast: (msg: string) => string;
    sentReceiptAlt: string;
    statusApproved: string;
    statusRejected: string;
    dtPrefix: string;
    ktPrefix: string;
    confirmActionPrompt: string;
  };
  shared: {
    cookieConsent: {
      message: string;
      privacyLink: string;
      acceptBtn: string;
    };
    firstLoginNotice: {
      title: string;
      bodyBeforeTerms: string;
      termsLink: string;
      bodyBetweenLinks: string;
      privacyLink: string;
      bodyAfterPrivacy: string;
      acceptBtn: string;
    };
    quickEntityBanner: {
      bannerTitle: string;
      bannerDesc: string;
      addBtn: string;
      modalTitle: string;
      modalDesc: string;
      nameLabel: string;
      namePlaceholder: string;
      tinLabel: string;
      tinPlaceholder: string;
      taxRegimeLabel: string;
      taxRegimes: {
        vat_profit_tax: string;
        turnover_tax: string;
      };
      defaultAccountantName: string;
      createdToast: string;
      createErrorToast: (msg: string) => string;
      unknownError: string;
      validation: {
        legalName: string;
        tinStir: string;
        generic: string;
      };
    };
    paginationBar: {
      defaultItemLabel: string;
      totalPrefix: string;
      totalUnit: string;
      pageLabel: string;
      previous: string;
      next: string;
    };
    aiModelSelector: {
      proLockToast: (modelLabel: string) => string;
      switchErrorToast: string;
      descriptions: Record<AiModelId, string>;
    };
    chatImageInputBar: {
      placeholder: string;
      attachTooltip: string;
      attachAriaLabel: string;
      attachedImageAlt: string;
      removeImageLabel: string;
      stopLabel: string;
      sendLabel: string;
      invalidFormatError: string;
      maxSizeError: string;
      readError: string;
      corruptError: string;
      compressError: string;
    };
    chatScanCard: {
      duplicateBadge: string;
      postedBadge: string;
      totalAmountLabel: (currency: string) => string;
      debitAccountLabel: string;
      creditAccountLabel: string;
      vatLabel: string;
      netLabel: string;
      copyBtn: string;
      copiedBtn: string;
      copiedToast: string;
      copyErrorToast: string;
      postToLedgerBtn: string;
      copyCounterparty: string;
      copyAmount: string;
      copyVat: string;
      copyEntry: string;
      debitAccounts: Record<string, string>;
      creditAccounts: Record<string, string>;
    };
    aiChatVisuals: {
      heroGreeting: string;
      heroSubtitle: string;
      quickPrompts: string[];
      thinkingLabel: string;
      regenerateTitle: string;
      regenerateBtn: string;
      copyTitle: string;
      copyBtn: string;
      copiedBtn: string;
      copyToast: string;
      copyErrorToast: string;
    };
    aiThreadHistoryPanel: {
      title: string;
      newChatBtn: string;
      searchPlaceholder: string;
      empty: string;
      renameLabel: string;
      deleteLabel: string;
      deleteConfirm: string;
      loadErrorToast: (msg: string) => string;
      renameErrorToast: (msg: string) => string;
      deleteErrorToast: (msg: string) => string;
    };
    emptyState: {
      defaultTitle: string;
      defaultDescription: string;
      defaultAction: string;
    };
    kpiCard: {
      defaultTitle: string;
      noData: string;
    };
    money: {
      thousand: string;
      million: string;
      billion: string;
    };
    statusPill: {
      failed: string;
      readOnly: string;
      inactive: string;
      trialing: string;
      cancelled: string;
      expired: string;
      open: string;
      inReview: string;
      resolved: string;
    };
  };
}

export const shellSharedDict: Record<Locale, ShellSharedDict> = {
  uz: {
    sidebar: {
      toolsGroupLabel: "Asboblar",
      solo: {
        home: "Bosh sahifa",
        aiChat: "AI Chat",
        reconcile: "Bank ↔ 1C AI Sverka",
        scanner: "Faktura / Chek Skaner",
        calculator: "Kalkulyator",
        contract: "Shartnoma tahlili",
        history: "Saqlangan tarix",
        billing: "Obunalar",
      },
      erp: {
        reconcile: "Bank ↔ 1C AI Sverka",
        assistant: "AI Hamkasb & Skaner",
        billing: "Obunalar",
      },
      brandSubMulti: "AI SaaS • Oʻzbekiston",
      brandSubSolo: "AI Tools • Buxgalteriya",
      aiAgentTitle: "FIRMUS AI Agent",
      expandSidebar: "Menyuni ochish",
      collapseSidebar: "Menyuni yigʻish",
      activeBadge: "Faol",
    },
    topbar: {
      defaultDisplayName: "Bosh buxgalter",
      billingMenuLabel: "Obunalar",
      signOutToast: "Tizimdan chiqilmoqda...",
      toggleThemeLabel: "Mavzuni almashtirish",
    },
    footer: {
      privacy: "Maxfiylik",
      terms: "Oferta",
      billing: "Obunalar",
    },
    commandPalette: {
      soloItems: {
        home: {
          name: "Bosh sahifa",
          description: "Asosiy panel va tezkor asboblar",
          keywords: ["home", "dashboard", "bosh sahifa", "главная", "панель", "asosiy"],
        },
        aiChat: {
          name: "AI Chat",
          description: "Soliq, 21-BHMS va provodka boʻyicha yordamchi",
          keywords: ["ai", "chat", "copilot", "yordamchi", "чат", "ассистент", "savol", "assistant"],
        },
        reconcile: {
          name: "Bank ↔ 1C AI Sverka",
          description: "Bank koʻchirmasi va 1C fayllarini AI solishtirish",
          keywords: ["bank", "1c", "sverka", "reconcile", "сверка", "банк", "solishtirish", "eksport"],
        },
        scanner: {
          name: "Faktura / Chek Skaner",
          description: "Chek va faktura rasmini oʻqib provodka tuzish",
          keywords: ["scan", "scanner", "faktura", "chek", "skaner", "сканер", "чек", "фактура", "ocr", "receipt"],
        },
        calculator: {
          name: "Kalkulyator",
          description: "Maosh, QQS, aylanma soliq va taʼtil hisobi",
          keywords: ["calc", "calculator", "kalkulyator", "калькулятор", "maosh", "qqs", "nds", "зарплата", "налог", "tax", "salary"],
        },
        contract: {
          name: "Shartnoma tahlili",
          description: "Shartnomadagi huquqiy va soliq xavflarini tekshirish",
          keywords: ["contract", "shartnoma", "tahlil", "договор", "анализ", "контракт", "legal", "risk"],
        },
        history: {
          name: "Saqlangan tarix",
          description: "Oldingi skanerlar, sverka va suhbatlar arxivi",
          keywords: ["history", "tarix", "arxiv", "история", "архив", "saqlangan", "saved"],
        },
        billing: {
          name: "Obunalar",
          description: "Tariflar, limitlar va toʻlov usullari",
          keywords: ["billing", "obuna", "tarif", "pro", "подписка", "тарифы", "оплата", "plans", "subscription"],
        },
        settings: {
          name: "Sozlamalar",
          description: "Profil, xavfsizlik va til sozlamalari",
          keywords: ["settings", "sozlamalar", "настройки", "til", "language", "язык", "security"],
        },
      },
      erpItems: {
        dashboard: {
          name: "Boshqaruv (Dashboard)",
          description: "Asosiy koʻrsatkichlar va pul oqimi",
          keywords: ["dashboard", "boshqaruv", "главная", "панель", "home"],
        },
        reconcile: {
          name: "Bank ↔ 1C AI Sverka",
          description: "Bank koʻchirmasi va 1C solishtirish",
          keywords: ["bank", "1c", "sverka", "reconcile", "сверка"],
        },
        assistant: {
          name: "AI Hamkasb & Skaner",
          description: "AI chat, skaner, kalkulyator va shartnoma tahlili",
          keywords: ["assistant", "ai", "skaner", "hamkasb", "ассистент", "сканер"],
        },
        aiAuditor: {
          name: "AI Auditor & Istisnolar",
          description: "Xatolar va shubhali operatsiyalar nazorati",
          keywords: ["auditor", "exceptions", "istisnolar", "аудитор", "исключения"],
        },
        transactions: {
          name: "Tranzaksiyalar",
          description: "Bank va kassa operatsiyalari roʻyxati",
          keywords: ["transactions", "tranzaksiyalar", "транзакции", "payments"],
        },
        accounting: {
          name: "Hisoblar rejasi & Ledger",
          description: "Bosh kitob, provodkalar va schyotlar rejasi",
          keywords: ["accounting", "ledger", "hisoblar", "provodka", "бухгалтерия", "проводки", "план счетов"],
        },
        tax: {
          name: "Soliqlar & Kalendar",
          description: "Soliq hisobotlari va toʻlov muddatlari",
          keywords: ["tax", "soliq", "налоги", "календарь", "qqs", "ндс"],
        },
        finance: {
          name: "Moliya & P&L",
          description: "Foyda va zarar hisoboti, balans va pul oqimi",
          keywords: ["finance", "moliya", "p&l", "финансы", "опу", "баланс"],
        },
        billing: {
          name: "Obunalar",
          description: "Tariflar, kvotalar va toʻlovlar",
          keywords: ["billing", "obuna", "tarif", "подписка", "тарифы", "subscription"],
        },
        settings: {
          name: "Sozlamalar",
          description: "Korxonalar, xavfsizlik va til",
          keywords: ["settings", "sozlamalar", "настройки", "entities"],
        },
      },
    },
    notifications: {
      today: "Bugun",
      duePrefix: "Muddat",
      viewInAuditor: "AI Auditorda koʻrish",
      goToTax: "Soliq boʻlimiga oʻtish",
      markAllReadToast: "Barcha bildirishnomalar oʻqilgan deb belgilandi",
      clearAllToast: "Bildirishnomalar tozalandi",
    },
    workspaceSwitcher: {
      dialogTitle: "Yangi maydon qoʻshish",
      subtitle: "Yangi buxgalteriya firmasi yoki alohida kompaniya ishchi maydonini yaratish",
      nameLabel: "Ishchi maydon nomi *",
      namePlaceholder: "Masalan: Trust Balance Audit",
      typeLabel: "Maydon turi *",
      types: {
        accounting_firm: "Buxgalteriya firmasi (Koʻp korxonali)",
        individual_company: "Yagona kompaniya",
      },
      submitBtn: "Yaratish",
      submittingBtn: "Yaratilmoqda...",
      cancelBtn: "Bekor qilish",
      nameMinLengthError: "Ishchi maydon nomini kamida 2 ta harfdan iborat kiriting",
      createdToast: (name) => `«${name}» ishchi maydoni yaratildi!`,
      createErrorToast: (msg) => `Ishchi maydon yaratishda xatolik: ${msg}`,
      switchedToast: (name) => `Ishchi maydon: ${name}`,
    },
    entitySwitcher: {
      noEntitySelected: "Korxona tanlanmagan",
      switchedToast: (name) => `Tanlangan korxona: ${name}`,
      taxRegimes: {
        vat_profit_tax: "QQS + Foyda",
        turnover_tax: "Aylanma 4%",
        fixed_tax: "Qatʼiy soliq",
      },
    },
    aiDrawer: {
      tooltips: {
        newChat: "Yangi chat",
        chatHistory: "Chatlar tarixi",
      },
      inputPlaceholder: "Xabar yozing...",
      personalLabel: "Shaxsiy",
      defaultDocName: "hujjat",
      imageSentLabel: (fileName) => `📷 Rasm yuborildi: ${fileName}`,
      entryPrepared: "Provodka tayyorlandi.",
      noReplyError: "AI Copilot javob qaytarmadi",
      copilotErrorToast: (msg) => `AI Copilot xatosi: ${msg}`,
      errorMessage: (msg) => `Xatolik yuz berdi: ${msg}`,
      selectEntityFirstError: "Bosh kitobga yozish uchun avval korxona tanlang",
      scanPostedToast: "Faktura/chek provodkasi Bosh kitobga atomik tarzda yozildi!",
      scanPostErrorToast: (msg) => `Bosh kitobga yozishda xatolik: ${msg}`,
      executeActionError: "Amalni bajarishda xatolik",
      actionApprovedToast: "Amal Supabase bazasida muvaffaqiyatli tasdiqlandi!",
      actionRejectedToast: "Amal rad etildi va bazada yangilandi.",
      executeErrorToast: (msg) => `Amalni bajarishda xatolik: ${msg}`,
      sentReceiptAlt: "Yuborilgan chek",
      statusApproved: "Tasdiqlandi",
      statusRejected: "Rad etildi",
      dtPrefix: "Dt",
      ktPrefix: "Kt",
      confirmActionPrompt: "Ushbu amalni tasdiqlaysizmi?",
    },
    shared: {
      cookieConsent: {
        message: "FIRMUS faqat xavfsiz avtorizatsiya sessiyasi va sozlamalaringizni saqlash uchun texnik cookieʼlardan foydalanadi.",
        privacyLink: "Maxfiylik siyosati",
        acceptBtn: "Tushunarli",
      },
      firstLoginNotice: {
        title: "Yodda tuting",
        bodyBeforeTerms:
          "FIRMUS AI — bu yordamchi vosita boʻlib, ayrim javob yoki hisoblarda xato qilishi mumkin. Yakuniy provodka va soliq hisobotlarini tasdiqlashdan oldin tekshirib oling. Yuklangan maʼlumotlar",
        termsLink: "Foydalanish shartlari",
        bodyBetweenLinks: "va",
        privacyLink: "Maxfiylik siyosati",
        bodyAfterPrivacy: "asosida himoyalanadi (karta va JShShIR maʼlumotlari avtomatik yashiriladi).",
        acceptBtn: "OK",
      },
      quickEntityBanner: {
        bannerTitle: "Korxona ulanmagan",
        bannerDesc: "Maʼlumotlarni saqlash uchun korxonangizni qoʻshing",
        addBtn: "Korxona qoʻshish",
        modalTitle: "Korxona qoʻshish",
        modalDesc: "Korxona nomi va STIR",
        nameLabel: "Korxona nomi",
        namePlaceholder: "Masalan: Baraka Savdo MChJ",
        tinLabel: "Korxona STIR",
        tinPlaceholder: "9 xonali STIR",
        taxRegimeLabel: "Soliq rejimi",
        taxRegimes: {
          vat_profit_tax: "QQS (12%) + Foyda",
          turnover_tax: "Aylanmadan (4%)",
        },
        defaultAccountantName: "Bosh buxgalter",
        createdToast: "Korxona yaratildi!",
        createErrorToast: (msg) => `Korxona qoʻshishda xatolik: ${msg}`,
        unknownError: "Nomaʼlum xato",
        validation: {
          legalName: "Korxona yuridik nomini kamida 3 ta belgidan iborat kiriting",
          tinStir: "STIR (INN) aniq 9 ta raqamdan iborat boʻlishi shart",
          generic: "Maʼlumotlar notoʻgʻri kiritilgan",
        },
      },
      paginationBar: {
        defaultItemLabel: "yozuv",
        totalPrefix: "Jami:",
        totalUnit: "ta",
        pageLabel: "Sahifa",
        previous: "Oldingi",
        next: "Keyingi",
      },
      aiModelSelector: {
        proLockToast: (modelLabel) =>
          `${modelLabel} modeli Pro va Pro+ tariflarida ochiladi. Obunalar boʻlimidan 7 kunlik bepul sinovni yoqishingiz mumkin.`,
        switchErrorToast: "Modelni almashtirib boʻlmadi",
        descriptions: {
          "gemini-3.8-flash": "Tez va hamyonbop model (kundalik savollar va chek skan)",
          "gemini-4-hydrogen": "Chuqur soliq, 21-BHMS va shartnoma tahlili",
        },
      },
      chatImageInputBar: {
        placeholder: "Xabar yozing...",
        attachTooltip: "Rasm biriktirish (PNG, JPG, WEBP)",
        attachAriaLabel: "Rasm biriktirish",
        attachedImageAlt: "Biriktirilgan rasm",
        removeImageLabel: "Rasmni olib tashlash",
        stopLabel: "Toʻxtatish",
        sendLabel: "Yuborish",
        invalidFormatError: "Rasm formati toʻgʻri emas. Faqat PNG, JPG yoki WEBP rasm yuklang.",
        maxSizeError: "Rasm hajmi 25 MB dan oshmasligi kerak",
        readError: "Rasmni oʻqib boʻlmadi",
        corruptError: "Rasm formati shikastlangan yoki oʻqib boʻlmadi",
        compressError: "Rasmni siqishda xatolik yuz berdi",
      },
      chatScanCard: {
        duplicateBadge: "Oʻxshash chek tarixda bor",
        postedBadge: "Bosh kitobda",
        totalAmountLabel: (currency) => `Jami summa (${currency})`,
        debitAccountLabel: "Debet schyot",
        creditAccountLabel: "Kredit schyot",
        vatLabel: "QQS (12%)",
        netLabel: "Sof summa",
        copyBtn: "Provodkani nusxalash",
        copiedBtn: "Nusxalandi",
        copiedToast: "Natija nusxalandi",
        copyErrorToast: "Nusxalab boʻlmadi",
        postToLedgerBtn: "Tasdiqlab Bosh kitobga yozish",
        copyCounterparty: "Kontragent",
        copyAmount: "Summa",
        copyVat: "QQS 12%",
        copyEntry: "Provodka",
        debitAccounts: {
          "6010": "6010 Yetkazib beruvchi",
          "9420": "9420 Maʼmuriy xarajat",
          "9410": "9410 Sotish xarajati",
          "2910": "2910 Tovarlar",
          "1010": "1010 Materiallar",
          "4010": "4010 Xaridorlar",
          "5110": "5110 Bank hisobi",
        },
        creditAccounts: {
          "5110": "5110 Bank hisobi",
          "5010": "5010 Kassa",
          "6010": "6010 Yetkazib beruvchi",
          "9030": "9030 Xizmat tushumi",
          "9020": "9020 Tovar tushumi",
          "9010": "9010 Mahsulot tushumi",
        },
      },
      aiChatVisuals: {
        heroGreeting: "Xush kelibsiz. Nima yordam bera olaman?",
        heroSubtitle: "Soliq, 21-BHMS, provodka va hujjatlar boʻyicha savol bering",
        quickPrompts: [
          "12% QQS boʻyicha kiruvchi faktura provodkasini yozib ber",
          "Aylanma soliq 4% qachon va qanday topshiriladi?",
          "Asosiy vosita amortizatsiyasi boʻyicha misol keltir",
        ],
        thinkingLabel: "AI javob tayyorlamoqda...",
        regenerateTitle: "Qayta javob olish",
        regenerateBtn: "Qayta",
        copyTitle: "Nusxalash",
        copyBtn: "Nusxa",
        copiedBtn: "Nusxalandi",
        copyToast: "Matn nusxalandi",
        copyErrorToast: "Nusxalab boʻlmadi",
      },
      aiThreadHistoryPanel: {
        title: "Chatlar tarixi",
        newChatBtn: "Yangi chat",
        searchPlaceholder: "Chatlardan qidirish...",
        empty: "Suhbatlar tarixi boʻsh",
        renameLabel: "Nomini oʻzgartirish",
        deleteLabel: "Oʻchirish",
        deleteConfirm: "Ushbu suhbatni oʻchirmoqchimisiz?",
        loadErrorToast: (msg) => `Suhbatni yuklab boʻlmadi: ${msg}`,
        renameErrorToast: (msg) => `Nomni oʻzgartirib boʻlmadi: ${msg}`,
        deleteErrorToast: (msg) => `Oʻchirishda xatolik: ${msg}`,
      },
      emptyState: {
        defaultTitle: "Maʼlumot topilmadi",
        defaultDescription: "Hozircha koʻrsatish uchun yozuvlar mavjud emas.",
        defaultAction: "Yangilash",
      },
      kpiCard: {
        defaultTitle: "Koʻrsatkich",
        noData: "—",
      },
      money: {
        thousand: "ming",
        million: "mln",
        billion: "mlrd",
      },
      statusPill: {
        failed: "Xatolik",
        readOnly: "Faqat oʻqish",
        inactive: "Nofaol",
        trialing: "Sinov davri",
        cancelled: "Bekor qilingan",
        expired: "Muddati tugagan",
        open: "Ochiq",
        inReview: "Koʻrib chiqilmoqda",
        resolved: "Hal qilingan",
      },
    },
  },

  ru: {
    sidebar: {
      toolsGroupLabel: "Инструменты",
      solo: {
        home: "Главная",
        aiChat: "AI Чат",
        reconcile: "Банк ↔ 1C AI Сверка",
        scanner: "Сканер чеков и ЭСФ",
        calculator: "Калькулятор",
        contract: "Анализ договоров",
        history: "История",
        billing: "Подписка",
      },
      erp: {
        reconcile: "Банк ↔ 1C AI Сверка",
        assistant: "AI Ассистент и Сканер",
        billing: "Подписка",
      },
      brandSubMulti: "AI SaaS • Узбекистан",
      brandSubSolo: "AI Инструменты • Бухгалтерия",
      aiAgentTitle: "FIRMUS AI Агент",
      expandSidebar: "Развернуть меню",
      collapseSidebar: "Свернуть меню",
      activeBadge: "Активен",
    },
    topbar: {
      defaultDisplayName: "Главный бухгалтер",
      billingMenuLabel: "Подписка",
      signOutToast: "Выход из системы...",
      toggleThemeLabel: "Переключить тему",
    },
    footer: {
      privacy: "Конфиденциальность",
      terms: "Оферта",
      billing: "Подписка",
    },
    commandPalette: {
      soloItems: {
        home: {
          name: "Главная",
          description: "Основная панель и быстрые инструменты",
          keywords: ["home", "dashboard", "bosh sahifa", "главная", "панель", "обзор"],
        },
        aiChat: {
          name: "AI Чат",
          description: "Помощник по налогам, НСБУ №21 и проводкам",
          keywords: ["ai", "chat", "copilot", "yordamchi", "чат", "ассистент", "помощник", "вопрос"],
        },
        reconcile: {
          name: "Банк ↔ 1C AI Сверка",
          description: "AI-сверка банковской выписки и файлов 1С",
          keywords: ["bank", "1c", "sverka", "reconcile", "сверка", "банк", "1с", "выписка", "экспорт"],
        },
        scanner: {
          name: "Сканер чеков и ЭСФ",
          description: "Распознавание чеков и счетов-фактур с проводкой",
          keywords: ["scan", "scanner", "faktura", "chek", "skaner", "сканер", "чек", "фактура", "эсф", "ocr"],
        },
        calculator: {
          name: "Калькулятор",
          description: "Расчет зарплаты, НДС, налога с оборота и отпускных",
          keywords: ["calc", "calculator", "kalkulyator", "калькулятор", "зарплата", "ндс", "налог", "ндфл", "maosh", "qqs"],
        },
        contract: {
          name: "Анализ договоров",
          description: "Проверка юридических и налоговых рисков в договорах",
          keywords: ["contract", "shartnoma", "tahlil", "договор", "анализ", "контракт", "риски"],
        },
        history: {
          name: "История",
          description: "Архив сканов, сверок и диалогов с AI",
          keywords: ["history", "tarix", "arxiv", "история", "архив", "сохраненные"],
        },
        billing: {
          name: "Подписка",
          description: "Тарифы, лимиты и способы оплаты",
          keywords: ["billing", "obuna", "tarif", "pro", "подписка", "тарифы", "оплата", "планы"],
        },
        settings: {
          name: "Настройки",
          description: "Профиль, безопасность и язык интерфейса",
          keywords: ["settings", "sozlamalar", "настройки", "язык", "language", "безопасность"],
        },
      },
      erpItems: {
        dashboard: {
          name: "Панель управления",
          description: "Ключевые показатели и движение средств",
          keywords: ["dashboard", "boshqaruv", "главная", "панель", "обзор"],
        },
        reconcile: {
          name: "Банк ↔ 1C AI Сверка",
          description: "Сверка банковской выписки и 1С",
          keywords: ["bank", "1c", "sverka", "reconcile", "сверка"],
        },
        assistant: {
          name: "AI Ассистент и Сканер",
          description: "AI-чат, сканер, калькулятор и анализ договоров",
          keywords: ["assistant", "ai", "skaner", "ассистент", "сканер"],
        },
        aiAuditor: {
          name: "AI Аудитор и Исключения",
          description: "Контроль ошибок и подозрительных операций",
          keywords: ["auditor", "exceptions", "istisnolar", "аудитор", "исключения"],
        },
        transactions: {
          name: "Транзакции",
          description: "Список банковских и кассовых операций",
          keywords: ["transactions", "tranzaksiyalar", "транзакции", "операции"],
        },
        accounting: {
          name: "План счетов и Главная книга",
          description: "Главная книга, проводки и план счетов",
          keywords: ["accounting", "ledger", "hisoblar", "бухгалтерия", "проводки", "план счетов"],
        },
        tax: {
          name: "Налоги и Календарь",
          description: "Налоговые отчеты и сроки уплаты",
          keywords: ["tax", "soliq", "налоги", "календарь", "ндс"],
        },
        finance: {
          name: "Финансы и ОПУ (P&L)",
          description: "Отчет о прибылях и убытках, баланс",
          keywords: ["finance", "moliya", "p&l", "финансы", "опу", "баланс"],
        },
        billing: {
          name: "Подписка",
          description: "Тарифы, квоты и оплата",
          keywords: ["billing", "obuna", "tarif", "подписка", "тарифы", "subscription"],
        },
        settings: {
          name: "Настройки",
          description: "Организации, безопасность и язык",
          keywords: ["settings", "sozlamalar", "настройки", "организации"],
        },
      },
    },
    notifications: {
      today: "Сегодня",
      duePrefix: "Срок",
      viewInAuditor: "Открыть в AI Аудиторе",
      goToTax: "Перейти в Налоги",
      markAllReadToast: "Все уведомления отмечены как прочитанные",
      clearAllToast: "Уведомления очищены",
    },
    workspaceSwitcher: {
      dialogTitle: "Создать рабочую зону",
      subtitle: "Создайте рабочее пространство для бухгалтерской фирмы или отдельной компании",
      nameLabel: "Название рабочей зоны *",
      namePlaceholder: "Например: Trust Balance Audit",
      typeLabel: "Тип пространства *",
      types: {
        accounting_firm: "Бухгалтерская фирма (Мульти-компания)",
        individual_company: "Отдельная компания",
      },
      submitBtn: "Создать",
      submittingBtn: "Создание...",
      cancelBtn: "Отмена",
      nameMinLengthError: "Введите название рабочей зоны (минимум 2 символа)",
      createdToast: (name) => `Рабочая зона «${name}» создана!`,
      createErrorToast: (msg) => `Ошибка создания рабочей зоны: ${msg}`,
      switchedToast: (name) => `Рабочая зона: ${name}`,
    },
    entitySwitcher: {
      noEntitySelected: "Организация не выбрана",
      switchedToast: (name) => `Выбранная организация: ${name}`,
      taxRegimes: {
        vat_profit_tax: "НДС + Прибыль",
        turnover_tax: "С оборота 4%",
        fixed_tax: "Фикс. налог",
      },
    },
    aiDrawer: {
      tooltips: {
        newChat: "Новый чат",
        chatHistory: "История чатов",
      },
      inputPlaceholder: "Напишите сообщение...",
      personalLabel: "Личный",
      defaultDocName: "документ",
      imageSentLabel: (fileName) => `📷 Отправлено изображение: ${fileName}`,
      entryPrepared: "Проводка подготовлена.",
      noReplyError: "AI Copilot не вернул ответ",
      copilotErrorToast: (msg) => `Ошибка AI Copilot: ${msg}`,
      errorMessage: (msg) => `Произошла ошибка: ${msg}`,
      selectEntityFirstError: "Сначала выберите организацию для записи в Главную книгу",
      scanPostedToast: "Проводка по чеку/фактуре атомарно записана в Главную книгу!",
      scanPostErrorToast: (msg) => `Ошибка записи в Главную книгу: ${msg}`,
      executeActionError: "Ошибка выполнения действия",
      actionApprovedToast: "Действие успешно подтверждено в базе данных!",
      actionRejectedToast: "Действие отклонено и обновлено в базе.",
      executeErrorToast: (msg) => `Ошибка выполнения действия: ${msg}`,
      sentReceiptAlt: "Отправленный чек",
      statusApproved: "Утверждено",
      statusRejected: "Отклонено",
      dtPrefix: "Дт",
      ktPrefix: "Кт",
      confirmActionPrompt: "Подтвердить это действие?",
    },
    shared: {
      cookieConsent: {
        message: "FIRMUS использует только технические файлы cookie для безопасной авторизации и сохранения ваших настроек.",
        privacyLink: "Политика конфиденциальности",
        acceptBtn: "Понятно",
      },
      firstLoginNotice: {
        title: "Обратите внимание",
        bodyBeforeTerms:
          "FIRMUS AI — вспомогательный инструмент, который может допускать неточности в ответах или расчетах. Проверяйте итоговые проводки и налоговые отчеты перед подтверждением. Загруженные данные защищены в соответствии с",
        termsLink: "Условиями использования",
        bodyBetweenLinks: "и",
        privacyLink: "Политикой конфиденциальности",
        bodyAfterPrivacy: "(данные банковских карт и ПИНФЛ скрываются автоматически).",
        acceptBtn: "ОК",
      },
      quickEntityBanner: {
        bannerTitle: "Организация не подключена",
        bannerDesc: "Добавьте организацию для сохранения данных",
        addBtn: "Добавить организацию",
        modalTitle: "Добавить организацию",
        modalDesc: "Название организации и ИНН",
        nameLabel: "Название организации",
        namePlaceholder: "Например: ООО Baraka Savdo",
        tinLabel: "ИНН организации",
        tinPlaceholder: "9-значный ИНН",
        taxRegimeLabel: "Налоговый режим",
        taxRegimes: {
          vat_profit_tax: "НДС (12%) + Прибыль",
          turnover_tax: "Налог с оборота (4%)",
        },
        defaultAccountantName: "Главный бухгалтер",
        createdToast: "Организация создана!",
        createErrorToast: (msg) => `Ошибка добавления организации: ${msg}`,
        unknownError: "Неизвестная ошибка",
        validation: {
          legalName: "Введите юридическое название организации (минимум 3 символа)",
          tinStir: "ИНН должен состоять ровно из 9 цифр",
          generic: "Некорректно введены данные",
        },
      },
      paginationBar: {
        defaultItemLabel: "зап.",
        totalPrefix: "Всего:",
        totalUnit: "",
        pageLabel: "Стр.",
        previous: "Назад",
        next: "Вперед",
      },
      aiModelSelector: {
        proLockToast: (modelLabel) =>
          `Модель ${modelLabel} доступна на тарифах Pro и Pro+. В разделе «Подписка» можно активировать 7-дневный бесплатный пробный период.`,
        switchErrorToast: "Не удалось переключить модель",
        descriptions: {
          "gemini-3.8-flash": "Быстрая и экономичная модель (повседневные вопросы и сканирование чеков)",
          "gemini-4-hydrogen": "Глубокий анализ налогов, НСБУ №21 и договоров",
        },
      },
      chatImageInputBar: {
        placeholder: "Напишите сообщение...",
        attachTooltip: "Прикрепить изображение (PNG, JPG, WEBP)",
        attachAriaLabel: "Прикрепить изображение",
        attachedImageAlt: "Прикрепленное изображение",
        removeImageLabel: "Удалить изображение",
        stopLabel: "Остановить",
        sendLabel: "Отправить",
        invalidFormatError: "Неверный формат изображения. Загрузите только PNG, JPG или WEBP.",
        maxSizeError: "Размер изображения не должен превышать 25 МБ",
        readError: "Не удалось прочитать изображение",
        corruptError: "Изображение повреждено или не может быть прочитано",
        compressError: "Ошибка при сжатии изображения",
      },
      chatScanCard: {
        duplicateBadge: "Похожий чек уже есть в истории",
        postedBadge: "В Главной книге",
        totalAmountLabel: (currency) => `Итого сумма (${currency})`,
        debitAccountLabel: "Счет Дебет",
        creditAccountLabel: "Счет Кредит",
        vatLabel: "НДС (12%)",
        netLabel: "Чистая сумма",
        copyBtn: "Копировать проводку",
        copiedBtn: "Скопировано",
        copiedToast: "Результат скопирован",
        copyErrorToast: "Не удалось скопировать",
        postToLedgerBtn: "Подтвердить и записать в Главную книгу",
        copyCounterparty: "Контрагент",
        copyAmount: "Сумма",
        copyVat: "НДС 12%",
        copyEntry: "Проводка",
        debitAccounts: {
          "6010": "6010 Поставщики и подрядчики",
          "9420": "9420 Административные расходы",
          "9410": "9410 Расходы по реализации",
          "2910": "2910 Товары",
          "1010": "1010 Материалы",
          "4010": "4010 Покупатели и заказчики",
          "5110": "5110 Расчетный счет",
        },
        creditAccounts: {
          "5110": "5110 Расчетный счет",
          "5010": "5010 Касса",
          "6010": "6010 Поставщики и подрядчики",
          "9030": "9030 Выручка от услуг",
          "9020": "9020 Выручка от товаров",
          "9010": "9010 Выручка от продукции",
        },
      },
      aiChatVisuals: {
        heroGreeting: "Добро пожаловать. Чем я могу помочь?",
        heroSubtitle: "Задайте вопрос по налогам, НСБУ №21, проводкам и документам",
        quickPrompts: [
          "Составь проводку по входящему счету-фактуре с НДС 12%",
          "Когда и как сдается налог с оборота 4%?",
          "Приведи пример расчета амортизации основных средств",
        ],
        thinkingLabel: "AI готовит ответ...",
        regenerateTitle: "Сгенерировать заново",
        regenerateBtn: "Повторить",
        copyTitle: "Копировать",
        copyBtn: "Копия",
        copiedBtn: "Скопировано",
        copyToast: "Текст скопирован",
        copyErrorToast: "Не удалось скопировать",
      },
      aiThreadHistoryPanel: {
        title: "История чатов",
        newChatBtn: "Новый чат",
        searchPlaceholder: "Поиск по чатам...",
        empty: "История диалогов пуста",
        renameLabel: "Переименовать",
        deleteLabel: "Удалить",
        deleteConfirm: "Удалить этот диалог?",
        loadErrorToast: (msg) => `Не удалось загрузить диалог: ${msg}`,
        renameErrorToast: (msg) => `Не удалось переименовать: ${msg}`,
        deleteErrorToast: (msg) => `Ошибка удаления: ${msg}`,
      },
      emptyState: {
        defaultTitle: "Данные не найдены",
        defaultDescription: "Пока нет записей для отображения.",
        defaultAction: "Обновить",
      },
      kpiCard: {
        defaultTitle: "Показатель",
        noData: "—",
      },
      money: {
        thousand: "тыс.",
        million: "млн",
        billion: "млрд",
      },
      statusPill: {
        failed: "Ошибка",
        readOnly: "Только чтение",
        inactive: "Неактивен",
        trialing: "Пробный период",
        cancelled: "Отменено",
        expired: "Истекло",
        open: "Открыт",
        inReview: "На проверке",
        resolved: "Решено",
      },
    },
  },

  en: {
    sidebar: {
      toolsGroupLabel: "Tools",
      solo: {
        home: "Home",
        aiChat: "AI Chat",
        reconcile: "Bank ↔ 1C AI Reconcile",
        scanner: "Invoice / Receipt Scanner",
        calculator: "Calculator",
        contract: "Contract Analysis",
        history: "Saved History",
        billing: "Subscriptions",
      },
      erp: {
        reconcile: "Bank ↔ 1C AI Reconcile",
        assistant: "AI Copilot & Scanner",
        billing: "Subscriptions",
      },
      brandSubMulti: "AI SaaS • Uzbekistan",
      brandSubSolo: "AI Tools • Accounting",
      aiAgentTitle: "FIRMUS AI Agent",
      expandSidebar: "Expand sidebar",
      collapseSidebar: "Collapse sidebar",
      activeBadge: "Active",
    },
    topbar: {
      defaultDisplayName: "Chief Accountant",
      billingMenuLabel: "Subscriptions",
      signOutToast: "Signing out...",
      toggleThemeLabel: "Toggle theme",
    },
    footer: {
      privacy: "Privacy",
      terms: "Terms",
      billing: "Subscriptions",
    },
    commandPalette: {
      soloItems: {
        home: {
          name: "Home",
          description: "Main workspace and quick accounting tools",
          keywords: ["home", "dashboard", "bosh sahifa", "главная", "панель", "overview"],
        },
        aiChat: {
          name: "AI Chat",
          description: "Assistant for Uzbekistan tax, NAS 21 & journal entries",
          keywords: ["ai", "chat", "copilot", "yordamchi", "чат", "ассистент", "assistant", "help"],
        },
        reconcile: {
          name: "Bank ↔ 1C AI Reconcile",
          description: "AI matching for bank statements and 1C files",
          keywords: ["bank", "1c", "sverka", "reconcile", "сверка", "банк", "statement", "export"],
        },
        scanner: {
          name: "Invoice / Receipt Scanner",
          description: "OCR extraction and journal entries from receipts",
          keywords: ["scan", "scanner", "faktura", "chek", "skaner", "сканер", "чек", "фактура", "ocr", "receipt", "invoice"],
        },
        calculator: {
          name: "Calculator",
          description: "Payroll (PIT 12%), VAT, turnover tax & vacation calculators",
          keywords: ["calc", "calculator", "kalkulyator", "калькулятор", "salary", "vat", "tax", "payroll", "maosh", "qqs", "ндс"],
        },
        contract: {
          name: "Contract Analysis",
          description: "Review legal and tax risks in contract text",
          keywords: ["contract", "shartnoma", "tahlil", "договор", "анализ", "контракт", "legal", "risk"],
        },
        history: {
          name: "Saved History",
          description: "Archive of saved scans, reconciliations & AI chats",
          keywords: ["history", "tarix", "arxiv", "история", "архив", "saved", "archive"],
        },
        billing: {
          name: "Subscriptions",
          description: "Plans, usage quotas and payment methods",
          keywords: ["billing", "obuna", "tarif", "pro", "подписка", "тарифы", "subscription", "plans", "pricing"],
        },
        settings: {
          name: "Settings",
          description: "Profile, security and language preferences",
          keywords: ["settings", "sozlamalar", "настройки", "language", "til", "язык", "security"],
        },
      },
      erpItems: {
        dashboard: {
          name: "Dashboard",
          description: "Key automation metrics and cash flow",
          keywords: ["dashboard", "boshqaruv", "главная", "панель", "home"],
        },
        reconcile: {
          name: "Bank ↔ 1C AI Reconcile",
          description: "Match bank statements with 1C records",
          keywords: ["bank", "1c", "sverka", "reconcile", "сверка"],
        },
        assistant: {
          name: "AI Copilot & Scanner",
          description: "AI chat, receipt scanner, calculator & contract review",
          keywords: ["assistant", "ai", "skaner", "ассистент", "сканер"],
        },
        aiAuditor: {
          name: "AI Auditor & Exceptions",
          description: "Anomaly detection and exception review",
          keywords: ["auditor", "exceptions", "istisnolar", "аудитор", "исключения"],
        },
        transactions: {
          name: "Transactions",
          description: "Bank and cash ledger operations",
          keywords: ["transactions", "tranzaksiyalar", "транзакции", "payments"],
        },
        accounting: {
          name: "Chart of Accounts & Ledger",
          description: "General ledger, journal entries and COA",
          keywords: ["accounting", "ledger", "hisoblar", "бухгалтерия", "проводки", "coa"],
        },
        tax: {
          name: "Taxes & Calendar",
          description: "Tax filings and upcoming deadlines",
          keywords: ["tax", "soliq", "налоги", "календарь", "vat"],
        },
        finance: {
          name: "Finance & P&L",
          description: "Profit & loss statement, balance sheet & cash flow",
          keywords: ["finance", "moliya", "p&l", "финансы", "опу", "balance"],
        },
        billing: {
          name: "Subscriptions",
          description: "Plans, quotas and billing",
          keywords: ["billing", "obuna", "tarif", "подписка", "тарифы", "subscription"],
        },
        settings: {
          name: "System Settings",
          description: "Entities, security and interface language",
          keywords: ["settings", "sozlamalar", "настройки", "entities"],
        },
      },
    },
    notifications: {
      today: "Today",
      duePrefix: "Due",
      viewInAuditor: "View in AI Auditor",
      goToTax: "Go to Taxes",
      markAllReadToast: "All notifications marked as read",
      clearAllToast: "Notifications cleared",
    },
    workspaceSwitcher: {
      dialogTitle: "Create Workspace",
      subtitle: "Create a workspace for an accounting firm or an individual company",
      nameLabel: "Workspace Name *",
      namePlaceholder: "e.g. Trust Balance Audit",
      typeLabel: "Workspace Type *",
      types: {
        accounting_firm: "Accounting Firm (Multi-company)",
        individual_company: "Individual Company",
      },
      submitBtn: "Create",
      submittingBtn: "Creating...",
      cancelBtn: "Cancel",
      nameMinLengthError: "Workspace name must be at least 2 characters",
      createdToast: (name) => `Workspace "${name}" created!`,
      createErrorToast: (msg) => `Error creating workspace: ${msg}`,
      switchedToast: (name) => `Workspace: ${name}`,
    },
    entitySwitcher: {
      noEntitySelected: "No entity selected",
      switchedToast: (name) => `Selected entity: ${name}`,
      taxRegimes: {
        vat_profit_tax: "VAT + Profit",
        turnover_tax: "Turnover 4%",
        fixed_tax: "Fixed Tax",
      },
    },
    aiDrawer: {
      tooltips: {
        newChat: "New chat",
        chatHistory: "Chat history",
      },
      inputPlaceholder: "Write a message...",
      personalLabel: "Personal",
      defaultDocName: "document",
      imageSentLabel: (fileName) => `📷 Image sent: ${fileName}`,
      entryPrepared: "Journal entry prepared.",
      noReplyError: "AI Copilot did not return a response",
      copilotErrorToast: (msg) => `AI Copilot error: ${msg}`,
      errorMessage: (msg) => `An error occurred: ${msg}`,
      selectEntityFirstError: "Select an entity first to post to the General Ledger",
      scanPostedToast: "Invoice/receipt entry atomically posted to the General Ledger!",
      scanPostErrorToast: (msg) => `Error posting to General Ledger: ${msg}`,
      executeActionError: "Error executing action",
      actionApprovedToast: "Action approved and saved to database!",
      actionRejectedToast: "Action rejected and updated in database.",
      executeErrorToast: (msg) => `Error executing action: ${msg}`,
      sentReceiptAlt: "Uploaded receipt",
      statusApproved: "Approved",
      statusRejected: "Rejected",
      dtPrefix: "Dr",
      ktPrefix: "Cr",
      confirmActionPrompt: "Confirm this action?",
    },
    shared: {
      cookieConsent: {
        message: "FIRMUS uses strictly necessary technical cookies to maintain your secure authentication session and preferences.",
        privacyLink: "Privacy Policy",
        acceptBtn: "Got it",
      },
      firstLoginNotice: {
        title: "Please note",
        bodyBeforeTerms:
          "FIRMUS AI is an assistive tool and may make mistakes in some responses or calculations. Always verify final journal entries and tax filings before approval. Uploaded data is protected under our",
        termsLink: "Terms of Service",
        bodyBetweenLinks: "and",
        privacyLink: "Privacy Policy",
        bodyAfterPrivacy: "(card numbers and PINFL data are masked automatically).",
        acceptBtn: "OK",
      },
      quickEntityBanner: {
        bannerTitle: "No entity connected",
        bannerDesc: "Add your company entity to save records",
        addBtn: "Add Entity",
        modalTitle: "Add Entity",
        modalDesc: "Company legal name and TIN",
        nameLabel: "Company Name",
        namePlaceholder: "e.g. Baraka Savdo LLC",
        tinLabel: "Company TIN",
        tinPlaceholder: "9-digit TIN",
        taxRegimeLabel: "Tax Regime",
        taxRegimes: {
          vat_profit_tax: "VAT (12%) + Profit",
          turnover_tax: "Turnover Tax (4%)",
        },
        defaultAccountantName: "Chief Accountant",
        createdToast: "Entity created!",
        createErrorToast: (msg) => `Failed to add entity: ${msg}`,
        unknownError: "Unknown error",
        validation: {
          legalName: "Enter a legal company name of at least 3 characters",
          tinStir: "TIN must be exactly 9 digits",
          generic: "Invalid input data",
        },
      },
      paginationBar: {
        defaultItemLabel: "records",
        totalPrefix: "Total:",
        totalUnit: "",
        pageLabel: "Page",
        previous: "Previous",
        next: "Next",
      },
      aiModelSelector: {
        proLockToast: (modelLabel) =>
          `${modelLabel} is available on Pro and Pro+ plans. You can activate a 7-day free trial in Subscriptions.`,
        switchErrorToast: "Could not switch AI model",
        descriptions: {
          "gemini-3.8-flash": "Fast & cost-effective model (daily Q&A and receipt scanning)",
          "gemini-4-hydrogen": "Deep tax, NAS 21 & contract analysis",
        },
      },
      chatImageInputBar: {
        placeholder: "Write a message...",
        attachTooltip: "Attach image (PNG, JPG, WEBP)",
        attachAriaLabel: "Attach image",
        attachedImageAlt: "Attached image",
        removeImageLabel: "Remove image",
        stopLabel: "Stop",
        sendLabel: "Send",
        invalidFormatError: "Invalid image format. Please upload PNG, JPG, or WEBP only.",
        maxSizeError: "Image size must not exceed 25 MB",
        readError: "Failed to read image",
        corruptError: "Image file is corrupted or unreadable",
        compressError: "Failed to compress image",
      },
      chatScanCard: {
        duplicateBadge: "Similar receipt found in history",
        postedBadge: "Posted to Ledger",
        totalAmountLabel: (currency) => `Total amount (${currency})`,
        debitAccountLabel: "Debit Account",
        creditAccountLabel: "Credit Account",
        vatLabel: "VAT (12%)",
        netLabel: "Net amount",
        copyBtn: "Copy journal entry",
        copiedBtn: "Copied",
        copiedToast: "Result copied",
        copyErrorToast: "Failed to copy",
        postToLedgerBtn: "Confirm & Post to Ledger",
        copyCounterparty: "Counterparty",
        copyAmount: "Amount",
        copyVat: "VAT 12%",
        copyEntry: "Entry",
        debitAccounts: {
          "6010": "6010 Suppliers & Vendors",
          "9420": "9420 Administrative Expenses",
          "9410": "9410 Selling Expenses",
          "2910": "2910 Merchandise / Goods",
          "1010": "1010 Materials",
          "4010": "4010 Accounts Receivable",
          "5110": "5110 Bank Account",
        },
        creditAccounts: {
          "5110": "5110 Bank Account",
          "5010": "5010 Cash",
          "6010": "6010 Suppliers & Vendors",
          "9030": "9030 Service Revenue",
          "9020": "9020 Goods Revenue",
          "9010": "9010 Product Revenue",
        },
      },
      aiChatVisuals: {
        heroGreeting: "Welcome. How can I help you?",
        heroSubtitle: "Ask about Uzbekistan taxes, NAS 21, journal entries, and documents",
        quickPrompts: [
          "Write the journal entry for an incoming invoice with 12% VAT",
          "When and how is the 4% turnover tax filed?",
          "Show an example of fixed asset depreciation calculation",
        ],
        thinkingLabel: "AI is thinking...",
        regenerateTitle: "Regenerate response",
        regenerateBtn: "Retry",
        copyTitle: "Copy",
        copyBtn: "Copy",
        copiedBtn: "Copied",
        copyToast: "Text copied",
        copyErrorToast: "Failed to copy",
      },
      aiThreadHistoryPanel: {
        title: "Chat History",
        newChatBtn: "New chat",
        searchPlaceholder: "Search chats...",
        empty: "No chat history yet",
        renameLabel: "Rename",
        deleteLabel: "Delete",
        deleteConfirm: "Delete this conversation?",
        loadErrorToast: (msg) => `Failed to load conversation: ${msg}`,
        renameErrorToast: (msg) => `Failed to rename conversation: ${msg}`,
        deleteErrorToast: (msg) => `Failed to delete conversation: ${msg}`,
      },
      emptyState: {
        defaultTitle: "No data found",
        defaultDescription: "There are no records to display yet.",
        defaultAction: "Refresh",
      },
      kpiCard: {
        defaultTitle: "Metric",
        noData: "—",
      },
      money: {
        thousand: "K",
        million: "M",
        billion: "B",
      },
      statusPill: {
        failed: "Failed",
        readOnly: "Read-only",
        inactive: "Inactive",
        trialing: "Trialing",
        cancelled: "Cancelled",
        expired: "Expired",
        open: "Open",
        inReview: "In Review",
        resolved: "Resolved",
      },
    },
  },
};

export function getShellSharedDict(locale: Locale): ShellSharedDict {
  return shellSharedDict[locale] ?? shellSharedDict.uz;
}
