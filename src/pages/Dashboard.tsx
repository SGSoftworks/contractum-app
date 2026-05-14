import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { FileText, Clock, CheckCircle, Check, X, Search, Building, Mail, ShieldCheck, ExternalLink, Eye } from 'lucide-react';

export function Dashboard() {
  const { profile } = useAuthStore();
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [selectedUserContracts, setSelectedUserContracts] = useState<any[]>([]);
  const [isContractsSlideOverOpen, setIsContractsSlideOverOpen] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [isFetchingUserContracts, setIsFetchingUserContracts] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0
  });
  
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [recentContracts, setRecentContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  async function fetchData() {
    const isFirstLoad = pendingUsers.length === 0 && stats.total === 0;
    
    if (isFirstLoad) {
      setLoading(true);
      setError(null);
    }
    
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('El servidor tarda demasiado en responder. Por favor, recarga la página.');
    }, 10000);

    try {
      if (profile?.is_global_admin) {
        // ... (Admin logic)
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('*')
          .eq('is_global_admin', false)
          .order('created_at', { ascending: false });
          
        if (usersError) throw usersError;

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
        // Fetch stats and recent contracts for companies
        const { data: contracts, error: contractsError } = await supabase
          .from('contracts')
          .select('*')
          .eq('owner_id', profile?.id)
          .order('created_at', { ascending: false });
          
        if (contractsError) throw contractsError;
        
        if (contracts) {
          setStats({
            total: contracts.length,
            pending: contracts.filter(c => c.status === 'pending').length,
            completed: contracts.filter(c => c.status === 'signed').length,
            rejected: contracts.filter(c => c.status === 'rejected').length,
            cancelled: contracts.filter(c => c.status === 'cancelled').length
          });
          setRecentContracts(contracts.slice(0, 5)); // Only show 5 most recent
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

  const handleViewContracts = async (userId: string, userName: string) => {
    setIsFetchingUserContracts(true);
    setSelectedUserName(userName);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setSelectedUserContracts(data || []);
      setIsContractsSlideOverOpen(true);
    } catch (error) {
      console.error('Error fetching user contracts:', error);
      alert('Error al obtener contratos de la empresa');
    } finally {
      setIsFetchingUserContracts(false);
    }
  };

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
                    <button 
                      onClick={() => handleViewContracts(user.id, user.full_name)}
                      disabled={isFetchingUserContracts}
                      className="text-left group/count"
                    >
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest group-hover/count:text-primary-600 transition-colors">Contratos</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-black text-slate-800 group-hover/count:text-primary-700 transition-colors">{user.contractCount || 0}</p>
                        <Eye className="h-4 w-4 text-slate-300 group-hover/count:text-primary-500 transition-colors" />
                      </div>
                    </button>
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

        {/* Slide-over de Contratos de la Empresa */}
        {isContractsSlideOverOpen && (
          <div className="fixed inset-0 z-[100] overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsContractsSlideOverOpen(false)} />
            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="w-screen max-w-2xl transform transition ease-in-out duration-500 sm:duration-700">
                <div className="flex h-full flex-col bg-white shadow-2xl">
                  <div className="px-6 py-8 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900 leading-tight">Contratos Generados</h2>
                        <p className="mt-2 text-sm text-slate-500 flex items-center gap-2 font-medium">
                          <Building className="h-4 w-4" /> {selectedUserName}
                        </p>
                      </div>
                      <button onClick={() => setIsContractsSlideOverOpen(false)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all">
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  <div className="relative flex-1 px-6 py-6 overflow-y-auto bg-slate-50/30">
                    {selectedUserContracts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <FileText className="h-12 w-12 mb-4 opacity-20" />
                        <p className="font-medium text-lg italic">Esta empresa aún no ha creado contratos.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedUserContracts.map((contract) => (
                          <div key={contract.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-uppercase">#{contract.id.substring(0, 8)}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    contract.status === 'signed' ? 'bg-emerald-100 text-emerald-800' : 
                                    contract.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {contract.status === 'signed' ? 'Firmado' : contract.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                  </span>
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 group-hover:text-primary-700 transition-colors">{contract.title}</h4>
                                <p className="text-sm text-slate-500 mt-1 font-medium">Creado el {new Date(contract.created_at).toLocaleDateString()}</p>
                              </div>
                              <Link 
                                to={`/app/contracts/${contract.id}`} 
                                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                              >
                                <ExternalLink className="h-5 w-5" />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
        {/* ... (Existing Stat Cards) ... */}
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

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-slate-400"></div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <X className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Cancelados</h3>
            <p className="mt-1 text-3xl font-bold text-slate-600">{stats.cancelled}</p>
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

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary-600" /> Actividad Reciente
          </h3>
          <a href="/app/contracts" className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors">
            Ver todos los contratos <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {recentContracts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Aún no has generado contratos.</p>
            <a href="/app/contracts" className="mt-4 inline-block bg-primary-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-primary-700 transition-all">
              Crear mi primer contrato
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentContracts.map((contract) => (
              <div key={contract.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    contract.status === 'signed' ? 'bg-emerald-100 text-emerald-800' : 
                    contract.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                    contract.status === 'cancelled' ? 'bg-slate-200 text-slate-700' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {contract.status === 'signed' ? 'Completado' : 
                     contract.status === 'rejected' ? 'Rechazado' : 
                     contract.status === 'cancelled' ? 'Cancelado' :
                     'Pendiente'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">#{contract.id.substring(0, 8)}</span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 group-hover:text-primary-700 transition-colors line-clamp-1 mb-2">{contract.title}</h4>
                <p className="text-xs text-slate-500 flex items-center gap-1 mb-6">
                  <Clock className="h-3 w-3" /> {new Date(contract.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Link 
                    to={`/app/contracts/${contract.id}`}
                    className="flex-1 bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 text-center transition-colors border border-slate-200"
                  >
                    Ver Detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
