-- ==============================================================================
-- FIRMUS — Seed Data for Uzbekistan Production Demo
-- ==============================================================================

-- 1. Default Workspace
INSERT INTO public.workspaces (id, name, type, plan_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'FIRMUS Accounting Practice HQ', 'accounting_firm', 'professional')
ON CONFLICT (id) DO NOTHING;

-- 2. Business Entities
INSERT INTO public.business_entities (id, workspace_id, legal_name, trade_name, tin_stir, company_type, tax_regime, currency, accountant_name, is_active)
VALUES 
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'ORIENT AGRO EXPORT MChJ', 'Orient Agro', '309482716', 'MChJ', 'vat_profit_tax', 'UZS', 'Azizbek Rahimov (Bosh buxgalter)', true),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'TOSHKENT LOGISTIKA SERVIS MChJ', 'TLS Express', '301928475', 'MChJ', 'turnover_tax', 'UZS', 'Dilnoza Karimova', true),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'TEXNO STANDARD PRO MChJ', 'TexnoPro', '308192837', 'MChJ', 'vat_profit_tax', 'UZS', 'Azizbek Rahimov', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Chart of Accounts
INSERT INTO public.chart_of_accounts (id, business_entity_id, code, name, type)
VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '5110', 'Hisob-kitob schyoti (Milliy valyutada)', 'asset'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '5210', 'Valyuta schyotlari', 'asset'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '4010', 'Xaridorlar va buyurtmachilardan olinadigan schyotlar', 'asset'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '6010', 'Mol yetkazib beruvchilarga toʻlanadigan schyotlar', 'liability'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '2910', 'Ombordagi tovarlar', 'asset'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '6410', 'Budjetga toʻlovlar boʻyicha qarzlar (Soliqlar)', 'liability'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '6710', 'Mehnat haqi boʻyicha xodimlar bilan hisob-kitoblar', 'liability'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '9010', 'Tayyor mahsulotlarni sotishdan daromadlar', 'revenue'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '9420', 'Maʼmuriy xarajatlar', 'expense');

-- 4. Bank Accounts
INSERT INTO public.bank_accounts (business_entity_id, bank_name, account_number, mfo, currency, balance, status, is_primary)
VALUES
('11111111-1111-1111-1111-111111111111', 'Kapitalbank ATB', '20208000700543210001', '01036', 'UZS', 842500000.0000, 'connected', true),
('11111111-1111-1111-1111-111111111111', 'Ipak Yoʻli Banki', '20208000900598765001', '00444', 'UZS', 345800000.0000, 'connected', false),
('11111111-1111-1111-1111-111111111111', 'Oʻzsanoatqurilishbank (SQB)', '20208840300511223001', '00440', 'USD', 574900.0000, 'connected', false);

-- 5. Transactions
INSERT INTO public.transactions (business_entity_id, date, amount, type, counterparty, counterparty_stir, description, status, source, account_code, account_name, matched_document_name, ai_explanation, ai_confidence)
VALUES
('11111111-1111-1111-1111-111111111111', '2026-11-14', 45200000.0000, 'income', 'KORZINKA DISKONT MChJ', '204918273', 'E-SF №SF-8492 toʻlovi (Oziq-ovqat mahsulotlari)', 'posted', 'bank_api', '4010', 'Xaridorlar schyoti', 'E-SF №SF-8492', 'Didox E-SF va bank toʻlov topshirigʻi toʻliq mos keldi.', 99.40),
('11111111-1111-1111-1111-111111111111', '2026-11-13', 18450000.0000, 'expense', 'LUKOIL UZBEKISTAN B.V.', '200192847', 'Yoqilgʻi-moylash materiallari (Dizel yoqilgʻisi)', 'posted', 'bank_api', '6010', 'Mol yetkazib beruvchilar', 'Didox №DK-10492', 'Shartnoma №44/2026 boʻyicha oʻtkazma tasdiqlangan.', 98.70),
('11111111-1111-1111-1111-111111111111', '2026-11-12', 128000000.0000, 'income', 'MAKRO SUPERMARKETLAR TARMOGʻI', '302918471', 'Didox elektron hisob-faktura toʻlovi (Meva-sabzavot)', 'posted', 'didox', '4010', 'Xaridorlar schyoti', 'E-SF №SF-9011', 'Didox elektron imzosi E-IMZO orqali tasdiqlangan.', 99.80),
('11111111-1111-1111-1111-111111111111', '2026-11-11', 8200000.0000, 'expense', 'TOSHKENT ELEKTR TARMOQLARI AJ', '201928374', 'Noyabr oyi elektr energiyasi isteʼmoli', 'pending', 'bank_api', '9420', 'Maʼmuriy xarajatlar', NULL, 'Taqqoslama dalolatnoma (Akt sverki) kutilmoqda.', 89.50),
('11111111-1111-1111-1111-111111111111', '2026-11-10', 32500000.0000, 'income', 'BEELINE UZBEKISTAN (Unitel MChJ)', '201948572', 'Korporativ IT va aloqa xizmatlari realizatsiyasi', 'posted', '1c_enterprise', '4010', 'Xaridorlar schyoti', 'Hisob-faktura №104', '1C:Enterprise 8.3 avtomatik provodkasi.', 97.90);

