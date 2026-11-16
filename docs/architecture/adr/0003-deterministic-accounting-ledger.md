# ADR 0003: Deterministic Double-Entry Accounting Engine

## Context
FIRMUS financial accuracy requires zero floating-point rounding drift and strict historical immutability in compliance with Uzbekistan 21-son BHMS.

## Decision
1. **Exact Decimal Arithmetic**: Monetary columns use PostgreSQL `NUMERIC(19, 4)`; TypeScript helpers (`roundMoney`, `splitVatInclusive`, `calculatePayrollContributions` in `lib/utils/finance.ts`) round deterministically to 2 decimals and validate line balances before posting.
2. **Double-Entry Invariant**: Every `journal_entry` must satisfy `SUM(debit_amount) = SUM(credit_amount)` with single-sided positive lines (`debit > 0` OR `credit > 0`, never both). Enforced via Zod, PL/pgSQL `create_journal_entry_atomic`, and DB constraints.
3. **Immutability & Storno**: Posted `journal_entries` and `journal_lines` cannot be updated or deleted (`trg_journal_entry_immutable`, `trg_journal_lines_immutable`). Corrections occur exclusively via compensating `reversal` entries (`reverse_journal_entry`).
