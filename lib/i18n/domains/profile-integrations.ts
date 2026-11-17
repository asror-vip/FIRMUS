import type { Locale } from "../types";

export interface ProfileIntegrationsDict {
  profile: {
    personalEditTitle: string;
    personalEditDesc: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    jobTitleLabel: string;
    jobTitlePlaceholder: string;
    savePersonalBtn: string;
    savingBtn: string;
    personalSavedToast: string;
    personalSaveErrorToast: string;
    companyCardTitle: string;
    companyCardDesc: string;
    legalNameLabel: string;
    legalNamePlaceholder: string;
    tradeNameLabel: string;
    tradeNamePlaceholder: string;
    tinStirLabel: string;
    tinStirPlaceholder: string;
    companyTypeLabel: string;
    taxRegimeLabel: string;
    bankAccountLabel: string;
    bankAccountPlaceholder: string;
    bankNameLabel: string;
    bankNamePlaceholder: string;
    bankMfoLabel: string;
    bankMfoPlaceholder: string;
    accountantNameLabel: string;
    accountantNamePlaceholder: string;
    saveCompanyBtn: string;
    companySavedToast: string;
    companySaveErrorToast: string;
    invalidStirError: string;
    invalidBankAccountError: string;
    invalidMfoError: string;
    loadProfileErrorToast: string;
  };
  integrations: {
    tabLabel: string;
    hubTitle: string;
    hubDesc: string;
    statusOneC: string;
    statusDidox: string;
    statusBank: string;
    catalogSummaryTitle: string;
    counterpartiesCountLabel: string;
    accountsCountLabel: string;
    connectedBadge: string;
    awaitingCodeBadge: string;
    disconnectedBadge: string;
    oneCCardTitle: string;
    oneCCardDesc: string;
    modeOnlineOData: string;
    modeLocalEpf: string;
    odataUrlLabel: string;
    odataUrlPlaceholder: string;
    odataLoginLabel: string;
    odataLoginPlaceholder: string;
    odataPasswordLabel: string;
    odataPasswordPlaceholderSaved: string;
    odataPasswordPlaceholderNew: string;
    odataHttpsHint: string;
    testAndSaveODataBtn: string;
    syncCatalogBtn: string;
    disconnectOneCBtn: string;
    epfDesc: string;
    getPairCodeBtn: string;
    regenerateCodeBtn: string;
    pairCodeLabel: string;
    codeExpiryBadge: string; // "{minutes}:{seconds}"
    codeExpiredText: string;
    copyCodeBtn: string;
    codeCopiedToast: string;
    downloadBslBtn: string;
    epfStatusConnected: string;
    epfStatusWaiting: string;
    epfStatusDisconnected: string;
    lastSyncedLabel: string;
    neverSynced: string;
    queueTitle: string;
    queueDesc: string;
    pushReadyToOneCBtn: string;
    retryBtn: string;
    queueEmpty: string;
    queueColSource: string;
    queueColSummary: string;
    queueColAmount: string;
    queueColStatus: string;
    queueColDocNumber: string;
    queueColAction: string;
    queueStatusPending: string;
    queueStatusProcessing: string;
    queueStatusPushed: string;
    queueStatusFailed: string;
    didoxCardTitle: string;
    didoxCardDesc: string;
    didoxStirLabel: string;
    didoxStirPlaceholder: string;
    didoxModeLabel: string;
    didoxModeManual: string;
    didoxModeAuto: string;
    didoxActiveBadge: string;
    didoxInactiveBadge: string;
    saveDidoxBtn: string;
    bankCardTitle: string;
    bankCardDesc: string;
    bankEncodingLabel: string;
    bankEncodingAuto: string;
    bankEncodingUtf8: string;
    bankEncodingWin1251: string;
    bankDefaultAccountLabel: string;
    bankDefaultAccountPlaceholder: string;
    saveBankBtn: string;
    toasts: {
      loadError: string;
      odataSaved: string;
      odataError: string;
      catalogSynced: string;
      catalogSyncError: string;
      pairCodeGenerated: string;
      pairCodeError: string;
      disconnected: string;
      disconnectError: string;
      pushedDrafts: string;
      pushDraftsError: string;
      didoxSaved: string;
      didoxError: string;
      bankSaved: string;
      bankError: string;
      bslDownloaded: string;
    };
  };
  security: {
    passwordCardTitle: string;
    passwordCardDesc: string;
    newPasswordLabel: string;
    newPasswordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    minCharsHint: string;
    savePasswordBtn: string;
    passwordMismatchError: string;
    passwordTooShortError: string;
    passwordUpdatedToast: string;
    passwordUpdateErrorToast: string;
    oauthPasswordHint: string;
    revokeTokensTitle: string;
    revokeTokensDesc: string;
    revokeTokensBtn: string;
    tokensRevokedToast: string;
    tokensRevokeErrorToast: string;
  };
  reconcileQueue: {
    sendToOneCQueueBtn: string;
    sendingBtn: string;
    noRowsError: string;
    queuedSuccessToast: string; // "{count} ta operatsiya 1C qoralamalar navbatiga yuborildi"
    openQueueAction: string;
    queuedErrorToast: string;
  };
}