-- 6. Documents (Didox E-SF)
INSERT INTO public.documents (business_entity_id, document_number, type, counterparty, counterparty_stir, date, due_date, amount, vat_amount, status, contract_number, e_imzo_signed, e_imzo_timestamp)
VALUES
('11111111-1111-1111-1111-111111111111', 'SF-2026-0941', 'E-Hisob-faktura (Didox)', 'KORZINKA DISKONT MChJ', '204918273', '2026-11-14', '2026-11-24', 45200000.0000, 4842857.0000, 'signed', 'SH-884/26', true, '2026-11-14 14:32:00+05'),
('11111111-1111-1111-1111-111111111111', 'SF-2026-0940', 'E-Hisob-faktura (Didox)', 'MAKRO SUPERMARKETLAR TARMOGʻI', '302918471', '2026-11-12', '2026-11-22', 128000000.0000, 13714285.0000, 'signed', 'SH-912/26', true, '2026-11-12 16:15:00+05'),
('11111111-1111-1111-1111-111111111111', 'DK-2026-10492', 'E-Hisob-faktura (Kiruvchi)', 'LUKOIL UZBEKISTAN B.V.', '200192847', '2026-11-10', '2026-11-20', 18450000.0000, 1976785.0000, 'pending_signature', 'SH-44/26', false, NULL),
('11111111-1111-1111-1111-111111111111', 'AKT-2026-051', 'Bajarilgan ishlar dalolatnomasi', 'HAVAS FOOD MChJ', '306789123', '2026-11-09', '2026-11-19', 24800000.0000, 2657142.0000, 'pending_signature', 'SH-102/26', false, NULL);

-- 7. Contracts
INSERT INTO public.contracts (business_entity_id, number, type, counterparty, counterparty_stir, amount, start_date, end_date, status, auto_renewal, description)
VALUES
('11111111-1111-1111-1111-111111111111', 'SH-884/26', 'Mahsulot yetkazib berish', 'KORZINKA DISKONT MChJ', '204918273', 450000000.0000, '2026-01-10', '2026-12-31', 'active', true, 'Qishloq xoʻjaligi mahsulotlarini yillik yetkazib berish bosh kelishuvi.'),
('11111111-1111-1111-1111-111111111111', 'SH-912/26', 'Eksport shartnomasi', 'MAKRO SUPERMARKETLAR TARMOGʻI', '302918471', 1200000000.0000, '2026-02-01', '2026-12-31', 'active', true, 'Tarmok boʻyicha meva-sabzavot realizatsiyasi.'),
('11111111-1111-1111-1111-111111111111', 'SH-44/26', 'Yoqilgʻi xaridi', 'LUKOIL UZBEKISTAN B.V.', '200192847', 150000000.0000, '2026-01-15', '2026-11-20', 'due_soon', false, 'Avtotransport va texnika uchun dizel yoqilgʻisi taʼminoti.'),
('11111111-1111-1111-1111-111111111111', 'SH-12/25', 'Ijara shartnomasi', 'TOSHKENT BIZNES SENTR MChJ', '205847192', '60000000.0000', '2025-11-01', '2026-10-31', 'overdue', false, 'Markaziy ofis binosi ijarasi.');

-- 8. Inventory Items
INSERT INTO public.inventory_items (business_entity_id, sku, name, category, quantity, unit, unit_price, status)
VALUES
('11111111-1111-1111-1111-111111111111', 'AGRO-OLM-01', 'Qizil olma (Golden Delicious)', 'Meva-sabzavot', 18450.000, 'kg', 12000.0000, 'in_stock'),
('11111111-1111-1111-1111-111111111111', 'AGRO-UZUM-02', 'Qora kishmish uzum', 'Meva-sabzavot', 9800.000, 'kg', 24000.0000, 'in_stock'),
('11111111-1111-1111-1111-111111111111', 'YASH-PL-01', 'Plastik meva yashiklari (Standart 10kg)', 'Tara va qadoq', 450.000, 'dona', 18000.0000, 'low_stock'),
('11111111-1111-1111-1111-111111111111', 'AGRO-ANOR-03', 'Tuya tish anor (Eksportbop)', 'Meva-sabzavot', 5600.000, 'kg', 35000.0000, 'in_stock');

