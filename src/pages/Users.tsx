import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { Users as UsersIcon, CheckCircle, XCircle, Building2, UserCircle, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

export function Users() {
  const { profile } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'global_admin';
  const isCompanyAdmin = profile?.role === 'company_admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        // Cargar solicitudes pendientes
        const { data: requestsData } = await supabase
          .from('company_requests')
          .select('*')
          .eq('status', 'pending');
        setRequests(requestsData || []);

        // Cargar todos los usuarios
        const { data: usersData } = await supabase
          .from('profiles')
          .select('*, companies(name)')
          .order('created_at', { ascending: false });
        setUsers(usersData || []);
      } else if (isCompanyAdmin) {
        // Cargar empleados de la empresa
        const { data: usersData } = await supabase
          .from('profiles')
          .select('*, companies(name)')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false });
        setUsers(usersData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  const handleApprove = async (request: any) => {
    try {
      // 1. Crear la empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({ name: request.company_name })
        .select()
        .single();
      
      if (companyError) throw companyError;

      // 2. Actualizar el perfil del admin de la empresa
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'company_admin', company_id: companyData.id })
        .eq('id', request.auth_user_id);

      if (profileError) throw profileError;

      // 3. Actualizar la solicitud
      const { error: reqUpdateError } = await supabase
        .from('company_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);

      if (reqUpdateError) throw reqUpdateError;

      alert('Empresa aprobada exitosamente.');
      fetchData();
    } catch (err: any) {
      alert('Error aprobando empresa: ' + err.message);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await supabase.from('company_requests').update({ status: 'rejected' }).eq('id', requestId);
      fetchData();
    } catch (err: any) {
      alert('Error rechazando empresa: ' + err.message);
    }
  };

  if (!isAdmin && !isCompanyAdmin) {
    return <div className="p-8 text-center text-slate-500">No tienes permisos para ver este módulo.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary-600" /> Directorio de Usuarios
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin ? 'Gestión global de empresas y usuarios' : 'Gestión de empleados de tu empresa'}
          </p>
        </div>
        <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm text-slate-600 transition-colors">
          <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Solicitudes Pendientes (Solo Global Admin) */}
      {isAdmin && requests.length > 0 && (
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
                  <h4 className="font-bold text-slate-900">{req.company_name}</h4>
                  <p className="text-sm text-slate-600">Representante: {req.representative_name}</p>
                  <p className="text-xs text-slate-500">{req.contact_email} • {req.address}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleReject(req.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors border border-red-200">
                    <XCircle className="h-4 w-4" /> Rechazar
                  </button>
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
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900">Nombre</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Documento</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Rol</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Empresa</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Fecha Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && users.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">Cargando usuarios...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">No hay usuarios registrados.</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900">{user.full_name}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 font-mono">{user.national_id.startsWith('PENDING') ? 'Pendiente' : user.national_id}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        user.role === 'global_admin' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                        user.role === 'company_admin' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                        user.role === 'pending' ? 'bg-amber-50 text-amber-700 ring-amber-600/20' :
                        'bg-slate-50 text-slate-600 ring-slate-500/10'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{user.companies?.name || 'N/A'}</td>
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
