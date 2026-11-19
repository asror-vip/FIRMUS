import type { Locale } from "../types";
import { getTurnoverRateRangeLabel } from "@/lib/services/uz-tax-calculator";

const TURNOVER_RATE_RANGE = getTurnoverRateRangeLabel();

export function getIntlLocale(locale: Locale): string {
  return locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ";
}

export interface ReconcileErpDict {
  commonLoading: string;
  reconcile: {
    title: string;
    savedHistoryBtn: string;
    resetBtn: string;
    bankSectionTitle: string;
    bankFormatsHint: string;
    bankUploadPrompt: string;
    pasteFromTableBtn: string;
    operationsCountSuffix: string;
    oneCSectionTitle: string;
    oneCFormatsHint: string;
    oneCUploadPrompt: string;
    pasteBtn: string;
    siteDbBtn: string;
    recordsCountSuffix: string;
    kpiMatched: string;
    kpiMismatch: string;
    kpiBankOnly: string;
    kpiOneCOnly: string;
    totalIncomeLabel: string;
    incomeMatchedZero: string;
    totalExpenseLabel: string;
    expenseMatchedZero: string;
    diffPrefix: string;
    tabAll: string;
    tabBankOnly: string;
    tabMismatch: string;
    tabOneCOnly: string;
    tabMatched: string;
    searchPlaceholder: string;
    aiVerifyBtn: string;
    export1CTxtBtn: string;
    export1CXmlBtn: string;
    exportCsvBtn: string;
    savedBtn: string;
    saveToHistoryBtn: string;
    postToLedgerBtn: string;
    aiVerifiedNote: string;
    rulesVerifiedNote: string;
    selectAllAria: string;
    colStatus: string;
    colDate: string;
    colCounterparty: string;
    colBankAmount: string;
    colOneCAmount: string;
    colAccount: string;
    colVat: string;
    colAiNote: string;
    emptyFilteredRows: string;
    selectRowAriaSuffix: string;
    accountSelectAriaSuffix: string;
    statusMatched: string;
    statusMismatch: string;
    statusBankOnly: string;
    statusOneCOnly: string;
    stirPrefix: string;
    vatToggleTitle: string;
    vatOn: string;
    vatOff: string;
    rowItemLabel: string;
    historyTitle: string;
    historyAllMonths: string;
    historyLoading: string;
    historyEmpty: string;
    histColMonth: string;
    histColFiles: string;
    histColRows: string;
    histColBankIncome: string;
    histColBankExpense: string;
    histColStatus: string;
    histColAction: string;
    histStatusPosted: string;
    histStatusReviewed: string;
    histOpenBtn: string;
    histDeleteAria: string;
    historyItemLabel: string;
    pasteBankTitle: string;
    pasteOneCTitle: string;
    pastePlaceholder: string;
    cancelBtn: string;
    parseAndCompareBtn: string;
    modeSelected: string;
    modeMissingIn1C: string;
    modeAll: string;
    defaultCompany: string;
    defaultOperation: string;
    vatTag: string;
    accountTagPrefix: string;
    dbSourceName: string;
    pasteBankLabel: string;
    pasteOneCLabel: string;
    unknownError: string;
    toasts: {
      batchNotFound: string;
      batchLoaded: string;
      batchLoadError: string;
      noRowsParsed: string;
      rowLimitExceeded: string;
      bankRowsLoaded: string;
      oneCRowsLoaded: string;
      fileSizeExceeded: string;
      fileReadError: string;
      pasteEmpty: string;
      selectEntityFirst: string;
      dbCompared: string;
      dbReadError: string;
      addEntityToSave: string;
      personalAccountPreparing: string;
      savedToHistory: string;
      saveError: string;
      deletedFromHistory: string;
      deleteError: string;
      allMatchedInfo: string;
      aiErrorFallback: string;
      aiVerifiedSuccess: string;
      aiAnalyzeError: string;
      noExportData: string;
      exported1CTxt: string;
      noXmlExportData: string;
      exported1CXml: string;
      exportedCsv: string;
      connectEntityToPost: string;
      selectRowsToPost: string;
      postedToLedger: string;
      postLedgerError: string;
    };
  };
  erpExtra: {
    accounting: {
      defaultReversalReason: string;
      export1CXmlBtn: string;
      export1CXmlTitle: string;
      closePeriodBtn: string;
      coaCountSuffix: string;
      newCoaBtn: string;
      colCategory: string;
      colType: string;
      emptyCoa: string;
      typeActive: string;
      typePassive: string;
      typeActivePassive: string;
      coaItemLabel: string;
      colUser: string;
      loadingEntries: string;
      emptyEntries: string;
      totalEntriesPrefix: string;
      entriesWord: string;
      pageWord: string;
      prevBtn: string;
      nextBtn: string;
      stornoBtn: string;
      tbBalanced: string;
      tbUnbalanced: string;
      colOpeningBalance: string;
      turnoverSuffix: string;
      colClosingBalance: string;
      emptyTrialBalance: string;
      colDocNumber: string;
      colCorrAccount: string;
      colRunningBalance: string;
      emptyLedgerForAccount: string;
      glItemLabel: string;
      addEntryTitle: string;
      addEntryDesc: string;
      docNumberLabel: string;
      dateLabel: string;
      purposeLabel: string;
      purposePlaceholder: string;
      debitAccountLabel: string;
      creditAccountLabel: string;
      amountLabel: string;
      amountPlaceholder: string;
      savingBtn: string;
      saveEntryBtn: string;
      stornoTitle: string;
      stornoDesc: string;
      stornoReasonLabel: string;
      stornoReasonPlaceholder: string;
      cancelBtn: string;
      stornoWorkingBtn: string;
      stornoSubmitBtn: string;
      addCoaTitle: string;
      addCoaDesc: string;
      coaCodeLabel: string;
      coaCodePlaceholder: string;
      coaNameLabel: string;
      coaNamePlaceholder: string;
      coaTypeLabel: string;
      coaOptAsset: string;
      coaOptLiability: string;
      coaOptEquity: string;
      coaOptRevenue: string;
      coaOptExpense: string;
      addingBtn: string;
      saveCoaBtn: string;
      closePeriodTitle: string;
      closePeriodDesc: string;
      fromDateLabel: string;
      toDateLabel: string;
      closingBtn: string;
      closePeriodSubmitBtn: string;
      csvHeaders: [string, string, string, string, string, string, string, string];
      fallbackDebitAcc: string;
      fallbackCreditAcc: string;
      balanceErrorFallback: string;
      toasts: {
        loadEntriesError: string;
        csvExported: string;
        xmlExported: string;
        entrySaved: string;
        entrySaveError: string;
        coaCodeInvalid: string;
        coaNameTooShort: string;
        coaAdded: string;
        coaAddError: string;
        stornoReasonTooShort: string;
        stornoSuccess: string;
        stornoError: string;
        selectPeriodDates: string;
        periodAlreadyClosed: string;
        periodClosedSuccess: string;
        periodCloseError: string;
      };
    };
    transactions: {
      importBtn: string;
      export1CBtn: string;
      export1CTitle: string;
      dateFromLabel: string;
      dateToLabel: string;
      minAmountLabel: string;
      minAmountPlaceholder: string;
      clearFiltersBtn: string;
      loadingRows: string;
      emptyRows: string;
      totalPrefix: string;
      operationsWord: string;
      pageWord: string;
      prevBtn: string;
      nextBtn: string;
      txIdPrefix: string;
      reconcileBtn: string;
      approvedBtn: string;
      addTxTitle: string;
      addTxDesc: string;
      incomeTypeBtn: string;
      expenseTypeBtn: string;
      dateLabel: string;
      amountLabel: string;
      amountPlaceholder: string;
      counterpartyLabel: string;
      counterpartyPlaceholder: string;
      counterpartyStirLabel: string;
      stirPlaceholder: string;
      accountCodeLabel: string;
      accountCodePlaceholder: string;
      purposeLabel: string;
      purposePlaceholder: string;
      savingBtn: string;
      saveToDbBtn: string;
      importTitle: string;
      importDesc: string;
      chooseFilePrompt: string;
      importFormatsHint: string;
      selectedFilePrefix: string;
      detectedCountLabel: string;
      incomeCountSuffix: string;
      expenseCountSuffix: string;
      totalLabel: string;
      impColDate: string;
      impColType: string;
      impColCounterparty: string;
      impColStir: string;
      impColAmount: string;
      impColPurpose: string;
      impIncomeBadge: string;
      impExpenseBadge: string;
      cancelBtn: string;
      importingBtn: string;
      importConfirmBtn: string;
      csvHeaders: [string, string, string, string, string, string, string, string];
      incomeAccFallbackName: string;
      expenseAccFallbackName: string;
      unknownError: string;
      saveFailedFallback: string;
      toasts: {
        exported1C: string;
        noParsedOps: string;
        parsedOpsSuccess: string;
        fileReadError: string;
        loadTxError: string;
        importedToDb: string;
        importError: string;
        csvExported: string;
        txSaved: string;
        txSaveError: string;
        txApproved: string;
        txApproveError: string;
        txRejected: string;
        txRejectError: string;
        batchApproved: string;
        batchApproveError: string;
      };
    };
    settings: {
      defaultAccountantName: string;
      personalSubtitle: string;
      profileTab: string;
      personalCardTitle: string;
      personalCardDesc: string;
      nameProfileLabel: string;
      defaultUserName: string;
      emailLabel: string;
      hideTooltip: string;
      showTooltip: string;
      hideEmailAria: string;
      showEmailAria: string;
      currentPlanLabel: string;
      trialPlanBadge: string;
      planDesc: string;
      openBillingBtn: string;
      loadingEntities: string;
      emptyEntities: string;
      regimeVatProfit: string;
      regimeTurnover: string;
      regimeFixed: string;
      authenticatedSession: string;
      supabaseSessionNote: string;
      langUz: string;
      langRu: string;
      langEn: string;
      addEntityDesc: string;
      legalNameLabel: string;
      legalNamePlaceholder: string;
      tradeNameLabel: string;
      tradeNamePlaceholder: string;
      tinLabel: string;
      tinPlaceholder: string;
      legalFormLabel: string;
      companyTypes: {
        mchj: string;
        yatt: string;
        xk: string;
        aj: string;
        ok: string;
      };
      taxRegimeLabel: string;
      taxRegimeOptVat: string;
      taxRegimeOptTurnover: string;
      taxRegimeOptFixed: string;
      rolePositionLabel: string;
      rolePositionPlaceholder: string;
      savingBtn: string;
      addEntitySubmitBtn: string;
      editEntityTitle: string;
      editEntityDesc: string;
      tinInnLabel: string;
      editTaxRegimeLabel: string;
      chiefAccountantLabel: string;
      toasts: {
        loadEntitiesError: string;
        entityCreated: string;
        entityCreateError: string;
        entityUpdated: string;
        entityUpdateError: string;
        emailAlertsOn: string;
        emailAlertsOff: string;
        telegramAlertsOn: string;
        telegramAlertsOff: string;
        languageChanged: string;
      };
    };
    tax: {
      vatCardTitle: string;
      vatCardSub: string;
      jshdsCardTitle: string;
      socialCardTitle: string;
      profitFallbackTitle: string;
      calculatedBadge: string;
      awaitingBadge: string;
      deadlinePrefix: string;
      ledger6410Note: string;
      ledger6520Note: string;
      noReportForPeriod: string;
      periodPrefix: string;
      quarterlyReportNote: string;
      calendarDesc: string;
      loadingCalendar: string;
      emptyCalendar: string;
      deadlineItemLabel: string;
      colCalculated: string;
      colPaid: string;
      loadingRecords: string;
      emptyRecords: string;
      taxItemLabel: string;
      modalPeriodDeadline: string;
      summaryCalculated: string;
      summaryPaid: string;
      summaryRemaining: string;
      accountCodeLabel: string;
      payingBtn: string;
      payTaxBtn: string;
      vatModalDesc: string;
      vatOutputLabel: string;
      vatInputLabel: string;
      vatNetLabel: string;
      savingBtn: string;
      csvHeaders: [string, string, string, string, string, string];
      offsetJournalDesc: string;
      debit6410Name: string;
      credit4410Name: string;
      taxCommitteeCounterparty: string;
      taxPaymentDescSuffix: string;
      toasts: {
        loadError: string;
        csvExported: string;
        insufficientVatBalance: string;
        vatOffsetSuccess: string;
        vatOffsetError: string;
        alreadyPaidInfo: string;
        taxPaidSuccess: string;
        taxPayError: string;
      };
    };
    aiAuditor: {
      monitoringBadge: string;
      recheckBtn: string;
      openSuspicions: string;
      resolvedCountLabel: string;
      severityWarning: string;
      severityInfo: string;
      emptyExceptions: string;
      exceptionItemLabel: string;
      sourceSystemLabel: string;
      referenceIdLabel: string;
      detailsLabel: string;
      resolvedBtn: string;
      selectPrompt: string;
      auditTrailTitle: string;
      auditTrailDesc: string;
      refreshBtn: string;
      loadingLogs: string;
      emptyLogs: string;
      colTime: string;
      colActionType: string;
      colSummary: string;
      colModel: string;
      colDecision: string;
      logItemLabel: string;
      correctiveEntryPrefix: string;
      account6010Name: string;
      account5110Name: string;
      errorFallback: string;
      forwardSuccessMsg: string;
      toasts: {
        recheckDone: string;
        approvedSuccess: string;
        rejectedSuccess: string;
        actionError: string;
      };
    };
    finance: {
      subtitleSuffix: string;
      pdfBtnLabel: string;
      excelBtnLabel: string;
      emptyCashflow: string;
      pnlCsvHeaders: [string, string, string, string];
      balanceCsvHeaders: [string, string, string];
      pnlRows: {
        r010: string;
        r020: string;
        r030: string;
        r050: string;
        r060: string;
        r100: string;
        r250: string;
        r270: string;
      };
      balanceRows: {
        assetsHeader: string;
        fixedAssets: string;
        inventory: string;
        receivables: string;
        cash: string;
        assetsTotal: string;
        liabilitiesHeader: string;
        equityCapital: string;
        retainedEarnings: string;
        payablesSuppliers: string;
        taxPayables: string;
        payrollPayables: string;
        liabilitiesTotal: string;
      };
      toasts: {
        excelExported: string;
        pdfReady: string;
      };
    };
  };
}

