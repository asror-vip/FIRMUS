# ADR 0004: AI Orchestration via GPT-6 Luna and Function Calling

## Context
AUVRIO incorporates an AI layer to minimize manual accounting effort: matching counterparties, categorizing bank statement transactions, reconciling Didox electronic invoices, and explaining tax anomalies. However, LLMs can hallucinate and must never have unvetted write access to financial databases or execute raw SQL.

## Decision
1. **Single Model**: Use only `gpt-6-luna` via the official OpenAI Go SDK and Responses API. No secondary LLM providers are introduced in the core architecture.
2. **Strict Tool / Function Calling**:
   - The AI only interacts with AUVRIO through strictly typed backend tools (e.g., `reconcile_transaction`, `search_documents`, `draft_journal_entry`).
   - Every tool execution independently checks the user's role and entity permissions in Go.
3. **Deterministic Verification Boundary**:
   - The AI generates proposals and drafted journal entries.
   - The deterministic Go accounting engine independently validates all financial balances, account codes, and open periods before committing any transaction.
4. **Exception Center Integration**: Operations with confidence scores below configured thresholds, or transactions involving discrepancies, are automatically escalated to the human accountant via the Exception Center.

## Consequences
- **Positive**: High automation efficiency without sacrificing financial safety. Total traceability of AI decisions.
- **Negative**: Tool schemas must be meticulously maintained and tested against prompt regressions.
