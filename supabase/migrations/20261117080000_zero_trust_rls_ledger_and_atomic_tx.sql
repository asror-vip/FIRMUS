-- ==============================================================================
-- FIRMUS — Zero-Trust RLS, Canonical Roles, Entity Access, Strict RPC Ledger & Atomic Transactions
-- Migration: 20261117080000_zero_trust_rls_ledger_and_atomic_tx.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. SCHEMA PREPARATION: Ensure team_members.entity_access exists
-- ------------------------------------------------------------------------------
ALTER TABLE public.team_members
    ADD COLUMN IF NOT EXISTS entity_access TEXT[];

-- ------------------------------------------------------------------------------
-- A. ZERO-TRUST CLIENT METADATA ELIMINATION & AUTHORITATIVE EMAIL VERIFICATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_workspaces()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tm.workspace_id
    FROM public.team_members tm
    WHERE tm.status = 'active'
      AND (
          tm.user_id = auth.uid()
          OR EXISTS (
              SELECT 1
              FROM auth.users u
              WHERE u.id = auth.uid()
                AND u.email_confirmed_at IS NOT NULL
                AND u.email IS NOT NULL
                AND LOWER(u.email) = LOWER(tm.email)
          )
      )
    UNION
    SELECT w.id
    FROM public.workspaces w
    WHERE w.owner_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_role(target_workspace_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_uid UUID := auth.uid();
    v_role VARCHAR;
BEGIN
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.workspaces w
        WHERE w.id = target_workspace_id
          AND w.owner_user_id = v_uid
    ) THEN
        RETURN 'workspace_owner';
    END IF;

    SELECT tm.role INTO v_role
    FROM public.team_members tm
    WHERE tm.workspace_id = target_workspace_id
      AND tm.status = 'active'
      AND (
          tm.user_id = v_uid
          OR EXISTS (
              SELECT 1
              FROM auth.users u
              WHERE u.id = v_uid
                AND u.email_confirmed_at IS NOT NULL
                AND u.email IS NOT NULL
                AND LOWER(u.email) = LOWER(tm.email)
          )
      )
    ORDER BY
        CASE tm.role
            WHEN 'workspace_owner' THEN 1
            WHEN 'workspace_admin' THEN 2
            WHEN 'company_director' THEN 3
            WHEN 'admin' THEN 4
            WHEN 'director' THEN 5
            WHEN 'chief_accountant' THEN 6
            WHEN 'accountant' THEN 7
            ELSE 99
        END
    LIMIT 1;

    RETURN v_role;
END;
$func$;

