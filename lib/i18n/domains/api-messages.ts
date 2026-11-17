import type { Locale } from "@/lib/i18n/server-locale";

export interface ApiMessages {
  authRequired: string;
  systemError: string;
  entityNotFoundOrForbidden: string;
  roleInsufficient: (role: string) => string;
  proposalRejected: string;
  actionAppliedAudit: string;
  invalidImageFormat: string;
  uploadOrEnterContract: string;
  pdfExceedsLimit: (planName: string, maxMb: number) => string;
  imageExceedsLimit: (planName: string, maxMb: number) => string;
  orderIdRequired: string;
  manualConfirmForbidden: string;
  orderNotFound: string;
  orderAlreadyPaid: string;
  orderActivated: string;
  invalidPlanId: string;
  invalidBillingCycle: string;
  invalidPaymentMethod: string;
  b2bTinNameRequired: string;
  orderCreateFailed: string;
  trialActivated: string;
  modelSwitchFailed: string;
  invalidModel: string;
  limitReached: string;
  aiUnavailable: string;
  aiLanguageInstruction: (locale: Locale) => string;

  // Additional route-specific messages
  invalidRequest: string;
  copilotError: string;
  invalidActionData: string;
  actionExecuteError: string;
  unknownError: string;
  accountCodeMissing: (code: string) => string;
  transactionNotFound: string;
  contractAddedByAi: string;
  invalidDocumentRequest: string;
  pdfProOnly: string;
  documentScanError: string;
  defaultDocumentType: string;
  defaultCounterparty: string;
  defaultItemName: string;
  defaultUnit: string;
  defaultProvodkaExplanation: string;
  contractFallback: {
    highPenalty: (rate: number) => string;
    fullPrepayment: string;
    missingVat: string;
    missingRequisites: string;
    documentType: string;
    counterparty: string;
    explanationWithRisks: (count: number) => string;
    explanationClean: string;
  };
  invalidReconcileRequest: string;
  reconcileError: string;
  reconcileAccountNames: Record<string, string>;
  reconcileFallbackExplanation: (params: {
    status: "amount_mismatch" | "bank_only" | "one_c_only";
    bankAmount: number;
    oneCAmount: number;
    diffAmount: number;
    accountCode: string;
    accountName: string;
  }) => string;
  subscriptionFetchError: string;
  orderConfirmFailed: string;
  orderCancelFailed: string;
  b2bInvoicePurpose: (orderId: string) => string;
  b2bContractNotice: string;
  disposableEmailTrialForbidden: string;
  trialActivateFailed: string;
}

const UZ_RECONCILE_ACCOUNTS: Record<string, string> = {
  "4010": "Xaridorlar va buyurtmachilardan olinadigan schyotlar",
  "4310": "Yetkazib beruvchilarga berilgan boʻnaklar",
  "4410": "Budjetga oldindan toʻlangan soliqlar (QQS)",
  "4510": "Mehnat haqi boʻyicha berilgan boʻnaklar",
  "5010": "Kassadagi pul mablagʻlari",
  "5110": "Hisob-kitob schyoti (Milliy valyutada)",
  "6010": "Mol yetkazib beruvchilarga toʻlanadigan schyotlar",
  "6310": "Xaridorlardan olingan boʻnaklar",
  "6410": "Budjetga toʻlovlar boʻyicha qarzlar (Soliqlar)",
  "6520": "Maqsadli davlat jamgʻarmalariga toʻlovlar",
  "6710": "Mehnat haqi boʻyicha xodimlar bilan hisob-kitoblar",
  "9010": "Tayyor mahsulot sotishdan daromadlar",
  "9020": "Tovarlar sotishdan daromadlar",
  "9030": "Xizmatlar koʻrsatishdan daromadlar",
  "9410": "Sotish xarajatlari",
  "9420": "Maʼmuriy xarajatlar",
  "9430": "Boshqa operatsion xarajatlar",
};

