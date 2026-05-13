import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ShieldCheck, User } from 'lucide-react';

export function Onboarding() {
  const { user, profile, fetchProfile } = useAuthStore();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If they already have a profile, send them to the dashboard
  if (profile) {
    return <Navigate to="/" replace />;
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create profile record
      const { error: insertError } = await supabase.from('profiles').insert({
        id: user.id,
        full_name: fullName,
        national_id: nationalId,
        email: user.email
      });

      if (insertError) {
        if (insertError.code === '23505') {
           throw new Error('Esa cédula ya se encuentra registrada en el sistema.');
        }
        throw insertError;
      }

      // Refresh profile in the store
      await fetchProfile(user.id);
      
      // Redirect to home
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al guardar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/logoBasico.png" alt="Contractum Logo" className="h-20 w-auto object-contain drop-shadow-sm" />
        </div>
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-primary-900">
          Completa tu Perfil
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Necesitamos tus datos legales para que puedas firmar contratos.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSaveProfile}>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium leading-6 text-slate-900">
                Nombre Completo
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
            </div>

            <div>
              <label htmlFor="nationalId" className="block text-sm font-medium leading-6 text-slate-900">
                Cédula / Documento de Identidad
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <ShieldCheck className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="nationalId"
                  type="text"
                  required
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  placeholder="Ej: 10000000"
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Este número debe coincidir con el documento con el que la empresa emitió tu contrato.
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 disabled:opacity-70 transition-colors"
              >
                {loading ? 'Guardando...' : 'Guardar y Continuar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
