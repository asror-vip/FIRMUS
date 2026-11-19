import type { Locale } from "../types";
import { getTurnoverRateRangeLabel } from "@/lib/services/uz-tax-calculator";

const TURNOVER_RATE_RANGE = getTurnoverRateRangeLabel();

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
  resetPassword: {
    title: string;
    subtitle: string;
    newPasswordLabel: string;
    newPasswordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    passwordHint: string;
    submitBtn: string;
    savingBtn: string;
    successTitle: string;
    successDesc: string;
    goToAppBtn: string;
    backToLogin: string;
    missingFieldsToast: string;
    passwordMinToast: string;
    passwordMismatchToast: string;
    successToast: string;
    errorToast: string;
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
    resetPassword: {
      title: "Yangi Parol Oʻrnatish",
      subtitle: "Hisobingiz uchun yangi va xavfsiz parol kiriting",
      newPasswordLabel: "Yangi parol:",
      newPasswordPlaceholder: "Kamida 8 ta belgi",
      confirmPasswordLabel: "Yangi parolni tasdiqlang:",
      confirmPasswordPlaceholder: "Parolni qayta kiriting",
      passwordHint: "Kamida 8 ta belgi",
      submitBtn: "Parolni yangilash",
      savingBtn: "Saqlanmoqda...",
      successTitle: "Parol yangilandi!",
      successDesc: "Yangi parolingiz muvaffaqiyatli saqlandi. Endi tizimdan foydalanishingiz mumkin.",
      goToAppBtn: "Ilovaga oʻtish",
      backToLogin: "Kirish sahifasiga qaytish",
      missingFieldsToast: "Iltimos, ikkala parol maydonini ham toʻldiring",
      passwordMinToast: "Parol kamida 8 ta belgidan iborat boʻlishi kerak",
      passwordMismatchToast: "Parollar bir-biriga mos kelmadi",
      successToast: "Parol muvaffaqiyatli yangilandi!",
      errorToast: "Parolni yangilashda xatolik yuz berdi",
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
        turnover_tax: `Aylanmadan olinadigan soliq (${TURNOVER_RATE_RANGE})`,
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
      badge: "Zero-PII • OʻRQ-547",
      title: "Maxfiylik siyosati va Maʼlumotlarni himoya qilish reglamenti",
      lastUpdated: "Oxirgi yangilanish: 2026-yil 20-noyabr • Oʻzbekiston Respublikasi OʻRQ-547 qonuniga muvofiq",
      sections: [
        {
          heading: "1. Umumiy qoidalar va Qonunchilikka muvofiqlik (OʻRQ-547)",
          paragraphs: [
            "Ushbu Maxfiylik siyosati FIRMUS buxgalteriya va soliq avtomatlashtirish platformasidan («Platforma», «Sayt») foydalanish jarayonida foydalanuvchilar («Buxgalter», «Foydalanuvchi», «Mijoz») tomonidan taqdim etiladigan axborotni qayta ishlash, himoya qilish, shaxssizlantirish va saqlash tartibini belgilaydi.",
            "Platforma Oʻzbekiston Respublikasining «Shaxsga doir maʼlumotlar toʻgʻrisida»gi OʻRQ-547-sonli Qonuni, «Axborotlashtirish toʻgʻrisida»gi Qonuni hamda xalqaro axborot xavfsizligi tamoyillariga qatʼiy amal qiladi. Platformadan roʻyxatdan oʻtish yoki mehmon rejimida foydalanish orqali Foydalanuvchi ushbu Maxfiylik siyosati shartlariga toʻliq rozilik bildiradi.",
          ],
        },
        {
          heading: "2. «Zero-PII» (Shaxsga doir maʼlumotlarni yigʻmaslik) asosiy arxitekturasi",
          paragraphs: [
            "FIRMUS «Zero-PII» (Zero Personally Identifiable Information) tamoyili asosida qurilgan. Platforma jismoniy shaxslarning shaxsiy identifikatsion raqamlarini (14 xonali JShShIR / PINFL), pasport yoki ID-karta seriyasi va raqamlarini, yashash manzillarini, biometrik maʼlumotlarini yoki shaxsiy bank plastik kartalarining maxfiy rekvizitlarini (CVV, PIN-kod) talab qilmaydi va yigʻmaydi.",
            "Agar Foydalanuvchi yuklagan bank koʻchirmasi, shartnoma yoki 1C faylining izoh qismida jismoniy shaxsga oid raqamlar (masalan, plastik karta raqami, JShShIR yoki telefon raqami) uchrab qolsa, Platformaning xavfsizlik filtri (`lib/utils/privacy.ts`) ularni tahlil va saqlashdan oldin avtomatik ravishda niqoblaydi (maskalaydi).",
          ],
        },
        {
          heading: "3. Mehmon rejimi (Loginsiz) va Roʻyxatdan oʻtgan rejimda maʼlumotlar bilan ishlash",
          bullets: [
            "Mehmon rejimi (`/welcome`, `/calculators`, `/try`): Roʻyxatdan oʻtmagan foydalanuvchi «Bepul Bank ↔ 1C Sverka» (`/try`) yoki kalkulyatorlardan foydalanganda, yuklangan `.xlsx`, `.xls`, `.csv`, `.txt`, `.xml` fayllar 100% foydalanuvchining oʻz qurilmasi (brauzer tezkor xotirasi — RAM) ichida qayta ishlanadi. Mehmon yuklagan fayl serverga yuborilmaydi va maʼlumotlar bazasiga yozilmaydi. Brauzer sahifasi yopilishi bilan ushbu maʼlumotlar qurilma xotirasidan toʻliq oʻchib ketadi.",
            "Roʻyxatdan oʻtgan buxgalter rejimi (`/reconcile`, `/tax-calc`, `/clients`): Tizimga kirgan foydalanuvchi uchun korxona yuridik nomi, 9 xonali STIR (INN), tanlangan soliq rejimi (`MChJ 4%`, `YaTT 1%`, `QQS 12%`), bank hisobvaragʻi va 1C versiya profili saqlanadi.",
            "Sverka tarixi (`work_batches`) va Bosh kitob provodkalari (`journal_entries`): Faqat Foydalanuvchi oʻzi «Tarixga saqlash» yoki «Bosh kitobga oʻtkazish» tugmasini bosgan taqdirdagina shaxssizlantirilgan moliyaviy yozuvlar (sana, summa, 21-son BHMS schyot kodi va tozalangan izoh) korxona profiliga biriktirib saqlanadi.",
          ],
        },
        {
          heading: "4. 1C, Bank va Didox hujjat qoliplarini (`onec_learned_schemas`) anonim oʻrganish",
          paragraphs: [
            "Platformada foydalanuvchiga qulaylik yaratish maqsadida hujjat tuzilmasini (qolipini) avtomatik tanish tizimi mavjud. Foydalanuvchi 1C, Bank koʻchirmasi yoki Didox/Soliq EHF faylini yuklaganda, tizimning `extractAnonymizedFileBlueprint` moduli fayldan FAQAT jadvalning ustun sarlavhalarini (masalan: `Sana | Hujjat № | Kontragent | STIR | Debet | Kredit | Toʻlov maqsadi`) va ustunlar tartib raqamini ajratib oladi.",
            "Qolip jadvaliga (`public.onec_learned_schemas`) hech qachon hujjat ichidagi pul summalari, kontragent nomlari, STIR raqamlari yoki hisob raqamlari yozilmaydi. Hatto ustun sarlavhasida tasodifan 5 xonadan uzun raqam boʻlsa ham, u saqlashdan oldin avtomatik oʻchiriladi.",
          ],
        },
        {
          heading: "5. Tashqi AI modellariga (Gemini API) murojaat va Avtomatik maskalash",
          paragraphs: [
            "Foydalanuvchi AI Yordamchi (`/assistant`), AI Sverka tekshiruvi, Skaner yoki Noaniq soliq qatorlarini AI orqali tasniflash (`/api/tax-classify`) funksiyasini ishga tushirganda, matn tashqi sunʼiy intellekt provayderiga (Google Gemini API) yuborilishidan oldin qatʼiy `depersonalizeForAi` filtridan oʻtkaziladi:",
          ],
          bullets: [
            "16 xonali bank plastik karta raqamlari -> `[KARTA_MASKED]` ga almashtiriladi;",
            "14 xonali JShShIR (PINFL) raqamlari -> `[PINFL_MASKED]` ga almashtiriladi;",
            "20 xonali bank hisobvaraqlari (`20208...`, `22626...`) -> `[HISOB_MASKED]` ga almashtiriladi;",
            "9 xonali STIR (INN) va telefon raqamlari -> `[STIR_MASKED]` va `[TELEFON_MASKED]` ga almashtiriladi;",
            "4-bosqichdagi «Aylanma va soliq» (`/tax-calc`) boʻlimida barcha soliq summalari 100% dasturiy kod (`lib/services/turnover-tax-engine.ts`) orqali hisoblanadi — AI hech qachon soliq summasini hisoblamaydi.",
          ],
        },
        {
          heading: "6. Maʼlumotlar bazasi xavfsizligi, Shifrlash va Multi-Tenant RLS izolyatsiyasi",
          bullets: [
            "Row-Level Security (RLS): Maʼlumotlar bazasidagi barcha jadvallar (`workspaces`, `business_entities`, `bank_accounts`, `work_batches`, `onec_learned_schemas`, `journal_entries`, `transactions`) PostgreSQL RLS qatlami bilan himoyalangan. Bir buxgalter (Accountant A) hech qanday holatda boshqa buxgalterning (Accountant B) mijozlarini yoki hujjatlarini koʻra olmaydi.",
            "Kriptografik shifrlash (`AES-256-GCM`): 1C OData / EPF koʻprigi uchun kiritilgan ulanish parollari va integratsiya kalitlari ochiq matnda saqlanmaydi; ular server kaliti yordamida `AES-256-GCM` va `SHA-256` algoritmlari bilan shifrlangan holda saqlanadi.",
            "Tarmoq xavfsizligi: Barcha maʼlumotlar almashinuvi HTTPS / TLS 1.3 shifrlangan kanali orqali amalga oshiriladi hamda ichki lokal tarmoqlarga (`SSRF`) ruxsatsiz ulanishlar bloklanadi.",
          ],
        },
        {
          heading: "7. Foydalanuvchining oʻz hisobi va qurilmasi xavfsizligi boʻyicha majburiyatlari",
          paragraphs: [
            "Foydalanuvchi oʻzining elektron pochta manzili, paroli, Google hisobi va 1C integratsiya tokenlarini maxfiy saqlashga shaxsan javobgardir. Begona kompyuterlarda («Internet-kafe», umumiy ofis kompyuteri) tizimdan chiqmasdan (`Chiqish` tugmasini bosmasdan) ketish, parolni uchinchi shaxslarga berish yoki zararlangan (virusli) qurilmadan foydalanish oqibatida maʼlumotlarning uchinchi shaxslarga oshkor boʻlishi uchun FIRMUS maʼmuriyati javobgar emas.",
          ],
        },
        {
          heading: "8. Cookie fayllari va Shaxsiy maʼlumotsiz analitika (`analytics_events`)",
          paragraphs: [
            "Platforma uchinchi tomon reklama kuzatuvchilari (advertising trackers) yoki foydalanuvchi shaxsini kuzatuvchi piksel kodlardan foydalanmaydi. Texnik cookie fayllari faqatgina tizimga kirish sessiyasini (`sb-*-auth-token`) va interfeys tilini (`uz` / `ru` / `en`) saqlab qolish uchun ishlatiladi.",
            "Ichki analitika jadvali (`public.analytics_events`) faqat 4 ta umumiy texnik hodisani (`page_view`, `tool_used`, `register_clicked`, `registered`) qayd etadi va unda email, IP-manzil, ism, STIR yoki pul summalari saqlanishiga dasturiy taqiq qoʻyilgan.",
          ],
        },
        {
          heading: "9. Maʼlumotlarni oʻchirish huquqi va Murojaat",
          paragraphs: [
            "Foydalanuvchi istalgan vaqtda «Sverka» (`/reconcile`) yoki «Mijozlar» (`/clients`) boʻlimidan oʻzi saqlagan ishlar tarixini, bank hisoblarini yoki mijoz profilini oʻchirib tashlash huquqiga ega. Hisobni butunlay oʻchirish boʻyicha soʻrovlar «Sozlamalar -> Hisob» (`/settings`) boʻlimi orqali amalga oshiriladi.",
          ],
        },
      ],
    },
    terms: {
      backToApp: "Ilovaga qaytish",
      backToLogin: "Tizimga qaytish",
      badge: "Ommaviy Oferta • 21-BHMS",
      title: "Foydalanish shartlari va Javobgarlikni cheklash toʻgʻrisida Ommaviy oferta",
      subtitle: "FIRMUS SaaS Platformasi • Oʻzbekiston Respublikasi Fuqarolik kodeksi 367–370-moddalariga muvofiq",
      sections: [
        {
          heading: "1. Umumiy qoidalar va Ommaviy ofertani qabul qilish (Aksept)",
          paragraphs: [
            "Mazkur hujjat FIRMUS platformasi maʼmuriyati («Platforma», «Ijrochi») tomonidan jismoniy va yuridik shaxslarga, shu jumladan mustaqil buxgalterlar, autsorsing (BPO) kompaniyalari va tadbirkorlarga («Foydalanuvchi») dasturiy xizmatlardan foydalanish boʻyicha yoʻllangan rasmiy Ommaviy oferta hisoblanadi.",
            "Oʻzbekiston Respublikasi Fuqarolik kodeksining 367 va 370-moddalariga muvofiq, Foydalanuvchi tomonidan Saytda roʻyxatdan oʻtish (`/register`), «Shartlarga roziman» belgisini qoʻyish, Google orqali tizimga kirish yoki mehmon rejimida (`/try`, `/calculators`) hisob-kitoblarni bajarish mazkur Ommaviy ofertaning barcha shartlarini hech qanday istisnolarsiz, toʻliq va soʻzsiz qabul qilish (Aksept) hisoblanadi. Agar Foydalanuvchi ushbu shartlarning biror bandiga rozi boʻlmasa, u Platformadan foydalanishni darhol toʻxtatishi shart.",
          ],
        },
        {
          heading: "2. Xizmatning huquqiy maqomi («As-Is» — Yordamchi dasturiy vosita)",
          paragraphs: [
            "FIRMUS — bu buxgalter va tadbirkorning kundalik ishini tezlashtiruvchi yordamchi dasturiy taʼminot (`SaaS` — Software as a Service) boʻlib, u «boricha» («As-Is») tamoyili asosida taqdim etiladi.",
            "MUHIM: FIRMUS davlat soliq qoʻmitasi (`soliq.uz`), tijorat banki, rasmiy soliq maslahatchisi yoki litsenziyalangan auditorlik tashkiloti EMAS. Platforma tomonidan shakllantirilgan har qanday jadval, sverka natijasi, aylanma soliq hisobi yoki 21-son BHMS provodkasi rasmiy davlat soliq hisoboti yoki yuridik xulosa oʻrnini bosmaydi.",
          ],
        },
        {
          heading: "3. Foydalanuvchining ehtiyotkorsizligi va xatolari uchun javobgarlikdan ozod etish",
          paragraphs: [
            "Platforma maʼmuriyati Foydalanuvchining ehtiyotkorsizligi, beparvoligi, malaka yetishmasligi yoki tizimdan notoʻgʻri foydalanishi natijasida kelib chiqqan har qanday toʻgʻridan-toʻgʻri yoki bilvosita zarar uchun JAVOBGAR EMAS. Xususan, quyidagi holatlarda toʻliq javobgarlik 100% Foydalanuvchining oʻz zimmasida boʻladi:",
          ],
          bullets: [
            "Notoʻgʻri yoki chala fayl yuklash: Foydalanuvchi tomonidan xato, buzilgan, boshqa davrga yoki boshqa korxonaga (boshqa STIRga) tegishli bank koʻchirmasi, 1C eksport fayli yoki Didox reestrini yuklab yuborish;",
            "Mijoz va soliq profilini xato tanlash: Koʻp mijozli rejimda (`/clients`) bir mijozning hujjatini adashib boshqa mijoz profiliga yuklash yoki korxonaning soliq rejimini (`MChJ 4%`, `YaTT 1%`, `QQS 12%`) notoʻgʻri koʻrsatish;",
            "Daromad boʻlmagan tushumlarni tekshirmaslik: «Aylanma va soliq» (`/tax-calc`) boʻlimida bank krediti, taʼsischi qarzi (moliyaviy yordam), oʻz hisobvaraqlari orasidagi oʻtkazma yoki qaytarilgan toʻlovlarni (`vozvrat`) buxgalter sifatida satrma-satr tekshirmasdan va tasdiqlamasdan soliq bazasiga qoʻshib yuborish yoki chiqarib tashlash;",
            "Hisob va parol xavfsizligiga eʼtiborsizlik: Foydalanuvchining oʻz login, parol, Google akkounti yoki 1C OData kalitini begona shaxslarga berib qoʻyishi, umumiy kompyuterda sessiyani ochiq qoldirishi yoki fishing (soxta) havolalarga aldanishi;",
            "Birlamchi hujjatlarning qonuniyligi: Tizimga yuklanayotgan bank, faktura va shartnoma maʼlumotlarining haqiqiyligi hamda qonuniyligi uchun faqat Foydalanuvchi javob beradi.",
          ],
        },
        {
          heading: "4. Soliq hisob-kitoblari, jarimalar va moliyaviy javobgarlik chegarasi",
          paragraphs: [
            "Platformadagi barcha kalkulyatorlar (`/calculators`) va «Aylanma va soliq» (`/tax-calc`) boʻlimidagi hisob-kitoblar Oʻzbekiston Respublikasi Soliq kodeksi hamda `lex.uz` rasmiy manbalariga (`PQ-247`, `OʻRQ-1108`, `PF-100`, `PF-115`) asoslangan boʻlsa-da, ular har doim «Taxminiy hisob — yakuniy qarorni buxgalter tasdiqlaydi» maqomiga ega.",
            "Soliq qonunchiligidagi imtiyozlar, hududiy koeffitsiyentlar, yakka tartibdagi soliq rejimlari yoki qonunchilikdagi yangi oʻzgarishlarni korxona faoliyatiga toʻgʻri qoʻllash, `my3.soliq.uz` portalida rasmiy hisobotlarni oʻz vaqtida topshirish va soliqlarni toʻlash Foydalanuvchining (buxgalter va korxona rahbarining) majburiyatidir. Soliq organlari tomonidan hisoblangan har qanday jarima, penya, moliyaviy sanksiya, hisobvaraqning muzlatilishi yoki boy berilgan foyda uchun FIRMUS hech qanday moddiy, maʼmuriy yoki huquqiy javobgarlikni oʻz zimmasiga olmaydi.",
          ],
        },
        {
          heading: "5. 1C integratsiyasi, Eksport fayllari (`.txt` / `.xml`) va Zahira nusxa (Backup) majburiyati",
          bullets: [
            "Platformadan yuklab olinadigan `1CClientBankExchange` (`.txt`), `EnterpriseData 1.8` (`.xml`) fayllari hamda `1C OData / EPF` koʻprigi orqali yuboriladigan hujjatlar har doim QORALAMA (`Posted = false` / oʻtkazilmagan) holatida shakllantiriladi.",
            "Foydalanuvchi ushbu fayllarni oʻzining ishchi 1C bazasiga (`1C:Buxgalteriya 8.3 Venkon`, `1C 8.2`, `1UZ` va b.) yuklashdan OLDIN 1C bazasining toʻliq zahira nusxasini (`Backup` / `.dt`) olishi hamda yuklangan qoralamalardagi schyot kodlari (`5110`, `4010`, `6010`, `6410`, `9010`, `9420`), summalar va kontragent STIRlarini tekshirib chiqishi shart.",
            "1C bazasining zahira nusxasi olinmaganligi yoki qoralamalarni tekshirmasdan ommaviy oʻtkazib yuborish (`Групповое проведение`) natijasida 1C bazasida yuzaga kelgan buxgalteriya tafovutlari uchun Platforma javobgar emas.",
          ],
        },
        {
          heading: "6. Sunʼiy intellekt (AI) cheklovlari va «Human-in-the-Loop» (Inson tasdigʻi) qoidasi",
          paragraphs: [
            "Platformaning AI Yordamchi, AI Sverka, Skaner va Shartnoma tahlili boʻlimlari katta til modellaridan (LLM / Google Gemini) foydalanadi. Sunʼiy intellekt texnologiyasining tabiatiga koʻra, AI baʼzi hollarda noaniq, eskirgan yoki xato javob («AI gallyutsinatsiyasi») berishi mumkin.",
            "Shu sababli Platformada «Human-in-the-Loop» (Yakuniy qaror inson tomonidan qabul qilinishi) qoidasi amal qiladi: AI hech qachon Foydalanuvchi tasdigʻisiz Bosh kitobga yozuv kiritmaydi va Foydalanuvchi AI tomonidan berilgan har bir tavsiyani amaliyotda qoʻllashdan oldin amaldagi qonunchilik (`lex.uz`) va birlamchi hujjatlar bilan solishtirib tekshirishi shart.",
          ],
        },
        {
          heading: "7. Koʻp mijozli rejim (Buxgalter / BPO) va Uchinchi shaxslar oldidagi vakolat",
          paragraphs: [
            "Agar Foydalanuvchi «Mijozlar» (`/clients`) boʻlimi orqali bir nechta yuridik shaxs yoki YaTTlarning hisobini yuritsa, Foydalanuvchi ushbu mijoz korxonalarning bank koʻchirmalari, STIR raqamlari va hisobvaraq-fakturalarini Platformaga yuklash hamda qayta ishlash uchun oʻsha korxonalardan qonuniy vakolat (shartnoma yoki ishonchnoma) olganligini kafolatlaydi. Mijoz korxona bilan buxgalter oʻrtasidagi har qanday mehnat yoki shartnomaviy nizolarga FIRMUS aralashmaydi va javobgar boʻlmaydi.",
          ],
        },
        {
          heading: "8. Obuna tariflari, AI kreditlar va Toʻlov shartlari (`Payme` / `Click`)",
          bullets: [
            "Platformada bepul (`Starter`) hamda pullik (`Professional`, `Pro+`) obuna tariflari mavjud. Har bir tarif boʻyicha mijozlar soni limiti (`Starter: 1 ta`, `Professional: 5 ta`, `Pro+: cheksiz`) va oylik/kunlik AI kreditlar hajmi `/billing` sahifasida aniq koʻrsatilgan.",
            "Pullik obuna toʻlovlari Oʻzbekiston Respublikasining rasmiy toʻlov tizimlari (`Payme`, `Click`) orqali milliy valyutada (soʻmda) amalga oshiriladi. Faollashtirilgan obuna davri va sarflangan AI kreditlar uchun toʻlovlar qaytarilmaydi (qonunchilikda koʻzda tutilgan texnik nosozlik holatlari bundan mustasno).",
            "Bepul sinov muddatini (`Pro Trial`) bir kishi tomonidan koʻplab soxta (vaqtinchalik) elektron pochtalar ochish orqali suiisteʼmol qilish aniqlanganda, tizimning avtomatik himoyasi sinov muddatini cheklash huquqiga ega.",
          ],
        },
        {
          heading: "9. Taqiqlangan harakatlar va Xizmatni toʻxtatish",
          bullets: [
            "Platformaga virusli fayllar, zararli skriptlar (`XSS`, `SQL Injection`, `ZIP-bomb`) yuklash yoki server infratuzilmasiga sunʼiy ortiqcha yuklama (`DDoS`, avtomatlashtirilgan botlar) tushirish qatʼiyan man etiladi.",
            "Boshqa foydalanuvchilarning hisobiga yoki maʼlumotlar bazasiga ruxsatsiz kirishga urinish Oʻzbekiston Respublikasi Jinoyat kodeksining axborot xavfsizligiga oid moddalari boʻyicha javobgarlikka sabab boʻladi hamda Foydalanuvchi hisobi ogohlantirishsiz bloklanadi.",
          ],
        },
        {
          heading: "10. Fors-major, Texnik uzilishlar va Yakuniy qoidalar",
          paragraphs: [
            "Platforma maʼmuriyati internet provayderlar, xalqaro bulutli maʼlumotlar markazlari (`Supabase`, `Google Cloud`), elektr taʼminoti, davlat portallari (`soliq.uz`, `didox.uz`) yoki bank tizimlaridagi profilaktika va texnik uzilishlar (fors-major holatlari) tufayli xizmatdan vaqtincha foydalana olmaslik uchun javobgar boʻlmaydi.",
            "Platforma maʼmuriyati qonunchilik oʻzgarishi yoki yangi funksiyalar qoʻshilishi munosabati bilan mazkur Ommaviy ofertaga oʻzgartirish kiritish huquqiga ega. Yangilangan shartlar `/terms` sahifasida eʼlon qilingan vaqtdan boshlab kuchga kiradi. Barcha masalalar Oʻzbekiston Respublikasi amaldagi qonunchiligi asosida tartibga solinadi.",
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
    resetPassword: {
      title: "Установка нового пароля",
      subtitle: "Введите новый надежный пароль для вашего аккаунта",
      newPasswordLabel: "Новый пароль:",
      newPasswordPlaceholder: "Минимум 8 символов",
      confirmPasswordLabel: "Подтвердите новый пароль:",
      confirmPasswordPlaceholder: "Повторите пароль",
      passwordHint: "Минимум 8 символов",
      submitBtn: "Обновить пароль",
      savingBtn: "Сохранение...",
      successTitle: "Пароль обновлен!",
      successDesc: "Ваш новый пароль успешно сохранен. Теперь вы можете продолжить работу в системе.",
      goToAppBtn: "Перейти в приложение",
      backToLogin: "Вернуться ко входу",
      missingFieldsToast: "Пожалуйста, заполните оба поля пароля",
      passwordMinToast: "Пароль должен содержать не менее 8 символов",
      passwordMismatchToast: "Пароли не совпадают",
      successToast: "Пароль успешно обновлен!",
      errorToast: "Не удалось обновить пароль",
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
        turnover_tax: `Налог с оборота (${TURNOVER_RATE_RANGE})`,
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
      badge: "Zero-PII • ЗРУ-547",
      title: "Политика конфиденциальности и Регламент защиты данных",
      lastUpdated: "Последнее обновление: 20 ноября 2026 г. • В соответствии с ЗРУ-547 Республики Узбекистан",
      sections: [
        {
          heading: "1. Общие положения и соответствие законодательству (ЗРУ-547)",
          paragraphs: [
            "Настоящая Политика конфиденциальности определяет порядок обработки, обезличивания и защиты информации при использовании бухгалтерской и налоговой SaaS-платформы FIRMUS («Платформа», «Сайт»).",
            "Платформа строго соблюдает требования Закона Республики Узбекистан «О персональных данных» № ЗРУ-547. Регистрация на Сайте, вход через Google или использование гостевого режима означает полное согласие Пользователя с настоящей Политикой.",
          ],
        },
        {
          heading: "2. Базовый принцип «Zero-PII» (Отказ от сбора персональных данных)",
          paragraphs: [
            "FIRMUS построена по архитектуре Zero-PII: Платформа не запрашивает и не собирает ПИНФЛ (14 цифр), паспортные данные, домашние адреса, биометрические данные или реквизиты личных банковских карт (CVV, PIN) физических лиц.",
          ],
        },
        {
          heading: "3. Гостевой режим (без входа) и Зарегистрированный режим",
          bullets: [
            "Гостевой режим (`/welcome`, `/calculators`, `/try`): загружаемые в бесплатной сверке (`/try`) файлы `.xlsx`, `.xls`, `.csv`, `.txt`, `.xml` обрабатываются на 100% внутри оперативной памяти браузера (RAM) на устройстве Пользователя и не передаются на сервер.",
            "Зарегистрированный режим (`/reconcile`, `/tax-calc`, `/clients`): в базе сохраняются юридическое название клиента, 9-значный ИНН (СТИР), выбранный налоговый режим, банковские счета и обезличенные записи сверки только при нажатии Пользователем кнопки сохранения.",
          ],
        },
        {
          heading: "4. Анонимное обучение шаблонов документов 1С, Банков и Didox (`onec_learned_schemas`)",
          paragraphs: [
            "При загрузке выписок 1С, банков или реестров ЭСФ Didox/Soliq модуль `extractAnonymizedFileBlueprint` извлекает исключительно названия заголовков столбцов таблицы (`Дата`, `Контрагент`, `Дебет`, `Кредит`) без сохранения сумм, ИНН или наименований компаний.",
          ],
        },
        {
          heading: "5. Обращение к внешним AI-моделям (Gemini API) и автоматическое маскирование",
          bullets: [
            "Перед отправкой текста во внешний сервис Google Gemini API фильтр `depersonalizeForAi` автоматически заменяет 16-значные номера карт на `[KARTA_MASKED]`, ПИНФЛ на `[PINFL_MASKED]`, 20-значные счета на `[HISOB_MASKED]`, телефоны и ИНН на `[TELEFON_MASKED]`.",
            "Все расчеты налоговых сумм в разделе «Оборот и налог» (`/tax-calc`) выполняются на 100% детерминированным программным кодом без участия ИИ.",
          ],
        },
        {
          heading: "6. Безопасность БД, шифрование `AES-256-GCM` и изоляция `PostgreSQL RLS`",
          bullets: [
            "Row-Level Security (RLS): данные каждого бухгалтера и каждого клиента строго изолированы на уровне ядра PostgreSQL.",
            "Пароли и токены интеграции 1С OData/EPF шифруются алгоритмами `AES-256-GCM` и `SHA-256`.",
          ],
        },
        {
          heading: "7. Обязанности Пользователя по защите аккаунта и устройства",
          paragraphs: [
            "Пользователь несет личную ответственность за сохранность своего пароля, Google-аккаунта и токенов 1С. Администрация FIRMUS не несет ответственности за утечку данных вследствие небрежности Пользователя (оставленная открытая сессия на чужом компьютере, передача пароля третьим лицам, заражение устройства вирусами).",
          ],
        },
        {
          heading: "8. Технические файлы Cookie и аналитика без персональных данных (`analytics_events`)",
          paragraphs: [
            "Платформа использует только технические cookie для сессии авторизации и языка интерфейса. Таблица аналитики фиксирует только 4 обезличенных события (`page_view`, `tool_used`, `register_clicked`, `registered`) без сохранения IP-адресов, email или сумм.",
          ],
        },
        {
          heading: "9. Право на удаление данных",
          paragraphs: [
            "Пользователь вправе в любой момент удалить сохраненные сверки, банковские счета, профили клиентов или полностью удалить свой аккаунт в разделе «Настройки -> Аккаунт» (`/settings`).",
          ],
        },
      ],
    },
    terms: {
      backToApp: "Вернуться в приложение",
      backToLogin: "Вернуться ко входу",
      badge: "Публичная оферта • НСБУ №21",
      title: "Условия использования и Ограничение ответственности (Публичная оферта)",
      subtitle: "SaaS-платформа FIRMUS • В соответствии со статьями 367–370 Гражданского кодекса РУз",
      sections: [
        {
          heading: "1. Общие положения и Акцепт Публичной оферты",
          paragraphs: [
            "Настоящий документ является официальной Публичной офертой администрации платформы FIRMUS («Платформа»). В соответствии со статьями 367 и 370 Гражданского кодекса Республики Узбекистан, регистрация на Сайте (`/register`), установка отметки согласия, вход через Google или использование гостевых инструментов (`/try`, `/calculators`) означает полный и безоговорочный акцепт всех условий настоящей Оферты.",
          ],
        },
        {
          heading: "2. Правовой статус сервиса («As-Is» — Вспомогательный программный инструмент)",
          paragraphs: [
            "FIRMUS предоставляется по принципу «как есть» («As-Is») в качестве вспомогательного программного инструмента автоматизации для бухгалтеров и предпринимателей.",
            "ВАЖНО: FIRMUS НЕ является государственным налоговым органом (`soliq.uz`), банком, официальным налоговым консультантом или аудиторской организацией.",
          ],
        },
        {
          heading: "3. Освобождение от ответственности за неосторожность и ошибки Пользователя",
          paragraphs: [
            "Администрация Платформы НЕ НЕСЕТ ОТВЕТСТВЕННОСТИ за любой прямой или косвенный ущерб, возникший вследствие неосторожности, невнимательности или ошибок Пользователя. Полная ответственность (100%) лежит на Пользователе в следующих случаях:",
          ],
          bullets: [
            "Загрузка ошибочных или чужих файлов: загрузка некорректных, неполных выписок или файлов, относящихся к другому периоду или другому предприятию (другому ИНН);",
            "Неверный выбор клиента или налогового режима: ошибочное указание статуса (`ООО 4%`, `ИП 1%`, `НДС 12%`) или загрузка документов одного клиента в профиль другого клиента;",
            "Отсутствие проверки необлагаемых поступлений: включение или исключение банковских кредитов, займов учредителя, внутренних переводов между своими счетами или возвратов средств без личной построчной проверки и подтверждения бухгалтером в разделе `/tax-calc`;",
            "Небрежность в хранении паролей и доступов: передача логина, пароля, Google-аккаунта или токенов 1С третьим лицам, либо работа на незащищенном компьютере.",
          ],
        },
        {
          heading: "4. Налоговые расчеты, штрафы и предел финансовой ответственности",
          paragraphs: [
            "Все расчеты налогов и оборота на Платформе носят статус «Предварительный расчет — итоговое решение подтверждает бухгалтер». Своевременная подача официальных налоговых деклараций на портале `my3.soliq.uz`, контроль годовых лимитов оборота (`1 млрд сум` / `12 000 БРВ`) и уплата налогов являются исключительной обязанностью Пользователя. FIRMUS не несет материальной или юридической ответственности за любые штрафы, пени или финансовые санкции налоговых органов.",
          ],
        },
        {
          heading: "5. Интеграция с 1С, файлы экспорта (`.txt` / `.xml`) и обязанность резервного копирования (Backup)",
          bullets: [
            "Все выгружаемые из Платформы файлы `1CClientBankExchange` (`.txt`), `EnterpriseData 1.8` (`.xml`) и документы `1С OData` формируются исключительно в статусе ЧЕРНОВИКА (`Posted = false` / не проведены).",
            "Перед загрузкой файлов в рабочую базу 1С Пользователь обязан создать полную резервную копию базы 1С (`Backup` / `.dt`) и проверить счета учета (`5110`, `4010`, `6010`, `6410`, `9010`, `9420`), суммы и ИНН контрагентов.",
          ],
        },
        {
          heading: "6. Ограничения искусственного интеллекта (AI) и правило «Human-in-the-Loop»",
          paragraphs: [
            "Модели ИИ (LLM / Gemini) могут допускать неточности («галлюцинации ИИ»). ИИ никогда не вносит проводки без подтверждения человека, а Пользователь обязан проверять каждую рекомендацию ИИ по первичным документам и официальным источникам `lex.uz`.",
          ],
        },
        {
          heading: "7. Мультиклиентский режим (Бухгалтер / Аутсорсинг) и полномочия",
          paragraphs: [
            "Бухгалтер, ведущий несколько компаний в разделе «Клиенты» (`/clients`), гарантирует наличие законных полномочий от этих предприятий на загрузку их банковских выписок и счетов-фактур.",
          ],
        },
        {
          heading: "8. Тарифы подписки, AI-кредиты и оплата (`Payme` / `Click`)",
          paragraphs: [
            "Лимиты тарифов (`Starter`, `Professional`, `Pro+`) указаны на странице `/billing`. Оплата за активированный период подписки и израсходованные AI-кредиты возврату не подлежит, за исключением случаев, предусмотренных законодательством РУз.",
          ],
        },
        {
          heading: "9. Запрещенные действия",
          paragraphs: [
            "Запрещается загрузка вредоносных файлов, попытки несанкционированного доступа к чужим данным, автоматизированный парсинг (`DDoS` / боты) и злоупотребление пробным периодом (`Trial`) через одноразовые почтовые ящики.",
          ],
        },
        {
          heading: "10. Форс-мажор и заключительные положения",
          paragraphs: [
            "Платформа не отвечает за перебои в работе интернет-провайдеров, облачных дата-центров (`Supabase`, `Google Cloud`), банковских систем или государственных порталов (`soliq.uz`, `didox.uz`). Все споры регулируются законодательством Республики Узбекистан.",
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
    resetPassword: {
      title: "Set New Password",
      subtitle: "Enter a new secure password for your account",
      newPasswordLabel: "New password:",
      newPasswordPlaceholder: "At least 8 characters",
      confirmPasswordLabel: "Confirm new password:",
      confirmPasswordPlaceholder: "Re-enter password",
      passwordHint: "At least 8 characters",
      submitBtn: "Update password",
      savingBtn: "Saving...",
      successTitle: "Password updated!",
      successDesc: "Your new password has been saved. You can now continue to the app.",
      goToAppBtn: "Continue to app",
      backToLogin: "Back to sign in",
      missingFieldsToast: "Please fill in both password fields",
      passwordMinToast: "Password must be at least 8 characters long",
      passwordMismatchToast: "Passwords do not match",
      successToast: "Password updated successfully!",
      errorToast: "Failed to update password",
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
        turnover_tax: `Turnover Tax (${TURNOVER_RATE_RANGE})`,
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
      badge: "Zero-PII • LRU-547",
      title: "Privacy Policy & Data Protection Regulation",
      lastUpdated: "Last updated: November 20, 2026 • Compliant with Law LRU-547 of the Republic of Uzbekistan",
      sections: [
        {
          heading: "1. General Provisions & Statutory Compliance (LRU-547)",
          paragraphs: [
            "This Privacy Policy governs how information is processed, redacted, and protected across the FIRMUS accounting and tax SaaS platform (\"Platform\", \"Site\").",
            "The Platform strictly complies with the Law of the Republic of Uzbekistan \"On Personal Data\" (LRU-547). By registering, signing in via Google, or using guest tools, the User agrees to this Privacy Policy in full.",
          ],
        },
        {
          heading: "2. Core «Zero-PII» Architecture",
          paragraphs: [
            "FIRMUS is built on a Zero-PII foundation: it neither requests nor collects individuals' 14-digit PINFLs, passport series/numbers, residential addresses, biometric data, or personal payment card secrets (CVV/PIN).",
          ],
        },
        {
          heading: "3. Guest Mode vs. Registered Accountant Mode",
          bullets: [
            "Guest Mode (`/welcome`, `/calculators`, `/try`): files uploaded to the free reconciliation tool (`/try`) are parsed 100% inside the browser's volatile memory (RAM) on the User's device and are never transmitted to the server.",
            "Registered Mode (`/reconcile`, `/tax-calc`, `/clients`): stores corporate legal names, 9-digit TINs (STIR), selected tax regimes, bank account details, and anonymized reconciliation records only when explicitly saved by the User.",
          ],
        },
        {
          heading: "4. Anonymized Document Schema Learning (`onec_learned_schemas`)",
          paragraphs: [
            "When 1C, Bank, or Didox EHF files are uploaded, `extractAnonymizedFileBlueprint` extracts ONLY structural column headers (`Date`, `Counterparty`, `Debit`, `Credit`) — zero transaction amounts, TINs, or company names are stored in the learned schema registry.",
          ],
        },
        {
          heading: "5. External AI Models (Gemini API) & Automatic Masking",
          bullets: [
            "Before sending text to Google Gemini API, `depersonalizeForAi` automatically replaces 16-digit card numbers with `[KARTA_MASKED]`, PINFLs with `[PINFL_MASKED]`, 20-digit bank accounts with `[HISOB_MASKED]`, and phone/TIN numbers with `[TELEFON_MASKED]`.",
            "All tax amounts in `/tax-calc` are computed 100% by deterministic code — AI never computes tax totals.",
          ],
        },
        {
          heading: "6. Database Security, `AES-256-GCM` Encryption & `PostgreSQL RLS` Isolation",
          bullets: [
            "Row-Level Security (RLS): every accountant's workspace and client entities are strictly isolated at the PostgreSQL engine level.",
            "1C OData/EPF credentials and tokens are encrypted at rest using `AES-256-GCM` and `SHA-256`.",
          ],
        },
        {
          heading: "7. User Responsibilities for Account & Device Security",
          paragraphs: [
            "The User is solely responsible for safeguarding their password, Google account, and 1C tokens. FIRMUS is not liable for data exposure caused by User negligence (leaving sessions open on shared computers, sharing passwords, or using malware-infected devices).",
          ],
        },
        {
          heading: "8. Technical Cookies & Non-PII Analytics (`analytics_events`)",
          paragraphs: [
            "The Platform uses only technical cookies for authentication and UI language. Internal analytics records only 4 non-PII events (`page_view`, `tool_used`, `register_clicked`, `registered`) without storing IPs, emails, or monetary amounts.",
          ],
        },
        {
          heading: "9. Right to Data Deletion",
          paragraphs: [
            "Users may delete saved batches, bank accounts, client profiles, or their entire account at any time via \"Settings -> Account\" (`/settings`).",
          ],
        },
      ],
    },
    terms: {
      backToApp: "Back to app",
      backToLogin: "Back to sign in",
      badge: "Public Offer • NAS 21",
      title: "Terms of Service & Limitation of Liability (Public Offer)",
      subtitle: "FIRMUS SaaS Platform • Pursuant to Articles 367–370 of the Civil Code of the Republic of Uzbekistan",
      sections: [
        {
          heading: "1. General Provisions & Acceptance of Public Offer",
          paragraphs: [
            "This document constitutes an official Public Offer by the FIRMUS Platform. Pursuant to Articles 367 and 370 of the Civil Code of the Republic of Uzbekistan, registering an account (`/register`), checking the consent box, signing in via Google, or using guest tools (`/try`, `/calculators`) constitutes full and unconditional acceptance of these Terms.",
          ],
        },
        {
          heading: "2. Legal Status of Service («As-Is» Auxiliary Software Tool)",
          paragraphs: [
            "FIRMUS is provided \"As-Is\" as an auxiliary software automation tool for accountants and business owners. FIRMUS is NOT a state tax authority (`soliq.uz`), commercial bank, licensed tax advisor, or statutory audit firm.",
          ],
        },
        {
          heading: "3. Disclaimer of Liability for User Negligence & Errors",
          paragraphs: [
            "The Platform administration SHALL NOT BE LIABLE for any direct or indirect damages arising from User negligence, carelessness, or misuse. The User bears 100% sole responsibility in the following cases:",
          ],
          bullets: [
            "Uploading wrong or incomplete files: uploading corrupted statements or files belonging to another period or another company (wrong TIN/STIR);",
            "Misconfiguring client or tax regime: selecting the wrong status (`LLC 4%`, `Sole Proprietor 1%`, `VAT 12%`) or uploading one client's documents under another client's profile;",
            "Failure to review non-revenue inflows: failing to inspect and confirm bank loans, founder loans, internal own-account transfers, or refunds row-by-row in `/tax-calc`;",
            "Credential negligence: sharing passwords, Google sessions, or 1C OData keys with third parties or leaving sessions unlocked on public devices.",
          ],
        },
        {
          heading: "4. Tax Calculations, Penalties & Financial Liability Cap",
          paragraphs: [
            "All tax and turnover figures generated on the Platform carry the status: \"Estimated calculation — final decision must be confirmed by the accountant.\" Timely filing of official tax returns on `my3.soliq.uz`, monitoring annual turnover thresholds (`1B UZS` / `12,000 BHM`), and paying taxes remain the sole duty of the User. FIRMUS assumes zero financial or legal liability for any tax fines, interest (penya), or sanctions.",
          ],
        },
        {
          heading: "5. 1C Integration, Export Files (`.txt` / `.xml`) & Backup Obligation",
          bullets: [
            "All `1CClientBankExchange` (`.txt`), `EnterpriseData 1.8` (`.xml`), and `1C OData` outputs are generated strictly as DRAFTS (`Posted = false`).",
            "Before importing files into a production 1C database, the User must create a full 1C database backup (`.dt`) and verify account codes (`5110`, `4010`, `6010`, `6410`, `9010`, `9420`), amounts, and counterparty TINs.",
          ],
        },
        {
          heading: "6. Artificial Intelligence (AI) Limitations & «Human-in-the-Loop» Rule",
          paragraphs: [
            "AI models (LLM / Gemini) may produce inaccurate suggestions (\"AI hallucinations\"). AI never posts ledger entries without explicit human confirmation, and the User must verify every AI suggestion against primary documents and official `lex.uz` legislation.",
          ],
        },
        {
          heading: "7. Multi-Client Mode (Accountant / BPO) & Third-Party Authorization",
          paragraphs: [
            "An accountant managing multiple client companies in `/clients` warrants that they hold lawful authorization from those companies to upload and process their bank statements and invoices.",
          ],
        },
        {
          heading: "8. Subscription Plans, AI Credits & Payments (`Payme` / `Click`)",
          paragraphs: [
            "Plan limits (`Starter`, `Professional`, `Pro+`) are detailed on `/billing`. Payments for activated subscription periods and consumed AI credits are non-refundable except where required by applicable law.",
          ],
        },
        {
          heading: "9. Prohibited Conduct",
          paragraphs: [
            "Uploading malicious files, attempting unauthorized access to other users' data, automated scraping (`DDoS` / bots), and abusing free trials via disposable email addresses are strictly prohibited.",
          ],
        },
        {
          heading: "10. Force Majeure & Governing Law",
          paragraphs: [
            "The Platform is not liable for outages of ISPs, cloud data centers (`Supabase`, `Google Cloud`), banking systems, or state portals (`soliq.uz`, `didox.uz`). All disputes are governed by the laws of the Republic of Uzbekistan.",
          ],
        },
      ],
    },
  },
};

export function getAuthLegalDict(locale: Locale): AuthLegalDict {
  return authLegalDict[locale] ?? authLegalDict.uz;
}
