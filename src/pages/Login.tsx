import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { user } = useAuthStore();

  if (user) {
    return <Navigate to="/app" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        setSuccessMessage('Enlace enviado a tu correo. Revisa tu bandeja de entrada.');
      } else if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccessMessage('Registro exitoso. Puedes iniciar sesión ahora o revisar tu correo para confirmar.');
        setIsSignUp(false); // Volver a login después de registro exitoso
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-64 bg-primary-900 skew-y-3 origin-top-left -z-10"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logoBasico.png" alt="Contractum Logo" className="h-20 w-auto object-contain drop-shadow-md" />
        </div>
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-white sm:text-slate-900">
          {isSignUp ? 'Crear Cuenta' : 'Bienvenido'}
        </h2>
        <p className="mt-2 text-center text-sm text-primary-100 sm:text-slate-600">
          {isSignUp ? 'Regístrate para usar la plataforma' : 'Inicia sesión para gestionar tus contratos'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100 relative">
          
          {/* Tabs for Login / Sign Up */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setIsMagicLink(false); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-3 text-sm font-semibold flex justify-center items-center gap-2 transition-colors ${!isSignUp ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LogIn className="h-4 w-4" /> Entrar
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setIsMagicLink(false); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-3 text-sm font-semibold flex justify-center items-center gap-2 transition-colors ${isSignUp ? 'text-primary-600 border-b-2 border-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <UserPlus className="h-4 w-4" /> Registrarse
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleAuth}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900">
                Correo electrónico
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-0 py-2 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            {(!isMagicLink || isSignUp) && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900">
                  Contraseña
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border-0 py-2 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
            
            {successMessage && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
                {successMessage}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-70 transition-colors"
              >
                {loading ? 'Procesando...' : isSignUp ? 'Crear Cuenta' : isMagicLink ? 'Enviar Enlace Mágico' : 'Iniciar Sesión'}
              </button>
            </div>
            
            {!isSignUp && (
              <div className="text-sm text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsMagicLink(!isMagicLink)}
                  className="text-primary-600 hover:text-primary-800 font-medium transition-colors"
                >
                  {isMagicLink ? 'Iniciar sesión con contraseña' : 'No tengo contraseña (Usar Magic Link)'}
                </button>
              </div>
            )}
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">¿Eres una Empresa nueva?</h3>
              <p className="text-xs text-slate-500 mb-3">Únete a Contractum para emitir contratos.</p>
              <Link 
                to="/register-company" 
                className="inline-block w-full bg-white border border-slate-300 text-slate-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Solicitar Acceso Empresarial
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
