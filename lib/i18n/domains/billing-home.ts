import type { Locale } from "../types";
import type { AiModelId, PlanId } from "@/lib/config/plans";
import { getTurnoverRateRangeLabel } from "@/lib/services/uz-tax-calculator";

const TURNOVER_RATE_RANGE = getTurnoverRateRangeLabel();

export interface LocalizedPlanCopy {
  name: string;
  subtitle: string;
  badge?: string;
  soloFeatures: string[];
  b2bFeatures: string[];
}

export interface LocalizedAiModelCopy {
  label: string;
  shortLabel: string;
  description: string;
}

export interface BillingHomeDict {
  currencyLabel: string;
  intlLocale: string;
  plans: {
    items: Record<PlanId, LocalizedPlanCopy>;
    aiModels: Record<AiModelId, LocalizedAiModelCopy>;
  };
  billing: {
    title: string;
    subtitle: string;
    cycleMonthly: string;
    cycleAnnual: string;
    annualDiscountBadge: string;
    annualStandardBadge: string;
    summary: {
      workspaceFallback: string;
      personalAccount: string;
      trialRemaining: string; // e.g. "Sinov: {days} kun qoldi"
      activeBadge: string;
      modelHintSubtitle: string;
      trialBtn: string;
      monthlyAiActivity: string;
      usedPercent: string; // "{pct}% foydalanildi"
      toolsActive: string;
      monthlyLimitReached: string;
      activeAiModel: string;
      starterModelHint: string;
      proModelHint: string;
      savedWorks: string;
      worksCount: string; // "{count} ta ish"
      savedChatsCount: string; // "{count} ta saqlangan chat"
    };
    pricing: {
      freeAmount: string;
      perYear: string;
      perMonth: string;
      annualDiscountNote: string; // "Oyiga {monthly} • 1-yillik 20% chegirma ({saved} tejaladi, faqat 1 marta amal qiladi)"
      annualStandardNote: string;
    };
    cards: {
      currentTrial: string;
      currentPlan: string;
      tryFree7Days: string;
      activePlanDetails: string;
      includedInProPlus: string;
      basicFreePlan: string;
      subscribeOrPay: string;
    };
    dialogs: {
      starter: {
        title: string;
        description: string;
        body: string;
        closeBtn: string;
      };
      activePaid: {
        activePaidBadge: string;
        description: string;
        statusLabel: string;
        statusValue: string;
        expiresLabel: string;
        daysLeftSuffix: string; // "({days} kun qoldi)"
        unlimitedDuration: string;
        monthlyLimitLabel: string;
        creditsUnit: string; // "{credits} ta kredit"
        unlimitedCredits: string;
        proPlusIncludedNotePrefix: string;
        proPlusIncludedNoteSuffix: string;
        closeBtn: string;
        upgradeToProPlusBtn: string;
      };
      checkout: {
        cycleAnnualLabel: string;
        cycleMonthlyLabel: string;
        paymeTitle: string;
        paymeSubtitle: string;
        clickTitle: string;
        clickSubtitle: string;
        bankTitle: string;
        bankSubtitle: string;
        tinLabel: string;
        tinPlaceholder: string;
        companyNameLabel: string;
        companyNamePlaceholder: string;
        companyFallback: string;
        cancelBtn: string;
        getInvoiceBtn: string;
        payAmountBtn: string; // "Toʻlash — {amount}"
      };
      invoice: {
        title: string;
        sellerLabel: string;
        tinPrefix: string;
        accountBankLabel: string;
        buyerLabel: string;
        buyerFallback: string;
        amountLabel: string;
        copiedBtn: string;
        copyBtn: string;
        printBtn: string;
        switchMethodBtn: string;
        confirmDemoBtn: string;
        copyTemplate: {
          header: string; // "HISOB-FAKTURA (INVOYS) № {invNum}"
          date: string; // "Sana: {date}"
          seller: string; // "Yetkazib beruvchi (Sotuvchi): {seller}"
          tin: string; // "STIR: {tin}"
          account: string; // "H/R: {account}"
          bank: string; // "Bank: {bank}, MFO: {mfo}"
          buyer: string; // "Buyurtmachi (Xaridor): {buyer}"
          amount: string; // "Toʻlov summasi: {amount} (0% komissiya)"
          purpose: string; // "Toʻlov maqsadi: {purpose}"
          defaultPurpose: string; // "FIRMUS AI {plan} tarifi uchun obuna toʻlovi. QQS siz"
          orderId: string; // "Buyurtma ID: {orderId}"
        };
      };
      sandbox: {
        paymeTitle: string;
        clickTitle: string;
        badge: string;
        planLabel: string;
        amountLabel: string;
        switchMethodBtn: string;
        confirmBtn: string;
      };
    };
    toast: {
      trialError: string;
      trialSuccess: string;
      trialActivateFailed: string;
      enterTinError: string;
      createOrderFailed: string;
      invoiceGenerated: string;
      orderCreated: string;
      checkoutError: string;
      orderAlreadyPaid: string;
      confirmOrderFailed: string;
      paymentConfirmed: string;
      confirmError: string;
      invoiceCopied: string;
      copyFailed: string;
    };
    pendingBanner: {
      title: string;
      bankSubtitle: string;
      gatewaySubtitle: string;
      viewBtn: string;
      refreshBtn: string;
      cancelBtn: string;
    };
    returnPolling: {
      checkingMsg: string;
      paidSuccessMsg: string;
      pendingStillMsg: string;
      cancelledMsg: string;
      failedMsg: string;
      inFlightWarn: string;
    };
    upgradeValueNote: string;
  };
  home: {
    solo: {
      planTrialLabel: string;
      title: string;
      subtitle: string;
      savedHistoryBtn: string;
      firmusAiBtn: string;
      kpi: {
        monthlyWorksTitle: string;
        monthlyWorksSub: string;
        aiChatsTitle: string;
        aiChatsSub: string;
        totalWorksTitle: string;
        totalWorksSub: string;
        currentPlanTitle: string;
        trialAvailableSub: string;
        managePlanSub: string;
      };
      toolsSectionTitle: string;
      openCta: string;
      tools: {
        aiChatTitle: string;
        aiChatDesc: string;
        reconcileTitle: string;
        reconcileDesc: string;
        scanTitle: string;
        scanDesc: string;
        calcTitle: string;
        calcDesc: string;
        contractTitle: string;
        contractDesc: string;
        historyTitle: string;
        historyDesc: string;
      };
      recentWorks: {
        title: string;
        subtitle: string;
        viewAll: string;
        loading: string;
        empty: string;
        colMonth: string;
        colType: string;
        colName: string;
        colAction: string;
        typeReconcile: string;
        typeContract: string;
        typeReceipt: string;
        openBtn: string;
      };
    };
    erp: {
      savedHistoryBtn: string;
      reconcileHeaderBtn: string;
      quickCards: {
        reconcileTitle: string;
        reconcileDesc: string;
        reconcileCta: string;
        scanTitle: string;
        scanDesc: string;
        scanCta: string;
        calcTitle: string;
        calcDesc: string;
        calcCta: string;
      };
      postedOperationsSub: string; // "{posted} / {total} ta operatsiya oʻtkazilgan"
      netVatTitle: string;
      netVatSub: string;
      emptyCashflow: string;
      quickWorkflowsTitle: string;
      quickWorkflowsSubtitle: string;
      workflows: {
        reconcileTitle: string;
        reconcileSub: string;
        trialBalanceTitle: string;
        trialBalanceSub: string;
        taxFinanceTitle: string;
        taxFinanceSub: string;
        entitySettingsTitle: string;
        entitySettingsSub: string;
      };
      emptyPendingApprovals: string;
      emptyExceptions: string;
      aiVatCalloutPrefix: string; // "«{entity}» korxonasining Bosh kitobiga (6410–4410 schyotlar) koʻra joriy sof QQS majburiyati "
      aiVatCalloutMid: string; // " va ochiq istisnolar "
      aiVatCalloutCountSuffix: string; // "{count} ta"
      aiVatCalloutEnd: string; // "ni tashkil etmoqda."
    };
  };
}

