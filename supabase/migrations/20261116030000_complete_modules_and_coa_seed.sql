-- ==============================================================================
-- FIRMUS — PHASE 3: COMPLETE OPERATIONAL MODULES, COA AUTO-SEED & WORKSPACE RPC
-- Migration: 20261116030000_complete_modules_and_coa_seed.sql
-- Description:
--   1. Backfill all 22 core BHMS accounts for every existing business entity.
--   2. Add trigger on business_entities to auto-seed core COA + default integrations.
--   3. Expand exceptions.status CHECK constraint to support 'in_review'.
--   4. Add assigned_entity_ids & phone verification columns to team_members.
--   5. Align RLS & RPC roles with frontend roles (workspace_owner, company_director).
--   6. Add create_workspace_with_owner atomic RPC.
-- ==============================================================================

-- 1. Helper function to seed core BHMS-21 operational accounts for a specific entity
CREATE OR REPLACE FUNCTION public.seed_default_coa_for_entity(p_entity_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.chart_of_accounts (business_entity_id, code, name, type, is_active)
    SELECT p_entity_id, v.code, v.name, v.acc_type, true
    FROM (VALUES
        ('0100', 'Asosiy vositalar', 'asset'),
        ('0820', 'Asosiy vositalarni sotib olish', 'asset'),
        ('1010', 'Xomashyo va materiallar', 'asset'),
        ('1030', 'Yoqilg''i va moylash materiallari', 'asset'),
        ('2810', 'Ombordagi tayyor mahsulotlar', 'asset'),
        ('2910', 'Ombordagi tovarlar', 'asset'),
        ('4010', 'Xaridorlar va buyurtmachilardan olinadigan schyotlar', 'asset'),
        ('4310', 'Yetkazib beruvchilarga berilgan bo''naklar (Avanslar)', 'asset'),
        ('4410', 'Budjetga oldindan to''langan soliqlar (QQS)', 'asset'),
        ('5010', 'Milliy valyutadagi naqd pullar (Kassa)', 'asset'),
        ('5110', 'Hisob-kitob schyoti (Milliy valyutada)', 'asset'),
        ('5210', 'Valyuta schyotlari', 'asset'),
        ('6010', 'Mol yetkazib beruvchilarga to''lanadigan schyotlar', 'liability'),
        ('6310', 'Xaridorlardan olingan bo''naklar (Avanslar)', 'liability'),
        ('6410', 'Budjetga to''lovlar bo''yicha qarzlar (Soliqlar)', 'liability'),
        ('6710', 'Mehnat haqi bo''yicha xodimlar bilan hisob-kitoblar', 'liability'),
        ('8330', 'Ustav kapitali', 'equity'),
        ('8710', 'Taqsimlanmagan foyda (Qoplanmagan zarar)', 'equity'),
        ('9010', 'Tayyor mahsulotlarni sotishdan daromadlar', 'revenue'),
        ('9110', 'Sotilgan mahsulotlar tannarxi', 'expense'),
        ('9420', 'Ma''muriy xarajatlar', 'expense'),
        ('9430', 'Boshqa operatsion xarajatlar (Bank komissiyasi)', 'expense')
    ) AS v(code, name, acc_type)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.chart_of_accounts c
        WHERE c.business_entity_id = p_entity_id AND c.code = v.code
    );
END;
$$;

-- Backfill all existing business entities so every entity has complete core accounts
DO $$
DECLARE
    ent RECORD;
BEGIN
    FOR ent IN SELECT id FROM public.business_entities
    LOOP
        PERFORM public.seed_default_coa_for_entity(ent.id);
    END LOOP;
END $$;

