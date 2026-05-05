-- =========================================================================================
-- CONTRACTUM - ESQUEMA DE BASE DE DATOS Y RLS (ACTUALIZADO PARA MULTIPLES FIRMANTES)
-- Copia y pega esto en el SQL Editor de Supabase
-- =========================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLAS PRINCIPALES
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('global_admin', 'company_admin', 'employee', 'recipient')),
    national_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.contract_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    -- Nuevos metadatos
    jurisdiction TEXT DEFAULT 'Nacional',
    confidentiality_level TEXT DEFAULT 'Estándar',
    validity_period TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending_signature', 'signed', 'validated', 'cancelled')) DEFAULT 'draft',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    pdf_url TEXT
);

-- Tabla de Firmantes (Partes del Contrato - Soporta 1 a Muchos)
CREATE TABLE public.contract_signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    signer_name TEXT NOT NULL,
    signer_email TEXT NOT NULL,
    signer_national_id TEXT NOT NULL,
    role TEXT NOT NULL, -- Ej: 'Empleador', 'Cliente', 'Testigo'
    status TEXT DEFAULT 'pending', -- 'pending' o 'signed'
    signed_at TIMESTAMPTZ,
    signature_data TEXT,
    ip_address TEXT,
    UNIQUE(contract_id, signer_national_id) 
);

-- Tabla de Logs de Auditoría (Blockchain Conceptual)
CREATE TABLE public.contract_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    action_timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    details JSONB,
    previous_hash TEXT,
    hash TEXT NOT NULL
);

-- 2. POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Un contrato es visible para la empresa creadora O para cualquier firmante asignado a él
CREATE POLICY "View contracts logic" 
ON public.contracts FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('company_admin', 'employee'))
    OR 
    id IN (SELECT contract_id FROM public.contract_signers WHERE signer_national_id = (SELECT national_id FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "Company members can insert contracts" 
ON public.contracts FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('company_admin', 'employee'))
);

-- Signers RLS
CREATE POLICY "Recipients can sign their assigned contracts" 
ON public.contract_signers FOR UPDATE USING (
    signer_national_id = (SELECT national_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "View signers logic" 
ON public.contract_signers FOR SELECT USING (
    contract_id IN (
        SELECT id FROM public.contracts WHERE company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('company_admin', 'employee')
        )
    )
    OR
    contract_id IN (SELECT contract_id FROM public.contract_signers WHERE signer_national_id = (SELECT national_id FROM public.profiles WHERE id = auth.uid()))
);
