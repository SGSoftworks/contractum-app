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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    pdf_url TEXT
);

-- 3. Firmantes (Lógica de acceso por consulta)
CREATE TABLE public.contract_signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
    signer_name TEXT NOT NULL,
    signer_email TEXT NOT NULL,
    signer_national_id TEXT NOT NULL,
    has_signed BOOLEAN DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    signature_data TEXT, -- Base64
    UNIQUE(contract_id, signer_national_id)
);

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
ON public.profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_global_admin = true)
);

CREATE POLICY "Global admin can update all profiles" 
ON public.profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_global_admin = true)
);

-- ------------------------------------------
-- CONTRATOS (contracts)
-- ------------------------------------------
-- 1. Empresas aprobadas pueden crear contratos
CREATE POLICY "Approved companies can insert contracts" 
ON public.contracts FOR INSERT WITH CHECK (
    owner_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true)
);

-- 2. Empresas aprobadas pueden ver sus propios contratos
CREATE POLICY "Companies can view own contracts" 
ON public.contracts FOR SELECT USING (
    owner_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true)
);

-- 3. Empresas aprobadas pueden actualizar sus contratos (ej. cancelar)
CREATE POLICY "Companies can update own contracts" 
ON public.contracts FOR UPDATE USING (
    owner_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true)
);

-- 4. Admin Global puede ver todos los contratos
CREATE POLICY "Global admin can view all contracts" 
ON public.contracts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_global_admin = true)
);

-- 5. Portal de Consulta: Lectura de contratos por ID. La seguridad estricta
--    se maneja a nivel de aplicación (FrontEnd/RPC) requiriendo validación contra contract_signers.
CREATE POLICY "Public read access to specific contracts" 
ON public.contracts FOR SELECT USING (true);
-- Nota: También podríamos restringir la lectura pública si lo preferimos, pero usar "true" para SELECT 
-- facilita que la app cargue los datos si se tiene el ID (UUID), el cual es difícil de adivinar. 

-- Opcional (si queremos restringir que solo se actualice status publicamente por el firmante):
-- Dado que un firmante anónimo (no logueado) debe poder firmar/rechazar, necesitamos permitir actualizaciones
CREATE POLICY "Public update access for signatures" 
ON public.contracts FOR UPDATE USING (true); 

-- ------------------------------------------
-- FIRMANTES (contract_signers)
-- ------------------------------------------
-- 1. Empresas aprobadas pueden insertar firmantes para sus contratos
CREATE POLICY "Companies can insert signers for their contracts" 
ON public.contract_signers FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.contracts WHERE id = contract_id AND owner_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_approved = true)
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

-- ------------------------------------------
-- TRIGGER PARA SINCRONIZAR EMAIL DESDE AUTH (Opcional, pero recomendado)
-- ------------------------------------------
-- (Asumimos que el front enviará el email en el insert del profile, no requiere trigger estricto en este caso simple)
