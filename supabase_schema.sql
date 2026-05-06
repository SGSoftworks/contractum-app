-- =========================================================================================
-- CONTRACTUM - ESQUEMA DE BASE DE DATOS Y RLS (ACTUALIZADO - MULTI-INQUILINO SAAS)
-- Copia y pega esto en el SQL Editor de Supabase
-- IMPORTANTE: Si ya creaste las tablas, puedes borrar todo ("Drop cascade") o ejecutar solo las partes nuevas.
-- =========================================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLAS PRINCIPALES
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NUEVA TABLA: Solicitudes de Registro de Empresas
CREATE TABLE public.company_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    representative_name TEXT NOT NULL,
    address TEXT,
    contact_email TEXT NOT NULL,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    -- Se añade el rol 'pending' para usuarios que aún no han sido aprobados
    role TEXT NOT NULL CHECK (role IN ('global_admin', 'company_admin', 'employee', 'recipient', 'pending')),
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
    jurisdiction TEXT DEFAULT 'Nacional',
    confidentiality_level TEXT DEFAULT 'Estándar',
    validity_period TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'pending_signature', 'signed', 'validated', 'cancelled')) DEFAULT 'draft',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    pdf_url TEXT
);

CREATE TABLE public.contract_signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    signer_name TEXT NOT NULL,
    signer_email TEXT NOT NULL,
    signer_national_id TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    signed_at TIMESTAMPTZ,
    signature_data TEXT,
    ip_address TEXT,
    UNIQUE(contract_id, signer_national_id) 
);

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
ALTER TABLE public.company_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_logs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: PROFILES
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id OR (SELECT role FROM public.profiles p2 WHERE p2.id = auth.uid()) = 'global_admin');

CREATE POLICY "Admins can view profiles" 
ON public.profiles FOR SELECT USING (
    auth.uid() = id
    OR (SELECT role FROM public.profiles p2 WHERE p2.id = auth.uid()) = 'global_admin'
    OR company_id IN (SELECT company_id FROM public.profiles p3 WHERE p3.id = auth.uid() AND p3.role IN ('company_admin', 'employee'))
);

-- POLÍTICAS: COMPANY REQUESTS
CREATE POLICY "Users can insert their own requests" 
ON public.company_requests FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Global admins can view all requests" 
ON public.company_requests FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin'
    OR auth.uid() = auth_user_id
);

CREATE POLICY "Global admins can update requests" 
ON public.company_requests FOR UPDATE USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin'
);

-- POLÍTICAS: COMPANIES
CREATE POLICY "Global admins can insert companies" 
ON public.companies FOR INSERT WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin'
);
CREATE POLICY "Companies are viewable by members and global admins" 
ON public.companies FOR SELECT USING (
    id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin'
);

-- POLÍTICAS: CONTRACTS
CREATE POLICY "View contracts logic" 
ON public.contracts FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('company_admin', 'employee'))
    OR 
    id IN (SELECT contract_id FROM public.contract_signers WHERE signer_national_id = (SELECT national_id FROM public.profiles WHERE id = auth.uid()))
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin'
);

CREATE POLICY "Company members can insert contracts" 
ON public.contracts FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('company_admin', 'employee'))
);
CREATE POLICY "Company members can update contracts" 
ON public.contracts FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('company_admin', 'employee'))
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin'
);

-- POLÍTICAS: SIGNERS
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
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin'
);

-- POLÍTICAS: LOGS (Blockchain)
CREATE POLICY "View logs logic" 
ON public.contract_logs FOR SELECT USING (
    contract_id IN (
        SELECT id FROM public.contracts WHERE company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('company_admin', 'employee')
        )
    )
    OR
    contract_id IN (SELECT contract_id FROM public.contract_signers WHERE signer_national_id = (SELECT national_id FROM public.profiles WHERE id = auth.uid()))
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'global_admin'
);
CREATE POLICY "Users can insert logs" 
ON public.contract_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