-- Auto-seed core COA & default integrations whenever a new business entity is created
CREATE OR REPLACE FUNCTION public.handle_new_business_entity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.seed_default_coa_for_entity(NEW.id);

    INSERT INTO public.integrations (business_entity_id, provider, name, category, description, status)
    VALUES
        (NEW.id, 'didox', 'Didox E-SF (Faktura.uz)', 'edo', 'Elektron hisob-faktura va shartnomalar almashinuvi', 'disconnected'),
        (NEW.id, '1c_enterprise', '1C:Enterprise 8.3 Bukhgalteriya', 'erp', 'OData va XML provodkalar sinxronizatsiyasi', 'disconnected'),
        (NEW.id, 'bank_api', 'Tijorat banklari Open Banking', 'bank', 'Bank ko''chirmalarini yuklash va solishtirish', 'disconnected'),
        (NEW.id, 'soliq_uz', 'Soliq.uz (Yagona Darcha)', 'tax', 'QQS, JShDS va soliq kalendari integratsiyasi', 'disconnected');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_business_entity_insert ON public.business_entities;
CREATE TRIGGER trg_after_business_entity_insert
    AFTER INSERT ON public.business_entities
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_business_entity();

-- 2. Expand exceptions status constraint to support 'in_review'
ALTER TABLE public.exceptions DROP CONSTRAINT IF EXISTS exceptions_status_check;
ALTER TABLE public.exceptions ADD CONSTRAINT exceptions_status_check
    CHECK (status IN ('open', 'in_review', 'resolved', 'ignored'));

-- 3. Additive team_members columns for entity assignment persistence & phone verification
ALTER TABLE public.team_members
    ADD COLUMN IF NOT EXISTS assigned_entity_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- 4. Expand RLS policies so workspace_owner & company_director also match admin/director/chief_accountant
DROP POLICY IF EXISTS "workspaces_update" ON public.workspaces;
CREATE POLICY "workspaces_update" ON public.workspaces
FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid() OR public.get_auth_user_role(id) IN ('admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant'))
WITH CHECK (owner_user_id = auth.uid() OR public.get_auth_user_role(id) IN ('admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant'));

DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
CREATE POLICY "team_members_insert" ON public.team_members
FOR INSERT TO authenticated
WITH CHECK (public.get_auth_user_role(workspace_id) IN ('admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant'));

DROP POLICY IF EXISTS "team_members_update" ON public.team_members;
CREATE POLICY "team_members_update" ON public.team_members
FOR UPDATE TO authenticated
USING (public.get_auth_user_role(workspace_id) IN ('admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant') OR user_id = auth.uid())
WITH CHECK (public.get_auth_user_role(workspace_id) IN ('admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant') OR user_id = auth.uid());

DROP POLICY IF EXISTS "business_entities_insert" ON public.business_entities;
CREATE POLICY "business_entities_insert" ON public.business_entities
FOR INSERT TO authenticated
WITH CHECK (
    workspace_id IN (SELECT public.get_auth_user_workspaces())
    AND public.get_auth_user_role(workspace_id) IN ('admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant')
);

DROP POLICY IF EXISTS "business_entities_update" ON public.business_entities;
CREATE POLICY "business_entities_update" ON public.business_entities
FOR UPDATE TO authenticated
USING (
    id IN (SELECT public.get_auth_user_entities())
    AND public.get_auth_user_role(workspace_id) IN ('admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant')
)
WITH CHECK (
    id IN (SELECT public.get_auth_user_entities())
    AND public.get_auth_user_role(workspace_id) IN ('admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant')
);

