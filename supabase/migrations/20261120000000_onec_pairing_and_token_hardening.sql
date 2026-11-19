-- ============================================================================
-- FIRMUS Band 1: 1C Pairing Hardening, Lockout & Integration Token Expiration
-- Migration: 20261120000000_onec_pairing_and_token_hardening.sql
-- ============================================================================
-- 1. Adds pairing brute-force protection columns (failed attempts + lockout)
--    to public.integration_connections.
-- 2. Adds explicit token expiration (token_expires_at) and revocation timestamp
--    (token_revoked_at) for 1C EPF Bearer tokens.
-- 3. Adds an atomic RPC `record_1c_pair_failure` to increment failed attempts
--    and lock pending pairing sessions for 15 minutes after 5 failed tries.

ALTER TABLE public.integration_connections
  ADD COLUMN IF NOT EXISTS pairing_failed_attempts INTEGER NOT NULL DEFAULT 0
    CHECK (pairing_failed_attempts >= 0),
  ADD COLUMN IF NOT EXISTS pairing_locked_until TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS token_revoked_at TIMESTAMPTZ NULL;

-- Atomic failed-attempt counter & lockout for a specific pending pairing connection
CREATE OR REPLACE FUNCTION public.record_1c_pair_failure(
  p_connection_id UUID,
  p_max_attempts INTEGER DEFAULT 5,
  p_lock_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts INTEGER;
  v_locked_until TIMESTAMPTZ;
BEGIN
  UPDATE public.integration_connections
  SET
    pairing_failed_attempts = COALESCE(pairing_failed_attempts, 0) + 1,
    pairing_locked_until = CASE
      WHEN COALESCE(pairing_failed_attempts, 0) + 1 >= p_max_attempts
        THEN NOW() + make_interval(mins => p_lock_minutes)
      ELSE pairing_locked_until
    END,
    updated_at = NOW()
  WHERE id = p_connection_id
    AND provider = 'onec_epf'
    AND status = 'pending_pair'
  RETURNING pairing_failed_attempts, pairing_locked_until
  INTO v_attempts, v_locked_until;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', FALSE, 'attempts', 0, 'locked', FALSE);
  END IF;

  RETURN jsonb_build_object(
    'found', TRUE,
    'attempts', v_attempts,
    'locked', (v_locked_until IS NOT NULL AND v_locked_until > NOW()),
    'locked_until', v_locked_until
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_1c_pair_failure(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_1c_pair_failure(UUID, INTEGER, INTEGER) TO service_role;

-- Confirm RLS remains strictly enabled on integration_connections and api_rate_limits
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