const uzDict: ProfileIntegrationsDict = {
  profile: {
    personalEditTitle: "Shaxsiy profilni tahrirlash",
    personalEditDesc: "Ism-sharif, telefon raqam va lavozimingizni yangilang.",
    fullNameLabel: "F.I.O (Toʻliq ism)",
    fullNamePlaceholder: "Masalan: Asror Karimov",
    phoneLabel: "Telefon raqami",
    phonePlaceholder: "+998 90 123 45 67",
    jobTitleLabel: "Lavozim",
    jobTitlePlaceholder: "Bosh buxgalter",
    savePersonalBtn: "Profilni saqlash",
    savingBtn: "Saqlanmoqda...",
    personalSavedToast: "Shaxsiy profil maʼlumotlari saqlandi",
    personalSaveErrorToast: "Profilni saqlashda xatolik: {error}",
    companyCardTitle: "Korxona va Bank rekvizitlari",
    companyCardDesc: "1C eksport, soliq hisob-kitoblari va hujjat shablonlari uchun asosiy korxona rekvizitlari.",
    legalNameLabel: "Yuridik nomi",
    legalNamePlaceholder: "Masalan: ORIENT AGRO TEXTILE MChJ",
    tradeNameLabel: "Savdo belgisi (ixtiyoriy)",
    tradeNamePlaceholder: "ORIENT AGRO",
    tinStirLabel: "STIR (INN — 9 ta raqam)",
    tinStirPlaceholder: "301948572",
    companyTypeLabel: "Tashkiliy-huquqiy shakli",
    taxRegimeLabel: "Soliq rejimi",
    bankAccountLabel: "Hisob raqami (20 ta raqam)",
    bankAccountPlaceholder: "20208000905412340001",
    bankNameLabel: "Xizmat koʻrsatuvchi bank",
    bankNamePlaceholder: "Ipak Yoʻli Banki",
    bankMfoLabel: "Bank MFO (5 ta raqam)",
    bankMfoPlaceholder: "00444",
    accountantNameLabel: "Masʼul buxgalter",
    accountantNamePlaceholder: "Bosh buxgalter",
    saveCompanyBtn: "Rekvizitlarni saqlash",
    companySavedToast: "Korxona va bank rekvizitlari saqlandi",
    companySaveErrorToast: "Rekvizitlarni saqlashda xatolik: {error}",
    invalidStirError: "STIR aniq 9 ta raqamdan iborat boʻlishi kerak",
    invalidBankAccountError: "Bank hisob raqami 20 ta raqamdan iborat boʻlishi kerak",
    invalidMfoError: "Bank MFO kodi 5 ta raqamdan iborat boʻlishi kerak",
    loadProfileErrorToast: "Profil maʼlumotlarini yuklashda xatolik",
  },
  integrations: {
    tabLabel: "Ulash tizimlari",
    hubTitle: "Tashqi tizimlar bilan integratsiya",
    hubDesc: "1C:Buxgalteriya (OData yoki lokal .epf koʻprik), Didox EDO va bank almashinuv sozlamalari.",
    statusOneC: "1C:Buxgalteriya",
    statusDidox: "Didox EDO",
    statusBank: "Bank almashinuvi",
    catalogSummaryTitle: "Sinxronlangan 1C katalogi",
    counterpartiesCountLabel: "Kontragentlar",
    accountsCountLabel: "Schyotlar",
    connectedBadge: "Ulangan",
    awaitingCodeBadge: "Kod kutilmoqda",
    disconnectedBadge: "Ulanmagan",
    oneCCardTitle: "1C:Buxgalteriya 8.3",
    oneCCardDesc: "Onlayn OData API yoki kompyuterdagi lokal 1C bazasi (.epf tashqi ishlov berish) orqali qoralamalar yuboring.",
    modeOnlineOData: "Onlayn 1C (1C:Fresh / OData)",
    modeLocalEpf: "Kompyuterdagi 1C (.epf / Fayl)",
    odataUrlLabel: "OData bazaviy HTTPS manzili",
    odataUrlPlaceholder: "https://1c.example.uz/buh/odata/standard.odata",
    odataLoginLabel: "1C OData foydalanuvchi logini",
    odataLoginPlaceholder: "odata_user",
    odataPasswordLabel: "1C OData paroli",
    odataPasswordPlaceholderSaved: "•••••••• (oʻzgartirish uchun yangisini kiriting)",
    odataPasswordPlaceholderNew: "Parolni kiriting",
    odataHttpsHint: "Xavfsizlik uchun faqat HTTPS havolalar qabul qilinadi. Parol AES-256-GCM bilan shifrlanadi.",
    testAndSaveODataBtn: "Ulanishni tekshirish va saqlash",
    syncCatalogBtn: "Katalogni sinxronlash",
    disconnectOneCBtn: "Ulanishni uzish",
    epfDesc: "Agar 1C bazangiz faqat kompyuter yoki lokal tarmoqda boʻlsa, 6 xonali vaqtinchalik kod olib FIRMUS 1C moduliga kiriting.",
    getPairCodeBtn: "6 xonali kod olish",
    regenerateCodeBtn: "Yangi kod olish",
    pairCodeLabel: "Faol ulash kodi",
    codeExpiryBadge: "Amal qiladi: {time}",
    codeExpiredText: "Kod muddati tugadi — yangisini oling",
    copyCodeBtn: "Nusxalash",
    codeCopiedToast: "Ulash kodi buferga nusxalandi",
    downloadBslBtn: ".bsl modul yoʻriqnomasini yuklab olish",
    epfStatusConnected: "Ulangan",
    epfStatusWaiting: "Kod kutilmoqda",
    epfStatusDisconnected: "Ulanmagan",
    lastSyncedLabel: "Oxirgi sinxronlash",
    neverSynced: "Hali sinxronlanmagan",
    queueTitle: "1C Qoralamalar Navbati",
    queueDesc: "Sverka yoki hujjat skanidan 1C ga oʻtkazish uchun navbatga qoʻyilgan yozuvlar.",
    pushReadyToOneCBtn: "Onlayn 1C ga yuborish",
    retryBtn: "Qayta urinish",
    queueEmpty: "Hozircha 1C qoralamalar navbati boʻsh. Bank Sverka sahifasidan operatsiyalarni yuborishingiz mumkin.",
    queueColSource: "Manba",
    queueColSummary: "Tavsif / Kontragent",
    queueColAmount: "Summa",
    queueColStatus: "Holat",
    queueColDocNumber: "1C hujjat №",
    queueColAction: "Amal",
    queueStatusPending: "Kutilmoqda",
    queueStatusProcessing: "Jarayonda",
    queueStatusPushed: "1C qoralamasiga oʻtdi",
    queueStatusFailed: "Xatolik",
    didoxCardTitle: "Didox (E-SF va Shartnomalar)",
    didoxCardDesc: "Elektron hisob-fakturalar va shartnomalar uchun korxona STIR va EDO sinxronlash rejimi.",
    didoxStirLabel: "Didox STIR",
    didoxStirPlaceholder: "301948572",
    didoxModeLabel: "EDO ishlash rejimi",
    didoxModeManual: "Qoʻlda tasdiqlash (Tavsiya etiladi)",
    didoxModeAuto: "Avtomatik qoralama sinxronlash",
    didoxActiveBadge: "Faol",
    didoxInactiveBadge: "Sozlanmagan",
    saveDidoxBtn: "Didox sozlamasini saqlash",
    bankCardTitle: "Bank eksport va ClientBank",
    bankCardDesc: "kl_to_1c.txt fayl kodirovkasi va asosiy hisob raqami schyoti sozlamalari.",
    bankEncodingLabel: "Standart fayl kodirovkasi",
    bankEncodingAuto: "Avtomatik aniqlash (Tavsiya etiladi)",
    bankEncodingUtf8: "UTF-8 (Zamonaviy 1C 8.3)",
    bankEncodingWin1251: "Windows-1251 (Eski 1C / Bank)",
    bankDefaultAccountLabel: "Asosiy bank schyoti (21-BHMS)",
    bankDefaultAccountPlaceholder: "5110",
    saveBankBtn: "Bank sozlamasini saqlash",
    toasts: {
      loadError: "Integratsiya holatini yuklashda xatolik",
      odataSaved: "1C OData ulanishi tekshirildi va saqlandi",
      odataError: "1C OData ulanishida xatolik: {error}",
      catalogSynced: "1C katalogi muvaffaqiyatli sinxronlandi",
      catalogSyncError: "Katalogni sinxronlashda xatolik: {error}",
      pairCodeGenerated: "6 xonali 1C ulash kodi yaratildi (10 daqiqa amal qiladi)",
      pairCodeError: "Ulash kodini yaratishda xatolik: {error}",
      disconnected: "1C integratsiyasi uzildi",
      disconnectError: "Ulanishni uzishda xatolik: {error}",
      pushedDrafts: "{count} ta qoralama 1C ga yuborildi",
      pushDraftsError: "1C ga yuborishda xatolik: {error}",
      didoxSaved: "Didox sozlamalari saqlandi",
      didoxError: "Didox sozlamasini saqlashda xatolik: {error}",
      bankSaved: "Bank almashinuvi sozlamalari saqlandi",
      bankError: "Bank sozlamasini saqlashda xatolik: {error}",
      bslDownloaded: "1C .bsl modul yoʻriqnomasi yuklab olindi",
    },
  },
  security: {
    passwordCardTitle: "Parolni oʻzgartirish",
    passwordCardDesc: "Hisobingiz xavfsizligi uchun kamida 8 ta belgidan iborat kuchli parol oʻrnating.",
    newPasswordLabel: "Yangi parol",
    newPasswordPlaceholder: "Kamida 8 ta belgi",
    confirmPasswordLabel: "Parolni tasdiqlang",
    confirmPasswordPlaceholder: "Yangi parolni qayta kiriting",
    minCharsHint: "Kamida 8 ta belgi, harf va raqamlar kombinatsiyasi tavsiya etiladi.",
    savePasswordBtn: "Parolni yangilash",
    passwordMismatchError: "Parollar bir-biriga mos kelmadi",
    passwordTooShortError: "Parol kamida 8 ta belgidan iborat boʻlishi kerak",
    passwordUpdatedToast: "Parolingiz muvaffaqiyatli yangilandi",
    passwordUpdateErrorToast: "Parolni yangilashda xatolik: {error}",
    oauthPasswordHint: "Agar Google orqali kirgan boʻlsangiz ham, qoʻshimcha email/parol kirishi uchun parol belgilashingiz mumkin.",
    revokeTokensTitle: "1C API ulanishlari va tokenlar",
    revokeTokensDesc: "Barcha saqlangan 1C OData parollari va lokal .epf ulash tokenlarini darhol bekor qiladi.",
    revokeTokensBtn: "1C API ulanishlarini bekor qilish",
    tokensRevokedToast: "Barcha 1C API ulanishlari va tokenlari bekor qilindi",
    tokensRevokeErrorToast: "Tokenlarni bekor qilishda xatolik: {error}",
  },
  reconcileQueue: {
    sendToOneCQueueBtn: "1C Qoralamasiga yuborish",
    sendingBtn: "Navbatga yuborilmoqda...",
    noRowsError: "Navbatga yuborish uchun kamida bitta bank operatsiyasini tanlang yoki yuklang",
    queuedSuccessToast: "{count} ta yozuv 1C qoralamalar navbatiga qoʻshildi",
    openQueueAction: "Navbatni ochish",
    queuedErrorToast: "1C navbatiga yuborishda xatolik: {error}",
  },
};

