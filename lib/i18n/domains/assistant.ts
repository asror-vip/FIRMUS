import type { Locale } from "../types";
import { getTurnoverRateRangeLabel } from "@/lib/services/uz-tax-calculator";

const TURNOVER_RATE_RANGE = getTurnoverRateRangeLabel();

export interface AssistantDictionary {
  header: {
    title: string;
    trialActive: string;
    trialAvailable: (planName: string) => string;
    toolTitles: {
      chat: string;
      scan: string;
      calc: string;
      contract: string;
      history: string;
    };
  };
  tabs: {
    chat: string;
    scan: string;
    calc: string;
    contract: string;
    history: string;
    mobile: {
      chat: string;
      scan: string;
      calc: string;
      contract: string;
      history: string;
    };
  };
  chat: {
    hideHistory: string;
    showHistory: string;
    savedThread: string;
    newThread: string;
    newChat: string;
    emptyGreeting: string;
    uploadedImageAlt: string;
    imageSentPrefix: string;
    imageSentDefaultName: string;
    cachedFromHistoryPrefix: string;
    scanPreparedFallback: string;
    approve: string;
    reject: string;
    postedToLedger: string;
    rejected: string;
  };
  scan: {
    uploadTitle: string;
    uploadDescPdf: (maxMb: number) => string;
    uploadDescImagesOnly: string;
    selectFilePdf: string;
    selectFileImage: string;
    uploadedDocAlt: string;
    analyzeButton: string;
    resultTitle: string;
    emptyResult: string;
    defaultDocLabel: string;
    fields: {
      docType: string;
      date: string;
      counterparty: string;
      tin: string;
      notDetected: string;
      totalAmount: string;
      vat12: string;
    };
    entryPrefix: string;
    vatTag: string;
    table: {
      item: string;
      mxik: string;
      amount: string;
    };
    copyTemplate: {
      counterparty: string;
      tin: string;
      totalAmount: string;
      vat12: string;
      entry: string;
    };
    copyResult: string;
    postToLedger: string;
    savedDocsTitle: string;
    noSavedDocs: string;
    savedTable: {
      docCounterparty: string;
    };
    paginationItemLabel: string;
  };
  calc: {
    debitAbbr: string;
    creditAbbr: string;
    payroll: {
      title: string;
      taxArticleRef: string;
      grossToNet: string;
      netToGross: string;
      amountPlaceholder: string;
      grossLabel: string;
      pitLabel: string;
      netLabel: string;
      socialTaxLabel: string;
      totalEmployerCostLabel: string;
      entriesLabel: string;
      entryDescriptions: Record<string, string>;
    };
    vat: {
      title: string;
      taxArticleRef: string;
      extractMode: string;
      addMode: string;
      netLabel: string;
      vatLabel: string;
      totalLabel: string;
    };
    other: {
      title: string;
      turnoverTitle: (ratePercent: number) => string;
      turnoverTaxLabel: string;
      turnoverThresholdLabel: string;
      turnoverExceedsWarning: string;
      turnoverStatuses: {
        llc: string;
        yatt: string;
        self_employed: string;
      };
      vacationTitle: (days: number) => string;
      vacationNetLabel: string;
    };
  };
  contract: {
    uploadTitle: string;
    attachPdfOrImage: (maxMb: number) => string;
    attachImageOnly: string;
    textareaPlaceholder: string;
    analyzeButton: string;
    resultTitle: string;
    emptyResult: string;
    noRisksFound: string;
    batchTitlePrefix: string;
    textCheckFallback: string;
  };
  history: {
    title: string;
    descMultiCompany: string;
    descSingleCompany: string;
    filters: {
      all: string;
      reconcile: string;
      document_scan: string;
      contract_risk: string;
    };
    monthLabel: string;
    loading: string;
    emptyNoEntity: string;
    emptyNoItems: string;
    table: {
      type: string;
      nameFile: string;
    };
    paginationItemLabel: string;
  };
  table: {
    month: string;
    amount: string;
    status: string;
    action: string;
  };
  statuses: {
    postedToLedger: string;
    reviewed: string;
  };
  actions: {
    open: string;
    delete: string;
  };
  toasts: {
    invalidImageFormat: string;
    aiNoResponse: string;
    aiResponseErrorPrefix: string;
    selectEntityForLedger: string;
    scanPostedToLedger: string;
    ledgerWriteErrorPrefix: string;
    actionExecuteFailed: string;
    proposalPostedToLedger: string;
    proposalRejected: string;
    fileReadError: string;
    pdfProOnly: string;
    pdfSizeLimit: (planName: string, maxMb: number) => string;
    invalidScanFileFormat: string;
    selectScanFileFirst: string;
    docAnalyzeFailed: string;
    docCachedHit: string;
    docScannedSuccess: string;
    scanErrorPrefix: string;
    amountMustBePositive: string;
    contractPdfProOnly: string;
    invalidContractFileFormat: string;
    contractInputRequired: string;
    contractLengthLimit: (planName: string, maxCharsFormatted: string) => string;
    contractAnalyzeFailed: string;
    contractCachedHit: string;
    contractAnalyzedSuccess: string;
    contractErrorPrefix: string;
    savedDocNotFound: string;
    savedDocOpened: string;
    savedContractOpened: string;
    openErrorPrefix: string;
    resultCopied: string;
    copyFailed: string;
    deletedFromHistory: string;
  };
}

