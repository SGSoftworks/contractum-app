export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500">Contratos Activos</h3>
          <p className="mt-2 text-3xl font-bold text-slate-900">12</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500">Pendientes de Firma</h3>
          <p className="mt-2 text-3xl font-bold text-amber-600">5</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500">Completados (Mes)</h3>
          <p className="mt-2 text-3xl font-bold text-primary-600">28</p>
        </div>
      </div>
    </div>
  );
}
