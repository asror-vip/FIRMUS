-- ============================================================================
-- FIRMUS Stage 5: 1C, Bank & Didox Self-Learning Document Schema Blueprints
-- Migration: 20261119020000_onec_learned_schemas.sql
-- ============================================================================
-- Stores ONLY anonymized structural column blueprints (header row index,
-- normalized header signature, column names, and detected column map).
-- ZERO PII, ZERO transaction amounts, ZERO STIRs, and ZERO company names
-- are ever stored in this table.
-- Supports all 3 document sources requested by accountants:
--   - 'onec'  (1C 8.3 Venkon, 1C 8.3 Standart, 1C 8.2, 1UZ, etc. — Import & Export)
--   - 'bank'  (Uzbekistan bank statements — Import column learning)
--   - 'didox' (Didox.uz / Soliq EHF invoice registries — Import column learning)

CREATE TABLE IF NOT EXISTS public.onec_learned_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_entity_id UUID NOT NULL REFERENCES public.business_entities(id) ON DELETE CASCADE,
  created_by_user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  source_type VARCHAR(24) NOT NULL DEFAULT 'onec'
    CHECK (source_type IN ('onec', 'bank', 'didox')),
  profile_id VARCHAR(64) NOT NULL,
  version_label VARCHAR(120) NOT NULL,
  file_format VARCHAR(24) NOT NULL DEFAULT 'xlsx'
    CHECK (file_format IN ('xlsx', 'xls', 'csv', 'txt', 'xml')),
  header_row_index INTEGER NOT NULL DEFAULT 0 CHECK (header_row_index >= 0 AND header_row_index <= 50),
  header_signature VARCHAR(240) NOT NULL,
  column_headers JSONB NOT NULL DEFAULT '[]'::jsonb,
  detected_column_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_count INTEGER NOT NULL DEFAULT 1 CHECK (sample_count >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_onec_learned_schemas_entity_sig UNIQUE (business_entity_id, source_type, header_signature)
);

CREATE INDEX IF NOT EXISTS idx_onec_learned_schemas_entity_source
  ON public.onec_learned_schemas (business_entity_id, source_type, updated_at DESC);

ALTER TABLE public.onec_learned_schemas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.onec_learned_schemas FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onec_learned_schemas TO authenticated;

DROP POLICY IF EXISTS "onec_learned_schemas_select" ON public.onec_learned_schemas;
CREATE POLICY "onec_learned_schemas_select" ON public.onec_learned_schemas
FOR SELECT TO authenticated
USING (business_entity_id IN (SELECT public.get_auth_user_entities()));

DROP POLICY IF EXISTS "onec_learned_schemas_insert" ON public.onec_learned_schemas;
CREATE POLICY "onec_learned_schemas_insert" ON public.onec_learned_schemas
FOR INSERT TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND business_entity_id IN (SELECT public.get_auth_user_entities())
);

DROP POLICY IF EXISTS "onec_learned_schemas_update" ON public.onec_learned_schemas;
CREATE POLICY "onec_learned_schemas_update" ON public.onec_learned_schemas
FOR UPDATE TO authenticated
USING (business_entity_id IN (SELECT public.get_auth_user_entities()))
WITH CHECK (business_entity_id IN (SELECT public.get_auth_user_entities()));

DROP POLICY IF EXISTS "onec_learned_schemas_delete" ON public.onec_learned_schemas;
CREATE POLICY "onec_learned_schemas_delete" ON public.onec_learned_schemas
FOR DELETE TO authenticated
USING (business_entity_id IN (SELECT public.get_auth_user_entities()));
