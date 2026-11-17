-- ==============================================================================
-- FIRMUS — Phase 1: Security Foundation, Multi-Tenant RLS & RBAC
-- Migration: 20261116000000_security_foundation_rls.sql
-- ==============================================================================

-- 1. Alter team_members to cleanly associate with auth.users
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members(LOWER(email));

-- 2. Security Definer Helper Functions for RLS
-- A. Workspaces accessible to the authenticated user
CREATE OR REPLACE FUNCTION public.get_auth_user_workspaces()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.team_members 
  WHERE (user_id = auth.uid() OR LOWER(email) = LOWER(auth.jwt() ->> 'email'))
    AND status = 'active'
  UNION
  SELECT id FROM public.workspaces 
  WHERE owner_user_id = auth.uid();
$$;

-- B. Business entities accessible to the authenticated user
CREATE OR REPLACE FUNCTION public.get_auth_user_entities()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.business_entities 
  WHERE workspace_id IN (SELECT public.get_auth_user_workspaces());
$$;

-- C. User role in a given workspace
CREATE OR REPLACE FUNCTION public.get_auth_user_role(target_workspace_id UUID)
RETURNS VARCHAR
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.team_members 
  WHERE workspace_id = target_workspace_id 
    AND (user_id = auth.uid() OR LOWER(email) = LOWER(auth.jwt() ->> 'email'))
    AND status = 'active'
  LIMIT 1;
$$;

-- 3. Drop all insecure "public_all_*" policies created during prototyping
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "public_all_%s" ON public.%I;', tbl, tbl);
    END LOOP;
END $$;

-- Revoke dangerous global write permissions from anon role
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon; -- RLS will restrict rows to empty set

-- 4. WORKSPACES RLS
DROP POLICY IF EXISTS "workspaces_select" ON public.workspaces;
CREATE POLICY "workspaces_select" ON public.workspaces
FOR SELECT TO authenticated
USING (id IN (SELECT public.get_auth_user_workspaces()));

DROP POLICY IF EXISTS "workspaces_insert" ON public.workspaces;
CREATE POLICY "workspaces_insert" ON public.workspaces
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "workspaces_update" ON public.workspaces;
CREATE POLICY "workspaces_update" ON public.workspaces
FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid() OR public.get_auth_user_role(id) IN ('admin', 'director', 'chief_accountant'))
WITH CHECK (owner_user_id = auth.uid() OR public.get_auth_user_role(id) IN ('admin', 'director', 'chief_accountant'));

DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;
CREATE POLICY "workspaces_delete" ON public.workspaces
FOR DELETE TO authenticated
USING (owner_user_id = auth.uid());

-- 5. TEAM MEMBERS RLS
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
CREATE POLICY "team_members_select" ON public.team_members
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT public.get_auth_user_workspaces()));

DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
CREATE POLICY "team_members_insert" ON public.team_members
FOR INSERT TO authenticated
WITH CHECK (public.get_auth_user_role(workspace_id) IN ('admin', 'director', 'chief_accountant'));

DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
CREATE POLICY "team_members_update" ON public.team_members
FOR UPDATE TO authenticated
USING (public.get_auth_user_role(workspace_id) IN ('admin', 'director', 'chief_accountant') OR user_id = auth.uid())
WITH CHECK (public.get_auth_user_role(workspace_id) IN ('admin', 'director', 'chief_accountant') OR user_id = auth.uid());

DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;
CREATE POLICY "team_members_delete" ON public.team_members
FOR DELETE TO authenticated
USING (public.get_auth_user_role(workspace_id) IN ('admin', 'director'));

-- 6. BUSINESS ENTITIES RLS
DROP POLICY IF EXISTS "business_entities_select" ON public.business_entities;
CREATE POLICY "business_entities_select" ON public.business_entities
FOR SELECT TO authenticated
USING (id IN (SELECT public.get_auth_user_entities()));

DROP POLICY IF EXISTS "business_entities_insert" ON public.business_entities;
CREATE POLICY "business_entities_insert" ON public.business_entities
FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (SELECT public.get_auth_user_workspaces()) 
  AND public.get_auth_user_role(workspace_id) IN ('admin', 'director', 'chief_accountant')
);

