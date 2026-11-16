# ADR 0002: Multi-Tenant Data Isolation and Access Scoping

## Context
FIRMUS serves both single-company enterprises and multi-client accounting firms. Staff must only view and act upon workspaces and client entities assigned to them, and read-only auditors/viewers must never mutate financial state.

## Decision
We enforce **Dual-Layer Defense**:
1. **Next.js Server Route & Auth Guards**: Route Handlers verify `supabase.auth.getUser()`, validate target UUIDs with Zod, and verify active mutating workspace roles (`resolveUserEntityRole` / `isMutatingRole`).
2. **PostgreSQL Row-Level Security (RLS) & Hardened RPCs**:
   - All tenant tables enforce RLS using `get_auth_user_workspaces()` and `get_auth_user_entities()`.
   - Ledger RPCs enforce `auth.uid()`, workspace/entity membership, and role authorization directly inside the database.

## Consequences
- **Positive**: Cross-tenant isolation holds even if an API route forgets a filter, and `auditor`/`viewer` mutation attempts fail at both API and DB layers.
