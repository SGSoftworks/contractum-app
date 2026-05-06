import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Clock, CheckCircle } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase
          .from('contracts')
          .select('status');
          
        if (error) throw error;
        
        if (data) {
          setStats({
            total: data.length,
            pending: data.filter(c => c.status === 'pending_signature').length,
            completed: data.filter(c => c.status === 'signed' || c.status === 'validated').length
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Panel Principal</h2>
        <p className="text-sm text-slate-500 mt-1">Resumen general de la actividad de contratos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Contratos Activos</h3>
            <p className="mt-1 text-3xl font-bold text-slate-900">{loading ? '-' : stats.total}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6 flex items-start gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-800">Pendientes de Firma</h3>
            <p className="mt-1 text-3xl font-bold text-amber-600">{loading ? '-' : stats.pending}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6 flex items-start gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-emerald-800">Completados</h3>
            <p className="mt-1 text-3xl font-bold text-emerald-600">{loading ? '-' : stats.completed}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