-- 9. Employees
INSERT INTO public.employees (business_entity_id, full_name, position, department, salary, pinfl, hire_date, status)
VALUES
('11111111-1111-1111-1111-111111111111', 'Rahimov Azizbek Shavkatovich', 'Bosh buxgalter (Chief Accountant)', 'Buxgalteriya', 15000000.0000, '31204910294812', '2023-03-01', 'active'),
('11111111-1111-1111-1111-111111111111', 'Karimova Dilnoza Bahodirovna', 'Katta buxgalter (Senior Accountant)', 'Buxgalteriya', 10500000.0000, '41508920194851', '2023-06-15', 'active'),
('11111111-1111-1111-1111-111111111111', 'Saidov Jasur Akramovich', 'Moliya direktori (CFO)', 'Boshqaruv', 22000000.0000, '30501890284719', '2022-11-10', 'active'),
('11111111-1111-1111-1111-111111111111', 'Xolmatov Sherzod Mirzayevich', 'Ombor mudiri (Warehouse Supervisor)', 'Logistika & Ombor', 8500000.0000, '32407880194827', '2024-01-20', 'active');

-- 10. Tax Records & Deadlines
INSERT INTO public.tax_records (business_entity_id, type, period, calculated_amount, paid_amount, deadline, status)
VALUES
('11111111-1111-1111-1111-111111111111', 'Qoʻshilgan qiymat soligʻi (QQS 12%)', '2026-Noyabr', 38450000.0000, 0.0000, '2026-12-20', 'due_soon'),
('11111111-1111-1111-1111-111111111111', 'Jismoniy shaxslardan olinadigan daromad soligʻi (JShDS 12%)', '2026-Oktyabr', 8208000.0000, 8208000.0000, '2026-11-15', 'paid'),
('11111111-1111-1111-1111-111111111111', 'Ijtimoiy soliq (12%)', '2026-Oktyabr', 8208000.0000, 8208000.0000, '2026-11-15', 'paid'),
('11111111-1111-1111-1111-111111111111', 'Yuridik shaxslardan olinadigan foyda soligʻi (15%)', '2026-Q3 (3-chorak)', 54200000.0000, 54200000.0000, '2026-10-20', 'paid');

INSERT INTO public.tax_deadlines (business_entity_id, title, date, status, description)
VALUES
('11111111-1111-1111-1111-111111111111', 'QQS hisoboti va toʻlovi', '2026-12-20', 'urgent', 'Noyabr oyi uchun QQS hisob-kitobini soliq organlariga topshirish.'),
('11111111-1111-1111-1111-111111111111', 'JShDS va Ijtimoiy soliq toʻlovi', '2026-12-15', 'pending', 'Noyabr oyi ish haqi boʻyicha hisoblangan soliqlarni toʻlash.'),
('11111111-1111-1111-1111-111111111111', 'Foyda soligʻi avans toʻlovlari', '2026-12-23', 'pending', 'Dekabr oyi uchun oylik avans toʻlovlari (yillik daromadi 10 mlrddan yuqori korxonalar).'),
('11111111-1111-1111-1111-111111111111', 'Suv resurslaridan foydalanganlik uchun soliq', '2026-12-20', 'pending', 'Qishloq xoʻjaligi ehtiyojlari uchun oylik deklaratsiya.');

-- 11. Integrations & Sync Logs
INSERT INTO public.integrations (business_entity_id, provider, name, category, description, status, last_sync_time, records_synced_today, error_detail)
VALUES
('11111111-1111-1111-1111-111111111111', '1c_enterprise', '1C:Enterprise 8.3 Bukhgalteriya', 'ERP & Buxgalteriya', '1C OData API va Windows Connector orqali provodkalar va qoldiqlar sinxronizatsiyasi.', 'connected', '2026-11-15 20:45:00+05', 412, NULL),
('11111111-1111-1111-1111-111111111111', 'didox', 'Didox E-SF (Faktura.uz)', 'Elektron Hujjat Aylanishi (EDO)', 'Kiruvchi va chiquvchi elektron hisob-fakturalar, aktlar va E-IMZO tekshiruvi.', 'connected', '2026-11-15 21:10:00+05', 85, NULL),
('11111111-1111-1111-1111-111111111111', 'bank_api', 'Kapitalbank & Ipak Yoʻli API', 'Bank-Mijoz Avtomatizatsiyasi', 'Real-vaqtda bank koʻchirmalarini olish va toʻlov topshiriqlarini uzatish.', 'connected', '2026-11-15 21:30:00+05', 128, NULL),
('11111111-1111-1111-1111-111111111111', 'soliq_uz', 'Soliq.uz (Yagona Darcha)', 'Davlat Soliq Qoʻmitasi', 'Soliq qarzlari, ERI sertifikatlari va avtomatik soliq hisobotlari yuborish.', 'connected', '2026-11-15 18:00:00+05', 14, NULL);

