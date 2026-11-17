-- ==============================================================================
-- FIRMUS — Critical RLS, Auth Trigger, Privilege & Payment Refund Security
-- Migration: 20261117060000_critical_rls_and_payment_security.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CRITICAL #3: Revoke EXECUTE on ALL public.refund_ai_credits_atomic signatures
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.refund_ai_credits_atomic(UUID, INTEGER, VARCHAR, DATE, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ai_credits_atomic(UUID, INTEGER, VARCHAR, DATE, BOOLEAN) TO service_role;

DO $$
DECLARE
    fn_sig TEXT;
BEGIN
    FOR fn_sig IN
        SELECT oid::regprocedure::text
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND proname = 'refund_ai_credits_atomic'
    LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated;', fn_sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role;', fn_sig);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. HIGH #17: Require email_verified in JWT when matching team_members by email
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_workspaces()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM public.team_members
  WHERE (
    user_id = auth.uid()
    OR (
      NULLIF(LOWER(COALESCE(auth.jwt() ->> 'email', '')), '') IS NOT NULL
      AND LOWER(email) = LOWER(auth.jwt() ->> 'email')
      AND (
        COALESCE((auth.jwt() ->> 'email_verified')::boolean, false) IS TRUE
        OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, false) IS TRUE
      )
    )
  )
    AND status = 'active'
  UNION
  SELECT id
  FROM public.workspaces
  WHERE owner_user_id = auth.uid();
$$;

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
      AND (
        user_id = auth.uid()
        OR (
          NULLIF(LOWER(COALESCE(auth.jwt() ->> 'email', '')), '') IS NOT NULL
          AND LOWER(email) = LOWER(auth.jwt() ->> 'email')
          AND (
            COALESCE((auth.jwt() ->> 'email_verified')::boolean, false) IS TRUE
            OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, false) IS TRUE
          )
        )
      )
      AND status = 'active'
    LIMIT 1;

    RETURN v_role;
END;
$func$;

-- ------------------------------------------------------------------------------
-- 3. CRITICAL #4: Fix team_members_update cross-tenant takeover & privilege escalation
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
CREATE POLICY "team_members_update" ON public.team_members
FOR UPDATE TO authenticated
USING (public.get_auth_user_role(workspace_id) IN ('workspace_owner', 'company_director', 'admin', 'director'))
WITH CHECK (public.get_auth_user_role(workspace_id) IN ('workspace_owner', 'company_director', 'admin', 'director'));

CREATE OR REPLACE FUNCTION public.protect_team_member_privilege()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_caller_role VARCHAR;
BEGIN
    IF current_setting('role', true) = 'authenticated' THEN
        v_caller_role := public.get_auth_user_role(OLD.workspace_id);

        IF COALESCE(v_caller_role, '') <> 'workspace_owner' THEN
            IF NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN
                RAISE EXCEPTION 'Ishchi maydonni (workspace_id) oʻzgartirish taqiqlangan';
            END IF;

            IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
                RAISE EXCEPTION 'Foydalanuvchi bogʻlanishini (user_id) oʻzgartirish taqiqlangan';
            END IF;

            IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role = 'workspace_owner' THEN
                RAISE EXCEPTION 'Rolni workspace_owner darajasiga koʻtarish taqiqlangan';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_protect_team_member_privilege ON public.team_members;
CREATE TRIGGER trg_protect_team_member_privilege
    BEFORE UPDATE ON public.team_members
    FOR EACH ROW EXECUTE FUNCTION public.protect_team_member_privilege();

-- ------------------------------------------------------------------------------
-- 4. CRITICAL #5: Fix handle_new_auth_user() Tenant #1 auto-join & role escalation
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Link only pre-invited team_members rows (user_id IS NULL) after email verification.
  -- Never read role from raw_user_meta_data and never auto-join uninvited users to any workspace.
  IF NEW.email_confirmed_at IS NOT NULL AND NEW.email IS NOT NULL THEN
    UPDATE public.team_members
    SET user_id = NEW.id
    WHERE user_id IS NULL
      AND LOWER(email) = LOWER(NEW.email);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ------------------------------------------------------------------------------
