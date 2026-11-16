-- ==============================================================================
-- FIRMUS — Automatic DB Retention Enforcement Per Subscription Plan
-- Migration: 20261117020000_auto_retention_trigger.sql
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_retention_caps(p_user_id UUID)
RETURNS TABLE(max_batches INTEGER, max_threads INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan VARCHAR := 'starter';
    v_status VARCHAR := 'active';
    v_trial_ends TIMESTAMPTZ;
    v_expires TIMESTAMPTZ;
BEGIN
    SELECT s.plan_id, s.status, s.trial_ends_at, s.expires_at
    INTO v_plan, v_status, v_trial_ends, v_expires
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id;

    IF v_status = 'trialing' AND v_trial_ends IS NOT NULL AND v_trial_ends <= clock_timestamp() THEN
        v_plan := 'starter';
    ELSIF v_plan IN ('professional', 'pro_plus') AND v_expires IS NOT NULL AND v_expires <= clock_timestamp() THEN
        v_plan := 'starter';
    END IF;

    IF v_plan = 'pro_plus' THEN
        RETURN QUERY SELECT 1000, 300;
    ELSIF v_plan = 'professional' THEN
        RETURN QUERY SELECT 150, 80;
    ELSE
        RETURN QUERY SELECT 15, 10;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_trim_work_batches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_batches INTEGER := 15;
    v_max_threads INTEGER := 10;
BEGIN
    SELECT max_batches, max_threads INTO v_max_batches, v_max_threads
    FROM public.get_user_retention_caps(NEW.created_by_user_id);

    DELETE FROM public.work_batches
    WHERE id IN (
        SELECT id FROM public.work_batches
        WHERE business_entity_id = NEW.business_entity_id
        ORDER BY created_at DESC
        OFFSET v_max_batches
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_work_batch_retention ON public.work_batches;
CREATE TRIGGER trg_after_work_batch_retention
    AFTER INSERT ON public.work_batches
    FOR EACH ROW EXECUTE FUNCTION public.trg_trim_work_batches();

CREATE OR REPLACE FUNCTION public.trg_trim_ai_chat_threads()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_batches INTEGER := 15;
    v_max_threads INTEGER := 10;
BEGIN
    SELECT max_batches, max_threads INTO v_max_batches, v_max_threads
    FROM public.get_user_retention_caps(NEW.user_id);

    DELETE FROM public.ai_chat_threads
    WHERE id IN (
        SELECT id FROM public.ai_chat_threads
        WHERE user_id = NEW.user_id
        ORDER BY updated_at DESC
        OFFSET v_max_threads
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_ai_thread_retention ON public.ai_chat_threads;
CREATE TRIGGER trg_after_ai_thread_retention
    AFTER INSERT ON public.ai_chat_threads
    FOR EACH ROW EXECUTE FUNCTION public.trg_trim_ai_chat_threads();