INSERT INTO public.sync_logs (business_entity_id, provider_name, type, records_processed, status, message)
VALUES
('11111111-1111-1111-1111-111111111111', 'Didox EDO', 'inbound', 12, 'success', 'Yangi 12 ta kiruvchi E-SF yuklandi va provodkalarga bogʻlandi.'),
('11111111-1111-1111-1111-111111111111', 'Kapitalbank API', 'inbound', 48, 'success', 'Kunlik 48 ta bank operatsiyasi muvaffaqiyatli import qilindi.'),
('11111111-1111-1111-1111-111111111111', '1C:Enterprise 8.3', 'outbound', 84, 'success', 'FIRMUS da tasdiqlangan 84 ta provodka 1C bazasiga qayd etildi.'),
('11111111-1111-1111-1111-111111111111', 'Soliq.uz Portal', 'inbound', 1, 'success', 'QQS boʻyicha elektron soliq xabarnomasi olindi.');

-- 12. Exceptions (AI Auditor)
INSERT INTO public.exceptions (business_entity_id, severity, status, category, title, description, entity_name, date, amount, source_system, reference_id, details, ai_suggestion, ai_confidence)
VALUES
('11111111-1111-1111-1111-111111111111', 'critical', 'open', 'unmatched_payment', 'Didox E-SF siz bank chiqim toʻlovi aniqlandi', 'Bank hisobidan 18,450,000 soʻm yechilgan, ammo mos keluvchi elektron hisob-faktura topilmadi.', 'ORIENT AGRO EXPORT MChJ', '2026-11-14', 18450000.0000, 'Bank-Mijoz API', 'TX-90184', 'LUKOIL UZBEKISTAN B.V. ga yoqilgʻi uchun toʻlangan.', 'Didox kabinetidan E-SF №DK-10492 ni yuklab olib bogʻlash yoki yetkazib beruvchiga soʻrov yuborish tavsiya etiladi.', 98.50),
('11111111-1111-1111-1111-111111111111', 'warning', 'open', 'tax_discrepancy', '1C va Didox oʻrtasida QQS summasida tafovut', '1C da koʻrsatilgan QQS summasi Didoxdagi tasdiqlangan E-SF dan 24,000 soʻmga farq qilmoqda.', 'ORIENT AGRO EXPORT MChJ', '2026-11-13', 24000.0000, '1C:Enterprise', 'SF-8841', 'Dumaloqlash (okruglenie) natijasida tafovut vujudga kelgan.', '1C provodkasidagi 6410 schyotni Didox E-SF qiymatiga avtomatik tenglashtirish tavsiya etiladi.', 95.20),
('11111111-1111-1111-1111-111111111111', 'info', 'open', 'signature_request', 'Didoxda imzolanishi kutilayotgan shartnoma', 'HAVAS FOOD MChJ bilan yangi shartnoma E-IMZO orqali tasdiqlash uchun navbatda turibdi.', 'ORIENT AGRO EXPORT MChJ', '2026-11-12', 450000000.0000, 'Didox E-IMZO', 'SH-102/26', 'Mijoz direktori tomonidan imzolangan.', 'Direktor yoki masʼul shaxs ERI kaliti orqali 1 ta bosishda imzolash mumkin.', 99.00);

-- 13. Team Members
INSERT INTO public.team_members (workspace_id, name, email, role, status, assigned_companies_count)
VALUES
('00000000-0000-0000-0000-000000000001', 'Azizbek Rahimov', 'azizbek@firmus.uz', 'chief_accountant', 'active', 3),
('00000000-0000-0000-0000-000000000001', 'Dilnoza Karimova', 'dilnoza@firmus.uz', 'accountant', 'active', 2),
('00000000-0000-0000-0000-000000000001', 'Jasur Saidov', 'jasur@firmus.uz', 'auditor', 'active', 3),
('00000000-0000-0000-0000-000000000001', 'Madina Yusupova', 'madina@firmus.uz', 'accountant', 'invited', 1);
