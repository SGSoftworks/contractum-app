# Guía Operativa de Administración B2B (Contractum Simplificado)

Contractum ahora funciona de manera autónoma con una arquitectura **simplificada y ultra-optimizada**.

## FASE 1: Obtener tu Súper-Usuario (Global Admin)

1. En la pantalla principal de Contractum, haz clic en **"Registrarse"**.
2. Ingresa tu correo y elige una contraseña maestra. Al entrar, pasarás por el Onboarding (Nombre y Cédula).
3. **Para hacerte Administrador Global:**
   * Ve a **Supabase** -> **Table Editor** -> `profiles`.
   * Busca tu fila y marca la casilla `is_global_admin` como `true` (Y si quieres, pon `is_approved` en `true` también).
   * Refresca la página en tu navegador. ¡Aparecerá el menú de "Usuarios"!

---

## FASE 2: Dar de alta a una Empresa Cliente

Las empresas ahora tienen un proceso de validación seguro.

1. **La Empresa hace la solicitud:**
   * Comparte el enlace de tu app. En la pantalla de inicio, el representante de la empresa se registra.
   * Al terminar su Onboarding, si la empresa no ha sido aprobada previamente, el sistema la bloqueará con una pantalla de **"Cuenta Pendiente"**.

2. **Tú (Global Admin) apruebas la solicitud:**
   * Entra a Contractum con tu cuenta (que ya tiene `is_global_admin = true`).
   * Ve al módulo de **"Usuarios" (Directorio de Empresas)**.
   * Verás una alerta con las solicitudes de empresas pendientes (las que tienen `is_approved = false`).
   * Haz clic en **"Aprobar Empresa"**. 
   * *Mágicamente:* El sistema actualizará el perfil (`is_approved = true`). Ahora la empresa puede iniciar sesión, ver su Dashboard y crear contratos.

---

## FASE 3: Flujo de Firma (Portal de Consulta Público)

¡El flujo de firma es ahora mucho más fácil! **Los firmantes NO necesitan registrarse ni tener cuenta.**

1. **La Empresa crea un contrato:** El administrador aprueba un contrato y asigna los firmantes en el formulario usando sus nombres, cédulas y correos.
2. **Distribución del enlace:** La empresa comparte el enlace de consulta del contrato (`/view-contract/[ID-DEL-CONTRATO]`) con los firmantes.
3. **El Firmante ingresa al Portal Seguro:**
   * El firmante abre el enlace. El sistema le pedirá que valide su identidad introduciendo su **Cédula y Correo Electrónico**.
   * Una vez validadas las credenciales, podrá ver el documento completo.
   * Podrá dibujar su firma digital directamente en el lienzo (canvas) integrado y darle a "Firmar".
   * El estado del contrato cambiará automáticamente a "Firmado".

> [!TIP]
> **Gestión de Seguridad:** Todos los usuarios pueden ir al menú de **"Configuración"** en la barra lateral para establecer o cambiar su contraseña maestra.
