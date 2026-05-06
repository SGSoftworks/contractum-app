# Guía Operativa de Administración B2B (Contractum SaaS)

Contractum ahora funciona de manera autónoma como un Software as a Service (SaaS). Ya no necesitas inyectar datos manualmente en Supabase todo el tiempo.

## FASE 1: Obtener tu Súper-Usuario (Global Admin)

1. En la pantalla principal de Contractum, haz clic en **"Registrarse"** (en lugar de Iniciar Sesión).
2. Ingresa tu correo y elige una **contraseña maestra**. Haz clic en "Crear Cuenta".
3. Al entrar, pasarás por el Onboarding (Nombre y Cédula). El sistema te dejará con el rol por defecto (`recipient`).
4. **Para hacerte Administrador Global:**
   * Ve a **Supabase** -> **Table Editor** -> `profiles`.
   * Busca tu fila y cambia tu rol de `recipient` a `global_admin`.
   * Refresca la página en tu navegador. ¡Aparecerá el menú de "Usuarios"!

---

## FASE 2: Dar de alta a una Empresa Cliente

Las empresas ahora solicitan su propio acceso.

1. **La Empresa hace la solicitud:**
   * Comparte el enlace de tu app. En la pantalla de inicio, la empresa debe hacer clic en el banner inferior: **"Solicitar Acceso Empresarial"** (o ir a `/register-company`).
   * La empresa llena sus datos (Nombre de empresa, representante, correo y **elige su propia contraseña**).
   * Al darle enviar, verán una pantalla de éxito, pero si intentan iniciar sesión, el sistema los bloqueará diciendo que su cuenta está **"Pendiente"**.

2. **Tú (Global Admin) apruebas la solicitud:**
   * Entra a Contractum con tu cuenta `global_admin`.
   * Ve al nuevo módulo de **"Usuarios"**.
   * Verás una alerta naranja con las solicitudes pendientes.
   * Haz clic en **"Aprobar Empresa"**. 
   * *Mágicamente:* El sistema creará a la empresa y le dará acceso total al representante. Ya pueden iniciar sesión con su contraseña.

---

## FASE 3: Flujo del Empleado (Firma de Contratos)

1. El Administrador de la Empresa crea un contrato y asigna al empleado poniendo su Cédula y su Correo.
2. El Administrador de la Empresa avisa al empleado que tiene un contrato pendiente.
3. **El empleado ingresa a la plataforma:**
   * Puede usar el **Magic Link** (para entrar sin registrarse) o ir a "Registrarse" y poner una contraseña.
   * Llena su Onboarding usando **la misma Cédula** que la empresa le asignó.
   * Entra a la plataforma, ve el contrato, dibuja su firma y sella el bloque.

> [!TIP]
> **Independencia del Magic Link:** Ahora, en cualquier momento, cualquier usuario puede ir al menú de **"Configuración"** en la barra lateral e ingresar una nueva contraseña para no tener que depender de su correo electrónico cada vez que quiera entrar.
