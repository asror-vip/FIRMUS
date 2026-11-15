# AUVRIO — System Architecture Blueprint

## 1. High-Level Architectural Vision

AUVRIO is structured as a **Modular Monolith** in Go, serving a modern **Next.js App Router** frontend, backed by **Supabase PostgreSQL** as the persistent relational source of truth.

```mermaid
flowchart TD
    subgraph Client["Presentation Layer (TypeScript / Next.js)"]
        WEB["Next.js App Router (shadcn/ui + TanStack Query)"]
    end

    subgraph CoreBackend["AUVRIO Backend (Go Modular Monolith)"]
        API["HTTP API Service (Chi Router)"]
        WORKER["Background Processing Worker"]
        QUEUE[("Postgres Job Queue (SKIP LOCKED)")]
        
        subgraph Modules["Domain Modules (Clean Boundaries)"]
            AUTH["Auth & Tenancy Module"]
            ORG["Organizations & Entities"]
            INGEST["Data Ingestion Pipeline"]
            ACC["Deterministic Accounting Engine"]
            INTEG["Integration Hub (1C / Didox / Banks)"]
            AI["AI Orchestration (GPT-6 Luna)"]
            DOC["Document Management"]
            EXC["Exception Center"]
        end
    end

    subgraph DataLayer["Storage & Infrastructure (Supabase)"]
        DB[("PostgreSQL Database (RLS + pgx)")]
        S3["Supabase Storage (Private Buckets)"]
        REALTIME["Supabase Realtime (Status updates)"]
    end

    subgraph External["External Systems"]
        DIDOX["Didox EDO API"]
        ONEC["1C:Enterprise (OData / Local Connector)"]
        BANKS["Bank API / Statement Feeds"]
        OPENAI["OpenAI Responses API (gpt-6-luna)"]
    end

    WEB -->|REST API + JWT Bearer| API
    API --> Modules
    WORKER --> Modules
    API --> QUEUE
    WORKER --> QUEUE
    Modules --> DB
    Modules --> S3
    INTEG --> DIDOX
    INTEG --> ONEC
    INTEG --> BANKS
    AI --> OPENAI
```

---

## 2. Monorepo Repository Structure

AUVRIO uses a unified monorepo to guarantee synchronized API contracts, migrations, and shared documentation.

```text
AUVRIO/
├── apps/
│   └── web/                         # Next.js App Router, Tailwind CSS, shadcn/ui
├── services/
│   ├── api/                         # Go HTTP API service
│   │   ├── cmd/api/                 # Main entrypoint for API process
│   │   └── internal/                # Domain modules & business logic
│   ├── worker/                      # Go background jobs and ingestion worker
│   │   ├── cmd/worker/              # Main entrypoint for worker process
│   │   └── internal/                # Job handlers and batch schedulers
│   └── onec-connector/              # Dedicated Go Windows connector daemon for on-prem 1C
├── packages/
│   └── api-contracts/               # OpenAPI spec, generated TypeScript types, Zod schemas
├── supabase/
│   ├── migrations/                  # Versioned SQL migrations (source of truth)
│   └── seed.sql                     # Synthetic seed data for local development
├── docs/
│   ├── architecture/                # Architecture specifications & ADRs
│   │   └── adr/
│   ├── security/                    # Security policies and cryptographic controls
│   └── product/                     # Product requirements and roadmaps
└── scripts/                         # Local development, linting, and build automation
```

---

## 3. Go Backend Design & Module Boundaries

The Go backend adheres to strict dependency injection and interface-based design:

```text
services/api/internal/
├── config/              # Environment parsing and typed app config
├── platform/
│   ├── database/        # pgxpool connection pool lifecycle
│   ├── logger/          # Structured logging (log/slog)
│   ├── middleware/      # Tenant context, auth, CORS, rate-limiting, request ID
│   └── queue/           # Postgres transactional job enqueue helper
└── modules/
    ├── tenancy/         # Workspaces, members, roles, permissions
    ├── entities/        # Business entities (companies, tax configurations)
    ├── ingestion/       # Normalization, deduplication, raw ingestion
    ├── accounting/      # Double-entry ledger, journal entries, trial balance
    ├── integrations/    # Connector interfaces (1C, Didox, Bank adapters)
    ├── ai/              # OpenAI Responses API client, function calling tools
    ├── documents/       # File upload, validation, metadata extraction
    ├── exceptions/      # Discrepancy management and resolution workflows
    └── billing/         # Subscriptions, entitlements, usage metering
```

### Module Boundary Rules:
1. **No Circular Imports**: Modules communicate through exported Go interfaces.
2. **Explicit Context**: Every service method takes `ctx context.Context` as its first parameter for deadline propagation and cancellation.
3. **Database Independence**: Business logic relies on typed repositories generated via `sqlc` with PostgreSQL transactions (`pgx.Tx`).

---

## 4. Frontend Architecture (Next.js App Router)

The frontend is a lightweight, responsive enterprise web application built for business productivity:

- **State Management**: Server state is managed exclusively via **TanStack Query (React Query)** with automatic cache invalidation on mutations.
- **Form Handling & Validation**: React Hook Form coupled with **Zod** schemas matching backend OpenAPI contracts.
- **Design System**: **Tailwind CSS** with **shadcn/ui** primitives, prioritizing dense, readable data tables, clear status badges, and accessibility (WCAG 2.1 AA compliant).
- **Navigation Flow**:
  - Global Workspace Switcher (for accounting firms managing multiple entities).
  - Business Entity Selector with persistent active context.
  - Contextual AI copilot panel accessible across any operational view.

---

## 5. Background Ingestion & Processing Pipeline

Data synchronization from Didox and 1C occurs asynchronously via a resilient multi-stage pipeline:

```mermaid
sequenceDiagram
    participant Ext as External System (Didox / 1C)
    participant Conn as Integration Connector
    participant Raw as raw_source_records
    participant Worker as Background Worker
    participant Ledger as Accounting Engine
    participant Exc as Exception Center

    Ext->>Conn: Fetch invoices / journal entries
    Conn->>Raw: Persist raw payload (hash, payload, source_id)
    Note over Raw: Deduplication via SHA-256 idempotency key
    Conn->>Worker: Enqueue normalization job
    Worker->>Worker: Parse & classify document
    Worker->>Worker: Match counterparty & chart of accounts
    alt Perfect Match & Zero Discrepancy
        Worker->>Ledger: Generate balanced journal entries
        Ledger->>Ledger: Post transaction (immutable)
    else Ambiguity / Mismatch / Missing Document
        Worker->>Exc: Create Exception Record (YELLOW / RED status)
        Exc->>Exc: Generate AI Suggested Resolution
        Note over Exc: Awaits accountant approval
    end
```

---

## 6. AI Orchestration Strategy (GPT-6 Luna)

1. **Sole Model**: `gpt-6-luna` accessed via official OpenAI Go SDK using the **Responses API**.
2. **Role & Capability**: Acts as the intelligent workflow coordinator, anomaly detector, and natural-language query parser.
3. **Strict Function Calling**: The model never touches raw SQL. It interacts solely through whitelisted Go tool definitions with structured JSON schemas.
4. **Deterministic Validation Boundary**:
   - AI proposes: `"Match invoice #104 with transaction #882 and debit Account 6010 / credit Account 5110"`.
   - Go Accounting Engine validates: Debits equal Credits, accounts exist in chart of accounts, accounting period is open, user has permission on entity.
   - If validation succeeds and entity policy allows auto-posting, transaction posts; otherwise, it creates a pending proposal in the Exception Center.