const ruDict: ProfileIntegrationsDict = {
  profile: {
    personalEditTitle: "Редактирование личного профиля",
    personalEditDesc: "Обновите ваше имя, номер телефона и должность.",
    fullNameLabel: "Ф.И.О. (Полное имя)",
    fullNamePlaceholder: "Например: Асрор Каримов",
    phoneLabel: "Номер телефона",
    phonePlaceholder: "+998 90 123 45 67",
    jobTitleLabel: "Должность",
    jobTitlePlaceholder: "Главный бухгалтер",
    savePersonalBtn: "Сохранить профиль",
    savingBtn: "Сохранение...",
    personalSavedToast: "Личный профиль обновлён",
    personalSaveErrorToast: "Ошибка сохранения профиля: {error}",
    companyCardTitle: "Реквизиты компании и банка",
    companyCardDesc: "Основные реквизиты компании для экспорта в 1С, налоговых расчётов и документов.",
    legalNameLabel: "Юридическое наименование",
    legalNamePlaceholder: "Например: ООО ORIENT AGRO TEXTILE",
    tradeNameLabel: "Торговое название (необязательно)",
    tradeNamePlaceholder: "ORIENT AGRO",
    tinStirLabel: "ИНН / СТИР (9 цифр)",
    tinStirPlaceholder: "301948572",
    companyTypeLabel: "Организационно-правовая форма",
    taxRegimeLabel: "Налоговый режим",
    bankAccountLabel: "Расчётный счёт (20 цифр)",
    bankAccountPlaceholder: "20208000905412340001",
    bankNameLabel: "Обслуживающий банк",
    bankNamePlaceholder: "Ипак Йули Банк",
    bankMfoLabel: "МФО банка (5 цифр)",
    bankMfoPlaceholder: "00444",
    accountantNameLabel: "Ответственный бухгалтер",
    accountantNamePlaceholder: "Главный бухгалтер",
    saveCompanyBtn: "Сохранить реквизиты",
    companySavedToast: "Реквизиты компании и банка сохранены",
    companySaveErrorToast: "Ошибка сохранения реквизитов: {error}",
    invalidStirError: "ИНН (СТИР) должен состоять ровно из 9 цифр",
    invalidBankAccountError: "Расчётный счёт должен состоять ровно из 20 цифр",
    invalidMfoError: "МФО банка должен состоять ровно из 5 цифр",
    loadProfileErrorToast: "Не удалось загрузить данные профиля",
  },
  integrations: {
    tabLabel: "Интеграции",
    hubTitle: "Интеграции с внешними системами",
    hubDesc: "Настройка 1С:Бухгалтерии (OData или локальный мост .epf), Didox ЭДО и банковского обмена.",
    statusOneC: "1С:Бухгалтерия",
    statusDidox: "Didox ЭДО",
    statusBank: "Банковский обмен",
    catalogSummaryTitle: "Синхронизированный каталог 1С",
    counterpartiesCountLabel: "Контрагенты",
    accountsCountLabel: "Счета",
    connectedBadge: "Подключено",
    awaitingCodeBadge: "Ожидает код",
    disconnectedBadge: "Не подключено",
    oneCCardTitle: "1С:Бухгалтерия 8.3",
    oneCCardDesc: "Отправляйте черновики документов через онлайн OData API или локальную обработку .epf на компьютере.",
    modeOnlineOData: "Онлайн 1С (1C:Fresh / OData)",
    modeLocalEpf: "Локальная 1С (.epf / Файл)",
    odataUrlLabel: "Базовый HTTPS-адрес OData",
    odataUrlPlaceholder: "https://1c.example.uz/buh/odata/standard.odata",
    odataLoginLabel: "Логин пользователя OData 1С",
    odataLoginPlaceholder: "odata_user",
    odataPasswordLabel: "Пароль OData 1С",
    odataPasswordPlaceholderSaved: "•••••••• (введите новый, чтобы изменить)",
    odataPasswordPlaceholderNew: "Введите пароль",
    odataHttpsHint: "Для безопасности принимаются только HTTPS-адреса. Пароль шифруется AES-256-GCM.",
    testAndSaveODataBtn: "Проверить и сохранить",
    syncCatalogBtn: "Синхронизировать каталог",
    disconnectOneCBtn: "Отключить",
    epfDesc: "Если ваша 1С работает только локально, получите 6-значный код и введите его во внешней обработке FIRMUS 1С.",
    getPairCodeBtn: "Получить 6-значный код",
    regenerateCodeBtn: "Новый код",
    pairCodeLabel: "Активный код подключения",
    codeExpiryBadge: "Действует: {time}",
    codeExpiredText: "Срок действия кода истёк — создайте новый",
    copyCodeBtn: "Копировать",
    codeCopiedToast: "Код скопирован в буфер обмена",
    downloadBslBtn: "Скачать инструкцию модуля .bsl",
    epfStatusConnected: "Подключено",
    epfStatusWaiting: "Ожидает код",
    epfStatusDisconnected: "Не подключено",
    lastSyncedLabel: "Последняя синхронизация",
    neverSynced: "Ещё не синхронизировано",
    queueTitle: "Очередь черновиков 1С",
    queueDesc: "Операции из сверки или сканера, подготовленные для передачи в черновики 1С.",
    pushReadyToOneCBtn: "Отправить в онлайн 1С",
    retryBtn: "Повторить",
    queueEmpty: "Очередь черновиков 1С пуста. Отправьте строки со страницы Сверки банка.",
    queueColSource: "Источник",
    queueColSummary: "Описание / Контрагент",
    queueColAmount: "Сумма",
    queueColStatus: "Статус",
    queueColDocNumber: "№ док. 1С",
    queueColAction: "Действие",
    queueStatusPending: "В очереди",
    queueStatusProcessing: "Отправка",
    queueStatusPushed: "В черновике 1С",
    queueStatusFailed: "Ошибка",
    didoxCardTitle: "Didox (Э-СФ и договоры)",
    didoxCardDesc: "ИНН компании и режим синхронизации электронного документооборота Didox.",
    didoxStirLabel: "ИНН в Didox",
    didoxStirPlaceholder: "301948572",
    didoxModeLabel: "Режим работы ЭДО",
    didoxModeManual: "Ручное подтверждение (Рекомендуется)",
    didoxModeAuto: "Автосинхронизация черновиков",
    didoxActiveBadge: "Активно",
    didoxInactiveBadge: "Не настроено",
    saveDidoxBtn: "Сохранить Didox",
    bankCardTitle: "Банковский экспорт и ClientBank",
    bankCardDesc: "Кодировка по умолчанию для kl_to_1c.txt и основной расчётный счёт.",
    bankEncodingLabel: "Кодировка файлов по умолчанию",
    bankEncodingAuto: "Автоопределение (Рекомендуется)",
    bankEncodingUtf8: "UTF-8 (Современная 1С 8.3)",
    bankEncodingWin1251: "Windows-1251 (Классическая 1С / Банк)",
    bankDefaultAccountLabel: "Основной счёт банка (НСБУ 21)",
    bankDefaultAccountPlaceholder: "5110",
    saveBankBtn: "Сохранить банк",
    toasts: {
      loadError: "Не удалось загрузить статус интеграций",
      odataSaved: "Подключение 1С OData проверено и сохранено",
      odataError: "Ошибка подключения 1С OData: {error}",
      catalogSynced: "Каталог 1С успешно синхронизирован",
      catalogSyncError: "Ошибка синхронизации каталога: {error}",
      pairCodeGenerated: "Создан 6-значный код подключения 1С (действует 10 минут)",
      pairCodeError: "Ошибка генерации кода: {error}",
      disconnected: "Интеграция с 1С отключена",
      disconnectError: "Ошибка отключения: {error}",
      pushedDrafts: "Отправлено черновиков в 1С: {count}",
      pushDraftsError: "Ошибка отправки в 1С: {error}",
      didoxSaved: "Настройки Didox сохранены",
      didoxError: "Ошибка сохранения Didox: {error}",
      bankSaved: "Настройки банковского обмена сохранены",
      bankError: "Ошибка сохранения банковских настроек: {error}",
      bslDownloaded: "Инструкция модуля 1С (.bsl) скачана",
    },
  },
  security: {
    passwordCardTitle: "Изменение пароля",
    passwordCardDesc: "Для защиты аккаунта установите надёжный пароль длиной не менее 8 символов.",
    newPasswordLabel: "Новый пароль",
    newPasswordPlaceholder: "Минимум 8 символов",
    confirmPasswordLabel: "Подтвердите пароль",
    confirmPasswordPlaceholder: "Повторите новый пароль",
    minCharsHint: "Рекомендуется не менее 8 символов, включая буквы и цифры.",
    savePasswordBtn: "Обновить пароль",
    passwordMismatchError: "Пароли не совпадают",
    passwordTooShortError: "Пароль должен содержать не менее 8 символов",
    passwordUpdatedToast: "Пароль успешно обновлён",
    passwordUpdateErrorToast: "Ошибка обновления пароля: {error}",
    oauthPasswordHint: "Даже при входе через Google вы можете задать пароль для резервного входа по email.",
    revokeTokensTitle: "Подключения и токены 1С API",
    revokeTokensDesc: "Немедленно отзывает все сохранённые пароли OData и локальные токены .epf.",
    revokeTokensBtn: "Отозвать подключения 1С API",
    tokensRevokedToast: "Все подключения и токены 1С API отозваны",
    tokensRevokeErrorToast: "Ошибка отзыва токенов: {error}",
  },
  reconcileQueue: {
    sendToOneCQueueBtn: "Отправить в черновики 1С",
    sendingBtn: "Отправка в очередь...",
    noRowsError: "Выберите или загрузите хотя бы одну банковскую операцию для отправки",
    queuedSuccessToast: "В очередь черновиков 1С добавлено записей: {count}",
    openQueueAction: "Открыть очередь",
    queuedErrorToast: "Ошибка отправки в очередь 1С: {error}",
  },
};

