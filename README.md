# Contractum - Plataforma de Contratos Digitales

Contractum es un sistema web B2B/B2C diseñado para la gestión integral de contratos digitales. Permite crear, enviar, firmar electrónicamente y auditar contratos mediante un registro inmutable conceptual (Blockchain).

## Diseño y Estética "Contractum Professional"
La interfaz utiliza una paleta de colores corporativa y limpia (Tailwind v4):
- **Deep Background & Primary**: `#0B2A4A` y `#0F3A67` (Sidebar, Logos y botones principales para solidez).
- **Secondary (Acento)**: `#2FD1C3` (Cian para iconos tecnológicos y detalles Blockchain).
- **Grisáceos / Clean UI**: `#F8FAFC` para fondos, logrando una vista espaciosa y legible para documentos legales.

## Arquitectura y Tecnologías Principales
- **Frontend Core**: React 18, TypeScript, Vite.
- **Diseño y UI**: Tailwind CSS v4 (nativa por variables CSS), íconos de `lucide-react`.
- **Backend (BaaS)**: Supabase (PostgreSQL, Authentication, Storage).
- **Gestor de Estado**: `zustand`.
- **Enrutamiento**: `react-router-dom` v6.
- **Generación de Contratos**: `Tiptap` (Editor de Texto Enriquecido).
- **Sistema de Firmas**: `react-signature-canvas` (Captura manualzada con validación de identidad).
- **Exportación de PDF**: `jspdf` y `html2canvas` (Soporte multi-firma del lado del cliente).

---

## 📂 Archivos Clave y Su Comportamiento

Para entender cómo funciona Contractum por debajo, aquí se explica el propósito de los archivos más importantes de la arquitectura:

1. **`App.tsx` & `MainLayout.tsx` (Enrutamiento y Contenedor Base)**
   - **Comportamiento**: `App.tsx` define todas las rutas (URLs) de la aplicación usando React Router. Dependiendo de la ruta, carga una vista u otra.
   - Todo está envuelto en `MainLayout.tsx`, el cual es el "cascarón" visual (El Sidebar oscuro con el logo y la barra superior). Este layout es persistente, lo que significa que al navegar, el menú no recarga, solo cambia el contenido central.

2. **`pages/CreateContract.tsx` (Motor de Creación)**
   - **Comportamiento**: Es el panel donde nace un contrato. Aquí se define el título y los metadatos legales (Jurisdicción, Confidencialidad).
   - Utiliza **TipTap** para ofrecer un editor de texto enriquecido (negritas, cursivas, listas) donde redactar las cláusulas.
   - Contiene un formulario dinámico para inyectar a las **Partes del Contrato** (Multi-Firmantes), guardando a cada involucrado en un arreglo con su respectivo Rol (Empleador, Cliente).

3. **`pages/ContractDetail.tsx` (Visor y Lógica de Firma)**
   - **Comportamiento**: Es el archivo más complejo. Recibe el ID de un contrato y lo renderiza.
   - **Flujo Inteligente**: Cruza el ID Nacional del usuario logueado con la lista de firmantes. Si detecta una coincidencia y el usuario no ha firmado, despliega el botón "Firmar".
   - Al firmar, abre un Modal de Confirmación de Identidad, para luego activar `react-signature-canvas`.
   - Tiene la lógica pesada de `html2canvas` y `jsPDF` para tomarle una "foto" invisible al contrato (incluyendo todas las firmas recolectadas) y compilarlo en un archivo PDF descargable.

4. **`pages/Blockchain.tsx` & `pages/Audit.tsx` (Trazabilidad)**
   - **Audit**: Simplemente lee los logs operativos (cuándo alguien entra, cuándo alguien crea un contrato) y los renderiza en una tabla administrativa fácil de leer.
   - **Blockchain**: Traduce los mismos logs pero enfocado en la inmutabilidad legal. Renderiza visualmente la conexión criptográfica (SHA-256), demostrando que la firma C está enlazada irreversiblemente con la creación A.

5. **`store/authStore.ts` (Cerebro de Autenticación)**
   - **Comportamiento**: Utiliza Zustand para guardar globalmente "Quién está usando la app". Conecta un *listener* directamente a Supabase Auth. Si Supabase detecta que iniciaste sesión o cerraste sesión en otra pestaña, `authStore` reacciona instantáneamente y actualiza toda la interfaz de React.

6. **`supabase_schema.sql` (El Plano del Backend)**
   - **Comportamiento**: No es código React, es puro SQL. Define exactamente qué tablas (Contratos, Firmantes, Logs) existen en la base de datos de Supabase. Además, contiene las políticas RLS (Row Level Security) que prohíben por defecto que un usuario "A" lea el contrato de la empresa "B".

---

## 🚀 De Demo a Producción (Implementando Supabase)

Actualmente, si navegas por la app, todo fluye rápido porque la información es simulada (Mock Data). Los arrays y objetos están "quemados" (hardcoded) en el código.
Para que Contractum deje de ser una maqueta y se convierta en una plataforma transaccional real, **el comportamiento cambiará radicalmente en 3 pilares**:

### 1. Desaparición del Mock Data
- Las tablas quemadas en `ContractsList.tsx` o `ContractDetail.tsx` (ej: `const MOCK_CONTRACTS = [...]`) desaparecerán.
- En su lugar, el estado inicial será un arreglo vacío `[]` y aparecerá un *Loader* o *Spinner* 🔄.
- Por detrás, React enviará una petición a Supabase (`supabase.from('contracts').select('*')`). La información ahora viajará por internet (API), tomará unos milisegundos en llegar y, al recibirse, poblará la interfaz.

### 2. Flujo B2B de Cuentas Reales (Shadow Accounts)
- Al crear un contrato y agregar a "UsuarioDemo (Cliente)", el código React le pedirá a Supabase que verifique si el correo `juan@correo.com` existe.
- Si no existe, Supabase le enviará un **Magic Link** (Enlace Mágico) a su bandeja de correo real (Gmail, Outlook).
- UsuarioDemo hará clic en el correo, será redirigido a Contractum y entrará directamente a firmar su documento. **Ya no podrás simular que eres EmpleadoDemo cambiando el ID en el código**, el sistema exigirá un JWT (JSON Web Token) criptográfico emitido por los servidores de Google/Supabase.

### 3. Almacenamiento en la Nube (Buckets) y Firmas Criptográficas
- Cuando dibujes tu firma, el código ya no solo guardará el trazo visual. Ese trazo se subirá al **Storage de Supabase** (como una imagen en un disco duro en la nube).
- Al generarse el PDF definitivo, el archivo pesado (`.pdf`) no solo se descargará a tu computadora local; se hará un *upload* a Supabase Storage bajo políticas estrictas (solo el Cliente y el Empleador tendrán la llave URL para descargarlo).
- Al mismo tiempo, una **Edge Function** (o trigger de Supabase) generará un Hash SHA-256 real basándose en el archivo PDF, inyectándolo en la tabla de `contract_logs`. El Blockchain dejará de ser una simulación estática y comenzará a generar códigos únicos basados en transacciones matemáticas reales.

---

## Guía de Instalación Local (Entorno Demo Actual)

1. Instalar las dependencias de Node:
   ```bash
   npm install
   ```
2. Ejecutar el servidor de desarrollo Vite:
   ```bash
   npm run dev
   ```
