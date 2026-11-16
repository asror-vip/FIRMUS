-- ==============================================================================
-- FIRMUS — Subscriptions, 7-Day Pro Trial, Atomic AI Credits & History Caps
-- Migration: 20261117010000_subscriptions_credits_and_limits.sql
-- ==============================================================================

-- 1. SUBSCRIPTIONS TABLE (Server-authoritative plan & lifetime-once Pro trial)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NULL REFERENCES public.workspaces(id) ON DELETE SET NULL,
  plan_id VARCHAR(30) NOT NULL DEFAULT 'starter'
    CHECK (plan_id IN ('starter', 'professional', 'pro_plus')),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'expired', 'cancelled')),
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'annual')),
  preferred_model VARCHAR(50) NOT NULL DEFAULT 'gemini-3.8-flash'
    CHECK (preferred_model IN ('gemini-3.8-flash', 'gemini-4-hydrogen')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  expires_at TIMESTAMPTZ NULL,
  trial_started_at TIMESTAMPTZ NULL,
  trial_ends_at TIMESTAMPTZ NULL,
  trial_used_at TIMESTAMPTZ NULL,
  bonus_credits INTEGER NOT NULL DEFAULT 0 CHECK (bonus_credits >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.subscriptions FROM anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 2. AI USAGE COUNTERS (Monthly & Daily atomic credit tracking)
CREATE TABLE IF NOT EXISTS public.ai_usage_monthly (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month VARCHAR(7) NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  requests_count INTEGER NOT NULL DEFAULT 0 CHECK (requests_count >= 0),
  scans_count INTEGER NOT NULL DEFAULT 0 CHECK (scans_count >= 0),
  tokens_estimated INTEGER NOT NULL DEFAULT 0 CHECK (tokens_estimated >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, period_month)
);

CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_day VARCHAR(10) NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  requests_count INTEGER NOT NULL DEFAULT 0 CHECK (requests_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, period_day)
);

ALTER TABLE public.ai_usage_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_usage_monthly FROM anon, PUBLIC;
REVOKE ALL ON public.ai_usage_daily FROM anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.ai_usage_monthly FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ai_usage_daily FROM authenticated;
GRANT SELECT ON public.ai_usage_monthly TO authenticated;
GRANT SELECT ON public.ai_usage_daily TO authenticated;

DROP POLICY IF EXISTS "ai_usage_monthly_select_own" ON public.ai_usage_monthly;
CREATE POLICY "ai_usage_monthly_select_own" ON public.ai_usage_monthly
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ai_usage_daily_select_own" ON public.ai_usage_daily;
CREATE POLICY "ai_usage_daily_select_own" ON public.ai_usage_daily
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 3. WORK BATCHES DEDUP HASH COLUMN
ALTER TABLE public.work_batches
  ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64) NULL;

CREATE INDEX IF NOT EXISTS idx_work_batches_entity_hash
  ON public.work_batches(business_entity_id, file_hash)
  WHERE file_hash IS NOT NULL;

-- 4. DEFAULT NEW WORKSPACES TO 'starter' (Not free 'professional')
UPDATE public.workspaces
SET plan_id = 'starter', updated_at = clock_timestamp()
WHERE plan_id = 'professional';

CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
    p_name VARCHAR,
    p_type VARCHAR DEFAULT 'accounting_firm'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_email VARCHAR;
    v_full_name VARCHAR;
    v_ws_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Autentifikatsiya talab qilinadi';
    END IF;

    SELECT email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
    INTO v_email, v_full_name
    FROM auth.users WHERE id = v_user_id;

    INSERT INTO public.workspaces (name, type, owner_user_id, plan_id)
    VALUES (TRIM(p_name), COALESCE(p_type, 'accounting_firm'), v_user_id, 'starter')
    RETURNING id INTO v_ws_id;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.team_members (workspace_id, user_id, name, email, role, status, assigned_companies_count)
        VALUES (v_ws_id, v_user_id, COALESCE(v_full_name, 'Rahbar'), COALESCE(v_email, 'owner@firmus.uz'), 'workspace_owner', 'active', 0);

        INSERT INTO public.subscriptions (user_id, workspace_id, plan_id, status, preferred_model)
        VALUES (v_user_id, v_ws_id, 'starter', 'active', 'gemini-3.8-flash')
        ON CONFLICT (user_id) DO UPDATE
          SET workspace_id = COALESCE(public.subscriptions.workspace_id, EXCLUDED.workspace_id),
              updated_at = clock_timestamp();
    END IF;

    RETURN jsonb_build_object(
        'id', v_ws_id,
        'name', TRIM(p_name),
        'type', COALESCE(p_type, 'accounting_firm'),
        'plan_id', 'starter'
    );
