-- ==============================================================================
-- FIRMUS — PHASE 2: ACCOUNTING ENGINE HARDENING & SECURITY REVIEW
-- Migration: 20261116020000_accounting_engine_hardening.sql
-- Description:
--   1. Strict authentication & role checks on all accounting RPCs (disallow anon).
--   2. Multi-tenant isolation in get_trial_balance & get_general_ledger (prevent leak).
--   3. Idempotency race-condition handling & payload-mismatch detection.
--   4. Reversal safeguards (block double reversal & reversing a reversal).
--   5. REVOKE execute from PUBLIC/anon, GRANT to authenticated/service_role only.
-- ==============================================================================

-- 1. HARDENED ATOMIC JOURNAL ENTRY RPC
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
    -- 1. Strict Authentication Check
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Kirish taqiqlangan: autentifikatsiyadan o''tilmagan (Foydalanuvchi tizimga kirmagan)';
    END IF;

    -- 2. Multi-Tenant & Role Authorization Check
    IF v_user_id IS NOT NULL THEN
        IF p_business_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%s) ma''lumotlariga ruxsatga ega emassiz', p_business_entity_id;
        END IF;
        
        SELECT workspace_id INTO v_workspace_id FROM public.business_entities WHERE id = p_business_entity_id;
        v_user_role := public.get_auth_user_role(v_workspace_id);
        
        IF v_user_role = 'auditor' THEN
            RAISE EXCEPTION 'Auditor roli provodka yaratish huquqiga ega emas (Faqat o''qish mumkin)';
        END IF;
        
        IF v_user_role NOT IN ('admin', 'director', 'chief_accountant', 'accountant') THEN
            RAISE EXCEPTION 'Provodka yaratish uchun yetarli vakolat yo''q (Rol: %s)', v_user_role;
        END IF;
    END IF;

    -- 3. Validate line count
    IF p_lines IS NULL OR jsonb_array_length(p_lines) < 2 THEN
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
            RAISE EXCEPTION 'Bitta qatorda bir vaqtning o''zida ham debet, ham kredit bo''lishi mumkin emas (schyot %)', v_account_code;
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
        RAISE EXCEPTION 'Balanssiz provodka rad etildi: Debet (%s) va Kredit (%s) summalari teng emas!',
            v_total_debit, v_total_credit;
    END IF;

    IF v_total_debit <= 0 THEN
        RAISE EXCEPTION 'Provodka summasi 0 dan katta bo''lishi shart';
    END IF;

    -- 6. Idempotency Check with Payload Mismatch Protection
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        SELECT id, business_entity_id, entry_number, entry_date, status, description, total_debit, total_credit, posted_at
        INTO v_existing_rec 
        FROM public.journal_entries 
        WHERE business_entity_id = p_business_entity_id AND idempotency_key = TRIM(p_idempotency_key);
        
        IF v_existing_rec.id IS NOT NULL THEN
            -- Check for payload mismatch
            IF v_existing_rec.total_debit <> v_total_debit THEN
                RAISE EXCEPTION 'Idempotency kaliti boshqa so''rov uchun ishlatilgan (Payload mismatch: berilgan kalit % summadagi boshqa provodkaga tegishli)', v_existing_rec.total_debit;
            END IF;

            SELECT jsonb_build_object(
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
            ) INTO v_result;
            
            RETURN v_result;
        END IF;
    END IF;

    -- 7. Insert Journal Entry (with concurrency conflict handling)
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
        -- If concurrent request with same idempotency key inserted in parallel
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

    -- 8. Insert Journal Lines
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

    -- 9. Return Result
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

-- 2. HARDENED REVERSAL ENTRY (STORNO) RPC
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
    -- Strict Authentication
    v_user_id := auth.uid();
    IF v_user_id IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Kirish taqiqlangan: autentifikatsiyadan o''tilmagan';
    END IF;

    SELECT * INTO v_orig FROM public.journal_entries WHERE id = p_entry_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Provodka topilmadi: %', p_entry_id;
    END IF;

    -- Safeguard 1: Disallow reversing a reversal entry
    IF v_orig.source_type = 'reversal' OR v_orig.reversal_of_id IS NOT NULL THEN
        RAISE EXCEPTION 'Storno provodkasini qayta storno qilish taqiqlangan: bu provodka allaqachon boshqa provodkani qaytarish uchun yaratilgan';
    END IF;

    -- Safeguard 2: Disallow double-reversal
    IF v_orig.status <> 'posted' THEN
        RAISE EXCEPTION 'Faqat tasdiqlangan (posted) provodkani storno qilish mumkin. Bu provodka allaqachon bekor qilingan (Joriy holat: %)', v_orig.status;
    END IF;

    -- Multi-tenant and Role Authorization
    IF v_user_id IS NOT NULL THEN
        IF v_orig.business_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Ruxsat berilmagan: siz boshqa korxonaning provodkasini bekor qila olmaysiz';
        END IF;

        SELECT workspace_id INTO v_workspace_id FROM public.business_entities WHERE id = v_orig.business_entity_id;
        v_user_role := public.get_auth_user_role(v_workspace_id);
        IF v_user_role NOT IN ('admin', 'director', 'chief_accountant') THEN
            RAISE EXCEPTION 'Provodkani storno qilish uchun faqat Bosh buxgalter yoki Rahbar ruxsatga ega (Sizning rolingiz: %)', v_user_role;
        END IF;
    END IF;

    v_rev_entry_number := v_orig.entry_number || '-REV';

    -- Create inverse reversal entry
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

    -- Mark original entry as reversed
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

-- 3. HARDENED TRIAL BALANCE (WITH TENANT BOUNDARY CHECK)
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
    -- Strict Tenant Boundary Check
    IF auth.uid() IS NOT NULL THEN
        IF p_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%s) hisobotlarini ko''rish huquqiga ega emassiz', p_entity_id;
        END IF;
    ELSIF current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Kirish taqiqlangan: autentifikatsiyadan o''tilmagan';
    END IF;

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

-- 4. HARDENED GENERAL LEDGER (WITH TENANT BOUNDARY CHECK)
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
    -- Strict Tenant Boundary Check
    IF auth.uid() IS NOT NULL THEN
        IF p_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%s) bosh kitobini ko''rish huquqiga ega emassiz', p_entity_id;
        END IF;
    ELSIF current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Kirish taqiqlangan: autentifikatsiyadan o''tilmagan';
    END IF;

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

-- 5. REVOKE DANGEROUS EXECUTE PRIVILEGES FROM PUBLIC AND ANON
REVOKE EXECUTE ON FUNCTION public.create_journal_entry_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_journal_entry_atomic TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reverse_journal_entry FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_journal_entry TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_trial_balance FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trial_balance TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_general_ledger FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_general_ledger TO authenticated, service_role;
