import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/store/profileStore';
import { Settings as SettingsIcon, Lock, CheckCircle } from 'lucide-react';

export function Settings() {
  const profile = useProfileStore((state) => state.profile);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary-600" /> Configuración de la Cuenta
        </h2>
        <p className="text-sm text-slate-500 mt-1">Administra la seguridad y los datos de tu perfil.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Lock className="h-5 w-5 text-slate-500" /> Seguridad y Acceso
          </h3>
          <p className="text-sm text-slate-600 mt-1">Establece o cambia tu contraseña maestra para no depender siempre del enlace mágico por correo.</p>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-md">
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Nueva Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 mt-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 mt-2"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
            
            {success && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Contraseña actualizada exitosamente.
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="bg-slate-900 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-70"
              >
                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Datos Actuales de tu Perfil</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-slate-500 mb-1">Nombre Completo</span>
              <strong className="text-slate-900">{profile?.full_name || 'No definido'}</strong>
            </div>
            <div>
              <span className="block text-slate-500 mb-1">Cédula / Documento</span>
              <strong className="text-slate-900">{profile?.national_id || 'No definido'}</strong>
            </div>
            <div>
              <span className="block text-slate-500 mb-1">Rol de Acceso</span>
              <strong className="text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md inline-block">
                {profile?.is_global_admin ? 'Admin Global' : (profile?.is_approved ? 'Empresa Aprobada' : 'Pendiente')}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
