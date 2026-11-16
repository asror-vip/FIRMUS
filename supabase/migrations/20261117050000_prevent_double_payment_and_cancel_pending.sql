-- ==============================================================================
-- FIRMUS — Prevent Double Payments & Stale Pending Order Invalidation
-- Migration: 20261117050000_prevent_double_payment_and_cancel_pending.sql
-- ==============================================================================

-- 1. Replace create_checkout_order with plan hierarchy & double-payment guards + auto-invalidation of previous unpaid orders
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

-- 2. Replace complete_billing_order_atomic with strict status check & duration extension logic
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
    v_sub public.subscriptions%ROWTYPE;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_duration INTERVAL;
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

    -- Return idempotent success if already paid
    IF v_order.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_paid', true,
            'order_id', v_order.order_id,
            'plan_id', v_order.plan_id
        );
    END IF;

    -- Block completion of cancelled or expired orders (prevent duplicate/stale payments)
    IF v_order.status NOT IN ('pending', 'waiting_transfer') THEN
        RAISE EXCEPTION 'Buyurtma bekor qilingan yoki muddati oʻtgan (%)', v_order.status USING ERRCODE = 'P0001';
    END IF;

    -- Lock user's subscription
    SELECT * INTO v_sub
    FROM public.subscriptions
    WHERE user_id = v_order.user_id
    FOR UPDATE;

    v_duration := CASE WHEN v_order.billing_cycle = 'annual' THEN INTERVAL '1 year' ELSE INTERVAL '30 days' END;

    -- If user already has an active period on the same plan, extend from current expiry date
    IF v_sub.status = 'active' AND v_sub.plan_id = v_order.plan_id AND v_sub.expires_at IS NOT NULL AND v_sub.expires_at > v_now THEN
        v_expires_at := v_sub.expires_at + v_duration;
    ELSE
        v_expires_at := v_now + v_duration;
    END IF;

    -- Mark this order as paid
    UPDATE public.billing_orders
    SET status = 'paid',
        paid_at = v_now,
        provider_state = 2,
        provider_perform_time = (extract(epoch from v_now) * 1000)::BIGINT,
        provider_trans_id = COALESCE(p_provider_trans_id, provider_trans_id),
        provider_payload = COALESCE(p_provider_payload, provider_payload),
        updated_at = v_now
    WHERE id = v_order.id;

    -- Invalidate any other lingering pending/waiting_transfer orders for this user
    UPDATE public.billing_orders
    SET status = 'cancelled',
        updated_at = v_now
    WHERE user_id = v_order.user_id
      AND id <> v_order.id
      AND status IN ('pending', 'waiting_transfer');

    -- Update subscription
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

    -- Synchronize workspace
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

-- 3. Create cancel_checkout_order RPC
CREATE OR REPLACE FUNCTION public.cancel_checkout_order(
    p_user_id UUID,
    p_order_id VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_cancelled BOOLEAN := false;
BEGIN
    IF p_user_id IS NULL OR p_order_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id va p_order_id talab qilinadi';
    END IF;

    UPDATE public.billing_orders
    SET status = 'cancelled',
        updated_at = clock_timestamp()
    WHERE user_id = p_user_id
      AND order_id = p_order_id
      AND status IN ('pending', 'waiting_transfer');

    IF FOUND THEN
        v_cancelled := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'cancelled', v_cancelled
    );
END;
$func$;

-- Grants & Revokes
REVOKE EXECUTE ON FUNCTION public.create_checkout_order(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, JSONB) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(UUID, VARCHAR, VARCHAR, VARCHAR, UUID, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.complete_billing_order_atomic(VARCHAR, VARCHAR, JSONB) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.complete_billing_order_atomic(VARCHAR, VARCHAR, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_checkout_order(UUID, VARCHAR) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.cancel_checkout_order(UUID, VARCHAR) TO service_role;
