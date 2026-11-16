-- ==============================================================================
-- FIRMUS — PII-Safe AI Chat Threads History (Per-User & Per-Entity)
-- Migration: 20261117000000_ai_chat_threads.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ai_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_entity_id UUID NULL REFERENCES public.business_entities(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL DEFAULT 'Yangi suhbat',
  messages_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_user_entity_updated
  ON public.ai_chat_threads(user_id, business_entity_id, updated_at DESC);

ALTER TABLE public.ai_chat_threads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_chat_threads FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_threads TO authenticated;

DROP POLICY IF EXISTS "ai_chat_threads_select" ON public.ai_chat_threads;
CREATE POLICY "ai_chat_threads_select" ON public.ai_chat_threads
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  AND (
    business_entity_id IS NULL
    OR business_entity_id IN (SELECT public.get_auth_user_entities())
  )
);

DROP POLICY IF EXISTS "ai_chat_threads_insert" ON public.ai_chat_threads;
CREATE POLICY "ai_chat_threads_insert" ON public.ai_chat_threads
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    business_entity_id IS NULL
    OR business_entity_id IN (SELECT public.get_auth_user_entities())
  )
);

DROP POLICY IF EXISTS "ai_chat_threads_update" ON public.ai_chat_threads;
CREATE POLICY "ai_chat_threads_update" ON public.ai_chat_threads
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND (
    business_entity_id IS NULL
    OR business_entity_id IN (SELECT public.get_auth_user_entities())
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    business_entity_id IS NULL
    OR business_entity_id IN (SELECT public.get_auth_user_entities())
  )
);

DROP POLICY IF EXISTS "ai_chat_threads_delete" ON public.ai_chat_threads;
CREATE POLICY "ai_chat_threads_delete" ON public.ai_chat_threads
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND (
    business_entity_id IS NULL
    OR business_entity_id IN (SELECT public.get_auth_user_entities())
  )
);
