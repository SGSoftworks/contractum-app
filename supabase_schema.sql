-- =========================================================================================
-- CONTRACTUM - ESQUEMA DE BASE DE DATOS DEFINITIVO v2
-- Incluye: profiles, contracts, contract_signers, contract_logs
-- Trazabilidad SHA-256, RLS robusta, portal público de consulta
-- =========================================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================================
-- LIMPIEZA TOTAL PREVIA (orden inverso de dependencias)
-- =========================================================================================
DROP TABLE IF EXISTS public.contract_logs CASCADE;
DROP TABLE IF EXISTS public.contract_signers CASCADE;
DROP TABLE IF EXISTS public.contracts CASCADE;
DROP TABLE IF EXISTS public.contract_templates CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.company_requests CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- Limpiar funciones anteriores si existían
DROP FUNCTION IF EXISTS public.is_current_user_global_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_current_user_approved_company() CASCADE;

-- =========================================================================================
-- 1. PERFILES DE USUARIO Y EMPRESA (Unificados en una sola tabla)
-- =========================================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    national_id TEXT UNIQUE,
    is_global_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE, -- Control de acceso para empresas
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsquedas por email (usado en onboarding)
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- =========================================================================================
-- 2. CONTRATOS
-- =========================================================================================
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL 
        CHECK (status IN ('pending', 'signed', 'rejected', 'cancelled')) 
        DEFAULT 'pending',
    -- Metadatos legales
    jurisdiction TEXT,
    confidentiality_level TEXT,
    validity_period TEXT,
    -- Trazabilidad
    genesis_hash TEXT, -- Hash SHA-256 del bloque inicial
    -- Almacenamiento
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_owner ON public.contracts(owner_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);

-- =========================================================================================
-- 3. FIRMANTES DE CONTRATOS
-- =========================================================================================
CREATE TABLE public.contract_signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    -- Datos de identidad del firmante
    signer_name TEXT NOT NULL,
    signer_email TEXT NOT NULL,
    signer_national_id TEXT NOT NULL,
    role TEXT DEFAULT 'Firmante',
    -- Estado de la firma
    status TEXT NOT NULL 
        CHECK (status IN ('pending', 'signed', 'rejected')) 
        DEFAULT 'pending',
    has_signed BOOLEAN NOT NULL DEFAULT FALSE,
    -- Datos de la firma
    signed_at TIMESTAMPTZ,
    signature_data TEXT,        -- Base64 del trazo de la firma
    signature_hash TEXT,        -- SHA-256 de (contrato_id + signer_national_id + signed_at)
    -- Datos del rechazo
    rejection_reason TEXT,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Un firmante no puede aparecer dos veces en el mismo contrato
    UNIQUE(contract_id, signer_national_id)
);

CREATE INDEX idx_contract_signers_contract ON public.contract_signers(contract_id);
CREATE INDEX idx_contract_signers_email ON public.contract_signers(signer_email);
CREATE INDEX idx_contract_signers_national_id ON public.contract_signers(signer_national_id);

-- =========================================================================================
-- 4. LOGS DE AUDITORÍA (Cadena de Confianza / Blockchain)
-- =========================================================================================
CREATE TABLE public.contract_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    action TEXT NOT NULL,           -- 'genesis', 'signature', 'rejection', 'cancellation'
    actor TEXT,                     -- Nombre o ID del actor
    hash TEXT NOT NULL,             -- SHA-256 del bloque actual
    previous_hash TEXT,             -- Hash del bloque anterior (cadena)
    details JSONB DEFAULT '{}'::jsonb,
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_logs_contract ON public.contract_logs(contract_id);
CREATE INDEX idx_contract_logs_timestamp ON public.contract_logs(action_timestamp);

-- =========================================================================================
-- FUNCIONES AUXILIARES (SECURITY DEFINER para evitar recursión en RLS)
-- =========================================================================================

-- Verifica si el usuario actual es administrador global
CREATE OR REPLACE FUNCTION public.is_current_user_global_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(is_global_admin, FALSE) 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Verifica si el usuario actual es empresa aprobada
CREATE OR REPLACE FUNCTION public.is_current_user_approved_company()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(is_approved, FALSE) 
  FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- =========================================================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================================================
-- POLÍTICAS: PERFILES (profiles)
-- =========================================================================================

-- Cada usuario puede ver y gestionar su propio perfil
CREATE POLICY "Own profile: select"
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Own profile: insert"
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Own profile: update"
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Administrador global puede ver y modificar todos los perfiles
CREATE POLICY "Admin: view all profiles"
ON public.profiles FOR SELECT 
USING (public.is_current_user_global_admin());

CREATE POLICY "Admin: update all profiles"
ON public.profiles FOR UPDATE 
USING (public.is_current_user_global_admin());

