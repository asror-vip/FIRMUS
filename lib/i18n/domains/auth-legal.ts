import type { Locale } from "../types";

export interface AuthLegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface AuthLegalDict {
  login: {
    title: string;
    subtitle: string;
    googleBtn: string;
    orEmail: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    forgotLink: string;
    submitBtn: string;
    loadingBtn: string;
    noAccount: string;
    registerLink: string;
    privacyLink: string;
    termsLink: string;
    suspenseLoading: string;
    oauthFailedToast: string;
    missingFieldsToast: string;
    loginSuccessToast: string;
    invalidCredentialsToast: string;
    googleErrorToast: string;
  };
  register: {
    title: string;
    subtitle: string;
    googleBtn: string;
    orEmail: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    companyAliasLabel: string;
    companyAliasPlaceholder: string;
    optionalHint: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordHint: string;
    submitBtn: string;
    loadingBtn: string;
    hasAccount: string;
    loginLink: string;
    agreePrefix: string;
    privacyLink: string;
    andWord: string;
    termsLink: string;
    agreeSuffix: string;
    defaultAccountantName: string;
    missingFieldsToast: string;
    passwordMinToast: string;
    registerSuccessToast: string;
    checkEmailToast: string;
    registerErrorToast: string;
    googleErrorToast: string;
  };
  forgotPassword: {
    title: string;
    subtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    submitBtn: string;
    sendingBtn: string;
    sentTitle: string;
    sentSuccess: string;
    backToLogin: string;
    missingEmailToast: string;
    sentToast: string;
    resetErrorToast: string;
  };
  onboarding: {
    loadingRedirect: string;
    badge: string;
    title: string;
    subtitle: string;
    workspaceTypeLabel: string;
    step1Desc: string;
    types: {
      accounting_firm: {
        title: string;
        desc: string;
      };
      individual_company: {
        title: string;
        desc: string;
      };
    };
    step2Title: string;
    step2Desc: string;
    workspaceNameLabel: string;
    workspaceNamePlaceholder: string;
    step3Title: string;
    step3Desc: string;
    tinLabel: string;
    tinPlaceholder: string;
    entityNameLabel: string;
    entityNamePlaceholder: string;
    taxRegimeLabel: string;
    taxRegimes: {
      vat_profit_tax: string;
      turnover_tax: string;
      fixed_tax: string;
    };
    step4Title: string;
    step4Desc: string;
    backBtn: string;
    nextBtn: string;
    submitBtn: string;
    savingBtn: string;
    defaultAccountantName: string;
    workspaceMinToast: string;
    entityNameMinToast: string;
    tinFormatToast: string;
    validationFallbackToast: string;
    loginRequiredToast: string;
    saveSuccessToast: string;
    saveErrorPrefix: string;
    unknownError: string;
  };
  privacy: {
    backToApp: string;
    backToLogin: string;
    badge: string;
    title: string;
    lastUpdated: string;
    sections: AuthLegalSection[];
  };
  terms: {
    backToApp: string;
    backToLogin: string;
    badge: string;
    title: string;
    subtitle: string;
    sections: AuthLegalSection[];
  };
}

