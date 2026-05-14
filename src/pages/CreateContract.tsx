import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Save, Plus, Trash2, CheckCircle, Copy, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface Signer {
  id: string;
  name: string;
  email: string;
  nationalId: string;
}

export function CreateContract() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
  });

  const [signers, setSigners] = useState<Signer[]>([
    { id: '1', name: '', email: '', nationalId: '' }
  ]);

  const [successData, setSuccessData] = useState<{ id: string, signers: Signer[] } | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Ingrese el contenido o descripción del contrato aquí...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none w-full min-h-[300px] outline-none focus:ring-0 p-4 border rounded-md mt-2 bg-white',
      },
    },
  });

  const handleAddSigner = () => {
    setSigners([...signers, { id: Math.random().toString(), name: '', email: '', nationalId: '' }]);
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
    if (!profile || !profile.is_approved) {
      alert("No puedes crear contratos sin ser una empresa aprobada.");
      return;
    }
    
    if (!formData.title) {
      alert("El título es obligatorio.");
      return;
    }

    const validSigners = signers.filter(s => s.email && s.nationalId);
    if (validSigners.length === 0) {
      alert("Debes agregar al menos un firmante válido (con Correo y Cédula).");
      return;
    }

    setLoading(true);
    try {
      const htmlContent = editor?.getHTML() || '';

      // 1. Insertar Contrato
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .insert({
          owner_id: profile.id,
          title: formData.title,
          content: htmlContent,
          status: 'pending'
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // 2. Insertar Firmantes
      const signersToInsert = validSigners.map(s => ({
        contract_id: contractData.id,
        signer_name: s.name || 'Sin Nombre',
        signer_email: s.email,
        signer_national_id: s.nationalId,
        has_signed: false
      }));

      const { error: signersError } = await supabase
        .from('contract_signers')
        .insert(signersToInsert);

      if (signersError) throw signersError;

      // Redirigir directamente a la lista de contratos
      alert('¡Contrato creado y enviado exitosamente!');
      navigate('/app/contracts');
      
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
          <p className="text-sm text-slate-500">Complete la información y los firmantes</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/app/contracts')} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={loading} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-500 flex items-center gap-2 transition-colors disabled:opacity-70">
            <Save className="h-4 w-4" /> {loading ? 'Guardando...' : 'Crear y Enviar'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Título del contrato *</label>
          <input 
            type="text" 
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-slate-50"
            placeholder="Ej. Contrato de Prestación de Servicios"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Contenido del Contrato *</label>
          <div className="bg-slate-50 p-2 rounded-t-md border border-slate-200 border-b-0 flex gap-2">
            <button onClick={() => editor?.chain().focus().toggleBold().run()} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold hover:bg-slate-100 text-slate-700">B</button>
            <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs italic hover:bg-slate-100 text-slate-700">I</button>
            <button onClick={() => editor?.chain().focus().toggleHeading({level: 2}).run()} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold hover:bg-slate-100 text-slate-700">H2</button>
          </div>
          <div className="bg-slate-50 rounded-b-md">
            <EditorContent editor={editor} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">Firmantes *</label>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nombre Completo</th>
                  <th className="px-4 py-3">Correo Electrónico</th>
                  <th className="px-4 py-3">Cédula</th>
                  <th className="px-4 py-3 w-16 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {signers.map(signer => (
                  <tr key={signer.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <input type="text" placeholder="Ej. Juan Pérez" value={signer.name} onChange={e => updateSigner(signer.id, 'name', e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-primary-500 outline-none" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="email" placeholder="correo@ejemplo.com" value={signer.email} onChange={e => updateSigner(signer.id, 'email', e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-primary-500 outline-none" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="text" placeholder="Ej. 12345678" value={signer.nationalId} onChange={e => updateSigner(signer.id, 'nationalId', e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-primary-500 outline-none" />
                    </td>
                    <td className="px-4 py-3 text-center">
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
                <Plus className="h-4 w-4" /> Agregar Firmante
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
