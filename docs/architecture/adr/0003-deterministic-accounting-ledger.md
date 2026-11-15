# ADR 0003: Deterministic Double-Entry Accounting Engine

## Context
AUVRIO core value rests on financial accuracy. In financial accounting, binary floating-point representations (e.g., IEEE-754 `float32` / `float64`) accumulate precision errors that corrupt balance sheets and tax returns. Furthermore, editable historical financial records destroy audit trails and violate international accounting standards.

## Decision
1. **Exact Decimal Arithmetic**: All monetary values are represented as `NUMERIC(19, 4)` in PostgreSQL and `shopspring/decimal` (or Go's `math/big.Rat`) in backend Go code. Floating-point arithmetic is strictly forbidden for currency.
2. **Double-Entry Invariant**: Every `journal_entry` must satisfy $\sum \text{Debits} = \sum \text{Credits}$. This invariant is enforced both programmatically in Go and through database constraints/triggers prior to posting.
3. **Immutability of Posted Transactions**:
   - Status transitions from `draft` to `posted`.
   - Once `posted`, a record cannot be modified or deleted.
   - Corrections must be made via explicit compensating `reversal` or `adjusting` journal entries.

## Consequences
- **Positive**: 100% precision, audit compliance, zero rounding drift, and legal defensibility in financial audits.
- **Negative**: Reversals require additional transaction lines and UI handling compared to simple in-place edits.