-- Update Accounting RPC role checks to recognize workspace_owner & company_director
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
    IF v_user_id IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Kirish taqiqlangan: autentifikatsiyadan o''tilmagan (Foydalanuvchi tizimga kirmagan)';
    END IF;

    IF v_user_id IS NOT NULL THEN
        IF p_business_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%s) ma''lumotlariga ruxsatga ega emassiz', p_business_entity_id;
        END IF;

        SELECT workspace_id INTO v_workspace_id FROM public.business_entities WHERE id = p_business_entity_id;
        v_user_role := public.get_auth_user_role(v_workspace_id);

        IF v_user_role IN ('auditor', 'viewer') THEN
            RAISE EXCEPTION 'Auditor roli provodka yaratish huquqiga ega emas (Faqat o''qish mumkin)';
        END IF;

        IF v_user_role NOT IN ('admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant', 'accountant') THEN
            RAISE EXCEPTION 'Provodka yaratish uchun yetarli vakolat yo''q (Rol: %s)', v_user_role;
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
        RAISE EXCEPTION 'Balanssiz provodka rad etildi: Debet (%s) va Kredit (%s) summalari teng emas!', v_total_debit, v_total_credit;
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
        v_account_name := COALESCE(v_line->>'account_name', (
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

-- Update reverse_journal_entry to recognize workspace_owner & company_director
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
    v_workspace_id UUID;
    v_user_role VARCHAR;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Kirish taqiqlangan: autentifikatsiyadan o''tilmagan';
    END IF;

    SELECT * INTO v_orig FROM public.journal_entries WHERE id = p_entry_id;
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

        SELECT workspace_id INTO v_workspace_id FROM public.business_entities WHERE id = v_orig.business_entity_id;
        v_user_role := public.get_auth_user_role(v_workspace_id);
        IF v_user_role NOT IN ('admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant') THEN
            RAISE EXCEPTION 'Provodkani storno qilish uchun faqat Bosh buxgalter yoki Rahbar ruxsatga ega (Sizning rolingiz: %)', v_user_role;
        END IF;
    END IF;

    v_rev_entry_number := v_orig.entry_number || '-REV';

    INSERT INTO public.journal_entries (
        business_entity_id, entry_number, entry_date, status, description,
        source_type, source_reference_id, posted_at, total_debit, total_credit,
        reversal_of_id, created_by_user_id
    ) VALUES (
        v_orig.business_entity_id, v_rev_entry_number, CURRENT_DATE, 'posted',
        'STORNO: ' || v_orig.description || ' [Sabab: ' || p_reason || ']',
        'reversal', v_orig.entry_number, clock_timestamp(), v_orig.total_debit, v_orig.total_credit,
        v_orig.id, v_user_id
    ) RETURNING id INTO v_rev_entry_id;

    FOR v_line IN SELECT * FROM public.journal_lines WHERE journal_entry_id = v_orig.id
    LOOP
        INSERT INTO public.journal_lines (
            journal_entry_id, account_code, account_name, debit_amount, credit_amount, memo
        ) VALUES (
            v_rev_entry_id, v_line.account_code, v_line.account_name,
            v_line.credit_amount, v_line.debit_amount,
            'Storno: ' || COALESCE(v_line.memo, '')
        );
    END LOOP;

    UPDATE public.journal_entries SET status = 'reversed' WHERE id = v_orig.id;

    RETURN jsonb_build_object(
        'success', true,
        'original_entry_id', v_orig.id,
        'reversal_entry_id', v_rev_entry_id,
        'reversal_entry_number', v_rev_entry_number,
        'status', 'reversed'
    );
END;
$$;

-- 5. Atomic Workspace Creation RPC
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
    p_name VARCHAR,
    p_type VARCHAR DEFAULT 'accounting_firm'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_email VARCHAR;
    v_full_name VARCHAR;
    v_ws_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Autentifikatsiya talab qilinadi';
    END IF;

    SELECT email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1))
    INTO v_email, v_full_name
    FROM auth.users WHERE id = v_user_id;

    INSERT INTO public.workspaces (name, type, owner_user_id, plan_id)
    VALUES (TRIM(p_name), COALESCE(p_type, 'accounting_firm'), v_user_id, 'professional')
    RETURNING id INTO v_ws_id;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO public.team_members (workspace_id, user_id, name, email, role, status, assigned_companies_count)
        VALUES (v_ws_id, v_user_id, COALESCE(v_full_name, 'Rahbar'), COALESCE(v_email, 'owner@firmus.uz'), 'workspace_owner', 'active', 0);
    END IF;

    RETURN jsonb_build_object(
        'id', v_ws_id,
        'name', TRIM(p_name),
        'type', COALESCE(p_type, 'accounting_firm'),
        'plan_id', 'professional'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_workspace_with_owner FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_journal_entry_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_journal_entry_atomic TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reverse_journal_entry FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_journal_entry TO authenticated, service_role;
