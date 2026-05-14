import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Copy, Trash2, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  signed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-slate-50 text-slate-700 border-slate-200',
};

const statusLabels = {
  pending: 'Pendiente',
  signed: 'Firmado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado'
};

const statusIcons = {
  pending: Clock,
  signed: CheckCircle,
  rejected: XCircle,
  cancelled: AlertTriangle
};

interface Contract {
  id: string;
  title: string;
  status: string;
  created_at: string;
  owner_id: string;
}

export function ContractsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { profile } = useAuthStore();

  useEffect(() => {
    fetchContracts();
  }, []);

  async function fetchContracts() {
    const isFirstLoad = contracts.length === 0;
    if (isFirstLoad) {
      setLoading(true);
      setError(null);
    }

    // Timeout de seguridad
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Tiempo de espera agotado al cargar contratos.');
    }, 10000);
    
    try {
      // RLS handles visibility
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (err: any) {
      console.error('Error fetching contracts:', err);
      setError('Error al cargar contratos: ' + (err.message || 'Fallo de conexión'));
    } finally {
      setLoading(false);
      clearTimeout(timeoutId);
    }
  }

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/view-contract/${id}`;
    navigator.clipboard.writeText(link);
    alert('Enlace copiado: ' + link);
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas cancelar este contrato?')) return;
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
      await fetchContracts();
    } catch (err) {
      alert('Error al cancelar');
    }
  };

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Estado de Contratos</h2>
          <p className="text-sm text-slate-500 mt-1">Gestione el ciclo de vida de sus contratos</p>
        </div>
        
        {!profile?.is_global_admin && profile?.is_approved && (
          <Link 
            to="/app/contracts/new" 
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-500 transition-colors shadow-sm ring-1 ring-primary-700 flex items-center gap-2"
          >
            <span>+</span> Nuevo Contrato
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por título o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap ${statusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
            <button onClick={() => setStatusFilter('pending')} className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap ${statusFilter === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Pendientes</button>
            <button onClick={() => setStatusFilter('signed')} className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap ${statusFilter === 'signed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Firmados</button>
            <button onClick={() => setStatusFilter('rejected')} className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap ${statusFilter === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Rechazados</button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              Cargando contratos...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">ID / Título</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Estado</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Fecha Creado</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredContracts.map((contract) => {
                  const StatusIcon = statusIcons[contract.status as keyof typeof statusIcons] || Clock;
                  return (
                    <tr key={contract.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                        <div className="flex items-center">
                          <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200 group-hover:border-slate-300 transition-colors" title={contract.id}>
                            #{contract.id.substring(0, 4)}
                          </div>
                          <div className="ml-4">
                            <div className="font-semibold text-slate-900">{contract.title}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border shadow-sm ${statusStyles[contract.status as keyof typeof statusStyles] || statusStyles.pending}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusLabels[contract.status as keyof typeof statusLabels] || contract.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        {format(new Date(contract.created_at), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => copyLink(contract.id)} className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-blue-50" title="Copiar Link de Consulta">
                            <Copy className="h-5 w-5" />
                          </button>
                          {/* <Link to={`/app/contracts/${contract.id}`} className="text-slate-400 hover:text-primary-600 transition-colors p-1.5 rounded-md hover:bg-primary-50" title="Ver Detalle Interno">
                            <Eye className="h-5 w-5" />
                          </Link> */}
                          {contract.status === 'pending' && !profile?.is_global_admin && (
                            <button onClick={() => handleCancel(contract.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50" title="Cancelar">
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && filteredContracts.length === 0 && !error && (
            <div className="text-center py-12 text-slate-500">
              No se encontraron contratos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
