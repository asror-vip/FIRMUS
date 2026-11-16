# ADR 0001: Full-Stack Next.js App Router + Supabase PostgreSQL Architecture

## Context
FIRMUS initially drafted a separate Go (`Chi`) backend service alongside Next.js. During Phase 1–4 implementation, maintaining two separate runtimes duplicated validation schemas and slowed end-to-end delivery for database transactions, RLS policies, and UI workflows.

## Decision
We unified the architecture around **Next.js App Router (TypeScript) + Supabase PostgreSQL (RLS + PL/pgSQL RPCs)**:
1. **Single Type-Safe Stack**: Shared Zod v4 validation schemas (`lib/validations/accounting.ts`, `lib/ai/agent-types.ts`), server-only Route Handlers (`app/api/*`), and React UI run in one TypeScript codebase.
2. **Database-Native Financial Core**: Performance-critical, ACID, multi-line double-entry accounting invariants (`create_journal_entry_atomic`, `reverse_journal_entry`, `close_accounting_period`, `get_trial_balance`, `get_general_ledger`) live inside hardened PostgreSQL PL/pgSQL `SECURITY DEFINER` functions with `NUMERIC(19, 4)` arithmetic and row-level immutability triggers.
3. **Zero-Bypass RLS**: Both browser Supabase queries and Next.js server routes use user-scoped JWTs so PostgreSQL RLS enforces workspace and entity boundaries uniformly.

## Consequences
- **Positive**: Eliminates cross-language drift, speeds up feature delivery, and guarantees transactional ledger integrity directly inside PostgreSQL.
- **Negative**: Requires strict discipline keeping service credentials (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `ESKIZ_*`) confined to `import "server-only"` server modules.