DROP POLICY IF EXISTS "business_entities_update" ON public.business_entities;
CREATE POLICY "business_entities_update" ON public.business_entities
FOR UPDATE TO authenticated
USING (
  id IN (SELECT public.get_auth_user_entities()) 
  AND public.get_auth_user_role(workspace_id) IN ('admin', 'director', 'chief_accountant')
)
WITH CHECK (
  id IN (SELECT public.get_auth_user_entities()) 
  AND public.get_auth_user_role(workspace_id) IN ('admin', 'director', 'chief_accountant')
);

DROP POLICY IF EXISTS "business_entities_delete" ON public.business_entities;
CREATE POLICY "business_entities_delete" ON public.business_entities
FOR DELETE TO authenticated
USING (
  id IN (SELECT public.get_auth_user_entities()) 
  AND public.get_auth_user_role(workspace_id) IN ('admin', 'director')
);

-- 7. MACRO FOR ALL ENTITY-BOUND CHILD TABLES
-- Tables: transactions, documents, contracts, inventory_items, employees, tax_records, tax_deadlines, integrations, sync_logs, exceptions, bank_accounts, chart_of_accounts
DO $$
DECLARE
    tbl text;
    entity_tables text[] := ARRAY[
        'transactions',
        'documents',
        'contracts',
        'inventory_items',
        'employees',
        'tax_records',
        'tax_deadlines',
        'integrations',
        'sync_logs',
        'exceptions',
        'bank_accounts',
        'chart_of_accounts'
    ];
BEGIN
    FOREACH tbl IN ARRAY entity_tables
    LOOP
        -- SELECT: Accessible if user has access to entity
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (business_entity_id IN (SELECT public.get_auth_user_entities()));',
            tbl, tbl
        );

        -- INSERT: Accessible if user has access to entity and is not read-only auditor
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (
                business_entity_id IN (SELECT public.get_auth_user_entities()) 
                AND public.get_auth_user_role((SELECT workspace_id FROM public.business_entities WHERE id = business_entity_id)) != ''auditor''
            );',
            tbl, tbl
        );

        -- UPDATE: Accessible if user has access to entity and is not read-only auditor
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (
                business_entity_id IN (SELECT public.get_auth_user_entities()) 
                AND public.get_auth_user_role((SELECT workspace_id FROM public.business_entities WHERE id = business_entity_id)) != ''auditor''
            ) WITH CHECK (
                business_entity_id IN (SELECT public.get_auth_user_entities()) 
                AND public.get_auth_user_role((SELECT workspace_id FROM public.business_entities WHERE id = business_entity_id)) != ''auditor''
            );',
            tbl, tbl
        );

        -- DELETE: Only admin, director, or chief_accountant can delete records
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (
                business_entity_id IN (SELECT public.get_auth_user_entities()) 
                AND public.get_auth_user_role((SELECT workspace_id FROM public.business_entities WHERE id = business_entity_id)) IN (''admin'', ''director'', ''chief_accountant'')
            );',
            tbl, tbl
        );
    END LOOP;
END $$;

-- 8. JOURNAL ENTRIES & JOURNAL LINES RLS (Read-only for authenticated; writes exclusively via atomic RPCs)
DROP POLICY IF EXISTS "journal_entries_select" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_update" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete" ON public.journal_entries;
CREATE POLICY "journal_entries_select" ON public.journal_entries
FOR SELECT TO authenticated
USING (business_entity_id IN (SELECT public.get_auth_user_entities()));

DROP POLICY IF EXISTS "journal_lines_select" ON public.journal_lines;
DROP POLICY IF EXISTS "journal_lines_insert" ON public.journal_lines;
DROP POLICY IF EXISTS "journal_lines_update" ON public.journal_lines;
DROP POLICY IF EXISTS "journal_lines_delete" ON public.journal_lines;
CREATE POLICY "journal_lines_select" ON public.journal_lines
FOR SELECT TO authenticated
USING (
  journal_entry_id IN (
    SELECT id FROM public.journal_entries 
    WHERE business_entity_id IN (SELECT public.get_auth_user_entities())
  )
);

-- 9. Trigger on auth.users creation to safely link pre-invited team_members rows
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
