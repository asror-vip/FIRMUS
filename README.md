# AUVRIO — AI-Powered Business Automation SaaS

AUVRIO is an enterprise-grade business automation and accounting SaaS platform designed specifically for the Uzbekistan market, with global extensibility. It delivers end-to-end automation of financial operations, accounting reconciliation, tax management, and primary document workflows (Didox EDO and 1C:Enterprise).

---

## Architecture At A Glance

- **Frontend**: TypeScript, Next.js App Router, Tailwind CSS, shadcn/ui, TanStack Query, Zod.
- **Backend**: Go (Golang) Modular Monolith, Chi router, pgx, sqlc, OpenAPI.
- **Database & Storage**: Supabase PostgreSQL (with Row-Level Security), Supabase Auth, Supabase Storage.
- **AI Coordination**: Single model — `gpt-6-luna` via the official OpenAI Go SDK, Responses API, and typed Function Calling.
- **Financial Core**: Deterministic double-entry ledger with `NUMERIC(19, 4)` exact precision and immutable posted history.

---

## Monorepo Layout

```text
AUVRIO/
├── apps/
│   └── web/                         # Next.js App Router presentation layer
├── services/
│   ├── api/                         # Go HTTP API service (Chi router)
│   ├── worker/                      # Go background jobs & ingestion worker
│   └── onec-connector/              # Dedicated on-prem 1C Windows connector daemon
├── packages/
│   └── api-contracts/               # OpenAPI specification, Zod schemas, TypeScript types
├── supabase/
│   ├── migrations/                  # Versioned PostgreSQL migrations
│   └── seed.sql                     # Synthetic seed data for development
└── docs/
    ├── architecture/                # System architecture, database design, ADRs
    ├── security/                    # Zero-trust E-IMZO, credential encryption, ZRU-547
    └── product/                     # Project brief, PRD, and implementation roadmap
```

---

## Documentation Index

- [Project Brief](file:///d:/Desktop/project/docs/product/PROJECT_BRIEF.md) — Executive summary, vision, target audiences, core principles.
- [System Architecture](file:///d:/Desktop/project/docs/architecture/ARCHITECTURE.md) — Modular monolith, data ingestion pipeline, AI boundary.
- [Database Design](file:///d:/Desktop/project/docs/architecture/DATABASE_DESIGN.md) — Full ERD, PostgreSQL tables, exact decimal math, RLS.
- [Security Architecture](file:///d:/Desktop/project/docs/security/SECURITY.md) — Zero-trust E-IMZO, AES-256-GCM encryption, ZRU-547 compliance.
- [Implementation Roadmap](file:///d:/Desktop/project/docs/product/ROADMAP.md) — Phase 0 to Phase 8 execution plan.
- [Architectural Decision Records (ADRs)](file:///d:/Desktop/project/docs/architecture/adr/0001-modular-monolith-go-chi.md) — Core architectural choices.
