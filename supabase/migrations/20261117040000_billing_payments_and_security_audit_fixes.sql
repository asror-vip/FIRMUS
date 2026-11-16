-- ==============================================================================
-- FIRMUS — Billing, Payments & Security Audit Fixes
-- Migration: 20261117040000_billing_payments_and_security_audit_fixes.sql
-- ==============================================================================

-- 1. Fix 1: get_auth_user_role & business_entities_delete policy
-- Workspace owners always resolve to 'workspace_owner' before checking team_members
CREATE OR REPLACE FUNCTION public.get_auth_user_role(target_workspace_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_role VARCHAR;
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = target_workspace_id AND owner_user_id = auth.uid()
    ) THEN
        RETURN 'workspace_owner';
    END IF;

    SELECT role INTO v_role
    FROM public.team_members
    WHERE workspace_id = target_workspace_id
      AND (user_id = auth.uid() OR LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')))
      AND status = 'active'
    LIMIT 1;

    RETURN v_role;
END;
$func$;

CREATE OR REPLACE FUNCTION public.get_auth_user_role(target_workspace_id UUID, target_entity_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
    RETURN public.get_auth_user_role(target_workspace_id);
END;
$func$;

DROP POLICY IF EXISTS "business_entities_delete" ON public.business_entities;
CREATE POLICY "business_entities_delete" ON public.business_entities
FOR DELETE TO authenticated
USING (
  public.get_auth_user_role(workspace_id, id) IN ('workspace_owner', 'company_director', 'admin', 'director')
);

-- 2. Fix 2: trg_trim_work_batches retention cap lookup
-- Resolves the workspace owner's user ID so employee on Starter doesn't wipe Pro+ company's batches
CREATE OR REPLACE FUNCTION public.trg_trim_work_batches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_max_batches INTEGER := 15;
    v_max_threads INTEGER := 10;
    v_owner_id UUID;
BEGIN
    SELECT w.owner_user_id INTO v_owner_id
    FROM public.business_entities be
    JOIN public.workspaces w ON w.id = be.workspace_id
    WHERE be.id = NEW.business_entity_id;

    SELECT max_batches, max_threads INTO v_max_batches, v_max_threads
    FROM public.get_user_retention_caps(COALESCE(v_owner_id, NEW.created_by_user_id));

    DELETE FROM public.work_batches
    WHERE id IN (
        SELECT id FROM public.work_batches
        WHERE business_entity_id = NEW.business_entity_id
        ORDER BY created_at DESC
        OFFSET v_max_batches
    );
    RETURN NEW;
END;
$func$;

-- 3. Fix 3: consume_ai_credits_atomic bonus credit decrement & refund_ai_credits_atomic period params
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
AS $func$
DECLARE
    v_month VARCHAR(7) := to_char(clock_timestamp() AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM');
    v_day VARCHAR(10) := to_char(clock_timestamp() AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD');
    v_monthly_used INTEGER := 0;
    v_daily_used INTEGER := 0;
    v_cost INTEGER := GREATEST(1, COALESCE(p_credits, 1));
    v_effective_monthly INTEGER := GREATEST(0, COALESCE(p_monthly_limit, 0)) + GREATEST(0, COALESCE(p_bonus_credits, 0));
    v_bonus_drawn INTEGER := 0;
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
            'daily_limit', p_daily_limit,
            'period_month', v_month,
            'period_day', v_day
        );
    END IF;

    IF v_daily_used + v_cost > p_daily_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'daily_limit',
            'monthly_used', v_monthly_used,
            'monthly_limit', v_effective_monthly,
            'daily_used', v_daily_used,
            'daily_limit', p_daily_limit,
            'period_month', v_month,
            'period_day', v_day
        );
    END IF;

    -- Decrement bonus credits when monthly usage exceeds base monthly quota
    IF v_monthly_used + v_cost > p_monthly_limit THEN
        v_bonus_drawn := GREATEST(0, (v_monthly_used + v_cost) - GREATEST(v_monthly_used, p_monthly_limit));
        IF v_bonus_drawn > 0 THEN
            UPDATE public.subscriptions
            SET bonus_credits = GREATEST(0, COALESCE(bonus_credits, 0) - v_bonus_drawn),
                updated_at = clock_timestamp()
            WHERE user_id = p_user_id;
        END IF;
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
        'daily_limit', p_daily_limit,
        'period_month', v_month,
        'period_day', v_day
    );
END;
$func$;

DROP FUNCTION IF EXISTS public.refund_ai_credits_atomic(UUID, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.refund_ai_credits_atomic(
    p_user_id UUID,
    p_credit_cost INTEGER DEFAULT 1,
    p_period_month VARCHAR DEFAULT NULL,
    p_period_day DATE DEFAULT NULL,
    p_is_scan BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_month VARCHAR(7) := COALESCE(p_period_month, to_char(clock_timestamp() AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM'));
    v_day VARCHAR(10) := to_char(COALESCE(p_period_day, (clock_timestamp() AT TIME ZONE 'Asia/Tashkent')::date), 'YYYY-MM-DD');
    v_cost INTEGER := GREATEST(1, COALESCE(p_credit_cost, 1));
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
$func$;

-- 4. Fix 4: workspaces.plan_id privilege protection
-- Prevents authenticated users from maliciously changing workspace plan_id directly
CREATE OR REPLACE FUNCTION public.check_workspace_plan_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
    IF NEW.plan_id IS DISTINCT FROM OLD.plan_id AND current_setting('role', true) = 'authenticated' THEN
        RAISE EXCEPTION 'Tarifni toʻgʻridan-toʻgʻri oʻzgartirish taqiqlangan';
    END IF;
    RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_protect_workspace_plan_id ON public.workspaces;
CREATE TRIGGER trg_protect_workspace_plan_id
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION public.check_workspace_plan_protection();

-- 5. Feature 5: subscriptions one-time annual discount & billing_orders table + RPCs
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS annual_discount_used_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS last_order_id VARCHAR(64) NULL;

CREATE TABLE IF NOT EXISTS public.billing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(64) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NULL REFERENCES public.workspaces(id) ON DELETE SET NULL,
    plan_id VARCHAR(30) NOT NULL CHECK (plan_id IN ('professional', 'pro_plus')),
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
    regular_amount_uzs NUMERIC(15, 2) NOT NULL,
    discount_amount_uzs NUMERIC(15, 2) NOT NULL DEFAULT 0,
    final_amount_uzs NUMERIC(15, 2) NOT NULL,
    final_amount_tiyin BIGINT NOT NULL,
    is_annual_discount_applied BOOLEAN NOT NULL DEFAULT false,
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('payme', 'click', 'bank_transfer_didox')),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting_transfer', 'paid', 'failed', 'cancelled', 'refunded')),
    provider_trans_id VARCHAR(100) NULL,
    provider_state INTEGER NULL,
    provider_create_time BIGINT NULL,
    provider_perform_time BIGINT NULL,
    provider_cancel_time BIGINT NULL,
    provider_cancel_reason INTEGER NULL,
    provider_payload JSONB NULL,
    b2b_metadata JSONB NULL,
    paid_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_billing_orders_user_id ON public.billing_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_orders_order_id ON public.billing_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_billing_orders_provider_trans ON public.billing_orders(provider_trans_id);

ALTER TABLE public.billing_orders ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.billing_orders FROM anon, authenticated, public;
GRANT SELECT ON public.billing_orders TO authenticated;

DROP POLICY IF EXISTS "billing_orders_select_own" ON public.billing_orders;
CREATE POLICY "billing_orders_select_own" ON public.billing_orders
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_checkout_order(
    p_user_id UUID,
    p_plan_id VARCHAR,
    p_billing_cycle VARCHAR,
    p_payment_method VARCHAR,
    p_workspace_id UUID DEFAULT NULL,
    p_b2b_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_sub public.subscriptions%ROWTYPE;
    v_ws_id UUID := p_workspace_id;
    v_regular_amount NUMERIC(15, 2);
    v_discount_amount NUMERIC(15, 2) := 0;
    v_final_amount NUMERIC(15, 2);
    v_is_discount BOOLEAN := false;
    v_order_id VARCHAR(64);
    v_order_uuid UUID;
    v_status VARCHAR(30);
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id talab qilinadi';
    END IF;

    IF p_plan_id NOT IN ('professional', 'pro_plus') THEN
        RAISE EXCEPTION 'Notoʻgʻri tarif: %', p_plan_id;
    END IF;

    IF p_billing_cycle NOT IN ('monthly', 'annual') THEN
        RAISE EXCEPTION 'Notoʻgʻri toʻlov davri: %', p_billing_cycle;
    END IF;

    IF p_payment_method NOT IN ('payme', 'click', 'bank_transfer_didox') THEN
        RAISE EXCEPTION 'Notoʻgʻri toʻlov tizimi: %', p_payment_method;
    END IF;

    -- Ensure subscription row exists
    INSERT INTO public.subscriptions (user_id, plan_id, status)
    VALUES (p_user_id, 'starter', 'active')
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE user_id = p_user_id;

    IF v_ws_id IS NULL THEN
        SELECT id INTO v_ws_id
        FROM public.workspaces
        WHERE owner_user_id = p_user_id
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    IF p_plan_id = 'professional' THEN
        IF p_billing_cycle = 'annual' THEN
            v_regular_amount := 1188000;
            IF v_sub.annual_discount_used_at IS NULL THEN
                v_discount_amount := 240000;
                v_final_amount := 948000;
                v_is_discount := true;
            ELSE
                v_discount_amount := 0;
                v_final_amount := 1188000;
                v_is_discount := false;
            END IF;
        ELSE
            v_regular_amount := 99000;
            v_discount_amount := 0;
            v_final_amount := 99000;
            v_is_discount := false;
        END IF;
    ELSIF p_plan_id = 'pro_plus' THEN
        IF p_billing_cycle = 'annual' THEN
            v_regular_amount := 2988000;
            IF v_sub.annual_discount_used_at IS NULL THEN
                v_discount_amount := 600000;
                v_final_amount := 2388000;
                v_is_discount := true;
            ELSE
                v_discount_amount := 0;
                v_final_amount := 2988000;
                v_is_discount := false;
            END IF;
        ELSE
            v_regular_amount := 249000;
            v_discount_amount := 0;
            v_final_amount := 249000;
            v_is_discount := false;
        END IF;
    END IF;

    v_order_id := 'FRM-' || to_char(clock_timestamp(), 'YYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    v_status := CASE WHEN p_payment_method = 'bank_transfer_didox' THEN 'waiting_transfer' ELSE 'pending' END;

    INSERT INTO public.billing_orders (
        order_id,
        user_id,
        workspace_id,
        plan_id,
        billing_cycle,
        regular_amount_uzs,
        discount_amount_uzs,
        final_amount_uzs,
        final_amount_tiyin,
        is_annual_discount_applied,
        payment_method,
        status,
        b2b_metadata
    ) VALUES (
        v_order_id,
        p_user_id,
        v_ws_id,
        p_plan_id,
        p_billing_cycle,
        v_regular_amount,
        v_discount_amount,
        v_final_amount,
        (v_final_amount * 100)::BIGINT,
        v_is_discount,
        p_payment_method,
        v_status,
        p_b2b_metadata
    )
    RETURNING id INTO v_order_uuid;

    RETURN jsonb_build_object(
        'order_uuid', v_order_uuid,
        'order_id', v_order_id,
        'plan_id', p_plan_id,
        'billing_cycle', p_billing_cycle,
        'payment_method', p_payment_method,
        'regular_amount_uzs', v_regular_amount,
        'discount_amount_uzs', v_discount_amount,
        'final_amount_uzs', v_final_amount,
        'final_amount_tiyin', (v_final_amount * 100)::BIGINT,
        'is_discount_applied', v_is_discount,
        'status', v_status
    );
END;
$func$;

CREATE OR REPLACE FUNCTION public.complete_billing_order_atomic(
    p_order_id VARCHAR,
    p_provider_trans_id VARCHAR,
    p_provider_payload JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_order public.billing_orders%ROWTYPE;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF p_order_id IS NULL THEN
        RAISE EXCEPTION 'p_order_id talab qilinadi';
    END IF;

    SELECT * INTO v_order
    FROM public.billing_orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order topilmadi: %', p_order_id;
    END IF;

    IF v_order.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_paid', true,
            'order_id', v_order.order_id,
            'plan_id', v_order.plan_id
        );
    END IF;

    v_expires_at := v_now + (CASE WHEN v_order.billing_cycle = 'annual' THEN INTERVAL '1 year' ELSE INTERVAL '30 days' END);

    UPDATE public.billing_orders
    SET status = 'paid',
        paid_at = v_now,
        provider_state = 2,
        provider_perform_time = (extract(epoch from v_now) * 1000)::BIGINT,
        provider_trans_id = COALESCE(p_provider_trans_id, provider_trans_id),
        provider_payload = COALESCE(p_provider_payload, provider_payload),
        updated_at = v_now
    WHERE id = v_order.id;

    UPDATE public.subscriptions
    SET plan_id = v_order.plan_id,
        status = 'active',
        billing_cycle = v_order.billing_cycle,
        started_at = v_now,
        expires_at = v_expires_at,
        preferred_model = 'gemini-4-hydrogen',
        payment_provider = v_order.payment_method,
        last_order_id = v_order.order_id,
        annual_discount_used_at = CASE 
            WHEN v_order.is_annual_discount_applied THEN COALESCE(annual_discount_used_at, v_now)
            ELSE annual_discount_used_at 
        END,
        updated_at = v_now
    WHERE user_id = v_order.user_id;

    IF v_order.workspace_id IS NOT NULL THEN
        UPDATE public.workspaces
        SET plan_id = v_order.plan_id,
            updated_at = v_now
        WHERE id = v_order.workspace_id;
    ELSE
        UPDATE public.workspaces
        SET plan_id = v_order.plan_id,
            updated_at = v_now
        WHERE owner_user_id = v_order.user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.order_id,
        'plan_id', v_order.plan_id,
        'user_id', v_order.user_id,
        'billing_cycle', v_order.billing_cycle,
        'paid_at', v_now,
        'expires_at', v_expires_at
    );
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.create_checkout_order(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, JSONB) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.complete_billing_order_atomic(VARCHAR, VARCHAR, JSONB) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.complete_billing_order_atomic(VARCHAR, VARCHAR, JSONB) TO service_role;
