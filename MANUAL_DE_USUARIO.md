# Manual de Usuario: Contractum (Versión Demo)

Este manual explica cómo navegar y utilizar la versión actual de la plataforma Contractum, actualizada con la paleta de colores "Contractum Professional" y la nueva arquitectura de módulos separados.

## Diseño y Navegación "Contractum Professional"
La aplicación ahora utiliza una paleta de colores corporativa y moderna:
- **Azul Principal (`#0F3A67`) y Deep Background (`#0B2A4A`)**: Utilizados en la barra lateral (Sidebar) y botones de acciones primarias para transmitir solidez, confianza y profesionalismo.
- **Cian / Verde Tecnológico (`#2FD1C3`)**: Se utiliza como color de acento, brillando en los iconos y elementos tecnológicos (como la pestaña de Blockchain y acentos interactivos).
- **Escala de Grises**: El fondo general de la app (`#F8FAFC`) y las tarjetas blancas (`#FFFFFF`) se utilizan estratégicamente para mantener un diseño sumamente limpio, resaltando únicamente la información del contrato.

---

## 1. Inicio de Sesión (Simulado)
Al entrar a la aplicación, serás recibido por la pantalla de **Login** (con el nuevo logotipo corporativo).
- Como es una demo con frontend "abierto", cualquier correo que intentes procesar pasará, pero no afectará los datos reales.
- **Magic Link**: Si cambias a "Usar Magic Link", simulará el flujo de envío de correo para las cuentas de firmantes.

## 2. Dashboard Principal (`/`)
Un panel general donde el administrador de la empresa puede ver sus KPIs:
- **Contratos Activos**: Total de contratos.
- **Pendientes de Firma**: Contratos esperando la acción de alguna de las partes.
- **Completados**: Contratos firmados y asegurados en blockchain.

## 3. Lista de Contratos (`/contracts`)
Aquí visualizarás todos los contratos creados por tu empresa.
- **Identificadores Visuales**: Las "píldoras" de colores indican semánticamente el estado: Borrador (`#F59E0B` - Ámbar), Pendiente o Firmado (`#10B981` - Esmeralda).
- **Acciones**: Ver 👁️, Editar ✏️ (solo en Borrador) y Eliminar 🗑️ (rojo `#EF4444`).

## 4. Crear Contrato (`/contracts/new`)
Flujo para emitir un nuevo contrato con metadatos extendidos.
- **Metadatos Legales**: Especifica la Jurisdicción, Nivel de Confidencialidad y Vigencia.
- **Partes del Contrato**: Puedes agregar dinámicamente múltiples personas a la tabla indicando su Nombre, Correo, Cédula y **Rol** (Cliente, Empleador, Testigo).
- **Editor**: Un espacio nativo enriquecido (Tiptap) para redactar las cláusulas.

## 5. Visualización y Flujo Inteligente de Firma (`/contracts/:id`)
La pantalla vital para los involucrados.
- **Auto-Detección**: El sistema cruza automáticamente la sesión activa con las partes del contrato. Si no es tu turno o rol, no puedes firmar.
- **Modal de Checkpoint**: Al hacer clic en "Firmar", aparece una pantalla de validación: *"Usted está autenticado como [Nombre] con ID [Cédula]. ¿Confirma que firma como [Rol]?"*.
- **Pad de Firma**: Tras confirmar, podrás dibujar tu firma.
- El PDF descargable recopilará e incrustará **todas** las firmas recogidas y sus respectivos Hashes criptográficos.

## 6. Auditoría (`/audit`)
Panel administrativo tradicional (Módulo separado).
- Muestra una tabla cronológica simple y filtrable de quién hizo qué (ej. "Validación", "Firma", "Creación de Contrato").

## 7. Blockchain (`/blockchain`)
Panel de transparencia e integridad técnica (Módulo separado).
- Muestra una línea de tiempo inmersiva.
- Cada acción genera un bloque (tarjeta).
- Verás cómo el **Hash del Bloque** (ej. `a6f23e...`) se entrelaza criptográficamente al **Hash Anterior (Prev)**, garantizando que el contrato es inmutable legalmente.

---

## Flujo de Registro (Para Producción)

Como la plataforma es **B2B**, el registro real será así:
1. **Creación del Tenant (Empresa)**: El Super Administrador inserta a la empresa en la base de datos.
2. **Invitación**: Se le envía un "Magic Link" o "Auth Invite" de Supabase al representante legal.
3. **Reclamación**: El representante entra, define su contraseña y adquiere el rol `company_admin`. A partir de ahí, gestiona sus contratos de forma autónoma.
