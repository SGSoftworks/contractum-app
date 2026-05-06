import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute() {
  const { user, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-primary-600 font-medium">Cargando Contractum...</div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
