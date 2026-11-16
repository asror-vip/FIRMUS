# ADR 0004: Strict Gemini AI Agent Orchestration & Human-in-the-Loop Execution

## Context
FIRMUS integrates an AI assistant as an operational co-pilot/agent across accounting, banking, tax, contracts, HR, and warehouse workflows. Because LLMs can hallucinate, the AI must be strictly grounded in 21-BHMS rules and live database state, and must never execute unvetted writes.

## Decision
1. **Configurable Gemini Free-Tier-First Model**: Orchestrated via `GEMINI_MODEL` environment configuration (defaulting to free-tier `gemini-2.5-flash` with fallback to `gemini-2.5-flash-lite`), `temperature: 0.0`, and an automatic offline deterministic 21-BHMS analyzer (`deterministic_guard`) when no API key is present. Future upgrades to stronger models require only changing `GEMINI_MODEL`.
2. **Comprehensive 21-BHMS Grounding & Tool Loop**:
   - System instructions inject the entity's live active `chart_of_accounts`, tax regime, Uzbekistan tax formulas (12% QQS, 12% JShODS, 12% Social tax), and anti-hallucination constraints.
   - Five read tools query live RLS-protected Supabase state (`get_financial_overview`, `get_trial_balance`, `get_general_ledger`, `list_recent_journal_entries`, `search_business_records`) with `depersonalizeForAi` PII masking.
3. **Strict Validation & Human-in-the-Loop Execution Boundary**:
   - Eight mutation tools (`propose_journal_entry`, `propose_reverse_entry`, `propose_resolve_exception`, `propose_transaction_status`, `propose_contract`, `propose_inventory_item`, `propose_employee`, `propose_close_period`) **only validate and construct typed proposals**. Any invalid account code or unbalanced entry returns an error back to the LLM to self-correct.
   - Execution occurs solely when the human user clicks Approve in `AiDrawer`, posting to `/api/ai-copilot/execute` which re-validates via Zod, enforces RBAC, runs atomic RPCs, and writes an immutable record to `ai_action_logs`.
