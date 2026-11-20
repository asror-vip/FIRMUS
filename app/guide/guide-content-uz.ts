import type { GuideContent } from "./guide-types";

export const guideContentUz: GuideContent = {
  backToApp: "Ishchi kabinetga qaytish",
  backToHome: "Bosh sahifaga qaytish",
  badge: "Rasmiy foydalanuvchi yoʻriqnomasi • FIRMUS 2026",
  title: "FIRMUS — Saytda ishlash boʻyicha toʻliq yoʻriqnoma",
  subtitle:
    "Sayt qanday ishlashi, qaysi Oʻzbekiston soliq qonunlari va 21-BHMS qoidalariga asoslanishi, Bank ↔ 1C sverka, AI hujjat skanerlash, 1C’ga ulash hamda obuna tariflari haqida barcha muhim maʼlumotlar.",
  updatedLabel: "Yangilangan sana: 2026-yil 20-noyabr",
  tocTitle: "Mundarija (tezkor oʻtish)",
  sections: [
    {
      id: "overview",
      title: "1. FIRMUS nima va sayt qanday ishlaydi?",
      lead:
        "FIRMUS — Oʻzbekistonda bir nechta mijozga (MChJ, YaTT, oʻzini oʻzi band qilganlar) xizmat koʻrsatuvchi buxgalterlar va tadbirkorlar uchun moʻljallangan yordamchi ish platformasi.",
      paragraphs: [
        "Platforma ikki rejimda ishlaydi: loginsiz (mehmon) rejimi va roʻyxatdan oʻtgan shaxsiy kabinet. Siz hech qanday akkaunt ochmasdan ham soliq kalkulyatorlaridan va brauzer ichidagi Bank ↔ 1C sverkadan bepul foydalanishingiz mumkin.",
        "Muhim qoida: FIRMUS rasmiy davlat soliq organi (my3.soliq.uz / Didox / E-IMZO) oʻrnini bosmaydi va avtomatik hisobot topshirmaydi. Tizim kundalik qoʻl mehnatini (solishtirish, hisoblash, hujjat oʻqish, 1C’ga fayl tayyorlash) tezlashtiruvchi yordamchi vositadir. Yakuniy buxgalteriya va soliq qarorini har doim buxgalter tekshirib tasdiqlaydi.",
      ],
      bullets: [
        "Mehmon rejimi (/calculators, /try): fayllar serverga umuman yuborilmaydi, barcha hisob-kitoblar kompyuteringiz brauzeri ichida bajariladi.",
        "Roʻyxatdan oʻtgan kabinet: mijozlar (STIR boʻyicha), saqlangan sverkalar, AI yordamchi suhbatlari, 1C eksport va 1C ulanish sozlamalari shaxsiy hisobingizda saqlanadi.",
        "Interfeys va AI yordamchi 3 tilda ishlaydi: Oʻzbekcha (OʻZ), Ruscha (RU) va Inglizcha (EN).",
      ],
    },
    {
      id: "legal-basis",
      title: "2. Sayt nimalarga asoslanadi? (Qonunlar, moddalar va tasdiqlash holati)",
      lead:
        "Barcha soliq formulalari AI taxminiga emas, balki versiyalangan qatʼiy dasturiy kodga (Deterministic Tax Engine) asoslangan.",
      bullets: [
        "Oʻzbekiston Respublikasi Soliq kodeksi (lex.uz/docs/4674902): 258-modda (QQS 12%), 337-modda (Foyda soligʻi 15%), 381-modda (JShDS 12%, rezident dividendlari 5%), 353-modda (norezident dividendlari 10%), 405-modda (Ijtimoiy soliq 12%), 461 va 467-moddalar (Aylanmadan olinadigan soliq).",
        "2026-yil normativ hujjatlari: PQ-247 (12.08.2025), OʻRQ-1108 (25.12.2025) — YaTT va oʻzini oʻzi band qilganlar uchun 1% stavka (1 mlrd soʻmgacha), MChJ uchun 4% (e-commerce ham 4%); PF-100 (26.05.2026) — 2026-yil 1-iyundan majburiy QQS chegarasi 12 000 BHM; PF-115 (23.06.2026) — 2026-yil 1-sentabrdan BHM 440 000 soʻm (12 000 BHM = 5,28 mlrd soʻm).",
        "21-son BHMS (lex.uz/docs/-7315183): standart buxgalteriya schyotlar rejasi (4010 — xaridorlar, 4410 — kiruvchi QQS, 5110 — hisob-kitob schyoti, 6010 — yetkazib beruvchilar, 6410 — budjetga toʻlovlar, 6520 — ijtimoiy sugʻurta, 6710 — mehnat haqi, 9420/9430 — xarajatlar).",
        "Alohida tekshirilgan/tasdiqlanmagan holat: har bir soliq qoidasi alohida tekshirilgan sana va holatga (Tasdiqlangan / Tasdiqlanmagan) ega. Rasmiy modda talqini qoʻshimcha aniqlik talab qiladigan qoidalar (masalan, 2026-yil 1-iyundan keyin YaTT 1 mlrd soʻmdan oshgan qismining PF-100 bilan kesishuvi) interfeysda sariq «Tasdiqlanmagan qoida» ogohlantirishi bilan aniq koʻrsatiladi.",
      ],
      note:
        "Diqqat: IT-Park rezidentlari, eksport 0% QQS, maxsus hududiy yoki sohaviy imtiyozlar kalkulyatorda avtomatik hisoblanmaydi — bunday holatlarda soliq maslahatchisi yoki amaldagi lex.uz moddasi asosida tekshiring.",
    },
    {
      id: "how-to-use",
      title: "3. Boʻlimlardan qadam-baqadam foydalanish",
      steps: [
        {
          title: "1-qadam: Bepul kalkulyatorlar (/calculators)",
          detail:
            "Loginsiz ishlaydi. QQS 12% (ustiga qoʻshish yoki ichidan ajratish), Ish haqi (Brutto ↔ Netto, JShDS 12%, ShJBPH/INPS 0,1%, Ijtimoiy soliq 12%), Aylanma soliq (MChJ 4%, YaTT va oʻzini band 1%) hamda Taʼtil pulini bir soniyada hisoblang. Har bir karta ostida qoidaning tasdiqlangan sanasi yoki sariq ogohlantirish koʻrinadi.",
        },
        {
          title: "2-qadam: Bank ↔ 1C Sverka (/try va /reconcile)",
          detail:
            "Chap tomonga bank koʻchirmasini (.xlsx, .csv yoki 1CClientBankExchange .txt), oʻng tomonga esa 1C chiqish faylini yuklang. Tizim 18 ta Oʻzbekiston banki va Didox EHF jadvallarini MFO/sarlavha orqali avtomatik taniydi, summalar va sanalarni solishtiradi, mos kelganlar va farqlarni alohida ajratib beradi. Noaniq qatorlar uchun AI yordamini bossangiz, natija «AI taklifi» yorligʻi bilan chiqadi — yakuniy tasdiqni siz bosasiz. Roʻyxatdan oʻtgan kabinetda natijani 1C (.txt / .xml) yoki CSV qilib yuklab olish va saqlash mumkin.",
        },
        {
          title: "3-qadam: AI Yordamchi va Hujjat skanerlash (/assistant)",
          detail:
            "Chek, hisob-faktura, TTN rasmini (Starter/Pro/Pro+) yoki PDF hujjatni (Pro/Pro+) yuklang. AI matn va qatorlarni oʻqib chiqqach, dastur kodi raqamlarni matematik tekshiradi: qatorlar yigʻindisi jami summaga tengmi, QQS stavkaga mosmi, STIR 9 ta raqammi va sana haqiqiymi. Agar bitta boʻlsa ham nomuvofiqlik topilsa, karta yuqorisida sariq «Tekshiring» belgisi va aniq xato sababi chiqadi. Shuningdek, shartnoma matnini tashlab yuridik/soliq xavflarini tekshirishingiz va istalgan savolni oʻzingizga qulay tilda soʻrashingiz mumkin.",
        },
        {
          title: "4-qadam: Mijozlar boshqaruvi (/clients) va Aylanma soliq (/tax-calc)",
          detail:
            "Har bir MChJ yoki YaTT mijozni alohida korxona sifatida qoʻshing (STIR, nomi, soliq rejimi). Yuqori paneldan kerakli mijozni tanlasangiz, barcha sverkalar, hisoblar va oʻrganilgan fayl qoliplari faqat shu mijoz uchun alohida saqlanadi. /tax-calc boʻlimida bank/Didox/1C fayllaridan davr aylanmasini yigʻib, chegara (1 mlrd yoki 12 000 BHM) nazoratini koʻrishingiz mumkin.",
        },
      ],
    },
    {
      id: "connect-1c",
      title: "4. 1C:Buxgalteriyaga ulash yoʻriqnomasi (2 xil usul)",
      lead:
        "FIRMUS 1C:Buxgalteriya 8.3, 8.2, 7.7 va Oʻzbekiston (UZ) konfiguratsiyalari bilan ikki xil usulda ishlaydi: fayl almashinuvi orqali (darhol) va 1C Bridge tokeni orqali (toʻgʻridan-toʻgʻri).",
      steps: [
        {
          title: "1-usul: Fayl orqali ishlash (dastur oʻrnatish shart emas)",
          detail:
            "1C’dan bank koʻchirmasi yoki aylanma-qoldiq jadvalini Excel (.xlsx), CSV, XML yoki 1CClientBankExchange (.txt) formatida saqlang. Uni FIRMUS (/reconcile yoki /try) ga yuklang. Birinchi marta 1C versiyangizni (masalan, 1C 8.3 UZ) koʻrsatsangiz, tizim ustun tuzilishini eslab qoladi (STIR va summalarsiz!). Sverka tugagach, «1C (.txt)» yoki «1C EnterpriseData (.xml)» tugmasi orqali tayyor faylni yuklab olib, 1C’ga «Банк и касса -> Загрузить из файла» orqali kiriting.",
        },
        {
          title: "2-usul: 1C Bridge orqali toʻgʻridan-toʻgʻri ulash — 1-qadam (Ulash kodi olish)",
          detail:
            "Shaxsiy kabinetda «Sozlamalar -> Integratsiyalar» boʻlimiga kiring va «1C ulash kodini yaratish» tugmasini bosing. Tizim 8 belgili bir martalik ulash kodi yaratadi. Xavfsizlik uchun kod atigi 5 daqiqa amal qiladi; agar kod 5 marta notoʻgʻri kiritilsa, himoya sifatida 15 daqiqaga vaqtincha bloklanadi.",
        },
        {
          title: "2-usul — 2-qadam (1C Bridge’da tasdiqlash)",
          detail:
            "1C tomonidagi FIRMUS Bridge / HTTP-servis sozlamasiga ushbu 8 belgili kodni kiriting. Bridge serverga POST /api/1c/pair soʻrovini yuboradi va javob sifatida shifrlangan maxfiy integratsiya tokenini (Bearer token) oladi.",
        },
        {
          title: "2-usul — 3-qadam (Sinxronizatsiya va tokenni boshqarish)",
          detail:
            "Ulangandan soʻng 1C kataloglari (/api/1c/catalog-sync), yuboriladigan hujjatlar navbati (/api/1c/outbox) va qabul tasdiqlari (/api/1c/ack) shu token orqali almashinadi. Token 90 kun amal qiladi; muddati tugagach yangi kod bilan qayta ulash mumkin. Agar kompyuter almashtirilsa yoki xavf sezilsa, «Sozlamalar -> Integratsiyalar» dan «Ulanishni bekor qilish» tugmasi bilan tokenni darhol oʻchirib qoʻyishingiz mumkin.",
        },
      ],
    },
    {
      id: "security",
      title: "5. Xavfsizlik va maxfiylik qoidalari",
      bullets: [
        "Mehmon rejimida (/calculators, /try) fayllar brauzeringizdan tashqariga chiqmaydi.",
        "Roʻyxatdan oʻtgan kabinetda barcha 33 ta baza jadvali Row Level Security (RLS) bilan himoyalangan — har bir foydalanuvchi faqat oʻz ishchi maydoni va mijozlarini koʻradi.",
        "Oʻrganilgan 1C/Bank/Didox ustun qoliplarida (onec_learned_schemas) mijozning STIR, hisob raqami, telefon, sana, pul summasi va uzun toʻlov izohlari avtomatik rad etiladi — faqat qisqa ustun sarlavhalari saqlanadi.",
        "1C integratsiya tokeni shifrlangan holda saqlanadi, 90 kunlik muddatga ega va istalgan payt bekor qilinishi mumkin.",
        "Toʻlovlar (Payme va Click) atomik SQL tranzaksiyalar orqali qayta ishlanadi — bitta toʻlov ikki marta yozilib ketishidan himoyalangan.",
      ],
    },
  ],
  plansSectionId: "subscriptions",
  plansTitle: "6. Obunalar (Tariflar), limitlar va toʻlov tartibi",
  plansLead:
    "Boshlash uchun karta ulash shart emas — Starter tarifi doimiy bepul. Katta hajm, PDF hujjatlar va bir nechta mijozlar uchun Pro yoki Pro+ tarifini tanlashingiz mumkin.",
  plansTableHeaders: {
    plan: "Tarif",
    price: "Narxi",
    credits: "AI kreditlar",
    models: "AI modellari",
    files: "PDF va Sverka limiti",
    entities: "Korxonalar / Jamoa",
  },
  plans: [
    {
      name: "Starter",
      monthlyPrice: "0 soʻm / oy (Bepul)",
      annualPrice: "Doimiy bepul",
      aiCredits: "25 kredit / oy (kuniga 6 ta)",
      models: "Gemini 3.8 Flash (1 kredit)",
      pdfLimit: "PDF yopiq; rasm 1 MB; sverka 3 MB / 1 000 qator (15 ta arxiv)",
      entitiesLimit: "1 ta korxona (STIR), 1 ta foydalanuvchi",
      extra: "10 ta chat, har chatda 30 ta xabar; 1C eksport va barcha kalkulyatorlar ochiq.",
    },
    {
      name: "Pro",
      badge: "Tavsiya etiladi",
      monthlyPrice: "99 000 soʻm / oy",
      annualPrice: "Yillik: 79 000 soʻm / oy (948 000 soʻm / yil — 20% tejam)",
      aiCredits: "350 kredit / oy (kuniga 45 ta)",
      models: "Gemini 3.8 Flash (1 kr) + Gemini 4 Hydrogen (2 kr)",
      pdfLimit: "PDF 4 MB (10 sahifa); rasm 1,5 MB; sverka 10 MB / 3 000 qator (150 ta arxiv)",
      entitiesLimit: "5 tagacha korxona (STIR), 5 ta aʼzo",
      extra: "80 ta chat, har chatda 60 ta xabar; shartnoma matni 25 000 belgigacha.",
    },
    {
      name: "Pro+",
      monthlyPrice: "249 000 soʻm / oy",
      annualPrice: "Yillik: 199 000 soʻm / oy (2 388 000 soʻm / yil — 20% tejam)",
      aiCredits: "1 000 kredit / oy (kuniga 120 ta)",
      models: "Gemini 3.8 Flash (1 kr) + Gemini 4 Hydrogen (2 kr) — ustuvor navbat",
      pdfLimit: "PDF 6 MB (25 sahifa); rasm 2 MB; sverka 15 MB / 5 000 qator (1 000 ta arxiv)",
      entitiesLimit: "Cheksiz korxona va jamoa aʼzolari",
      extra: "300 ta chat, har chatda 60 ta xabar; shartnoma 30 000 belgigacha; ustuvor texnik yordam.",
    },
  ],
  plansFootnotes: [
    "AI kredit sarfi: Gemini 3.8 Flash = 1 kredit / soʻrov; Gemini 4 Hydrogen = 2 kredit / soʻrov. Bepul kalkulyatorlar va oddiy fayl sverkasi AI kredit sarflamaydi.",
    "7 kunlik bepul Pro sinovi Payme/Click karta ulash yoqilgandan keyin ochiladi (1 karta = 1 marta). Ungacha Starter tarifi doimiy bepul (oyiga 25 kredit).",
    "Toʻlov usullari: Payme va Click orqali onlayn toʻlov. Toʻlov tasdiqlangach obuna avtomatik faollashadi. Obuna muddati tugagach maʼlumotlaringiz oʻchib ketmaydi — hisob Starter limitlariga qaytadi.",
  ],
  quickLinksTitle: "Hozir sinab koʻring",
  quickLinks: [
    { label: "Bepul kalkulyatorlar (/calculators)", href: "/calculators" },
    { label: "Loginsiz Bank ↔ 1C Sverka (/try)", href: "/try" },
    { label: "Bepul roʻyxatdan oʻtish (/register)", href: "/register" },
    { label: "Kirish (/login)", href: "/login" },
  ],
  legalLinksLabel: "Yuridik hujjatlar:",
  privacyLabel: "Maxfiylik siyosati",
  termsLabel: "Ommaviy oferta (Foydalanish shartlari)",
};