const RU_RECONCILE_ACCOUNTS: Record<string, string> = {
  "4010": "Счета к получению от покупателей и заказчиков",
  "4310": "Авансы, выданные поставщикам и подрядчикам",
  "4410": "Авансовые платежи по налогам в бюджет (НДС)",
  "4510": "Авансы, выданные по оплате труда",
  "5010": "Денежные средства в кассе",
  "5110": "Расчётный счёт (в национальной валюте)",
  "6010": "Счета к оплате поставщикам и подрядчикам",
  "6310": "Авансы, полученные от покупателей",
  "6410": "Задолженность по платежам в бюджет (налоги)",
  "6520": "Платежи в государственные целевые фонды",
  "6710": "Расчёты с персоналом по оплате труда",
  "9010": "Доходы от реализации готовой продукции",
  "9020": "Доходы от реализации товаров",
  "9030": "Доходы от оказания услуг",
  "9410": "Расходы по реализации",
  "9420": "Административные расходы",
  "9430": "Прочие операционные расходы",
};

const EN_RECONCILE_ACCOUNTS: Record<string, string> = {
  "4010": "Accounts receivable from customers",
  "4310": "Advances paid to suppliers",
  "4410": "Prepaid taxes to budget (Input VAT)",
  "4510": "Payroll advances paid to employees",
  "5010": "Cash on hand",
  "5110": "Settlement bank account (UZS)",
  "6010": "Accounts payable to suppliers",
  "6310": "Advances received from customers",
  "6410": "Taxes payable to budget",
  "6520": "Payables to state targeted funds",
  "6710": "Payroll payable to employees",
  "9010": "Revenue from sale of finished goods",
  "9020": "Revenue from sale of goods",
  "9030": "Revenue from rendering services",
  "9410": "Selling expenses",
  "9420": "Administrative expenses",
  "9430": "Other operating expenses",
};

export function aiLanguageInstruction(locale: Locale): string {
  switch (locale) {
    case "ru":
      return "Отвечайте на русском языке, если пользователь явно не попросил ответить на другом языке.";
    case "en":
      return "Respond in English, unless the user explicitly asks to reply in another language.";
    case "uz":
    default:
      return "Oʻzbek tilida (lotin alifbosida) javob bering, agar foydalanuvchi boshqa tilda yozishni aniq soʻramagan boʻlsa.";
  }
}

