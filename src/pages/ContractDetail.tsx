import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ShieldCheck, PenTool, X, Download, UserCircle } from 'lucide-react';
import SignaturePad from 'signature_pad';
import { format } from 'date-fns';
import * as jspdf from 'jspdf';
// @ts-ignore
// @ts-ignore
const jsPDF: any = jspdf.jsPDF || jspdf.default || jspdf;
import html2canvas from 'html2canvas';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

async function generateHash(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [signers, setSigners] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<'confirm' | 'sign'>('confirm');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isModalOpen && step === 'sign' && canvasRef.current && !signaturePadRef.current) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      
      const resizeCanvas = () => {
        const container = containerRef.current;
        if (container && canvas) {
          const width = container.offsetWidth;
          const height = 192;
          canvas.width = width * ratio;
          canvas.height = height * ratio;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          canvas.getContext("2d")?.scale(ratio, ratio);
          signaturePadRef.current?.clear();
        }
      };

      window.addEventListener("resize", resizeCanvas);
      setTimeout(resizeCanvas, 100); // Wait for modal animation

      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgb(248, 250, 252)'
      });
      
      return () => window.removeEventListener("resize", resizeCanvas);
    }
    
    // Clear ref when step changes or modal closes
    if (!isModalOpen || step !== 'sign') {
      signaturePadRef.current = null;
    }
  }, [isModalOpen, step]);

  const fetchContractData = async () => {
    try {
      setLoading(true);
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();
        
      if (contractError) throw contractError;
      
      const { data: signersData, error: signersError } = await supabase
        .from('contract_signers')
        .select('*')
        .eq('contract_id', id)
        .order('role', { ascending: true });
        
      if (signersError) throw signersError;
      
      setContract(contractData);
      setSigners(signersData || []);
    } catch (err: any) {
      console.error(err);
      setError('No se pudo cargar el contrato.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchContractData();
    }
  }, [id]);

  if (loading) return <div className="text-center p-12">Cargando documento...</div>;
  if (error || !contract) return <div className="text-center p-12 text-red-500">{error || 'Contrato no encontrado'}</div>;

  const isFullySigned = signers.every(s => s.status === 'signed');
  const contractStatus = contract.status === 'signed' ? 'signed' : (isFullySigned ? 'signed' : 'pending_signature');

  // Lógica inteligente: Buscar si el usuario actual debe firmar este contrato
  const currentUserSigner = profile ? signers.find(s => s.signer_national_id === profile.national_id) : null;
  const canSign = currentUserSigner && currentUserSigner.status === 'pending';

  const handleOpenSignatureFlow = () => {
    setStep('confirm');
    setIsModalOpen(true);
  };

  const handleConfirmIdentity = () => {
    setStep('sign');
  };

  const handleSign = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert('Por favor, ingresa tu firma.');
      return;
    }
    
    try {
      const signatureData = signaturePadRef.current.toDataURL('image/png');
      
      // Update signer
      const { error: signerError } = await supabase
        .from('contract_signers')
        .update({ status: 'signed', signature_data: signatureData, signed_at: new Date().toISOString() })
        .eq('id', currentUserSigner.id);
        
      if (signerError) throw signerError;

      // Generar Log y Hash
      // Obtener el último hash de este contrato
      const { data: lastLogs } = await supabase
        .from('contract_logs')
        .select('hash')
        .eq('contract_id', id)
        .order('action_timestamp', { ascending: false })
        .limit(1);
        
      const previousHash = lastLogs && lastLogs.length > 0 ? lastLogs[0].hash : 'GENESIS';
      const timestamp = new Date().toISOString();
      const action = `Firma de ${currentUserSigner.role}`;
      const messageToHash = `${previousHash}${id}${action}${timestamp}`;
      const newHash = await generateHash(messageToHash);

      const { error: logError } = await supabase
        .from('contract_logs')
        .insert({
          contract_id: contract.id,
          user_id: profile!.id,
          action: action,
          details: { signer_name: profile!.full_name, role: currentUserSigner.role },
          previous_hash: previousHash,
          hash: newHash
        });

      if (logError) throw logError;

      setIsModalOpen(false);
      
      // Check if this was the last signature
      const remainingSigners = signers.filter(s => s.status === 'pending' && s.id !== currentUserSigner.id);
      if (remainingSigners.length === 0) {
        // Automatically set contract to signed if everyone has signed
        await supabase.from('contracts').update({ status: 'signed' }).eq('id', id);
      }

      await fetchContractData();

    } catch (err: any) {
      console.error(err);
      alert('Error al firmar: ' + err.message);
    }
  };

  const handleClear = () => {
    signaturePadRef.current?.clear();
  };

  const handleGeneratePDF = async () => {
    if (!documentRef.current) return;
    try {
      setIsGenerating(true);
      const canvas = await html2canvas(documentRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // Download local copy
      pdf.save(`Contrato_Contractum_${contract.id.substring(0,8)}.pdf`);
      
      // Subir al Bucket de Supabase si no se ha subido aún
      if (!contract.pdf_url) {
        const pdfBlob = pdf.output('blob');
        const fileName = `${contract.id}.pdf`;
        
        const { error: uploadError } = await supabase.storage
          .from('contracts')
          .upload(fileName, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });
          
        if (!uploadError) {
          const { data } = supabase.storage.from('contracts').getPublicUrl(fileName);
          await supabase.from('contracts').update({ pdf_url: data.publicUrl }).eq('id', contract.id);
        } else {
          console.error("Error subiendo PDF al bucket:", uploadError);
        }
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Hubo un error al generar el documento.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/contracts')} className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-slate-100 text-slate-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{contract.title}</h2>
            <p className="text-sm text-slate-500 mt-1">ID: #{contract.id.substring(0,8)} • Creado el {format(new Date(contract.created_at), 'dd/MM/yyyy')}</p>
          </div>
        </div>
        <div>
           {contractStatus === 'signed' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border shadow-sm bg-blue-50 text-blue-700 border-blue-200">
                <CheckCircle className="h-4 w-4" /> Firmado Completamente
              </span>
           ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border shadow-sm bg-amber-50 text-amber-700 border-amber-200">
                Pendiente de Firmas
              </span>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Document Viewer */}
        <div className="lg:col-span-3">
          <div 
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] p-8 md:p-12 relative flex flex-col"
            ref={documentRef}
          >
             {/* Metadatos visuales en el PDF */}
             <div className="mb-8 pb-4 border-b border-slate-100 flex justify-between items-start text-xs text-slate-500">
                <div>
                  <p><span className="font-semibold text-slate-700">Jurisdicción:</span> {contract.jurisdiction || 'N/A'}</p>
                  <p><span className="font-semibold text-slate-700">Confidencialidad:</span> {contract.confidentiality_level || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-semibold text-slate-700">Vigencia:</span> {contract.validity_period || 'N/A'}</p>
                </div>
             </div>

             <div 
                className="prose max-w-none text-slate-800 flex-1"
                dangerouslySetInnerHTML={{ __html: contract.content }}
             />
             
             {/* Firmas incrustadas */}
             <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8">
                {signers.map(signer => (
                  <div key={signer.id} className="flex flex-col items-center justify-center opacity-90 p-4 border border-dashed border-slate-200 rounded-lg relative">
                    {signer.status === 'signed' ? (
                      <>
                        {signer.signature_data && (
                          <img src={signer.signature_data} alt="Firma" className="h-16 mb-2 object-contain mix-blend-multiply" />
                        )}
                        <div className="text-primary-600 mb-1 absolute top-2 right-2"><ShieldCheck className="h-5 w-5" /></div>
                        <p className="text-sm font-semibold text-slate-700">Firmado por: {signer.signer_name}</p>
                        <p className="text-xs text-slate-500 mt-1">CC: {signer.signer_national_id} • {signer.role}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{signer.signed_at ? format(new Date(signer.signed_at), 'dd/MM/yyyy HH:mm') : ''}</p>
                      </>
                    ) : (
                      <>
                        <div className="text-slate-300 mb-2"><UserCircle className="h-8 w-8" /></div>
                        <p className="text-sm font-medium text-slate-400">Firma Pendiente</p>
                        <p className="text-xs text-slate-400 mt-1">{signer.signer_name} ({signer.role})</p>
                      </>
                    )}
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Sidebar Info & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Partes Involucradas</h3>
            
            <div className="space-y-4">
              {signers.map(signer => (
                <div key={signer.id} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {signer.status === 'signed' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-300" />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{signer.role}</p>
                    <p className="text-sm font-medium text-slate-900 mt-0.5">{signer.signer_name}</p>
                    <p className="text-xs text-slate-500">CC: {signer.signer_national_id}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isFullySigned ? (
             canSign ? (
                <div className="bg-primary-50 rounded-xl shadow-sm border border-primary-100 p-5">
                  <h3 className="text-sm font-semibold text-primary-900 mb-2">Tu Firma es Requerida</h3>
                  <p className="text-xs text-primary-700 mb-4">El sistema detectó que tu usuario está asignado para firmar este documento como <strong>{currentUserSigner?.role}</strong>.</p>
                  <button onClick={handleOpenSignatureFlow} className="w-full bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-primary-500 transition-colors shadow-sm ring-1 ring-primary-700 flex items-center justify-center gap-2">
                    <PenTool className="h-4 w-4" /> Proceder a Firmar
                  </button>
                </div>
             ) : (
                <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5 text-center">
                  <p className="text-sm text-slate-600">Esperando que las partes restantes completen sus firmas.</p>
                </div>
             )
          ) : (
             <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col items-center text-center">
                <CheckCircle className="h-8 w-8 text-primary-600 mb-2" />
                <h3 className="text-sm font-bold text-slate-800 mb-1">Contrato Asegurado</h3>
                <p className="text-xs text-slate-500 mb-4">Todas las partes han firmado este documento.</p>
                <button 
                  onClick={handleGeneratePDF}
                  disabled={isGenerating}
                  className="w-full bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Download className="h-4 w-4" /> {isGenerating ? 'Generando...' : 'Descargar PDF'}
                </button>
             </div>
          )}
        </div>
      </div>

      {/* Signature Modal (Smart Flow) */}
      {isModalOpen && currentUserSigner && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PenTool className="h-5 w-5 text-primary-600" />
                Firma Digital Segura
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {step === 'confirm' ? (
              // PASO 1: Confirmación de Identidad
              <div className="p-6">
                <div className="flex justify-center mb-4">
                   <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                      <UserCircle className="h-10 w-10" />
                   </div>
                </div>
                <h4 className="text-center text-lg font-bold text-slate-800 mb-2">Confirmación de Identidad</h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-sm text-slate-700 space-y-2 text-center">
                   <p>Usted está autenticado actualmente como:</p>
                   <p className="text-lg font-bold text-slate-900">{profile.full_name}</p>
                   <p className="font-mono text-slate-500 bg-slate-200 inline-block px-2 py-0.5 rounded text-xs">ID: {profile.national_id}</p>
                </div>
                <p className="text-sm text-slate-600 text-center font-medium">
                  ¿Confirma que desea firmar este documento vinculante en calidad de <strong className="text-primary-700 bg-primary-50 px-1 py-0.5 rounded">{currentUserSigner.role}</strong>?
                </p>
                <div className="mt-8 flex gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancelar</button>
                  <button onClick={handleConfirmIdentity} className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-500 shadow-sm">Sí, Confirmar y Continuar</button>
                </div>
              </div>
            ) : (
              // PASO 2: Pad de Firma
              <div className="p-6 animate-in fade-in slide-in-from-right-4">
                <p className="text-sm text-slate-600 mb-4 font-medium text-center">
                  Al dibujar su firma, usted acepta todos los términos y condiciones estipulados.
                </p>
                <div ref={containerRef} className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50 relative group h-48">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair touch-none"
                  />
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={handleClear} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-500 hover:text-slate-700 font-medium shadow-sm">Limpiar</button>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm">Cancelar</button>
                  <button onClick={handleSign} className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-primary-500 shadow-sm">Insertar Firma</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
