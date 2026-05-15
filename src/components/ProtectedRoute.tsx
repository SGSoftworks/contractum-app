import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { supabase } from '@/lib/supabase';

export function ProtectedRoute() {
  const { user, loading } = useAuthStore();
  const profile = useProfileStore((state) => state.profile);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-primary-700 font-semibold text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!profile.is_approved && !profile.is_global_admin) {
    const handleSignOut = async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-amber-100">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-6">
            <span className="text-2xl">⏳</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Cuenta Pendiente</h2>
          <p className="text-slate-600 mb-8">
            Tu cuenta empresarial está en revisión. Te notificaremos cuando tengas acceso completo a la plataforma.
          </p>
          <button
            onClick={handleSignOut}
            className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