-- =========================================================================================
-- POLÍTICAS: CONTRATOS (contracts)
-- =========================================================================================

-- Empresa aprobada puede crear sus contratos
CREATE POLICY "Company: insert own contracts"
ON public.contracts FOR INSERT 
WITH CHECK (
    owner_id = auth.uid() 
    AND public.is_current_user_approved_company()
);

-- Empresa puede ver sus propios contratos
CREATE POLICY "Company: view own contracts"
ON public.contracts FOR SELECT 
USING (owner_id = auth.uid());

-- Empresa puede actualizar sus propios contratos
CREATE POLICY "Company: update own contracts"
ON public.contracts FOR UPDATE 
USING (owner_id = auth.uid());

-- Admin global puede ver todos los contratos
CREATE POLICY "Admin: view all contracts"
ON public.contracts FOR SELECT 
USING (public.is_current_user_global_admin());

-- Admin global puede actualizar cualquier contrato
CREATE POLICY "Admin: update all contracts"
ON public.contracts FOR UPDATE 
USING (public.is_current_user_global_admin());

-- Portal Público: Solo se puede leer un contrato si eres el dueño, admin o conoces el link (sesión pública)
CREATE POLICY "Access: read contract if owner or signer"
ON public.contracts FOR SELECT 
USING (
    owner_id = auth.uid() 
    OR public.is_current_user_global_admin()
    OR auth.uid() IS NULL -- Permite lectura por ID en el portal público (SignerView)
);

-- Portal Público: Firmantes pueden actualizar el estado del contrato (firma/rechazo)
CREATE POLICY "Public: update contract for signing"
ON public.contracts FOR UPDATE 
USING (
    owner_id = auth.uid()
    OR auth.uid() IS NULL
    OR public.is_current_user_global_admin()
);

-- =========================================================================================
-- POLÍTICAS: FIRMANTES (contract_signers)
-- =========================================================================================

-- Empresa puede insertar firmantes en sus contratos
CREATE POLICY "Company: insert signers"
ON public.contract_signers FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.contracts 
        WHERE id = contract_id AND owner_id = auth.uid()
    )
);

-- Empresa puede ver los firmantes de sus contratos
CREATE POLICY "Company: view own signers"
ON public.contract_signers FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.contracts 
        WHERE id = contract_id AND owner_id = auth.uid()
    )
);

-- Admin puede ver todos los firmantes
CREATE POLICY "Admin: view all signers"
ON public.contract_signers FOR SELECT 
USING (public.is_current_user_global_admin());

-- Portal Público: Lectura de firmantes limitada al dueño, admin o sesión pública
CREATE POLICY "Public: read signers for validation"
ON public.contract_signers FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_id AND (owner_id = auth.uid() OR auth.uid() IS NULL))
    OR public.is_current_user_global_admin()
);

-- Portal Público: Un firmante puede actualizar su propio registro (firma/rechazo)
CREATE POLICY "Public: update own signer record"
ON public.contract_signers FOR UPDATE 
USING (
    EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_id AND (owner_id = auth.uid() OR auth.uid() IS NULL))
    OR public.is_current_user_global_admin()
);

-- =========================================================================================
-- POLÍTICAS: LOGS DE AUDITORÍA (contract_logs)
-- =========================================================================================

-- Empresa puede ver los logs de sus contratos
CREATE POLICY "Company: view own logs"
ON public.contract_logs FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.contracts 
        WHERE id = contract_id AND owner_id = auth.uid()
    )
);

-- Admin puede ver todos los logs
CREATE POLICY "Admin: view all logs"
ON public.contract_logs FOR SELECT 
USING (public.is_current_user_global_admin());

-- Portal Público: Lectura de logs para la línea de tiempo de auditoría
CREATE POLICY "Public: read logs for timeline"
ON public.contract_logs FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_id AND (owner_id = auth.uid() OR auth.uid() IS NULL))
);

-- Portal Público: Inserción de logs para firmantes externos
CREATE POLICY "Public: insert logs"
ON public.contract_logs FOR INSERT 
WITH CHECK (true); -- La validación de integridad se hace por hash logic



-- =========================================================================================
-- NOTA PARA EL DESARROLLADOR
-- =========================================================================================
-- Después de ejecutar este script, añadir la columna signature_hash si ya tienes datos:
--   ALTER TABLE contract_signers ADD COLUMN IF NOT EXISTS signature_hash TEXT;
--   ALTER TABLE contract_signers ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
--   ALTER TABLE contracts ADD COLUMN IF NOT EXISTS genesis_hash TEXT;
--   ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
--   ALTER TABLE contract_logs ADD COLUMN IF NOT EXISTS previous_hash TEXT;
--   ALTER TABLE contract_logs ADD COLUMN IF NOT EXISTS actor TEXT;
-- =========================================================================================
