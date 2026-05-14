import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { FileText, Clock, CheckCircle, Users, Check, X } from 'lucide-react';

export function Dashboard() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0
  });
  
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  async function fetchData() {
    // Solo mostramos el spinner bloqueante si es la primera vez (no hay datos)
    const isFirstLoad = pendingUsers.length === 0 && stats.total === 0;
    
    if (isFirstLoad) {
      setLoading(true);
      setError(null);
    }
    
    // Timeout de seguridad para la petición
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('El servidor tarda demasiado en responder. Por favor, recarga la página.');
    }, 10000);

    try {
      if (profile?.is_global_admin) {
        // Fetch users for approval
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_global_admin', false)
          .order('created_at', { ascending: false });
          
        if (usersError) throw usersError;
        setPendingUsers(users || []);
      } else {
        // Fetch stats for companies
        const { data: contracts, error: contractsError } = await supabase
          .from('contracts')
          .select('status');
          
        if (contractsError) throw contractsError;
        
        if (contracts) {
          setStats({
            total: contracts.length,
            pending: contracts.filter(c => c.status === 'pending').length,
            completed: contracts.filter(c => c.status === 'signed').length
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
      clearTimeout(timeoutId);
    }
  }

  const handleApprove = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: !currentStatus })
        .eq('id', userId);
        
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error al actualizar estado del usuario');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="p-3 bg-red-50 text-red-600 rounded-full">
          <X className="h-8 w-8" />
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

  if (profile?.is_global_admin) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Panel de Administración Global</h2>
          <p className="text-sm text-slate-500 mt-1">Gestiona las aprobaciones de empresas en la plataforma</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-600" />
            <h3 className="font-semibold text-slate-800">Empresas Registradas</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Empresa / Contacto</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Cédula / NIT</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pendingUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No hay empresas registradas.
                    </td>
                  </tr>
                ) : (
                  pendingUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{user.full_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.national_id || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.is_approved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {user.is_approved ? 'Aprobado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button
                          onClick={() => handleApprove(user.id, user.is_approved)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            user.is_approved 
                              ? 'text-red-700 bg-red-50 hover:bg-red-100'
                              : 'text-green-700 bg-green-50 hover:bg-green-100'
                          }`}
                        >
                          {user.is_approved ? (
                            <><X className="h-4 w-4" /> Revocar</>
                          ) : (
                            <><Check className="h-4 w-4" /> Aprobar</>
                          )}
                        </button>
                      </td>
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Panel Principal</h2>
        <p className="text-sm text-slate-500 mt-1">Resumen general de la actividad de contratos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Contratos Activos</h3>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6 flex items-start gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-800">Pendientes de Firma</h3>
            <p className="mt-1 text-3xl font-bold text-amber-600">{stats.pending}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6 flex items-start gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-emerald-800">Completados</h3>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{stats.completed}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
