-- ============================================================================
-- FIRMUS Band 2: Payme CreateTransaction Atomic Hardening & Unique Guard
-- Migration: 20261120010000_payme_create_transaction_hardening.sql
-- ============================================================================
-- 1. Enforces database-level uniqueness of (payment_method, provider_trans_id)
--    so two different orders can NEVER claim the same Payme/Click transaction ID.
-- 2. Adds conditional `AND provider_trans_id IS NULL` guard inside
--    `claim_payment_provider_transaction` + catches `unique_violation` -> 'conflict'.
-- 3. Rejects `already_same` if `provider_state <> 1` (e.g. already cancelled).
-- 4. Preserves strict `service_role`-only EXECUTE privilege.

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_orders_provider_trans_id
  ON public.billing_orders (payment_method, provider_trans_id)
  WHERE provider_trans_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.claim_payment_provider_transaction(
  p_order_id VARCHAR,
  p_provider_trans_id VARCHAR,
  p_payment_method VARCHAR,
  p_provider_create_time BIGINT DEFAULT NULL,
  p_provider_payload JSONB DEFAULT '{}'::jsonb,
  p_timeout_ms BIGINT DEFAULT 43200000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.billing_orders%ROWTYPE;
  v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint;
BEGIN
  SELECT * INTO v_order
  FROM public.billing_orders
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found');
  END IF;

  IF v_order.payment_method <> p_payment_method THEN
    RETURN jsonb_build_object(
      'outcome', 'wrong_method',
      'order_status', v_order.status
    );
  END IF;

  IF v_order.status = 'paid' THEN
    RETURN jsonb_build_object(
      'outcome', 'already_paid',
      'order_id', v_order.order_id
    );
  END IF;

  IF v_order.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'outcome', 'invalid_status',
      'order_status', v_order.status
    );
  END IF;

  IF v_order.provider_trans_id IS NOT NULL THEN
    IF v_order.provider_trans_id = p_provider_trans_id THEN
      IF v_order.payment_method = 'payme' AND COALESCE(v_order.provider_state, 0) <> 1 THEN
        RETURN jsonb_build_object(
          'outcome', 'invalid_status',
          'provider_state', v_order.provider_state
        );
      END IF;

      IF v_order.payment_method = 'payme'
         AND v_order.provider_state = 1
         AND p_timeout_ms > 0
         AND (v_now_ms - COALESCE(v_order.provider_create_time, 0)) > p_timeout_ms THEN
        UPDATE public.billing_orders
        SET status = 'cancelled',
            provider_state = -1,
            provider_cancel_reason = 4,
            provider_cancel_time = v_now_ms,
            updated_at = clock_timestamp()
        WHERE id = v_order.id;

        RETURN jsonb_build_object('outcome', 'timed_out');
      ELSE
        RETURN jsonb_build_object(
          'outcome', 'already_same',
          'provider_state', v_order.provider_state,
          'provider_create_time', v_order.provider_create_time,
          'provider_trans_id', v_order.provider_trans_id,
          'order_uuid', v_order.id
        );
      END IF;
    ELSE
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'existing_trans_id', v_order.provider_trans_id
      );
    END IF;
  END IF;

  BEGIN
    UPDATE public.billing_orders
    SET provider_trans_id = p_provider_trans_id,
        provider_create_time = COALESCE(p_provider_create_time, v_now_ms),
        provider_state = 1,
        provider_payload = COALESCE(p_provider_payload, '{}'::jsonb),
        updated_at = clock_timestamp()
    WHERE id = v_order.id
      AND provider_trans_id IS NULL
      AND status = 'pending'
    RETURNING * INTO v_order;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'reason', 'concurrent_claim'
      );
    END IF;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object(
        'outcome', 'conflict',
        'reason', 'duplicate_provider_trans_id'
      );
  END;

  RETURN jsonb_build_object(
    'outcome', 'claimed',
    'provider_state', v_order.provider_state,
    'provider_create_time', v_order.provider_create_time,
    'provider_trans_id', v_order.provider_trans_id,
    'order_uuid', v_order.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_payment_provider_transaction(VARCHAR, VARCHAR, VARCHAR, BIGINT, JSONB, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_provider_transaction(VARCHAR, VARCHAR, VARCHAR, BIGINT, JSONB, BIGINT) TO service_role;