export const authLegalDict: Record<Locale, AuthLegalDict> = {
  uz: {
    login: {
      title: "FIRMUS",
      subtitle: "Hisobingizga kiring",
      googleBtn: "Google orqali kirish",
      orEmail: "yoki email",
      emailLabel: "Elektron pochta",
      emailPlaceholder: "ism@kompaniya.uz",
      passwordLabel: "Parol",
      forgotLink: "Unutdingizmi?",
      submitBtn: "Kirish",
      loadingBtn: "Kirilmoqda...",
      noAccount: "Hisobingiz yoʻqmi?",
      registerLink: "Roʻyxatdan oʻtish",
      privacyLink: "Maxfiylik",
      termsLink: "Shartlar",
      suspenseLoading: "Yuklanmoqda...",
      oauthFailedToast: "Google orqali kirishda xatolik yuz berdi. Qayta urinib koʻring.",
      missingFieldsToast: "Elektron pochta va parolni kiriting",
      loginSuccessToast: "Tizimga kirdingiz",
      invalidCredentialsToast: "Email yoki parol notoʻgʻri.",
      googleErrorToast: "Google tizimiga ulanishda xatolik",
    },
    register: {
      title: "Roʻyxatdan oʻtish",
      subtitle: "Google yoki email orqali",
      googleBtn: "Google orqali roʻyxatdan oʻtish",
      orEmail: "yoki elektron pochta bilan",
      fullNameLabel: "Ismingiz:",
      fullNamePlaceholder: "Ism familiya",
      companyAliasLabel: "Kompaniya / Taxallus:",
      companyAliasPlaceholder: "Kompaniya nomi",
      optionalHint: "ixtiyoriy",
      emailLabel: "Elektron pochta manzili:",
      emailPlaceholder: "ism@kompaniya.uz",
      passwordLabel: "Parol oʻylab toping:",
      passwordHint: "Kamida 8 ta belgi",
      submitBtn: "Roʻyxatdan oʻtish",
      loadingBtn: "Yaratilmoqda...",
      hasAccount: "Profilingiz bormi?",
      loginLink: "Tizimga kirish",
      agreePrefix: "Roʻyxatdan oʻtish orqali",
      privacyLink: "Maxfiylik siyosati",
      andWord: "va",
      termsLink: "Ommaviy oferta",
      agreeSuffix: "shartlariga rozilik bildirasiz.",
      defaultAccountantName: "Bosh buxgalter",
      missingFieldsToast: "Iltimos, elektron pochta va parolni kiriting",
      passwordMinToast: "Parol kamida 8 ta belgidan iborat boʻlishi kerak",
      registerSuccessToast: "Hisob yaratildi! Xush kelibsiz.",
      checkEmailToast:
        "Tasdiqlash xati elektron pochtangizga yuborildi. Iltimos, pochtangizni tekshiring.",
      registerErrorToast: "Roʻyxatdan oʻtishda xatolik yuz berdi",
      googleErrorToast: "Google orqali roʻyxatdan oʻtishda xatolik yuz berdi",
    },
    forgotPassword: {
      title: "Parolni Qayta Tiklash",
      subtitle: "Roʻyxatdan oʻtgan elektron pochta manzilingizni kiriting",
      emailLabel: "Elektron pochta:",
      emailPlaceholder: "buxgalter@kompaniya.uz",
      submitBtn: "Tiklash havolasini yuborish",
      sendingBtn: "Yuborilmoqda...",
      sentTitle: "Havola yuborildi!",
      sentSuccess:
        "Iltimos, pochtangizni ({email}) tekshiring va koʻrsatilgan havola orqali yangi parol oʻrnating.",
      backToLogin: "Kirish sahifasiga qaytish",
      missingEmailToast: "Iltimos, elektron pochtangizni kiriting",
      sentToast: "Parolni tiklash havolasi emailingizga yuborildi!",
      resetErrorToast: "Parolni tiklash soʻrovida xatolik yuz berdi",
    },
    onboarding: {
      loadingRedirect: "Asboblar paneliga yoʻnaltirilmoqda...",
      badge: "Tezkor sozlash",
      title: "FIRMUS ga xush kelibsiz!",
      subtitle: "{step}-bosqich / 4: Korxonani 1 daqiqada sozlash",
      workspaceTypeLabel: "1. Faoliyat turini tanlang",
      step1Desc: "Siz bitta kompaniyani boshqarasizmi yoki buxgalteriya firmasimisiz?",
      types: {
        accounting_firm: {
          title: "Buxgalteriya Firmasi (BPO)",
          desc: "Bir nechta mijoz korxonalarini bitta oynadan yuritish.",
        },
        individual_company: {
          title: "Yagona Korxona (Kompaniya)",
          desc: "Korxona bank koʻchirmalari va soliq hisobini yuritish.",
        },
      },
      step2Title: "2. Ishchi maydon yaratish",
      step2Desc: "Korxonalaringiz jamlanadigan ishchi maydon nomi.",
      workspaceNameLabel: "Ishchi maydon (Workspace) nomi:",
      workspaceNamePlaceholder: "Ishchi maydon nomi",
      step3Title: "3. Korxonani qoʻshish",
      step3Desc: "Soliq toʻlovchi identifikatsion raqami (STIR) va soliq rejimi.",
      tinLabel: "STIR (9 ta raqam) *:",
      tinPlaceholder: "300123456",
      entityNameLabel: "Yuridik nomi:",
      entityNamePlaceholder: "Korxona yuridik nomi",
      taxRegimeLabel: "Soliq rejimi:",
      taxRegimes: {
        vat_profit_tax: "Umumbelgilangan (QQS 12% + Foyda soligʻi)",
        turnover_tax: "Aylanmadan olinadigan soliq (4%)",
        fixed_tax: "Qatʼiy belgilangan soliq (YaTT)",
      },
      step4Title: "Barchasi tayyor!",
      step4Desc:
        "FIRMUS AI buxgalteriya tizimi «{workspaceName}» maydoni va «{entityName}» korxonasi uchun ishga tushirishga tayyor.",
      backBtn: "Orqaga",
      nextBtn: "Keyingisi",
      submitBtn: "Saqlash va Dashboardga oʻtish",
      savingBtn: "Saqlanmoqda...",
      defaultAccountantName: "Bosh buxgalter",
      workspaceMinToast: "Ishchi maydon (Workspace) nomini kamida 3 ta belgi bilan kiriting",
      entityNameMinToast: "Korxona yuridik nomini kiriting (kamida 3 ta belgi)",
      tinFormatToast: "STIR (INN) aniq 9 ta raqamdan iborat boʻlishi shart",
      validationFallbackToast: "Maʼlumotlar notoʻgʻri kiritilgan",
      loginRequiredToast: "Saqlash uchun avval tizimga kiring.",
      saveSuccessToast: "Ishchi maydon va korxona yaratildi!",
      saveErrorPrefix: "Sozlashni saqlashda xatolik: ",
      unknownError: "Nomaʼlum xatolik",
    },
    privacy: {
      backToApp: "Ilovaga qaytish",
      backToLogin: "Tizimga qaytish",
      badge: "Zero-PII Standarti",
      title: "Maxfiylik siyosati (Zero-PII Standarti)",
      lastUpdated: "Oxirgi yangilanish: 2026-yil 16-noyabr • OʻRQ-547 talablariga muvofiq",
      sections: [
        {
          heading: "1. «Zero-PII» asosiy tamoyil",
          paragraphs: [
            "FIRMUS platformasi Oʻzbekiston Respublikasining «Shaxsga doir maʼlumotlar toʻgʻrisida»gi OʻRQ-547 qonuni talablariga hurmat bilan yondashadi va fuqarolarning shaxsiy maʼlumotlarini (JShShIR/PINFL, pasport maʼlumotlari, shaxsiy telefon raqamlari) talab qilmaydi hamda yigʻmaydi.",
          ],
        },
        {
          heading: "2. Qayta ishlanadigan korporativ maʼlumotlar",
          bullets: [
            "Kirish sessiyasi: Google OAuth yoki elektron pochta orqali autentifikatsiya sessiyasi.",
            "Yuridik shaxs rekvizitlari: korxona nomi, STIR (INN) va soliq rejimi.",
            "Bank ↔ 1C Solishtirish (Sverka): yuklangan `.txt` / `.xml` / `.csv` fayllar foydalanuvchi brauzeri xotirasida oʻqiladi va server bazasida saqlanmaydi.",
            "21-BHMS Bosh kitob provodkalari: faqat korporativ schyotlar (`4010`, `5110`, `6010`, `6410`, `9010`, `9420`) kesimida yuritiladi.",
          ],
        },
        {
          heading: "3. AI Agent va avtomatik maskalash",
          paragraphs: [
            "Tashqi AI modellariga (Gemini API) tahlil uchun soʻrov yuborishdan avval 16 xonali plastik karta raqamlari, 20 xonali bank hisobvaraqlari, JShShIR, telefon va STIR belgilari avtomatik tarzda shaxssizlantiriladi (`[KARTA_MASKED]`, `[PINFL_MASKED]`, `[TELEFON_MASKED]`).",
          ],
        },
        {
          heading: "4. Multi-Tenant izolyatsiya va Cookie fayllar",
          paragraphs: [
            "Har bir korxona maʼlumotlari PostgreSQL Row-Level Security (RLS) darajasida qatʼiy ajratilgan. Tizim faqat kirish sessiyasi va interfeys sozlamalari (til va mavzu) uchun texnik cookieʼlardan foydalanadi.",
          ],
        },
      ],
    },
    terms: {
      backToApp: "Ilovaga qaytish",
      backToLogin: "Tizimga qaytish",
      badge: "21-BHMS",
      title: "Foydalanish shartlari (Ommaviy oferta)",
      subtitle: "FIRMUS AI Buxgalteriya Platformasi • Oʻzbekiston 21-son BHMS asosida",
      sections: [
        {
          heading: "1. Xizmat mazmuni",
          paragraphs: [
            "FIRMUS foydalanuvchilarga bank koʻchirmalari va 1C fayllarini AI yordamida solishtirish (sverka), 21-son BHMS boʻyicha ikkiyoqlama provodkalar yuritish, oborot-saldovaya vedomost va soliq koʻrsatkichlarini tezkor hisoblash uchun dasturiy vosita taqdim etadi.",
          ],
        },
        {
          heading: "2. Buxgalteriya va xavfsizlik qoidalari",
          bullets: [
            "Foydalanuvchi tizimga yuklayotgan birlamchi bank va 1C fayllarining aniqligiga oʻzi masʼuldir.",
            "Tasdiqlangan buxgalteriya provodkalari oʻchirilmaydi; tuzatishlar faqat Storno (Reversal) mexanizmi orqali kiritiladi.",
            "AI Agent taklif qilgan barcha moliyaviy yozuvlar faqat foydalanuvchi tasdigʻidan soʻng bazaga yoziladi (Human-in-the-Loop).",
          ],
        },
        {
          heading: "3. Javobgarlik chegarasi",
          paragraphs: [
            "AI Sverka va AI Auditor tavsiyalari yordamchi tahliliy vosita boʻlib, yakuniy buxgalteriya va soliq hisobotlarini tasdiqlash vakolatli buxgalter yoki korxona rahbari zimmasida qoladi.",
          ],
        },
      ],
    },
  },
  ru: {
    login: {
      title: "FIRMUS",
      subtitle: "Вход в систему",
      googleBtn: "Войти через Google",
      orEmail: "или по email",
      emailLabel: "Электронная почта",
      emailPlaceholder: "name@company.uz",
      passwordLabel: "Пароль",
      forgotLink: "Забыли пароль?",
      submitBtn: "Войти",
      loadingBtn: "Вход...",
      noAccount: "Нет аккаунта?",
      registerLink: "Зарегистрироваться",
      privacyLink: "Конфиденциальность",
      termsLink: "Условия",
      suspenseLoading: "Загрузка...",
      oauthFailedToast: "Ошибка входа через Google. Попробуйте еще раз.",
      missingFieldsToast: "Введите электронную почту и пароль",
      loginSuccessToast: "Вы успешно вошли в систему",
      invalidCredentialsToast: "Неверный email или пароль.",
      googleErrorToast: "Ошибка подключения к Google",
    },
    register: {
      title: "Регистрация",
      subtitle: "Через Google или по email",
      googleBtn: "Регистрация через Google",
      orEmail: "или по электронной почте",
      fullNameLabel: "Ваше имя:",
      fullNamePlaceholder: "Имя и фамилия",
      companyAliasLabel: "Компания / Псевдоним:",
      companyAliasPlaceholder: "Название компании",
      optionalHint: "необязательно",
      emailLabel: "Электронная почта:",
      emailPlaceholder: "name@company.uz",
      passwordLabel: "Придумайте пароль:",
      passwordHint: "Минимум 8 символов",
      submitBtn: "Зарегистрироваться",
      loadingBtn: "Создание...",
      hasAccount: "Уже есть аккаунт?",
      loginLink: "Войти в систему",
      agreePrefix: "Регистрируясь, вы принимаете условия",
      privacyLink: "Политики конфиденциальности",
      andWord: "и",
      termsLink: "Публичной оферты",
      agreeSuffix: ".",
      defaultAccountantName: "Главный бухгалтер",
      missingFieldsToast: "Пожалуйста, введите электронную почту и пароль",
      passwordMinToast: "Пароль должен содержать не менее 8 символов",
      registerSuccessToast: "Аккаунт создан! Добро пожаловать.",
      checkEmailToast:
        "Письмо для подтверждения отправлено на вашу почту. Пожалуйста, проверьте входящие.",
      registerErrorToast: "Ошибка при регистрации",
      googleErrorToast: "Ошибка при регистрации через Google",
    },
    forgotPassword: {
      title: "Восстановление пароля",
      subtitle: "Введите электронную почту, указанную при регистрации",
      emailLabel: "Электронная почта:",
      emailPlaceholder: "accountant@company.uz",
      submitBtn: "Отправить ссылку для сброса",
      sendingBtn: "Отправка...",
      sentTitle: "Ссылка отправлена!",
      sentSuccess:
        "Пожалуйста, проверьте вашу почту ({email}) и установите новый пароль по ссылке из письма.",
      backToLogin: "Вернуться ко входу",
      missingEmailToast: "Пожалуйста, введите адрес электронной почты",
      sentToast: "Ссылка для сброса пароля отправлена на вашу почту!",
      resetErrorToast: "Ошибка при запросе сброса пароля",
    },
    onboarding: {
      loadingRedirect: "Перенаправление в панель управления...",
      badge: "Быстрая настройка",
      title: "Добро пожаловать в FIRMUS!",
      subtitle: "Шаг {step} из 4: Настройка компании за 1 минуту",
      workspaceTypeLabel: "1. Выберите тип деятельности",
      step1Desc: "Вы ведете учет одной компании или являетесь бухгалтерской фирмой?",
      types: {
        accounting_firm: {
          title: "Бухгалтерская фирма (BPO)",
          desc: "Ведение нескольких клиентских компаний в едином рабочем окне.",
        },
        individual_company: {
          title: "Отдельная компания",
          desc: "Ведение банковских выписок и налогового учета одного предприятия.",
        },
      },
      step2Title: "2. Создание рабочего пространства",
      step2Desc: "Название рабочего пространства, в котором будут объединены ваши компании.",
      workspaceNameLabel: "Название рабочего пространства (Workspace):",
      workspaceNamePlaceholder: "Название рабочего пространства",
      step3Title: "3. Добавление компании",
      step3Desc: "Идентификационный номер налогоплательщика (ИНН) и налоговый режим.",
      tinLabel: "ИНН (9 цифр) *:",
      tinPlaceholder: "300123456",
      entityNameLabel: "Юридическое название:",
      entityNamePlaceholder: "Юридическое название организации",
      taxRegimeLabel: "Налоговый режим:",
      taxRegimes: {
        vat_profit_tax: "Общеустановленный (НДС 12% + Налог на прибыль)",
        turnover_tax: "Налог с оборота (4%)",
        fixed_tax: "Фиксированный налог (ИП)",
      },
      step4Title: "Всё готово!",
      step4Desc:
        "AI-бухгалтерия FIRMUS готова к запуску для пространства «{workspaceName}» и компании «{entityName}».",
      backBtn: "Назад",
      nextBtn: "Далее",
      submitBtn: "Сохранить и перейти в панель",
      savingBtn: "Сохранение...",
      defaultAccountantName: "Главный бухгалтер",
      workspaceMinToast: "Введите название рабочего пространства (минимум 3 символа)",
      entityNameMinToast: "Введите юридическое название компании (минимум 3 символа)",
      tinFormatToast: "ИНН должен состоять ровно из 9 цифр",
      validationFallbackToast: "Введены некорректные данные",
      loginRequiredToast: "Для сохранения сначала войдите в систему.",
      saveSuccessToast: "Рабочее пространство и компания созданы!",
      saveErrorPrefix: "Ошибка сохранения настроек: ",
      unknownError: "Неизвестная ошибка",
    },
    privacy: {
      backToApp: "Вернуться в приложение",
      backToLogin: "Вернуться ко входу",
      badge: "Стандарт Zero-PII",
      title: "Политика конфиденциальности (Стандарт Zero-PII)",
      lastUpdated: "Последнее обновление: 16 ноября 2026 г. • В соответствии с ЗРУ-547",
      sections: [
        {
          heading: "1. Базовый принцип «Zero-PII»",
          paragraphs: [
            "Платформа FIRMUS строго соблюдает требования Закона Республики Узбекистан «О персональных данных» № ЗРУ-547 и не запрашивает, не обрабатывает и не собирает персональные данные физических лиц (ПИНФЛ, паспортные данные, личные номера телефонов).",
          ],
        },
        {
          heading: "2. Обрабатываемые корпоративные данные",
          bullets: [
            "Сессия входа: аутентификационная сессия через Google OAuth или электронную почту.",
            "Реквизиты юридического лица: наименование организации, ИНН и применяемый налоговый режим.",
            "Сверка Банк ↔ 1C: загруженные файлы `.txt` / `.xml` / `.csv` считываются в памяти браузера пользователя и не сохраняются в базе данных сервера.",
            "Проводки Главной книги по НСБУ №21: ведутся исключительно в разрезе корпоративных счетов (`4010`, `5110`, `6010`, `6410`, `9010`, `9420`).",
          ],
        },
        {
          heading: "3. AI Агент и автоматическое маскирование",
          paragraphs: [
            "Перед отправкой запросов на анализ во внешние AI-модели (Gemini API) 16-значные номера пластиковых карт, 20-значные банковские счета, ПИНФЛ, телефоны и ИНН автоматически обезличиваются (`[KARTA_MASKED]`, `[PINFL_MASKED]`, `[TELEFON_MASKED]`).",
          ],
        },
        {
          heading: "4. Multi-Tenant изоляция и файлы Cookie",
          paragraphs: [
            "Данные каждого предприятия строго изолированы на уровне PostgreSQL Row-Level Security (RLS). Система использует технические cookie только для поддержания сессии входа и пользовательских настроек интерфейса (язык и тема оформления).",
          ],
        },
      ],
    },
    terms: {
      backToApp: "Вернуться в приложение",
      backToLogin: "Вернуться ко входу",
      badge: "НСБУ №21",
      title: "Условия использования (Публичная оферта)",
      subtitle: "AI-платформа бухгалтерии FIRMUS • На основе НСБУ №21 Республики Узбекистан",
      sections: [
        {
          heading: "1. Предмет и содержание сервиса",
          paragraphs: [
            "FIRMUS предоставляет пользователям программные инструменты для AI-сверки банковских выписок и файлов 1C, ведения двойных бухгалтерских проводок в соответствии с НСБУ №21, формирования оборотно-сальдовой ведомости и оперативного расчета налоговых показателей.",
          ],
        },
        {
          heading: "2. Правила бухгалтерского учета и безопасности",
          bullets: [
            "Пользователь несет полную ответственность за достоверность и полноту загружаемых первичных банковских выписок и файлов 1C.",
            "Утвержденные бухгалтерские проводки не удаляются; исправления вносятся исключительно через механизм Сторно (Reversal).",
            "Все финансовые записи, предложенные AI Агентом, сохраняются в базу только после явного подтверждения пользователем (Human-in-the-Loop).",
          ],
        },
        {
          heading: "3. Ограничение ответственности",
          paragraphs: [
            "Рекомендации AI Сверки и AI Аудитора являются вспомогательным аналитическим инструментом; окончательное утверждение бухгалтерской и налоговой отчетности остается за уполномоченным бухгалтером или руководителем предприятия.",
          ],
        },
      ],
    },
  },
  en: {
    login: {
      title: "FIRMUS",
      subtitle: "Sign in to your account",
      googleBtn: "Continue with Google",
      orEmail: "or with email",
      emailLabel: "Email address",
      emailPlaceholder: "name@company.uz",
      passwordLabel: "Password",
      forgotLink: "Forgot password?",
      submitBtn: "Sign in",
      loadingBtn: "Signing in...",
      noAccount: "Don't have an account?",
      registerLink: "Sign up",
      privacyLink: "Privacy",
      termsLink: "Terms",
      suspenseLoading: "Loading...",
      oauthFailedToast: "Google sign-in failed. Please try again.",
      missingFieldsToast: "Please enter your email and password",
      loginSuccessToast: "Signed in successfully",
      invalidCredentialsToast: "Invalid email or password.",
      googleErrorToast: "Error connecting to Google",
    },
    register: {
      title: "Create Account",
      subtitle: "Continue with Google or email",
      googleBtn: "Sign up with Google",
      orEmail: "or with email address",
      fullNameLabel: "Your name:",
      fullNamePlaceholder: "Full name",
      companyAliasLabel: "Company / Alias:",
      companyAliasPlaceholder: "Company name",
      optionalHint: "optional",
      emailLabel: "Email address:",
      emailPlaceholder: "name@company.uz",
      passwordLabel: "Create a password:",
      passwordHint: "At least 8 characters",
      submitBtn: "Sign up",
      loadingBtn: "Creating account...",
      hasAccount: "Already have an account?",
      loginLink: "Sign in",
      agreePrefix: "By signing up, you agree to our",
      privacyLink: "Privacy Policy",
      andWord: "and",
      termsLink: "Terms of Service",
      agreeSuffix: ".",
      defaultAccountantName: "Chief Accountant",
      missingFieldsToast: "Please enter your email and password",
      passwordMinToast: "Password must be at least 8 characters long",
      registerSuccessToast: "Account created! Welcome to FIRMUS.",
      checkEmailToast:
        "Confirmation email sent. Please check your inbox to verify your account.",
      registerErrorToast: "Registration failed",
      googleErrorToast: "Google sign-up failed",
    },
    forgotPassword: {
      title: "Reset Password",
      subtitle: "Enter the email address associated with your account",
      emailLabel: "Email address:",
      emailPlaceholder: "accountant@company.uz",
      submitBtn: "Send reset link",
      sendingBtn: "Sending...",
      sentTitle: "Reset link sent!",
      sentSuccess:
        "Please check your inbox ({email}) and follow the link to set a new password.",
      backToLogin: "Back to sign in",
      missingEmailToast: "Please enter your email address",
      sentToast: "Password reset link has been sent to your email!",
      resetErrorToast: "Failed to send password reset request",
    },
    onboarding: {
      loadingRedirect: "Redirecting to dashboard...",
      badge: "Quick Setup",
      title: "Welcome to FIRMUS!",
      subtitle: "Step {step} of 4: Set up your company in 1 minute",
      workspaceTypeLabel: "1. Choose workspace type",
      step1Desc: "Do you manage a single company or operate an accounting firm?",
      types: {
        accounting_firm: {
          title: "Accounting Firm (BPO)",
          desc: "Manage multiple client companies from a single workspace.",
        },
        individual_company: {
          title: "Single Company",
          desc: "Manage bank statements and tax accounting for one business.",
        },
      },
      step2Title: "2. Create Workspace",
      step2Desc: "The name of the workspace where your business entities will live.",
      workspaceNameLabel: "Workspace name:",
      workspaceNamePlaceholder: "Workspace name",
      step3Title: "3. Add Business Entity",
      step3Desc: "Taxpayer Identification Number (TIN) and tax regime.",
      tinLabel: "TIN (9 digits) *:",
      tinPlaceholder: "300123456",
      entityNameLabel: "Legal name:",
      entityNamePlaceholder: "Company legal name",
      taxRegimeLabel: "Tax regime:",
      taxRegimes: {
        vat_profit_tax: "General Regime (VAT 12% + Corporate Profit Tax)",
        turnover_tax: "Turnover Tax (4%)",
        fixed_tax: "Fixed Tax (Sole Proprietor)",
      },
      step4Title: "All set!",
      step4Desc:
        "FIRMUS AI accounting is ready to launch for workspace \"{workspaceName}\" and entity \"{entityName}\".",
      backBtn: "Back",
      nextBtn: "Next",
      submitBtn: "Save & Go to Dashboard",
      savingBtn: "Saving...",
      defaultAccountantName: "Chief Accountant",
      workspaceMinToast: "Workspace name must be at least 3 characters",
      entityNameMinToast: "Please enter the company legal name (at least 3 characters)",
      tinFormatToast: "TIN must be exactly 9 digits",
      validationFallbackToast: "Invalid form input",
      loginRequiredToast: "Please sign in first to save your setup.",
      saveSuccessToast: "Workspace and company created!",
      saveErrorPrefix: "Failed to save setup: ",
      unknownError: "Unknown error",
    },
    privacy: {
      backToApp: "Back to app",
      backToLogin: "Back to sign in",
      badge: "Zero-PII Standard",
      title: "Privacy Policy (Zero-PII Standard)",
      lastUpdated: "Last updated: November 16, 2026 • Compliant with Law LRU-547",
      sections: [
        {
          heading: "1. Core «Zero-PII» Principle",
          paragraphs: [
            "The FIRMUS platform strictly complies with the Law of the Republic of Uzbekistan \"On Personal Data\" (LRU-547) and neither requests nor collects individuals' personally identifiable information (PINFL, passport details, or personal phone numbers).",
          ],
        },
        {
          heading: "2. Corporate Data Processed",
          bullets: [
            "Authentication session: login session established via Google OAuth or email.",
            "Legal entity details: company name, TIN (STIR), and applicable tax regime.",
            "Bank ↔ 1C Reconciliation: uploaded `.txt` / `.xml` / `.csv` files are parsed directly in browser memory and are not persisted in the server database.",
            "NAS 21 General Ledger entries: maintained strictly at the corporate chart-of-accounts level (`4010`, `5110`, `6010`, `6410`, `9010`, `9420`).",
          ],
        },
        {
          heading: "3. AI Agent & Automatic Masking",
          paragraphs: [
            "Before sending analysis requests to external AI models (Gemini API), 16-digit card numbers, 20-digit bank account numbers, PINFLs, phone numbers, and TIN identifiers are automatically redacted (`[KARTA_MASKED]`, `[PINFL_MASKED]`, `[TELEFON_MASKED]`).",
          ],
        },
        {
          heading: "4. Multi-Tenant Isolation & Cookies",
          paragraphs: [
            "Each company's data is strictly isolated at the PostgreSQL Row-Level Security (RLS) layer. The platform uses strictly necessary technical cookies solely for authentication sessions and UI preferences (language and theme).",
          ],
        },
      ],
    },
    terms: {
      backToApp: "Back to app",
      backToLogin: "Back to sign in",
      badge: "NAS 21",
      title: "Terms of Service (Public Offer)",
      subtitle: "FIRMUS AI Accounting Platform • Based on Uzbekistan NAS 21",
      sections: [
        {
          heading: "1. Scope of Service",
          paragraphs: [
            "FIRMUS provides users with software tools for AI-assisted reconciliation of bank statements and 1C files, double-entry bookkeeping under Uzbekistan National Accounting Standard No. 21 (NAS 21), trial balance generation, and rapid tax calculations.",
          ],
        },
        {
          heading: "2. Accounting & Security Rules",
          bullets: [
            "The user is solely responsible for the accuracy of primary bank statements and 1C files uploaded to the platform.",
            "Posted accounting journal entries cannot be deleted; adjustments are recorded exclusively via the Storno (Reversal) mechanism.",
            "All financial entries proposed by the AI Agent are committed to the ledger only after explicit user confirmation (Human-in-the-Loop).",
          ],
        },
        {
          heading: "3. Limitation of Liability",
          paragraphs: [
            "AI Reconciliation and AI Auditor recommendations serve as analytical assistance; final approval of financial and tax filings remains the responsibility of the authorized accountant or company director.",
          ],
        },
      ],
    },
  },
};

export function getAuthLegalDict(locale: Locale): AuthLegalDict {
  return authLegalDict[locale] ?? authLegalDict.uz;
}