-- ------------------------------------------------------------------------------
-- B. CANONICAL ROLE UNIFICATION HELPERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_can_mutate_workspace(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        public.get_auth_user_role(target_workspace_id) IN (
            'workspace_owner',
            'workspace_admin',
            'company_director',
            'chief_accountant',
            'accountant',
            'admin',
            'director'
        ),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_workspace(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        public.get_auth_user_role(target_workspace_id) IN (
            'workspace_owner',
            'workspace_admin',
            'company_director',
            'chief_accountant',
            'admin',
            'director'
        ),
        false
    );
$$;

-- ------------------------------------------------------------------------------
-- C. COMPANY-LEVEL (entity_access) ENFORCEMENT & UNIFIED RLS POLICIES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_entities()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT be.id
    FROM public.business_entities be
    JOIN public.workspaces w ON w.id = be.workspace_id
    WHERE w.owner_user_id = auth.uid()

    UNION

    SELECT be.id
    FROM public.business_entities be
    JOIN public.team_members tm ON tm.workspace_id = be.workspace_id
    WHERE tm.status = 'active'
      AND (
          tm.user_id = auth.uid()
          OR EXISTS (
              SELECT 1
              FROM auth.users u
              WHERE u.id = auth.uid()
                AND u.email_confirmed_at IS NOT NULL
                AND u.email IS NOT NULL
                AND LOWER(u.email) = LOWER(tm.email)
          )
      )
      AND (
          tm.role IN ('workspace_owner', 'workspace_admin', 'admin', 'company_director', 'director')
          OR (
              (tm.entity_access IS NULL OR cardinality(tm.entity_access) = 0)
              AND (
                  tm.assigned_entity_ids IS NULL
                  OR jsonb_typeof(tm.assigned_entity_ids) <> 'array'
                  OR jsonb_array_length(tm.assigned_entity_ids) = 0
              )
          )
          OR (
              tm.entity_access IS NOT NULL
              AND cardinality(tm.entity_access) > 0
              AND (
                  'all' = ANY(LOWER(tm.entity_access::text)::text[])
                  OR '*' = ANY(tm.entity_access)
                  OR 'Barcha korxonalar' = ANY(tm.entity_access)
                  OR be.id::text = ANY(tm.entity_access)
                  OR be.legal_name = ANY(tm.entity_access)
                  OR COALESCE(be.trade_name, '') = ANY(tm.entity_access)
                  OR be.tin_stir = ANY(tm.entity_access)
              )
          )
          OR (
              tm.assigned_entity_ids IS NOT NULL
              AND jsonb_typeof(tm.assigned_entity_ids) = 'array'
              AND jsonb_array_length(tm.assigned_entity_ids) > 0
              AND (
                  tm.assigned_entity_ids ? be.id::text
                  OR tm.assigned_entity_ids ? 'all'
                  OR tm.assigned_entity_ids ? '*'
                  OR tm.assigned_entity_ids ? 'Barcha korxonalar'
                  OR tm.assigned_entity_ids ? be.legal_name
                  OR tm.assigned_entity_ids ? COALESCE(be.trade_name, '')
                  OR tm.assigned_entity_ids ? be.tin_stir
              )
          )
      );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_role(
    target_workspace_id UUID,
    target_entity_id UUID
)
RETURNS VARCHAR
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    IF target_entity_id IS NOT NULL
       AND target_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
        RETURN NULL;
    END IF;

    RETURN public.get_auth_user_role(target_workspace_id);
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.get_auth_user_workspaces() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_workspaces() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_auth_user_entities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_entities() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_auth_user_role(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_auth_user_role(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role(UUID, UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.user_can_mutate_workspace(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_mutate_workspace(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.user_can_manage_workspace(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_manage_workspace(UUID) TO authenticated, service_role;

-- 1. WORKSPACES RLS
DROP POLICY IF EXISTS "workspaces_select" ON public.workspaces;
CREATE POLICY "workspaces_select" ON public.workspaces
FOR SELECT TO authenticated
USING (id IN (SELECT public.get_auth_user_workspaces()));

DROP POLICY IF EXISTS "workspaces_insert" ON public.workspaces;
CREATE POLICY "workspaces_insert" ON public.workspaces
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
);

DROP POLICY IF EXISTS "workspaces_update" ON public.workspaces;
CREATE POLICY "workspaces_update" ON public.workspaces
FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid() OR public.user_can_manage_workspace(id))
WITH CHECK (owner_user_id = auth.uid() OR public.user_can_manage_workspace(id));

DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;
CREATE POLICY "workspaces_delete" ON public.workspaces
FOR DELETE TO authenticated
USING (
    owner_user_id = auth.uid()
    OR public.get_auth_user_role(id) IN ('workspace_owner', 'workspace_admin', 'company_director', 'admin', 'director')
);

-- 2. TEAM MEMBERS RLS & PRIVILEGE ESCALATION GUARD
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
CREATE POLICY "team_members_select" ON public.team_members
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT public.get_auth_user_workspaces()));

DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
CREATE POLICY "team_members_insert" ON public.team_members
FOR INSERT TO authenticated
WITH CHECK (
    public.user_can_manage_workspace(workspace_id)
    AND (
        role <> 'workspace_owner'
        OR public.get_auth_user_role(workspace_id) = 'workspace_owner'
    )
);

DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
CREATE POLICY "team_members_update" ON public.team_members
FOR UPDATE TO authenticated
USING (public.user_can_manage_workspace(workspace_id))
WITH CHECK (public.user_can_manage_workspace(workspace_id));

DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;
CREATE POLICY "team_members_delete" ON public.team_members
FOR DELETE TO authenticated
USING (
    public.get_auth_user_role(workspace_id) IN ('workspace_owner', 'workspace_admin', 'company_director', 'admin', 'director')
);

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

            IF v_caller_role = 'chief_accountant'
               AND NEW.role IS DISTINCT FROM OLD.role
               AND NEW.role IN ('workspace_owner', 'workspace_admin', 'company_director', 'admin', 'director') THEN
                RAISE EXCEPTION 'Bosh buxgalter rahbarlik rolini tayinlashi mumkin emas';
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

-- 3. BUSINESS ENTITIES RLS
DROP POLICY IF EXISTS "business_entities_select" ON public.business_entities;
CREATE POLICY "business_entities_select" ON public.business_entities
FOR SELECT TO authenticated
USING (
    id IN (SELECT public.get_auth_user_entities())
    OR (
        workspace_id IN (SELECT public.get_auth_user_workspaces())
        AND public.get_auth_user_role(workspace_id) IN (
            'workspace_owner',
            'workspace_admin',
            'company_director',
            'admin',
            'director'
        )
    )
);

DROP POLICY IF EXISTS "business_entities_insert" ON public.business_entities;
CREATE POLICY "business_entities_insert" ON public.business_entities
FOR INSERT TO authenticated
WITH CHECK (
    workspace_id IN (SELECT public.get_auth_user_workspaces())
    AND public.user_can_manage_workspace(workspace_id)
);

DROP POLICY IF EXISTS "business_entities_update" ON public.business_entities;
CREATE POLICY "business_entities_update" ON public.business_entities
FOR UPDATE TO authenticated
USING (
    id IN (SELECT public.get_auth_user_entities())
    AND public.user_can_manage_workspace(workspace_id)
)
WITH CHECK (
    id IN (SELECT public.get_auth_user_entities())
    AND public.user_can_manage_workspace(workspace_id)
);

DROP POLICY IF EXISTS "business_entities_delete" ON public.business_entities;
CREATE POLICY "business_entities_delete" ON public.business_entities
FOR DELETE TO authenticated
USING (
    id IN (SELECT public.get_auth_user_entities())
    AND public.get_auth_user_role(workspace_id, id) IN (
        'workspace_owner',
        'workspace_admin',
        'company_director',
        'admin',
        'director'
    )
);

-- 4. ENTITY-BOUND CHILD TABLES RLS (Unified roles + entity_access boundary)
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
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (business_entity_id IN (SELECT public.get_auth_user_entities()));',
            tbl, tbl
        );

        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (
                business_entity_id IN (SELECT public.get_auth_user_entities())
                AND public.get_auth_user_role(
                    (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id),
                    business_entity_id
                ) IN (''workspace_owner'', ''workspace_admin'', ''company_director'', ''chief_accountant'', ''accountant'', ''admin'', ''director'')
            );',
            tbl, tbl
        );

        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (
                business_entity_id IN (SELECT public.get_auth_user_entities())
                AND public.get_auth_user_role(
                    (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id),
                    business_entity_id
                ) IN (''workspace_owner'', ''workspace_admin'', ''company_director'', ''chief_accountant'', ''accountant'', ''admin'', ''director'')
            ) WITH CHECK (
                business_entity_id IN (SELECT public.get_auth_user_entities())
                AND public.get_auth_user_role(
                    (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id),
                    business_entity_id
                ) IN (''workspace_owner'', ''workspace_admin'', ''company_director'', ''chief_accountant'', ''accountant'', ''admin'', ''director'')
            );',
            tbl, tbl
        );

        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (
                business_entity_id IN (SELECT public.get_auth_user_entities())
                AND public.get_auth_user_role(
                    (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id),
                    business_entity_id
                ) IN (''workspace_owner'', ''workspace_admin'', ''company_director'', ''chief_accountant'', ''admin'', ''director'')
            );',
            tbl, tbl
        );
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- D. STRICT RPC-ONLY LEDGER WRITES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "journal_entries_insert" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_update" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_lines_insert" ON public.journal_lines;
DROP POLICY IF EXISTS "journal_lines_update" ON public.journal_lines;
DROP POLICY IF EXISTS "journal_lines_delete" ON public.journal_lines;

