import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Users as UsersIcon, CheckCircle, Building2, UserCircle, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

export function Users() {
  const { profile } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.is_global_admin;

  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    // Solo bloqueamos si no hay datos previos
    const isFirstLoad = users.length === 0 && requests.length === 0;
    if (isFirstLoad) {
      setLoading(true);
      setError(null);
    }
    
    // Timeout de seguridad
    const timeoutId = setTimeout(() => {
      if (loading && isFirstLoad) {
        setLoading(false);
        setError('Tiempo de espera agotado al cargar directorio.');
      }
    }, 10000);

    try {
      if (isAdmin) {
        // Cargar solicitudes pendientes (empresas no aprobadas)
        const { data: pendingData, error: e1 } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_approved', false)
          .eq('is_global_admin', false);
        if (e1) throw e1;
        setRequests(pendingData || []);

        // Cargar todos los usuarios (empresas)
        const { data: usersData, error: e2 } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (e2) throw e2;
        setUsers(usersData || []);
      }
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar datos de usuarios.');
    } finally {
      setLoading(false);
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const handleApprove = async (request: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', request.id);

      if (error) throw error;
      alert('Empresa aprobada exitosamente.');
      fetchData();
    } catch (err: any) {
      alert('Error aprobando empresa: ' + err.message);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Cargando directorio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="p-3 bg-red-50 text-red-600 rounded-full">
          <RefreshCcw className="h-8 w-8" />
        </div>
        <p className="text-red-600 font-bold">{error}</p>
        <button 
          onClick={() => fetchData()}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="p-8 text-center text-slate-500">No tienes permisos para ver este módulo.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary-600" /> Directorio de Empresas
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestión global de empresas en la plataforma
          </p>
        </div>
        <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm text-slate-600 transition-colors">
          <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Solicitudes Pendientes */}
      {requests.length > 0 && (
        <div className="bg-amber-50 rounded-xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="p-4 border-b border-amber-200 bg-amber-100/50 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold text-amber-900">Solicitudes de Empresas Pendientes</h3>
            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">{requests.length}</span>
          </div>
          <div className="divide-y divide-amber-200/50">
            {requests.map(req => (
              <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 hover:bg-white transition-colors">
                <div>
                  <h4 className="font-bold text-slate-900">{req.full_name}</h4>
                  <p className="text-sm text-slate-600">{req.email}</p>
                  <p className="text-xs text-slate-500">Documento: {req.national_id}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(req)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-green-800 bg-green-100 rounded-md hover:bg-green-200 transition-colors border border-green-300 shadow-sm">
                    <CheckCircle className="h-4 w-4" /> Aprobar Empresa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista General de Usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <UserCircle className="h-5 w-5 text-slate-600" />
          <h3 className="font-bold text-slate-800">Directorio de Perfiles</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900">Empresa / Nombre</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Email</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Estado</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Fecha Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && users.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-slate-500">Cargando usuarios...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-slate-500">No hay usuarios registrados.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900">{user.full_name}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{user.email}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        user.is_global_admin ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                        user.is_approved ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' :
                        'bg-amber-50 text-amber-700 ring-amber-600/20'
                      }`}>
                        {user.is_global_admin ? 'Admin Global' : user.is_approved ? 'Aprobada' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{format(new Date(user.created_at), 'dd/MM/yyyy')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
