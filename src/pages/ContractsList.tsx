import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Copy, Trash2, CheckCircle, Clock, AlertTriangle, XCircle, FileText, Shield, Hash, ArrowRight, Download, Eye, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface ContractSigner {
  id: string;
  signer_name: string;
  signer_email: string;
  signer_national_id: string;
  role: string;
  status: 'pending' | 'signed' | 'rejected';
  has_signed: boolean;
  rejection_reason?: string;
  signed_at?: string;
  signature_data?: string;
}

interface ContractLog {
  id: string;
  action: string;
  action_timestamp: string;
  hash: string;
  details: any;
}

interface Contract {
  id: string;
  title: string;
  status: string;
  created_at: string;
  owner_id: string;
  pdf_url?: string;
  genesis_hash?: string;
}
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

export function ContractsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Timeline State
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [signers, setSigners] = useState<ContractSigner[]>([]);
  const [logs, setLogs] = useState<ContractLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const { profile } = useAuthStore();

  useEffect(() => {
    fetchContracts();
  }, []);

  async function fetchContractHistory(contract: Contract) {
    setSelectedContract(contract);
    setLoadingHistory(true);
    try {
      const { data: signersData } = await supabase
        .from('contract_signers')
        .select('*')
        .eq('contract_id', contract.id)
        .order('signer_name', { ascending: true });
        
      const { data: logsData, error: fetchErr } = await supabase
        .from('contract_logs')
        .select('*')
        .eq('contract_id', contract.id)
        .order('action_timestamp', { ascending: true });
        
      setSigners(signersData || []);
      setLogs(logsData || []);

      if (fetchErr && fetchErr.code !== '42P01') { 
        console.error("Error fetching logs:", fetchErr);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

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
      // RLS allows public reading by ID, so we MUST filter by owner_id in the dashboard
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('owner_id', profile?.id)
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
                    <tr 
                      key={contract.id} 
                      onClick={() => fetchContractHistory(contract)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
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
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyLink(contract.id);
                            }} 
                            className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-md hover:bg-blue-50" title="Copiar Link de Consulta"
                          >
                            <Copy className="h-5 w-5" />
                          </button>
                          {contract.pdf_url && (
                             <a 
                               href={contract.pdf_url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               onClick={(e) => e.stopPropagation()}
                               className="text-slate-400 hover:text-emerald-600 transition-colors p-1.5 rounded-md hover:bg-emerald-50" title="Descargar PDF"
                             >
                               <Download className="h-5 w-5" />
                             </a>
                          )}
                          <Link 
                            to={`/app/contracts/${contract.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-primary-600 transition-colors p-1.5 rounded-md hover:bg-primary-50" title="Ver Documento Completo"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
                          {contract.status === 'pending' && !profile?.is_global_admin && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(contract.id);
                              }} 
                              className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-md hover:bg-red-50" title="Cancelar"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                          <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
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

      {/* Timeline Slide-over */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedContract(null)} />
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-md transform transition-all animate-in slide-in-from-right duration-300">
              <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl">
                <div className="px-6 py-6 bg-primary-900 text-white">
                  <div className="flex items-start justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Shield className="h-5 w-5 text-secondary-400" />
                      Auditoría de Contrato
                    </h2>
                    <button onClick={() => setSelectedContract(null)} className="rounded-md text-primary-200 hover:text-white">
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-primary-200 opacity-80">ID: {selectedContract.id}</p>
                    <h3 className="text-xl font-bold mt-1">{selectedContract.title}</h3>
                  </div>
                </div>

                <div className="relative flex-1 px-6 py-8">
                  {loadingHistory ? (
                    <div className="flex justify-center py-12">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="space-y-8 relative">
                      {/* Vertical line connector */}
                      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100" />

                      {/* Nodo 1: Creación */}
                      <div className="relative pl-10">
                        <div className="absolute left-0 top-0 h-8 w-8 rounded-full bg-slate-900 border-4 border-white shadow-sm flex items-center justify-center z-10">
                          <FileText className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Punto de Origen</p>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">Contrato Generado</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(selectedContract.created_at), 'dd/MM/yyyy HH:mm:ss')}
                          </p>
                          <div className="mt-2 bg-slate-50 rounded-lg p-2 border border-slate-100 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                               <Hash className="h-3 w-3 text-slate-400" />
                               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Hash de Bloque Génesis</span>
                            </div>
                            <span className="text-[10px] font-mono text-primary-700 break-all leading-tight">
                               {logs.find(l => l.action === 'genesis')?.hash || selectedContract.genesis_hash || 'PENDIENTE_DE_REGISTRO'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Nodos de Firma */}
                      {signers.map((signer) => {
                        const signerLog = logs.find(l => l.details?.role === signer.role || l.details?.signer_name === signer.signer_name);
                        return (
                          <div key={signer.id} className="relative pl-10">
                            <div className={`absolute left-0 top-0 h-8 w-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${
                              signer.has_signed ? 'bg-emerald-500' : 
                              signer.status === 'rejected' ? 'bg-red-500' : 'bg-amber-400'
                            }`}>
                              {signer.has_signed ? <CheckCircle className="h-4 w-4 text-white" /> : 
                               signer.status === 'rejected' ? <XCircle className="h-4 w-4 text-white" /> : <Clock className="h-4 w-4 text-white" />}
                            </div>
                            <div>
                              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                signer.has_signed ? 'text-emerald-600' : 
                                signer.status === 'rejected' ? 'text-red-600' : 'text-amber-500'
                              }`}>
                                {signer.role || 'Interesado'}
                              </p>
                              <h4 className="text-sm font-bold text-slate-900 mt-1">{signer.signer_name}</h4>
                              <p className="text-xs text-slate-500 mt-1">
                                {signer.has_signed 
                                  ? `Firma validada el ${format(new Date(signer.signed_at!), 'dd/MM/yyyy HH:mm')}`
                                  : signer.status === 'rejected' 
                                    ? `Rechazó: "${signer.rejection_reason || 'Sin motivo especificado'}"` 
                                    : 'Pendiente de confirmación de identidad'}
                              </p>
                              
                              {signer.has_signed && signerLog && (
                                <div className="mt-3 bg-emerald-50/30 rounded-lg p-2.5 border border-emerald-100/50">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Shield className="h-3 w-3 text-emerald-600" />
                                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Hash de Transacción</span>
                                  </div>
                                  <p className="text-[9px] font-mono text-emerald-600 break-all leading-relaxed bg-white/50 p-1.5 rounded border border-emerald-50">
                                    {signerLog.hash}
                                  </p>
                                  <div className="mt-2 flex items-center justify-between">
                                     <span className="text-[8px] font-bold text-emerald-500">PROBADO POR BLOCKCHAIN</span>
                                     <span className="text-[8px] font-mono text-slate-400">NONCE: {signerLog.id.substring(0, 6)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Nodo Final: Cierre */}
                      <div className="relative pl-10">
                        <div className={`absolute left-0 top-0 h-8 w-8 rounded-full border-4 border-white shadow-md flex items-center justify-center z-10 ${
                          selectedContract.status === 'signed' ? 'bg-indigo-900' : 
                          selectedContract.status === 'rejected' ? 'bg-red-600' : 'bg-slate-200'
                        }`}>
                          <Lock className={`h-4 w-4 ${selectedContract.status === 'signed' || selectedContract.status === 'rejected' ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                            selectedContract.status === 'signed' ? 'text-indigo-600' : 
                            selectedContract.status === 'rejected' ? 'text-red-600' : 'text-slate-400'
                          }`}>Cierre de Ciclo</p>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">
                            {selectedContract.status === 'signed' ? 'Documento Finalizado' : 
                             selectedContract.status === 'cancelled' ? 'Ciclo Cancelado' : 
                             selectedContract.status === 'rejected' ? 'Ciclo Rechazado' : 'En Espera de Firmas'}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {selectedContract.status === 'signed' 
                              ? 'Acuerdo legalmente vinculado y sellado.' 
                              : selectedContract.status === 'rejected'
                              ? 'El proceso ha finalizado debido al rechazo de una de las partes.'
                              : 'El documento no podrá cerrarse hasta que todas las partes firmen.'}
                          </p>
                          
                          {selectedContract.status === 'signed' && (
                            <div className="mt-2 bg-indigo-50 rounded-lg p-2 border border-indigo-100 flex flex-col gap-1">
                               <div className="flex items-center gap-2">
                                  <Shield className="h-3 w-3 text-indigo-400" />
                                  <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">Hash Final de Integridad</span>
                               </div>
                               <span className="text-[10px] font-mono text-indigo-900 break-all leading-tight">
                                  {logs.find(l => l.action.includes('Firma'))?.hash || 'INTEGRITY_VERIFIED_OK'}
                                </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {(selectedContract.status === 'signed' || selectedContract.status === 'rejected') && (
                        <div className="mt-6 space-y-3">
                          <Link 
                            to={`/app/contracts/${selectedContract.id}`}
                            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                          >
                            <Eye className="h-4 w-4" />
                            Ver Documento Completo
                          </Link>

                          {selectedContract.pdf_url && (
                            <a 
                              href={selectedContract.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center justify-center gap-2 bg-primary-50 text-primary-700 py-3 rounded-xl font-bold border border-primary-100 hover:bg-primary-100 transition-all"
                            >
                              <Download className="h-4 w-4" />
                              Descargar PDF Oficial
                            </a>
                          )}
                        </div>
                      )}
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
