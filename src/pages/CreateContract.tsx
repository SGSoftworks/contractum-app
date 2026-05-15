import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/store/profileStore';

async function generateHash(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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
    confidentiality: 'Nivel 1 - Público',
    validity: '12 meses'
  });

  const [signers, setSigners] = useState<Signer[]>([
    { id: '1', name: '', email: '', nationalId: '', role: 'Firmante' }
  ]);


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
    setSigners([...signers, { id: Math.random().toString(), name: '', email: '', nationalId: '', role: 'Firmante' }]);
  };

  const handleRemoveSigner = (id: string) => {
    setSigners(signers.filter(s => s.id !== id));
  };

  const updateSigner = (id: string, field: keyof Signer, value: string) => {
    setSigners(signers.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const profile = useProfileStore((state) => state.profile);

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
          status: 'pending',
          jurisdiction: formData.jurisdiction,
          confidentiality_level: formData.confidentiality,
          validity_period: formData.validity
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
        role: s.role || 'Firmante',
        has_signed: false
      }));

      const { error: signersError } = await supabase
        .from('contract_signers')
        .insert(signersToInsert);

      if (signersError) throw signersError;

      // 3. Registrar Log Génesis y guardar hash en el contrato
      try {
        const genesisHash = await generateHash(
          `${contractData.id}-genesis-${profile.id}-${new Date().getTime()}`
        );

        // Guardar el genesis_hash en el contrato (puede fallar si la col no existe aún)
        await supabase
          .from('contracts')
          .update({ genesis_hash: genesisHash })
          .eq('id', contractData.id)
          .then(({ error }) => { if (error) console.warn('genesis_hash col missing:', error.message); });

        // Intentar insertar el log con todos los campos; si falla por columnas faltantes, reintentar con los básicos
        const fullLog = { contract_id: contractData.id, action: 'genesis', actor: profile.full_name || profile.email, hash: genesisHash, previous_hash: null as string | null, details: { origin: 'Web App', owner_email: profile.email, signers_count: validSigners.length } };
        const { error: logErr1 } = await supabase.from('contract_logs').insert(fullLog);
        
        if (logErr1) {
          console.warn('Log extendido falló, reintentando con campos básicos:', logErr1.message);
          // Fallback: insertar solo con las columnas básicas que siempre existen
          const { error: logErr2 } = await supabase.from('contract_logs').insert({
            contract_id: contractData.id,
            action: 'genesis',
            hash: genesisHash,
            details: { origin: 'Web App', owner_email: profile.email }
          });
          if (logErr2) console.warn('Log básico también falló:', logErr2.message);
        }
      } catch (logErr) {
        console.warn('No se pudo guardar el log génesis:', logErr);
      }

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Título del Contrato</label>
            <input 
              type="text" 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-slate-50 font-bold"
              placeholder="Ej. Contrato de Prestación de Servicios"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Jurisdicción</label>
            <input 
              type="text" 
              value={formData.jurisdiction}
              onChange={e => setFormData({...formData, jurisdiction: e.target.value})}
              className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Vigencia</label>
            <input 
              type="text" 
              value={formData.validity}
              onChange={e => setFormData({...formData, validity: e.target.value})}
              className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nivel de Confidencialidad</label>
          <select 
            value={formData.confidentiality}
            onChange={e => setFormData({...formData, confidentiality: e.target.value})}
            className="w-full rounded-xl border border-slate-200 py-3 px-4 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-slate-50"
          >
            <option>Nivel 1 - Público</option>
            <option>Nivel 2 - Interno</option>
            <option>Nivel 3 - Confidencial</option>
            <option>Nivel 4 - Altamente Secreto</option>
          </select>
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
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Cédula</th>
                  <th className="px-4 py-3">Rol / Cargo</th>
                  <th className="px-4 py-3 w-16 text-center"></th>
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
                    <td className="px-4 py-3">
                      <input type="text" placeholder="Ej. Gerente" value={signer.role} onChange={e => updateSigner(signer.id, 'role', e.target.value)} className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-primary-500 outline-none" />
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
