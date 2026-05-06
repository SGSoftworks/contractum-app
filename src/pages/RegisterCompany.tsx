import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, User, Mail, MapPin, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function RegisterCompany() {
  const [formData, setFormData] = useState({
    companyName: '',
    representativeName: '',
    address: '',
    email: '',
    password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Crear usuario en Auth (Supabase)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      // 2. Insertar solicitud en company_requests
      const { error: requestError } = await supabase
        .from('company_requests')
        .insert({
          company_name: formData.companyName,
          representative_name: formData.representativeName,
          address: formData.address,
          contact_email: formData.email,
          auth_user_id: authData.user.id,
          status: 'pending'
        });

      if (requestError) throw requestError;

      // 3. Crear el profile inicial como 'pending'
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          role: 'pending',
          full_name: formData.representativeName,
          // Un national_id temporal o nulo, pero como requiere UNIQUE, usamos un placeholder único basado en el UUID
          national_id: `PENDING_${authData.user.id.substring(0, 8)}` 
        });

      if (profileError && profileError.code !== '23505') {
        console.error("Error creating profile:", profileError);
        // No lanzamos error para no bloquear la pantalla de éxito si el request ya se creó
      }

      setSuccess(true);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-64 bg-primary-900 skew-y-3 origin-top-left -z-10"></div>
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-8 shadow-xl rounded-2xl border border-slate-100 text-center relative z-10 animate-in zoom-in-95 duration-500">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Solicitud Enviada</h2>
            <p className="text-slate-600 mb-8">
              Tu registro para la empresa <strong>{formData.companyName}</strong> ha sido recibido exitosamente. 
              Un administrador global revisará tu solicitud pronto.
            </p>
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm text-left mb-8 border border-blue-100">
              <p>Podrás iniciar sesión con tu correo (<strong>{formData.email}</strong>) y la contraseña que elegiste, una vez que tu cuenta sea aprobada.</p>
            </div>
            <Link to="/login" className="block w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors">
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-64 bg-slate-900 skew-y-3 origin-top-left -z-10"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="flex items-center gap-4 mb-8 text-white">
          <Link to="/login" className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Registro Empresarial</h2>
            <p className="text-slate-300 mt-1">Solicita acceso para emitir contratos con Contractum</p>
          </div>
        </div>

        <div className="bg-white py-8 px-6 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               {/* Datos de la Empresa */}
               <div className="space-y-5">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Datos de la Empresa</h3>
                 
                 <div>
                   <label className="block text-sm font-medium leading-6 text-slate-900">Nombre de la Empresa</label>
                   <div className="relative mt-2">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Building2 className="h-4 w-4 text-slate-400" /></div>
                     <input required type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="block w-full rounded-md border-0 py-2 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium leading-6 text-slate-900">Dirección Física</label>
                   <div className="relative mt-2">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><MapPin className="h-4 w-4 text-slate-400" /></div>
                     <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="block w-full rounded-md border-0 py-2 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />
                   </div>
                 </div>
               </div>

               {/* Datos del Administrador */}
               <div className="space-y-5">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Cuenta Administradora</h3>
                 
                 <div>
                   <label className="block text-sm font-medium leading-6 text-slate-900">Representante / Admin</label>
                   <div className="relative mt-2">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><User className="h-4 w-4 text-slate-400" /></div>
                     <input required type="text" value={formData.representativeName} onChange={e => setFormData({...formData, representativeName: e.target.value})} className="block w-full rounded-md border-0 py-2 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium leading-6 text-slate-900">Correo Electrónico</label>
                   <div className="relative mt-2">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Mail className="h-4 w-4 text-slate-400" /></div>
                     <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="block w-full rounded-md border-0 py-2 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium leading-6 text-slate-900">Contraseña Maestra</label>
                   <div className="relative mt-2">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Lock className="h-4 w-4 text-slate-400" /></div>
                     <input required type="password" minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="block w-full rounded-md border-0 py-2 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6" />
                   </div>
                   <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres.</p>
                 </div>
               </div>
            </div>

            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
                {error}
              </div>
            )}

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white font-bold py-3 px-4 rounded-lg shadow-sm hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 transition-all disabled:opacity-70"
              >
                {loading ? 'Enviando solicitud...' : 'Crear Cuenta y Solicitar Acceso'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
