import { useState, useEffect } from 'react';
import { ArrowLeft, Box, Link as LinkIcon, Shield, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface Log {
  id: string;
  contract_id: string;
  user_id: string;
  action: string;
  action_timestamp: string;
  previous_hash: string;
  hash: string;
}

interface ContractSummary {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

export function Blockchain() {
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar contratos resumidos para la vista Master
  useEffect(() => {
    async function fetchContracts() {
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('id, title, status, created_at')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setContracts(data || []);
      } catch (err) {
        console.error('Error fetching contracts for blockchain:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchContracts();
  }, []);

  // Cargar cadena de bloques cuando se selecciona un contrato
  useEffect(() => {
    if (!selectedContract) return;

    async function fetchLogs() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('contract_logs')
          .select('*')
          .eq('contract_id', selectedContract)
          .order('action_timestamp', { ascending: true }); // Orden cronológico para ver la cadena

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error('Error fetching logs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [selectedContract]);

  if (loading && contracts.length === 0) {
    return <div className="p-8 text-center text-slate-500">Cargando datos de la blockchain...</div>;
  }

  // VISTA MASTER: Lista de contratos
  if (!selectedContract) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LinkIcon className="h-6 w-6 text-secondary-500" /> Explorador de Blockchain
          </h2>
          <p className="text-sm text-slate-500 mt-1">Seleccione un contrato para verificar su integridad y cadena de firmas (hashes).</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900">ID del Contrato</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Título</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Fecha Creación</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-mono text-slate-500">
                    #{contract.id.substring(0, 8)}...
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900">
                    {contract.title}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {format(new Date(contract.created_at), 'dd/MM/yyyy')}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button 
                      onClick={() => setSelectedContract(contract.id)}
                      className="text-secondary-600 hover:text-secondary-900 font-semibold bg-secondary-50 px-3 py-1.5 rounded-md transition-colors"
                    >
                      Ver Cadena
                    </button>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">No hay contratos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // VISTA DETAIL: Cadena de Bloques
  const contractInfo = contracts.find(c => c.id === selectedContract);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <button 
          onClick={() => setSelectedContract(null)}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-slate-100 text-slate-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Cadena de Hashes <Shield className="h-5 w-5 text-green-500" />
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Contrato: <strong className="text-slate-700">{contractInfo?.title}</strong> (#{selectedContract.substring(0,8)})
          </p>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 relative">
         <div className="absolute top-0 bottom-0 left-12 w-1 bg-slate-300 z-0 hidden md:block"></div>
         <div className="space-y-8 relative z-10">
            {loading ? (
              <div className="text-center py-8 text-slate-500">Cargando cadena...</div>
            ) : (
              logs.map((block, index) => (
                <div key={block.id} className="flex flex-col md:flex-row gap-6 items-start">
                   <div className="hidden md:flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-secondary-500 text-white flex items-center justify-center font-bold shadow-md z-10 border-4 border-slate-50">
                         {index}
                      </div>
                   </div>
                   
                   <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="bg-slate-800 text-slate-200 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
                         <div className="flex items-center gap-2">
                            <Box className="h-4 w-4 text-secondary-400" />
                            <span className="font-mono text-xs font-semibold">BLOCK #{index}</span>
                         </div>
                         <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            {format(new Date(block.action_timestamp), 'dd/MM/yyyy HH:mm:ss')}
                         </div>
                      </div>
                      
                      <div className="p-4 space-y-4">
                         <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-primary-500 mt-0.5" />
                            <div>
                               <p className="text-sm font-bold text-slate-800">{block.action}</p>
                               <p className="text-xs text-slate-500">Verificado y Registrado en la Red Contractum</p>
                            </div>
                         </div>

                         <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-[10px] sm:text-xs space-y-2 break-all">
                            <div>
                               <span className="text-slate-400 uppercase font-semibold text-[10px]">Previous Hash</span>
                               <p className="text-slate-600">{block.previous_hash}</p>
                            </div>
                            <div>
                               <span className="text-secondary-600 uppercase font-semibold text-[10px]">Current Hash (SHA-256)</span>
                               <p className="text-slate-800 font-bold">{block.hash}</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              ))
            )}
            
            {!loading && logs.length > 0 && (
              <div className="flex flex-col md:flex-row gap-6 items-start opacity-50">
                 <div className="hidden md:flex flex-col items-center">
                    <div className="h-12 w-12 rounded-full bg-slate-300 text-slate-500 flex items-center justify-center font-bold shadow-sm z-10 border-4 border-slate-50">
                       <LinkIcon className="h-5 w-5" />
                    </div>
                 </div>
                 <div className="flex-1 flex items-center h-12 text-sm font-semibold text-slate-500">
                    Esperando próximo bloque (Firma o Validación)...
                 </div>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
