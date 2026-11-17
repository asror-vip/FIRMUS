# FIRMUS — AI-Powered Business & Accounting Automation SaaS

FIRMUS is an accounting automation and financial operations SaaS platform engineered for Uzbekistan (NSBU / 21-BHMS & Tax Code). It combines deterministic double-entry accounting, Bank-to-1C reconciliation, AI document scanning and chat assistance, Payme/Click subscription billing, and 1C:Enterprise / Didox integration bridges.

---

## Architecture At A Glance

- **Frontend & Full-Stack Runtime**: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Radix UI / shadcn components, Zod v4.
- **Database, Auth & Zero-Trust RPCs**: Supabase PostgreSQL (`NUMERIC(19, 4)` exact decimal precision, Row-Level Security, `SECURITY DEFINER` atomic RPCs, distributed rate limiting, `integration_connections`, and `onec_draft_queue`), Supabase Auth (Google OAuth and Email/Password).
- **Gemini AI Engine**: Chat assistant (`/api/ai-copilot`), Vision Invoice/Receipt/Contract scanner (`/api/ai-document-scan`), AI reconciliation categorization (`/api/ai-reconcile`), PII depersonalization, and HMAC-signed proposal confirmation tokens (`/api/ai-copilot/execute`).
- **Billing & Anti-Abuse**: Payme & Click atomic payment callbacks (`/api/payments/payme`, `/api/payments/click`), subscription checkout (`/api/subscription/checkout`), and 7-day Pro Trial anti-abuse guards (`/api/subscription/trial`).
- **Bank <-> 1C Reconciliation & Integrations**: Multi-format statement parser (Excel/CSV/TXT `1CClientBankExchange`), deterministic & AI matching engine, `kl_to_1c.txt` / EnterpriseData XML export, online 1C OData & local `.epf` bridge pairing, and Didox EDO configuration.

---

## Repository Layout

```text
firmus/
├── app/
│   ├── (app)/                  # Authenticated app routes: /, /reconcile, /assistant, /billing, /settings, ERP modules
│   ├── (auth)/                 # Login, register, forgot-password, reset-password
│   ├── (onboarding)/           # Workspace & company onboarding
│   ├── api/                    # Next.js Route Handlers (AI, profile, integrations, billing, payments, health)
│   ├── privacy/ & terms/       # ZRU-547 privacy policy and terms of service
├── components/                 # Shell navigation, UI primitives (Radix/shadcn), AI Drawer, shared widgets
├── lib/
│   ├── ai/                     # FIRMUS 21-BHMS AI agent, subscription guard, HMAC proposal tokens
│   ├── config/                 # Feature flags & plan/model specifications
│   ├── context/                # AppStateProvider (workspace, entity, subscription, locale)
│   ├── i18n/                   # Localized dictionaries (uz, ru, en) and domain translations
│   ├── services/               # Reconcile engine, 1C export & OData/.epf connector, bank import, tax calculator
│   ├── supabase/               # Browser, server, and service-role Supabase clients
│   ├── utils/                  # Finance rounding, PII depersonalization, secret encryption, validation helpers
│   └── validations/            # Zod v4 schemas
├── scripts/                    # Database migration runner (run-sql.mjs)
├── supabase/
│   └── migrations/             # Versioned PostgreSQL migrations (RLS, ledger RPCs, billing, integrations)
└── tests/unit/                 # Vitest unit test suite
```

---

## Development & Verification

```bash
npm install
npm run dev
```

Verification commands:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
