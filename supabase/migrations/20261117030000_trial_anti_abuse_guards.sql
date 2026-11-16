-- ==============================================================================
-- FIRMUS — Multi-Layer Anti-Abuse Trial Guards (Email, Device, IP Hash)
-- Migration: 20261117030000_trial_anti_abuse_guards.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.trial_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canonical_email_hash VARCHAR(64) NOT NULL,
  device_hash VARCHAR(64) NULL,
  ip_hash VARCHAR(64) NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_trial_claims_email_hash
  ON public.trial_claims(canonical_email_hash);

CREATE INDEX IF NOT EXISTS idx_trial_claims_device_hash
  ON public.trial_claims(device_hash, claimed_at DESC)
  WHERE device_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trial_claims_ip_hash
  ON public.trial_claims(ip_hash, claimed_at DESC)
  WHERE ip_hash IS NOT NULL;

ALTER TABLE public.trial_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trial_claims FROM anon, PUBLIC, authenticated;

-- Upgrade activate_pro_trial to check canonical email, device hash, and IP window
CREATE OR REPLACE FUNCTION public.activate_pro_trial(
    p_user_id UUID DEFAULT NULL,
    p_canonical_email_hash VARCHAR DEFAULT NULL,
    p_device_hash VARCHAR DEFAULT NULL,
    p_ip_hash VARCHAR DEFAULT NULL
)
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
    v_email_used BOOLEAN := false;
    v_device_used BOOLEAN := false;
    v_ip_count INTEGER := 0;
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

    -- 1. Check canonical email hash (blocks Gmail +alias / dot tricks across accounts)
    IF p_canonical_email_hash IS NOT NULL AND LENGTH(p_canonical_email_hash) > 10 THEN
        SELECT EXISTS (
            SELECT 1 FROM public.trial_claims
            WHERE canonical_email_hash = p_canonical_email_hash
        ) INTO v_email_used;

        IF v_email_used THEN
            RAISE EXCEPTION 'Ushbu elektron pochta manzili bilan bepul sinov avval ishlatilgan.';
        END IF;
    END IF;

    -- 2. Check browser/device hash (blocks creating multiple fresh accounts on same device within 90 days)
    IF p_device_hash IS NOT NULL AND LENGTH(p_device_hash) > 10 THEN
        SELECT EXISTS (
            SELECT 1 FROM public.trial_claims
            WHERE device_hash = p_device_hash
              AND claimed_at > v_now - INTERVAL '90 days'
        ) INTO v_device_used;

        IF v_device_used THEN
            RAISE EXCEPTION 'Ushbu qurilmada bepul sinov muddati avval faollashtirilgan.';
        END IF;
    END IF;

    -- 3. Check IP hash burst (max 2 trials per 30 days from the same IP for office fairness)
    IF p_ip_hash IS NOT NULL AND LENGTH(p_ip_hash) > 10 THEN
        SELECT COUNT(*) INTO v_ip_count
        FROM public.trial_claims
        WHERE ip_hash = p_ip_hash
          AND claimed_at > v_now - INTERVAL '30 days';

        IF v_ip_count >= 2 THEN
            RAISE EXCEPTION 'Ushbu tarmoqdan (IP) bepul sinov limiti tugagan. Pro tarifiga oʻtishingiz mumkin.';
        END IF;
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

    INSERT INTO public.trial_claims (user_id, canonical_email_hash, device_hash, ip_hash, claimed_at)
    VALUES (
      v_uid,
      COALESCE(p_canonical_email_hash, md5(v_uid::text)),
      NULLIF(TRIM(COALESCE(p_device_hash, '')), ''),
      NULLIF(TRIM(COALESCE(p_ip_hash, '')), ''),
      v_now
    );

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

-- Restrict direct authenticated calls to old 1-arg signature and route through server API
DROP FUNCTION IF EXISTS public.activate_pro_trial(UUID);
REVOKE EXECUTE ON FUNCTION public.activate_pro_trial(UUID, VARCHAR, VARCHAR, VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_pro_trial(UUID, VARCHAR, VARCHAR, VARCHAR) TO service_role;
