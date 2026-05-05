import { useState } from 'react';
import { ShieldCheck, Link as LinkIcon, Database, ArrowRight, ArrowLeft, CheckCircle, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';

const MOCK_CONTRACTS_SUMMARY = [
  {
    id: 1,
    title: 'Contrato de Prestación de Servicios',
    status: 'Asegurado',
    blocks: 3,
    lastUpdate: new Date('2026-05-01T15:30:00'),
    latestHash: 'a6f23e0b7c1df9a3...'
  },
  {
    id: 2,
    title: 'Acuerdo de Confidencialidad (NDA)',
    status: 'Pendiente',
    blocks: 1,
    lastUpdate: new Date('2026-05-03T09:15:00'),
    latestHash: 'c4e5b902f8a1d7c4...'
  },
  {
    id: 3,
    title: 'Contrato de Arrendamiento Comercial',
    status: 'Asegurado',
    blocks: 4,
    lastUpdate: new Date('2026-05-04T11:45:00'),
    latestHash: '9f8e7d6c5b4a3f2e...'
  }
];

const MOCK_CHAIN = [
  { 
    id: 1, 
    action: 'Creación de Contrato', 
    date: new Date('2026-05-01T10:30:00'),
    hash: 'd88n0g1t4w3k9l2m...', 
    prevHash: 'GENESIS',
    details: 'Creado por Usuario Demo'
  },
  { 
    id: 2, 
    action: 'Firma de Cliente', 
    date: new Date('2026-05-01T15:28:00'),
    hash: 'b9f7k267f8f3a1c9...', 
    prevHash: 'd88n0g1t4w3k9l2m...',
    details: 'Firmado por EmpleadoDemo (CC: 12345678)'
  },
  { 
    id: 3, 
    action: 'Validación de Integridad', 
    date: new Date('2026-05-01T15:30:00'),
    hash: 'a6f23e0b7c1df9a3...', 
    prevHash: 'b9f7k267f8f3a1c9...',
    details: 'Firma matemática y PDF generado'
  }
];

export function Blockchain() {
  const [selectedContract, setSelectedContract] = useState<number | null>(null);

  const contractInfo = MOCK_CONTRACTS_SUMMARY.find(c => c.id === selectedContract);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LinkIcon className="h-6 w-6 text-primary-600" /> Historial en Blockchain
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {selectedContract ? 'Flujo de inmutabilidad del contrato' : 'Resumen criptográfico de todos los contratos'}
          </p>
        </div>
        
        {selectedContract && (
          <button 
            onClick={() => setSelectedContract(null)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a la Lista
          </button>
        )}
      </div>

      {!selectedContract ? (
        // VISTA MAESTRA: LISTA DE CONTRATOS
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:max-w-md">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar contrato por nombre o Hash..."
                className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6">Documento</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Estado Integridad</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Bloques</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900">Hash más reciente</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {MOCK_CONTRACTS_SUMMARY.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6 text-sm">
                      <div className="flex items-center gap-2 font-medium text-slate-900">
                        <FileText className="h-4 w-4 text-slate-400" />
                        {contract.title}
                      </div>
                      <div className="text-slate-500 text-xs mt-1">ID: #{contract.id} • Última act: {format(contract.lastUpdate, 'dd/MM/yy HH:mm')}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {contract.status === 'Asegurado' ? (
                         <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <CheckCircle className="h-3 w-3" /> Seguro
                         </span>
                      ) : (
                         <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            En Proceso
                         </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                         <Database className="h-4 w-4 text-secondary-500" /> {contract.blocks}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className="font-mono text-xs text-primary-700 bg-primary-50 px-2 py-1 rounded border border-primary-100">
                        {contract.latestHash}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button 
                        onClick={() => setSelectedContract(contract.id)}
                        className="text-primary-600 hover:text-primary-900 font-semibold flex items-center justify-end gap-1 w-full"
                      >
                        Ver Cadena <ArrowRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // VISTA DETALLE: FLUJO DE BLOQUES
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-right-8 duration-300">
           <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Database className="h-5 w-5 text-secondary-400" />
              {contractInfo?.title} (ID: {contractInfo?.id})
           </h3>

           <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {MOCK_CHAIN.map((block) => (
                <div key={block.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  
                  {/* Ícono central */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-primary-100 text-primary-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform group-hover:scale-110">
                     <ShieldCheck className="h-4 w-4" />
                  </div>
                  
                  {/* Tarjeta de información */}
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 group-hover:border-primary-300 relative group-hover:-translate-y-1">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">Bloque {block.id}</span>
                        <span className="text-xs text-slate-500">{format(block.date, 'dd/MM/yyyy hh:mm a')}</span>
                     </div>
                     
                     <h4 className="font-semibold text-slate-800 mb-2">{block.action}</h4>
                     <p className="text-sm text-slate-600 mb-4">{block.details}</p>
                     
                     <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                        <div>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hash Anterior (Prev)</p>
                           <p className="font-mono text-xs text-slate-500 break-all">{block.prevHash}</p>
                        </div>
                        <div className="flex justify-center text-slate-300 py-1">
                           <ArrowRight className="h-4 w-4 rotate-90" />
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider">Hash del Bloque</p>
                           <p className="font-mono text-xs font-medium text-secondary-700 break-all bg-secondary-50 p-1.5 rounded border border-secondary-200">
                             {block.hash}
                           </p>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