const reconcileErpDict: Record<Locale, ReconcileErpDict> = {
  uz: {
    commonLoading: "Yuklanmoqda...",
    reconcile: {
      title: "Bank ↔ 1C Solishtirish",
      savedHistoryBtn: "Saqlangan tarix",
      resetBtn: "Tozalash",
      bankSectionTitle: "1. Bank koʻchirmasi",
      bankFormatsHint: ".xlsx, .txt, .csv, .xls",
      bankUploadPrompt: "Bank faylini tanlash (.xlsx, .txt, .csv, .xls)",
      pasteFromTableBtn: "Jadvaldan nusxa qoʻyish (Ctrl+V)",
      operationsCountSuffix: "ta operatsiya",
      oneCSectionTitle: "2. 1C fayli",
      oneCFormatsHint: ".xlsx, .xml, .txt, .csv",
      oneCUploadPrompt: "1C faylini tanlash (.xlsx, .xml, .txt, .csv)",
      pasteBtn: "Nusxa qoʻyish",
      siteDbBtn: "Saytdagi baza",
      recordsCountSuffix: "ta yozuv",
      kpiMatched: "100% Mos tushgan",
      kpiMismatch: "Summa / Sana farqi",
      kpiBankOnly: "Bankda bor, 1C da yoʻq",
      kpiOneCOnly: "1C da bor, Bankda yoʻq",
      totalIncomeLabel: "Jami Kirim (Bank vs 1C)",
      incomeMatchedZero: "Kirim mos (0)",
      totalExpenseLabel: "Jami Chiqim (Bank vs 1C)",
      expenseMatchedZero: "Chiqim mos (0)",
      diffPrefix: "Farq",
      tabAll: "Barchasi",
      tabBankOnly: "1C da yoʻq",
      tabMismatch: "Farqlar",
      tabOneCOnly: "Bankda yoʻq",
      tabMatched: "Mos",
      searchPlaceholder: "Kontragent, STIR, summa qidirish...",
      aiVerifyBtn: "AI bilan tekshirish",
      export1CTxtBtn: "1C ga yuklash (.txt)",
      export1CXmlBtn: "1C Provodka (.xml)",
      exportCsvBtn: "CSV Hisobot",
      savedBtn: "Saqlangan",
      saveToHistoryBtn: "Tarixga saqlash",
      postToLedgerBtn: "Bosh kitobga yozish",
      aiVerifiedNote: "AI tomonidan tekshirildi",
      rulesVerifiedNote: "Qatʼiy qoidalar bilan tekshirildi",
      selectAllAria: "Barchasini belgilash",
      colStatus: "Holat",
      colDate: "Sana",
      colCounterparty: "Kontragent",
      colBankAmount: "Bank summasi",
      colOneCAmount: "1C summasi",
      colAccount: "Schyot",
      colVat: "QQS 12%",
      colAiNote: "AI Izoh va Tavsiya",
      emptyFilteredRows: "Ushbu filtr boʻyicha yozuvlar topilmadi.",
      selectRowAriaSuffix: "tanlash",
      accountSelectAriaSuffix: "schyoti",
      statusMatched: "Mos",
      statusMismatch: "Farq bor",
      statusBankOnly: "1C da yoʻq",
      statusOneCOnly: "Bankda yoʻq",
      stirPrefix: "STIR",
      vatToggleTitle: "12% QQS ajratishni yoqish / o'chirish",
      vatOn: "QQS 12%",
      vatOff: "QQSsiz",
      rowItemLabel: "qator",
      historyTitle: "Saqlangan ishlar tarixi",
      historyAllMonths: "Barchasi",
      historyLoading: "Tarix yuklanmoqda...",
      historyEmpty: "Saqlangan solishtirishlar yoʻq",
      histColMonth: "Oy",
      histColFiles: "Fayllar",
      histColRows: "Qator",
      histColBankIncome: "Bank Kirim",
      histColBankExpense: "Bank Chiqim",
      histColStatus: "Holat",
      histColAction: "Amal",
      histStatusPosted: "Bosh kitobda",
      histStatusReviewed: "Tekshirilgan",
      histOpenBtn: "Ochish",
      histDeleteAria: "Oʻchirish",
      historyItemLabel: "ish",
      pasteBankTitle: "Bank koʻchirmasini joylashtirish",
      pasteOneCTitle: "1C jadvalini joylashtirish",
      pastePlaceholder: "Jadval qatorlarini joylashtiring",
      cancelBtn: "Bekor qilish",
      parseAndCompareBtn: "Oʻqish va solishtirish",
      modeSelected: "tanlangan",
      modeMissingIn1C: "1C da yoʻq",
      modeAll: "barcha",
      defaultCompany: "Kompaniya",
      defaultOperation: "Operatsiya",
      vatTag: "QQS 12%",
      accountTagPrefix: "Schyot",
      dbSourceName: "FIRMUS Bosh kitob / Tranzaksiyalar",
      pasteBankLabel: "Bank (Ctrl+V jadval)",
      pasteOneCLabel: "1C (Ctrl+V jadval)",
      unknownError: "Nomaʼlum xato",
      toasts: {
        batchNotFound: "Saqlangan ish topilmadi",
        batchLoaded: "«{title}» yuklandi",
        batchLoadError: "Yuklashda xatolik: {error}",
        noRowsParsed:
          "«{label}» dan operatsiyalar oʻqilmadi. Client-Bank (.txt), 1C XML, CSV/TSV yoki Excel HTML jadval formatidan foydalaning.",
        rowLimitExceeded:
          "Faylda {count} ta yozuv bor. {plan} tarifi limiti: max {limit} qator.",
        bankRowsLoaded: "Bank koʻchirmasidan {count} ta operatsiya oʻqildi.",
        oneCRowsLoaded: "1C maʼlumotidan {count} ta yozuv oʻqildi.",
        fileSizeExceeded:
          "Fayl hajmi {plan} tarifi limiti ({maxMb} MB) dan oshmasligi kerak",
        fileReadError: "Faylni oʻqishda xatolik: {error}",
        pasteEmpty: "Avval Excel yoki Bank jadvalidan nusxalangan matnni joylashtiring",
        selectEntityFirst: "Avval korxona tanlang yoki tezkor qoʻshing",
        dbCompared: "Bazadan {count} ta yozuv bilan solishtirildi.",
        dbReadError: "Bazadan oʻqishda xatolik: {error}",
        addEntityToSave: "Saqlash uchun avval korxona qoʻshing",
        personalAccountPreparing: "Shaxsiy hisob tayyorlanmoqda, biroz kuting",
        savedToHistory: "Solishtirish tarixga saqlandi!",
        saveError: "Saqlashda xatolik: {error}",
        deletedFromHistory: "Tarixdan oʻchirildi",
        deleteError: "Oʻchirishda xatolik: {error}",
        allMatchedInfo: "Barcha operatsiyalar 100% mos! Tekshirishga muhtoj farq topilmadi.",
        aiErrorFallback: "AI solishtirish xatosi",
        aiVerifiedSuccess: "AI farqlarni tekshirdi va schyotlarni tasdiqladi!",
        aiAnalyzeError: "AI tahlilida xatolik: {error}",
        noExportData: "Eksport uchun maʼlumot yoʻq",
        exported1CTxt: "{count} ta ({mode}) operatsiya 1C (.txt) fayliga yuklandi!",
        noXmlExportData: "XML eksport uchun maʼlumot yoʻq",
        exported1CXml: "{count} ta ({mode}) provodka 1C EnterpriseData XML formatida yuklandi!",
        exportedCsv: "Excel/CSV Sverka dalolatnomasi yuklandi!",
        connectEntityToPost: "Bosh kitobga yozish uchun yuqoridagi tugma orqali korxonani tezkor ulang",
        selectRowsToPost: "Iltimos, Bosh kitobga oʻtkazish uchun qatorlarni belgilang",
        postedToLedger: "{count} ta tasdiqlangan operatsiya Bosh kitobga atomik tarzda yozildi!",
        postLedgerError: "Bosh kitobga yozishda xatolik: {error}",
      },
    },
    erpExtra: {
      accounting: {
        defaultReversalReason: "Notoʻgʻri summa kiritilgan",
        export1CXmlBtn: "1C ga eksport (XML)",
        export1CXmlTitle: "1C:Korxona EnterpriseData XML formatida yuklab olish",
        closePeriodBtn: "Davrni yopish",
        coaCountSuffix: "schyot",
        newCoaBtn: "Yangi schyot / subschyot",
        colCategory: "Kategoriya",
        colType: "Turi",
        emptyCoa: "Schyotlar rejasi topilmadi.",
        typeActive: "Aktiv",
        typePassive: "Passiv",
        typeActivePassive: "Aktiv-Passiv",
        coaItemLabel: "schyot",
        colUser: "Muallif",
        loadingEntries: "Provodkalar Supabase bazasidan yuklanmoqda...",
        emptyEntries: "Ushbu korxona boʻyicha buxgalteriya provodkalari topilmadi.",
        totalEntriesPrefix: "Jami:",
        entriesWord: "ta provodka",
        pageWord: "Sahifa",
        prevBtn: "Oldingi",
        nextBtn: "Keyingi",
        stornoBtn: "Storno qilish (Reversal)",
        tbBalanced: "Balans qonuni toʻliq taʼminlangan: Debet = Kredit",
        tbUnbalanced: "Diqqat: Debet va Kredit farqi mavjud",
        colOpeningBalance: "Boshlangʻich saldo",
        turnoverSuffix: "(Aylanma)",
        colClosingBalance: "Yakuniy saldo",
        emptyTrialBalance: "Hozircha hisob-kitoblar maʼlumoti yuklanmadi yoki provodkalar yoʻq.",
        colDocNumber: "Hujjat raqami",
        colCorrAccount: "Korr. schyot",
        colRunningBalance: "Joriy qoldiq (Running Balance)",
        emptyLedgerForAccount: "Tanlangan {account} schyoti boʻyicha hozircha operatsiyalar mavjud emas.",
        glItemLabel: "harakat",
        addEntryTitle: "Yangi buxgalteriya provodkasini kiritish",
        addEntryDesc: "Ikkiyoqlama yozuv (Double-Entry Ledger) boʻyicha atomar tranzaksiya bilan saqlash.",
        docNumberLabel: "Hujjat raqami *",
        dateLabel: "Sana *",
        purposeLabel: "Iqtisodiy mazmuni / Maqsad *",
        purposePlaceholder: "Tavsif",
        debitAccountLabel: "Debet schyoti (Dt) *",
        creditAccountLabel: "Kredit schyoti (Kt) *",
        amountLabel: "Summa (UZS) *",
        amountPlaceholder: "Summa",
        savingBtn: "Saqlanmoqda...",
        saveEntryBtn: "Provodkani saqlash",
        stornoTitle: "Provodkani Storno qilish",
        stornoDesc:
          "Tasdiqlangan provodka oʻchirib yuborilmaydi. Uning oʻrniga teskari (storno) provodka yaratilib, joriy provodka holati «reversed» deb belgilanadi.",
        stornoReasonLabel: "Storno qilish sababi *",
        stornoReasonPlaceholder: "Storno sababi",
        cancelBtn: "Bekor qilish",
        stornoWorkingBtn: "Storno qilinmoqda...",
        stornoSubmitBtn: "Storno yozuvini yaratish",
        addCoaTitle: "Yangi schyot / subschyot qoʻshish",
        addCoaDesc: "Korxona uchun individual schyot / subschyot qoʻshish.",
        coaCodeLabel: "Schyot kodi *",
        coaCodePlaceholder: "Schyot kodi",
        coaNameLabel: "Schyot nomi *",
        coaNamePlaceholder: "Schyot nomi",
        coaTypeLabel: "Schyot turi (BHMS)",
        coaOptAsset: "Aktiv (Asset)",
        coaOptLiability: "Majburiyat (Liability)",
        coaOptEquity: "Xususiy kapital (Equity)",
        coaOptRevenue: "Daromad (Revenue)",
        coaOptExpense: "Xarajat (Expense)",
        addingBtn: "Qoʻshilmoqda...",
        saveCoaBtn: "Schyotni saqlash",
        closePeriodTitle: "Davrni yopish (Oy yopish)",
        closePeriodDesc:
          "Tanlangan davr uchun barcha daromad (9010) va xarajat (9110–9430) schyotlarini 9910 orqali 8710 (Taqsimlanmagan foyda/zarar) ga yopish.",
        fromDateLabel: "Boshlanish sanasi *",
        toDateLabel: "Tugash sanasi *",
        closingBtn: "Yopilmoqda...",
        closePeriodSubmitBtn: "Davrni yopish (9910 → 8710)",
        csvHeaders: ["Provodka №", "Sana", "Tavsif", "Manba", "Debet", "Kredit", "Holat", "Muallif"],
        fallbackDebitAcc: "Debet schyoti",
        fallbackCreditAcc: "Kredit schyoti",
        balanceErrorFallback: "Balans xatosi",
        toasts: {
          loadEntriesError: "Provodkalarni bazadan yuklab boʻlmadi",
          csvExported: "Buxgalteriya provodkalari CSV formatida yuklab olindi",
          xmlExported: "1C:Buxgalteriya EnterpriseData XML fayli muvaffaqiyatli yuklab olindi!",
          entrySaved: "Buxgalteriya provodkasi atomar tranzaksiya bilan Ledgerga saqlandi!",
          entrySaveError: "Provodka saqlashda xatolik: {error}",
          coaCodeInvalid: "Schyot kodi 4–8 xonali raqam boʻlishi shart",
          coaNameTooShort: "Schyot nomini kamida 3 ta belgi bilan kiriting",
          coaAdded: "«{code} — {name}» schyoti rejaga qoʻshildi!",
          coaAddError: "Schyot qoʻshishda xatolik: {error}",
          stornoReasonTooShort: "Storno qilish sababini kamida 3 ta belgi bilan kiriting",
          stornoSuccess: "«{entryNumber}» provodkasi storno qilindi (Reversal yozuvi yaratildi: {reversal})",
          stornoError: "Storno qilishda xatolik: {error}",
          selectPeriodDates: "Boshlanish va tugash sanalarini tanlang",
          periodAlreadyClosed: "Ushbu davr ({from} — {to}) allaqachon yopilgan ({entry}).",
          periodClosedSuccess: "Davr muvaffaqiyatli yopildi ({entry})! Moliyaviy natija (9910 → 8710): {profit} UZS.",
          periodCloseError: "Davrni yopishda xatolik: {error}",
        },
      },
      transactions: {
        importBtn: "Vypiska import (.txt / CSV)",
        export1CBtn: "1C ga eksport",
        export1CTitle: "1C:Buxgalteriya Client-Bank formatida yuklab olish",
        dateFromLabel: "Sanadan",
        dateToLabel: "Sanagacha",
        minAmountLabel: "Minimal summa (UZS)",
        minAmountPlaceholder: "Minimal summa",
        clearFiltersBtn: "Filtrlarni tozalash",
        loadingRows: "Tranzaksiyalar Supabase bazasidan yuklanmoqda...",
        emptyRows: "Ushbu korxona boʻyicha mos tranzaksiya topilmadi.",
        totalPrefix: "Jami:",
        operationsWord: "ta operatsiya",
        pageWord: "Sahifa",
        prevBtn: "Oldingi",
        nextBtn: "Keyingi",
        txIdPrefix: "Tranzaksiya ID",
        reconcileBtn: "Sverka",
        approvedBtn: "Tasdiqlangan",
        addTxTitle: "Yangi bank tranzaksiyasini qoʻshish",
        addTxDesc: "Supabase maʼlumotlar bazasiga yangi kirim yoki chiqim operatsiyasini kiriting.",
        incomeTypeBtn: "Kirim (Daromad)",
        expenseTypeBtn: "Chiqim (Xarajat)",
        dateLabel: "Sana *",
        amountLabel: "Summa (UZS) *",
        amountPlaceholder: "Summa",
        counterpartyLabel: "Kontragent nomi *",
        counterpartyPlaceholder: "Kontragent nomi",
        counterpartyStirLabel: "Kontragent STIR",
        stirPlaceholder: "STIR",
        accountCodeLabel: "Buxgalteriya schyoti",
        accountCodePlaceholder: "Schyot kodi",
        purposeLabel: "Toʻlov maqsadi / Tavsif *",
        purposePlaceholder: "Toʻlov maqsadi",
        savingBtn: "Saqlanmoqda...",
        saveToDbBtn: "Bazaga saqlash",
        importTitle: "Bank koʻchirmasini yuklash (Vypiska Import)",
        importDesc:
          "Kapitalbank, Hamkorbank, Ipotekabank, SQB yoki NBU Bank-Klientidan yuklangan 1C (.txt) yoki .csv faylini tanlang.",
        chooseFilePrompt: "Faylni tanlang yoki shu yerga tashlang",
        importFormatsHint: "Format: 1C Client-Bank (*.txt) yoki Bank hisob-kitob koʻchirmasi (*.csv)",
        selectedFilePrefix: "Tanlangan:",
        detectedCountLabel: "Aniqlangan toʻlovlar:",
        incomeCountSuffix: "kirim",
        expenseCountSuffix: "chiqim",
        totalLabel: "Jami:",
        impColDate: "Sana",
        impColType: "Turi",
        impColCounterparty: "Kontragent",
        impColStir: "STIR",
        impColAmount: "Summa",
        impColPurpose: "Toʻlov maqsadi",
        impIncomeBadge: "Kirim",
        impExpenseBadge: "Chiqim",
        cancelBtn: "Bekor qilish",
        importingBtn: "Bazaga yozilmoqda...",
        importConfirmBtn: "Supabase bazasiga import qilish",
        csvHeaders: ["ID", "Sana", "Kontragent", "STIR", "Turi", "Summa", "Tavsif", "Holat"],
        incomeAccFallbackName: "Xaridorlar schyoti",
        expenseAccFallbackName: "Yetkazib beruvchilar schyoti",
        unknownError: "Nomaʼlum xato",
        saveFailedFallback: "Saqlash muvaffaqiyatsiz",
        toasts: {
          exported1C: "1C:Buxgalteriya uchun bank koʻchirmasi (kl_to_1c.txt) muvaffaqiyatli yuklandi!",
          noParsedOps:
            "Fayldan toʻlov operatsiyalari topilmadi. Fayl formati Excel (.xlsx/.xls), Client-Bank (.txt), XML yoki CSV boʻlishi kerak.",
          parsedOpsSuccess: "Fayldan {count} ta bank toʻlovi muvaffaqiyatli aniqlandi!",
          fileReadError: "Faylni oʻqishda xatolik: {error}",
          loadTxError: "Tranzaksiyalarni yuklab boʻlmadi: {error}",
          importedToDb: "{count} ta bank toʻlovi Supabase bazasiga kiritildi va Ledgerga bogʻlandi!",
          importError: "Import qilishda xatolik: {error}",
          csvExported: "Tranzaksiyalar CSV formatida yuklab olindi",
          txSaved: "Tranzaksiya Supabase maʼlumotlar bazasiga muvaffaqiyatli saqlandi!",
          txSaveError: "Xatolik yuz berdi: {error}",
          txApproved: "«{counterparty}» tranzaksiyasi tasdiqlandi va Bosh kitobga (Ledger) provodka tushirildi!",
          txApproveError: "Tasdiqlashda xatolik: {error}",
          txRejected: "«{counterparty}» tranzaksiyasi rad etildi.",
          txRejectError: "Rad etishda xatolik: {error}",
          batchApproved: "{count} ta tranzaksiya tasdiqlandi va Bosh kitobga (Ledger) provodkalar tushirildi!",
          batchApproveError: "Ommaviy tasdiqlashda xatolik: {error}",
        },
      },
      settings: {
        defaultAccountantName: "Bosh buxgalter",
        personalSubtitle: "Shaxsiy profil, xavfsizlik, bildirishnomalar va interfeys tili",
        profileTab: "Profil",
        personalCardTitle: "Shaxsiy hisob maʼlumotlari",
        personalCardDesc: "Akkauntingiz va joriy obuna holati",
        nameProfileLabel: "Ism / Profil",
        defaultUserName: "Foydalanuvchi",
        emailLabel: "Elektron pochta",
        hideTooltip: "Emailni yashirish",
        showTooltip: "Emailni koʻrsatish",
        hideEmailAria: "Emailni yashirish",
        showEmailAria: "Emailni koʻrsatish",
        currentPlanLabel: "Joriy tarif",
        trialPlanBadge: "Pro (Sinov)",
        planDesc: "Tarif va oylik foydalanish limitlarini Obunalar sahifasida koʻring",
        openBillingBtn: "Obunalarni ochish",
        loadingEntities: "Korxonalar yuklanmoqda...",
        emptyEntities: "Ushbu ishchi maydonda korxonalar kiritilmagan.",
        regimeVatProfit: "QQS + Foyda",
        regimeTurnover: `Aylanma soliq (${TURNOVER_RATE_RANGE})`,
        regimeFixed: "Qatʼiy soliq",
        authenticatedSession: "Autentifikatsiya qilingan sessiya",
        supabaseSessionNote: "Supabase Auth JWT sessiya",
        langUz: "Oʻzbekcha (Lotin)",
        langRu: "Русский (Официальный)",
        langEn: "English (Global)",
        addEntityDesc: "Yangi yuridik korxona rekvizitlarini kiritish va Supabase bazasiga saqlash.",
        legalNameLabel: "Yuridik nomi *",
        legalNamePlaceholder: "Korxona yuridik nomi",
        tradeNameLabel: "Savdo belgisi",
        tradeNamePlaceholder: "Qisqa nomi",
        tinLabel: "STIR (9 ta raqam) *",
        tinPlaceholder: "STIR",
        legalFormLabel: "Tashkiliy shakli *",
        companyTypes: {
          mchj: "MChJ (Masʼuliyati cheklangan jamiyat)",
          yatt: "YaTT (Yakka tartibdagi tadbirkor)",
          xk: "XK (Xususiy korxona)",
          aj: "AJ (Aksiyadorlik jamiyati)",
          ok: "OK (Oilaviy korxona)",
        },
        taxRegimeLabel: "Soliq rejimi *",
        taxRegimeOptVat: "QQS (12%) + Foyda soligʻi",
        taxRegimeOptTurnover: `Aylanmadan olinadigan soliq (${TURNOVER_RATE_RANGE})`,
        taxRegimeOptFixed: "Qatʼiy belgilangan soliq",
        rolePositionLabel: "Masʼul lavozimi (ixtiyoriy)",
        rolePositionPlaceholder: "Lavozimi",
        savingBtn: "Saqlanmoqda...",
        addEntitySubmitBtn: "Korxonani qoʻshish",
        editEntityTitle: "Korxona maʼlumotlarini tahrirlash",
        editEntityDesc: "Yuridik shaxs rekvizitlari va soliq rejimini yangilash",
        tinInnLabel: "STIR (INN) *",
        editTaxRegimeLabel: "Soliq rejimi",
        chiefAccountantLabel: "Bosh buxgalter",
        toasts: {
          loadEntitiesError: "Korxonalarni bazadan yuklab boʻlmadi",
          entityCreated: "Yangi yuridik korxona va 22 ta BHMS schyoti Supabase bazasiga saqlandi!",
          entityCreateError: "Korxona qoʻshishda xatolik: {error}",
          entityUpdated: "«{name}» maʼlumotlari Supabase bazasida yangilandi!",
          entityUpdateError: "Tahrirlashda xatolik: {error}",
          emailAlertsOn: "Email ogohlantirishlari yoqildi",
          emailAlertsOff: "Email ogohlantirishlari oʻchirildi",
          telegramAlertsOn: "Telegram bildirishnomalari yoqildi",
          telegramAlertsOff: "Telegram bildirishnomalari oʻchirildi",
          languageChanged: "Til oʻzgartirildi: {lang}",
        },
      },
      tax: {
        vatCardTitle: "QQS (12% Sof toʻlov)",
        vatCardSub: "Hisoblangan: {out} • Zachyot: {in}",
        jshdsCardTitle: "JShDS (12%)",
        socialCardTitle: "Ijtimoiy soliq (12%)",
        profitFallbackTitle: "Foyda soligʻi (15%)",
        calculatedBadge: "Hisoblangan",
        awaitingBadge: "Kutilmoqda",
        deadlinePrefix: "Muddat:",
        ledger6410Note: "Bosh kitob (6410 Kt) boʻyicha hisoblangan",
        ledger6520Note: "Bosh kitob (6520 Kt) boʻyicha hisoblangan",
        noReportForPeriod: "Ushbu davr uchun hisobot yoʻq",
        periodPrefix: "Davr:",
        quarterlyReportNote: "Choraklik hisobot",
        calendarDesc: "Soliq.uz taqvimi va muddatlar nazorati",
        loadingCalendar: "Soliq taqvimi yuklanmoqda...",
        emptyCalendar: "Ushbu korxona uchun yaqinlashayotgan soliq muddatlari kiritilmagan.",
        deadlineItemLabel: "muddat",
        colCalculated: "Hisoblangan",
        colPaid: "Toʻlangan",
        loadingRecords: "Soliq majburiyatlari yuklanmoqda...",
        emptyRecords: "Ushbu korxona boʻyicha soliq majburiyatlari topilmadi.",
        taxItemLabel: "soliq",
        modalPeriodDeadline: "Hisobot davri: {period} • Topshirish muddati: {deadline}",
        summaryCalculated: "Hisoblangan soliq summasi:",
        summaryPaid: "Toʻlangan summa:",
        summaryRemaining: "Qolgan toʻlov qoldigʻi:",
        accountCodeLabel: "Buxgalteriya schyoti:",
        payingBtn: "Toʻlanmoqda...",
        payTaxBtn: "Soliqni toʻlash (Dt 6410 / Kt 5110)",
        vatModalDesc: "Bosh kitob (6410 va 4410 schyotlar) hamda Didox E-SF asosida real QQS (12%) hisob-kitobi",
        vatOutputLabel: "Chiquvchi E-SF boʻyicha QQS (6410 Kt):",
        vatInputLabel: "Kiruvchi E-SF zachyot QQS (4410 Dt):",
        vatNetLabel: "Budjetga sof QQS toʻlovi:",
        savingBtn: "Saqlanmoqda...",
        csvHeaders: ["Soliq turi", "Davr", "Hisoblangan summa (UZS)", "To'langan summa (UZS)", "Muddat", "Holat"],
        offsetJournalDesc: "QQS zachyoti: 4410 (Kiruvchi QQS) hisobidan 6410 (Budjetga QQS) kamaytirildi",
        debit6410Name: "Budjetga toʻlovlar boʻyicha qarzlar (Soliqlar)",
        credit4410Name: "Budjetga oldindan toʻlangan soliqlar (QQS)",
        taxCommitteeCounterparty: "Davlat soliq qoʻmitasi (Yagona gʻazna hisobvaragʻi)",
        taxPaymentDescSuffix: "boʻyicha soliq toʻlovi",
        toasts: {
          loadError: "Soliq ma'lumotlarini bazadan yuklab boʻlmadi",
          csvExported: "Soliq majburiyatlari reestri CSV formatida yuklab olindi!",
          insufficientVatBalance: "Zachyot uchun 6410 va 4410 schyotlarida yetarli qoldiq topilmadi.",
          vatOffsetSuccess:
            "QQS hisob-kitobi tasdiqlandi! Zachyot summasi ({amount} soʻm) Bosh kitobda (Dt 6410 / Kt 4410) aks ettirildi.",
          vatOffsetError: "QQS provodkasini saqlashda xatolik: {error}",
          alreadyPaidInfo: "Ushbu soliq majburiyati toʻliq toʻlangan!",
          taxPaidSuccess:
            "«{type}» boʻyicha {amount} soʻm soliq toʻlovi amalga oshirildi va Ledgerga (Dt 6410 / Kt 5110) saqlandi!",
          taxPayError: "Soliq toʻlovini saqlashda xatolik: {error}",
        },
      },
      aiAuditor: {
        monitoringBadge: "24/7 Monitoring",
        recheckBtn: "Qayta tekshirish",
        openSuspicions: "Ochiq shubhalar",
        resolvedCountLabel: "Hal qilingan",
        severityWarning: "Ogohlantirish",
        severityInfo: "Info",
        emptyExceptions: "Ushbu korxona uchun mos xatoliklar topilmadi.",
        exceptionItemLabel: "shubha",
        sourceSystemLabel: "Manba tizim:",
        referenceIdLabel: "Hujjat / Tranzaksiya ID:",
        detailsLabel: "Tafsilotlar:",
        resolvedBtn: "Hal qilingan",
        selectPrompt: "Tafsilotlarni koʻrish uchun roʻyxatdan istisno tanlang",
        auditTrailTitle: "AI Agent Harakatlar Jurnali (Audit Trail)",
        auditTrailDesc:
          "AI Copilot va Agent tomonidan amalga oshirilgan barcha takliflar va Human-in-the-Loop qarorlari tarixi",
        refreshBtn: "Yangilash",
        loadingLogs: "Jurnal yuklanmoqda...",
        emptyLogs:
          "Hozircha AI agent harakatlar jurnali mavjud emas. AI Drawer orqali provodka yoki operatsiyalarni tasdiqlaganingizda bu yerda aks etadi.",
        colTime: "Vaqt",
        colActionType: "Amal turi",
        colSummary: "Tavsif (Summary)",
        colModel: "Model",
        colDecision: "Qaror (Decision)",
        logItemLabel: "harakat",
        correctiveEntryPrefix: "AI Auditor tuzatuvchi provodkasi",
        account6010Name: "Mol yetkazib beruvchilarga toʻlanadigan schyotlar",
        account5110Name: "Hisob-kitob schyoti (Milliy valyutada)",
        errorFallback: "Xatolik",
        forwardSuccessMsg: "Masʼul bosh buxgalterga shaxsiy koʻrik uchun («in_review») yuborildi!",
        toasts: {
          recheckDone: "AI Auditor tekshiruvi yakunlandi: {open} ta ochiq va {total} ta jami yozuv aniqlandi.",
          approvedSuccess: "AI tavsiyasi maʼqullandi va tuzatuvchi provodka Bosh kitobga (Ledger) saqlandi!",
          rejectedSuccess: "Istisno rad etildi va koʻrib chiqish (in_review) holatiga oʻtkazildi.",
          actionError: "Amalni bajarishda xatolik: {error}",
        },
      },
      finance: {
        subtitleSuffix: "Real Bosh kitob (Ledger) asosidagi shakllar",
        pdfBtnLabel: "PDF",
        excelBtnLabel: "Excel",
        emptyCashflow: "Pul oqimlari maʼlumoti hozircha mavjud emas.",
        pnlCsvHeaders: ["Satr kodi", "Ko'rsatkich nomi", "O'tgan davr (UZS)", "Hisobot davri (UZS)"],
        balanceCsvHeaders: ["Satr kodi", "Ko'rsatkich nomi", "Summa (UZS)"],
        pnlRows: {
          r010: "Mahsulot (tovar, ish, xizmat)larni sotishdan sof tushum (9010)",
          r020: "Sotilgan mahsulotlarning tannarxi (9110)",
          r030: "Mahsulot sotishdan yalpi foyda (zarar)",
          r050: "Maʼmuriy xarajatlar (9420)",
          r060: "Boshqa operatsion xarajatlar (9430)",
          r100: "Asosiy faoliyatdan olingan foyda",
          r250: "Foyda soligʻi (15%)",
          r270: "Hisobot davrining sof foydasi (zarari)",
        },
        balanceRows: {
          assetsHeader: "I. AKTIVLAR (MABLAĞLAR)",
          fixedAssets: "Asosiy vositalar va kapital qoʻyilmalar (0100, 0820)",
          inventory: "Tovar-moddiy zaxiralar va ombor (1010–2910)",
          receivables: "Debitorlik qarzlari va boʻnaklar (4010–4410)",
          cash: "Pul mablagʻlari: Kassa va Bank schyotlari (5010–5210)",
          assetsTotal: "BALANS AKTIVI JAMI",
          liabilitiesHeader: "II. PASSIVLAR (MAJBURIYATLAR VA KAPITAL)",
          equityCapital: "Ustav kapitali (8330)",
          retainedEarnings: "Taqsimlanmagan foyda (8710 + Sof foyda)",
          payablesSuppliers: "Mol yetkazib beruvchilar va avanslar (6010, 6310)",
          taxPayables: "Budjet va soliq qarzlari (6410)",
          payrollPayables: "Mehnat haqi qarzlari (6710)",
          liabilitiesTotal: "BALANS PASSIVI JAMI",
        },
        toasts: {
          excelExported: "{filename} muvaffaqiyatli yuklab olindi!",
          pdfReady: "Hisobot chop etish / PDF saqlash uchun tayyorlandi",
        },
      },
    },
  },
  ru: {
    commonLoading: "Загрузка...",
    reconcile: {
      title: "Сверка Банк ↔ 1С",
      savedHistoryBtn: "Сохранённая история",
      resetBtn: "Очистить",
      bankSectionTitle: "1. Банковская выписка",
      bankFormatsHint: ".xlsx, .txt, .csv, .xls",
      bankUploadPrompt: "Выбрать файл банка (.xlsx, .txt, .csv, .xls)",
      pasteFromTableBtn: "Вставить из таблицы (Ctrl+V)",
      operationsCountSuffix: "операций",
      oneCSectionTitle: "2. Файл 1С",
      oneCFormatsHint: ".xlsx, .xml, .txt, .csv",
      oneCUploadPrompt: "Выбрать файл 1С (.xlsx, .xml, .txt, .csv)",
      pasteBtn: "Вставить",
      siteDbBtn: "База на сайте",
      recordsCountSuffix: "записей",
      kpiMatched: "100% Совпало",
      kpiMismatch: "Расхождение суммы / даты",
      kpiBankOnly: "Есть в банке, нет в 1С",
      kpiOneCOnly: "Есть в 1С, нет в банке",
      totalIncomeLabel: "Всего приход (Банк vs 1С)",
      incomeMatchedZero: "Приход сходится (0)",
      totalExpenseLabel: "Всего расход (Банк vs 1С)",
      expenseMatchedZero: "Расход сходится (0)",
      diffPrefix: "Разница",
      tabAll: "Все",
      tabBankOnly: "Нет в 1С",
      tabMismatch: "Расхождения",
      tabOneCOnly: "Нет в банке",
      tabMatched: "Совпали",
      searchPlaceholder: "Поиск контрагента, ИНН, суммы...",
      aiVerifyBtn: "Проверить с ИИ",
      export1CTxtBtn: "Выгрузить в 1С (.txt)",
      export1CXmlBtn: "Проводки 1С (.xml)",
      exportCsvBtn: "CSV Отчёт",
      savedBtn: "Сохранено",
      saveToHistoryBtn: "Сохранить в историю",
      postToLedgerBtn: "Провести в Главную книгу",
      aiVerifiedNote: "Проверено ИИ",
      rulesVerifiedNote: "Проверено по строгим правилам",
      selectAllAria: "Выбрать все",
      colStatus: "Статус",
      colDate: "Дата",
      colCounterparty: "Контрагент",
      colBankAmount: "Сумма в банке",
      colOneCAmount: "Сумма в 1С",
      colAccount: "Счёт",
      colVat: "НДС 12%",
      colAiNote: "Комментарий и рекомендация ИИ",
      emptyFilteredRows: "По данному фильтру записи не найдены.",
      selectRowAriaSuffix: "выбрать",
      accountSelectAriaSuffix: "счёт",
      statusMatched: "Совпало",
      statusMismatch: "Есть разница",
      statusBankOnly: "Нет в 1С",
      statusOneCOnly: "Нет в банке",
      stirPrefix: "ИНН",
      vatToggleTitle: "Включить / выключить выделение НДС 12%",
      vatOn: "НДС 12%",
      vatOff: "Без НДС",
      rowItemLabel: "строк",
      historyTitle: "История сохранённых сверок",
      historyAllMonths: "Все",
      historyLoading: "Загрузка истории...",
      historyEmpty: "Сохранённых сверок нет",
      histColMonth: "Месяц",
      histColFiles: "Файлы",
      histColRows: "Строк",
      histColBankIncome: "Приход банка",
      histColBankExpense: "Расход банка",
      histColStatus: "Статус",
      histColAction: "Действие",
      histStatusPosted: "В Главной книге",
      histStatusReviewed: "Проверено",
      histOpenBtn: "Открыть",
      histDeleteAria: "Удалить",
      historyItemLabel: "пакетов",
      pasteBankTitle: "Вставить банковскую выписку",
      pasteOneCTitle: "Вставить таблицу 1С",
      pastePlaceholder: "Вставьте строки таблицы",
      cancelBtn: "Отмена",
      parseAndCompareBtn: "Распознать и сверить",
      modeSelected: "выбрано",
      modeMissingIn1C: "нет в 1С",
      modeAll: "все",
      defaultCompany: "Компания",
      defaultOperation: "Операция",
      vatTag: "НДС 12%",
      accountTagPrefix: "Счёт",
      dbSourceName: "FIRMUS Главная книга / Транзакции",
      pasteBankLabel: "Банк (Ctrl+V таблица)",
      pasteOneCLabel: "1С (Ctrl+V таблица)",
      unknownError: "Неизвестная ошибка",
      toasts: {
        batchNotFound: "Сохранённая сверка не найдена",
        batchLoaded: "«{title}» загружена",
        batchLoadError: "Ошибка загрузки: {error}",
        noRowsParsed:
          "Операции из «{label}» не распознаны. Используйте Client-Bank (.txt), 1С XML, CSV/TSV или HTML-таблицу Excel.",
        rowLimitExceeded:
          "В файле {count} записей. Лимит тарифа {plan}: макс. {limit} строк.",
        bankRowsLoaded: "Из банковской выписки загружено {count} операций.",
        oneCRowsLoaded: "Из данных 1С загружено {count} записей.",
        fileSizeExceeded:
          "Размер файла не должен превышать лимит тарифа {plan} ({maxMb} МБ)",
        fileReadError: "Ошибка чтения файла: {error}",
        pasteEmpty: "Сначала вставьте текст, скопированный из Excel или таблицы банка",
        selectEntityFirst: "Сначала выберите или быстро добавьте организацию",
        dbCompared: "Выполнена сверка с {count} записями из базы.",
        dbReadError: "Ошибка чтения из базы: {error}",
        addEntityToSave: "Для сохранения сначала добавьте организацию",
        personalAccountPreparing: "Личный кабинет подготавливается, подождите немного",
        savedToHistory: "Сверка сохранена в историю!",
        saveError: "Ошибка сохранения: {error}",
        deletedFromHistory: "Удалено из истории",
        deleteError: "Ошибка удаления: {error}",
        allMatchedInfo: "Все операции совпадают на 100%! Расхождений для проверки не найдено.",
        aiErrorFallback: "Ошибка ИИ-сверки",
        aiVerifiedSuccess: "ИИ проверил расхождения и подтвердил счета!",
        aiAnalyzeError: "Ошибка ИИ-анализа: {error}",
        noExportData: "Нет данных для экспорта",
        exported1CTxt: "{count} ({mode}) операций выгружено в файл 1С (.txt)!",
        noXmlExportData: "Нет данных для XML-экспорта",
        exported1CXml: "{count} ({mode}) проводок выгружено в формат 1С EnterpriseData XML!",
        exportedCsv: "Акт сверки Excel/CSV скачан!",
        connectEntityToPost: "Для записи в Главную книгу быстро подключите организацию кнопкой выше",
        selectRowsToPost: "Пожалуйста, отметьте строки для проведения в Главную книгу",
        postedToLedger: "{count} подтверждённых операций атомарно записаны в Главную книгу!",
        postLedgerError: "Ошибка записи в Главную книгу: {error}",
      },
    },
    erpExtra: {
      accounting: {
        defaultReversalReason: "Введена неверная сумма",
        export1CXmlBtn: "Экспорт в 1С (XML)",
        export1CXmlTitle: "Скачать в формате 1С:Предприятие EnterpriseData XML",
        closePeriodBtn: "Закрыть период",
        coaCountSuffix: "счетов",
        newCoaBtn: "Новый счёт / субсчёт",
        colCategory: "Категория",
        colType: "Тип",
        emptyCoa: "План счетов не найден.",
        typeActive: "Актив",
        typePassive: "Пассив",
        typeActivePassive: "Активно-пассивный",
        coaItemLabel: "счетов",
        colUser: "Автор",
        loadingEntries: "Проводки загружаются из базы Supabase...",
        emptyEntries: "Бухгалтерские проводки по данной организации не найдены.",
        totalEntriesPrefix: "Всего:",
        entriesWord: "проводок",
        pageWord: "Страница",
        prevBtn: "Назад",
        nextBtn: "Вперёд",
        stornoBtn: "Сторнировать (Reversal)",
        tbBalanced: "Баланс полностью соблюдён: Дебет = Кредит",
        tbUnbalanced: "Внимание: имеется расхождение между Дебетом и Кредитом",
        colOpeningBalance: "Начальное сальдо",
        turnoverSuffix: "(Оборот)",
        colClosingBalance: "Конечное сальдо",
        emptyTrialBalance: "Данные оборотно-сальдовой ведомости пока не загружены или нет проводок.",
        colDocNumber: "Номер документа",
        colCorrAccount: "Корр. счёт",
        colRunningBalance: "Текущий остаток (Running Balance)",
        emptyLedgerForAccount: "По выбранному счёту {account} операций пока нет.",
        glItemLabel: "операций",
        addEntryTitle: "Ввод новой бухгалтерской проводки",
        addEntryDesc: "Сохранение методом двойной записи (Double-Entry Ledger) через атомарную транзакцию.",
        docNumberLabel: "Номер документа *",
        dateLabel: "Дата *",
        purposeLabel: "Экономическое содержание / Назначение *",
        purposePlaceholder: "Описание",
        debitAccountLabel: "Счёт по дебету (Дт) *",
        creditAccountLabel: "Счёт по кредиту (Кт) *",
        amountLabel: "Сумма (UZS) *",
        amountPlaceholder: "Сумма",
        savingBtn: "Сохранение...",
        saveEntryBtn: "Сохранить проводку",
        stornoTitle: "Сторнирование проводки",
        stornoDesc:
          "Подтверждённая проводка не удаляется. Вместо этого создаётся обратная (сторно) проводка, а текущая помечается статусом «reversed».",
        stornoReasonLabel: "Причина сторнирования *",
        stornoReasonPlaceholder: "Причина сторно",
        cancelBtn: "Отмена",
        stornoWorkingBtn: "Сторнирование...",
        stornoSubmitBtn: "Создать сторно-запись",
        addCoaTitle: "Добавить новый счёт / субсчёт",
        addCoaDesc: "Добавление индивидуального счёта или субсчёта для организации.",
        coaCodeLabel: "Код счёта *",
        coaCodePlaceholder: "Код счёта",
        coaNameLabel: "Наименование счёта *",
        coaNamePlaceholder: "Наименование счёта",
        coaTypeLabel: "Тип счёта (НСБУ)",
        coaOptAsset: "Актив (Asset)",
        coaOptLiability: "Обязательство (Liability)",
        coaOptEquity: "Собственный капитал (Equity)",
        coaOptRevenue: "Доход (Revenue)",
        coaOptExpense: "Расход (Expense)",
        addingBtn: "Добавление...",
        saveCoaBtn: "Сохранить счёт",
        closePeriodTitle: "Закрытие периода (Закрытие месяца)",
        closePeriodDesc:
          "Закрытие всех счетов доходов (9010) и расходов (9110–9430) за выбранный период через 9910 на 8710 (Нераспределённая прибыль/убыток).",
        fromDateLabel: "Дата начала *",
        toDateLabel: "Дата окончания *",
        closingBtn: "Закрытие...",
        closePeriodSubmitBtn: "Закрыть период (9910 → 8710)",
        csvHeaders: ["Проводка №", "Дата", "Описание", "Источник", "Дебет", "Кредит", "Статус", "Автор"],
        fallbackDebitAcc: "Счёт дебета",
        fallbackCreditAcc: "Счёт кредита",
        balanceErrorFallback: "Ошибка баланса",
        toasts: {
          loadEntriesError: "Не удалось загрузить проводки из базы",
          csvExported: "Бухгалтерские проводки скачаны в формате CSV",
          xmlExported: "Файл 1С:Бухгалтерия EnterpriseData XML успешно скачан!",
          entrySaved: "Бухгалтерская проводка атомарно сохранена в Главную книгу!",
          entrySaveError: "Ошибка сохранения проводки: {error}",
          coaCodeInvalid: "Код счёта должен содержать 4–8 цифр",
          coaNameTooShort: "Введите наименование счёта минимум из 3 символов",
          coaAdded: "Счёт «{code} — {name}» добавлен в план счетов!",
          coaAddError: "Ошибка добавления счёта: {error}",
          stornoReasonTooShort: "Укажите причину сторнирования минимум из 3 символов",
          stornoSuccess: "Проводка «{entryNumber}» сторнирована (создана запись: {reversal})",
          stornoError: "Ошибка сторнирования: {error}",
          selectPeriodDates: "Выберите даты начала и окончания",
          periodAlreadyClosed: "Данный период ({from} — {to}) уже закрыт ({entry}).",
          periodClosedSuccess: "Период успешно закрыт ({entry})! Финансовый результат (9910 → 8710): {profit} UZS.",
          periodCloseError: "Ошибка закрытия периода: {error}",
        },
      },
      transactions: {
        importBtn: "Импорт выписки (.txt / CSV)",
        export1CBtn: "Экспорт в 1С",
        export1CTitle: "Скачать в формате 1С:Бухгалтерия Client-Bank",
        dateFromLabel: "С даты",
        dateToLabel: "По дату",
        minAmountLabel: "Минимальная сумма (UZS)",
        minAmountPlaceholder: "Минимальная сумма",
        clearFiltersBtn: "Сбросить фильтры",
        loadingRows: "Транзакции загружаются из базы Supabase...",
        emptyRows: "Подходящие транзакции по данной организации не найдены.",
        totalPrefix: "Всего:",
        operationsWord: "операций",
        pageWord: "Страница",
        prevBtn: "Назад",
        nextBtn: "Вперёд",
        txIdPrefix: "ID транзакции",
        reconcileBtn: "Сверка",
        approvedBtn: "Подтверждено",
        addTxTitle: "Добавить банковскую транзакцию",
        addTxDesc: "Внесите новую приходную или расходную операцию в базу данных Supabase.",
        incomeTypeBtn: "Приход (Доход)",
        expenseTypeBtn: "Расход (Затраты)",
        dateLabel: "Дата *",
        amountLabel: "Сумма (UZS) *",
        amountPlaceholder: "Сумма",
        counterpartyLabel: "Наименование контрагента *",
        counterpartyPlaceholder: "Наименование контрагента",
        counterpartyStirLabel: "ИНН контрагента",
        stirPlaceholder: "ИНН",
        accountCodeLabel: "Бухгалтерский счёт",
        accountCodePlaceholder: "Код счёта",
        purposeLabel: "Назначение платежа / Описание *",
        purposePlaceholder: "Назначение платежа",
        savingBtn: "Сохранение...",
        saveToDbBtn: "Сохранить в базу",
        importTitle: "Загрузка банковской выписки (Импорт)",
        importDesc:
          "Выберите файл 1С (.txt) или .csv, выгруженный из Клиент-Банка Kapitalbank, Hamkorbank, Ipotekabank, SQB или NBU.",
        chooseFilePrompt: "Выберите файл или перетащите сюда",
        importFormatsHint: "Формат: 1С Client-Bank (*.txt) или банковская выписка (*.csv)",
        selectedFilePrefix: "Выбран:",
        detectedCountLabel: "Распознано платежей:",
        incomeCountSuffix: "приход",
        expenseCountSuffix: "расход",
        totalLabel: "Итого:",
        impColDate: "Дата",
        impColType: "Тип",
        impColCounterparty: "Контрагент",
        impColStir: "ИНН",
        impColAmount: "Сумма",
        impColPurpose: "Назначение платежа",
        impIncomeBadge: "Приход",
        impExpenseBadge: "Расход",
        cancelBtn: "Отмена",
        importingBtn: "Запись в базу...",
        importConfirmBtn: "Импортировать в базу Supabase",
        csvHeaders: ["ID", "Дата", "Контрагент", "ИНН", "Тип", "Сумма", "Описание", "Статус"],
        incomeAccFallbackName: "Счёт покупателей",
        expenseAccFallbackName: "Счёт поставщиков",
        unknownError: "Неизвестная ошибка",
        saveFailedFallback: "Ошибка сохранения",
        toasts: {
          exported1C: "Банковская выписка для 1С:Бухгалтерия (kl_to_1c.txt) успешно скачана!",
          noParsedOps:
            "Платёжные операции в файле не найдены. Формат должен быть Excel (.xlsx/.xls), Client-Bank (.txt), XML или CSV.",
          parsedOpsSuccess: "Из файла успешно распознано {count} банковских платежей!",
          fileReadError: "Ошибка чтения файла: {error}",
          loadTxError: "Не удалось загрузить транзакции: {error}",
          importedToDb: "{count} банковских платежей внесены в базу Supabase и связаны с Главной книгой!",
          importError: "Ошибка импорта: {error}",
          csvExported: "Транзакции скачаны в формате CSV",
          txSaved: "Транзакция успешно сохранена в базу данных Supabase!",
          txSaveError: "Произошла ошибка: {error}",
          txApproved: "Транзакция «{counterparty}» подтверждена и проведена в Главную книгу!",
          txApproveError: "Ошибка подтверждения: {error}",
          txRejected: "Транзакция «{counterparty}» отклонена.",
          txRejectError: "Ошибка отклонения: {error}",
          batchApproved: "{count} транзакций подтверждены и проведены в Главную книгу!",
          batchApproveError: "Ошибка массового подтверждения: {error}",
        },
      },
      settings: {
        defaultAccountantName: "Главный бухгалтер",
        personalSubtitle: "Личный профиль, безопасность, уведомления и язык интерфейса",
        profileTab: "Профиль",
        personalCardTitle: "Данные личного аккаунта",
        personalCardDesc: "Ваш аккаунт и статус текущей подписки",
        nameProfileLabel: "Имя / Профиль",
        defaultUserName: "Пользователь",
        emailLabel: "Электронная почта",
        hideTooltip: "Скрыть email",
        showTooltip: "Показать email",
        hideEmailAria: "Скрыть email",
        showEmailAria: "Показать email",
        currentPlanLabel: "Текущий тариф",
        trialPlanBadge: "Pro (Пробный)",
        planDesc: "Просматривайте тарифы и месячные лимиты на странице Подписок",
        openBillingBtn: "Открыть подписки",
        loadingEntities: "Загрузка организаций...",
        emptyEntities: "В данном рабочем пространстве организации не добавлены.",
        regimeVatProfit: "НДС + Прибыль",
        regimeTurnover: `Налог с оборота (${TURNOVER_RATE_RANGE})`,
        regimeFixed: "Фиксированный налог",
        authenticatedSession: "Аутентифицированная сессия",
        supabaseSessionNote: "JWT-сессия Supabase Auth",
        langUz: "Oʻzbekcha (Lotin)",
        langRu: "Русский (Официальный)",
        langEn: "English (Global)",
        addEntityDesc: "Ввод реквизитов нового юридического лица и сохранение в базу Supabase.",
        legalNameLabel: "Юридическое название *",
        legalNamePlaceholder: "Юридическое название компании",
        tradeNameLabel: "Торговая марка",
        tradeNamePlaceholder: "Краткое название",
        tinLabel: "ИНН (9 цифр) *",
        tinPlaceholder: "ИНН",
        legalFormLabel: "Организационная форма *",
        companyTypes: {
          mchj: "ООО (Общество с ограниченной ответственностью)",
          yatt: "ИП (Индивидуальный предприниматель)",
          xk: "ЧП (Частное предприятие)",
          aj: "АО (Акционерное общество)",
          ok: "СП (Семейное предприятие)",
        },
        taxRegimeLabel: "Налоговый режим *",
        taxRegimeOptVat: "НДС (12%) + Налог на прибыль",
        taxRegimeOptTurnover: `Налог с оборота (${TURNOVER_RATE_RANGE})`,
        taxRegimeOptFixed: "Фиксированный налог",
        rolePositionLabel: "Должность ответственного (необязательно)",
        rolePositionPlaceholder: "Должность",
        savingBtn: "Сохранение...",
        addEntitySubmitBtn: "Добавить организацию",
        editEntityTitle: "Редактировать данные организации",
        editEntityDesc: "Обновление реквизитов и налогового режима юридического лица",
        tinInnLabel: "ИНН *",
        editTaxRegimeLabel: "Налоговый режим",
        chiefAccountantLabel: "Главный бухгалтер",
        toasts: {
          loadEntitiesError: "Не удалось загрузить организации из базы",
          entityCreated: "Новая организация и 22 счёта НСБУ сохранены в базу Supabase!",
          entityCreateError: "Ошибка добавления организации: {error}",
          entityUpdated: "Данные «{name}» обновлены в базе Supabase!",
          entityUpdateError: "Ошибка редактирования: {error}",
          emailAlertsOn: "Email-уведомления включены",
          emailAlertsOff: "Email-уведомления отключены",
          telegramAlertsOn: "Telegram-уведомления включены",
          telegramAlertsOff: "Telegram-уведомления отключены",
          languageChanged: "Язык изменён: {lang}",
        },
      },
      tax: {
        vatCardTitle: "НДС (12% Чистый платёж)",
        vatCardSub: "Начислено: {out} • Зачёт: {in}",
        jshdsCardTitle: "НДФЛ (12%)",
        socialCardTitle: "Социальный налог (12%)",
        profitFallbackTitle: "Налог на прибыль (15%)",
        calculatedBadge: "Начислено",
        awaitingBadge: "Ожидается",
        deadlinePrefix: "Срок:",
        ledger6410Note: "Начислено по Главной книге (6410 Кт)",
        ledger6520Note: "Начислено по Главной книге (6520 Кт)",
        noReportForPeriod: "Нет отчёта за данный период",
        periodPrefix: "Период:",
        quarterlyReportNote: "Квартальный отчёт",
        calendarDesc: "Календарь Soliq.uz и контроль сроков",
        loadingCalendar: "Загрузка налогового календаря...",
        emptyCalendar: "Предстоящие налоговые сроки для данной организации не добавлены.",
        deadlineItemLabel: "сроков",
        colCalculated: "Начислено",
        colPaid: "Уплачено",
        loadingRecords: "Загрузка налоговых обязательств...",
        emptyRecords: "Налоговые обязательства по данной организации не найдены.",
        taxItemLabel: "налогов",
        modalPeriodDeadline: "Отчётный период: {period} • Срок сдачи: {deadline}",
        summaryCalculated: "Начисленная сумма налога:",
        summaryPaid: "Уплаченная сумма:",
        summaryRemaining: "Остаток к оплате:",
        accountCodeLabel: "Бухгалтерский счёт:",
        payingBtn: "Оплата...",
        payTaxBtn: "Оплатить налог (Дт 6410 / Кт 5110)",
        vatModalDesc: "Реальный расчёт НДС (12%) на основе Главной книги (счета 6410 и 4410) и ЭСФ Didox",
        vatOutputLabel: "Исходящий НДС по ЭСФ (6410 Кт):",
        vatInputLabel: "Входящий НДС к зачёту (4410 Дт):",
        vatNetLabel: "Чистый НДС к уплате в бюджет:",
        savingBtn: "Сохранение...",
        csvHeaders: ["Вид налога", "Период", "Начислено (UZS)", "Уплачено (UZS)", "Срок", "Статус"],
        offsetJournalDesc: "Зачёт НДС: уменьшение 6410 (НДС в бюджет) за счёт 4410 (Входящий НДС)",
        debit6410Name: "Задолженность по платежам в бюджет (Налоги)",
        credit4410Name: "Авансовые платежи по налогам в бюджет (НДС)",
        taxCommitteeCounterparty: "Государственный налоговый комитет (Единый казначейский счёт)",
        taxPaymentDescSuffix: "уплата налога",
        toasts: {
          loadError: "Не удалось загрузить налоговые данные из базы",
          csvExported: "Реестр налоговых обязательств скачан в формате CSV!",
          insufficientVatBalance: "На счетах 6410 и 4410 недостаточно остатка для зачёта.",
          vatOffsetSuccess:
            "Расчёт НДС подтверждён! Сумма зачёта ({amount} сум) отражена в Главной книге (Дт 6410 / Кт 4410).",
          vatOffsetError: "Ошибка сохранения проводки НДС: {error}",
          alreadyPaidInfo: "Данное налоговое обязательство полностью оплачено!",
          taxPaidSuccess:
            "Оплата налога «{type}» на сумму {amount} сум выполнена и сохранена в Главной книге (Дт 6410 / Кт 5110)!",
          taxPayError: "Ошибка сохранения налогового платежа: {error}",
        },
      },
      aiAuditor: {
        monitoringBadge: "Мониторинг 24/7",
        recheckBtn: "Перепроверить",
        openSuspicions: "Открытые подозрения",
        resolvedCountLabel: "Решённые",
        severityWarning: "Предупреждение",
        severityInfo: "Инфо",
        emptyExceptions: "Подходящие ошибки для данной организации не найдены.",
        exceptionItemLabel: "замечаний",
        sourceSystemLabel: "Система-источник:",
        referenceIdLabel: "ID документа / транзакции:",
        detailsLabel: "Подробности:",
        resolvedBtn: "Решено",
        selectPrompt: "Выберите замечание из списка для просмотра деталей",
        auditTrailTitle: "Журнал действий ИИ-агента (Audit Trail)",
        auditTrailDesc:
          "История всех предложений ИИ-ассистента и агента, а также решений Human-in-the-Loop",
        refreshBtn: "Обновить",
        loadingLogs: "Загрузка журнала...",
        emptyLogs:
          "Журнал действий ИИ-агента пока пуст. Записи появятся после подтверждения проводок или операций через ИИ-панель.",
        colTime: "Время",
        colActionType: "Тип действия",
        colSummary: "Описание (Summary)",
        colModel: "Модель",
        colDecision: "Решение (Decision)",
        logItemLabel: "действий",
        correctiveEntryPrefix: "Корректирующая проводка ИИ-аудитора",
        account6010Name: "Счета к оплате поставщикам и подрядчикам",
        account5110Name: "Расчётный счёт (в национальной валюте)",
        errorFallback: "Ошибка",
        forwardSuccessMsg: "Направлено главному бухгалтеру для личного рассмотрения («in_review»)!",
        toasts: {
          recheckDone: "Проверка ИИ-аудитора завершена: найдено {open} открытых и {total} всего записей.",
          approvedSuccess: "Рекомендация ИИ одобрена, корректирующая проводка сохранена в Главную книгу!",
          rejectedSuccess: "Замечание отклонено и переведено в статус рассмотрения (in_review).",
          actionError: "Ошибка выполнения действия: {error}",
        },
      },
      finance: {
        subtitleSuffix: "Формы на основе реальной Главной книги (Ledger)",
        pdfBtnLabel: "PDF",
        excelBtnLabel: "Excel",
        emptyCashflow: "Данные о движении денежных средств пока отсутствуют.",
        pnlCsvHeaders: ["Код строки", "Наименование показателя", "Предыдущий период (UZS)", "Отчётный период (UZS)"],
        balanceCsvHeaders: ["Код строки", "Наименование показателя", "Сумма (UZS)"],
        pnlRows: {
          r010: "Чистая выручка от реализации продукции (товаров, работ, услуг) (9010)",
          r020: "Себестоимость реализованной продукции (9110)",
          r030: "Валовая прибыль (убыток) от реализации продукции",
          r050: "Административные расходы (9420)",
          r060: "Прочие операционные расходы (9430)",
          r100: "Прибыль от основной деятельности",
          r250: "Налог на прибыль (15%)",
          r270: "Чистая прибыль (убыток) отчётного периода",
        },
        balanceRows: {
          assetsHeader: "I. АКТИВЫ (СРЕДСТВА)",
          fixedAssets: "Основные средства и капитальные вложения (0100, 0820)",
          inventory: "Товарно-материальные запасы и склад (1010–2910)",
          receivables: "Дебиторская задолженность и авансы (4010–4410)",
          cash: "Денежные средства: Касса и расчётные счета (5010–5210)",
          assetsTotal: "ИТОГО АКТИВ БАЛАНСА",
          liabilitiesHeader: "II. ПАССИВЫ (ОБЯЗАТЕЛЬСТВА И КАПИТАЛ)",
          equityCapital: "Уставный капитал (8330)",
          retainedEarnings: "Нераспределённая прибыль (8710 + Чистая прибыль)",
          payablesSuppliers: "Поставщики и полученные авансы (6010, 6310)",
          taxPayables: "Задолженность перед бюджетом и налоги (6410)",
          payrollPayables: "Задолженность по оплате труда (6710)",
          liabilitiesTotal: "ИТОГО ПАССИВ БАЛАНСА",
        },
        toasts: {
          excelExported: "{filename} успешно скачан!",
          pdfReady: "Отчёт подготовлен для печати / сохранения в PDF",
        },
      },
    },
  },
  en: {
    commonLoading: "Loading...",
    reconcile: {
      title: "Bank ↔ 1C Reconciliation",
      savedHistoryBtn: "Saved History",
      resetBtn: "Reset",
      bankSectionTitle: "1. Bank Statement",
      bankFormatsHint: ".xlsx, .txt, .csv, .xls",
      bankUploadPrompt: "Select bank file (.xlsx, .txt, .csv, .xls)",
      pasteFromTableBtn: "Paste from spreadsheet (Ctrl+V)",
      operationsCountSuffix: "operations",
      oneCSectionTitle: "2. 1C File",
      oneCFormatsHint: ".xlsx, .xml, .txt, .csv",
      oneCUploadPrompt: "Select 1C file (.xlsx, .xml, .txt, .csv)",
      pasteBtn: "Paste",
      siteDbBtn: "App Database",
      recordsCountSuffix: "records",
      kpiMatched: "100% Matched",
      kpiMismatch: "Amount / Date Mismatch",
      kpiBankOnly: "In Bank, Missing in 1C",
      kpiOneCOnly: "In 1C, Missing in Bank",
      totalIncomeLabel: "Total Income (Bank vs 1C)",
      incomeMatchedZero: "Income matched (0)",
      totalExpenseLabel: "Total Expense (Bank vs 1C)",
      expenseMatchedZero: "Expense matched (0)",
      diffPrefix: "Diff",
      tabAll: "All",
      tabBankOnly: "Missing in 1C",
      tabMismatch: "Discrepancies",
      tabOneCOnly: "Missing in Bank",
      tabMatched: "Matched",
      searchPlaceholder: "Search counterparty, TIN, amount...",
      aiVerifyBtn: "Verify with AI",
      export1CTxtBtn: "Export to 1C (.txt)",
      export1CXmlBtn: "1C Entries (.xml)",
      exportCsvBtn: "CSV Report",
      savedBtn: "Saved",
      saveToHistoryBtn: "Save to History",
      postToLedgerBtn: "Post to Ledger",
      aiVerifiedNote: "Verified by AI",
      rulesVerifiedNote: "Verified by strict rules",
      selectAllAria: "Select all",
      colStatus: "Status",
      colDate: "Date",
      colCounterparty: "Counterparty",
      colBankAmount: "Bank Amount",
      colOneCAmount: "1C Amount",
      colAccount: "Account",
      colVat: "VAT 12%",
      colAiNote: "AI Note & Recommendation",
      emptyFilteredRows: "No records found matching this filter.",
      selectRowAriaSuffix: "select",
      accountSelectAriaSuffix: "account",
      statusMatched: "Matched",
      statusMismatch: "Mismatch",
      statusBankOnly: "Missing in 1C",
      statusOneCOnly: "Missing in Bank",
      stirPrefix: "TIN",
      vatToggleTitle: "Toggle 12% VAT extraction",
      vatOn: "VAT 12%",
      vatOff: "No VAT",
      rowItemLabel: "rows",
      historyTitle: "Saved Reconciliation History",
      historyAllMonths: "All",
      historyLoading: "Loading history...",
      historyEmpty: "No saved reconciliations",
      histColMonth: "Month",
      histColFiles: "Files",
      histColRows: "Rows",
      histColBankIncome: "Bank Income",
      histColBankExpense: "Bank Expense",
      histColStatus: "Status",
      histColAction: "Action",
      histStatusPosted: "In Ledger",
      histStatusReviewed: "Reviewed",
      histOpenBtn: "Open",
      histDeleteAria: "Delete",
      historyItemLabel: "batches",
      pasteBankTitle: "Paste Bank Statement",
      pasteOneCTitle: "Paste 1C Table",
      pastePlaceholder: "Paste spreadsheet rows here",
      cancelBtn: "Cancel",
      parseAndCompareBtn: "Parse & Compare",
      modeSelected: "selected",
      modeMissingIn1C: "missing in 1C",
      modeAll: "all",
      defaultCompany: "Company",
      defaultOperation: "Operation",
      vatTag: "VAT 12%",
      accountTagPrefix: "Account",
      dbSourceName: "FIRMUS General Ledger / Transactions",
      pasteBankLabel: "Bank (Ctrl+V table)",
      pasteOneCLabel: "1C (Ctrl+V table)",
      unknownError: "Unknown error",
      toasts: {
        batchNotFound: "Saved batch not found",
        batchLoaded: "«{title}» loaded",
        batchLoadError: "Failed to load: {error}",
        noRowsParsed:
          "No operations could be parsed from «{label}». Please use Client-Bank (.txt), 1C XML, CSV/TSV, or Excel HTML table format.",
        rowLimitExceeded:
          "The file contains {count} rows. {plan} plan limit: max {limit} rows.",
        bankRowsLoaded: "Parsed {count} operations from bank statement.",
        oneCRowsLoaded: "Parsed {count} records from 1C data.",
        fileSizeExceeded:
          "File size must not exceed {plan} plan limit ({maxMb} MB)",
        fileReadError: "Failed to read file: {error}",
        pasteEmpty: "First paste text copied from Excel or a bank table",
        selectEntityFirst: "Please select or quick-add a company first",
        dbCompared: "Reconciled against {count} records from database.",
        dbReadError: "Failed to read from database: {error}",
        addEntityToSave: "Please add a company first to save",
        personalAccountPreparing: "Personal account is being prepared, please wait",
        savedToHistory: "Reconciliation saved to history!",
        saveError: "Failed to save: {error}",
        deletedFromHistory: "Deleted from history",
        deleteError: "Failed to delete: {error}",
        allMatchedInfo: "All operations match 100%! No discrepancies found to review.",
        aiErrorFallback: "AI reconciliation error",
        aiVerifiedSuccess: "AI verified discrepancies and confirmed accounts!",
        aiAnalyzeError: "AI analysis error: {error}",
        noExportData: "No data available for export",
        exported1CTxt: "{count} ({mode}) operations downloaded as 1C (.txt) file!",
        noXmlExportData: "No data available for XML export",
        exported1CXml: "{count} ({mode}) journal entries downloaded in 1C EnterpriseData XML format!",
        exportedCsv: "Excel/CSV Reconciliation report downloaded!",
        connectEntityToPost: "Please quick-connect a company using the banner above before posting to the ledger",
        selectRowsToPost: "Please select rows to post to the General Ledger",
        postedToLedger: "{count} confirmed operations atomically posted to the General Ledger!",
        postLedgerError: "Failed to post to General Ledger: {error}",
      },
    },
    erpExtra: {
      accounting: {
        defaultReversalReason: "Incorrect amount entered",
        export1CXmlBtn: "Export to 1C (XML)",
        export1CXmlTitle: "Download in 1C:Enterprise EnterpriseData XML format",
        closePeriodBtn: "Close Period",
        coaCountSuffix: "accounts",
        newCoaBtn: "New Account / Sub-account",
        colCategory: "Category",
        colType: "Type",
        emptyCoa: "Chart of accounts not found.",
        typeActive: "Asset",
        typePassive: "Liability",
        typeActivePassive: "Asset-Liability",
        coaItemLabel: "accounts",
        colUser: "User",
        loadingEntries: "Loading journal entries from Supabase...",
        emptyEntries: "No journal entries found for this entity.",
        totalEntriesPrefix: "Total:",
        entriesWord: "entries",
        pageWord: "Page",
        prevBtn: "Previous",
        nextBtn: "Next",
        stornoBtn: "Reverse (Storno)",
        tbBalanced: "Balance sheet rule satisfied: Debit = Credit",
        tbUnbalanced: "Warning: Debit and Credit mismatch detected",
        colOpeningBalance: "Opening Balance",
        turnoverSuffix: "(Turnover)",
        colClosingBalance: "Closing Balance",
        emptyTrialBalance: "Trial balance data not loaded or no entries posted yet.",
        colDocNumber: "Document No.",
        colCorrAccount: "Corr. Account",
        colRunningBalance: "Running Balance",
        emptyLedgerForAccount: "No activity recorded yet for selected account {account}.",
        glItemLabel: "entries",
        addEntryTitle: "Create Journal Entry",
        addEntryDesc: "Save via atomic transaction using Double-Entry Ledger rules.",
        docNumberLabel: "Document Number *",
        dateLabel: "Date *",
        purposeLabel: "Economic Purpose / Description *",
        purposePlaceholder: "Description",
        debitAccountLabel: "Debit Account (Dr) *",
        creditAccountLabel: "Credit Account (Cr) *",
        amountLabel: "Amount (UZS) *",
        amountPlaceholder: "Amount",
        savingBtn: "Saving...",
        saveEntryBtn: "Save Entry",
        stornoTitle: "Reverse Journal Entry (Storno)",
        stornoDesc:
          "Posted entries cannot be deleted. Instead, a counter-entry (reversal) is created and the original entry is marked as «reversed».",
        stornoReasonLabel: "Reversal Reason *",
        stornoReasonPlaceholder: "Reversal reason",
        cancelBtn: "Cancel",
        stornoWorkingBtn: "Reversing...",
        stornoSubmitBtn: "Create Reversal Entry",
        addCoaTitle: "Add New Account / Sub-account",
        addCoaDesc: "Add a custom account or sub-account for this entity.",
        coaCodeLabel: "Account Code *",
        coaCodePlaceholder: "Account code",
        coaNameLabel: "Account Name *",
        coaNamePlaceholder: "Account name",
        coaTypeLabel: "Account Type (NAS)",
        coaOptAsset: "Asset",
        coaOptLiability: "Liability",
        coaOptEquity: "Equity",
        coaOptRevenue: "Revenue",
        coaOptExpense: "Expense",
        addingBtn: "Adding...",
        saveCoaBtn: "Save Account",
        closePeriodTitle: "Close Period (Month-End Closing)",
        closePeriodDesc:
          "Close all revenue (9010) and expense (9110–9430) accounts for the selected period via 9910 into 8710 (Retained Earnings).",
        fromDateLabel: "Start Date *",
        toDateLabel: "End Date *",
        closingBtn: "Closing...",
        closePeriodSubmitBtn: "Close Period (9910 → 8710)",
        csvHeaders: ["Entry No.", "Date", "Description", "Source", "Debit", "Credit", "Status", "Author"],
        fallbackDebitAcc: "Debit account",
        fallbackCreditAcc: "Credit account",
        balanceErrorFallback: "Balance error",
        toasts: {
          loadEntriesError: "Failed to load journal entries from database",
          csvExported: "Journal entries exported to CSV",
          xmlExported: "1C:Enterprise EnterpriseData XML file downloaded successfully!",
          entrySaved: "Journal entry atomically saved to the Ledger!",
          entrySaveError: "Failed to save entry: {error}",
          coaCodeInvalid: "Account code must be 4–8 digits",
          coaNameTooShort: "Enter an account name of at least 3 characters",
          coaAdded: "Account «{code} — {name}» added to chart of accounts!",
          coaAddError: "Failed to add account: {error}",
          stornoReasonTooShort: "Enter a reversal reason of at least 3 characters",
          stornoSuccess: "Entry «{entryNumber}» reversed (Reversal entry created: {reversal})",
          stornoError: "Failed to reverse entry: {error}",
          selectPeriodDates: "Please select start and end dates",
          periodAlreadyClosed: "This period ({from} — {to}) is already closed ({entry}).",
          periodClosedSuccess: "Period closed successfully ({entry})! Net result (9910 → 8710): {profit} UZS.",
          periodCloseError: "Failed to close period: {error}",
        },
      },
      transactions: {
        importBtn: "Import Statement (.txt / CSV)",
        export1CBtn: "Export to 1C",
        export1CTitle: "Download in 1C:Accounting Client-Bank format",
        dateFromLabel: "From Date",
        dateToLabel: "To Date",
        minAmountLabel: "Min Amount (UZS)",
        minAmountPlaceholder: "Minimum amount",
        clearFiltersBtn: "Clear Filters",
        loadingRows: "Loading transactions from Supabase...",
        emptyRows: "No matching transactions found for this entity.",
        totalPrefix: "Total:",
        operationsWord: "operations",
        pageWord: "Page",
        prevBtn: "Previous",
        nextBtn: "Next",
        txIdPrefix: "Transaction ID",
        reconcileBtn: "Reconcile",
        approvedBtn: "Approved",
        addTxTitle: "Add Bank Transaction",
        addTxDesc: "Record a new income or expense operation in the Supabase database.",
        incomeTypeBtn: "Income (Revenue)",
        expenseTypeBtn: "Expense (Cost)",
        dateLabel: "Date *",
        amountLabel: "Amount (UZS) *",
        amountPlaceholder: "Amount",
        counterpartyLabel: "Counterparty Name *",
        counterpartyPlaceholder: "Counterparty name",
        counterpartyStirLabel: "Counterparty TIN",
        stirPlaceholder: "TIN",
        accountCodeLabel: "Accounting Code",
        accountCodePlaceholder: "Account code",
        purposeLabel: "Payment Purpose / Description *",
        purposePlaceholder: "Payment purpose",
        savingBtn: "Saving...",
        saveToDbBtn: "Save to Database",
        importTitle: "Upload Bank Statement (Import)",
        importDesc:
          "Select a 1C (.txt) or .csv file exported from Kapitalbank, Hamkorbank, Ipotekabank, SQB, or NBU Bank-Client.",
        chooseFilePrompt: "Choose a file or drop it here",
        importFormatsHint: "Format: 1C Client-Bank (*.txt) or Bank statement (*.csv)",
        selectedFilePrefix: "Selected:",
        detectedCountLabel: "Detected payments:",
        incomeCountSuffix: "income",
        expenseCountSuffix: "expense",
        totalLabel: "Total:",
        impColDate: "Date",
        impColType: "Type",
        impColCounterparty: "Counterparty",
        impColStir: "TIN",
        impColAmount: "Amount",
        impColPurpose: "Payment Purpose",
        impIncomeBadge: "Income",
        impExpenseBadge: "Expense",
        cancelBtn: "Cancel",
        importingBtn: "Importing...",
        importConfirmBtn: "Import to Supabase Database",
        csvHeaders: ["ID", "Date", "Counterparty", "TIN", "Type", "Amount", "Description", "Status"],
        incomeAccFallbackName: "Accounts Receivable",
        expenseAccFallbackName: "Accounts Payable",
        unknownError: "Unknown error",
        saveFailedFallback: "Save failed",
        toasts: {
          exported1C: "Bank statement for 1C:Accounting (kl_to_1c.txt) downloaded successfully!",
          noParsedOps:
            "No payment operations found in file. Format must be Excel (.xlsx/.xls), Client-Bank (.txt), XML, or CSV.",
          parsedOpsSuccess: "Successfully parsed {count} bank payments from file!",
          fileReadError: "Failed to read file: {error}",
          loadTxError: "Failed to load transactions: {error}",
          importedToDb: "{count} bank payments imported to Supabase and linked to Ledger!",
          importError: "Import failed: {error}",
          csvExported: "Transactions exported to CSV",
          txSaved: "Transaction successfully saved to Supabase!",
          txSaveError: "Error occurred: {error}",
          txApproved: "Transaction «{counterparty}» approved and posted to General Ledger!",
          txApproveError: "Approval failed: {error}",
          txRejected: "Transaction «{counterparty}» rejected.",
          txRejectError: "Rejection failed: {error}",
          batchApproved: "{count} transactions approved and posted to General Ledger!",
          batchApproveError: "Batch approval failed: {error}",
        },
      },
      settings: {
        defaultAccountantName: "Chief Accountant",
        personalSubtitle: "Personal profile, security, notifications, and interface language",
        profileTab: "Profile",
        personalCardTitle: "Personal Account Details",
        personalCardDesc: "Your account and current subscription status",
        nameProfileLabel: "Name / Profile",
        defaultUserName: "User",
        emailLabel: "Email Address",
        hideTooltip: "Hide email",
        showTooltip: "Show email",
        hideEmailAria: "Hide email address",
        showEmailAria: "Show email address",
        currentPlanLabel: "Current Plan",
        trialPlanBadge: "Pro (Trial)",
        planDesc: "View plans and monthly usage limits on the Billing page",
        openBillingBtn: "Open Billing",
        loadingEntities: "Loading entities...",
        emptyEntities: "No business entities added in this workspace.",
        regimeVatProfit: "VAT + Profit Tax",
        regimeTurnover: `Turnover Tax (${TURNOVER_RATE_RANGE})`,
        regimeFixed: "Fixed Tax",
        authenticatedSession: "Authenticated session",
        supabaseSessionNote: "Supabase Auth JWT session",
        langUz: "Oʻzbekcha (Lotin)",
        langRu: "Русский (Официальный)",
        langEn: "English (Global)",
        addEntityDesc: "Enter legal entity details and save to Supabase.",
        legalNameLabel: "Legal Name *",
        legalNamePlaceholder: "Company legal name",
        tradeNameLabel: "Trade Name",
        tradeNamePlaceholder: "Short name",
        tinLabel: "TIN (9 digits) *",
        tinPlaceholder: "TIN",
        legalFormLabel: "Legal Form *",
        companyTypes: {
          mchj: "LLC (Limited Liability Company)",
          yatt: "Sole Proprietor",
          xk: "Private Enterprise",
          aj: "JSC (Joint Stock Company)",
          ok: "Family Enterprise",
        },
        taxRegimeLabel: "Tax Regime *",
        taxRegimeOptVat: "VAT (12%) + Profit Tax",
        taxRegimeOptTurnover: `Turnover Tax (${TURNOVER_RATE_RANGE})`,
        taxRegimeOptFixed: "Fixed Tax",
        rolePositionLabel: "Responsible Position (optional)",
        rolePositionPlaceholder: "Position",
        savingBtn: "Saving...",
        addEntitySubmitBtn: "Add Entity",
        editEntityTitle: "Edit Entity Details",
        editEntityDesc: "Update legal entity details and tax regime",
        tinInnLabel: "TIN *",
        editTaxRegimeLabel: "Tax Regime",
        chiefAccountantLabel: "Chief Accountant",
        toasts: {
          loadEntitiesError: "Failed to load entities from database",
          entityCreated: "New legal entity and 22 NAS accounts saved to Supabase!",
          entityCreateError: "Failed to add entity: {error}",
          entityUpdated: "«{name}» details updated in Supabase!",
          entityUpdateError: "Failed to update entity: {error}",
          emailAlertsOn: "Email alerts enabled",
          emailAlertsOff: "Email alerts disabled",
          telegramAlertsOn: "Telegram notifications enabled",
          telegramAlertsOff: "Telegram notifications disabled",
          languageChanged: "Language changed: {lang}",
        },
      },
      tax: {
        vatCardTitle: "VAT (12% Net Payable)",
        vatCardSub: "Output: {out} • Offset: {in}",
        jshdsCardTitle: "PIT (12%)",
        socialCardTitle: "Social Tax (12%)",
        profitFallbackTitle: "Profit Tax (15%)",
        calculatedBadge: "Calculated",
        awaitingBadge: "Pending",
        deadlinePrefix: "Due:",
        ledger6410Note: "Calculated from General Ledger (6410 Cr)",
        ledger6520Note: "Calculated from General Ledger (6520 Cr)",
        noReportForPeriod: "No report for this period",
        periodPrefix: "Period:",
        quarterlyReportNote: "Quarterly report",
        calendarDesc: "Soliq.uz tax calendar and deadline tracking",
        loadingCalendar: "Loading tax calendar...",
        emptyCalendar: "No upcoming tax deadlines recorded for this entity.",
        deadlineItemLabel: "deadlines",
        colCalculated: "Calculated",
        colPaid: "Paid",
        loadingRecords: "Loading tax obligations...",
        emptyRecords: "No tax obligations found for this entity.",
        taxItemLabel: "taxes",
        modalPeriodDeadline: "Reporting period: {period} • Filing deadline: {deadline}",
        summaryCalculated: "Calculated tax amount:",
        summaryPaid: "Paid amount:",
        summaryRemaining: "Remaining balance due:",
        accountCodeLabel: "Accounting code:",
        payingBtn: "Paying...",
        payTaxBtn: "Pay Tax (Dr 6410 / Cr 5110)",
        vatModalDesc: "Live VAT (12%) calculation based on General Ledger (6410 & 4410) and Didox E-Invoices",
        vatOutputLabel: "Output VAT from E-Invoices (6410 Cr):",
        vatInputLabel: "Input VAT Offset (4410 Dr):",
        vatNetLabel: "Net VAT Payable to Budget:",
        savingBtn: "Saving...",
        csvHeaders: ["Tax Type", "Period", "Calculated (UZS)", "Paid (UZS)", "Deadline", "Status"],
        offsetJournalDesc: "VAT offset: reduced 6410 (VAT Payable) against 4410 (Input VAT)",
        debit6410Name: "Taxes Payable to Budget",
        credit4410Name: "Prepaid Taxes to Budget (VAT)",
        taxCommitteeCounterparty: "State Tax Committee (Treasury Single Account)",
        taxPaymentDescSuffix: "tax payment",
        toasts: {
          loadError: "Failed to load tax data from database",
          csvExported: "Tax obligations registry exported to CSV!",
          insufficientVatBalance: "Insufficient balance in accounts 6410 and 4410 for VAT offset.",
          vatOffsetSuccess:
            "VAT calculation confirmed! Offset amount ({amount} UZS) posted to General Ledger (Dr 6410 / Cr 4410).",
          vatOffsetError: "Failed to save VAT journal entry: {error}",
          alreadyPaidInfo: "This tax obligation is already paid in full!",
          taxPaidSuccess:
            "Tax payment of {amount} UZS for «{type}» completed and posted to Ledger (Dr 6410 / Cr 5110)!",
          taxPayError: "Failed to save tax payment: {error}",
        },
      },
      aiAuditor: {
        monitoringBadge: "24/7 Monitoring",
        recheckBtn: "Re-check",
        openSuspicions: "Open Anomalies",
        resolvedCountLabel: "Resolved",
        severityWarning: "Warning",
        severityInfo: "Info",
        emptyExceptions: "No matching anomalies found for this entity.",
        exceptionItemLabel: "anomalies",
        sourceSystemLabel: "Source System:",
        referenceIdLabel: "Document / Transaction ID:",
        detailsLabel: "Details:",
        resolvedBtn: "Resolved",
        selectPrompt: "Select an anomaly from the list to view details",
        auditTrailTitle: "AI Agent Action Log (Audit Trail)",
        auditTrailDesc: "History of all AI Copilot & Agent suggestions and Human-in-the-Loop decisions",
        refreshBtn: "Refresh",
        loadingLogs: "Loading action log...",
        emptyLogs:
          "No AI agent action logs yet. Actions will appear here once you approve entries or operations via the AI Drawer.",
        colTime: "Time",
        colActionType: "Action Type",
        colSummary: "Summary",
        colModel: "Model",
        colDecision: "Decision",
        logItemLabel: "actions",
        correctiveEntryPrefix: "AI Auditor corrective entry",
        account6010Name: "Accounts payable to suppliers",
        account5110Name: "Settlement account (National currency)",
        errorFallback: "Error",
        forwardSuccessMsg: "Forwarded to Chief Accountant for manual review («in_review»)!",
        toasts: {
          recheckDone: "AI Auditor scan complete: {open} open and {total} total records found.",
          approvedSuccess: "AI recommendation approved and corrective entry posted to General Ledger!",
          rejectedSuccess: "Anomaly rejected and moved to review («in_review»).",
          actionError: "Failed to execute action: {error}",
        },
      },
      finance: {
        subtitleSuffix: "Statements based on live General Ledger",
        pdfBtnLabel: "PDF",
        excelBtnLabel: "Excel",
        emptyCashflow: "No cash flow data available yet.",
        pnlCsvHeaders: ["Line Code", "Indicator Name", "Previous Period (UZS)", "Current Period (UZS)"],
        balanceCsvHeaders: ["Line Code", "Indicator Name", "Amount (UZS)"],
        pnlRows: {
          r010: "Net revenue from sales of goods, works, and services (9010)",
          r020: "Cost of goods sold (9110)",
          r030: "Gross profit (loss) from sales",
          r050: "Administrative expenses (9420)",
          r060: "Other operating expenses (9430)",
          r100: "Operating profit",
          r250: "Income / Profit tax (15%)",
          r270: "Net profit (loss) for the reporting period",
        },
        balanceRows: {
          assetsHeader: "I. ASSETS",
          fixedAssets: "Fixed assets and capital investments (0100, 0820)",
          inventory: "Inventories and warehouse stock (1010–2910)",
          receivables: "Accounts receivable and advances paid (4010–4410)",
          cash: "Cash on hand and bank accounts (5010–5210)",
          assetsTotal: "TOTAL ASSETS",
          liabilitiesHeader: "II. LIABILITIES AND EQUITY",
          equityCapital: "Authorized / Share capital (8330)",
          retainedEarnings: "Retained earnings (8710 + Net profit)",
          payablesSuppliers: "Accounts payable and advances received (6010, 6310)",
          taxPayables: "Taxes and budget payables (6410)",
          payrollPayables: "Payroll payables (6710)",
          liabilitiesTotal: "TOTAL LIABILITIES & EQUITY",
        },
        toasts: {
          excelExported: "{filename} downloaded successfully!",
          pdfReady: "Report prepared for print / PDF export",
        },
      },
    },
  },
};

export function getReconcileErpDict(locale: Locale): ReconcileErpDict {
  return reconcileErpDict[locale] ?? reconcileErpDict.uz;
}
