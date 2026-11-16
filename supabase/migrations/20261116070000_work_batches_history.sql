-- ==============================================================================
-- FIRMUS — PII-Safe Work Batches & Uploaded Statement/Scan History
-- Migration: 20261116070000_work_batches_history.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.work_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_entity_id UUID NOT NULL REFERENCES public.business_entities(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  batch_type VARCHAR(30) NOT NULL CHECK (batch_type IN ('reconcile', 'document_scan', 'contract_risk')),
  period_month VARCHAR(7) NOT NULL,
  title VARCHAR(200) NOT NULL,
  bank_file_name VARCHAR(180) NULL,
  onec_file_name VARCHAR(180) NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  total_income NUMERIC(19, 4) NOT NULL DEFAULT 0,
  total_expense NUMERIC(19, 4) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'reviewed' CHECK (status IN ('reviewed', 'posted_to_ledger')),
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  sanitized_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_work_batches_entity_period
  ON public.work_batches(business_entity_id, period_month, created_at DESC);

ALTER TABLE public.work_batches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.work_batches FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_batches TO authenticated;

DROP POLICY IF EXISTS "work_batches_select" ON public.work_batches;
CREATE POLICY "work_batches_select" ON public.work_batches
FOR SELECT TO authenticated
USING (business_entity_id IN (SELECT public.get_auth_user_entities()));

DROP POLICY IF EXISTS "work_batches_insert" ON public.work_batches;
CREATE POLICY "work_batches_insert" ON public.work_batches
FOR INSERT TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND business_entity_id IN (SELECT public.get_auth_user_entities())
  AND EXISTS (
    SELECT 1
    FROM public.business_entities be
    WHERE be.id = work_batches.business_entity_id
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

DROP POLICY IF EXISTS "work_batches_update" ON public.work_batches;
CREATE POLICY "work_batches_update" ON public.work_batches
FOR UPDATE TO authenticated
USING (
  business_entity_id IN (SELECT public.get_auth_user_entities())
  AND EXISTS (
    SELECT 1
    FROM public.business_entities be
    WHERE be.id = work_batches.business_entity_id
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
)
WITH CHECK (
  business_entity_id IN (SELECT public.get_auth_user_entities())
);

DROP POLICY IF EXISTS "work_batches_delete" ON public.work_batches;
CREATE POLICY "work_batches_delete" ON public.work_batches
FOR DELETE TO authenticated
USING (
  business_entity_id IN (SELECT public.get_auth_user_entities())
  AND EXISTS (
    SELECT 1
    FROM public.business_entities be
    WHERE be.id = work_batches.business_entity_id
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
