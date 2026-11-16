-- ==============================================================================
-- FIRMUS — PHASE 6: EXPANDED COA (4310, 6310, PAYROLL & PRODUCTION), TAX DEADLINES TRIGGER
-- Migration: 20261116060000_payroll_tax_coa_and_health.sql
-- ==============================================================================

-- 1. Ensure unique constraint on (business_entity_id, code) for ON CONFLICT resolution
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_chart_of_accounts_entity_code'
    ) THEN
        ALTER TABLE public.chart_of_accounts
        ADD CONSTRAINT uq_chart_of_accounts_entity_code UNIQUE (business_entity_id, code);
    END IF;
END $$;

-- 2. Update seed_default_coa_for_entity to include 4310, 6310 and all standard accounts
CREATE OR REPLACE FUNCTION public.seed_default_coa_for_entity(p_entity_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.chart_of_accounts (business_entity_id, code, name, type, is_active)
    VALUES
        (p_entity_id, '0100', 'Asosiy vositalar', 'asset', true),
        (p_entity_id, '0200', 'Asosiy vositalarning eskirishi (Amortizatsiya)', 'liability', true),
        (p_entity_id, '0820', 'Asosiy vositalarni sotib olish', 'asset', true),
        (p_entity_id, '1010', 'Xomashyo va materiallar', 'asset', true),
        (p_entity_id, '1030', 'Yoqilg''i va moylash materiallari', 'asset', true),
        (p_entity_id, '2010', 'Asosiy ishlab chiqarish', 'asset', true),
        (p_entity_id, '2810', 'Ombordagi tayyor mahsulotlar', 'asset', true),
        (p_entity_id, '2910', 'Ombordagi tovarlar', 'asset', true),
        (p_entity_id, '4010', 'Xaridorlar va buyurtmachilardan olinadigan schyotlar', 'asset', true),
        (p_entity_id, '4310', 'Yetkazib beruvchilarga berilgan boʻnaklar', 'asset', true),
        (p_entity_id, '4410', 'Budjetga oldindan toʻlangan soliqlar (QQS)', 'asset', true),
        (p_entity_id, '4510', 'Mehnat haqi boʻyicha berilgan boʻnaklar', 'asset', true),
        (p_entity_id, '5010', 'Kassadagi pul mablagʻlari', 'asset', true),
        (p_entity_id, '5110', 'Hisob-kitob schyoti (Milliy valyutada)', 'asset', true),
        (p_entity_id, '5210', 'Valyuta hisobvaragʻi', 'asset', true),
        (p_entity_id, '6010', 'Mol yetkazib beruvchilarga toʻlanadigan schyotlar', 'liability', true),
        (p_entity_id, '6310', 'Xaridorlardan olingan boʻnaklar', 'liability', true),
        (p_entity_id, '6410', 'Budjetga toʻlovlar boʻyicha qarzlar (Soliqlar)', 'liability', true),
        (p_entity_id, '6520', 'Maqsadli davlat jamgʻarmalariga toʻlovlar', 'liability', true),
        (p_entity_id, '6710', 'Mehnat haqi boʻyicha xodimlar bilan hisob-kitoblar', 'liability', true),
        (p_entity_id, '6810', 'Qisqa muddatli bank kreditlari', 'liability', true),
        (p_entity_id, '8330', 'Pay va ulushlar (Ustav kapitali)', 'equity', true),
        (p_entity_id, '8710', 'Taqsimlanmagan foyda (qoplanmagan zarar)', 'equity', true),
        (p_entity_id, '9010', 'Tayyor mahsulot sotishdan daromadlar', 'revenue', true),
        (p_entity_id, '9020', 'Tovarlar sotishdan daromadlar', 'revenue', true),
        (p_entity_id, '9030', 'Ishlar bajarish va xizmatlar koʻrsatishdan daromadlar', 'revenue', true),
        (p_entity_id, '9110', 'Sotilgan mahsulotlarning tannarxi', 'expense', true),
        (p_entity_id, '9120', 'Sotilgan tovarlarning tannarxi', 'expense', true),
        (p_entity_id, '9410', 'Sotish xarajatlari', 'expense', true),
        (p_entity_id, '9420', 'Maʼmuriy xarajatlar', 'expense', true),
        (p_entity_id, '9430', 'Boshqa operatsion xarajatlar', 'expense', true),
        (p_entity_id, '9910', 'Yakuniy moliyaviy natija', 'equity', true)
    ON CONFLICT (business_entity_id, code) DO NOTHING;
END;
$$;

-- 3. Backfill seed_default_coa_for_entity for all existing business entities
DO $$
DECLARE
    ent RECORD;
BEGIN
    FOR ent IN SELECT id FROM public.business_entities LOOP
        PERFORM public.seed_default_coa_for_entity(ent.id);
    END LOOP;
END $$;

-- 4. Update handle_new_business_entity trigger function with default tax_deadlines
CREATE OR REPLACE FUNCTION public.handle_new_business_entity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Seed COA
    PERFORM public.seed_default_coa_for_entity(NEW.id);

    -- 2. Seed integrations
    INSERT INTO public.integrations (business_entity_id, provider, name, category, description, status)
    VALUES
        (NEW.id, 'didox', 'Didox E-SF (Faktura.uz)', 'edo', 'Elektron hisob-faktura va shartnomalar almashinuvi', 'disconnected'),
        (NEW.id, '1c_enterprise', '1C:Enterprise 8.3 Bukhgalteriya', 'erp', 'OData va XML provodkalar sinxronizatsiyasi', 'disconnected'),
        (NEW.id, 'bank_api', 'Tijorat banklari Open Banking', 'bank', 'Bank ko''chirmalarini yuklash va solishtirish', 'disconnected'),
        (NEW.id, 'soliq_uz', 'Soliq.uz (Yagona Darcha)', 'tax', 'QQS, JShDS va soliq kalendari integratsiyasi', 'disconnected')
    ON CONFLICT DO NOTHING;

    -- 3. Seed default tax deadlines if none exist
    IF NOT EXISTS (SELECT 1 FROM public.tax_deadlines WHERE business_entity_id = NEW.id) THEN
        INSERT INTO public.tax_deadlines (business_entity_id, title, date, status, description)
        VALUES
            (
                NEW.id,
                'QQS 12%',
                (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '19 days')::date,
                'urgent',
                'Oylik QQS (12%) hisoboti va toʻlovi'
            ),
            (
                NEW.id,
                'JShODS va Ijtimoiy soliq 12%',
                (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '14 days')::date,
                'pending',
                'Oylik JShODS va Ijtimoiy soliq (12%) hisoboti hamda toʻlovi'
            ),
            (
                NEW.id,
                'Foyda/Aylanma solig''i',
                (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '19 days')::date,
                'pending',
                'Foyda soligʻi yoki aylanmadan olinadigan soliq toʻlovi'
            );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_business_entity_insert ON public.business_entities;
CREATE TRIGGER trg_after_business_entity_insert
    AFTER INSERT ON public.business_entities
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_business_entity();

-- 5. Backfill tax deadlines for any existing business entities that do not have them
INSERT INTO public.tax_deadlines (business_entity_id, title, date, status, description)
SELECT 
    b.id,
    td.title,
    td.date,
    td.status,
    td.description
FROM public.business_entities b
CROSS JOIN (
    VALUES
        (
            'QQS 12%',
            (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '19 days')::date,
            'urgent',
            'Oylik QQS (12%) hisoboti va toʻlovi'
        ),
        (
            'JShODS va Ijtimoiy soliq 12%',
            (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '14 days')::date,
            'pending',
            'Oylik JShODS va Ijtimoiy soliq (12%) hisoboti hamda toʻlovi'
        ),
        (
            'Foyda/Aylanma solig''i',
            (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '19 days')::date,
            'pending',
            'Foyda soligʻi yoki aylanmadan olinadigan soliq toʻlovi'
        )
) AS td(title, date, status, description)
WHERE NOT EXISTS (
    SELECT 1 FROM public.tax_deadlines x WHERE x.business_entity_id = b.id
);
