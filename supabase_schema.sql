-- =========================================================================================
-- CONTRACTUM SIMPLIFICADO - ESQUEMA DE BASE DE DATOS Y RLS
-- =========================================================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Limpieza total previa (CUIDADO: Esto borra todas las tablas y datos relacionados)
DROP TABLE IF EXISTS public.contract_logs CASCADE;
DROP TABLE IF EXISTS public.contract_signers CASCADE;
DROP TABLE IF EXISTS public.contracts CASCADE;
DROP TABLE IF EXISTS public.contract_templates CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.company_requests CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- 1. Usuarios y Empresas (Unificados)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    national_id TEXT UNIQUE,
    is_global_admin BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE, -- Control de acceso para empresas
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contratos (El corazón del sistema)
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id), -- Empresa que lo creó
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'signed', 'rejected', 'cancelled')) DEFAULT 'pending',
    jurisdiction TEXT,
    confidentiality_level TEXT,
    validity_period TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    pdf_url TEXT
);

-- 3. Firmantes de Contratos
CREATE TABLE public.contract_signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    signer_name TEXT NOT NULL,
    signer_email TEXT NOT NULL,
    signer_national_id TEXT NOT NULL,
    role TEXT,
    status TEXT CHECK (status IN ('pending', 'signed', 'rejected')) DEFAULT 'pending',
    has_signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    signature_data TEXT, -- Base64 de la firma o URL al storage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_id, signer_national_id)
);

-- 4. Logs de Auditoría (Blockchain)
CREATE TABLE public.contract_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    hash TEXT NOT NULL, -- SHA-256 del bloque
    details JSONB DEFAULT '{}'::jsonb,
    action_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- FUNCIONES AUXILIARES (SECURITY DEFINER)
-- PARA EVITAR RECURSIÓN INFINITA (ERROR 500)
-- ==========================================

-- Obtiene el estado de global_admin del usuario actual sin disparar RLS
CREATE OR REPLACE FUNCTION public.is_current_user_global_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_global_admin FROM public.profiles WHERE id = auth.uid();
$$;

-- Obtiene el estado de aprobación de empresa del usuario actual sin disparar RLS
CREATE OR REPLACE FUNCTION public.is_current_user_approved_company()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_approved FROM public.profiles WHERE id = auth.uid();
$$;


-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- PERFILES (profiles)
-- ------------------------------------------
-- 1. Un usuario puede ver y editar su propio perfil
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Admin Global puede ver y actualizar todos los perfiles
CREATE POLICY "Global admin can view all profiles" 
ON public.profiles FOR SELECT USING (public.is_current_user_global_admin());

CREATE POLICY "Global admin can update all profiles" 
ON public.profiles FOR UPDATE USING (public.is_current_user_global_admin());

-- ------------------------------------------
-- CONTRATOS (contracts)
-- ------------------------------------------
-- 1. Empresas aprobadas pueden crear contratos
CREATE POLICY "Approved companies can insert contracts" 
ON public.contracts FOR INSERT WITH CHECK (
    owner_id = auth.uid() AND public.is_current_user_approved_company()
);

-- 2. Empresas aprobadas pueden ver sus propios contratos
CREATE POLICY "Companies can view own contracts" 
ON public.contracts FOR SELECT USING (
    owner_id = auth.uid() AND public.is_current_user_approved_company()
);

-- 3. Empresas aprobadas pueden actualizar sus contratos (ej. cancelar)
CREATE POLICY "Companies can update own contracts" 
ON public.contracts FOR UPDATE USING (
    owner_id = auth.uid() AND public.is_current_user_approved_company()
);

-- 4. Admin Global puede ver todos los contratos
CREATE POLICY "Global admin can view all contracts" 
ON public.contracts FOR SELECT USING (public.is_current_user_global_admin());

-- 5. Portal de Consulta: Lectura de contratos por ID. 
CREATE POLICY "Public read access to specific contracts" 
ON public.contracts FOR SELECT USING (true);

-- 6. Portal de Consulta: Permitir actualizaciones para firmantes anónimos
CREATE POLICY "Public update access for signatures" 
ON public.contracts FOR UPDATE USING (true); 

-- ------------------------------------------
-- FIRMANTES (contract_signers)
-- ------------------------------------------
-- 1. Empresas aprobadas pueden insertar firmantes para sus contratos
CREATE POLICY "Companies can insert signers for their contracts" 
ON public.contract_signers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_id AND owner_id = auth.uid()) 
    AND public.is_current_user_approved_company()
);

-- 2. Empresas aprobadas pueden ver los firmantes de sus contratos
CREATE POLICY "Companies can view signers for their contracts" 
ON public.contract_signers FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_id AND owner_id = auth.uid())
);

-- 3. Portal de Consulta: Cualquiera puede consultar la tabla de firmantes (para validar credenciales)
CREATE POLICY "Public read access for signers validation" 
ON public.contract_signers FOR SELECT USING (true);

-- 4. Portal de Consulta: Un firmante anónimo debe poder guardar su firma
CREATE POLICY "Public update access to sign" 
ON public.contract_signers FOR UPDATE USING (true);