const API_DICTIONARIES: Record<Locale, ApiMessages> = {
  uz: {
    authRequired: "Autentifikatsiya talab qilinadi",
    systemError: "Tizim xatoligi",
    entityNotFoundOrForbidden: "Korxona topilmadi yoki ruxsat yoʻq",
    roleInsufficient: (role: string) =>
      `Sizning rolingiz (${role}) moliyaviy amallarni bajarish huquqiga ega emas`,
    proposalRejected: "Taklif rad etildi va audit jurnaliga yozildi.",
    actionAppliedAudit:
      "Amal server tomonida tekshirildi, Supabase bazasiga yozildi va audit jurnaliga qayd etildi!",
    invalidImageFormat: "Rasm formati toʻgʻri emas. Faqat PNG, JPG yoki WEBP rasm yuklang.",
    uploadOrEnterContract: "Tahlil qilish uchun rasm/PDF yuklang yoki shartnoma matnini kiriting",
    pdfExceedsLimit: (planName: string, maxMb: number) =>
      `PDF hajmi ${planName} tarifi limiti (${maxMb} MB) dan oshmasligi kerak.`,
    imageExceedsLimit: (planName: string, maxMb: number) =>
      `Rasm hajmi ${planName} tarifi limiti (${maxMb} MB) dan katta.`,
    orderIdRequired: "orderId talab qilinadi",
    manualConfirmForbidden: "Real toʻlov rejimida buyurtmani qoʻlda tasdiqlash taqiqlangan",
    orderNotFound: "Buyurtma topilmadi",
    orderAlreadyPaid: "Buyurtma avval toʻlangan",
    orderActivated: "Tarif muvaffaqiyatli faollashtirildi!",
    invalidPlanId: "Notoʻgʻri tarif tanlangan (professional yoki pro_plus boʻlishi kerak)",
    invalidBillingCycle: "Notoʻgʻri davr tanlangan (monthly yoki annual)",
    invalidPaymentMethod: "Notoʻgʻri toʻlov tizimi tanlangan (payme, click yoki bank_transfer_didox)",
    b2bTinNameRequired: "Bank oʻtkazmasi uchun tashkilot STIR va nomi kiritilishi shart",
    orderCreateFailed: "Buyurtma yaratib boʻlmadi",
    trialActivated: "7 kunlik bepul Pro sinov davri faollashtirildi!",
    modelSwitchFailed: "Modelni yangilab boʻlmadi",
    invalidModel: "Notoʻgʻri model tanlandi",
    limitReached: "AI kredit limiti tugadi. Tarifingizni oshiring yoki ertaga qayta urinib koʻring.",
    aiUnavailable:
      "AI hujjat skaneri vaqtincha band (Gemini API javob bermadi). Birozdan soʻng qayta urinib koʻring.",
    aiLanguageInstruction,

    invalidRequest: "Notoʻgʻri soʻrov",
    copilotError: "AI Copilot soʻrovida xatolik",
    invalidActionData: "Notoʻgʻri amal maʻlumotlari",
    actionExecuteError: "Amalni bajarishda xatolik",
    unknownError: "Noma'lum xatolik",
    accountCodeMissing: (code: string) =>
      `Schyot kodi "${code}" korxona schyotlar rejasida mavjud emas`,
    transactionNotFound: "Tranzaksiya topilmadi",
    contractAddedByAi: "AI Agent orqali qo'shildi",
    invalidDocumentRequest: "Notoʻgʻri hujjat soʻrovi",
    pdfProOnly:
      "PDF yuklash Pro va Pro+ tariflarida mavjud. Obunalar boʻlimidan 7 kunlik bepul Pro sinovini yoqing.",
    documentScanError: "Hujjat skanerida xatolik yuz berdi",
    defaultDocumentType: "Hujjat",
    defaultCounterparty: "Kontragent",
    defaultItemName: "Tovar/xizmat",
    defaultUnit: "dona",
    defaultProvodkaExplanation: "21-BHMS boʻyicha provodka taklifi tayyorlandi.",
    contractFallback: {
      highPenalty: (rate: number) =>
        `Yuqori penya/jarima (${rate}% kunlik) aniqlandi — OʻzR amaliyotida odatda 0.1%–0.4% (yillik 10–50% chegarasi) tavsiya etiladi.`,
      fullPrepayment:
        "100% oldindan toʻlov (avans) sharti — yetkazib berish muddati va mablagʻni qaytarish kafolatini tekshiring.",
      missingVat:
        "Shartnomada QQS (12% yoki QQSsiz ekani) aniq koʻrsatilmagan — E-SF rasmiylashtirishda kelishmovchilik chiqishi mumkin.",
      missingRequisites: "Rekvizitlarda STIR (9 raqam) yoki bank MFO koʻrsatilganligini tekshiring.",
      documentType: "Shartnoma tahlili",
      counterparty: "Shartnoma tomoni",
      explanationWithRisks: (count: number) =>
        `Shartnomada ${count} ta ehtimoliy moliyaviy/soliq xatari topildi.`,
      explanationClean:
        "Matnda yaqqol yuqori penya yoki QQS boʻshligʻi topilmadi, baribir yakuniy imzodan oldin rekvizitlarni tekshiring.",
    },
    invalidReconcileRequest: "Notoʻgʻri solishtirish soʻrovi",
    reconcileError: "AI solishtirish xatoligi",
    reconcileAccountNames: UZ_RECONCILE_ACCOUNTS,
    reconcileFallbackExplanation: ({
      status,
      bankAmount,
      oneCAmount,
      diffAmount,
      accountCode,
      accountName,
    }) => {
      if (status === "amount_mismatch") {
        return `Bank (${bankAmount.toLocaleString("uz-UZ")}) va 1C (${oneCAmount.toLocaleString("uz-UZ")}) oʻrtasidagi ${Math.abs(diffAmount).toLocaleString("uz-UZ")} soʻm farqni tekshiring.`;
      }
      if (status === "bank_only") {
        return `1C bazasida topilmadi. «${accountName}» (${accountCode}) schyotiga kiritish tavsiya etiladi.`;
      }
      return "1C da mavjud, lekin yuklangan bank koʻchirmasida koʻrinmadi (sana yoki dublikatni tekshiring).";
    },
    subscriptionFetchError: "Obuna maʼlumotini olishda xatolik",
    orderConfirmFailed: "Buyurtmani tasdiqlashda xatolik yuz berdi",
    orderCancelFailed: "Buyurtmani bekor qilib boʻlmadi",
    b2bInvoicePurpose: (orderId: string) => `FIRMUS SaaS obunasi uchun toʻlov (${orderId}). QQSsiz.`,
    b2bContractNotice:
      "Didox yoki 1C E-SF orqali hisob-faktura yuboriladi yoki bank ilovasida koʻrsatilgan hisob raqamga toʻlov qiling.",
    disposableEmailTrialForbidden:
      "Vaqtinchalik (bir martalik) pochta orqali bepul sinov berilmaydi. Doimiy pochta orqali kiring.",
    trialActivateFailed: "Sinov muddatini yoqib boʻlmadi",
  },
  ru: {
    authRequired: "Требуется аутентификация",
    systemError: "Системная ошибка",
    entityNotFoundOrForbidden: "Организация не найдена или доступ запрещён",
    roleInsufficient: (role: string) =>
      `Ваша роль (${role}) не имеет прав на выполнение финансовых операций`,
    proposalRejected: "Предложение отклонено и записано в журнал аудита.",
    actionAppliedAudit:
      "Операция проверена на сервере, записана в базу Supabase и зафиксирована в журнале аудита!",
    invalidImageFormat: "Неверный формат изображения. Загрузите только PNG, JPG или WEBP.",
    uploadOrEnterContract: "Загрузите изображение/PDF или введите текст договора для анализа",
    pdfExceedsLimit: (planName: string, maxMb: number) =>
      `Размер PDF не должен превышать лимит тарифа ${planName} (${maxMb} МБ).`,
    imageExceedsLimit: (planName: string, maxMb: number) =>
      `Размер изображения превышает лимит тарифа ${planName} (${maxMb} МБ).`,
    orderIdRequired: "Требуется orderId",
    manualConfirmForbidden: "Ручное подтверждение заказа запрещено в режиме реальных платежей",
    orderNotFound: "Заказ не найден",
    orderAlreadyPaid: "Заказ уже оплачен",
    orderActivated: "Тариф успешно активирован!",
    invalidPlanId: "Выбран неверный тариф (должен быть professional или pro_plus)",
    invalidBillingCycle: "Выбран неверный период оплаты (monthly или annual)",
    invalidPaymentMethod: "Выбран неверный способ оплаты (payme, click или bank_transfer_didox)",
    b2bTinNameRequired: "Для банковского перевода обязательны ИНН и наименование организации",
    orderCreateFailed: "Не удалось создать заказ",
    trialActivated: "7-дневный бесплатный пробный период Pro активирован!",
    modelSwitchFailed: "Не удалось обновить модель ИИ",
    invalidModel: "Выбрана неверная модель",
    limitReached: "Лимит AI-кредитов исчерпан. Повысьте тариф или попробуйте завтра.",
    aiUnavailable:
      "AI-сканер документов временно недоступен (Gemini API не ответил). Попробуйте позже.",
    aiLanguageInstruction,

    invalidRequest: "Неверный запрос",
    copilotError: "Ошибка запроса AI Copilot",
    invalidActionData: "Неверные данные операции",
    actionExecuteError: "Ошибка при выполнении операции",
    unknownError: "Неизвестная ошибка",
    accountCodeMissing: (code: string) =>
      `Код счёта "${code}" отсутствует в плане счетов организации`,
    transactionNotFound: "Транзакция не найдена",
    contractAddedByAi: "Добавлено через AI Агента",
    invalidDocumentRequest: "Неверный запрос документа",
    pdfProOnly:
      "Загрузка PDF доступна на тарифах Pro и Pro+. Активируйте 7-дневный бесплатный Pro-триал в разделе Подписки.",
    documentScanError: "Произошла ошибка при сканировании документа",
    defaultDocumentType: "Документ",
    defaultCounterparty: "Контрагент",
    defaultItemName: "Товар/услуга",
    defaultUnit: "шт.",
    defaultProvodkaExplanation: "Предложение проводки по НСБУ №21 подготовлено.",
    contractFallback: {
      highPenalty: (rate: number) =>
        `Обнаружена высокая пеня/штраф (${rate}% в день) — в практике РУз обычно рекомендуется 0.1%–0.4% (лимит 10–50% годовых).`,
      fullPrepayment:
        "Условие 100% предоплаты (аванса) — проверьте сроки поставки и гарантии возврата средств.",
      missingVat:
        "В договоре явно не указан НДС (12% или без НДС) — возможны расхождения при оформлении ЭСФ.",
      missingRequisites: "Проверьте наличие ИНН (9 цифр) и банковского МФО в реквизитах.",
      documentType: "Анализ договора",
      counterparty: "Сторона договора",
      explanationWithRisks: (count: number) =>
        `В договоре обнаружено ${count} потенциальных финансовых/налоговых рисков.`,
      explanationClean:
        "Явных рисков высокой пени или пропусков НДС в тексте не найдено, но перед подписанием проверьте реквизиты.",
    },
    invalidReconcileRequest: "Неверный запрос сверки",
    reconcileError: "Ошибка AI-сверки",
    reconcileAccountNames: RU_RECONCILE_ACCOUNTS,
    reconcileFallbackExplanation: ({
      status,
      bankAmount,
      oneCAmount,
      diffAmount,
      accountCode,
      accountName,
    }) => {
      if (status === "amount_mismatch") {
        return `Проверьте разницу ${Math.abs(diffAmount).toLocaleString("ru-RU")} сум между банком (${bankAmount.toLocaleString("ru-RU")}) и 1С (${oneCAmount.toLocaleString("ru-RU")}).`;
      }
      if (status === "bank_only") {
        return `Не найдено в базе 1С. Рекомендуется отнести на счёт «${accountName}» (${accountCode}).`;
      }
      return "Есть в 1С, но не найдено в загруженной банковской выписке (проверьте дату или дубликат).";
    },
    subscriptionFetchError: "Ошибка при получении данных подписки",
    orderConfirmFailed: "Ошибка при подтверждении заказа",
    orderCancelFailed: "Не удалось отменить заказ",
    b2bInvoicePurpose: (orderId: string) => `Оплата за подписку FIRMUS SaaS (${orderId}). Без НДС.`,
    b2bContractNotice:
      "Счёт-фактура будет отправлена через Didox или 1С ЭСФ, либо оплатите по указанным банковским реквизитам.",
    disposableEmailTrialForbidden:
      "Бесплатный пробный период недоступен для временных (одноразовых) почтовых адресов. Войдите с постоянным email.",
    trialActivateFailed: "Не удалось активировать пробный период",
  },
  en: {
    authRequired: "Authentication required",
    systemError: "System error",
    entityNotFoundOrForbidden: "Business entity not found or access denied",
    roleInsufficient: (role: string) =>
      `Your role (${role}) does not have permission to execute financial actions`,
    proposalRejected: "Proposal rejected and recorded in the audit log.",
    actionAppliedAudit:
      "Action verified on the server, saved to Supabase, and recorded in the audit log!",
    invalidImageFormat: "Invalid image format. Please upload PNG, JPG, or WEBP only.",
    uploadOrEnterContract: "Upload an image/PDF or enter contract text to analyze",
    pdfExceedsLimit: (planName: string, maxMb: number) =>
      `PDF size must not exceed the ${planName} plan limit (${maxMb} MB).`,
    imageExceedsLimit: (planName: string, maxMb: number) =>
      `Image size exceeds the ${planName} plan limit (${maxMb} MB).`,
    orderIdRequired: "orderId is required",
    manualConfirmForbidden: "Manual order confirmation is forbidden in live payment mode",
    orderNotFound: "Order not found",
    orderAlreadyPaid: "Order has already been paid",
    orderActivated: "Plan activated successfully!",
    invalidPlanId: "Invalid plan selected (must be professional or pro_plus)",
    invalidBillingCycle: "Invalid billing cycle selected (monthly or annual)",
    invalidPaymentMethod: "Invalid payment method selected (payme, click, or bank_transfer_didox)",
    b2bTinNameRequired: "Organization TIN and company name are required for bank transfer",
    orderCreateFailed: "Failed to create checkout order",
    trialActivated: "7-day free Pro trial activated!",
    modelSwitchFailed: "Failed to update AI model",
    invalidModel: "Invalid model selected",
    limitReached: "AI credit limit reached. Upgrade your plan or try again tomorrow.",
    aiUnavailable:
      "AI document scanner is temporarily busy (Gemini API did not respond). Please try again shortly.",
    aiLanguageInstruction,

    invalidRequest: "Invalid request",
    copilotError: "AI Copilot request failed",
    invalidActionData: "Invalid action payload",
    actionExecuteError: "Failed to execute action",
    unknownError: "Unknown error",
    accountCodeMissing: (code: string) =>
      `Account code "${code}" does not exist in the entity chart of accounts`,
    transactionNotFound: "Transaction not found",
    contractAddedByAi: "Added via AI Agent",
    invalidDocumentRequest: "Invalid document scan request",
    pdfProOnly:
      "PDF upload is available on Pro and Pro+ plans. Activate a 7-day free Pro trial in Subscriptions.",
    documentScanError: "An error occurred while scanning the document",
    defaultDocumentType: "Document",
    defaultCounterparty: "Counterparty",
    defaultItemName: "Goods/Services",
    defaultUnit: "pcs",
    defaultProvodkaExplanation: "Journal entry proposal prepared per NAS #21.",
    contractFallback: {
      highPenalty: (rate: number) =>
        `High daily penalty (${rate}% per day) detected — Uzbekistan practice typically recommends 0.1%–0.4% (10–50% annual cap).`,
      fullPrepayment:
        "100% advance payment clause — verify delivery deadlines and refund guarantees.",
      missingVat:
        "VAT status (12% or VAT-exempt) is not explicitly specified in the contract — may cause e-invoice discrepancies.",
      missingRequisites: "Verify that TIN (9 digits) and bank MFO are included in party details.",
      documentType: "Contract analysis",
      counterparty: "Contract party",
      explanationWithRisks: (count: number) =>
        `Detected ${count} potential financial/tax risks in the contract.`,
      explanationClean:
        "No obvious high-penalty or VAT gaps detected in the text, though please verify party details before signing.",
    },
    invalidReconcileRequest: "Invalid reconciliation request",
    reconcileError: "AI reconciliation failed",
    reconcileAccountNames: EN_RECONCILE_ACCOUNTS,
    reconcileFallbackExplanation: ({
      status,
      bankAmount,
      oneCAmount,
      diffAmount,
      accountCode,
      accountName,
    }) => {
      if (status === "amount_mismatch") {
        return `Check the ${Math.abs(diffAmount).toLocaleString("en-US")} UZS discrepancy between bank (${bankAmount.toLocaleString("en-US")}) and 1C (${oneCAmount.toLocaleString("en-US")}).`;
      }
      if (status === "bank_only") {
        return `Not found in 1C. Recommended to post to "${accountName}" (${accountCode}).`;
      }
      return "Present in 1C but missing from the uploaded bank statement (check date or duplicate entries).";
    },
    subscriptionFetchError: "Failed to load subscription details",
    orderConfirmFailed: "Failed to confirm order",
    orderCancelFailed: "Failed to cancel order",
    b2bInvoicePurpose: (orderId: string) => `Payment for FIRMUS SaaS subscription (${orderId}). VAT-exempt.`,
    b2bContractNotice:
      "An e-invoice will be sent via Didox or 1C E-SF, or transfer to the specified bank account.",
    disposableEmailTrialForbidden:
      "Free trial is not available for disposable/temporary email addresses. Please sign in with a permanent email.",
    trialActivateFailed: "Failed to activate free trial",
  },
};

