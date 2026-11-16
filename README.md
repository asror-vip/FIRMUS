# FIRMUS — AI-Powered Business & Accounting Automation SaaS

FIRMUS is an enterprise-grade business automation and accounting SaaS platform engineered for the Uzbekistan market (21-son BHMS & Tax Code). It delivers end-to-end automation of financial operations, double-entry ledger integrity, tax calculations, and primary document workflows (Didox EDO, E-IMZO CAPIWS, and 1C:Enterprise export/import).

---

## Architecture At A Glance

- **Full-Stack Web & API**: TypeScript, Next.js App Router (Route Handlers + Server Components), React, Tailwind CSS, shadcn/ui, Zod.
- **Database, Auth, RLS & Ledger RPCs**: Supabase PostgreSQL (`NUMERIC(19, 4)`, Row-Level Security, atomic PL/pgSQL RPCs), Supabase Auth (Email, Google OAuth, Eskiz.uz SMS OTP), private Supabase Storage.
- **AI Agent Orchestration**: Configurable Gemini model (`GEMINI_MODEL`, defaulting to free-tier `gemini-3.8-flash` with fallback to `gemini-3.5-flash-lite` and deterministic 21-BHMS guard when no API key is configured), strict Function Calling (`propose_*`), Human-in-the-Loop approval execution (`/api/ai-copilot/execute`), PII depersonalization, and immutable `ai_action_logs`.
- **Financial Core**: Deterministic double-entry ledger with `NUMERIC(19, 4)` exact precision, idempotency keys, storno reversals (`reverse_journal_entry`), atomic period closing (`close_accounting_period`), and immutable posted history.

---

## Repository Layout

```text
firmus/
├── app/
│   ├── (app)/                       # Lean core: dashboard, /reconcile (Bank<->1C Sverka), accounting, transactions, ai-auditor, tax, finance, settings
│   ├── (auth)/                      # Login (Google-first & Email), register, forgot-password
│   ├── api/                         # Route Handlers (ai-copilot, ai-copilot/execute, ai-reconcile, health)
│   ├── privacy/ & terms/            # O'RQ-547 Zero-PII privacy & terms pages
├── components/                      # Reusable UI, navigation shell, Human-in-the-Loop AI Drawer
├── lib/
│   ├── ai/                          # FIRMUS 21-BHMS AI Agent engine, Zod tool schemas & guardrails
│   ├── services/                    # reconcile-engine.ts, supabase-service.ts, bank-import.ts, one-c-export.ts
│   ├── utils/                       # Exact money rounding, VAT 12% split, payroll math, card/PINFL PII masking
│   └── validations/                 # Zod v4 schemas
├── archive/optional-modules/        # Archived extended ERP pages/APIs (banking, docs, HR, contracts, SMS OTP, mocks) for future restore
├── supabase/
│   └── migrations/                  # Versioned PostgreSQL migrations (RLS, atomic ledger RPCs, Storage, AI audit logs)
├── scripts/                         # Security RLS, accounting hardening & full production E2E verification scripts
├── tests/unit/                      # Vitest unit tests
└── docs/                            # Product brief, updated Next.js roadmap, architecture, DB design & ADRs
```

---

## Documentation Index

- [Project Brief](file:///d:/Desktop/project/docs/product/PROJECT_BRIEF.md) — Executive summary, vision, target audiences, core principles.
- [System Architecture](file:///d:/Desktop/project/docs/architecture/ARCHITECTURE.md) — Next.js App Router + Supabase PostgreSQL + Gemini AI Agent architecture.
- [Database Design](file:///d:/Desktop/project/docs/architecture/DATABASE_DESIGN.md) — Full ERD, PostgreSQL tables, exact decimal math, RLS & AI audit logs.
- [Security Architecture](file:///d:/Desktop/project/docs/security/SECURITY.md) — Zero-trust E-IMZO, RLS isolation, Eskiz SMS OTP, ZRU-547 compliance.
- [Implementation Roadmap](file:///d:/Desktop/project/docs/product/ROADMAP.md) — Phase 0 to Phase 8 execution plan and live status.
- [ADR 0001 — Next.js + Supabase Modular Architecture](file:///d:/Desktop/project/docs/architecture/adr/0001-modular-monolith-go-chi.md) — Architectural pivot from early Go draft to Next.js App Router + Supabase RPCs.
- [ADR 0002 — Multi-Tenant Isolation](file:///d:/Desktop/project/docs/architecture/adr/0002-multi-tenant-data-isolation.md) — Dual-layer server + RLS enforcement.
- [ADR 0003 — Deterministic Accounting Ledger](file:///d:/Desktop/project/docs/architecture/adr/0003-deterministic-accounting-ledger.md) — `NUMERIC(19, 4)` + PostgreSQL immutability triggers.
- [ADR 0004 — AI Agent Orchestration](file:///d:/Desktop/project/docs/architecture/adr/0004-ai-orchestration-gpt-6-luna.md) — Gemini Function Calling + Human-in-the-Loop execution boundary.
