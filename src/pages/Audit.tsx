import { Link } from 'react-router-dom';
import { Database, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';

const MOCK_LOGS = [
  { id: 1, date: new Date('2026-05-01T15:30:00'), action: 'Validación', contract: 'Contrato de Prestación de Servicios', contractId: '1', user: 'Sistema', details: 'Contrato validado correctamente.' },
  { id: 2, date: new Date('2026-05-01T15:28:00'), action: 'Firma', contract: 'Contrato de Prestación de Servicios', contractId: '1', user: 'EmpleadoDemo', details: 'Usuario firmó el contrato.' },
  { id: 3, date: new Date('2026-05-01T10:35:00'), action: 'Agregar parte', contract: 'Contrato de Prestación de Servicios', contractId: '1', user: 'UsuarioDemo', details: 'Se agregó a EmpleadoDemo como Proveedor.' },
  { id: 4, date: new Date('2026-05-01T10:30:00'), action: 'Creación', contract: 'Contrato de Prestación de Servicios', contractId: '1', user: 'UsuarioDemo', details: 'Contrato creado.' },
];

export function Audit() {
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
              placeholder="Buscar en auditoría..."
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50">
             Filtros
          </button>
        </div>
        
        <div className="overflow-x-auto">
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
              {MOCK_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6 text-sm text-slate-600">
                    {format(log.date, 'dd/MM/yyyy hh:mm a')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${log.action === 'Validación' ? 'bg-green-500' : log.action === 'Firma' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      {log.action}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <Link to={`/contracts/${log.contractId}`} className="text-primary-600 hover:text-primary-800 font-medium hover:underline flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {log.contract}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-600">
                    {log.user}
                  </td>
                  <td className="px-3 py-4 text-sm text-slate-500">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