END;
$$;

-- Backfill subscriptions for existing users with workspaces
INSERT INTO public.subscriptions (user_id, workspace_id, plan_id, status, preferred_model)
SELECT w.owner_user_id, w.id, 'starter', 'active', 'gemini-3.8-flash'
FROM public.workspaces w
WHERE w.owner_user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 5. ATOMIC 7-DAY PRO TRIAL ACTIVATION RPC (Once per lifetime per user)
CREATE OR REPLACE FUNCTION public.activate_pro_trial(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_sub public.subscriptions%ROWTYPE;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_trial_end TIMESTAMPTZ := clock_timestamp() + INTERVAL '7 days';
    v_ws_id UUID;
BEGIN
    v_uid := COALESCE(auth.uid(), p_user_id);
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Autentifikatsiya talab qilinadi';
    END IF;
    IF auth.uid() IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Ruxsat yo''q';
    END IF;

    SELECT id INTO v_ws_id
    FROM public.workspaces
    WHERE owner_user_id = v_uid
    ORDER BY created_at ASC
    LIMIT 1;

    INSERT INTO public.subscriptions (user_id, workspace_id, plan_id, status, preferred_model)
    VALUES (v_uid, v_ws_id, 'starter', 'active', 'gemini-3.8-flash')
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE user_id = v_uid
    FOR UPDATE;

    IF v_sub.trial_used_at IS NOT NULL THEN
        RAISE EXCEPTION '7 kunlik bepul Pro sinov muddati ushbu hisobda avval faollashtirilgan.';
    END IF;

    IF v_sub.plan_id IN ('professional', 'pro_plus') AND v_sub.status = 'active' AND (v_sub.expires_at IS NULL OR v_sub.expires_at > v_now) THEN
        RAISE EXCEPTION 'Sizda allaqachon faol pullik tarif mavjud.';
    END IF;

    UPDATE public.subscriptions
    SET
      workspace_id = COALESCE(workspace_id, v_ws_id),
      plan_id = 'professional',
      status = 'trialing',
      preferred_model = 'gemini-4-hydrogen',
      trial_started_at = v_now,
      trial_ends_at = v_trial_end,
      trial_used_at = v_now,
      expires_at = v_trial_end,
      updated_at = v_now
    WHERE user_id = v_uid
    RETURNING * INTO v_sub;

    IF v_sub.workspace_id IS NOT NULL THEN
      UPDATE public.workspaces
      SET plan_id = 'professional', updated_at = v_now
      WHERE id = v_sub.workspace_id;
    END IF;

    RETURN jsonb_build_object(
      'plan_id', v_sub.plan_id,
      'status', v_sub.status,
      'trial_started_at', v_sub.trial_started_at,
      'trial_ends_at', v_sub.trial_ends_at,
      'preferred_model', v_sub.preferred_model
    );
END;
$$;

-- 6. ATOMIC AI CREDIT RESERVE + CONSUME RPC (Prevents concurrent bursts over quota)
CREATE OR REPLACE FUNCTION public.consume_ai_credits_atomic(
    p_user_id UUID,
    p_credits INTEGER,
    p_monthly_limit INTEGER,
    p_daily_limit INTEGER,
    p_bonus_credits INTEGER DEFAULT 0,
    p_is_scan BOOLEAN DEFAULT false,
    p_tokens_est INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_month VARCHAR(7) := to_char(clock_timestamp() AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM');
    v_day VARCHAR(10) := to_char(clock_timestamp() AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD');
    v_monthly_used INTEGER := 0;
    v_daily_used INTEGER := 0;
    v_cost INTEGER := GREATEST(1, COALESCE(p_credits, 1));
    v_effective_monthly INTEGER := GREATEST(0, COALESCE(p_monthly_limit, 0)) + GREATEST(0, COALESCE(p_bonus_credits, 0));
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'user_id talab qilinadi';
    END IF;

    INSERT INTO public.ai_usage_monthly (user_id, period_month, credits_used, requests_count, scans_count, tokens_estimated)
    VALUES (p_user_id, v_month, 0, 0, 0, 0)
    ON CONFLICT (user_id, period_month) DO NOTHING;

    INSERT INTO public.ai_usage_daily (user_id, period_day, credits_used, requests_count)
    VALUES (p_user_id, v_day, 0, 0)
    ON CONFLICT (user_id, period_day) DO NOTHING;

    SELECT credits_used INTO v_monthly_used
    FROM public.ai_usage_monthly
    WHERE user_id = p_user_id AND period_month = v_month
    FOR UPDATE;

    SELECT credits_used INTO v_daily_used
    FROM public.ai_usage_daily
    WHERE user_id = p_user_id AND period_day = v_day
    FOR UPDATE;

    IF v_monthly_used + v_cost > v_effective_monthly THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'monthly_limit',
            'monthly_used', v_monthly_used,
            'monthly_limit', v_effective_monthly,
            'daily_used', v_daily_used,
            'daily_limit', p_daily_limit
        );
    END IF;

    IF v_daily_used + v_cost > p_daily_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'daily_limit',
            'monthly_used', v_monthly_used,
            'monthly_limit', v_effective_monthly,
            'daily_used', v_daily_used,
            'daily_limit', p_daily_limit
        );
    END IF;

    UPDATE public.ai_usage_monthly
    SET
      credits_used = credits_used + v_cost,
      requests_count = requests_count + 1,
      scans_count = scans_count + CASE WHEN p_is_scan THEN 1 ELSE 0 END,
      tokens_estimated = tokens_estimated + GREATEST(0, COALESCE(p_tokens_est, 0)),
      updated_at = clock_timestamp()
    WHERE user_id = p_user_id AND period_month = v_month
    RETURNING credits_used INTO v_monthly_used;

    UPDATE public.ai_usage_daily
    SET
      credits_used = credits_used + v_cost,
      requests_count = requests_count + 1,
      updated_at = clock_timestamp()
    WHERE user_id = p_user_id AND period_day = v_day
    RETURNING credits_used INTO v_daily_used;

    RETURN jsonb_build_object(
        'allowed', true,
        'monthly_used', v_monthly_used,
        'monthly_limit', v_effective_monthly,
        'daily_used', v_daily_used,
        'daily_limit', p_daily_limit
    );
END;
$$;

-- 7. ATOMIC AI CREDIT REFUND RPC (If Gemini fails / falls back offline)
CREATE OR REPLACE FUNCTION public.refund_ai_credits_atomic(
    p_user_id UUID,
    p_credits INTEGER,
    p_is_scan BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_month VARCHAR(7) := to_char(clock_timestamp() AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM');
    v_day VARCHAR(10) := to_char(clock_timestamp() AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD');
    v_cost INTEGER := GREATEST(1, COALESCE(p_credits, 1));
BEGIN
    UPDATE public.ai_usage_monthly
    SET
      credits_used = GREATEST(0, credits_used - v_cost),
      requests_count = GREATEST(0, requests_count - 1),
      scans_count = CASE WHEN p_is_scan THEN GREATEST(0, scans_count - 1) ELSE scans_count END,
      updated_at = clock_timestamp()
    WHERE user_id = p_user_id AND period_month = v_month;

    UPDATE public.ai_usage_daily
    SET
      credits_used = GREATEST(0, credits_used - v_cost),
      requests_count = GREATEST(0, requests_count - 1),
      updated_at = clock_timestamp()
    WHERE user_id = p_user_id AND period_day = v_day;
END;
$$;

-- 8. HISTORY RETENTION ENFORCER (Keep Postgres storage clean per plan cap)
CREATE OR REPLACE FUNCTION public.enforce_history_retention(
    p_user_id UUID,
    p_entity_id UUID,
    p_max_batches INTEGER,
    p_max_threads INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_entity_id IS NOT NULL AND p_max_batches > 0 THEN
        DELETE FROM public.work_batches
        WHERE id IN (
            SELECT id FROM public.work_batches
            WHERE business_entity_id = p_entity_id
            ORDER BY created_at DESC
            OFFSET p_max_batches
        );
    END IF;

    IF p_user_id IS NOT NULL AND p_max_threads > 0 THEN
        DELETE FROM public.ai_chat_threads
        WHERE id IN (
            SELECT id FROM public.ai_chat_threads
            WHERE user_id = p_user_id
            ORDER BY updated_at DESC
            OFFSET p_max_threads
        );
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.activate_pro_trial FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_pro_trial TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.consume_ai_credits_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_credits_atomic TO service_role;

REVOKE EXECUTE ON FUNCTION public.refund_ai_credits_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_credits_atomic TO service_role;

REVOKE EXECUTE ON FUNCTION public.enforce_history_retention FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_history_retention TO service_role;
