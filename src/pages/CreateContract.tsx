import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Save, Plus, Trash2, Shield, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Signer {
  id: string;
  name: string;
  email: string;
  nationalId: string;
  role: string;
}

export function CreateContract() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    jurisdiction: 'Colombia',
    confidentiality: 'Estándar',
    validity: '',
  });

  const [signers, setSigners] = useState<Signer[]>([
    { id: '1', name: 'Usuario Demo', email: 'demo@correo.com', nationalId: '10000000', role: 'Cliente' },
    { id: '2', name: 'EmpleadoDemo', email: 'empleado@correo.com', nationalId: '20000000', role: 'Proveedor' }
  ]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Ingrese el contenido o descripción del contrato aquí...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none w-full min-h-[300px] outline-none focus:ring-0 p-4 border rounded-md mt-2',
      },
    },
  });

  const handleAddSigner = () => {
    setSigners([...signers, { id: Math.random().toString(), name: '', email: '', nationalId: '', role: 'Cliente' }]);
  };

  const handleRemoveSigner = (id: string) => {
    setSigners(signers.filter(s => s.id !== id));
  };

  const updateSigner = (id: string, field: keyof Signer, value: string) => {
    setSigners(signers.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const { profile } = useAuthStore();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile.company_id) {
      alert("No puedes crear contratos sin pertenecer a una empresa.");
      return;
    }
    
    if (!formData.title) {
      alert("El título es obligatorio.");
      return;
    }

    setLoading(true);
    try {
      const htmlContent = editor?.getHTML() || '';

      // 1. Insertar Contrato
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .insert({
          company_id: profile.company_id,
          title: formData.title,
          content: htmlContent,
          jurisdiction: formData.jurisdiction,
          confidentiality_level: formData.confidentiality,
          validity_period: formData.validity,
          status: 'pending_signature',
          created_by: profile.id
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // 2. Insertar Firmantes
      const signersToInsert = signers.map(s => ({
        contract_id: contractData.id,
        signer_name: s.name,
        signer_email: s.email,
        signer_national_id: s.nationalId,
        role: s.role,
        status: 'pending'
      }));

      const { error: signersError } = await supabase
        .from('contract_signers')
        .insert(signersToInsert);

      if (signersError) throw signersError;

      // 3. Insertar Log Inicial (GENESIS)
      // En una implementación robusta, el hash criptográfico debe calcularse con una función SHA-256
      // Para la creación, usamos GENESIS como previous_hash.
      const initialHash = `GENESIS_${contractData.id.replace(/-/g, '').substring(0, 16)}`;
      
      const { error: logError } = await supabase
        .from('contract_logs')
        .insert({
          contract_id: contractData.id,
          user_id: profile.id,
          action: 'Creación de Contrato',
          details: { message: `Creado por ${profile.full_name}`, signers_count: signers.length },
          previous_hash: 'GENESIS',
          hash: initialHash
        });

      if (logError) throw logError;

      navigate('/contracts');
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar el contrato: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Nuevo Contrato</h2>
          <p className="text-sm text-slate-500">Complete la información del nuevo contrato</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/contracts')} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-500 flex items-center gap-2 transition-colors disabled:opacity-70">
            <Save className="h-4 w-4" /> {loading ? 'Guardando...' : 'Guardar Contrato'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Título del contrato *</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  placeholder="Ej. Contrato de Prestación de Servicios"
                />
             </div>

             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción / Contenido *</label>
                <div className="bg-slate-50 p-2 rounded-md border border-slate-200 flex gap-2 mb-2">
                   <button onClick={() => editor?.chain().focus().toggleBold().run()} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold hover:bg-slate-100 text-slate-700">B</button>
                   <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs italic hover:bg-slate-100 text-slate-700">I</button>
                   <button onClick={() => editor?.chain().focus().toggleHeading({level: 2}).run()} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold hover:bg-slate-100 text-slate-700">H2</button>
                </div>
                <div className="bg-white">
                  <EditorContent editor={editor} />
                </div>
             </div>

             <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Partes del contrato *</label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                         <tr>
                            <th className="px-4 py-3">Usuario (Nombre y Email)</th>
                            <th className="px-4 py-3">Cédula / ID</th>
                            <th className="px-4 py-3">Rol</th>
                            <th className="px-4 py-3 w-16 text-center">Acciones</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {signers.map(signer => (
                            <tr key={signer.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                               <td className="px-4 py-3">
                                  <div className="space-y-2">
                                     <input type="text" placeholder="Nombre completo" value={signer.name} onChange={e => updateSigner(signer.id, 'name', e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-primary-500 outline-none" />
                                     <input type="email" placeholder="Correo electrónico" value={signer.email} onChange={e => updateSigner(signer.id, 'email', e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-primary-500 outline-none" />
                                  </div>
                               </td>
                               <td className="px-4 py-3 align-top pt-4">
                                  <input type="text" placeholder="12345678" value={signer.nationalId} onChange={e => updateSigner(signer.id, 'nationalId', e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-primary-500 outline-none" />
                               </td>
                               <td className="px-4 py-3 align-top pt-4">
                                  <select value={signer.role} onChange={e => updateSigner(signer.id, 'role', e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-primary-500 outline-none">
                                     <option value="Cliente">Cliente</option>
                                     <option value="Empleador">Empleador</option>
                                     <option value="Proveedor">Proveedor</option>
                                     <option value="Testigo">Testigo</option>
                                  </select>
                               </td>
                               <td className="px-4 py-3 align-top pt-4 text-center">
                                  <button onClick={() => handleRemoveSigner(signer.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                     <Trash2 className="h-4 w-4" />
                                  </button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                   <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                      <button onClick={handleAddSigner} className="text-primary-600 font-semibold text-sm flex items-center gap-1 hover:text-primary-700 transition-colors">
                         <Plus className="h-4 w-4" /> Agregar usuario
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Metadatos del Documento</h3>
              
              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" /> Jurisdicción
                 </label>
                 <select 
                   value={formData.jurisdiction}
                   onChange={e => setFormData({...formData, jurisdiction: e.target.value})}
                   className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                 >
                    <option value="Colombia">Colombia</option>
                    <option value="México">México</option>
                    <option value="Estados Unidos">Estados Unidos</option>
                    <option value="Internacional">Internacional / Neutra</option>
                 </select>
              </div>

              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-400" /> Confidencialidad
                 </label>
                 <select 
                   value={formData.confidentiality}
                   onChange={e => setFormData({...formData, confidentiality: e.target.value})}
                   className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                 >
                    <option value="Estándar">Estándar</option>
                    <option value="Alta">Alta</option>
                    <option value="Estricta">Estricta (NDA)</option>
                 </select>
              </div>

              <div>
                 <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" /> Vigencia
                 </label>
                 <input 
                   type="text" 
                   value={formData.validity}
                   onChange={e => setFormData({...formData, validity: e.target.value})}
                   placeholder="Ej. 1 Año desde la firma"
                   className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                 />
              </div>

              <div className="bg-primary-50 rounded-lg p-4 border border-primary-100 mt-4">
                 <h4 className="text-xs font-bold text-primary-900 uppercase tracking-wider mb-2">Información Legal</h4>
                 <ul className="text-xs text-primary-800 space-y-1.5">
                    <li><span className="font-semibold">Jurisdicción:</span> {formData.jurisdiction}</li>
                    <li><span className="font-semibold">Nivel:</span> {formData.confidentiality}</li>
                    <li><span className="font-semibold">Vigencia:</span> {formData.validity || 'Indefinida'}</li>
                 </ul>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
