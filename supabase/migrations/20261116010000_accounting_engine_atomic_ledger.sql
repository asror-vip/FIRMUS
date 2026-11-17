-- ==============================================================================
-- FIRMUS — PHASE 2: ACCOUNTING ENGINE & LEDGER INTEGRITY MIGRATION
-- Migration: 20261116010000_accounting_engine_atomic_ledger.sql
-- Description:
--   1. Schema enhancements on journal_entries & journal_lines (idempotency, totals, audit).
--   2. Immutability triggers to prevent altering or deleting posted entries.
--   3. create_journal_entry_atomic: Atomic double-entry RPC (Debit == Credit, Rollback, RBAC).
--   4. reverse_journal_entry: Accounting reversal (Storno) mechanism.
--   5. get_trial_balance & get_general_ledger: Real database aggregation engines.
--   6. Standard Uzbek BHMS-21 Chart of Accounts seed for business entities.
-- ==============================================================================

-- 1. SCHEMA ENHANCEMENTS
ALTER TABLE public.journal_entries 
    ADD COLUMN IF NOT EXISTS total_debit NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    ADD COLUMN IF NOT EXISTS total_credit NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100),
    ADD COLUMN IF NOT EXISTS reversal_of_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Indexes for performance & integrity
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_entity_entry_number 
    ON public.journal_entries(business_entity_id, entry_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_idempotency 
    ON public.journal_entries(business_entity_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_journal_lines_account_code 
    ON public.journal_lines(account_code);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id 
    ON public.journal_lines(journal_entry_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_date 
    ON public.journal_entries(business_entity_id, entry_date);

-- 2. IMMUTABILITY RULES (Protect historical posted ledger)
CREATE OR REPLACE FUNCTION public.check_journal_entry_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Allow updating status from 'posted' to 'reversed' only
        IF OLD.status = 'posted' AND (NEW.status <> 'reversed' OR OLD.entry_number <> NEW.entry_number OR OLD.business_entity_id <> NEW.business_entity_id) THEN
            RAISE EXCEPTION 'Tasdiqlangan (posted) provodkani to''g''ridan-to''g''ri o''zgartirish mumkin emas. Qaytarish (reversal) mexanizmidan foydalaning.';
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'posted' THEN
            RAISE EXCEPTION 'Tasdiqlangan (posted) provodkani o''chirish taqiqlangan. Qaytarish (reversal) mexanizmidan foydalaning.';
        END IF;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_entry_immutable ON public.journal_entries;
CREATE TRIGGER trg_journal_entry_immutable
    BEFORE UPDATE OR DELETE ON public.journal_entries
    FOR EACH ROW EXECUTE FUNCTION public.check_journal_entry_immutable();

-- Protect lines belonging to posted entries
CREATE OR REPLACE FUNCTION public.check_journal_lines_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT status INTO v_status 
    FROM public.journal_entries 
    WHERE id = COALESCE(OLD.journal_entry_id, NEW.journal_entry_id);

    IF v_status = 'posted' THEN
        RAISE EXCEPTION 'Tasdiqlangan provodka qatorlarini (journal lines) to''g''ridan-to''g''ri o''zgartirish yoki o''chirish taqiqlangan.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_lines_immutable ON public.journal_lines;
CREATE TRIGGER trg_journal_lines_immutable
    BEFORE UPDATE OR DELETE ON public.journal_lines
    FOR EACH ROW EXECUTE FUNCTION public.check_journal_lines_immutable();

-- 3. ATOMIC DOUBLE-ENTRY RPC FUNCTION
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
    v_existing_id UUID;
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
    -- 1. Security Check: caller must have access to business_entity_id
    v_user_id := auth.uid();
    
    IF v_user_id IS NOT NULL THEN
        IF p_business_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%) ma''lumotlariga ruxsatga ega emassiz', p_business_entity_id;
        END IF;
        
        -- Check caller role
        SELECT workspace_id INTO v_workspace_id FROM public.business_entities WHERE id = p_business_entity_id;
        v_user_role := public.get_auth_user_role(v_workspace_id);
        
        IF v_user_role = 'auditor' THEN
            RAISE EXCEPTION 'Auditor roli provodka yaratish huquqiga ega emas (Faqat o''qish mumkin)';
        END IF;
        
        IF v_user_role NOT IN ('admin', 'director', 'chief_accountant', 'accountant') THEN
            RAISE EXCEPTION 'Provodka yaratish uchun yetarli vakolat yo''q (Rol: %)', v_user_role;
        END IF;
    END IF;

    -- 2. Idempotency Check
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        SELECT id INTO v_existing_id 
        FROM public.journal_entries 
        WHERE business_entity_id = p_business_entity_id AND idempotency_key = TRIM(p_idempotency_key);
        
        IF v_existing_id IS NOT NULL THEN
            SELECT jsonb_build_object(
                'id', je.id,
                'business_entity_id', je.business_entity_id,
                'entry_number', je.entry_number,
                'entry_date', je.entry_date,
                'status', je.status,
                'description', je.description,
                'total_debit', je.total_debit,
                'total_credit', je.total_credit,
                'is_duplicate', true
            ) INTO v_result
            FROM public.journal_entries je
            WHERE je.id = v_existing_id;
            
            RETURN v_result;
        END IF;
    END IF;

    -- 3. Validate line count
    IF jsonb_array_length(p_lines) < 2 THEN
        RAISE EXCEPTION 'Ikkiyoqlama yozuv (Double-entry) qoidasi bo''yicha kamida 2 ta qator (debet va kredit) bo''lishi shart';
    END IF;

    -- 4. Calculate sums and validate accounts
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
            RAISE EXCEPTION 'Bitta qatorda ham debet, ham kredit bo''lishi mumkin emas (schyot %)', v_account_code;
        END IF;

        -- Verify account exists in chart_of_accounts
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

    -- 5. Strict Balance Check: Debit MUST EQUAL Credit
    IF v_total_debit <> v_total_credit THEN
        RAISE EXCEPTION 'Balanssiz provodka rad etildi: Debet (%) va Kredit (%) summalari teng emas!',
            v_total_debit, v_total_credit;
    END IF;

    IF v_total_debit <= 0 THEN
        RAISE EXCEPTION 'Provodka summasi 0 dan katta bo''lishi shart';
    END IF;

    -- 6. Insert Journal Entry
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

    -- 7. Insert Journal Lines
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

    -- 8. Return constructed result
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

-- 4. REVERSAL ENTRY (STORNO) RPC FUNCTION
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
    SELECT * INTO v_orig FROM public.journal_entries WHERE id = p_entry_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Provodka topilmadi: %', p_entry_id;
    END IF;

    IF v_orig.status <> 'posted' THEN
        RAISE EXCEPTION 'Faqat tasdiqlangan (posted) provodkani storno qilish mumkin. Joriy holat: %', v_orig.status;
    END IF;

    -- Security check
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        IF v_orig.business_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Ruxsat berilmagan: bu korxona provodkasini bekor qila olmaysiz';
        END IF;

        SELECT workspace_id INTO v_workspace_id FROM public.business_entities WHERE id = v_orig.business_entity_id;
        v_user_role := public.get_auth_user_role(v_workspace_id);
        IF v_user_role NOT IN ('admin', 'director', 'chief_accountant') THEN
            RAISE EXCEPTION 'Provodkani storno qilish uchun faqat Bosh buxgalter yoki Rahbar ruxsatga ega (Sizning rolingiz: %)', v_user_role;
        END IF;
    END IF;

    v_rev_entry_number := v_orig.entry_number || '-REV';

    -- Create inverse entry (reversal)
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

    -- Invert lines: original debit becomes credit, original credit becomes debit
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

    -- Update original status to reversed
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

-- 5. REAL DATABASE TRIAL BALANCE ENGINE
CREATE OR REPLACE FUNCTION public.get_trial_balance(
    p_entity_id UUID,
    p_from_date DATE DEFAULT '1970-01-01',
    p_to_date DATE DEFAULT '2099-12-31'
)
RETURNS TABLE (
    account_code VARCHAR,
    account_name VARCHAR,
    account_type VARCHAR,
    opening_debit NUMERIC,
    opening_credit NUMERIC,
    period_debit NUMERIC,
    period_credit NUMERIC,
    closing_debit NUMERIC,
    closing_credit NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH account_lines AS (
        SELECT 
            jl.account_code,
            jl.account_name,
            je.entry_date,
            jl.debit_amount,
            jl.credit_amount
        FROM public.journal_lines jl
        JOIN public.journal_entries je ON je.id = jl.journal_entry_id
        WHERE je.business_entity_id = p_entity_id
          AND je.status IN ('posted', 'reversed')
    ),
    coa AS (
        SELECT 
            c.code,
            c.name,
            c.type
        FROM public.chart_of_accounts c
        WHERE (c.business_entity_id = p_entity_id OR c.business_entity_id IS NULL)
          AND c.is_active = true
    )
    SELECT 
        coa.code AS account_code,
        coa.name AS account_name,
        coa.type AS account_type,
        GREATEST(0, COALESCE(SUM(CASE WHEN al.entry_date < p_from_date THEN al.debit_amount - al.credit_amount ELSE 0 END), 0)) AS opening_debit,
        GREATEST(0, COALESCE(SUM(CASE WHEN al.entry_date < p_from_date THEN al.credit_amount - al.debit_amount ELSE 0 END), 0)) AS opening_credit,
        COALESCE(SUM(CASE WHEN al.entry_date >= p_from_date AND al.entry_date <= p_to_date THEN al.debit_amount ELSE 0 END), 0) AS period_debit,
        COALESCE(SUM(CASE WHEN al.entry_date >= p_from_date AND al.entry_date <= p_to_date THEN al.credit_amount ELSE 0 END), 0) AS period_credit,
        GREATEST(0, COALESCE(SUM(CASE WHEN al.entry_date <= p_to_date THEN al.debit_amount - al.credit_amount ELSE 0 END), 0)) AS closing_debit,
        GREATEST(0, COALESCE(SUM(CASE WHEN al.entry_date <= p_to_date THEN al.credit_amount - al.debit_amount ELSE 0 END), 0)) AS closing_credit
    FROM coa
    LEFT JOIN account_lines al ON al.account_code = coa.code
    GROUP BY coa.code, coa.name, coa.type
    ORDER BY coa.code ASC;
END;
$$;

-- 6. REAL DATABASE GENERAL LEDGER ENGINE
CREATE OR REPLACE FUNCTION public.get_general_ledger(
    p_entity_id UUID,
    p_account_code VARCHAR,
    p_from_date DATE DEFAULT '1970-01-01',
    p_to_date DATE DEFAULT '2099-12-31'
)
RETURNS TABLE (
    entry_id UUID,
    entry_number VARCHAR,
    entry_date DATE,
    description TEXT,
    source_type VARCHAR,
    correspondent_code VARCHAR,
    debit_amount NUMERIC,
    credit_amount NUMERIC,
    running_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH target_lines AS (
        SELECT 
            je.id AS t_entry_id,
            je.entry_number AS t_entry_number,
            je.entry_date AS t_entry_date,
            je.description AS t_description,
            je.source_type AS t_source_type,
            jl.id AS t_line_id,
            jl.debit_amount AS t_debit,
            jl.credit_amount AS t_credit,
            (
                SELECT jl_corr.account_code 
                FROM public.journal_lines jl_corr 
                WHERE jl_corr.journal_entry_id = je.id 
                  AND jl_corr.id <> jl.id 
                LIMIT 1
            ) AS t_corr_code
        FROM public.journal_lines jl
        JOIN public.journal_entries je ON je.id = jl.journal_entry_id
        WHERE je.business_entity_id = p_entity_id
          AND jl.account_code = p_account_code
          AND je.status IN ('posted', 'reversed')
          AND je.entry_date >= p_from_date
          AND je.entry_date <= p_to_date
        ORDER BY je.entry_date ASC, je.created_at ASC
    )
    SELECT 
        tl.t_entry_id AS entry_id,
        tl.t_entry_number AS entry_number,
        tl.t_entry_date AS entry_date,
        tl.t_description AS description,
        tl.t_source_type AS source_type,
        COALESCE(tl.t_corr_code, '—') AS correspondent_code,
        tl.t_debit AS debit_amount,
        tl.t_credit AS credit_amount,
        SUM(tl.t_debit - tl.t_credit) OVER (ORDER BY tl.t_entry_date ASC, tl.t_line_id ASC) AS running_balance
    FROM target_lines tl;
END;
$$;

-- 7. SEED COMPLETE STANDARD UZBEK BHMS (21-SON BHMS) CHART OF ACCOUNTS
DO $$
DECLARE
    ent_record RECORD;
BEGIN
    FOR ent_record IN SELECT id FROM public.business_entities
    LOOP
        INSERT INTO public.chart_of_accounts (business_entity_id, code, name, type, is_active)
        VALUES
            (ent_record.id, '0100', 'Asosiy vositalar', 'asset', true),
            (ent_record.id, '0820', 'Asosiy vositalarni sotib olish', 'asset', true),
            (ent_record.id, '1010', 'Xomashyo va materiallar', 'asset', true),
            (ent_record.id, '1030', 'Yoqilg''i va moylash materiallari', 'asset', true),
            (ent_record.id, '2810', 'Ombordagi tayyor mahsulotlar', 'asset', true),
            (ent_record.id, '4310', 'Yetkazib beruvchilarga berilgan bo''naklar (Avanslar)', 'asset', true),
            (ent_record.id, '4410', 'Budjetga oldindan to''langan soliqlar (QQS)', 'asset', true),
            (ent_record.id, '5010', 'Milliy valyutadagi naqd pullar (Kassa)', 'asset', true),
            (ent_record.id, '6310', 'Xaridorlardan olingan bo''naklar (Avanslar)', 'liability', true),
            (ent_record.id, '8330', 'Ustav kapitali', 'equity', true),
            (ent_record.id, '8710', 'Taqsimlanmagan foyda (Qoplanmagan zarar)', 'equity', true),
            (ent_record.id, '9110', 'Sotilgan mahsulotlar tannarxi', 'expense', true),
            (ent_record.id, '9430', 'Boshqa operatsion xarajatlar (Bank komissiyasi)', 'expense', true)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
