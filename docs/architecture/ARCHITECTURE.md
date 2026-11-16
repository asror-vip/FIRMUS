# FIRMUS — System Architecture Blueprint

## 1. High-Level Architectural Vision

FIRMUS is structured as a **Modular Full-Stack TypeScript Application** built on **Next.js App Router**, backed by **Supabase PostgreSQL (Row-Level Security + Atomic PL/pgSQL RPCs)** as the persistent financial source of truth, and orchestrated by a strictly bounded **Gemini AI Agent**.

```mermaid
flowchart TD
    subgraph Client["Presentation Layer (TypeScript / Next.js React)"]
        WEB["Next.js App Router (shadcn/ui + AppStateProvider)"]
        EIMZO["Local E-IMZO Browser Agent (CAPIWS 127.0.0.1)"]
        DRAWER["AI Agent Drawer (Human-in-the-Loop Confirmation)"]
    end

    subgraph NextServer["Server Layer (Next.js Route Handlers & Server Logic)"]
        AI_ORCH["/api/ai-copilot (Gemini Function Calling + Deterministic 21-BHMS Guard)"]
        AI_EXEC["/api/ai-copilot/execute (RBAC + Zod + Audit Log Execution)"]
        OTP_API["/api/auth/phone-otp/* (HMAC-SHA256 OTP + Rate Limit)"]
        INTEG_API["/api/integrations/test (SSRF-Protected URL Tester)"]
        HEALTH["/api/health"]
    end

    subgraph DataLayer["Database, Auth, Storage & Accounting Core (Supabase)"]
        DB[("PostgreSQL Database (RLS + NUMERIC(19,4))")]
        RPCS["Atomic RPCs: create_journal_entry_atomic, reverse_journal_entry, close_accounting_period, get_trial_balance, get_general_ledger"]
        AUTH["Supabase Auth (Email, Google OAuth, Verified Phone)"]
        S3["Private Storage Bucket ('documents')"]
    end

    subgraph External["External APIs"]
        GEMINI["Google Gemini REST API (GEMINI_MODEL=gemini-2.5-flash)"]
        ESKIZ["Eskiz.uz SMS Gateway"]
    end

    WEB --> NextServer
    WEB --> EIMZO
    DRAWER --> AI_ORCH
    DRAWER --> AI_EXEC
    NextServer --> DB
    NextServer --> RPCS
    NextServer --> AUTH
    WEB --> S3
    AI_ORCH --> GEMINI
    OTP_API --> ESKIZ
```

---

## 2. Repository Structure

```text
firmus/
├── app/
│   ├── (app)/                       # Authenticated SaaS workspace routes
│   ├── (auth)/                      # Login, Register, Forgot Password
│   ├── api/                         # Route Handlers (AI Agent, Execute, OTP, Integration test, Health)
│   ├── auth/callback/               # PKCE OAuth callback with open-redirect guard
│   ├── privacy/ & terms/            # Privacy & Terms compliance pages
├── components/
│   ├── shared/                      # Cookie consent, UI guards
│   ├── shell/                       # Sidebar, Topbar, Footer, Human-in-the-Loop AI Drawer
│   └── ui/                          # shadcn/ui design system primitives
├── lib/
│   ├── ai/                          # FIRMUS Agent engine (firmus-agent.ts) & typed contracts (agent-types.ts)
│   ├── services/                    # supabase-service.ts, eskiz-sms.ts, eimzo-client.ts, bank-import.ts, one-c-export.ts
│   ├── supabase/                    # server.ts, client.ts, service.ts
│   ├── utils/                       # finance.ts (roundMoney, splitVatInclusive, payroll), privacy.ts (PII masking)
│   └── validations/                 # Zod v4 schemas
├── supabase/
│   └── migrations/                  # Versioned SQL migrations (RLS, ledger engine, COA seed, closing, AI audit logs)
├── scripts/                         # Security RLS, accounting hardening, and 31-check production E2E runner
└── tests/unit/                      # Vitest unit tests
```

---

## 3. Core Domain Boundaries

1. **Deterministic Ledger Boundary (`PostgreSQL RPCs`)**: Double-entry balancing (`SUM(debit) = SUM(credit)`), account verification against `chart_of_accounts`, idempotency keys, and immutability triggers execute inside PostgreSQL transactions — UI/LLM logic can never post unbalanced or backdoor-mutated entries.
2. **AI Agent Boundary (`lib/ai/firmus-agent.ts` + `/api/ai-copilot/execute`)**:
   - The LLM interacts strictly via typed Gemini `functionDeclarations` (never raw SQL).
   - PII (`pinfl`, `phone`, `email`, `password`, tokens) is masked via `depersonalizeForAi` before leaving the server.
   - Mutating actions emit typed proposals validated by Zod and live `chart_of_accounts` lookups; execution occurs **only** after the user clicks Approve in the UI and `/api/ai-copilot/execute` verifies RBAC and logs to `ai_action_logs`.
3. **Authentication & Secrets Isolation (`server-only`)**:
   - `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, and `OTP_HMAC_SECRET` remain strictly server-side (`import "server-only"`).
