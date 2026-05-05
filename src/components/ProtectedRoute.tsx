import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute() {
  const { isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-primary-600 font-medium">Cargando Contractum...</div>
    </div>;
  }

  // We are currently in development/mock mode.
  // We can temporarily disable protection by ignoring the user check if we want,
  // or use a placeholder URL.
  // For the sake of testing without a real backend, we will assume user is logged in
  // IF the user doesn't exist AND we are in mock mode. But let's keep it real:
  // if (!user) return <Navigate to="/login" replace />;
  // 
  // Let's force it to allow access for now until Supabase is truly linked:
  
  return <Outlet />;
}
