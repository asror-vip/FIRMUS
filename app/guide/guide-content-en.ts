import type { GuideContent } from "./guide-types";

export const guideContentEn: GuideContent = {
  backToApp: "Back to dashboard",
  backToHome: "Back to home",
  badge: "Official User Guide • FIRMUS 2026",
  title: "FIRMUS — Complete User Guide & Documentation",
  subtitle:
    "How FIRMUS works, which Uzbekistan Tax Code & NAS-21 (BHMS) rules it relies on, how to run Bank ↔ 1C reconciliation, AI document scanning, 1C integration, and subscription plans.",
  updatedLabel: "Last updated: November 20, 2026",
  tocTitle: "Table of contents",
  sections: [
    {
      id: "overview",
      title: "1. What is FIRMUS and how does it work?",
      lead:
        "FIRMUS is an assistant platform built for multi-client accountants (LLC, YaTT, self-employed) and business owners in Uzbekistan.",
      paragraphs: [
        "FIRMUS works in two modes: guest mode (no signup required) and a registered workspace. You can use the tax calculators and browser-local Bank ↔ 1C reconciliation immediately without creating an account.",
        "Important: FIRMUS does not replace official government portals (my3.soliq.uz / Didox / E-IMZO) and does not submit statutory filings automatically. It speeds up manual accounting work while keeping final review and approval strictly with the accountant.",
      ],
      bullets: [
        "Guest mode (/calculators, /try): uploaded files never leave your browser — all calculations run locally on your device.",
        "Registered workspace: clients (by STIR/TIN), saved reconciliations, AI chats, 1C exports, and 1C bridge connections are saved securely in your account.",
        "Full interface and AI support in 3 languages: Uzbek (OʻZ), Russian (RU), and English (EN).",
      ],
    },
    {
      id: "legal-basis",
      title: "2. Legal & accounting basis (Tax Code, NAS-21 & verification status)",
      lead:
        "All tax math is computed by deterministic, versioned code (not AI guesses).",
      bullets: [
        "Uzbekistan Tax Code (lex.uz/docs/4674902): Art. 258 (VAT 12%), Art. 337 (Corporate Profit Tax 15%), Art. 381 (PIT 12%, resident dividends 5%), Art. 353 (non-resident dividends 10%), Art. 405 (Social Tax 12%), Art. 461 & 467 (Turnover Tax).",
        "2026 statutory updates: PQ-247 (12.08.2025) & OʻRQ-1108 (25.12.2025) — 1% turnover tax for YaTT & self-employed (up to 1B UZS), 4% for LLCs (including e-commerce); PF-100 (26.05.2026) — mandatory VAT threshold raised to 12,000 BHM from June 1, 2026; PF-115 (23.06.2026) — BHM set to 440,000 UZS from Sept 1, 2026 (12,000 BHM = 5.28B UZS).",
        "NAS-21 / 21-son BHMS (lex.uz/docs/-7315183): standard Uzbekistan chart of accounts (4010, 4410, 5110, 6010, 6410, 6520, 6710, 9420, 9430, etc.).",
        "Per-rule verification tracking: every tax rule stores its own independent verification status (Verified / Unverified) and individual verification date. Rules requiring extra statutory confirmation (such as the YaTT 1B UZS vs PF-100 12,000 BHM overlap) are visibly flagged with an amber warning in the UI.",
      ],
      note:
        "Note: Special exemptions (IT-Park residents, 0% export VAT, regional/sector reliefs) are not applied automatically — always verify against the official article on lex.uz.",
    },
    {
      id: "how-to-use",
      title: "3. Step-by-step feature guide",
      steps: [
        {
          title: "Step 1: Free calculators (/calculators)",
          detail:
            "Works without login. Compute 12% VAT, Gross/Net Payroll (12% PIT, 0.1% INPS, 12% Social Tax), Turnover Tax (LLC 4%, YaTT/Self-employed 1%), and Vacation Pay with visible per-rule verification status.",
        },
        {
          title: "Step 2: Bank ↔ 1C Reconciliation (/try and /reconcile)",
          detail:
            "Upload your bank statement (.xlsx, .csv, or 1CClientBankExchange .txt) and 1C export. FIRMUS auto-detects 18 Uzbek banks and Didox registers, compares amounts and dates, and highlights mismatches. AI match hints are clearly labeled as 'AI suggestion' (never auto-approved). Registered users can export ready-to-import 1C (.txt / .xml) and CSV files.",
        },
        {
          title: "Step 3: AI Assistant & Document Scanning (/assistant)",
          detail:
            "Upload receipt/invoice photos or PDFs (Pro/Pro+). After AI extraction, deterministic code checks line totals, VAT math, 9-digit STIR, and calendar date validity — flagging any discrepancy with an amber 'Check / Tekshiring' badge. You can also analyze contract text for risks and ask questions in any language.",
        },
        {
          title: "Step 4: Multi-client management (/clients) & Turnover Tax (/tax-calc)",
          detail:
            "Create separate client entities by STIR. All reconciliations, tax calculations, and learned file schemas stay isolated per client.",
        },
      ],
    },
    {
      id: "connect-1c",
      title: "4. How to connect 1C:Accounting (2 methods)",
      lead:
        "Compatible with 1C:Accounting 8.3, 8.2, 7.7, and Uzbekistan (UZ) configurations.",
      steps: [
        {
          title: "Method 1: File exchange (instant, no plugins)",
          detail:
            "Export bank statements or account cards from 1C as .xlsx, .csv, .xml, or 1CClientBankExchange (.txt) and upload to FIRMUS. After reconciling, download the formatted 1C (.txt) or 1C EnterpriseData (.xml) file and import it back into 1C.",
        },
        {
          title: "Method 2: Direct 1C Bridge — Step 1 (Generate pairing code)",
          detail:
            "Go to Settings -> Integrations and click 'Generate 1C pairing code'. You receive a one-time 8-character code valid for 5 minutes (temporarily locked for 15 minutes after 5 failed attempts).",
        },
        {
          title: "Method 2 — Step 2 (Pair from 1C Bridge)",
          detail:
            "Enter the 8-character code in your 1C FIRMUS Bridge / HTTP service. It calls POST /api/1c/pair and receives an encrypted Bearer integration token.",
        },
        {
          title: "Method 2 — Step 3 (Sync & token management)",
          detail:
            "Catalog sync (/api/1c/catalog-sync), outbox (/api/1c/outbox), and acknowledgements (/api/1c/ack) authenticate via the token. Tokens expire after 90 days and can be revoked immediately anytime from Settings -> Integrations.",
        },
      ],
    },
    {
      id: "security",
      title: "5. Security & privacy guarantees",
      bullets: [
        "Guest tools (/calculators, /try) process files 100% inside your browser.",
        "All 33 database tables enforce Row Level Security (RLS) for strict workspace/client isolation.",
        "Learned file schemas (onec_learned_schemas) strictly strip and reject STIRs, bank accounts, phone numbers, dates, amounts, and long descriptions (Zero-PII).",
        "1C integration tokens are encrypted, expire in 90 days, and support instant revocation.",
        "Payme and Click payments use atomic SQL transactions (ACID) to prevent duplicate processing.",
      ],
    },
  ],
  plansSectionId: "subscriptions",
  plansTitle: "6. Subscription plans, limits & billing",
  plansLead:
    "Starter is free forever with no credit card required. Upgrade to Pro or Pro+ for higher AI volume, PDF document scanning, and multiple clients.",
  plansTableHeaders: {
    plan: "Plan",
    price: "Pricing",
    credits: "AI Credits",
    models: "AI Models",
    files: "PDF & Reconcile Limits",
    entities: "Clients / Team",
  },
  plans: [
    {
      name: "Starter",
      monthlyPrice: "0 UZS / mo (Free)",
      annualPrice: "Free forever",
      aiCredits: "25 credits / mo (6 / day)",
      models: "Gemini 3.8 Flash (1 credit)",
      pdfLimit: "No PDF; images up to 1 MB; reconcile 3 MB / 1,000 rows (15 saved)",
      entitiesLimit: "Up to 3 companies (STIR), 1 user",
      extra: "10 chats (30 msgs/chat); 1C exports and all calculators included.",
    },
    {
      name: "Pro",
      badge: "Recommended",
      monthlyPrice: "99,000 UZS / mo",
      annualPrice: "Annual: 79,000 UZS / mo (948,000 UZS / yr — save 20%)",
      aiCredits: "350 credits / mo (45 / day)",
      models: "Gemini 3.8 Flash (1 cr) + Gemini 4 Hydrogen (2 cr)",
      pdfLimit: "PDF up to 4 MB (10 pages); images 1.5 MB; reconcile 10 MB / 3,000 rows (150 saved)",
      entitiesLimit: "Up to 15 companies (STIR), 5 team members",
      extra: "80 chats (60 msgs/chat); contract analysis up to 25,000 chars.",
    },
    {
      name: "Pro+",
      monthlyPrice: "249,000 UZS / mo",
      annualPrice: "Annual: 199,000 UZS / mo (2,388,000 UZS / yr — save 20%)",
      aiCredits: "1,000 credits / mo (120 / day)",
      models: "Gemini 3.8 Flash (1 cr) + Gemini 4 Hydrogen (2 cr) — priority",
      pdfLimit: "PDF up to 6 MB (25 pages); images 2 MB; reconcile 15 MB / 5,000 rows (1,000 saved)",
      entitiesLimit: "Unlimited companies & team members",
      extra: "300 chats (60 msgs/chat); contracts up to 30,000 chars; priority support.",
    },
  ],
  plansFootnotes: [
    "Credit cost: Gemini 3.8 Flash = 1 credit/request; Gemini 4 Hydrogen = 2 credits/request. Calculators and standard file reconciliation consume 0 AI credits.",
    "The 7-day free Pro trial will open once Payme/Click card binding is enabled (1 card = 1 trial). Until then, Starter is free forever (25 credits/month).",
    "Payments: online via Payme and Click. Plans activate automatically upon payment confirmation. Expired subscriptions revert to Starter limits without deleting your data.",
  ],
  quickLinksTitle: "Try it now",
  quickLinks: [
    { label: "Free Calculators (/calculators)", href: "/calculators" },
    { label: "Guest Bank ↔ 1C Reconcile (/try)", href: "/try" },
    { label: "Sign up free (/register)", href: "/register" },
    { label: "Sign in (/login)", href: "/login" },
  ],
  legalLinksLabel: "Legal documents:",
  privacyLabel: "Privacy Policy",
  termsLabel: "Terms of Service",
};
