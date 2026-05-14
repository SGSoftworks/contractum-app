# Contractum - Plataforma de Contratos Digitales Professional

Contractum es un ecosistema legaltech diseñado para la gestión integral de contratos digitales con auditoría de trazabilidad inmutable (estilo Blockchain). Permite a las empresas crear documentos, gestionar múltiples firmantes y garantizar la integridad legal mediante hashes criptográficos SHA-256.

## 🛡️ Trazabilidad y Seguridad (Blockchain-Style)
A diferencia de un gestor de archivos común, Contractum genera una **cadena de confianza**:
- **Bloque Génesis**: Cada contrato nace con un hash único que vincula su contenido original.
- **Validación de Identidad**: Antes de firmar, el sistema valida la Cédula/DNI y el Correo del interesado.
- **Nodos de Firma**: Cada firma genera un nuevo "bloque" en el historial de auditoría con su propio hash y Nonce de verificación.
- **Sello Final**: Al completarse todas las firmas, el sistema emite un certificado de cierre legalizado.

## 🎨 Estética Professional & UI
- **Paleta Corporativa**: Basada en `Deep Blue (#0B2A4A)` para confianza y `Cyber Cyan (#2FD1C3)` para el toque tecnológico.
- **Modo Documento**: El visor de contratos emula papel real con tipografías optimizadas para lectura legal.
- **Micro-interacciones**: Transiciones suaves y estados de carga animados para una experiencia premium.

## 🚀 Guía de Mantenimiento y Funcionamiento

### 1. Manejo de Caché y Recargas
- **Vite Cache**: Al realizar cambios en la interfaz o estilos, se recomienda usar `Ctrl + F5` (Hard Refresh) en el navegador para forzar la descarga de los últimos activos compilados.
- **Estado Persistente**: La sesión del usuario se mantiene mediante Supabase Auth en `localStorage`. Si el Sidebar no muestra el nombre del usuario, intenta cerrar e iniciar sesión para refrescar el token JWT.

### 2. Generación de PDFs (Lógica Anti-Errores)
- El motor de exportación utiliza `html2canvas` y `jsPDF`. 
- **Importante**: Se ha implementado un filtro de limpieza de estilos CSS modernos (como `oklch`) durante la clonación del documento para asegurar que el PDF se genere sin errores en cualquier navegador moderno.

### 3. Sincronización con Supabase
El sistema depende de 3 tablas principales. Si ves errores 404 en la consola, asegúrate de haber ejecutado el script `supabase_schema.sql` en tu editor SQL de Supabase:
- `contracts`: Almacena el cuerpo y metadatos (Jurisdicción, Vigencia).
- `contract_signers`: Gestiona quién debe firmar y sus datos de identidad.
- `contract_logs`: El corazón de la auditoría donde se guardan los hashes de trazabilidad.

## 📂 Estructura del Proyecto
- `/src/pages/CreateContract.tsx`: Formulario de creación con TipTap y configuración de firmantes.
- `/src/pages/ContractDetail.tsx`: El cerebro del visor. Gestiona firmas internas, lógica de PDF y visualización de metadatos.
- `/src/pages/SignerView.tsx`: Interfaz externa para que clientes/empleados firmen sin necesidad de estar registrados en la empresa.
- `/src/pages/ContractsList.tsx`: Dashboard de control con el Timeline de Auditoría interactivo.

## 🛠️ Próximas Mejoras (Roadmap)
- [ ] **Encriptación de PDF**: Añadir contraseñas a los archivos descargados.
- [ ] **Recordatorios Automáticos**: Enviar correos automáticos si un firmante no ha actuado en 48 horas.
- [ ] **Code Splitting**: Optimizar el tamaño de los archivos para conexiones móviles lentas.
- [ ] **Webhooks**: Notificar a otros sistemas externos cuando un contrato cambie a estado 'Signed'.

---
© 2026 Contractum LegalTech - Seguridad e Integridad en cada firma.