const enDict: ProfileIntegrationsDict = {
  profile: {
    personalEditTitle: "Edit Personal Profile",
    personalEditDesc: "Update your full name, phone number, and job title.",
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "e.g. Asror Karimov",
    phoneLabel: "Phone Number",
    phonePlaceholder: "+998 90 123 45 67",
    jobTitleLabel: "Job Title",
    jobTitlePlaceholder: "Chief Accountant",
    savePersonalBtn: "Save Profile",
    savingBtn: "Saving...",
    personalSavedToast: "Personal profile updated",
    personalSaveErrorToast: "Failed to save profile: {error}",
    companyCardTitle: "Company & Bank Requisites",
    companyCardDesc: "Primary company details used for 1C exports, tax calculations, and document templates.",
    legalNameLabel: "Company Legal Name",
    legalNamePlaceholder: "e.g. ORIENT AGRO TEXTILE LLC",
    tradeNameLabel: "Trade Name (optional)",
    tradeNamePlaceholder: "ORIENT AGRO",
    tinStirLabel: "STIR / TIN (9 digits)",
    tinStirPlaceholder: "301948572",
    companyTypeLabel: "Legal Form",
    taxRegimeLabel: "Tax Regime",
    bankAccountLabel: "Bank Account (20 digits)",
    bankAccountPlaceholder: "20208000905412340001",
    bankNameLabel: "Bank Name",
    bankNamePlaceholder: "Ipak Yuli Bank",
    bankMfoLabel: "Bank MFO (5 digits)",
    bankMfoPlaceholder: "00444",
    accountantNameLabel: "Responsible Accountant",
    accountantNamePlaceholder: "Chief Accountant",
    saveCompanyBtn: "Save Requisites",
    companySavedToast: "Company and bank requisites saved",
    companySaveErrorToast: "Failed to save requisites: {error}",
    invalidStirError: "STIR / TIN must be exactly 9 digits",
    invalidBankAccountError: "Bank account must be exactly 20 digits",
    invalidMfoError: "Bank MFO must be exactly 5 digits",
    loadProfileErrorToast: "Failed to load profile data",
  },
  integrations: {
    tabLabel: "Integrations",
    hubTitle: "External System Integrations",
    hubDesc: "Configure 1C:Enterprise (OData or local .epf bridge), Didox EDO, and Bank file preferences.",
    statusOneC: "1C:Enterprise",
    statusDidox: "Didox EDO",
    statusBank: "Bank Exchange",
    catalogSummaryTitle: "Synced 1C Catalog",
    counterpartiesCountLabel: "Counterparties",
    accountsCountLabel: "Accounts",
    connectedBadge: "Connected",
    awaitingCodeBadge: "Awaiting Code",
    disconnectedBadge: "Disconnected",
    oneCCardTitle: "1C:Enterprise 8.3",
    oneCCardDesc: "Push accounting drafts via online OData API or a local desktop .epf connector.",
    modeOnlineOData: "Online 1C (1C:Fresh / OData)",
    modeLocalEpf: "Desktop 1C (.epf / File)",
    odataUrlLabel: "OData Base HTTPS URL",
    odataUrlPlaceholder: "https://1c.example.uz/buh/odata/standard.odata",
    odataLoginLabel: "1C OData Username",
    odataLoginPlaceholder: "odata_user",
    odataPasswordLabel: "1C OData Password",
    odataPasswordPlaceholderSaved: "•••••••• (enter new password to replace)",
    odataPasswordPlaceholderNew: "Enter password",
    odataHttpsHint: "Only HTTPS endpoints are permitted. Credentials are encrypted with AES-256-GCM.",
    testAndSaveODataBtn: "Test & Save Connection",
    syncCatalogBtn: "Sync Catalog",
    disconnectOneCBtn: "Disconnect",
    epfDesc: "If your 1C runs locally on your desktop or LAN, generate a 6-digit pairing code and enter it in the FIRMUS 1C connector.",
    getPairCodeBtn: "Generate 6-Digit Code",
    regenerateCodeBtn: "Regenerate Code",
    pairCodeLabel: "Active Pairing Code",
    codeExpiryBadge: "Expires in {time}",
    codeExpiredText: "Code expired — generate a new one",
    copyCodeBtn: "Copy",
    codeCopiedToast: "Pairing code copied to clipboard",
    downloadBslBtn: "Download .bsl Module Guide",
    epfStatusConnected: "Connected",
    epfStatusWaiting: "Awaiting Code",
    epfStatusDisconnected: "Disconnected",
    lastSyncedLabel: "Last synced",
    neverSynced: "Never synced",
    queueTitle: "1C Draft Queue",
    queueDesc: "Reconciled rows or scanned documents queued for creation as 1C drafts.",
    pushReadyToOneCBtn: "Push Ready to Online 1C",
    retryBtn: "Retry",
    queueEmpty: "Your 1C draft queue is empty. Send categorized rows from the Bank Reconcile page.",
    queueColSource: "Source",
    queueColSummary: "Summary / Counterparty",
    queueColAmount: "Amount",
    queueColStatus: "Status",
    queueColDocNumber: "1C Doc #",
    queueColAction: "Action",
    queueStatusPending: "Pending",
    queueStatusProcessing: "Processing",
    queueStatusPushed: "Pushed to 1C Draft",
    queueStatusFailed: "Failed",
    didoxCardTitle: "Didox (E-SF & Contracts)",
    didoxCardDesc: "Company STIR and electronic document exchange synchronization mode.",
    didoxStirLabel: "Didox STIR",
    didoxStirPlaceholder: "301948572",
    didoxModeLabel: "EDO Sync Mode",
    didoxModeManual: "Manual Review (Recommended)",
    didoxModeAuto: "Auto-sync Drafts",
    didoxActiveBadge: "Active",
    didoxInactiveBadge: "Not Configured",
    saveDidoxBtn: "Save Didox Settings",
    bankCardTitle: "Bank Export & ClientBank",
    bankCardDesc: "Default kl_to_1c.txt encoding and primary bank GL account configuration.",
    bankEncodingLabel: "Default File Encoding",
    bankEncodingAuto: "Auto-detect (Recommended)",
    bankEncodingUtf8: "UTF-8 (Modern 1C 8.3)",
    bankEncodingWin1251: "Windows-1251 (Legacy 1C / Bank)",
    bankDefaultAccountLabel: "Default Bank Account (NSBU 21)",
    bankDefaultAccountPlaceholder: "5110",
    saveBankBtn: "Save Bank Settings",
    toasts: {
      loadError: "Failed to load integration status",
      odataSaved: "1C OData connection verified and saved",
      odataError: "1C OData connection failed: {error}",
      catalogSynced: "1C catalog synced successfully",
      catalogSyncError: "Failed to sync 1C catalog: {error}",
      pairCodeGenerated: "6-digit 1C pairing code generated (valid for 10 minutes)",
      pairCodeError: "Failed to generate pairing code: {error}",
      disconnected: "1C integration disconnected",
      disconnectError: "Failed to disconnect: {error}",
      pushedDrafts: "Pushed {count} draft(s) to 1C",
      pushDraftsError: "Failed to push drafts to 1C: {error}",
      didoxSaved: "Didox settings saved",
      didoxError: "Failed to save Didox settings: {error}",
      bankSaved: "Bank preferences saved",
      bankError: "Failed to save bank preferences: {error}",
      bslDownloaded: "1C .bsl module guide downloaded",
    },
  },
  security: {
    passwordCardTitle: "Change Password",
    passwordCardDesc: "Set a strong password with at least 8 characters to protect your account.",
    newPasswordLabel: "New Password",
    newPasswordPlaceholder: "Minimum 8 characters",
    confirmPasswordLabel: "Confirm Password",
    confirmPasswordPlaceholder: "Re-enter new password",
    minCharsHint: "At least 8 characters with letters and numbers is recommended.",
    savePasswordBtn: "Update Password",
    passwordMismatchError: "Passwords do not match",
    passwordTooShortError: "Password must be at least 8 characters",
    passwordUpdatedToast: "Your password has been updated",
    passwordUpdateErrorToast: "Failed to update password: {error}",
    oauthPasswordHint: "Even if you sign in with Google, you can set a password for backup email login.",
    revokeTokensTitle: "1C API Connections & Tokens",
    revokeTokensDesc: "Immediately revokes all stored 1C OData credentials and local .epf pairing tokens.",
    revokeTokensBtn: "Revoke 1C API Connections",
    tokensRevokedToast: "All 1C API connections and tokens have been revoked",
    tokensRevokeErrorToast: "Failed to revoke tokens: {error}",
  },
  reconcileQueue: {
    sendToOneCQueueBtn: "Send to 1C Draft Queue",
    sendingBtn: "Queuing...",
    noRowsError: "Select or upload at least one bank transaction to queue",
    queuedSuccessToast: "Queued {count} item(s) to 1C drafts",
    openQueueAction: "Open Queue",
    queuedErrorToast: "Failed to queue for 1C: {error}",
  },
};

const dictionaries: Record<Locale, ProfileIntegrationsDict> = {
  uz: uzDict,
  ru: ruDict,
  en: enDict,
};

export function getProfileIntegrationsDict(locale: Locale): ProfileIntegrationsDict {
  return dictionaries[locale] || uzDict;
}