DROP POLICY IF EXISTS "journal_entries_select" ON public.journal_entries;
CREATE POLICY "journal_entries_select" ON public.journal_entries
FOR SELECT TO authenticated
USING (business_entity_id IN (SELECT public.get_auth_user_entities()));

DROP POLICY IF EXISTS "journal_lines_select" ON public.journal_lines;
CREATE POLICY "journal_lines_select" ON public.journal_lines
FOR SELECT TO authenticated
USING (
    journal_entry_id IN (
        SELECT je.id
        FROM public.journal_entries je
        WHERE je.business_entity_id IN (SELECT public.get_auth_user_entities())
    )
);

REVOKE INSERT, UPDATE, DELETE ON public.journal_entries, public.journal_lines FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.journal_entries, public.journal_lines TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.journal_entries, public.journal_lines TO service_role;

-- Harden create_journal_entry_atomic with unified roles & entity_access check
CREATE OR REPLACE FUNCTION public.create_journal_entry_atomic(
    p_business_entity_id UUID,
    p_entry_number VARCHAR,
    p_entry_date DATE,
    p_description TEXT,
    p_source_type VARCHAR DEFAULT 'manual',
    p_source_reference_id VARCHAR DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL,
    p_lines JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_is_service BOOLEAN;
    v_workspace_id UUID;
    v_user_role VARCHAR;
    v_existing_rec RECORD;
    v_total_debit NUMERIC(19, 4) := 0.0000;
    v_total_credit NUMERIC(19, 4) := 0.0000;
    v_line JSONB;
    v_account_code VARCHAR;
    v_account_name VARCHAR;
    v_debit NUMERIC(19, 4);
    v_credit NUMERIC(19, 4);
    v_memo TEXT;
    v_entry_id UUID;
    v_result JSONB;
    v_acc_exists BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    v_is_service := current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin');

    IF v_user_id IS NULL AND NOT v_is_service THEN
        RAISE EXCEPTION 'Kirish taqiqlangan: autentifikatsiyadan o''tilmagan';
    END IF;

    SELECT workspace_id INTO v_workspace_id
    FROM public.business_entities
    WHERE id = p_business_entity_id;

    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Korxona topilmadi: %', p_business_entity_id;
    END IF;

    IF v_user_id IS NOT NULL THEN
        IF p_business_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%s) ma''lumotlariga ruxsatga ega emassiz', p_business_entity_id;
        END IF;

        v_user_role := public.get_auth_user_role(v_workspace_id, p_business_entity_id);
        IF v_user_role IS NULL OR v_user_role IN ('auditor', 'viewer') OR v_user_role NOT IN (
            'workspace_owner', 'workspace_admin', 'company_director', 'chief_accountant', 'accountant', 'admin', 'director'
        ) THEN
            RAISE EXCEPTION 'Provodka yaratish uchun yetarli vakolat yo''q (Rol: %)', COALESCE(v_user_role, 'yo''q');
        END IF;
    END IF;

    IF p_lines IS NULL OR jsonb_array_length(p_lines) < 2 THEN
        RAISE EXCEPTION 'Ikkiyoqlama yozuv (Double-entry) qoidasi bo''yicha kamida 2 ta qator (debet va kredit) bo''lishi shart';
    END IF;

    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        v_account_code := TRIM(v_line->>'account_code');
        v_debit := COALESCE((v_line->>'debit_amount')::NUMERIC, 0.0000);
        v_credit := COALESCE((v_line->>'credit_amount')::NUMERIC, 0.0000);

        IF v_debit < 0 OR v_credit < 0 THEN
            RAISE EXCEPTION 'Manfiy summa kiritish mumkin emas: schyot % (debet: %, kredit: %)', v_account_code, v_debit, v_credit;
        END IF;

        IF v_debit = 0 AND v_credit = 0 THEN
            RAISE EXCEPTION 'Har bir qatorda debet yoki kredit summasi 0 dan katta bo''lishi shart (schyot %)', v_account_code;
        END IF;

        IF v_debit > 0 AND v_credit > 0 THEN
            RAISE EXCEPTION 'Bitta qatorda bir vaqtning o''zida ham debet, ham kredit bo''lishi mumkin emas (schyot %)', v_account_code;
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM public.chart_of_accounts
            WHERE code = v_account_code
              AND (business_entity_id = p_business_entity_id OR business_entity_id IS NULL)
              AND is_active = true
        ) INTO v_acc_exists;

        IF NOT v_acc_exists THEN
            RAISE EXCEPTION 'Mavjud bo''lmagan yoki faol bo''lmagan schyot kodi: %', v_account_code;
        END IF;

        v_total_debit := v_total_debit + v_debit;
        v_total_credit := v_total_credit + v_credit;
    END LOOP;

    IF v_total_debit <> v_total_credit THEN
        RAISE EXCEPTION 'Balanssiz provodka rad etildi: Debet (%s) va Kredit (%s) summalari teng emas!',
            v_total_debit, v_total_credit;
    END IF;

    IF v_total_debit <= 0 THEN
        RAISE EXCEPTION 'Provodka summasi 0 dan katta bo''lishi shart';
    END IF;

    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        SELECT id, business_entity_id, entry_number, entry_date, status, description, total_debit, total_credit, posted_at
        INTO v_existing_rec
        FROM public.journal_entries
        WHERE business_entity_id = p_business_entity_id AND idempotency_key = TRIM(p_idempotency_key);

        IF v_existing_rec.id IS NOT NULL THEN
            IF v_existing_rec.total_debit <> v_total_debit THEN
                RAISE EXCEPTION 'Idempotency kaliti boshqa so''rov uchun ishlatilgan (Payload mismatch: berilgan kalit % summadagi boshqa provodkaga tegishli)', v_existing_rec.total_debit;
            END IF;

            RETURN jsonb_build_object(
                'id', v_existing_rec.id,
                'business_entity_id', v_existing_rec.business_entity_id,
                'entry_number', v_existing_rec.entry_number,
                'entry_date', v_existing_rec.entry_date,
                'status', v_existing_rec.status,
                'description', v_existing_rec.description,
                'total_debit', v_existing_rec.total_debit,
                'total_credit', v_existing_rec.total_credit,
                'posted_at', v_existing_rec.posted_at,
                'is_duplicate', true
            );
        END IF;
    END IF;

    BEGIN
        INSERT INTO public.journal_entries (
            business_entity_id,
            entry_number,
            entry_date,
            status,
            description,
            source_type,
            source_reference_id,
            posted_at,
            total_debit,
            total_credit,
            idempotency_key,
            created_by_user_id
        ) VALUES (
            p_business_entity_id,
            p_entry_number,
            p_entry_date,
            'posted',
            p_description,
            p_source_type,
            p_source_reference_id,
            clock_timestamp(),
            v_total_debit,
            v_total_credit,
            NULLIF(TRIM(p_idempotency_key), ''),
            v_user_id
        ) RETURNING id INTO v_entry_id;
    EXCEPTION WHEN unique_violation THEN
        IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
            SELECT id, business_entity_id, entry_number, entry_date, status, description, total_debit, total_credit, posted_at
            INTO v_existing_rec
            FROM public.journal_entries
            WHERE business_entity_id = p_business_entity_id AND idempotency_key = TRIM(p_idempotency_key);

            IF v_existing_rec.id IS NOT NULL THEN
                IF v_existing_rec.total_debit <> v_total_debit THEN
                    RAISE EXCEPTION 'Idempotency kaliti boshqa so''rov uchun ishlatilgan (Payload mismatch)';
                END IF;

                RETURN jsonb_build_object(
                    'id', v_existing_rec.id,
                    'business_entity_id', v_existing_rec.business_entity_id,
                    'entry_number', v_existing_rec.entry_number,
                    'entry_date', v_existing_rec.entry_date,
                    'status', v_existing_rec.status,
                    'description', v_existing_rec.description,
                    'total_debit', v_existing_rec.total_debit,
                    'total_credit', v_existing_rec.total_credit,
                    'posted_at', v_existing_rec.posted_at,
                    'is_duplicate', true
                );
            END IF;
        END IF;
        RAISE;
    END;

    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
    LOOP
        v_account_code := TRIM(v_line->>'account_code');
        v_account_name := COALESCE(NULLIF(TRIM(v_line->>'account_name'), ''), (
            SELECT name FROM public.chart_of_accounts
            WHERE code = v_account_code
              AND (business_entity_id = p_business_entity_id OR business_entity_id IS NULL)
            LIMIT 1
        ));
        v_debit := COALESCE((v_line->>'debit_amount')::NUMERIC, 0.0000);
        v_credit := COALESCE((v_line->>'credit_amount')::NUMERIC, 0.0000);
        v_memo := v_line->>'memo';

        INSERT INTO public.journal_lines (
            journal_entry_id,
            account_code,
            account_name,
            debit_amount,
            credit_amount,
            memo
        ) VALUES (
            v_entry_id,
            v_account_code,
            v_account_name,
            v_debit,
            v_credit,
            v_memo
        );
    END LOOP;

    SELECT jsonb_build_object(
        'id', je.id,
        'business_entity_id', je.business_entity_id,
        'entry_number', je.entry_number,
        'entry_date', je.entry_date,
        'status', je.status,
        'description', je.description,
        'total_debit', je.total_debit,
        'total_credit', je.total_credit,
        'posted_at', je.posted_at,
        'is_duplicate', false
    ) INTO v_result
    FROM public.journal_entries je
    WHERE je.id = v_entry_id;

    RETURN v_result;
