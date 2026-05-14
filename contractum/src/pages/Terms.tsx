import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function Terms() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
            <ArrowLeft className="h-4 w-4" /> Volver al Inicio
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-primary-900 px-8 py-10 text-center sm:px-12 sm:py-16 text-white">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Términos y Condiciones</h1>
            <p className="mt-4 text-primary-100">Última actualización: {new Date().toLocaleDateString()}</p>
          </div>
          
          <div className="px-8 py-10 sm:px-12 prose prose-slate max-w-none">
            <p className="lead text-lg text-slate-600 mb-8">
              Bienvenido a Contractum. Al acceder y utilizar nuestra plataforma de gestión de contratos B2B, aceptas cumplir con los siguientes términos y condiciones. Por favor, léelos detenidamente antes de utilizar nuestros servicios.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">1. Aceptación de los Términos</h2>
            <p className="text-slate-600 mb-6">
              Al registrarte como empresa, crear una cuenta de administrador o firmar un documento a través de Contractum, confirmas que tienes la autoridad legal para vincularte a ti mismo o a la entidad que representas a estos términos.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">2. Validez Legal de la Firma Electrónica</h2>
            <p className="text-slate-600 mb-6">
              Contractum proporciona herramientas para la firma electrónica de documentos. Ambas partes reconocen y aceptan que los documentos firmados mediante nuestra plataforma mediante autenticación segura (Magic Links o contraseña) y captura de rúbrica, tienen plena validez jurídica y efecto vinculante.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">3. Privacidad y Seguridad de la Información</h2>
            <p className="text-slate-600 mb-4">
              Nos tomamos la seguridad muy en serio. Toda la información y documentos cargados en la plataforma están protegidos mediante cifrado y políticas de seguridad a nivel de fila (RLS).
            </p>
            <ul className="list-disc pl-5 text-slate-600 mb-6 space-y-2">
              <li>Los contratos solo son visibles para la empresa emisora y las partes asignadas como firmantes.</li>
              <li>La plataforma utiliza una cadena de bloques conceptual (Hashing SHA-256) para garantizar la inmutabilidad de los registros de auditoría.</li>
              <li>No compartimos tus datos comerciales con terceros bajo ninguna circunstancia sin tu consentimiento explícito.</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">4. Responsabilidades del Usuario</h2>
            <p className="text-slate-600 mb-6">
              Eres responsable de mantener la confidencialidad de tus credenciales de acceso. Cualquier acción realizada bajo tu cuenta será considerada como tuya. Asimismo, es responsabilidad de la empresa emisora verificar la identidad de los firmantes (ej. mediante la Cédula/Documento de Identidad) al momento de asignar los contratos.
            </p>

            <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2">5. Disponibilidad del Servicio</h2>
            <p className="text-slate-600 mb-6">
              Contractum se esfuerza por mantener una disponibilidad del 99.9%. Sin embargo, nos reservamos el derecho de interrumpir el servicio por mantenimiento programado o actualizaciones de seguridad, notificando a las empresas con la debida anticipación cuando sea posible.
            </p>

            <div className="mt-12 bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                Si tienes alguna pregunta sobre estos términos, por favor contacta al administrador global de tu plataforma.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
