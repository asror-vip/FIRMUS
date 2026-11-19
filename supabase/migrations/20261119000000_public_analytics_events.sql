-- ============================================================================
-- FIRMUS Stage 2: Privacy-First Anonymous Public Analytics Events
-- ============================================================================
-- Tracks ONLY 4 non-PII product funnel events:
--   1. page_view
--   2. tool_used
--   3. register_clicked
--   4. registered
-- No emails, names, IP addresses, amounts, or file contents are stored.
-- RLS is enabled with NO public SELECT/INSERT/UPDATE/DELETE policies;
-- inserts are strictly validated and written server-side via /api/events.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL CHECK (
    event_name IN ('page_view', 'tool_used', 'register_clicked', 'registered')
  ),
  page_path TEXT NOT NULL CHECK (char_length(page_path) <= 120),
  tool_name TEXT CHECK (tool_name IS NULL OR char_length(tool_name) <= 64),
  locale TEXT CHECK (locale IS NULL OR locale IN ('uz', 'ru', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created
  ON public.analytics_events (event_name, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.analytics_events FROM anon, authenticated;
GRANT INSERT, SELECT ON TABLE public.analytics_events TO service_role;
