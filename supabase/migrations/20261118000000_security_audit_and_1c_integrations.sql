-- ==============================================================================
-- FIRMUS — Security Audit Fixes, Distributed Rate Limiting,
--          Atomic Payment Claim RPC & 1C Integrations Schema
-- Migration: 20261118000000_security_audit_and_1c_integrations.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. LIVE FUNCTION UPDATES: Fix PL/pgSQL RAISE '%s' -> '%' Format Placeholders
-- ------------------------------------------------------------------------------

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
    IF auth.uid() IS NOT NULL THEN
        IF p_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%) hisobotlarini ko''rish huquqiga ega emassiz', p_entity_id;
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
    IF auth.uid() IS NOT NULL THEN
        IF p_entity_id NOT IN (SELECT public.get_auth_user_entities()) THEN
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%) bosh kitobini ko''rish huquqiga ega emassiz', p_entity_id;
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
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%) ma''lumotlariga ruxsatga ega emassiz', p_business_entity_id;
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
        RAISE EXCEPTION 'Balanssiz provodka rad etildi: Debet (%) va Kredit (%) summalari teng emas!',
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
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%) ma''lumotlariga ruxsatga ega emassiz', p_business_entity_id;
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
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%) ma''lumotlariga ruxsatga ega emassiz', p_business_entity_id;
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
            RAISE EXCEPTION 'Kirish taqiqlangan: siz bu korxona (%) tranzaksiyasini o''zgartira olmaysiz', v_tx.business_entity_id;
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

