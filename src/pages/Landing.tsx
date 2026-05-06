import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ShieldCheck, Link as LinkIcon, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';

export function Landing() {
  const { user } = useAuthStore();

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex-shrink-0">
              <img src="/logoAzul.png" alt="Contractum Logo" className="h-10 w-auto" />
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-primary-600 transition-colors hidden sm:block">
                Iniciar Sesión
              </Link>
              <Link to="/register-company" className="rounded-full bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-500 transition-colors">
                Solicitar Acceso
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <div className="relative isolate pt-14 pb-20 sm:pt-24 sm:pb-32 overflow-hidden">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
          </div>
          
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="max-w-2xl">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl mb-6">
                  Gestión de contratos segura y trazable para empresas modernas.
                </h1>
                <p className="text-lg leading-8 text-slate-600 mb-8">
                  Contractum digitaliza tu flujo legal B2B. Firmas electrónicas válidas, almacenamiento seguro e inmutabilidad garantizada mediante trazabilidad criptográfica estilo blockchain.
                </p>
                <div className="flex items-center gap-x-6">
                  <Link to="/register-company" className="rounded-full bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 flex items-center gap-2 transition-all">
                    Registrar mi Empresa <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/login" className="text-sm font-semibold leading-6 text-slate-900 flex items-center gap-2 group">
                    Ya tengo cuenta <span aria-hidden="true" className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
              </div>
              
              {/* Placeholder para la imagen de la aplicación */}
              <div className="relative lg:h-full">
                <div className="w-full aspect-[4/3] rounded-2xl bg-slate-100 border border-slate-200 shadow-2xl flex items-center justify-center overflow-hidden relative">
                  {/* Patrón de fondo temporal */}
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
                  <div className="text-center relative z-10">
                    <img src="/logoBasico.png" alt="Contractum App Placeholder" className="h-24 opacity-20 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">[Espacio reservado para Captura de la App]</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-slate-50 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-base font-semibold leading-7 text-primary-600">Todo en un solo lugar</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">La solución definitiva para acuerdos B2B</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Firma Electrónica</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Agiliza la firma de documentos con captura de rúbrica digital. Tus empleados y clientes firman desde cualquier dispositivo sin necesidad de imprimir.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center mb-6">
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Seguridad y Privacidad</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Sistema de roles avanzado y enlaces mágicos (Magic Links). Solo el personal autorizado por la empresa puede acceder a los documentos confidenciales.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center mb-6">
                  <LinkIcon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Trazabilidad Blockchain</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Cada acción en el contrato se registra con un hash criptográfico SHA-256 encadenado, garantizando la inmutabilidad de la auditoría.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary-900 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl mb-6">¿Listo para optimizar tus procesos legales?</h2>
            <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
              Únete a las empresas que ya están asegurando sus contratos de forma digital, rápida y con total validez legal.
            </p>
            <Link to="/register-company" className="inline-block rounded-full bg-white px-8 py-4 text-sm font-bold text-primary-900 shadow-sm hover:bg-slate-100 transition-colors">
              Comenzar Ahora
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/logoBasico.png" alt="Contractum Logo" className="h-6 w-auto" />
            <span className="font-bold text-slate-800">Contractum</span>
          </div>
          <div className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Contractum. Todos los derechos reservados.
          </div>
          <div className="flex gap-6">
            <Link to="/terms" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Términos y Condiciones
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
