-- ============================================================================
-- FIRMUS Stage 3: Multi-Client Accountant Profiles & Plan Limit Guard
-- ============================================================================
-- 1. Adds structured tax profile & 1C profile columns to business_entities:
--    - taxpayer_status ('llc' | 'yatt' | 'self_employed')
--    - is_vat_payer (boolean)
--    - activity_type (text)
--    - onec_profile_id (text — extended in Stage 5)
-- 2. Enforces per-workspace client (entity) count limit at the database level
--    matching lib/config/plans.ts:
--      starter      -> max 1 entity
--      professional -> max 5 entities
--      pro_plus / enterprise -> unlimited
-- 3. Ensures RLS remains strictly enabled on business_entities, bank_accounts,
--    and work_batches so Accountant B can never access Accountant A's clients.

ALTER TABLE public.business_entities
  ADD COLUMN IF NOT EXISTS taxpayer_status VARCHAR(24) NOT NULL DEFAULT 'llc'
    CHECK (taxpayer_status IN ('llc', 'yatt', 'self_employed')),
  ADD COLUMN IF NOT EXISTS is_vat_payer BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS activity_type VARCHAR(100) NOT NULL DEFAULT 'Savdo va xizmatlar',
  ADD COLUMN IF NOT EXISTS onec_profile_id VARCHAR(64) NOT NULL DEFAULT 'universal_excel_csv';

-- Backfill existing rows cleanly based on existing company_type & tax_regime
UPDATE public.business_entities
SET
  taxpayer_status = CASE
    WHEN UPPER(COALESCE(company_type, '')) IN ('YATT', 'YTT', 'IP') THEN 'yatt'
    ELSE 'llc'
  END,
  is_vat_payer = (tax_regime = 'vat_profit_tax')
WHERE taxpayer_status = 'llc' AND is_vat_payer = FALSE;

-- Helper function to enforce entity limit per workspace based on active subscription/plan
CREATE OR REPLACE FUNCTION public.enforce_workspace_entity_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_sub_status TEXT;
  v_sub_expires TIMESTAMPTZ;
  v_effective_plan TEXT := 'starter';
  v_limit INT;
  v_current_count INT;
BEGIN
  -- Look up active subscription plan first, falling back to workspaces.plan_id
  SELECT s.plan_id, s.status, COALESCE(s.expires_at, s.trial_ends_at)
  INTO v_plan_id, v_sub_status, v_sub_expires
  FROM public.subscriptions s
  WHERE s.workspace_id = NEW.workspace_id
  ORDER BY s.updated_at DESC
  LIMIT 1;

  IF v_plan_id IS NOT NULL
     AND COALESCE(v_sub_status, 'active') IN ('active', 'trialing')
     AND (v_sub_expires IS NULL OR v_sub_expires > NOW()) THEN
    v_effective_plan := v_plan_id;
  ELSE
    SELECT COALESCE(w.plan_id, 'starter')
    INTO v_effective_plan
    FROM public.workspaces w
    WHERE w.id = NEW.workspace_id;
  END IF;

  IF v_effective_plan IN ('pro_plus', 'enterprise') THEN
    RETURN NEW;
  ELSIF v_effective_plan = 'professional' THEN
    v_limit := 5;
  ELSE
    v_limit := 1;
  END IF;

  SELECT COUNT(*)
  INTO v_current_count
  FROM public.business_entities be
  WHERE be.workspace_id = NEW.workspace_id
    AND COALESCE(be.is_active, TRUE) = TRUE;

  IF v_current_count >= v_limit THEN
    RAISE EXCEPTION 'ENTITY_LIMIT_REACHED: Tarifingiz (%) bo''yicha maksimal % ta mijoz qo''shish mumkin.', v_effective_plan, v_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_workspace_entity_limit ON public.business_entities;
CREATE TRIGGER trg_enforce_workspace_entity_limit
  BEFORE INSERT ON public.business_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_workspace_entity_limit();

-- Confirm RLS is strictly enabled across all client-scoped tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_batches ENABLE ROW LEVEL SECURITY;
