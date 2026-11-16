-- ==============================================================================
-- FIRMUS — AI Agent Immutable Action Audit Log
-- Migration: 20261116050000_ai_agent_audit_logs.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ai_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_entity_id UUID NOT NULL REFERENCES public.business_entities(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action_type VARCHAR(60) NOT NULL,
  target_id UUID NULL,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_used VARCHAR(80) NOT NULL,
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected', 'failed')),
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_logs_entity_created
  ON public.ai_action_logs(business_entity_id, created_at DESC);

ALTER TABLE public.ai_action_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_action_logs FROM anon, PUBLIC;
GRANT SELECT, INSERT ON public.ai_action_logs TO authenticated;

DROP POLICY IF EXISTS "ai_action_logs_select" ON public.ai_action_logs;
CREATE POLICY "ai_action_logs_select" ON public.ai_action_logs
FOR SELECT TO authenticated
USING (business_entity_id IN (SELECT public.get_auth_user_entities()));

DROP POLICY IF EXISTS "ai_action_logs_insert" ON public.ai_action_logs;
CREATE POLICY "ai_action_logs_insert" ON public.ai_action_logs
FOR INSERT TO authenticated
WITH CHECK (
  actor_user_id = auth.uid()
  AND business_entity_id IN (SELECT public.get_auth_user_entities())
  AND EXISTS (
    SELECT 1
    FROM public.business_entities be
    WHERE be.id = ai_action_logs.business_entity_id
      AND (
        public.get_auth_user_role(be.workspace_id) IN (
          'workspace_owner',
          'workspace_admin',
          'chief_accountant',
          'accountant',
          'company_director'
        )
        OR EXISTS (
          SELECT 1
          FROM public.workspaces w
          WHERE w.id = be.workspace_id
            AND w.owner_user_id = auth.uid()
        )
      )
  )
);
