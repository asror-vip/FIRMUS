# ADR 0002: Multi-Tenant Data Isolation and Access Scoping

## Context
AUVRIO serves both single-company enterprises and professional accounting firms. An accounting firm workspace manages dozens of client companies (`business_entities`), where individual accountants must only access specific client accounts assigned to them. A leak of financial data between rival clients or workspaces is a catastrophic security failure.

## Decision
We enforce a **Dual-Layer Defense** for multi-tenancy:
1. **Application-Layer Scoping (Go Middleware)**:
   - Every request validates the active `workspace_id` and target `business_entity_id`.
   - The Go API verifies that the authenticated user has an active membership in the workspace and (for accounting staff) an active assignment in `entity_assignments`.
   - Every database query explicitly filters by `business_entity_id` and `workspace_id`.
2. **Database-Layer Scoping (PostgreSQL RLS)**:
   - Row-Level Security (RLS) is enabled on all tenant-specific tables in exposed schemas.
   - Database roles (`anon`, `authenticated`) have restricted access, with ownership verified via session context.

## Consequences
- **Positive**: Strict isolation guarantees. Accidental omission of a `WHERE` clause in raw SQL is caught by RLS policies; bugs in RLS are caught by application middleware.
- **Negative**: Queries require explicit tenant parameters; testing must always include cross-tenant access denial tests.
