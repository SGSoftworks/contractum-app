import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Database, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface AuditLog {
  id: string;
  action_timestamp: string;
  action: string;
  contract_id: string;
  user_id: string;
  details: any;
  contracts: { title: string } | null;
  profiles: { full_name: string } | null;
}

export function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      try {
        const { data, error } = await supabase
          .from('contract_logs')
          .select(`
            id,
            action_timestamp,
            action,
            contract_id,
            user_id,
            details,
            contracts(title),
            profiles(full_name)
          `)
          .order('action_timestamp', { ascending: false });

        if (error) throw error;
        setLogs(data as any || []);
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.contracts?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="h-6 w-6 text-primary-600" /> Auditoría
          </h2>
          <p className="text-sm text-slate-500 mt-1">Registro de acciones operativas del sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por acción, contrato o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Cargando registros de auditoría...</div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Fecha y Hora</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Acción</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Contrato</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Usuario</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6 text-sm text-slate-600">
                      {format(new Date(log.action_timestamp), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${log.action.includes('Validación') ? 'bg-green-500' : log.action.includes('Firma') ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        {log.action}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <Link to={`/contracts/${log.contract_id}`} className="text-primary-600 hover:text-primary-800 font-medium hover:underline flex items-center gap-1">
                        <FileText className="h-3 w-3" /> {log.contracts?.title || 'Contrato'}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      {log.profiles?.full_name || 'Desconocido'}
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-500">
                      {log.details?.message || JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">No se encontraron registros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
