-- ==============================================================================
-- FIRMUS — Database Schema Migration
-- Complete Multi-Tenant Accounting, Tax, EDO & Business Automation for Uzbekistan
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. WORKSPACES (Multi-Tenancy Root)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'accounting_firm' CHECK (type IN ('individual_company', 'accounting_firm')),
    owner_user_id UUID,
    plan_id VARCHAR(50) NOT NULL DEFAULT 'professional',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3. BUSINESS ENTITIES (Companies managed inside a workspace)
CREATE TABLE IF NOT EXISTS public.business_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    tin_stir VARCHAR(20) NOT NULL,
    company_type VARCHAR(50) NOT NULL DEFAULT 'MChJ',
    tax_regime VARCHAR(50) NOT NULL DEFAULT 'vat_profit_tax' CHECK (tax_regime IN ('turnover_tax', 'vat_profit_tax', 'fixed_tax')),
    currency CHAR(3) NOT NULL DEFAULT 'UZS',
    accountant_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 4. CHART OF ACCOUNTS (Uzbekistan National Standard Chart of Accounts - NSCA)
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 5. JOURNAL ENTRIES & DOUBLE-ENTRY LEDGER
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed')),
    description TEXT NOT NULL,
    source_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_reference_id VARCHAR(100),
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    debit_amount NUMERIC(19, 4) NOT NULL DEFAULT 0.0000 CHECK (debit_amount >= 0),
    credit_amount NUMERIC(19, 4) NOT NULL DEFAULT 0.0000 CHECK (credit_amount >= 0),
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 6. TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(19, 4) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    counterparty VARCHAR(255) NOT NULL,
    counterparty_stir VARCHAR(20),
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'pending', 'exception', 'rejected')),
    source VARCHAR(50) NOT NULL DEFAULT 'bank_api',
    account_code VARCHAR(20),
    account_name VARCHAR(255),
    matched_document_name VARCHAR(255),
    ai_explanation TEXT,
    ai_confidence NUMERIC(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 7. BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    mfo VARCHAR(10) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'UZS',
    balance NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(50) NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'syncing', 'error', 'inactive')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 8. DOCUMENTS & ELECTRONIC INVOICES (Didox E-SF)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    document_number VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    counterparty VARCHAR(255) NOT NULL,
    counterparty_stir VARCHAR(20),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    amount NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    vat_amount NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_signature' CHECK (status IN ('signed', 'pending_signature', 'rejected', 'draft')),
    contract_number VARCHAR(100),
    e_imzo_signed BOOLEAN NOT NULL DEFAULT false,
    e_imzo_timestamp TIMESTAMPTZ,
    file_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 9. CONTRACTS
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    number VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    counterparty VARCHAR(255) NOT NULL,
    counterparty_stir VARCHAR(20),
    amount NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'due_soon', 'overdue', 'completed', 'draft')),
    auto_renewal BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 10. INVENTORY ITEMS & MOVEMENTS
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL DEFAULT 0.000,
    unit VARCHAR(20) NOT NULL DEFAULT 'dona',
    unit_price NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(50) NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'out_of_stock')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 11. EMPLOYEES & PAYROLL
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    salary NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    pinfl VARCHAR(14) NOT NULL,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'vacation', 'terminated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 12. TAX RECORDS & STATUTORY CALENDAR DEADLINES
CREATE TABLE IF NOT EXISTS public.tax_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    period VARCHAR(50) NOT NULL,
    calculated_amount NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    paid_amount NUMERIC(19, 4) NOT NULL DEFAULT 0.0000,
    deadline DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'due_soon' CHECK (status IN ('paid', 'due_soon', 'overdue')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.tax_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'urgent' CHECK (status IN ('urgent', 'pending', 'completed')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 13. INTEGRATIONS & SYNC LOGS
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('1c_enterprise', 'didox', 'bank_api', 'soliq_uz', 'custom_csv')),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error', 'syncing')),
    last_sync_time TIMESTAMPTZ,
    records_synced_today INT NOT NULL DEFAULT 0,
    error_detail TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    provider_name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('inbound', 'outbound')),
    records_processed INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'warning', 'error')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 14. EXCEPTIONS & AI AUDITOR
CREATE TABLE IF NOT EXISTS public.exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_entity_id UUID REFERENCES public.business_entities(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    entity_name VARCHAR(255),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(19, 4),
    source_system VARCHAR(100),
    reference_id VARCHAR(100),
    details TEXT,
    ai_suggestion TEXT,
    ai_confidence NUMERIC(5, 2) NOT NULL DEFAULT 95.00,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 15. TEAM MEMBERS & ROLES
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'accountant',
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'inactive')),
    assigned_companies_count INT NOT NULL DEFAULT 1,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 16. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_entities_workspace ON public.business_entities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_transactions_entity ON public.transactions(business_entity_id, date);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON public.documents(business_entity_id, date);
CREATE INDEX IF NOT EXISTS idx_contracts_entity ON public.contracts(business_entity_id);
CREATE INDEX IF NOT EXISTS idx_inventory_entity ON public.inventory_items(business_entity_id);
CREATE INDEX IF NOT EXISTS idx_employees_entity ON public.employees(business_entity_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_entity ON public.exceptions(business_entity_id, status);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON public.journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entity ON public.journal_entries(business_entity_id, entry_date);

-- 17. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated roles full read and write access for development & production API
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "public_all_%s" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "public_all_%s" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', tbl, tbl);
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role;', tbl);
    END LOOP;
END $$;
