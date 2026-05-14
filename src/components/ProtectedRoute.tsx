import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute() {
  const { user, profile, isLoading } = useAuthStore();

  const hasStoredSession = Object.keys(localStorage).some(key => key.startsWith('sb-') && key.endsWith('-auth-token'));

  if (isLoading) {
    if (!hasStoredSession) {
      // Si está cargando pero no hay indicios de sesión en memoria, redirigir al login
      return <Navigate to="/login" replace />;
    }
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="text-primary-600 font-medium animate-pulse">Cargando Contractum...</div>
        <button 
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          ¿Tarda mucho? Limpiar caché y recargar
        </button>
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-amber-100">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-6">
            <span className="text-2xl">⏳</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Cuenta Pendiente</h2>
          <p className="text-slate-600 mb-8">
            Tu cuenta empresarial ha sido registrada y está esperando ser aprobada por un administrador global. 
            Te notificaremos cuando tengas acceso a la plataforma.
          </p>
          <button 
            onClick={() => useAuthStore.getState().signOut()}
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