-- ------------------------------------------------------------------------------
-- 2. DISTRIBUTED DB RATE LIMITER (public.api_rate_limits + check_rate_limit_atomic)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
    bucket_key TEXT PRIMARY KEY,
    hit_timestamps BIGINT[] NOT NULL DEFAULT '{}'::bigint[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_updated_at
    ON public.api_rate_limits(updated_at);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit_atomic(
    p_bucket_key TEXT,
    p_max_hits INTEGER,
    p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_hits INTEGER := GREATEST(1, COALESCE(p_max_hits, 1));
    v_window_sec INTEGER := GREATEST(1, COALESCE(p_window_seconds, 1));
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint;
    v_cutoff_ms BIGINT;
    v_hits BIGINT[];
    v_fresh BIGINT[];
    v_oldest BIGINT;
    v_retry INTEGER;
BEGIN
    IF p_bucket_key IS NULL OR LENGTH(TRIM(p_bucket_key)) = 0 THEN
        RAISE EXCEPTION 'p_bucket_key talab qilinadi';
    END IF;

    v_cutoff_ms := v_now_ms - (v_window_sec::bigint * 1000);

    INSERT INTO public.api_rate_limits (bucket_key, hit_timestamps, updated_at)
    VALUES (p_bucket_key, '{}'::bigint[], clock_timestamp())
    ON CONFLICT (bucket_key) DO NOTHING;

    SELECT hit_timestamps INTO v_hits
    FROM public.api_rate_limits
    WHERE bucket_key = p_bucket_key
    FOR UPDATE;

    SELECT COALESCE(ARRAY(
        SELECT ts
        FROM unnest(COALESCE(v_hits, '{}'::bigint[])) AS ts
        WHERE ts > v_cutoff_ms
        ORDER BY ts ASC
    ), '{}'::bigint[]) INTO v_fresh;

    IF COALESCE(array_length(v_fresh, 1), 0) >= v_max_hits THEN
        UPDATE public.api_rate_limits
        SET hit_timestamps = v_fresh,
            updated_at = clock_timestamp()
        WHERE bucket_key = p_bucket_key;

        v_oldest := v_fresh[1];
        v_retry := GREATEST(
            1,
            CEIL((v_oldest + (v_window_sec::bigint * 1000) - v_now_ms)::numeric / 1000.0)::integer
        );

        RETURN jsonb_build_object(
            'allowed', false,
            'remaining', 0,
            'retry_after_sec', v_retry
        );
    END IF;

    v_fresh := array_append(COALESCE(v_fresh, '{}'::bigint[]), v_now_ms);

    UPDATE public.api_rate_limits
    SET hit_timestamps = v_fresh,
        updated_at = clock_timestamp()
    WHERE bucket_key = p_bucket_key;

    DELETE FROM public.api_rate_limits
    WHERE updated_at < clock_timestamp() - INTERVAL '24 hours'
      AND random() < 0.02;

    RETURN jsonb_build_object(
        'allowed', true,
        'remaining', GREATEST(0, v_max_hits - COALESCE(array_length(v_fresh, 1), 0)),
        'retry_after_sec', 0
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit_atomic(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit_atomic(TEXT, INTEGER, INTEGER) TO service_role;

-- ------------------------------------------------------------------------------
-- 3. ATOMIC PAYMENT PROVIDER CLAIM RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_payment_provider_transaction(
    p_order_id VARCHAR,
    p_provider_trans_id VARCHAR,
    p_payment_method VARCHAR,
    p_provider_create_time BIGINT DEFAULT NULL,
    p_provider_payload JSONB DEFAULT '{}'::jsonb,
    p_timeout_ms BIGINT DEFAULT 43200000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.billing_orders%ROWTYPE;
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint;
BEGIN
    SELECT * INTO v_order
    FROM public.billing_orders
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('outcome', 'not_found');
    END IF;

    IF v_order.payment_method <> p_payment_method THEN
        RETURN jsonb_build_object(
            'outcome', 'wrong_method',
            'order_status', v_order.status
        );
    END IF;

    IF v_order.status = 'paid' THEN
        RETURN jsonb_build_object(
            'outcome', 'already_paid',
            'order_id', v_order.order_id
        );
    END IF;

    IF v_order.status <> 'pending' THEN
        RETURN jsonb_build_object(
            'outcome', 'invalid_status',
            'order_status', v_order.status
        );
    END IF;

    IF v_order.provider_trans_id IS NOT NULL THEN
        IF v_order.provider_trans_id = p_provider_trans_id THEN
            IF v_order.payment_method = 'payme'
               AND v_order.provider_state = 1
               AND p_timeout_ms > 0
               AND (v_now_ms - COALESCE(v_order.provider_create_time, 0)) > p_timeout_ms THEN
                UPDATE public.billing_orders
                SET status = 'cancelled',
                    provider_state = -1,
                    provider_cancel_reason = 4,
                    provider_cancel_time = v_now_ms,
                    updated_at = clock_timestamp()
                WHERE id = v_order.id;

                RETURN jsonb_build_object('outcome', 'timed_out');
            ELSE
                RETURN jsonb_build_object(
                    'outcome', 'already_same',
                    'provider_state', v_order.provider_state,
                    'provider_create_time', v_order.provider_create_time,
                    'provider_trans_id', v_order.provider_trans_id,
                    'order_uuid', v_order.id
                );
            END IF;
        ELSE
            RETURN jsonb_build_object(
                'outcome', 'conflict',
                'existing_trans_id', v_order.provider_trans_id
            );
        END IF;
    END IF;

    UPDATE public.billing_orders
    SET provider_trans_id = p_provider_trans_id,
        provider_create_time = COALESCE(p_provider_create_time, v_now_ms),
        provider_state = 1,
        provider_payload = COALESCE(p_provider_payload, '{}'::jsonb),
        updated_at = clock_timestamp()
    WHERE id = v_order.id
    RETURNING * INTO v_order;

    RETURN jsonb_build_object(
        'outcome', 'claimed',
        'provider_state', v_order.provider_state,
        'provider_create_time', v_order.provider_create_time,
        'provider_trans_id', v_order.provider_trans_id,
        'order_uuid', v_order.id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_payment_provider_transaction(VARCHAR, VARCHAR, VARCHAR, BIGINT, JSONB, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_provider_transaction(VARCHAR, VARCHAR, VARCHAR, BIGINT, JSONB, BIGINT) TO service_role;

-- ------------------------------------------------------------------------------
-- 4. FIX ai_action_logs_insert RLS + PROFILE / ENTITY BANK FIELDS
-- ------------------------------------------------------------------------------
GRANT ALL ON public.ai_action_logs TO service_role;

DROP POLICY IF EXISTS "ai_action_logs_insert" ON public.ai_action_logs;
CREATE POLICY "ai_action_logs_insert" ON public.ai_action_logs
FOR INSERT TO authenticated
WITH CHECK (
    actor_user_id = auth.uid()
    AND business_entity_id IN (SELECT public.get_auth_user_entities())
    AND EXISTS (
        SELECT 1
        FROM public.business_entities be
        WHERE be.id = ai_action_logs.business_entity_id
          AND (
              public.get_auth_user_role(be.workspace_id, ai_action_logs.business_entity_id) IN (
                  'workspace_owner',
                  'workspace_admin',
                  'company_director',
                  'chief_accountant',
                  'accountant',
                  'admin',
                  'director'
              )
              OR EXISTS (
                  SELECT 1
                  FROM public.workspaces w
                  WHERE w.id = be.workspace_id
                    AND w.owner_user_id = auth.uid()
              )
          )
    )
);

ALTER TABLE public.business_entities
    ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50),
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS bank_mfo VARCHAR(10);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150),
    phone VARCHAR(40),
    job_title VARCHAR(100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_delete_own" ON public.user_profiles;
CREATE POLICY "user_profiles_delete_own" ON public.user_profiles
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 5. 1C INTEGRATIONS, CATALOG CACHE & DRAFT QUEUE TABLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    business_entity_id UUID NOT NULL REFERENCES public.business_entities(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL CHECK (provider IN ('onec_odata', 'onec_epf', 'didox', 'bank_prefs')),
    status VARCHAR(30) NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'pending_pair', 'error', 'disconnected')),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    encrypted_secrets TEXT NULL,
    pairing_code_hash VARCHAR(64) NULL,
    pairing_code_expires_at TIMESTAMPTZ NULL,
    token_hash VARCHAR(64) NULL,
    last_sync_at TIMESTAMPTZ NULL,
    last_error TEXT NULL,
    updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(business_entity_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integration_connections_entity
    ON public.integration_connections(business_entity_id, provider);
CREATE INDEX IF NOT EXISTS idx_integration_connections_token_hash
    ON public.integration_connections(token_hash)
    WHERE token_hash IS NOT NULL;

ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.integration_connections FROM PUBLIC, anon, authenticated;
GRANT SELECT (
    id,
    workspace_id,
    business_entity_id,
    provider,
    status,
    config,
    last_sync_at,
    last_error,
    created_at,
    updated_at
) ON public.integration_connections TO authenticated;
GRANT ALL ON public.integration_connections TO service_role;

DROP POLICY IF EXISTS "integration_connections_select" ON public.integration_connections;
CREATE POLICY "integration_connections_select" ON public.integration_connections
FOR SELECT TO authenticated
USING (business_entity_id IN (SELECT public.get_auth_user_entities()));

CREATE TABLE IF NOT EXISTS public.integration_catalog_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID NOT NULL REFERENCES public.business_entities(id) ON DELETE CASCADE,
    catalog_type VARCHAR(30) NOT NULL CHECK (catalog_type IN ('counterparty', 'contract', 'account', 'nomenclature')),
    external_ref VARCHAR(120) NOT NULL,
    tin_stir VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(60),
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(business_entity_id, catalog_type, external_ref)
);

CREATE INDEX IF NOT EXISTS idx_integration_catalog_cache_entity_type
    ON public.integration_catalog_cache(business_entity_id, catalog_type);

ALTER TABLE public.integration_catalog_cache ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.integration_catalog_cache FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_catalog_cache TO authenticated;
GRANT ALL ON public.integration_catalog_cache TO service_role;

DROP POLICY IF EXISTS "integration_catalog_cache_select" ON public.integration_catalog_cache;
CREATE POLICY "integration_catalog_cache_select" ON public.integration_catalog_cache
FOR SELECT TO authenticated
USING (business_entity_id IN (SELECT public.get_auth_user_entities()));

DROP POLICY IF EXISTS "integration_catalog_cache_insert" ON public.integration_catalog_cache;
CREATE POLICY "integration_catalog_cache_insert" ON public.integration_catalog_cache
FOR INSERT TO authenticated
WITH CHECK (
    business_entity_id IN (SELECT public.get_auth_user_entities())
    AND public.user_can_mutate_workspace(
        (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id)
    )
);

DROP POLICY IF EXISTS "integration_catalog_cache_update" ON public.integration_catalog_cache;
CREATE POLICY "integration_catalog_cache_update" ON public.integration_catalog_cache
FOR UPDATE TO authenticated
USING (
    business_entity_id IN (SELECT public.get_auth_user_entities())
    AND public.user_can_mutate_workspace(
        (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id)
    )
)
WITH CHECK (
    business_entity_id IN (SELECT public.get_auth_user_entities())
    AND public.user_can_mutate_workspace(
        (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id)
    )
);

DROP POLICY IF EXISTS "integration_catalog_cache_delete" ON public.integration_catalog_cache;
CREATE POLICY "integration_catalog_cache_delete" ON public.integration_catalog_cache
FOR DELETE TO authenticated
USING (
    business_entity_id IN (SELECT public.get_auth_user_entities())
    AND public.user_can_mutate_workspace(
        (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id)
    )
);

CREATE TABLE IF NOT EXISTS public.onec_draft_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID NOT NULL REFERENCES public.business_entities(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    source_kind VARCHAR(30) NOT NULL CHECK (source_kind IN ('bank_reconcile', 'document_scan', 'didox_import', 'manual')),
    external_idempotency_key VARCHAR(120) NOT NULL,
    doc_type VARCHAR(40) NOT NULL CHECK (doc_type IN ('bank_receipt', 'bank_payment', 'purchase_invoice', 'advance_report', 'journal_operation')),
    doc_date DATE NOT NULL,
    counterparty_name VARCHAR(255) NOT NULL,
    counterparty_stir VARCHAR(20),
    amount NUMERIC(19, 4) NOT NULL CHECK (amount >= 0),
    vat_amount NUMERIC(19, 4) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    debit_account VARCHAR(20) NOT NULL,
    credit_account VARCHAR(20) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'pushed_to_1c_draft', 'failed', 'cancelled')),
    target_1c_doc_number VARCHAR(80),
    target_1c_ref_key VARCHAR(120),
    error_message TEXT,
    pushed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(business_entity_id, external_idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_onec_draft_queue_entity_status
    ON public.onec_draft_queue(business_entity_id, status, created_at DESC);

ALTER TABLE public.onec_draft_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.onec_draft_queue FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onec_draft_queue TO authenticated;
GRANT ALL ON public.onec_draft_queue TO service_role;

DROP POLICY IF EXISTS "onec_draft_queue_select" ON public.onec_draft_queue;
CREATE POLICY "onec_draft_queue_select" ON public.onec_draft_queue
FOR SELECT TO authenticated
USING (business_entity_id IN (SELECT public.get_auth_user_entities()));

DROP POLICY IF EXISTS "onec_draft_queue_insert" ON public.onec_draft_queue;
CREATE POLICY "onec_draft_queue_insert" ON public.onec_draft_queue
FOR INSERT TO authenticated
WITH CHECK (
    business_entity_id IN (SELECT public.get_auth_user_entities())
    AND (created_by IS NULL OR created_by = auth.uid())
    AND public.user_can_mutate_workspace(
        (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id)
    )
);

DROP POLICY IF EXISTS "onec_draft_queue_update" ON public.onec_draft_queue;
CREATE POLICY "onec_draft_queue_update" ON public.onec_draft_queue
FOR UPDATE TO authenticated
USING (
    business_entity_id IN (SELECT public.get_auth_user_entities())
    AND public.user_can_mutate_workspace(
        (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id)
    )
)
WITH CHECK (
    business_entity_id IN (SELECT public.get_auth_user_entities())
    AND public.user_can_mutate_workspace(
        (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id)
    )
);

DROP POLICY IF EXISTS "onec_draft_queue_delete" ON public.onec_draft_queue;
CREATE POLICY "onec_draft_queue_delete" ON public.onec_draft_queue
FOR DELETE TO authenticated
USING (
    business_entity_id IN (SELECT public.get_auth_user_entities())
    AND public.user_can_mutate_workspace(
        (SELECT be.workspace_id FROM public.business_entities be WHERE be.id = business_entity_id)
    )
);