-- 5. HIGH #7: Fix create_checkout_order workspace IDOR
-- ------------------------------------------------------------------------------
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
    v_now TIMESTAMPTZ := clock_timestamp();
    v_has_active_paid BOOLEAN := false;
    v_target_rank INTEGER := 0;
    v_current_rank INTEGER := 0;
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

    -- Verify workspace ownership if caller explicitly supplied p_workspace_id
    IF p_workspace_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = p_workspace_id AND owner_user_id = p_user_id) THEN
            RAISE EXCEPTION 'Ushbu ishchi maydonga ruxsat yoʻq';
        END IF;
    END IF;

    -- Ensure subscription row exists
    INSERT INTO public.subscriptions (user_id, plan_id, status)
    VALUES (p_user_id, 'starter', 'active')
    ON CONFLICT (user_id) DO NOTHING;

    -- Lock and inspect subscription row
    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Plan ranks: starter = 0, professional = 1, pro_plus = 2
    v_target_rank := CASE WHEN p_plan_id = 'pro_plus' THEN 2 WHEN p_plan_id = 'professional' THEN 1 ELSE 0 END;
    v_current_rank := CASE WHEN v_sub.plan_id = 'pro_plus' THEN 2 WHEN v_sub.plan_id = 'professional' THEN 1 ELSE 0 END;

    v_has_active_paid := (v_sub.status = 'active' AND v_sub.plan_id IN ('professional', 'pro_plus') AND v_sub.expires_at IS NOT NULL AND v_sub.expires_at > v_now);

    IF v_has_active_paid THEN
        -- Prevent downgrade while active higher tier is valid
        IF v_target_rank < v_current_rank THEN
            RAISE EXCEPTION 'Sizda hozir yuqoriroq tarif faol. Muddat tugagandan keyin tarifni pasaytirishingiz mumkin.';
        END IF;

        -- Prevent duplicate payment for identical active plan unless expiring within 5 days
        IF p_plan_id = v_sub.plan_id AND v_sub.expires_at > v_now + INTERVAL '5 days' THEN
            RAISE EXCEPTION 'Ushbu tarif allaqachon toʻlangan va hozir faol! Qayta toʻlov talab qilinmaydi.';
        END IF;
    END IF;

    -- Automatically invalidate/cancel all previous unpaid orders for this user when switching payment methods or creating new checkout
    UPDATE public.billing_orders
    SET status = 'cancelled',
        updated_at = v_now
    WHERE user_id = p_user_id
      AND status IN ('pending', 'waiting_transfer');

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

    v_order_id := 'FRM-' || to_char(v_now, 'YYMMDD') || '-' || upper(substr(md5(random()::text || v_now::text), 1, 8));
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

REVOKE EXECUTE ON FUNCTION public.create_checkout_order(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, JSONB) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, JSONB) TO service_role;

-- ------------------------------------------------------------------------------
-- 6. CRITICAL #6: refund_billing_order_atomic (Payme CancelTransaction state=2)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_billing_order_atomic(
    p_order_id VARCHAR,
    p_cancel_reason INTEGER DEFAULT NULL,
    p_cancel_time BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_order public.billing_orders%ROWTYPE;
    v_sub public.subscriptions%ROWTYPE;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_cancel_time BIGINT := COALESCE(p_cancel_time, (extract(epoch from v_now) * 1000)::BIGINT);
    v_cancel_reason INTEGER := COALESCE(p_cancel_reason, 5);
    v_has_newer_paid BOOLEAN := false;
    v_downgraded BOOLEAN := false;
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

    IF v_order.status = 'refunded' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_refunded', true,
            'order_id', v_order.order_id
        );
    END IF;

    IF v_order.status <> 'paid' THEN
        RAISE EXCEPTION 'Faqat toʻlangan buyurtmani qaytarish mumkin (%)', v_order.status USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.billing_orders
    SET status = 'refunded',
        provider_state = -2,
        provider_cancel_reason = v_cancel_reason,
        provider_cancel_time = v_cancel_time,
        updated_at = v_now
    WHERE id = v_order.id;

    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE user_id = v_order.user_id
    FOR UPDATE;

    IF FOUND THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.billing_orders
            WHERE user_id = v_order.user_id
              AND id <> v_order.id
              AND status = 'paid'
              AND COALESCE(paid_at, created_at) > COALESCE(v_order.paid_at, v_order.created_at)
        ) INTO v_has_newer_paid;

        IF v_sub.last_order_id = v_order.order_id OR NOT v_has_newer_paid THEN
            UPDATE public.subscriptions
            SET plan_id = 'starter',
                status = 'cancelled',
                preferred_model = 'gemini-3.8-flash',
                expires_at = v_now,
                annual_discount_used_at = CASE
                    WHEN v_order.is_annual_discount_applied THEN NULL
                    ELSE annual_discount_used_at
                END,
                updated_at = v_now
            WHERE user_id = v_order.user_id;

            UPDATE public.workspaces
            SET plan_id = 'starter',
                updated_at = v_now
            WHERE owner_user_id = v_order.user_id;

            v_downgraded := true;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'already_refunded', false,
        'order_id', v_order.order_id,
        'user_id', v_order.user_id,
        'downgraded', v_downgraded,
        'provider_state', -2,
        'provider_cancel_reason', v_cancel_reason,
        'provider_cancel_time', v_cancel_time
    );
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.refund_billing_order_atomic(VARCHAR, INTEGER, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_billing_order_atomic(VARCHAR, INTEGER, BIGINT) TO service_role;
