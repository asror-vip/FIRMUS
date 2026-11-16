# FIRMUS — Security Architecture & Data Protection

## 1. Core Security Principles

FIRMUS processes sensitive financial records, tax declarations, and enterprise ledgers with defense-in-depth across client, Next.js server routes, and Supabase PostgreSQL boundaries.

---

## 2. Zero-Trust Digital Signature (E-IMZO) Architecture

> **Absolute Rule**: E-IMZO digital signature (`.pfx` / USB key) private keys and PINs **MUST NEVER** be uploaded, stored, or transmitted to FIRMUS servers. Signing happens locally via browser `CAPIWS` (`127.0.0.1:64443` / `64646`).

---

## 3. Dual-Layer Multi-Tenant Isolation & RBAC

1. **Next.js Server Route & Validation Boundary**:
   - Authenticated routes verify `supabase.auth.getUser()`, validate inputs with Zod (`lib/validations/accounting.ts`, `lib/ai/agent-types.ts`), enforce RBAC (`MUTATING_AGENT_ROLES` blocking `auditor`/`viewer` mutations), and prevent open redirects (`app/auth/callback/route.ts`) and SSRF (`app/api/integrations/test/route.ts`).
   - Sensitive secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `GEMINI_API_KEY`) are locked in server-only modules (`import "server-only"`).
2. **PostgreSQL Row-Level Security (RLS) & Hardened RPCs**:
   - `SECURITY DEFINER` RPCs declare `SET search_path = public`, revoke `anon`/`PUBLIC` execute grants, verify `auth.uid()`, and enforce role/entity isolation inside PostgreSQL.
   - `phone_otp_verifications` denies all access to `anon` and `authenticated` (service-role only).
   - Private `'documents'` Supabase Storage bucket restricts object paths to authorized entity members.

---

## 4. AI Agent Security & PII Protection

- **Zero Direct DB Writes by LLM**: Gemini tools only emit validated `propose_*` payloads; mutations execute solely after explicit user confirmation at `/api/ai-copilot/execute`.
- **PII Depersonalization**: `depersonalizeForAi` masks/strips `pinfl`, `phone`, `email`, `password`, and secret fields before LLM calls.
- **Immutable Audit Trail**: `ai_action_logs` records all AI-assisted approvals/rejections with `actor_user_id`, `model_used`, `payload`, and `decision` (no `UPDATE` or `DELETE` RLS policies).

---

## 5. Uzbekistan Data Protection Compliance (ZRU-547)

- Production customer databases containing personal data of citizens of the Republic of Uzbekistan must be hosted in compliance with Law No. ZRU-547 prior to commercial launch.
- Real customer financial PII is masked or avoided in development logs and AI prompts.
