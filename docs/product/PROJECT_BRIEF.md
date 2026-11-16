# FIRMUS — Master Project Brief

## 1. Executive Summary

**FIRMUS** is an AI-powered Business Automation Software-as-a-Service (SaaS) platform engineered specifically for the Uzbekistan market (21-son BHMS and Tax Code). FIRMUS serves as an intelligent operational nervous system for both individual businesses and multi-client accounting firms.

FIRMUS combines structured data ingestion (1C Client-Bank & CSV bank statements, Didox E-SF workflows, client-side E-IMZO signing), an atomic double-entry accounting engine inside PostgreSQL, and a strictly guarded Gemini AI Agent that drafts operations for human approval without ever bypassing ledger invariants.

## 2. Core Value Proposition & Principles

- **Zero Redundant Data Entry**: Bank statements (1C Client-Bank `.txt` / `.csv`), contracts, documents, and journal entries flow cleanly with automatic VAT 12% splitting and double-entry posting.
- **Deterministic Financial Truth**: Artificial intelligence (`GEMINI_MODEL`, defaulting to free-tier `gemini-2.5-flash` with deterministic fallback) analyzes balances, explains anomalies, and calls typed `propose_*` tools. Every balance, tax liability, and journal entry is strictly validated by Zod schemas and atomic PostgreSQL RPCs (`NUMERIC(19, 4)`).
- **Human-in-the-Loop AI Agent**: The AI never mutates financial records autonomously. Every proposed journal entry, storno reversal, period close, exception resolution, contract, employee, or inventory record requires explicit human confirmation in the UI and passes through `/api/ai-copilot/execute` with RBAC checks and immutable `ai_action_logs`.
- **Strict Multi-Tenancy**: Supports independent companies and multi-client accounting firms with workspace isolation, role-based access control, and PostgreSQL Row-Level Security (RLS).

## 3. Target Audiences & Personas

### Persona A: Independent Company (SME / Enterprise)
- **Stakeholders**: General Director, Internal Accountant, Operations Manager.
- **Use Case**: One workspace containing their business entity with automated banking import, Didox invoice tracking, E-IMZO local signing, payroll/tax calculations, and AI copilot assistance.

### Persona B: Accounting Firm (BPO / Multi-Client Practice)
- **Stakeholders**: Firm Managing Partner, Chief Accountant, Junior Accountants, External Auditor.
- **Use Case**: One workspace managing multiple client `business_entities`, entity-level assignments, strict auditor read-only isolation, and unified financial reporting.

## 4. System Boundaries & Constraints

1. **AI Model Boundary**: Unified Gemini REST orchestration configured via `GEMINI_MODEL` (default free-tier `gemini-2.5-flash`, fallback `gemini-2.5-flash-lite`, plus deterministic offline 21-BHMS guard), strict Function Calling, zero raw SQL execution, and PII depersonalization (`depersonalizeForAi`).
2. **Full-Stack Runtime**: TypeScript / Next.js App Router (UI + server Route Handlers) paired with Supabase PostgreSQL RLS & atomic PL/pgSQL functions (`create_journal_entry_atomic`, `reverse_journal_entry`, `close_accounting_period`, `get_trial_balance`, `get_general_ledger`).
3. **Regulatory & Cryptographic Boundary**: E-IMZO digital signature `.pfx`/USB private keys and PINs never leave the user's browser; signing occurs strictly locally via `CAPIWS`.
4. **Financial Immutability**: Posted journal entries cannot be edited or deleted (`trg_journal_entry_immutable`, `trg_journal_lines_immutable`); corrections occur exclusively via compensating `reversal` entries (`reverse_journal_entry`).