export const BILLING_HOME_DICT: Record<Locale, BillingHomeDict> = {
  uz: {
    currencyLabel: "soʻm",
    intlLocale: "uz-UZ",
    plans: {
      items: {
        starter: {
          name: "Starter",
          subtitle: "Asosiy vositalar va bepul boshlash uchun",
          soloFeatures: [
            "Kundalik soliq va buxgalteriya savollari uchun AI Chat (Gemini 3.8 Flash)",
            "Chek va faktura rasmlarini AI orqali tezkor oʻqish",
            "Bank ↔ 1C fayllarini solishtirish va 1C (.txt / .xml / CSV) ga eksport",
            "Maosh (JShDS 12%), QQS (12%), aylanma soliq va taʼtil kalkulyatorlari",
            "Shartnoma matnidagi xavf va kamchiliklarni tezkor tekshirish",
            "Soʻnggi saqlangan ishlar va suhbatlar tarixiga kirish",
          ],
          b2bFeatures: [
            "1 ta korxona (STIR) bilan asosiy ishlar",
            "Gemini 3.8 Flash modeli",
            "Bank ↔ 1C solishtirish va 1C eksport",
            "Soliq va maosh kalkulyatorlari",
          ],
        },
        professional: {
          name: "Pro",
          subtitle: "Faol buxgalterlar va chuqur tahlil uchun",
          badge: "Tavsiya etiladi",
          soloFeatures: [
            "Starter dagi barcha vositalar — kengaytirilgan oylik hajmda",
            "7 kunlik bepul sinov imkoniyati",
            "Gemini 4 Hydrogen — murakkab soliq va 21-BHMS provodkalari uchun kuchli model",
            "PDF formatidagi faktura, TTN va shartnomalarni toʻgʻridan-toʻgʻri yuklash",
            "Kengaytirilgan Bank ↔ 1C solishtirish va katta jadvallar bilan ishlash",
            "Oylar kesimida toʻliq arxiv va saqlangan AI suhbatlar tarixi",
          ],
          b2bFeatures: [
            "5 tagacha korxona (STIR) va jamoaviy kirish",
            "Gemini 4 Hydrogen va Gemini 3.8 Flash modellari",
            "PDF faktura va shartnomalar ekspertizasi",
            "Kengaytirilgan arxiv va hisobotlar",
          ],
        },
        pro_plus: {
          name: "Pro+",
          subtitle: "Katta hajm, maksimal quvvat va ustuvor yordam",
          soloFeatures: [
            "Pro tarifidagi barcha imkoniyatlar — eng yuqori oylik AI quvvati bilan",
            "Gemini 4 Hydrogen va Gemini 3.8 Flash modellariga ustuvor tezkor ulanish",
            "Koʻp sahifali yirik PDF shartnomalar va hujjatlar paketini tahlil qilish",
            "Eng katta Bank ↔ 1C fayllarni yuklash va uzoq muddatli toʻliq tarix arxivi",
            "Yangi B2B va 1C avtomatlashtirish vositalariga birinchi navbatda kirish",
            "Ustuvor texnik qoʻllab-quvvatlash",
          ],
          b2bFeatures: [
            "Cheksiz korxonalar va kengaytirilgan jamoa rollari",
            "Eng yuqori AI quvvati va ustuvor tezkor navbat",
            "Koʻp sahifali PDF hujjatlar tahlili",
            "Ustuvor texnik qoʻllab-quvvatlash",
          ],
        },
      },
      aiModels: {
        "gemini-3.8-flash": {
          label: "Gemini 3.8 Flash",
          shortLabel: "3.8 Flash",
          description: "Tez va hamyonbop model (kundalik savollar va chek skan)",
        },
        "gemini-4-hydrogen": {
          label: "Gemini 4 Hydrogen",
          shortLabel: "4 Hydrogen",
          description: "Chuqur soliq, 21-BHMS va shartnoma tahlili",
        },
      },
    },
    billing: {
      title: "Obuna va Tariflar",
      subtitle: "Tarif holati, AI imkoniyatlari va yillik yoki oylik rejalarni boshqarish",
      cycleMonthly: "Oylik",
      cycleAnnual: "Yillik",
      annualDiscountBadge: "-20% (1-marta)",
      annualStandardBadge: "Standart",
      summary: {
        workspaceFallback: "Ishchi maydon",
        personalAccount: "Shaxsiy hisob",
        trialRemaining: "Sinov: {days} kun qoldi",
        activeBadge: "Faol",
        modelHintSubtitle:
          "AI modelini toʻgʻridan-toʻgʻri chat oynasidagi yozish qatori tepasidan almashtirishingiz mumkin",
        trialBtn: "7 kun Pro sinov",
        monthlyAiActivity: "Oylik AI faolligi",
        usedPercent: "{pct}% foydalanildi",
        toolsActive: "Asboblar faol ishlamoqda",
        monthlyLimitReached: "Oylik chegara toʻldi",
        activeAiModel: "Faol AI modeli",
        starterModelHint: "Pro tarifida Gemini 4 Hydrogen ochiladi",
        proModelHint: "Chat oynasidan modellarni almashtirish mumkin",
        savedWorks: "Saqlangan ishlar",
        worksCount: "{count} ta ish",
        savedChatsCount: "{count} ta saqlangan chat",
      },
      pricing: {
        freeAmount: "0 soʻm",
        perYear: "/ yiliga",
        perMonth: "/ oyiga",
        annualDiscountNote:
          "Oyiga {monthly} • 1-yillik 20% chegirma ({saved} tejaladi, faqat 1 marta amal qiladi)",
        annualStandardNote:
          "Bir martalik 20% yillik chegirma avval foydalanilgan • Standart yillik tarif",
      },
      cards: {
        currentTrial: "Joriy (Sinov)",
        currentPlan: "Joriy tarif",
        tryFree7Days: "7 kun bepul sinab koʻrish",
        activePlanDetails: "Faol tarif tafsilotlari",
        includedInProPlus: "Pro+ tarkibiga kiradi",
        basicFreePlan: "Asosiy bepul tarif",
        subscribeOrPay: "Ulanish / Toʻlov",
      },
      dialogs: {
        starter: {
          title: "Starter — Boshlangʻich tarif",
          description: "Ushbu tarif barcha foydalanuvchilar uchun 0 soʻm toʻlovsiz faol.",
          body: "Qoʻshimcha AI kreditlari, Gemini 4 Hydrogen modeli, PDF tahlili va kengaytirilgan 1C solishtirish imkoniyatlaridan foydalanish uchun Pro yoki Pro+ tarifini tanlashingiz mumkin.",
          closeBtn: "Tushunarli",
        },
        activePaid: {
          activePaidBadge: "Faol (Toʻlangan)",
          description: "Joriy faol obunangiz haqida maʼlumot.",
          statusLabel: "Holat:",
          statusValue: "Faol obuna",
          expiresLabel: "Amal qilish muddati:",
          daysLeftSuffix: "({days} kun qoldi)",
          unlimitedDuration: "Muddatsiz (Faol)",
          monthlyLimitLabel: "Oylik AI limiti:",
          creditsUnit: "{credits} ta kredit",
          unlimitedCredits: "Cheksiz",
          proPlusIncludedNotePrefix: "Sizda hozir yanada yuqori ",
          proPlusIncludedNoteSuffix:
            " tarifi faol. Professional tarifdagi barcha imkoniyatlar toʻliq sizning obunangizga kiritilgan.",
          closeBtn: "Yopish",
          upgradeToProPlusBtn: "Pro+ ga oʻtish",
        },
        checkout: {
          cycleAnnualLabel: "Yillik",
          cycleMonthlyLabel: "Oylik",
          paymeTitle: "Payme",
          paymeSubtitle: "Uzcard / Humo",
          clickTitle: "Click",
          clickSubtitle: "Click Up / QR / Karta",
          bankTitle: "Bank oʻtkazmasi",
          bankSubtitle: "Yuridik shaxslar (Hisob-faktura)",
          tinLabel: "STIR (INN) *",
          tinPlaceholder: "301234567",
          companyNameLabel: "Korxona / YaTT nomi *",
          companyNamePlaceholder: "MChJ yoki YaTT",
          companyFallback: "Korxona",
          cancelBtn: "Bekor qilish",
          getInvoiceBtn: "Hisob-faktura olish",
          payAmountBtn: "Toʻlash — {amount}",
        },
        invoice: {
          title: "Hisob-faktura (Invoys)",
          sellerLabel: "Yetkazib beruvchi:",
          tinPrefix: "STIR",
          accountBankLabel: "H/R & Bank:",
          buyerLabel: "Buyurtmachi:",
          buyerFallback: "Mijoz",
          amountLabel: "Summa:",
          copiedBtn: "Nusxalandi!",
          copyBtn: "Nusxa olish",
          printBtn: "Chop etish",
          switchMethodBtn: "Boshqa usul",
          confirmDemoBtn: "Toʻlovni tasdiqlash (Demo)",
          copyTemplate: {
            header: "HISOB-FAKTURA (INVOYS) № {invNum}",
            date: "Sana: {date}",
            seller: "Yetkazib beruvchi (Sotuvchi): {seller}",
            tin: "STIR: {tin}",
            account: "H/R: {account}",
            bank: "Bank: {bank}, MFO: {mfo}",
            buyer: "Buyurtmachi (Xaridor): {buyer}",
            amount: "Toʻlov summasi: {amount} (0% komissiya)",
            purpose: "Toʻlov maqsadi: {purpose}",
            defaultPurpose: "FIRMUS AI {plan} tarifi uchun obuna toʻlovi. QQS siz",
            orderId: "Buyurtma ID: {orderId}",
          },
        },
        sandbox: {
          paymeTitle: "Payme toʻlovi",
          clickTitle: "Click toʻlovi",
          badge: "Sandbox",
          planLabel: "Tarif:",
          amountLabel: "Toʻlov summasi:",
          switchMethodBtn: "Boshqa usul",
          confirmBtn: "Toʻlovni tasdiqlash",
        },
      },
      toast: {
        trialError: "Sinovni yoqib boʻlmadi",
        trialSuccess: "7 kunlik bepul Pro sinov yoqildi!",
        trialActivateFailed: "Sinov muddatini yoqib boʻlmadi",
        enterTinError: "Korxona yoki YaTT STIR (INN) raqamini kiriting",
        createOrderFailed: "Toʻlov buyurtmasini yaratib boʻlmadi",
        invoiceGenerated: "Rasmiy hisob-faktura (invoys) shakllantirildi",
        orderCreated: "Toʻlov buyurtmasi yaratildi",
        checkoutError: "Toʻlov jarayonida xatolik yuz berdi",
        orderAlreadyPaid: "Buyurtma avval toʻlangan",
        confirmOrderFailed: "Buyurtmani tasdiqlab boʻlmadi",
        paymentConfirmed: "Toʻlov muvaffaqiyatli tasdiqlandi! Obuna faollashdi.",
        confirmError: "Tasdiqlashda xatolik yuz berdi",
        invoiceCopied: "Invoys rekvizitlari nusxalandi",
        copyFailed: "Nusxalab boʻlmadi",
      },
      pendingBanner: {
        title: "Toʻlanmagan buyurtma",
        bankSubtitle: "{plan} ({amount}) • Bank oʻtkazmasi (Invoys #{orderId}) toʻlovi kutilmoqda",
        gatewaySubtitle: "{plan} ({amount}) • {method} orqali toʻlov tasdiqlanishi kutilmoqda (#{orderId})",
        viewBtn: "Ochish / Toʻlash",
        refreshBtn: "Tekshirish",
        cancelBtn: "Bekor qilish",
      },
      returnPolling: {
        checkingMsg: "Toʻlov holati tekshirilmoqda...",
        paidSuccessMsg: "Toʻlov tasdiqlandi! Obunangiz faollashtirildi.",
        pendingStillMsg: "Toʻlov hali tasdiqlanmadi. Birozdan soʻng qayta tekshiring.",
        cancelledMsg: "Buyurtma bekor qilingan.",
        failedMsg: "Toʻlov amalga oshmadi.",
        inFlightWarn: "Payme/Click toʻlovi hozir jarayonda, bir necha soniya kuting.",
      },
      upgradeValueNote:
        "Joriy faol tarifingizning qolgan kunlari va qiymati yangi tarifga avtomatik oʻtkaziladi.",
    },
    home: {
      solo: {
        planTrialLabel: "Pro (Sinov)",
        title: "Bosh sahifa",
        subtitle: "Buxgalteriya, soliq va hujjat tahlili uchun shaxsiy AI asboblar",
        savedHistoryBtn: "Saqlangan tarix",
        firmusAiBtn: "FIRMUS AI",
        kpi: {
          monthlyWorksTitle: "Shu oydagi ishlar",
          monthlyWorksSub: "Sverka, chek skan va shartnomalar",
          aiChatsTitle: "AI Suhbatlar",
          aiChatsSub: "Saqlangan chat tarixi",
          totalWorksTitle: "Jami saqlangan ishlar",
          totalWorksSub: "Barcha oylar kesimida",
          currentPlanTitle: "Joriy tarif",
          trialAvailableSub: "7 kun bepul Pro sinov mavjud",
          managePlanSub: "Obuna va limitlarni boshqarish",
        },
        toolsSectionTitle: "Asboblar",
        openCta: "Ochish",
        tools: {
          aiChatTitle: "AI Chat & Yordamchi",
          aiChatDesc: "Soliq, BHMS provodkalar va chek rasmi tahlili",
          reconcileTitle: "Bank ↔ 1C AI Sverka",
          reconcileDesc: "Bank koʻchirmasi va 1C fayllarini tezkor solishtirish",
          scanTitle: "Faktura / Chek Skaner",
          scanDesc: "Rasm yoki PDF hujjatdan schyot va summani ajratish",
          calcTitle: "Soliq & Maosh Kalkulyatori",
          calcDesc: `JShDS 12%, QQS 12%, aylanma ${TURNOVER_RATE_RANGE} va taʼtil hisobi`,
          contractTitle: "Shartnoma Xavf Tekshiruvi",
          contractDesc: "Penya, avans va QQS shartlarini AI bilan tekshirish",
          historyTitle: "Saqlangan Tarix",
          historyDesc: "Barcha sverka, skan va shartnoma natijalari",
        },
        recentWorks: {
          title: "Oxirgi ishlar",
          subtitle: "Soʻnggi saqlangan sverka, skan va shartnoma tekshiruvlari",
          viewAll: "Barchasi",
          loading: "Yuklanmoqda...",
          empty: "Hozircha saqlangan ishlar yoʻq. Yuqoridagi asboblardan birini tanlab boshlang.",
          colMonth: "Oy",
          colType: "Turi",
          colName: "Nomi",
          colAction: "Amal",
          typeReconcile: "Bank ↔ 1C",
          typeContract: "Shartnoma",
          typeReceipt: "Chek / Faktura",
          openBtn: "Ochish",
        },
      },
      erp: {
        savedHistoryBtn: "Saqlangan tarix",
        reconcileHeaderBtn: "Bank ↔ 1C AI Sverka",
        quickCards: {
          reconcileTitle: "Bank ↔ 1C Sverka",
          reconcileDesc: "Bank koʻchirmasi va 1C fayllarini 5 soniyada solishtirish",
          reconcileCta: "Ochish",
          scanTitle: "Faktura / Chek Skaner",
          scanDesc: "Rasm yoki PDF hujjatdan schyot va summani ajratish",
          scanCta: "Yuklash",
          calcTitle: "Kalkulyator va Soliq AI",
          calcDesc: `JShDS 12%, QQS 12%, aylanma ${TURNOVER_RATE_RANGE} va taʼtil hisobi`,
          calcCta: "Ochish",
        },
        postedOperationsSub: "{posted} / {total} ta operatsiya oʻtkazilgan",
        netVatTitle: "Sof QQS (6410–4410)",
        netVatSub: "Bosh kitobdagi joriy QQS majburiyati",
        emptyCashflow: "Ushbu korxona boʻyicha hozircha pul oqimi operatsiyalari mavjud emas.",
        quickWorkflowsTitle: "Tezkor buxgalter amallari",
        quickWorkflowsSubtitle: "Eng koʻp ishlatiladigan kundalik vazifalar",
        workflows: {
          reconcileTitle: "Bank ↔ 1C AI Sverka",
          reconcileSub: "Fayl yuklab 5 soniyada solishtirish",
          trialBalanceTitle: "Oborot-saldovaya vedomost",
          trialBalanceSub: "Qoldiqlar va davr yopish",
          taxFinanceTitle: "Soliqlar va Moliya",
          taxFinanceSub: "QQS (12%), Balans va Foyda hisoboti",
          entitySettingsTitle: "Korxona sozlamalari",
          entitySettingsSub: "STIR, soliq rejimi va tilni boshqarish",
        },
        emptyPendingApprovals: "Tasdiqlashni kutayotgan tranzaksiyalar yoʻq.",
        emptyExceptions: "Ochiq audit xatoliklari topilmadi.",
        aiVatCalloutPrefix:
          "«{entity}» korxonasining Bosh kitobiga (6410–4410 schyotlar) koʻra joriy sof QQS majburiyati ",
        aiVatCalloutMid: " va ochiq istisnolar ",
        aiVatCalloutCountSuffix: "{count} ta",
        aiVatCalloutEnd: "ni tashkil etmoqda.",
      },
    },
  },
  ru: {
    currencyLabel: "сум",
    intlLocale: "ru-RU",
    plans: {
      items: {
        starter: {
          name: "Starter",
          subtitle: "Для базовых инструментов и бесплатного старта",
          soloFeatures: [
            "AI-чат для ежедневных налоговых и бухгалтерских вопросов (Gemini 3.8 Flash)",
            "Быстрое распознавание чеков и счетов-фактур с помощью AI",
            "Сверка файлов Банк ↔ 1C и экспорт в 1C (.txt / .xml / CSV)",
            "Калькуляторы зарплаты (НДФЛ 12%), НДС (12%), налога с оборота и отпускных",
            "Экспресс-проверка рисков и недочётов в тексте договоров",
            "Доступ к истории сохранённых работ и чатов",
          ],
          b2bFeatures: [
            "Базовая работа с 1 компанией (ИНН)",
            "Модель Gemini 3.8 Flash",
            "Сверка Банк ↔ 1C и экспорт в 1C",
            "Налоговый и зарплатный калькуляторы",
          ],
        },
        professional: {
          name: "Pro",
          subtitle: "Для активных бухгалтеров и глубокого анализа",
          badge: "Рекомендуется",
          soloFeatures: [
            "Все инструменты Starter — с расширенным месячным объёмом",
            "7-дневный бесплатный пробный период",
            "Gemini 4 Hydrogen — мощная модель для сложных налоговых задач и проводок по НСБУ № 21",
            "Прямая загрузка PDF счетов-фактур, ТТН и договоров",
            "Расширенная сверка Банк ↔ 1C и работа с большими таблицами",
            "Полный архив по месяцам и история сохранённых AI-чатов",
          ],
          b2bFeatures: [
            "До 15 компаний (ИНН) и командный доступ",
            "Модели Gemini 4 Hydrogen и Gemini 3.8 Flash",
            "Экспертиза PDF счетов-фактур и договоров",
            "Расширенный архив и отчёты",
          ],
        },
        pro_plus: {
          name: "Pro+",
          subtitle: "Большие объёмы, максимальная мощность и приоритетная поддержка",
          soloFeatures: [
            "Все возможности тарифа Pro — с максимальной месячной квотой AI",
            "Приоритетный быстрый доступ к моделям Gemini 4 Hydrogen и Gemini 3.8 Flash",
            "Анализ крупных многостраничных PDF-договоров и пакетов документов",
            "Загрузка крупнейших файлов Банк ↔ 1C и долгосрочный полный архив",
            "Первоочередной доступ к новым B2B-инструментам и автоматизации 1C",
            "Приоритетная техническая поддержка",
          ],
          b2bFeatures: [
            "Безлимитное число компаний и расширенные роли команды",
            "Максимальная мощность AI и приоритетная очередь",
            "Анализ многостраничных PDF-документов",
            "Приоритетная техническая поддержка",
          ],
        },
      },
      aiModels: {
        "gemini-3.8-flash": {
          label: "Gemini 3.8 Flash",
          shortLabel: "3.8 Flash",
          description: "Быстрая и экономичная модель (повседневные вопросы и скан чеков)",
        },
        "gemini-4-hydrogen": {
          label: "Gemini 4 Hydrogen",
          shortLabel: "4 Hydrogen",
          description: "Глубокий анализ налогов, НСБУ № 21 и договоров",
        },
      },
    },
    billing: {
      title: "Подписка и Тарифы",
      subtitle: "Статус тарифа, возможности AI и управление годовыми или месячными планами",
      cycleMonthly: "Ежемесячно",
      cycleAnnual: "Ежегодно",
      annualDiscountBadge: "-20% (1-й раз)",
      annualStandardBadge: "Стандарт",
      summary: {
        workspaceFallback: "Рабочее пространство",
        personalAccount: "Личный кабинет",
        trialRemaining: "Пробный: осталось {days} дн.",
        activeBadge: "Активен",
        modelHintSubtitle:
          "Вы можете переключать AI-модель прямо над строкой ввода в окне чата",
        trialBtn: "7 дней Pro бесплатно",
        monthlyAiActivity: "Месячная активность AI",
        usedPercent: "Использовано {pct}%",
        toolsActive: "Инструменты работают активно",
        monthlyLimitReached: "Месячный лимит исчерпан",
        activeAiModel: "Активная AI-модель",
        starterModelHint: "На тарифе Pro открывается Gemini 4 Hydrogen",
        proModelHint: "Модель можно переключать в окне чата",
        savedWorks: "Сохранённые работы",
        worksCount: "{count} работ",
        savedChatsCount: "{count} сохранённых чатов",
      },
      pricing: {
        freeAmount: "0 сум",
        perYear: "/ в год",
        perMonth: "/ в месяц",
        annualDiscountNote:
          "{monthly} в месяц • Скидка 20% на 1-й год (экономия {saved}, действует только 1 раз)",
        annualStandardNote:
          "Разовая годовая скидка 20% уже использована • Стандартный годовой тариф",
      },
      cards: {
        currentTrial: "Текущий (Пробный)",
        currentPlan: "Текущий тариф",
        tryFree7Days: "Попробовать 7 дней бесплатно",
        activePlanDetails: "Детали активного тарифа",
        includedInProPlus: "Включено в Pro+",
        basicFreePlan: "Базовый бесплатный тариф",
        subscribeOrPay: "Подключить / Оплатить",
      },
      dialogs: {
        starter: {
          title: "Starter — Базовый тариф",
          description: "Этот тариф активен для всех пользователей бесплатно (0 сум).",
          body: "Чтобы получить дополнительные AI-кредиты, модель Gemini 4 Hydrogen, анализ PDF и расширенную сверку 1C, выберите тариф Pro или Pro+.",
          closeBtn: "Понятно",
        },
        activePaid: {
          activePaidBadge: "Активен (Оплачен)",
          description: "Информация о вашей текущей активной подписке.",
          statusLabel: "Статус:",
          statusValue: "Активная подписка",
          expiresLabel: "Срок действия:",
          daysLeftSuffix: "(осталось {days} дн.)",
          unlimitedDuration: "Бессрочно (Активен)",
          monthlyLimitLabel: "Месячный лимит AI:",
          creditsUnit: "{credits} кредитов",
          unlimitedCredits: "Безлимит",
          proPlusIncludedNotePrefix: "У вас уже активен более высокий тариф ",
          proPlusIncludedNoteSuffix:
            ". Все возможности тарифа Professional полностью включены в вашу подписку.",
          closeBtn: "Закрыть",
          upgradeToProPlusBtn: "Перейти на Pro+",
        },
        checkout: {
          cycleAnnualLabel: "Годовой",
          cycleMonthlyLabel: "Месячный",
          paymeTitle: "Payme",
          paymeSubtitle: "Uzcard / Humo",
          clickTitle: "Click",
          clickSubtitle: "Click Up / QR / Карта",
          bankTitle: "Банковский перевод",
          bankSubtitle: "Юридические лица (Счёт-фактура)",
          tinLabel: "ИНН (STIR) *",
          tinPlaceholder: "301234567",
          companyNameLabel: "Название организации / ИП *",
          companyNamePlaceholder: "ООО или ИП",
          companyFallback: "Организация",
          cancelBtn: "Отмена",
          getInvoiceBtn: "Получить счёт-фактуру",
          payAmountBtn: "Оплатить — {amount}",
        },
        invoice: {
          title: "Счёт-фактура (Инвойс)",
          sellerLabel: "Поставщик:",
          tinPrefix: "ИНН",
          accountBankLabel: "Р/С и Банк:",
          buyerLabel: "Заказчик:",
          buyerFallback: "Клиент",
          amountLabel: "Сумма:",
          copiedBtn: "Скопировано!",
          copyBtn: "Копировать",
          printBtn: "Печать",
          switchMethodBtn: "Другой способ",
          confirmDemoBtn: "Подтвердить оплату (Демо)",
          copyTemplate: {
            header: "СЧЁТ-ФАКТУРА (ИНВОЙС) № {invNum}",
            date: "Дата: {date}",
            seller: "Поставщик (Продавец): {seller}",
            tin: "ИНН: {tin}",
            account: "Р/С: {account}",
            bank: "Банк: {bank}, МФО: {mfo}",
            buyer: "Заказчик (Покупатель): {buyer}",
            amount: "Сумма к оплате: {amount} (комиссия 0%)",
            purpose: "Назначение платежа: {purpose}",
            defaultPurpose: "Оплата подписки FIRMUS AI по тарифу {plan}. Без НДС",
            orderId: "ID заказа: {orderId}",
          },
        },
        sandbox: {
          paymeTitle: "Оплата Payme",
          clickTitle: "Оплата Click",
          badge: "Sandbox",
          planLabel: "Тариф:",
          amountLabel: "Сумма оплаты:",
          switchMethodBtn: "Другой способ",
          confirmBtn: "Подтвердить оплату",
        },
      },
      toast: {
        trialError: "Не удалось активировать пробный период",
        trialSuccess: "7-дневный бесплатный пробный период Pro активирован!",
        trialActivateFailed: "Не удалось включить пробный период",
        enterTinError: "Введите ИНН (STIR) организации или ИП",
        createOrderFailed: "Не удалось создать заказ на оплату",
        invoiceGenerated: "Официальный счёт-фактура (инвойс) сформирован",
        orderCreated: "Заказ на оплату создан",
        checkoutError: "Произошла ошибка при оформлении оплаты",
        orderAlreadyPaid: "Заказ уже оплачен ранее",
        confirmOrderFailed: "Не удалось подтвердить заказ",
        paymentConfirmed: "Оплата успешно подтверждена! Подписка активирована.",
        confirmError: "Произошла ошибка при подтверждении",
        invoiceCopied: "Реквизиты инвойса скопированы",
        copyFailed: "Не удалось скопировать",
      },
      pendingBanner: {
        title: "Неоплаченный заказ",
        bankSubtitle: "{plan} ({amount}) • Ожидается оплата по банковскому счёту (Инвойс #{orderId})",
        gatewaySubtitle: "{plan} ({amount}) • Ожидается подтверждение оплаты через {method} (#{orderId})",
        viewBtn: "Открыть / Оплатить",
        refreshBtn: "Проверить",
        cancelBtn: "Отменить",
      },
      returnPolling: {
        checkingMsg: "Проверка статуса оплаты...",
        paidSuccessMsg: "Оплата подтверждена! Ваша подписка активирована.",
        pendingStillMsg: "Оплата ещё не подтверждена. Проверьте статус чуть позже.",
        cancelledMsg: "Заказ отменён.",
        failedMsg: "Оплата не прошла.",
        inFlightWarn: "Оплата через Payme/Click сейчас обрабатывается, подождите несколько секунд.",
      },
      upgradeValueNote:
        "Оставшиеся дни и стоимость вашего текущего активного тарифа автоматически переносятся на новый план.",
    },
    home: {
      solo: {
        planTrialLabel: "Pro (Пробный)",
        title: "Главная",
        subtitle: "Персональные AI-инструменты для бухгалтерии, налогов и анализа документов",
        savedHistoryBtn: "Сохранённая история",
        firmusAiBtn: "FIRMUS AI",
        kpi: {
          monthlyWorksTitle: "Работ за этот месяц",
          monthlyWorksSub: "Сверки, сканы чеков и договоры",
          aiChatsTitle: "AI-чаты",
          aiChatsSub: "История сохранённых чатов",
          totalWorksTitle: "Всего сохранённых работ",
          totalWorksSub: "За все месяцы",
          currentPlanTitle: "Текущий тариф",
          trialAvailableSub: "Доступно 7 дней Pro бесплатно",
          managePlanSub: "Управление подпиской и лимитами",
        },
        toolsSectionTitle: "Инструменты",
        openCta: "Открыть",
        tools: {
          aiChatTitle: "AI-чат и Помощник",
          aiChatDesc: "Налоги, проводки по НСБУ и анализ фото чеков",
          reconcileTitle: "AI-сверка Банк ↔ 1C",
          reconcileDesc: "Быстрая сверка банковской выписки и файлов 1C",
          scanTitle: "Сканер счетов и чеков",
          scanDesc: "Извлечение счетов и сумм из фото или PDF",
          calcTitle: "Калькулятор налогов и зарплаты",
          calcDesc: `Расчёт НДФЛ 12%, НДС 12%, оборота ${TURNOVER_RATE_RANGE} и отпускных`,
          contractTitle: "Проверка рисков договора",
          contractDesc: "Проверка пени, аванса и условий НДС с помощью AI",
          historyTitle: "Сохранённая история",
          historyDesc: "Все результаты сверок, сканов и договоров",
        },
        recentWorks: {
          title: "Последние работы",
          subtitle: "Недавно сохранённые сверки, сканы и проверки договоров",
          viewAll: "Все",
          loading: "Загрузка...",
          empty: "Пока нет сохранённых работ. Выберите один из инструментов выше, чтобы начать.",
          colMonth: "Месяц",
          colType: "Тип",
          colName: "Название",
          colAction: "Действие",
          typeReconcile: "Банк ↔ 1C",
          typeContract: "Договор",
          typeReceipt: "Чек / Счёт-фактура",
          openBtn: "Открыть",
        },
      },
      erp: {
        savedHistoryBtn: "Сохранённая история",
        reconcileHeaderBtn: "AI-сверка Банк ↔ 1C",
        quickCards: {
          reconcileTitle: "Сверка Банк ↔ 1C",
          reconcileDesc: "Сверка банковской выписки и файлов 1C за 5 секунд",
          reconcileCta: "Открыть",
          scanTitle: "Сканер счетов и чеков",
          scanDesc: "Извлечение реквизитов и сумм из фото или PDF",
          scanCta: "Загрузить",
          calcTitle: "Калькулятор и Налоги AI",
          calcDesc: `Расчёт НДФЛ 12%, НДС 12%, оборота ${TURNOVER_RATE_RANGE} и отпускных`,
          calcCta: "Открыть",
        },
        postedOperationsSub: "Проведено {posted} / {total} операций",
        netVatTitle: "Чистый НДС (6410–4410)",
        netVatSub: "Текущее обязательство по НДС в главной книге",
        emptyCashflow: "По этой компании пока нет операций движения денежных средств.",
        quickWorkflowsTitle: "Быстрые действия бухгалтера",
        quickWorkflowsSubtitle: "Наиболее частые повседневные задачи",
        workflows: {
          reconcileTitle: "AI-сверка Банк ↔ 1C",
          reconcileSub: "Загрузка файла и сверка за 5 секунд",
          trialBalanceTitle: "Оборотно-сальдовая ведомость",
          trialBalanceSub: "Остатки и закрытие периода",
          taxFinanceTitle: "Налоги и Финансы",
          taxFinanceSub: "НДС (12%), Баланс и Отчёт о прибыли",
          entitySettingsTitle: "Настройки организации",
          entitySettingsSub: "Управление ИНН, налоговым режимом и языком",
        },
        emptyPendingApprovals: "Нет транзакций, ожидающих утверждения.",
        emptyExceptions: "Открытых аудиторских исключений не найдено.",
        aiVatCalloutPrefix:
          "По данным Главной книги организации «{entity}» (счета 6410–4410), текущее чистое обязательство по НДС составляет ",
        aiVatCalloutMid: ", а количество открытых исключений — ",
        aiVatCalloutCountSuffix: "{count}",
        aiVatCalloutEnd: ".",
      },
    },
  },
  en: {
    currencyLabel: "UZS",
    intlLocale: "en-US",
    plans: {
      items: {
        starter: {
          name: "Starter",
          subtitle: "Essential tools to get started for free",
          soloFeatures: [
            "AI Chat for daily tax and accounting questions (Gemini 3.8 Flash)",
            "Fast AI extraction from receipt and invoice images",
            "Bank ↔ 1C file reconciliation and export to 1C (.txt / .xml / CSV)",
            "Payroll (PIT 12%), VAT (12%), turnover tax, and vacation calculators",
            "Quick risk and gap review in contract text",
            "Access to recent saved works and chat history",
          ],
          b2bFeatures: [
            "Core workflows for up to 3 companies (TIN)",
            "Gemini 3.8 Flash model",
            "Bank ↔ 1C reconciliation & 1C export",
            "Tax and payroll calculators",
          ],
        },
        professional: {
          name: "Pro",
          subtitle: "For active accountants and deep financial analysis",
          badge: "Recommended",
          soloFeatures: [
            "All Starter tools — with expanded monthly volume",
            "7-day free trial included",
            "Gemini 4 Hydrogen — powerful model for complex tax cases and NAS #21 entries",
            "Direct upload of PDF invoices, waybills, and contracts",
            "Extended Bank ↔ 1C reconciliation and large spreadsheet support",
            "Full monthly archive and saved AI conversation history",
          ],
          b2bFeatures: [
            "Up to 15 companies (TIN) and team access",
            "Gemini 4 Hydrogen & Gemini 3.8 Flash models",
            "PDF invoice and contract review",
            "Extended archive and reporting",
          ],
        },
        pro_plus: {
          name: "Pro+",
          subtitle: "High volume, maximum AI capacity, and priority support",
          soloFeatures: [
            "All Pro features — with the highest monthly AI capacity",
            "Priority high-speed access to Gemini 4 Hydrogen and Gemini 3.8 Flash",
            "Multi-page large PDF contract and document bundle analysis",
            "Largest Bank ↔ 1C file uploads and long-term full history archive",
            "Early access to new B2B and 1C automation tools",
            "Priority technical support",
          ],
          b2bFeatures: [
            "Unlimited companies and advanced team roles",
            "Highest AI capacity and priority queue",
            "Multi-page PDF document analysis",
            "Priority technical support",
          ],
        },
      },
      aiModels: {
        "gemini-3.8-flash": {
          label: "Gemini 3.8 Flash",
          shortLabel: "3.8 Flash",
          description: "Fast, cost-effective model (daily questions & receipt scans)",
        },
        "gemini-4-hydrogen": {
          label: "Gemini 4 Hydrogen",
          shortLabel: "4 Hydrogen",
          description: "Deep tax, NAS #21 accounting, and contract analysis",
        },
      },
    },
    billing: {
      title: "Subscription & Plans",
      subtitle: "Plan status, AI capabilities, and annual or monthly billing management",
      cycleMonthly: "Monthly",
      cycleAnnual: "Annual",
      annualDiscountBadge: "-20% (1st time)",
      annualStandardBadge: "Standard",
      summary: {
        workspaceFallback: "Workspace",
        personalAccount: "Personal Account",
        trialRemaining: "Trial: {days} days left",
        activeBadge: "Active",
        modelHintSubtitle:
          "You can switch the AI model directly above the message input in the chat window",
        trialBtn: "7-day Pro Trial",
        monthlyAiActivity: "Monthly AI Activity",
        usedPercent: "{pct}% used",
        toolsActive: "Tools are running smoothly",
        monthlyLimitReached: "Monthly limit reached",
        activeAiModel: "Active AI Model",
        starterModelHint: "Pro plan unlocks Gemini 4 Hydrogen",
        proModelHint: "Switch models anytime from the chat window",
        savedWorks: "Saved Works",
        worksCount: "{count} works",
        savedChatsCount: "{count} saved chats",
      },
      pricing: {
        freeAmount: "0 UZS",
        perYear: "/ year",
        perMonth: "/ month",
        annualDiscountNote:
          "{monthly}/mo • 20% first-year discount ({saved} saved, valid once)",
        annualStandardNote:
          "One-time 20% annual discount already used • Standard annual rate",
      },
      cards: {
        currentTrial: "Current (Trial)",
        currentPlan: "Current Plan",
        tryFree7Days: "Try 7 days free",
        activePlanDetails: "Active plan details",
        includedInProPlus: "Included in Pro+",
        basicFreePlan: "Base free plan",
        subscribeOrPay: "Subscribe / Pay",
      },
      dialogs: {
        starter: {
          title: "Starter — Base Plan",
          description: "This plan is active for all users at 0 UZS with no payment required.",
          body: "To unlock extra AI credits, the Gemini 4 Hydrogen model, PDF analysis, and extended 1C reconciliation, choose the Pro or Pro+ plan.",
          closeBtn: "Got it",
        },
        activePaid: {
          activePaidBadge: "Active (Paid)",
          description: "Details about your current active subscription.",
          statusLabel: "Status:",
          statusValue: "Active subscription",
          expiresLabel: "Valid until:",
          daysLeftSuffix: "({days} days left)",
          unlimitedDuration: "Ongoing (Active)",
          monthlyLimitLabel: "Monthly AI limit:",
          creditsUnit: "{credits} credits",
          unlimitedCredits: "Unlimited",
          proPlusIncludedNotePrefix: "You currently have the higher ",
          proPlusIncludedNoteSuffix:
            " plan active. All Professional plan features are fully included in your subscription.",
          closeBtn: "Close",
          upgradeToProPlusBtn: "Upgrade to Pro+",
        },
        checkout: {
          cycleAnnualLabel: "Annual",
          cycleMonthlyLabel: "Monthly",
          paymeTitle: "Payme",
          paymeSubtitle: "Uzcard / Humo",
          clickTitle: "Click",
          clickSubtitle: "Click Up / QR / Card",
          bankTitle: "Bank Transfer",
          bankSubtitle: "Legal entities (E-Invoice)",
          tinLabel: "TIN (STIR) *",
          tinPlaceholder: "301234567",
          companyNameLabel: "Company / IE Name *",
          companyNamePlaceholder: "LLC or Individual Entrepreneur",
          companyFallback: "Company",
          cancelBtn: "Cancel",
          getInvoiceBtn: "Generate Invoice",
          payAmountBtn: "Pay — {amount}",
        },
        invoice: {
          title: "Invoice (E-SF)",
          sellerLabel: "Supplier:",
          tinPrefix: "TIN",
          accountBankLabel: "Account & Bank:",
          buyerLabel: "Customer:",
          buyerFallback: "Client",
          amountLabel: "Amount:",
          copiedBtn: "Copied!",
          copyBtn: "Copy Details",
          printBtn: "Print",
          switchMethodBtn: "Switch Method",
          confirmDemoBtn: "Confirm Payment (Demo)",
          copyTemplate: {
            header: "INVOICE No. {invNum}",
            date: "Date: {date}",
            seller: "Supplier (Seller): {seller}",
            tin: "TIN: {tin}",
            account: "Account: {account}",
            bank: "Bank: {bank}, MFO: {mfo}",
            buyer: "Customer (Buyer): {buyer}",
            amount: "Amount due: {amount} (0% commission)",
            purpose: "Payment purpose: {purpose}",
            defaultPurpose: "Subscription payment for FIRMUS AI {plan} plan. VAT exempt",
            orderId: "Order ID: {orderId}",
          },
        },
        sandbox: {
          paymeTitle: "Payme Payment",
          clickTitle: "Click Payment",
          badge: "Sandbox",
          planLabel: "Plan:",
          amountLabel: "Amount due:",
          switchMethodBtn: "Switch Method",
          confirmBtn: "Confirm Payment",
        },
      },
      toast: {
        trialError: "Could not activate trial",
        trialSuccess: "7-day free Pro trial activated!",
        trialActivateFailed: "Could not activate the trial period",
        enterTinError: "Enter the company or IE TIN (STIR) number",
        createOrderFailed: "Could not create payment order",
        invoiceGenerated: "Official invoice generated",
        orderCreated: "Payment order created",
        checkoutError: "An error occurred during checkout",
        orderAlreadyPaid: "Order was already paid",
        confirmOrderFailed: "Could not confirm the order",
        paymentConfirmed: "Payment confirmed! Your subscription is now active.",
        confirmError: "An error occurred during confirmation",
        invoiceCopied: "Invoice details copied",
        copyFailed: "Could not copy",
      },
      pendingBanner: {
        title: "Pending order",
        bankSubtitle: "{plan} ({amount}) • Awaiting bank transfer payment (Invoice #{orderId})",
        gatewaySubtitle: "{plan} ({amount}) • Awaiting payment confirmation via {method} (#{orderId})",
        viewBtn: "Open / Pay",
        refreshBtn: "Check",
        cancelBtn: "Cancel",
      },
      returnPolling: {
        checkingMsg: "Checking payment status...",
        paidSuccessMsg: "Payment confirmed! Your subscription is now active.",
        pendingStillMsg: "Payment is not confirmed yet. Please check again shortly.",
        cancelledMsg: "Order has been cancelled.",
        failedMsg: "Payment failed.",
        inFlightWarn: "Payme/Click payment is currently in progress, please wait a few seconds.",
      },
      upgradeValueNote:
        "Remaining days and value from your current active plan automatically transfer to your new plan.",
    },
    home: {
      solo: {
        planTrialLabel: "Pro (Trial)",
        title: "Home",
        subtitle: "Personal AI tools for accounting, taxes, and document analysis",
        savedHistoryBtn: "Saved History",
        firmusAiBtn: "FIRMUS AI",
        kpi: {
          monthlyWorksTitle: "Works This Month",
          monthlyWorksSub: "Reconciliations, receipt scans & contracts",
          aiChatsTitle: "AI Chats",
          aiChatsSub: "Saved conversation history",
          totalWorksTitle: "Total Saved Works",
          totalWorksSub: "Across all months",
          currentPlanTitle: "Current Plan",
          trialAvailableSub: "7-day free Pro trial available",
          managePlanSub: "Manage subscription & limits",
        },
        toolsSectionTitle: "Tools",
        openCta: "Open",
        tools: {
          aiChatTitle: "AI Chat & Assistant",
          aiChatDesc: "Taxes, NAS accounting entries, and receipt image analysis",
          reconcileTitle: "Bank ↔ 1C AI Reconcile",
          reconcileDesc: "Fast reconciliation of bank statements and 1C files",
          scanTitle: "Invoice / Receipt Scanner",
          scanDesc: "Extract accounts and amounts from images or PDFs",
          calcTitle: "Tax & Payroll Calculator",
          calcDesc: `PIT 12%, VAT 12%, turnover ${TURNOVER_RATE_RANGE}, and vacation pay calculations`,
          contractTitle: "Contract Risk Check",
          contractDesc: "AI review of penalties, prepayments, and VAT clauses",
          historyTitle: "Saved History",
          historyDesc: "All reconciliation, scan, and contract review results",
        },
        recentWorks: {
          title: "Recent Works",
          subtitle: "Recently saved reconciliations, scans, and contract checks",
          viewAll: "View all",
          loading: "Loading...",
          empty: "No saved works yet. Pick any tool above to get started.",
          colMonth: "Month",
          colType: "Type",
          colName: "Title",
          colAction: "Action",
          typeReconcile: "Bank ↔ 1C",
          typeContract: "Contract",
          typeReceipt: "Receipt / Invoice",
          openBtn: "Open",
        },
      },
      erp: {
        savedHistoryBtn: "Saved History",
        reconcileHeaderBtn: "Bank ↔ 1C AI Reconcile",
        quickCards: {
          reconcileTitle: "Bank ↔ 1C Reconcile",
          reconcileDesc: "Reconcile bank statements and 1C files in 5 seconds",
          reconcileCta: "Open",
          scanTitle: "Invoice / Receipt Scanner",
          scanDesc: "Extract accounts and totals from photos or PDFs",
          scanCta: "Upload",
          calcTitle: "Calculator & Tax AI",
          calcDesc: `PIT 12%, VAT 12%, turnover ${TURNOVER_RATE_RANGE}, and vacation pay calculations`,
          calcCta: "Open",
        },
        postedOperationsSub: "{posted} / {total} operations posted",
        netVatTitle: "Net VAT (6410–4410)",
        netVatSub: "Current VAT payable in general ledger",
        emptyCashflow: "No cash flow transactions recorded for this company yet.",
        quickWorkflowsTitle: "Quick Accountant Workflows",
        quickWorkflowsSubtitle: "Most frequently used daily tasks",
        workflows: {
          reconcileTitle: "Bank ↔ 1C AI Reconcile",
          reconcileSub: "Upload files and reconcile in 5 seconds",
          trialBalanceTitle: "Trial Balance",
          trialBalanceSub: "Balances and period closing",
          taxFinanceTitle: "Taxes & Finance",
          taxFinanceSub: "VAT (12%), Balance Sheet & P&L",
          entitySettingsTitle: "Company Settings",
          entitySettingsSub: "Manage TIN, tax regime, and language",
        },
        emptyPendingApprovals: "No transactions awaiting approval.",
        emptyExceptions: "No open audit exceptions found.",
        aiVatCalloutPrefix:
          "According to the General Ledger (accounts 6410–4410) for «{entity}», the current net VAT liability is ",
        aiVatCalloutMid: " and open exceptions stand at ",
        aiVatCalloutCountSuffix: "{count}",
        aiVatCalloutEnd: ".",
      },
    },
  },
};

export function getBillingHomeDict(locale: Locale): BillingHomeDict {
  return BILLING_HOME_DICT[locale] ?? BILLING_HOME_DICT.uz;
}

export function getIntlLocale(locale: Locale): string {
  return getBillingHomeDict(locale).intlLocale;
}