END;
$$;

-- Harden reverse_journal_entry with unified roles & entity_access check
CREATE OR REPLACE FUNCTION public.reverse_journal_entry(
    p_entry_id UUID,
    p_reason TEXT DEFAULT 'Xatolik tufayli bekor qilindi'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_orig RECORD;
    v_rev_entry_id UUID;
    v_rev_entry_number VARCHAR;
    v_line RECORD;
    v_user_id UUID;
    v_is_service BOOLEAN;
    v_workspace_id UUID;
    v_user_role VARCHAR;
BEGIN
    v_user_id := auth.uid();
    v_is_service := current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin');

    IF v_user_id IS NULL AND NOT v_is_service THEN
        RAISE EXCEPTION 'Kirish taqiqlangan: autentifikatsiyadan o''tilmagan';
    END IF;

    SELECT * INTO v_orig
    FROM public.journal_entries
    WHERE id = p_entry_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Provodka topilmadi: %', p_entry_id;
    END IF;

    IF v_orig.source_type = 'reversal' OR v_orig.reversal_of_id IS NOT NULL THEN
        RAISE EXCEPTION 'Storno provodkasini qayta storno qilish taqiqlangan: bu provodka allaqachon boshqa provodkani qaytarish uchun yaratilgan';
    END IF;

    IF v_orig.status <> 'posted' THEN
        RAISE EXCEPTION 'Faqat tasdiqlangan (posted) provodkani storno qilish mumkin. Bu provodka allaqachon bekor qilingan (Joriy holat: %)', v_orig.status;
    END IF;

    IF v_user_id IS NOT NULL THEN
        IF v_orig.business_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Ruxsat berilmagan: siz boshqa korxonaning provodkasini bekor qila olmaysiz';
        END IF;

        SELECT workspace_id INTO v_workspace_id
        FROM public.business_entities
        WHERE id = v_orig.business_entity_id;

        v_user_role := public.get_auth_user_role(v_workspace_id, v_orig.business_entity_id);
        IF v_user_role IS NULL OR v_user_role IN ('auditor', 'viewer') OR v_user_role NOT IN (
            'workspace_owner', 'workspace_admin', 'company_director', 'chief_accountant', 'accountant', 'admin', 'director'
        ) THEN
            RAISE EXCEPTION 'Provodkani storno qilish uchun yetarli vakolat yo''q (Sizning rolingiz: %)', COALESCE(v_user_role, 'yo''q');
        END IF;
    END IF;

    v_rev_entry_number := v_orig.entry_number || '-REV';

    INSERT INTO public.journal_entries (
        business_entity_id,
        entry_number,
        entry_date,
        status,
        description,
        source_type,
        source_reference_id,
        posted_at,
        total_debit,
        total_credit,
        reversal_of_id,
        created_by_user_id
    ) VALUES (
        v_orig.business_entity_id,
        v_rev_entry_number,
        CURRENT_DATE,
        'posted',
        'STORNO: ' || v_orig.description || ' [Sabab: ' || p_reason || ']',
        'reversal',
        v_orig.entry_number,
        clock_timestamp(),
        v_orig.total_debit,
        v_orig.total_credit,
        v_orig.id,
        v_user_id
    ) RETURNING id INTO v_rev_entry_id;

    FOR v_line IN SELECT * FROM public.journal_lines WHERE journal_entry_id = v_orig.id
    LOOP
        INSERT INTO public.journal_lines (
            journal_entry_id,
            account_code,
            account_name,
            debit_amount,
            credit_amount,
            memo
        ) VALUES (
            v_rev_entry_id,
            v_line.account_code,
            v_line.account_name,
            v_line.credit_amount,
            v_line.debit_amount,
            'Storno: ' || COALESCE(v_line.memo, '')
        );
    END LOOP;

    UPDATE public.journal_entries
    SET status = 'reversed'
    WHERE id = v_orig.id;

    RETURN jsonb_build_object(
        'success', true,
        'original_entry_id', v_orig.id,
        'reversal_entry_id', v_rev_entry_id,
        'reversal_entry_number', v_rev_entry_number,
        'status', 'reversed'
    );
END;
$$;

-- Harden close_accounting_period with unified roles & entity_access check
CREATE OR REPLACE FUNCTION public.close_accounting_period(
    p_business_entity_id UUID,
    p_from_date DATE,
    p_to_date DATE,
    p_closing_date DATE DEFAULT NULL,
    p_idempotency_key VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_is_service BOOLEAN;
    v_workspace_id UUID;
    v_user_role VARCHAR;
    v_close_date DATE;
    v_existing RECORD;
    v_acc RECORD;
    v_lines JSONB := '[]'::jsonb;
    v_net_profit NUMERIC(19, 4) := 0.0000;
    v_acc_net NUMERIC(19, 4);
    v_total_debit NUMERIC(19, 4) := 0.0000;
    v_total_credit NUMERIC(19, 4) := 0.0000;
    v_entry_id UUID;
    v_entry_number VARCHAR(50);
    v_idem_key VARCHAR(150);
    v_line JSONB;
BEGIN
    v_user_id := auth.uid();
    v_is_service := current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin');

    IF v_user_id IS NULL AND NOT v_is_service THEN
        RAISE EXCEPTION 'Autentifikatsiya talab qilinadi';
    END IF;

    IF p_business_entity_id IS NULL OR p_from_date IS NULL OR p_to_date IS NULL THEN
        RAISE EXCEPTION 'Korxona va davr sanalari kiritilishi shart';
    END IF;

    IF p_to_date < p_from_date THEN
        RAISE EXCEPTION 'Tugash sanasi boshlanish sanasidan oldin bo''lishi mumkin emas';
    END IF;

    SELECT workspace_id INTO v_workspace_id
    FROM public.business_entities
    WHERE id = p_business_entity_id;

    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Korxona topilmadi';
    END IF;

    IF v_user_id IS NOT NULL THEN
        IF p_business_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%s) ma''lumotlariga ruxsatga ega emassiz', p_business_entity_id;
        END IF;

        v_user_role := public.get_auth_user_role(v_workspace_id, p_business_entity_id);
        IF v_user_role IS NULL OR v_user_role IN ('auditor', 'viewer') OR v_user_role NOT IN (
            'workspace_owner', 'workspace_admin', 'company_director', 'chief_accountant', 'accountant', 'admin', 'director'
        ) THEN
            RAISE EXCEPTION 'Davrni yopish uchun yetarli vakolat yo''q (Joriy rol: %)', COALESCE(v_user_role, 'yo''q');
        END IF;
    END IF;

    v_close_date := COALESCE(p_closing_date, p_to_date);
    v_idem_key := COALESCE(p_idempotency_key, format('idem-close-%s-%s-%s', p_business_entity_id, p_from_date, p_to_date));

    SELECT id, entry_number, total_debit INTO v_existing
    FROM public.journal_entries
    WHERE business_entity_id = p_business_entity_id
      AND idempotency_key = v_idem_key
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'id', v_existing.id,
            'entry_number', v_existing.entry_number,
            'net_profit', 0,
            'idempotent', true
        );
    END IF;

    FOR v_acc IN
        SELECT
            coa.code,
            coa.name,
            coa.type,
            COALESCE(SUM(jl.debit_amount), 0.0000) AS dt_sum,
            COALESCE(SUM(jl.credit_amount), 0.0000) AS ct_sum
        FROM public.chart_of_accounts coa
        JOIN public.journal_lines jl ON jl.account_code = coa.code
        JOIN public.journal_entries je ON je.id = jl.journal_entry_id
        WHERE coa.business_entity_id = p_business_entity_id
          AND coa.type IN ('revenue', 'expense')
          AND je.business_entity_id = p_business_entity_id
          AND je.status IN ('posted', 'reversed')
          AND je.source_type <> 'period_closing'
          AND je.entry_date BETWEEN p_from_date AND p_to_date
        GROUP BY coa.code, coa.name, coa.type
        ORDER BY coa.code
    LOOP
        v_acc_net := v_acc.ct_sum - v_acc.dt_sum;
        IF ABS(v_acc_net) > 0.0000 THEN
            IF v_acc_net > 0 THEN
                v_lines := v_lines || jsonb_build_array(jsonb_build_object(
                    'account_code', v_acc.code,
                    'account_name', v_acc.name,
                    'debit_amount', v_acc_net,
                    'credit_amount', 0,
                    'memo', format('Davr yopish (%s..%s)', p_from_date, p_to_date)
                ));
                v_total_debit := v_total_debit + v_acc_net;
            ELSE
                v_lines := v_lines || jsonb_build_array(jsonb_build_object(
                    'account_code', v_acc.code,
                    'account_name', v_acc.name,
                    'debit_amount', 0,
                    'credit_amount', ABS(v_acc_net),
                    'memo', format('Davr yopish (%s..%s)', p_from_date, p_to_date)
                ));
                v_total_credit := v_total_credit + ABS(v_acc_net);
            END IF;
            v_net_profit := v_net_profit + v_acc_net;
        END IF;
    END LOOP;

    IF jsonb_array_length(v_lines) = 0 THEN
        RAISE EXCEPTION 'Ushbu davr (% — %) uchun yopiladigan daromad yoki xarajat aylanmalari topilmadi', p_from_date, p_to_date;
    END IF;

    IF v_net_profit > 0 THEN
        v_lines := v_lines || jsonb_build_array(
            jsonb_build_object(
                'account_code', '9910',
                'account_name', 'Yakuniy moliyaviy natija',
                'debit_amount', 0,
                'credit_amount', v_net_profit,
                'memo', 'Davr moliyaviy natijasi'
            ),
            jsonb_build_object(
                'account_code', '9910',
                'account_name', 'Yakuniy moliyaviy natija',
                'debit_amount', v_net_profit,
                'credit_amount', 0,
                'memo', 'Sof foydani 8710 ga o''tkazish'
            ),
            jsonb_build_object(
                'account_code', '8710',
                'account_name', 'Taqsimlanmagan foyda (qoplanmagan zarar)',
                'debit_amount', 0,
                'credit_amount', v_net_profit,
                'memo', format('%s — %s sof foyda', p_from_date, p_to_date)
            )
        );
        v_total_debit := v_total_debit + v_net_profit;
        v_total_credit := v_total_credit + (v_net_profit * 2);
    ELSIF v_net_profit < 0 THEN
        v_lines := v_lines || jsonb_build_array(
            jsonb_build_object(
                'account_code', '9910',
                'account_name', 'Yakuniy moliyaviy natija',
                'debit_amount', ABS(v_net_profit),
                'credit_amount', 0,
                'memo', 'Davr zarar natijasi'
            ),
            jsonb_build_object(
                'account_code', '8710',
                'account_name', 'Taqsimlanmagan foyda (qoplanmagan zarar)',
                'debit_amount', ABS(v_net_profit),
                'credit_amount', 0,
                'memo', format('%s — %s qoplanmagan zarar', p_from_date, p_to_date)
            ),
            jsonb_build_object(
                'account_code', '9910',
                'account_name', 'Yakuniy moliyaviy natija',
                'debit_amount', 0,
                'credit_amount', ABS(v_net_profit),
                'memo', 'Zararni 8710 ga o''tkazish'
            )
        );
        v_total_debit := v_total_debit + (ABS(v_net_profit) * 2);
        v_total_credit := v_total_credit + ABS(v_net_profit);
    END IF;

    IF v_total_debit <> v_total_credit THEN
        RAISE EXCEPTION 'Davr yopish provodkasi balanslanmadi (Dt: %, Kt: %)', v_total_debit, v_total_credit;
    END IF;

    v_entry_number := format('JE-CLOSE-%s', to_char(v_close_date, 'YYYYMMDD'));

    INSERT INTO public.journal_entries (
        business_entity_id, entry_number, entry_date, status,
        description, source_type, source_reference_id,
        total_debit, total_credit, idempotency_key,
        created_by_user_id, posted_at
    ) VALUES (
        p_business_entity_id, v_entry_number, v_close_date, 'posted',
        format('Davrni yopish (Zakritiye perioda %s — %s): Sof natija = %s UZS', p_from_date, p_to_date, v_net_profit),
        'period_closing', format('%s:%s', p_from_date, p_to_date),
        v_total_debit, v_total_credit, v_idem_key,
        v_user_id, clock_timestamp()
    ) RETURNING id INTO v_entry_id;

    FOR v_line IN SELECT * FROM jsonb_array_elements(v_lines)
    LOOP
        INSERT INTO public.journal_lines (
            journal_entry_id, account_code, account_name,
            debit_amount, credit_amount, memo
        ) VALUES (
            v_entry_id,
            v_line->>'account_code',
            v_line->>'account_name',
            (v_line->>'debit_amount')::NUMERIC(19,4),
            (v_line->>'credit_amount')::NUMERIC(19,4),
            v_line->>'memo'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'id', v_entry_id,
        'entry_number', v_entry_number,
        'net_profit', v_net_profit,
        'total_debit', v_total_debit,
        'idempotent', false
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_journal_entry_atomic(UUID, VARCHAR, DATE, TEXT, VARCHAR, VARCHAR, VARCHAR, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_journal_entry_atomic(UUID, VARCHAR, DATE, TEXT, VARCHAR, VARCHAR, VARCHAR, JSONB) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reverse_journal_entry(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_journal_entry(UUID, TEXT) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.close_accounting_period(UUID, DATE, DATE, DATE, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_accounting_period(UUID, DATE, DATE, DATE, VARCHAR) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- E. ATOMIC TRANSACTION + JOURNAL ENTRY RPCs
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_transaction_with_journal_atomic(
    p_business_entity_id UUID,
    p_date DATE,
    p_amount NUMERIC,
    p_type VARCHAR,
    p_counterparty VARCHAR,
    p_counterparty_stir VARCHAR DEFAULT NULL,
    p_description TEXT DEFAULT '',
    p_status VARCHAR DEFAULT 'posted',
    p_source VARCHAR DEFAULT 'manual',
    p_account_code VARCHAR DEFAULT NULL,
    p_account_name VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_is_service BOOLEAN;
    v_workspace_id UUID;
    v_user_role VARCHAR;
    v_corr_code VARCHAR;
    v_corr_name VARCHAR;
    v_final_status VARCHAR;
    v_tx public.transactions%ROWTYPE;
    v_debit_code VARCHAR;
    v_debit_name VARCHAR;
    v_credit_code VARCHAR;
    v_credit_name VARCHAR;
    v_je_desc TEXT;
BEGIN
    v_user_id := auth.uid();
    v_is_service := current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin');

    IF v_user_id IS NULL AND NOT v_is_service THEN
        RAISE EXCEPTION 'Kirish taqiqlangan: autentifikatsiyadan o''tilmagan';
    END IF;

    SELECT workspace_id INTO v_workspace_id
    FROM public.business_entities
    WHERE id = p_business_entity_id;

    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Korxona topilmadi: %', p_business_entity_id;
    END IF;

    IF v_user_id IS NOT NULL THEN
        IF p_business_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%s) ma''lumotlariga ruxsatga ega emassiz', p_business_entity_id;
        END IF;

        v_user_role := public.get_auth_user_role(v_workspace_id, p_business_entity_id);
        IF v_user_role IS NULL OR v_user_role IN ('auditor', 'viewer') OR v_user_role NOT IN (
            'workspace_owner', 'workspace_admin', 'company_director', 'chief_accountant', 'accountant', 'admin', 'director'
        ) THEN
            RAISE EXCEPTION 'Tranzaksiya yaratish uchun yetarli vakolat yo''q (Rol: %)', COALESCE(v_user_role, 'yo''q');
        END IF;
    END IF;

    v_corr_code := COALESCE(
        NULLIF(TRIM(p_account_code), ''),
        CASE WHEN p_type = 'income' THEN '4010' ELSE '6010' END
    );
    v_corr_name := COALESCE(
        NULLIF(TRIM(p_account_name), ''),
        CASE
            WHEN p_type = 'income' THEN 'Xaridorlar va buyurtmachilardan olinadigan schyotlar'
            ELSE 'Mol yetkazib beruvchilarga toʻlanadigan schyotlar'
        END
    );
    v_final_status := COALESCE(NULLIF(TRIM(p_status), ''), 'posted');

    INSERT INTO public.transactions (
        business_entity_id,
        date,
        amount,
        type,
        counterparty,
        counterparty_stir,
        description,
        status,
        source,
        account_code,
        account_name
    ) VALUES (
        p_business_entity_id,
        COALESCE(p_date, CURRENT_DATE),
        p_amount,
        p_type,
        p_counterparty,
        p_counterparty_stir,
        COALESCE(p_description, ''),
        v_final_status,
        COALESCE(NULLIF(TRIM(p_source), ''), 'manual'),
        v_corr_code,
        v_corr_name
    ) RETURNING * INTO v_tx;

    IF v_final_status = 'posted' AND p_amount > 0 THEN
        IF p_type = 'income' THEN
            v_debit_code := '5110';
            v_debit_name := 'Hisob-kitob schyoti (Milliy valyutada)';
            v_credit_code := v_corr_code;
            v_credit_name := v_corr_name;
        ELSE
            v_debit_code := v_corr_code;
            v_debit_name := v_corr_name;
            v_credit_code := '5110';
            v_credit_name := 'Hisob-kitob schyoti (Milliy valyutada)';
        END IF;

        v_je_desc := TRIM(COALESCE(v_tx.counterparty, '')) ||
            CASE WHEN COALESCE(TRIM(v_tx.description), '') <> '' THEN ': ' || TRIM(v_tx.description) ELSE '' END;

        PERFORM public.create_journal_entry_atomic(
            p_business_entity_id,
            'JE-TX-' || UPPER(SUBSTRING(v_tx.id::text FROM 1 FOR 8)),
            v_tx.date,
            v_je_desc,
            'bank_statement',
            v_tx.id::text,
            'idem-tx-' || v_tx.id::text,
            jsonb_build_array(
                jsonb_build_object(
                    'account_code', v_debit_code,
                    'account_name', v_debit_name,
                    'debit_amount', v_tx.amount,
                    'credit_amount', 0,
                    'memo', COALESCE(v_tx.description, '')
                ),
                jsonb_build_object(
                    'account_code', v_credit_code,
                    'account_name', v_credit_name,
                    'debit_amount', 0,
                    'credit_amount', v_tx.amount,
                    'memo', COALESCE(v_tx.description, '')
                )
            )
        );
    END IF;

    RETURN to_jsonb(v_tx);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_transaction_status_atomic(
    p_tx_id UUID,
    p_status VARCHAR,
    p_account_code VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_is_service BOOLEAN;
    v_workspace_id UUID;
    v_user_role VARCHAR;
    v_tx public.transactions%ROWTYPE;
    v_corr_code VARCHAR;
    v_corr_name VARCHAR;
    v_debit_code VARCHAR;
    v_debit_name VARCHAR;
    v_credit_code VARCHAR;
    v_credit_name VARCHAR;
    v_je_desc TEXT;
BEGIN
    v_user_id := auth.uid();
    v_is_service := current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin');

    IF v_user_id IS NULL AND NOT v_is_service THEN
        RAISE EXCEPTION 'Kirish taqiqlangan: autentifikatsiyadan o''tilmagan';
    END IF;

    IF p_tx_id IS NULL THEN
        RAISE EXCEPTION 'p_tx_id talab qilinadi';
    END IF;

    SELECT * INTO v_tx
    FROM public.transactions
    WHERE id = p_tx_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tranzaksiya topilmadi: %', p_tx_id;
    END IF;

    SELECT workspace_id INTO v_workspace_id
    FROM public.business_entities
    WHERE id = v_tx.business_entity_id;

    IF v_user_id IS NOT NULL THEN
        IF v_tx.business_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%s) tranzaksiyasini o''zgartira olmaysiz', v_tx.business_entity_id;
        END IF;

        v_user_role := public.get_auth_user_role(v_workspace_id, v_tx.business_entity_id);
        IF v_user_role IS NULL OR v_user_role IN ('auditor', 'viewer') OR v_user_role NOT IN (
            'workspace_owner', 'workspace_admin', 'company_director', 'chief_accountant', 'accountant', 'admin', 'director'
        ) THEN
            RAISE EXCEPTION 'Tranzaksiya holatini o''zgartirish uchun yetarli vakolat yo''q (Rol: %)', COALESCE(v_user_role, 'yo''q');
        END IF;
    END IF;

    UPDATE public.transactions
    SET status = p_status,
        account_code = COALESCE(NULLIF(TRIM(p_account_code), ''), account_code)
    WHERE id = p_tx_id
    RETURNING * INTO v_tx;

    IF p_status = 'posted' AND v_tx.amount > 0 THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.journal_entries
            WHERE business_entity_id = v_tx.business_entity_id
              AND idempotency_key = 'idem-tx-' || v_tx.id::text
        ) THEN
            v_corr_code := COALESCE(
                NULLIF(TRIM(v_tx.account_code), ''),
                CASE WHEN v_tx.type = 'income' THEN '4010' ELSE '6010' END
            );
            v_corr_name := COALESCE(
                NULLIF(TRIM(v_tx.account_name), ''),
                CASE
                    WHEN v_tx.type = 'income' THEN 'Xaridorlar va buyurtmachilardan olinadigan schyotlar'
                    ELSE 'Mol yetkazib beruvchilarga toʻlanadigan schyotlar'
                END
            );

            IF v_tx.type = 'income' THEN
                v_debit_code := '5110';
                v_debit_name := 'Hisob-kitob schyoti (Milliy valyutada)';
                v_credit_code := v_corr_code;
                v_credit_name := v_corr_name;
            ELSE
                v_debit_code := v_corr_code;
                v_debit_name := v_corr_name;
                v_credit_code := '5110';
                v_credit_name := 'Hisob-kitob schyoti (Milliy valyutada)';
            END IF;

            v_je_desc := TRIM(COALESCE(v_tx.counterparty, '')) ||
                CASE WHEN COALESCE(TRIM(v_tx.description), '') <> '' THEN ': ' || TRIM(v_tx.description) ELSE '' END;

            PERFORM public.create_journal_entry_atomic(
                v_tx.business_entity_id,
                'JE-APPR-' || UPPER(SUBSTRING(v_tx.id::text FROM 1 FOR 8)),
                v_tx.date,
                v_je_desc,
                'bank_statement',
                v_tx.id::text,
                'idem-tx-approve-' || v_tx.id::text,
                jsonb_build_array(
                    jsonb_build_object(
                        'account_code', v_debit_code,
                        'account_name', v_debit_name,
                        'debit_amount', v_tx.amount,
                        'credit_amount', 0,
                        'memo', COALESCE(v_tx.description, '')
                    ),
                    jsonb_build_object(
                        'account_code', v_credit_code,
                        'account_name', v_credit_name,
                        'debit_amount', 0,
                        'credit_amount', v_tx.amount,
                        'memo', COALESCE(v_tx.description, '')
                    )
                )
            );
        END IF;
    END IF;

    RETURN to_jsonb(v_tx);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_transaction_with_journal_atomic(UUID, DATE, NUMERIC, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_transaction_with_journal_atomic(UUID, DATE, NUMERIC, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_transaction_status_atomic(UUID, VARCHAR, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_transaction_status_atomic(UUID, VARCHAR, VARCHAR) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- F. TRIAL ANTI-ABUSE DB HARDENING (Verified Email + Required Device Hash)
-- ------------------------------------------------------------------------------
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

    -- 0A. Require authoritative email verification
    IF NOT EXISTS (
        SELECT 1
        FROM auth.users u
        WHERE u.id = v_uid
          AND u.email_confirmed_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Bepul sinov muddatini faollashtirish uchun avval elektron pochtangizni tasdiqlang.';
    END IF;

    -- 0B. Require valid device fingerprint hash
    IF p_device_hash IS NULL OR LENGTH(TRIM(p_device_hash)) < 16 THEN
        RAISE EXCEPTION 'Qurilma identifikatori talab qilinadi.';
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
    SELECT EXISTS (
        SELECT 1 FROM public.trial_claims
        WHERE device_hash = TRIM(p_device_hash)
          AND claimed_at > v_now - INTERVAL '90 days'
    ) INTO v_device_used;

    IF v_device_used THEN
        RAISE EXCEPTION 'Ushbu qurilmada bepul sinov muddati avval faollashtirilgan.';
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
      TRIM(p_device_hash),
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

REVOKE EXECUTE ON FUNCTION public.activate_pro_trial(UUID, VARCHAR, VARCHAR, VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_pro_trial(UUID, VARCHAR, VARCHAR, VARCHAR) TO service_role;