export const assistantDict: Record<Locale, AssistantDictionary> = {
  uz: {
    header: {
      title: "AI Yordamchi",
      trialActive: "Pro (Sinov)",
      trialAvailable: (planName) => `${planName} • 7 kun bepul Pro`,
      toolTitles: {
        chat: "AI Chat",
        scan: "Faktura / Chek Skaner",
        calc: "Kalkulyator",
        contract: "Shartnoma tahlili",
        history: "Saqlangan tarix",
      },
    },
    tabs: {
      chat: "AI Chat",
      scan: "Faktura / Chek Skaner",
      calc: "Kalkulyator",
      contract: "Shartnoma tahlili",
      history: "Tarix",
      mobile: {
        chat: "AI Chat",
        scan: "Skaner",
        calc: "Kalkulyator",
        contract: "Shartnoma",
        history: "Tarix",
      },
    },
    chat: {
      hideHistory: "Chatlar tarixini yopish",
      showHistory: "Chatlar tarixini ochish",
      savedThread: "Saqlangan suhbat",
      newThread: "Yangi suhbat",
      newChat: "Yangi chat",
      emptyGreeting: "Xush kelibsiz. Nima yordam bera olaman?",
      uploadedImageAlt: "Yuklangan rasm",
      imageSentPrefix: "📷 Rasm yuborildi:",
      imageSentDefaultName: "hujjat",
      cachedFromHistoryPrefix: "(Tarixdan topildi — 0 kredit) ",
      scanPreparedFallback: "Provodka tayyorlandi.",
      approve: "Tasdiqlash",
      reject: "Rad etish",
      postedToLedger: "Bosh kitobga yozildi",
      rejected: "Bekor qilindi",
    },
    scan: {
      uploadTitle: "Faktura, TTN yoki Chek yuklash",
      uploadDescPdf: (maxMb) => `PNG, JPG, WEBP yoki PDF (max ${maxMb} MB)`,
      uploadDescImagesOnly: "PNG, JPG, WEBP (PDF uchun Pro tarif)",
      selectFilePdf: "Rasm yoki PDF tanlash",
      selectFileImage: "Rasm tanlash (PNG, JPG, WEBP)",
      uploadedDocAlt: "Yuklangan hujjat",
      analyzeButton: "Tahlil qilish",
      resultTitle: "Natija",
      emptyResult: "Hujjat tanlanmagan",
      defaultDocLabel: "Hujjat",
      fields: {
        docType: "Hujjat turi",
        date: "Sana",
        counterparty: "Kontragent",
        tin: "STIR",
        notDetected: "Aniqlanmadi",
        totalAmount: "Jami summa",
        vat12: "QQS (12%)",
      },
      entryPrefix: "Provodka",
      vatTag: "QQS",
      table: {
        item: "Tovar / Xizmat",
        mxik: "MXIK",
        amount: "Summa",
      },
      copyTemplate: {
        counterparty: "Kontragent",
        tin: "STIR",
        totalAmount: "Jami summa",
        vat12: "QQS 12%",
        entry: "Provodka",
      },
      copyResult: "Natijani nusxalash",
      postToLedger: "Bosh kitobga atomik yozish",
      savedDocsTitle: "Saqlangan hujjatlar",
      noSavedDocs: "Hali saqlangan chek yoki fakturalar yoʻq.",
      savedTable: {
        docCounterparty: "Hujjat / Kontragent",
      },
      paginationItemLabel: "hujjat",
    },
    calc: {
      debitAbbr: "Dt",
      creditAbbr: "Kt",
      payroll: {
        title: "Ish haqi va soliq kalkulyatori (JShDS 12%)",
        taxArticleRef: "Soliq kodeksi 381-modda (JShDS 12%) va 405-modda (Ijtimoiy soliq 12%)",
        grossToNet: "Brutto → Qoʻlga tegadi",
        netToGross: "Qoʻlga tegadi → Brutto",
        amountPlaceholder: "Summa",
        grossLabel: "Hisoblangan (Brutto):",
        pitLabel: "JShDS (12%, shundan 0.1% INPS):",
        netLabel: "Xodim qoʻliga tegadi (Netto):",
        socialTaxLabel: "Ish beruvchi ijtimoiy soligʻi (12%):",
        totalEmployerCostLabel: "Ish beruvchining jami xarajati:",
        entriesLabel: "Provodkalar:",
        entryDescriptions: {
          "9420-6710": "Ish haqi hisoblandi (Brutto)",
          "6710-6410": "JShDS 12% ushlandi (0.1% ShJBPH ichida)",
          "9420-6520": "Ijtimoiy soliq 12% (ish beruvchi)",
          "6710-5110": "Xodim kartasiga toʻlandi (Netto)",
        },
      },
      vat: {
        title: "QQS (12%) tezkor hisoblagich",
        taxArticleRef: "Soliq kodeksi 258-modda (QQS stavkasi 12%)",
        extractMode: "Ichidan QQS ajratish (×12/112)",
        addMode: "Ustiga 12% QQS qoʻshish",
        netLabel: "QQSsiz sof",
        vatLabel: "QQS 12%",
        totalLabel: "Jami",
      },
      other: {
        title: `Aylanmadan soliq (${TURNOVER_RATE_RANGE}) va Taʼtil puli`,
        turnoverTitle: (ratePercent) => `Aylanmadan soliq (${ratePercent}%)`,
        turnoverTaxLabel: "Soliq (9430/6410):",
        turnoverThresholdLabel: "Yillik chegara:",
        turnoverExceedsWarning: "Chegaradan oshdi — QQS/umumiy rejim talab etilishi mumkin",
        turnoverStatuses: {
          llc: "MChJ",
          yatt: "YaTT",
          self_employed: "Oʻzini band",
        },
        vacationTitle: (days) => `Taʼtil puli (${days} kun)`,
        vacationNetLabel: "Qoʻliga tegadi:",
      },
    },
    contract: {
      uploadTitle: "Shartnoma yuklash",
      attachPdfOrImage: (maxMb) => `PDF yoki rasm biriktirish (max ${maxMb} MB)`,
      attachImageOnly: "Rasm biriktirish (PDF uchun Pro tarif)",
      textareaPlaceholder: "Shartnoma matni",
      analyzeButton: "Tekshirish",
      resultTitle: "Natija",
      emptyResult: "Hujjat kiritilmagan",
      noRisksFound: "Kritik moliyaviy yoki soliq xatari topilmadi.",
      batchTitlePrefix: "Shartnoma",
      textCheckFallback: "Matnli tekshiruv",
    },
    history: {
      title: "Saqlangan ishlar tarixi",
      descMultiCompany:
        "Korxona va oy kesimida barcha yuklangan bank/1C fayllari, chek skanerlari va shartnomalar (sahifada 10 tadan bazadan yuklanadi).",
      descSingleCompany:
        "Oy kesimida barcha bank/1C solishtirishlari, chek skanerlari va shartnomalar (sahifada 10 tadan bazadan yuklanadi).",
      filters: {
        all: "Barchasi",
        reconcile: "Bank ↔ 1C",
        document_scan: "Chek / Faktura",
        contract_risk: "Shartnoma",
      },
      monthLabel: "Oy:",
      loading: "Tarix yuklanmoqda...",
      emptyNoEntity: "Tarixni koʻrish uchun yuqoridan korxona tanlang.",
      emptyNoItems: "Hozircha saqlangan ishlar tarixi yoʻq. Chek rasmini yuboring yoki Bank ↔ 1C fayl yuklang.",
      table: {
        type: "Turi",
        nameFile: "Nomi / Fayl",
      },
      paginationItemLabel: "ish",
    },
    table: {
      month: "Oy",
      amount: "Summa",
      status: "Holat",
      action: "Amal",
    },
    statuses: {
      postedToLedger: "Bosh kitobda",
      reviewed: "Tekshirilgan",
    },
    actions: {
      open: "Ochish",
      delete: "Oʻchirish",
    },
    toasts: {
      invalidImageFormat: "Rasm formati toʻgʻri emas. Faqat PNG, JPG yoki WEBP rasm yuklang.",
      aiNoResponse: "AI javob qaytarmadi",
      aiResponseErrorPrefix: "AI javobida xatolik",
      selectEntityForLedger: "Bosh kitobga yozish uchun yuqoridan korxona qoʻshing",
      scanPostedToLedger: "Faktura/chek provodkasi Bosh kitobga atomik tarzda yozildi!",
      ledgerWriteErrorPrefix: "Bosh kitobga yozishda xatolik",
      actionExecuteFailed: "Amalni bajarib boʻlmadi",
      proposalPostedToLedger: "Provodka Bosh kitobga yozildi!",
      proposalRejected: "Taklif bekor qilindi.",
      fileReadError: "Faylni oʻqib boʻlmadi",
      pdfProOnly:
        "PDF yuklash Pro va Pro+ tariflarida mavjud. Obunalar boʻlimidan 7 kunlik bepul sinovni yoqing.",
      pdfSizeLimit: (planName, maxMb) =>
        `PDF hajmi ${planName} tarifi limiti (${maxMb} MB) dan oshmasligi kerak`,
      invalidScanFileFormat: "Rasm yoki PDF formati notoʻgʻri. PNG, JPG, WEBP yoki PDF yuklang.",
      selectScanFileFirst: "Avval faktura, chek yoki TTN rasmini (yoki PDF) tanlang",
      docAnalyzeFailed: "Hujjatni tahlil qilib boʻlmadi",
      docCachedHit: "Ushbu hujjat avval oʻqilgan — tarixdan olindi (0 kredit)!",
      docScannedSuccess: "Hujjat oʻqildi!",
      scanErrorPrefix: "Skaner xatosi",
      amountMustBePositive: "Yozish uchun summa > 0 boʻlishi kerak",
      contractPdfProOnly:
        "Shartnoma PDF yuklash Pro va Pro+ tariflarida mavjud. Obunalar boʻlimidan 7 kunlik bepul sinovni yoqing.",
      invalidContractFileFormat: "Shartnoma uchun faqat PNG, JPG, WEBP rasm yoki PDF fayl yuklang.",
      contractInputRequired: "Shartnoma matnini joylashtiring yoki PDF/rasm fayl yuklang",
      contractLengthLimit: (planName, maxCharsFormatted) =>
        `Shartnoma matni ${planName} tarifi limiti (${maxCharsFormatted} belgi) dan oshib ketdi.`,
      contractAnalyzeFailed: "Shartnomani tahlil qilib boʻlmadi",
      contractCachedHit: "Ushbu shartnoma avval tekshirilgan — tarixdan olindi (0 kredit)!",
      contractAnalyzedSuccess: "Shartnoma xatarlari tahlil qilindi!",
      contractErrorPrefix: "Tahlilda xatolik",
      savedDocNotFound: "Saqlangan hujjat maʼlumoti topilmadi",
      savedDocOpened: "Saqlangan hujjat ochildi",
      savedContractOpened: "Saqlangan shartnoma tahlili ochildi",
      openErrorPrefix: "Ochishda xatolik",
      resultCopied: "Natija va provodka nusxalandi",
      copyFailed: "Nusxalab boʻlmadi",
      deletedFromHistory: "Tarixdan oʻchirildi",
    },
  },
  ru: {
    header: {
      title: "AI Ассистент",
      trialActive: "Pro (Пробный)",
      trialAvailable: (planName) => `${planName} • 7 дней Pro бесплатно`,
      toolTitles: {
        chat: "AI Чат",
        scan: "Сканер счетов / чеков",
        calc: "Калькулятор",
        contract: "Анализ договора",
        history: "Сохраненная история",
      },
    },
    tabs: {
      chat: "AI Чат",
      scan: "Сканер счетов / чеков",
      calc: "Калькулятор",
      contract: "Анализ договора",
      history: "История",
      mobile: {
        chat: "AI Чат",
        scan: "Сканер",
        calc: "Калькулятор",
        contract: "Договор",
        history: "История",
      },
    },
    chat: {
      hideHistory: "Скрыть историю чатов",
      showHistory: "Открыть историю чатов",
      savedThread: "Сохраненный диалог",
      newThread: "Новый диалог",
      newChat: "Новый чат",
      emptyGreeting: "Добро пожаловать. Чем могу помочь?",
      uploadedImageAlt: "Загруженное изображение",
      imageSentPrefix: "📷 Отправлено изображение:",
      imageSentDefaultName: "документ",
      cachedFromHistoryPrefix: "(Найдено в истории — 0 кредитов) ",
      scanPreparedFallback: "Проводка подготовлена.",
      approve: "Подтвердить",
      reject: "Отклонить",
      postedToLedger: "Проведено в Главную книгу",
      rejected: "Отменено",
    },
    scan: {
      uploadTitle: "Загрузка счет-фактуры, ТТН или чека",
      uploadDescPdf: (maxMb) => `PNG, JPG, WEBP или PDF (макс. ${maxMb} МБ)`,
      uploadDescImagesOnly: "PNG, JPG, WEBP (PDF доступен на тарифе Pro)",
      selectFilePdf: "Выбрать изображение или PDF",
      selectFileImage: "Выбрать изображение (PNG, JPG, WEBP)",
      uploadedDocAlt: "Загруженный документ",
      analyzeButton: "Анализировать",
      resultTitle: "Результат",
      emptyResult: "Документ не выбран",
      defaultDocLabel: "Документ",
      fields: {
        docType: "Тип документа",
        date: "Дата",
        counterparty: "Контрагент",
        tin: "ИНН",
        notDetected: "Не определен",
        totalAmount: "Итого сумма",
        vat12: "НДС (12%)",
      },
      entryPrefix: "Проводка",
      vatTag: "НДС",
      table: {
        item: "Товар / Услуга",
        mxik: "ИКПУ",
        amount: "Сумма",
      },
      copyTemplate: {
        counterparty: "Контрагент",
        tin: "ИНН",
        totalAmount: "Итого сумма",
        vat12: "НДС 12%",
        entry: "Проводка",
      },
      copyResult: "Копировать результат",
      postToLedger: "Атомарно провести в Главную книгу",
      savedDocsTitle: "Сохраненные документы",
      noSavedDocs: "Пока нет сохраненных чеков или счет-фактур.",
      savedTable: {
        docCounterparty: "Документ / Контрагент",
      },
      paginationItemLabel: "документов",
    },
    calc: {
      debitAbbr: "Дт",
      creditAbbr: "Кт",
      payroll: {
        title: "Калькулятор зарплаты и налогов (НДФЛ 12%)",
        taxArticleRef: "Налоговый кодекс ст. 381 (НДФЛ 12%) и ст. 405 (Соц. налог 12%)",
        grossToNet: "Брутто → На руки",
        netToGross: "На руки → Брутто",
        amountPlaceholder: "Сумма",
        grossLabel: "Начислено (Брутто):",
        pitLabel: "НДФЛ (12%, из них 0,1% ИНПС):",
        netLabel: "Сотруднику на руки (Нетто):",
        socialTaxLabel: "Социальный налог работодателя (12%):",
        totalEmployerCostLabel: "Общие расходы работодателя:",
        entriesLabel: "Проводки:",
        entryDescriptions: {
          "9420-6710": "Начислена заработная плата (Брутто)",
          "6710-6410": "Удержан НДФЛ 12% (включая 0,1% ИНПС)",
          "9420-6520": "Социальный налог 12% (работодатель)",
          "6710-5110": "Выплачено на карту сотрудника (Нетто)",
        },
      },
      vat: {
        title: "Быстрый калькулятор НДС (12%)",
        taxArticleRef: "Налоговый кодекс ст. 258 (ставка НДС 12%)",
        extractMode: "Выделить НДС из суммы (×12/112)",
        addMode: "Начислить 12% НДС сверху",
        netLabel: "Сумма без НДС",
        vatLabel: "НДС 12%",
        totalLabel: "Итого",
      },
      other: {
        title: `Налог с оборота (${TURNOVER_RATE_RANGE}) и Отпускные`,
        turnoverTitle: (ratePercent) => `Налог с оборота (${ratePercent}%)`,
        turnoverTaxLabel: "Налог (9430/6410):",
        turnoverThresholdLabel: "Годовой порог:",
        turnoverExceedsWarning: "Порог превышен — может потребоваться переход на НДС",
        turnoverStatuses: {
          llc: "ООО",
          yatt: "ИП",
          self_employed: "Самозанятый",
        },
        vacationTitle: (days) => `Отпускные (${days} дн.)`,
        vacationNetLabel: "На руки:",
      },
    },
    contract: {
      uploadTitle: "Загрузка договора",
      attachPdfOrImage: (maxMb) => `Прикрепить PDF или изображение (макс. ${maxMb} МБ)`,
      attachImageOnly: "Прикрепить изображение (PDF на тарифе Pro)",
      textareaPlaceholder: "Текст договора",
      analyzeButton: "Проверить",
      resultTitle: "Результат",
      emptyResult: "Документ не загружен",
      noRisksFound: "Критических финансовых или налоговых рисков не выявлено.",
      batchTitlePrefix: "Договор",
      textCheckFallback: "Текстовая проверка",
    },
    history: {
      title: "История сохраненных работ",
      descMultiCompany:
        "Все загруженные файлы банка/1С, сканы чеков и договоры по компаниям и месяцам (загружается по 10 записей из базы).",
      descSingleCompany:
        "Все сверки банка/1С, сканы чеков и договоры по месяцам (загружается по 10 записей из базы).",
      filters: {
        all: "Все",
        reconcile: "Банк ↔ 1С",
        document_scan: "Чек / Фактура",
        contract_risk: "Договор",
      },
      monthLabel: "Месяц:",
      loading: "Загрузка истории...",
      emptyNoEntity: "Выберите компанию выше, чтобы просмотреть историю.",
      emptyNoItems: "История сохраненных работ пока пуста. Отправьте фото чека или загрузите файл Банк ↔ 1С.",
      table: {
        type: "Тип",
        nameFile: "Название / Файл",
      },
      paginationItemLabel: "записей",
    },
    table: {
      month: "Месяц",
      amount: "Сумма",
      status: "Статус",
      action: "Действие",
    },
    statuses: {
      postedToLedger: "В Главной книге",
      reviewed: "Проверено",
    },
    actions: {
      open: "Открыть",
      delete: "Удалить",
    },
    toasts: {
      invalidImageFormat: "Неверный формат изображения. Загрузите только PNG, JPG или WEBP.",
      aiNoResponse: "AI не вернул ответ",
      aiResponseErrorPrefix: "Ошибка ответа AI",
      selectEntityForLedger: "Выберите или добавьте компанию выше для записи в Главную книгу",
      scanPostedToLedger: "Проводка по счет-фактуре/чеку атомарно записана в Главную книгу!",
      ledgerWriteErrorPrefix: "Ошибка записи в Главную книгу",
      actionExecuteFailed: "Не удалось выполнить действие",
      proposalPostedToLedger: "Проводка записана в Главную книгу!",
      proposalRejected: "Предложение отклонено.",
      fileReadError: "Не удалось прочитать файл",
      pdfProOnly:
        "Загрузка PDF доступна на тарифах Pro и Pro+. Активируйте 7-дневный бесплатный пробный период в разделе Подписка.",
      pdfSizeLimit: (planName, maxMb) =>
        `Размер PDF не должен превышать лимит тарифа ${planName} (${maxMb} МБ)`,
      invalidScanFileFormat: "Неверный формат изображения или PDF. Загрузите PNG, JPG, WEBP или PDF.",
      selectScanFileFirst: "Сначала выберите изображение счет-фактуры, чека или ТТН (или PDF)",
      docAnalyzeFailed: "Не удалось проанализировать документ",
      docCachedHit: "Этот документ уже был распознан — загружено из истории (0 кредитов)!",
      docScannedSuccess: "Документ распознан!",
      scanErrorPrefix: "Ошибка сканера",
      amountMustBePositive: "Для проведения сумма должна быть > 0",
      contractPdfProOnly:
        "Загрузка PDF договора доступна на тарифах Pro и Pro+. Активируйте 7-дневный бесплатный пробный период в разделе Подписка.",
      invalidContractFileFormat: "Для договора загрузите только изображение PNG, JPG, WEBP или файл PDF.",
      contractInputRequired: "Вставьте текст договора или загрузите PDF/изображение",
      contractLengthLimit: (planName, maxCharsFormatted) =>
        `Текст договора превышает лимит тарифа ${planName} (${maxCharsFormatted} символов).`,
      contractAnalyzeFailed: "Не удалось проанализировать договор",
      contractCachedHit: "Этот договор уже проверялся — загружено из истории (0 кредитов)!",
      contractAnalyzedSuccess: "Риски договора проанализированы!",
      contractErrorPrefix: "Ошибка анализа",
      savedDocNotFound: "Данные сохраненного документа не найдены",
      savedDocOpened: "Сохраненный документ открыт",
      savedContractOpened: "Сохраненный анализ договора открыт",
      openErrorPrefix: "Ошибка открытия",
      resultCopied: "Результат и проводка скопированы",
      copyFailed: "Не удалось скопировать",
      deletedFromHistory: "Удалено из истории",
    },
  },
  en: {
    header: {
      title: "AI Assistant",
      trialActive: "Pro (Trial)",
      trialAvailable: (planName) => `${planName} • 7-day free Pro`,
      toolTitles: {
        chat: "AI Chat",
        scan: "Invoice / Receipt Scanner",
        calc: "Calculator",
        contract: "Contract Analysis",
        history: "Saved History",
      },
    },
    tabs: {
      chat: "AI Chat",
      scan: "Invoice / Receipt Scanner",
      calc: "Calculator",
      contract: "Contract Analysis",
      history: "History",
      mobile: {
        chat: "AI Chat",
        scan: "Scanner",
        calc: "Calculator",
        contract: "Contract",
        history: "History",
      },
    },
    chat: {
      hideHistory: "Hide chat history",
      showHistory: "Show chat history",
      savedThread: "Saved conversation",
      newThread: "New conversation",
      newChat: "New chat",
      emptyGreeting: "Welcome. How can I help you today?",
      uploadedImageAlt: "Uploaded image",
      imageSentPrefix: "📷 Image sent:",
      imageSentDefaultName: "document",
      cachedFromHistoryPrefix: "(Found in history — 0 credits) ",
      scanPreparedFallback: "Journal entry prepared.",
      approve: "Approve",
      reject: "Reject",
      postedToLedger: "Posted to General Ledger",
      rejected: "Cancelled",
    },
    scan: {
      uploadTitle: "Upload Invoice, Waybill (TTN) or Receipt",
      uploadDescPdf: (maxMb) => `PNG, JPG, WEBP or PDF (max ${maxMb} MB)`,
      uploadDescImagesOnly: "PNG, JPG, WEBP (PDF requires Pro plan)",
      selectFilePdf: "Select image or PDF",
      selectFileImage: "Select image (PNG, JPG, WEBP)",
      uploadedDocAlt: "Uploaded document",
      analyzeButton: "Analyze",
      resultTitle: "Result",
      emptyResult: "No document selected",
      defaultDocLabel: "Document",
      fields: {
        docType: "Document type",
        date: "Date",
        counterparty: "Counterparty",
        tin: "TIN (STIR)",
        notDetected: "Not detected",
        totalAmount: "Total amount",
        vat12: "VAT (12%)",
      },
      entryPrefix: "Entry",
      vatTag: "VAT",
      table: {
        item: "Item / Service",
        mxik: "MXIK",
        amount: "Amount",
      },
      copyTemplate: {
        counterparty: "Counterparty",
        tin: "TIN",
        totalAmount: "Total amount",
        vat12: "VAT 12%",
        entry: "Entry",
      },
      copyResult: "Copy result",
      postToLedger: "Post atomically to Ledger",
      savedDocsTitle: "Saved documents",
      noSavedDocs: "No saved receipts or invoices yet.",
      savedTable: {
        docCounterparty: "Document / Counterparty",
      },
      paginationItemLabel: "documents",
    },
    calc: {
      debitAbbr: "Dr",
      creditAbbr: "Cr",
      payroll: {
        title: "Payroll & Tax Calculator (PIT 12%)",
        taxArticleRef: "Tax Code Art. 381 (PIT 12%) & Art. 405 (Social Tax 12%)",
        grossToNet: "Gross → Net (Take-home)",
        netToGross: "Net (Take-home) → Gross",
        amountPlaceholder: "Amount",
        grossLabel: "Accrued (Gross):",
        pitLabel: "PIT (12%, incl. 0.1% INPS):",
        netLabel: "Employee take-home (Net):",
        socialTaxLabel: "Employer social tax (12%):",
        totalEmployerCostLabel: "Total employer cost:",
        entriesLabel: "Journal entries:",
        entryDescriptions: {
          "9420-6710": "Salary accrued (Gross)",
          "6710-6410": "PIT 12% withheld (incl. 0.1% INPS)",
          "9420-6520": "Social tax 12% (employer)",
          "6710-5110": "Paid to employee card (Net)",
        },
      },
      vat: {
        title: "Quick VAT (12%) Calculator",
        taxArticleRef: "Tax Code Art. 258 (12% VAT rate)",
        extractMode: "Extract VAT from total (×12/112)",
        addMode: "Add 12% VAT on top",
        netLabel: "Net (excl. VAT)",
        vatLabel: "VAT 12%",
        totalLabel: "Total",
      },
      other: {
        title: `Turnover Tax (${TURNOVER_RATE_RANGE}) & Vacation Pay`,
        turnoverTitle: (ratePercent) => `Turnover tax (${ratePercent}%)`,
        turnoverTaxLabel: "Tax (9430/6410):",
        turnoverThresholdLabel: "Annual limit:",
        turnoverExceedsWarning: "Threshold exceeded — VAT/general regime may apply",
        turnoverStatuses: {
          llc: "LLC",
          yatt: "Sole Prop.",
          self_employed: "Self-emp.",
        },
        vacationTitle: (days) => `Vacation pay (${days} days)`,
        vacationNetLabel: "Take-home:",
      },
    },
    contract: {
      uploadTitle: "Upload Contract",
      attachPdfOrImage: (maxMb) => `Attach PDF or image (max ${maxMb} MB)`,
      attachImageOnly: "Attach image (PDF requires Pro plan)",
      textareaPlaceholder: "Contract text",
      analyzeButton: "Analyze Risks",
      resultTitle: "Result",
      emptyResult: "No document entered",
      noRisksFound: "No critical financial or tax risks found.",
      batchTitlePrefix: "Contract",
      textCheckFallback: "Text review",
    },
    history: {
      title: "Saved Work History",
      descMultiCompany:
        "All uploaded bank/1C files, receipt scans, and contracts by company and month (loaded 10 per page from database).",
      descSingleCompany:
        "All bank/1C reconciliations, receipt scans, and contracts by month (loaded 10 per page from database).",
      filters: {
        all: "All",
        reconcile: "Bank ↔ 1C",
        document_scan: "Receipt / Invoice",
        contract_risk: "Contract",
      },
      monthLabel: "Month:",
      loading: "Loading history...",
      emptyNoEntity: "Select a company above to view history.",
      emptyNoItems: "No saved work history yet. Send a receipt image or upload a Bank ↔ 1C file.",
      table: {
        type: "Type",
        nameFile: "Title / File",
      },
      paginationItemLabel: "items",
    },
    table: {
      month: "Month",
      amount: "Amount",
      status: "Status",
      action: "Action",
    },
    statuses: {
      postedToLedger: "In General Ledger",
      reviewed: "Reviewed",
    },
    actions: {
      open: "Open",
      delete: "Delete",
    },
    toasts: {
      invalidImageFormat: "Invalid image format. Please upload PNG, JPG, or WEBP only.",
      aiNoResponse: "AI did not return a response",
      aiResponseErrorPrefix: "AI response error",
      selectEntityForLedger: "Add or select a company above to post to the General Ledger",
      scanPostedToLedger: "Invoice/receipt entry posted atomically to the General Ledger!",
      ledgerWriteErrorPrefix: "Failed to post to General Ledger",
      actionExecuteFailed: "Could not execute action",
      proposalPostedToLedger: "Entry posted to the General Ledger!",
      proposalRejected: "Proposal cancelled.",
      fileReadError: "Could not read file",
      pdfProOnly:
        "PDF upload is available on Pro and Pro+ plans. Start a 7-day free trial in Subscription & Plans.",
      pdfSizeLimit: (planName, maxMb) =>
        `PDF size must not exceed the ${planName} plan limit (${maxMb} MB)`,
      invalidScanFileFormat: "Invalid image or PDF format. Upload PNG, JPG, WEBP, or PDF.",
      selectScanFileFirst: "Select an invoice, receipt, or waybill image (or PDF) first",
      docAnalyzeFailed: "Could not analyze document",
      docCachedHit: "This document was already scanned — loaded from history (0 credits)!",
      docScannedSuccess: "Document scanned!",
      scanErrorPrefix: "Scanner error",
      amountMustBePositive: "Amount must be > 0 to post",
      contractPdfProOnly:
        "Contract PDF upload is available on Pro and Pro+ plans. Start a 7-day free trial in Subscription & Plans.",
      invalidContractFileFormat: "For contracts, upload only PNG, JPG, WEBP images or PDF files.",
      contractInputRequired: "Paste contract text or upload a PDF/image file",
      contractLengthLimit: (planName, maxCharsFormatted) =>
        `Contract text exceeds the ${planName} plan limit (${maxCharsFormatted} characters).`,
      contractAnalyzeFailed: "Could not analyze contract",
      contractCachedHit: "This contract was already reviewed — loaded from history (0 credits)!",
      contractAnalyzedSuccess: "Contract risks analyzed!",
      contractErrorPrefix: "Analysis error",
      savedDocNotFound: "Saved document data not found",
      savedDocOpened: "Saved document opened",
      savedContractOpened: "Saved contract analysis opened",
      openErrorPrefix: "Failed to open",
      resultCopied: "Result and journal entry copied",
      copyFailed: "Could not copy",
      deletedFromHistory: "Deleted from history",
    },
  },
};

export function getAssistantDict(locale: Locale): AssistantDictionary {
  return assistantDict[locale] || assistantDict.uz;
}
