import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, Edit, Trash2, CheckCircle, Clock, FileEdit, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const statusStyles = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  pending_signature: 'bg-amber-50 text-amber-700 border-amber-200',
  signed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  validated: 'bg-primary-50 text-primary-700 border-primary-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const statusLabels = {
  draft: 'Borrador',
  pending_signature: 'Pendiente',
  signed: 'Firmado',
  validated: 'Validado',
  cancelled: 'Cancelado'
};

const statusIcons = {
  draft: FileEdit,
  pending_signature: Clock,
  signed: CheckCircle,
  validated: CheckCircle,
  cancelled: AlertTriangle
};

interface Contract {
  id: string;
  title: string;
  status: string;
  created_at: string;
  company_id: string;
  created_by: string;
}

export function ContractsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { profile } = useAuthStore();

  useEffect(() => {
    async function fetchContracts() {
      try {
        setLoading(true);
        // El RLS en Supabase se encargará de devolver solo los contratos que nos pertenecen
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setContracts(data || []);
      } catch (err: any) {
        console.error('Error fetching contracts:', err);
        setError('No se pudieron cargar los contratos.');
      } finally {
        setLoading(false);
      }
    }

    fetchContracts();
  }, []);

  const filteredContracts = contracts.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Contratos</h2>
          <p className="text-sm text-slate-500 mt-1">Administre los contratos de la empresa</p>
        </div>
        {/* Solo administradores y empleados pueden crear contratos, no los recipients */}
        {profile?.role !== 'recipient' && (
          <Link 
            to="/contracts/new" 
            className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-500 transition-colors shadow-sm ring-1 ring-primary-700 flex items-center gap-2"
          >
            <span>+</span> Nuevo Contrato
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between">
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
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-sm">
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
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
                  const StatusIcon = statusIcons[contract.status as keyof typeof statusIcons] || FileEdit;
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
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border shadow-sm ${statusStyles[contract.status as keyof typeof statusStyles] || statusStyles.draft}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusLabels[contract.status as keyof typeof statusLabels] || contract.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        {format(new Date(contract.created_at), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/contracts/${contract.id}`} className="text-slate-400 hover:text-primary-600 transition-colors p-1.5 rounded-md hover:bg-primary-50" title="Ver Detalle">
                            <Eye className="h-5 w-5" />
                          </Link>
                          {contract.status === 'draft' && profile?.role !== 'recipient' && (
                            <Link to={`/contracts/new?edit=${contract.id}`} className="text-slate-400 hover:text-amber-600 transition-colors p-1.5 rounded-md hover:bg-amber-50" title="Editar">
                              <Edit className="h-5 w-5" />
                            </Link>
                          )}
                          {contract.status === 'draft' && profile?.role !== 'recipient' && (
                            <button className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50" title="Eliminar">
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