export function getApiMessages(locale: Locale): ApiMessages {
  return API_DICTIONARIES[locale] || API_DICTIONARIES.uz;
}

export function localizeServerError(message: string, locale: Locale): string {
  if (!message || locale === "uz") return message;

  // 1. Burst rate limit
  const burstMatch = message.match(/(\d+)\s*soniyadan keyin qayta urinib koʻring/);
  if (burstMatch) {
    const sec = burstMatch[1];
    return locale === "ru"
      ? `Слишком много запросов. Повторите попытку через ${sec} сек.`
      : `Too many requests. Please try again in ${sec} seconds.`;
  }

  // 2. Pro/Pro+ model restriction
  const proModelMatch = message.match(/^(.+?)\s+modeli faqat Pro va Pro\+ tariflarida mavjud/);
  if (proModelMatch) {
    const label = proModelMatch[1];
    return locale === "ru"
      ? `Модель ${label} доступна только на тарифах Pro и Pro+. Активируйте 7-дневный бесплатный пробный период в разделе Подписки.`
      : `${label} is only available on Pro and Pro+ plans. Activate a 7-day free trial in Subscriptions.`;
  }

  // 3. Model unavailable on current plan
  const unavailModelMatch = message.match(/^(.+?)\s+modeli joriy tarifingizda mavjud emas/);
  if (unavailModelMatch) {
    const label = unavailModelMatch[1];
    return locale === "ru"
      ? `Модель ${label} недоступна на вашем текущем тарифе.`
      : `${label} is not available on your current plan.`;
  }

  // 4. Daily / Monthly credit limits
  const dailyLimitMatch = message.match(/Bugungi kunlik AI kredit limitingiz tugadi \((\d+)\/(\d+)\)/);
  if (dailyLimitMatch) {
    const [, used, limit] = dailyLimitMatch;
    return locale === "ru"
      ? `Дневной лимит AI-кредитов исчерпан (${used}/${limit}). Попробуйте завтра или перейдите на более высокий тариф.`
      : `Daily AI credit limit reached (${used}/${limit}). Try again tomorrow or upgrade your plan.`;
  }

  const monthlyLimitMatch = message.match(/Oylik AI kredit limitingiz tugadi \((\d+)\/(\d+)\)/);
  if (monthlyLimitMatch) {
    const [, used, limit] = monthlyLimitMatch;
    return locale === "ru"
      ? `Месячный лимит AI-кредитов исчерпан (${used}/${limit}). Повысьте тариф в разделе Подписки.`
      : `Monthly AI credit limit reached (${used}/${limit}). Upgrade your plan in Subscriptions.`;
  }

  // 5. Credit balance check error
  if (message.includes("Kredit balansini tekshirishda tizim xatoligi")) {
    return locale === "ru"
      ? "Системная ошибка при проверке баланса кредитов."
      : "System error while checking AI credit balance.";
  }

  // 6. Trial RPC exceptions
  if (message.includes("7 kunlik bepul Pro sinov muddati ushbu hisobda avval faollashtirilgan")) {
    return locale === "ru"
      ? "7-дневный бесплатный Pro-триал уже был активирован на этом аккаунте."
      : "The 7-day free Pro trial has already been used on this account.";
  }
  if (message.includes("Sizda allaqachon faol pullik tarif mavjud")) {
    return locale === "ru"
      ? "У вас уже есть активный платный тариф."
      : "You already have an active paid subscription plan.";
  }
  if (message.includes("Ushbu elektron pochta manzili bilan bepul sinov avval ishlatilgan")) {
    return locale === "ru"
      ? "Бесплатный пробный период уже использовался с этим адресом электронной почты."
      : "A free trial has already been claimed with this email address.";
  }
  if (message.includes("Ushbu qurilmada bepul sinov muddati avval faollashtirilgan")) {
    return locale === "ru"
      ? "Бесплатный пробный период уже был активирован на этом устройстве."
      : "A free trial has already been activated on this device.";
  }
  if (message.includes("bepul sinov limiti tugagan")) {
    return locale === "ru"
      ? "Лимит бесплатных пробных периодов для вашей сети (IP) исчерпан. Вы можете оформить тариф Pro."
      : "Free trial limit reached for this network (IP). You can upgrade directly to Pro.";
  }
  if (message.includes("Sinov muddatini yoqib boʻlmadi")) {
    return locale === "ru"
      ? "Не удалось активировать пробный период."
      : "Failed to activate free trial.";
  }

  // 7. Checkout / Billing RPC exceptions
  if (message.includes("Sizda hozir yuqoriroq tarif faol")) {
    return locale === "ru"
      ? "У вас уже активен более высокий тариф. Понизить тариф можно после окончания срока действия."
      : "You currently have a higher plan active. You can downgrade after the current period expires.";
  }
  if (message.includes("Ushbu tarif allaqachon toʻlangan va hozir faol")) {
    return locale === "ru"
      ? "Этот тариф уже оплачен и активен! Повторная оплата не требуется."
      : "This plan is already paid and active! No duplicate payment is required.";
  }
  if (message.includes("Buyurtma bekor qilingan yoki muddati oʻtgan")) {
    return locale === "ru"
      ? "Заказ отменён или срок его действия истёк."
      : "Order was cancelled or has expired.";
  }
  if (message.includes("Order topilmadi") || message.includes("Buyurtma topilmadi")) {
    return locale === "ru" ? "Заказ не найден." : "Order not found.";
  }
  if (message.includes("Notoʻgʻri tarif")) {
    return locale === "ru" ? "Выбран неверный тариф." : "Invalid subscription plan.";
  }
  if (message.includes("Notoʻgʻri toʻlov davri")) {
    return locale === "ru" ? "Неверный период оплаты." : "Invalid billing cycle.";
  }
  if (message.includes("Notoʻgʻri toʻlov tizimi")) {
    return locale === "ru" ? "Неверный способ оплаты." : "Invalid payment method.";
  }
  if (message.includes("Buyurtma yaratib boʻlmadi")) {
    return locale === "ru" ? "Не удалось создать заказ." : "Failed to create checkout order.";
  }

  // 8. Auth / permission / Zod exceptions
  if (message.includes("Autentifikatsiya talab qilinadi")) {
    return locale === "ru" ? "Требуется аутентификация" : "Authentication required";
  }
  if (message.includes("Ruxsat yo")) {
    return locale === "ru" ? "Доступ запрещён" : "Access denied";
  }
  if (message.includes("Savol matni boʻsh boʻlishi mumkin emas")) {
    return locale === "ru" ? "Текст вопроса не может быть пустым" : "Message text cannot be empty";
  }
  if (message.includes("Notoʻgʻri korxona ID")) {
    return locale === "ru" ? "Неверный ID организации" : "Invalid business entity ID";
  }
  if (message.includes("talab qilinadi")) {
    return locale === "ru"
      ? "Не указаны обязательные параметры запроса"
      : "Required request parameters are missing";
  }

  return message;
}
