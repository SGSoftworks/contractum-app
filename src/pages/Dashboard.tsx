import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { FileText, Clock, CheckCircle, Check, X, Search, Building, Mail, ShieldCheck } from 'lucide-react';

export function Dashboard() {
  const { profile } = useAuthStore();
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    rejected: 0
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

        // Fetch all contracts to count per owner
        const { data: contracts, error: contractsError } = await supabase
          .from('contracts')
          .select('owner_id');

        if (contractsError) throw contractsError;

        const usersWithCounts = (users || []).map(u => ({
          ...u,
          contractCount: (contracts || []).filter(c => c.owner_id === u.id).length
        }));

        setPendingUsers(usersWithCounts);
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
            completed: contracts.filter(c => c.status === 'signed').length,
            rejected: contracts.filter(c => c.status === 'rejected').length
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
    const filteredUsers = pendingUsers.filter(u => 
      u.full_name?.toLowerCase().includes(adminSearchTerm.toLowerCase()) || 
      u.national_id?.includes(adminSearchTerm) ||
      u.email?.toLowerCase().includes(adminSearchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Directorio de Empresas</h2>
            <p className="text-sm text-slate-500 mt-1">Supervisión global de actividad y permisos</p>
          </div>
          
          <div className="relative w-full sm:max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Nombre, NIT o Email..."
              value={adminSearchTerm}
              onChange={(e) => setAdminSearchTerm(e.target.value)}
              className="block w-full rounded-lg border-0 py-2 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No se encontraron empresas con esos criterios.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                      <Building className="h-6 w-6" />
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.is_approved ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {user.is_approved ? 'Autorizado' : 'Pendiente'}
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-bold text-slate-900 mb-1">{user.full_name}</h4>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <ShieldCheck className="h-4 w-4" />
                      <span>NIT/CC: {user.national_id || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Contratos</p>
                      <p className="text-xl font-black text-slate-800">{user.contractCount || 0}</p>
                    </div>
                    <button
                      onClick={() => handleApprove(user.id, user.is_approved)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        user.is_approved 
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-white bg-primary-600 hover:bg-primary-700 shadow-sm shadow-primary-200'
                      }`}
                    >
                      {user.is_approved ? (
                        <><X className="h-4 w-4" /> Revocar</>
                      ) : (
                        <><Check className="h-4 w-4" /> Aprobar</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Panel Principal</h2>
        <p className="text-sm text-slate-500 mt-1">Resumen general de la actividad de contratos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6 flex items-start gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
            <X className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-red-800">Rechazados</h3>
            <p className="mt-1 text-3xl font-bold text-red-600">{stats.rejected}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
