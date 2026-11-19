/**
 * Progressive Rollout Feature Flags ("Single-player to Multi-player").
 *
 * The underlying Supabase multi-tenant B2B schema (workspaces, business_entities,
 * team_members, 21-BHMS ledger, tax, finance, ai_auditor) remains intact so B2B SaaS
 * capabilities can be enabled step-by-step without database migrations.
 */
export const FEATURES = {
  /** Multi-workspace & multi-company switchers, company STIR onboarding, and Clients / Entities */
  multiCompanyMode: true,
  /** Team member invitations, corporate role badges, and multi-seat quotas */
  teamMode: false,
  /** Full ERP Accounting modules (Transactions, Chart of Accounts/Ledger, Tax Calendar, Finance P&L, AI Auditor) */
  fullAccountingErp: false,
} as const;
