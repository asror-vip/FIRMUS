-- =========================================================================
-- FIRMUS: Phase 3 Production — Eskiz SMS OTP, Storage Bucket & Period Closing
-- Strictly additive & idempotent migration
-- =========================================================================

-- 1. Server-only Phone OTP Verification Log (Eskiz.uz)
CREATE TABLE IF NOT EXISTS public.phone_otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(128) NOT NULL,
    provider VARCHAR(30) NOT NULL DEFAULT 'eskiz',
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_user_created
    ON public.phone_otp_verifications (user_id, created_at DESC);

ALTER TABLE public.phone_otp_verifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.phone_otp_verifications FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.phone_otp_verifications TO service_role;

-- 2. Documents file metadata columns
ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS file_size VARCHAR(64);

-- 2B. Ensure business_entities_select works cleanly on INSERT ... RETURNING * (MVCC snapshot)
DROP POLICY IF EXISTS "business_entities_select" ON public.business_entities;
CREATE POLICY "business_entities_select" ON public.business_entities
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT public.get_auth_user_workspaces()));

-- 3. Private Supabase Storage Bucket for PDFs & Scans
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    15728640, -- 15 MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/xml', 'text/xml', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
CREATE POLICY "documents_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_auth_user_entities())
);

DROP POLICY IF EXISTS "documents_storage_insert" ON storage.objects;
CREATE POLICY "documents_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_auth_user_entities())
    AND EXISTS (
        SELECT 1 FROM public.business_entities be
        WHERE be.id = ((storage.foldername(name))[1])::uuid
          AND public.get_auth_user_role(be.workspace_id) IN (
              'admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant', 'accountant'
          )
    )
);

DROP POLICY IF EXISTS "documents_storage_update" ON storage.objects;
CREATE POLICY "documents_storage_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_auth_user_entities())
)
WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND ((storage.foldername(name))[1])::uuid IN (SELECT public.get_auth_user_entities())
);

DROP POLICY IF EXISTS "documents_storage_delete" ON storage.objects;
CREATE POLICY "documents_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    AND EXISTS (
        SELECT 1 FROM public.business_entities be
        WHERE be.id = ((storage.foldername(name))[1])::uuid
          AND public.get_auth_user_role(be.workspace_id) IN (
              'admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant'
          )
    )
);

-- 4. Ensure 0200 (Depreciation) & 9910 (Final Financial Result) exist in COA seed + backfill
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
        ('0200', 'Asosiy vositalarning eskirishi (Amortizatsiya)', 'liability'),
        ('0820', 'Asosiy vositalarni sotib olish', 'asset'),
        ('1010', 'Xomashyo va materiallar', 'asset'),
        ('1030', 'Yoqilg''i va moylash materiallari', 'asset'),
        ('2810', 'Ombordagi tayyor mahsulotlar', 'asset'),
        ('2910', 'Ombordagi tovarlar', 'asset'),
        ('4010', 'Xaridorlar va buyurtmachilardan olinadigan schyotlar', 'asset'),
        ('4410', 'Budjetga oldindan to''langan soliqlar (QQS)', 'asset'),
        ('5010', 'Kassadagi pul mablag''lari', 'asset'),
        ('5110', 'Hisob-kitob schyoti (Milliy valyutada)', 'asset'),
        ('5210', 'Valyuta hisobvarag''i', 'asset'),
        ('6010', 'Mol yetkazib beruvchilarga to''lanadigan schyotlar', 'liability'),
        ('6410', 'Budjetga to''lovlar bo''yicha qarzlar (Soliqlar)', 'liability'),
        ('6520', 'Maqsadli davlat jamg''armalariga to''lovlar', 'liability'),
        ('6710', 'Mehnat haqi bo''yicha xodimlar bilan hisob-kitoblar', 'liability'),
        ('8330', 'Pay va ulushlar (Ustav kapitali)', 'equity'),
        ('8710', 'Taqsimlanmagan foyda (qoplanmagan zarar)', 'equity'),
        ('9010', 'Tayyor mahsulot sotishdan daromadlar', 'revenue'),
        ('9030', 'Ishlar bajarish va xizmatlar ko''rsatishdan daromadlar', 'revenue'),
        ('9110', 'Sotilgan mahsulotlarning tannarxi', 'expense'),
        ('9410', 'Sotish xarajatlari', 'expense'),
        ('9420', 'Ma''muriy xarajatlar', 'expense'),
        ('9430', 'Boshqa operatsion xarajatlar', 'expense'),
        ('9910', 'Yakuniy moliyaviy natija', 'equity')
    ) AS v(code, name, acc_type)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.chart_of_accounts c
        WHERE c.business_entity_id = p_entity_id AND c.code = v.code
    );
END;
$$;

DO $$
DECLARE
    ent RECORD;
BEGIN
    FOR ent IN SELECT id FROM public.business_entities LOOP
        PERFORM public.seed_default_coa_for_entity(ent.id);
    END LOOP;
END $$;

-- 5. Atomic Period Closing RPC (Zakritiye mesyatsa: Revenue/Expense -> 9910 -> 8710)
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
    IF v_user_id IS NULL THEN
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

    SELECT public.get_auth_user_role(v_workspace_id) INTO v_user_role;
    IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'workspace_owner', 'director', 'company_director', 'chief_accountant') THEN
        RAISE EXCEPTION 'Davrni yopish uchun Bosh buxgalter yoki Rahbar vakolati zarur (Joriy rol: %)', COALESCE(v_user_role, 'yo''q');
    END IF;

    v_close_date := COALESCE(p_closing_date, p_to_date);
    v_idem_key := COALESCE(p_idempotency_key, format('idem-close-%s-%s-%s', p_business_entity_id, p_from_date, p_to_date));

    SELECT id, entry_number, total_debit INTO v_existing
    FROM public.journal_entries
    WHERE idempotency_key = v_idem_key
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'id', v_existing.id,
            'entry_number', v_existing.entry_number,
            'net_profit', 0,
            'idempotent', true
        );
    END IF;

    -- Aggregate net balances of active revenue and expense accounts for the period (excluding prior period_closing)
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
        v_acc_net := v_acc.ct_sum - v_acc.dt_sum; -- Positive = net credit (revenue), Negative = net debit (expense)
        IF ABS(v_acc_net) > 0.0000 THEN
            IF v_acc_net > 0 THEN
                -- Close credit balance via Debit
                v_lines := v_lines || jsonb_build_array(jsonb_build_object(
                    'account_code', v_acc.code,
                    'account_name', v_acc.name,
                    'debit_amount', v_acc_net,
                    'credit_amount', 0,
                    'memo', format('Davr yopish (%s..%s)', p_from_date, p_to_date)
                ));
                v_total_debit := v_total_debit + v_acc_net;
            ELSE
                -- Close debit balance via Credit
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

    -- Net profit/loss goes directly through 8710 (via 9910 summary) keeping double-entry strictly balanced
    IF v_net_profit > 0 THEN
        -- Net profit -> Credit 9910, then Debit 9910 & Credit 8710
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

REVOKE ALL ON FUNCTION public.close_accounting_period(UUID, DATE, DATE, DATE, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_accounting_period(UUID, DATE, DATE, DATE, VARCHAR) FROM anon;
GRANT EXECUTE ON FUNCTION public.close_accounting_period(UUID, DATE, DATE, DATE, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_accounting_period(UUID, DATE, DATE, DATE, VARCHAR) TO service_role;
