import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ShieldCheck, PenTool, X, Download, UserCircle, XCircle } from 'lucide-react';
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
        .order('signer_name', { ascending: true });
        
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

  const isFullySigned = signers.length > 0 && signers.every(s => s.status === 'signed' || s.has_signed);
  const contractStatus: string = ['cancelled', 'rejected', 'signed'].includes(contract.status) 
    ? contract.status 
    : (isFullySigned ? 'signed' : 'pending');

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
        .update({ status: 'signed', has_signed: true, signature_data: signatureData, signed_at: new Date().toISOString() })
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
      const remainingSigners = signers.filter(s => !s.has_signed && s.id !== currentUserSigner.id);
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
      const element = documentRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        // Capturar TODO el contenido, incluso lo que está fuera del viewport
        height: element.scrollHeight,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          // Remove oklch colors that break html2canvas
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            const style = window.getComputedStyle(el);
            if (style.color && style.color.includes('oklch')) el.style.color = '#1e293b';
            if (style.backgroundColor && style.backgroundColor.includes('oklch')) el.style.backgroundColor = 'transparent';
            if (style.borderColor && style.borderColor.includes('oklch')) el.style.borderColor = '#e2e8f0';
          }
        }
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Partir la imagen en páginas A4
      let yOffset = 0;
      let page = 0;
      while (yOffset < imgHeight) {
        if (page > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          -yOffset,       // desplazar hacia arriba en cada página
          imgWidth,
          imgHeight
        );
        yOffset += pdfHeight;
        page++;
      }
      
      // Descargar copia local
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
          console.error('Error subiendo PDF al bucket:', uploadError);
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
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border shadow-sm bg-blue-50 text-blue-700 border-blue-200">
                  <CheckCircle className="h-4 w-4" /> Firmado Completamente
                </span>
                {(() => {
                  const lastSigned = signers
                    .filter(s => s.has_signed && s.signed_at)
                    .sort((a, b) => new Date(b.signed_at).getTime() - new Date(a.signed_at).getTime())[0];
                  return lastSigned ? (
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">
                      SELLADO EL {format(new Date(lastSigned.signed_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  ) : null;
                })()}
              </div>
           ) : contractStatus === 'cancelled' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border shadow-sm bg-slate-100 text-slate-600 border-slate-300">
                <XCircle className="h-4 w-4" /> Contrato Cancelado
              </span>
           ) : contractStatus === 'rejected' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border shadow-sm bg-red-50 text-red-700 border-red-200">
                <XCircle className="h-4 w-4" /> Rechazado
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
             {/* Cabecera Legal del Documento */}
              <div className="mb-10 pb-6 border-b-2 border-slate-900 flex justify-between items-end">
                <div className="space-y-1">
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">{contract.title}</h1>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                    <p><span className="text-slate-400">Jurisdicción:</span> {contract.jurisdiction || 'COLOMBIA'}</p>
                    <p><span className="text-slate-400">Confidencialidad:</span> {contract.confidentiality_level || 'ALTA'}</p>
                    <p><span className="text-slate-400">Fecha Creación:</span> {format(new Date(contract.created_at), 'dd/MM/yyyy HH:mm')}</p>
                    <p><span className="text-slate-400">Vigencia:</span> {contract.validity_period || 'INDEFINIDA'}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end max-w-[200px]">
                   <div className="bg-slate-50 p-2 border border-slate-200 rounded mb-1 w-full">
                     <p className="text-[8px] text-slate-400 font-bold uppercase mb-1">Genesis Hash / Blockchain ID</p>
                     <p className="text-[9px] font-mono text-slate-800 break-all leading-tight">
                       {contract.genesis_hash || 'PENDIENTE_DE_REGISTRO'}
                     </p>
                   </div>
                   <p className="text-[8px] text-slate-400 font-medium italic">Documento verificado digitalmente por Contractum</p>
                </div>
              </div>

             <div 
                className="prose prose-slate max-w-none text-slate-900 flex-1 leading-relaxed text-sm text-justify"
                style={{ fontFamily: "'Inter', sans-serif" }}
                dangerouslySetInnerHTML={{ __html: contract.content }}
             />
             
             {/* Firmas incrustadas - siempre al final, sin que se corten */}
              <div className="mt-20 pt-10 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-12 break-inside-avoid">
                {signers.map(signer => (
                  <div key={signer.id} className="flex flex-col items-start p-2 break-inside-avoid">
                    {signer.has_signed ? (
                      <div className="w-full space-y-3">
                        <div className="h-24 flex items-center justify-start border-b border-slate-200 relative mb-4">
                          {signer.signature_data && (
                            <img src={signer.signature_data} alt="Firma" className="h-20 object-contain mix-blend-multiply" />
                          )}
                          <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1 rounded-full shadow-lg scale-75">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{signer.signer_name}</p>
                          <div className="flex flex-col text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none space-y-1">
                            <p>CC: {signer.signer_national_id}</p>
                            <p>{signer.role}</p>
                            <p className="text-blue-600 font-black">{signer.signed_at ? format(new Date(signer.signed_at), 'dd/MM/yyyy HH:mm:ss') : ''}</p>
                          </div>
                          {signer.signature_hash && (
                             <p className="text-[7px] font-mono text-slate-400 mt-2 break-all border-t border-slate-100 pt-1">
                               Hash: {signer.signature_hash}
                             </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-32 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center bg-slate-50 text-slate-400">
                        <PenTool className="h-6 w-6 mb-2 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">{signer.status === 'rejected' ? 'RECHAZADO' : 'FIRMA PENDIENTE'}</p>
                        <p className="text-[9px] mt-1">{signer.signer_name}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
          </div>
        </div>

        {/* Sidebar Info & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary-600" /> Auditoría de Firmas
            </h3>
            
            <div className="space-y-6">
              {signers.map(signer => (
                <div key={signer.id} className="relative pl-6">
                  <div className={`absolute left-0 top-1 h-3 w-3 rounded-full border-2 ${
                    signer.has_signed ? 'bg-green-500 border-green-200' : 'bg-white border-slate-300'
                  }`} />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{signer.role}</span>
                    <p className="text-sm font-bold text-slate-800 leading-tight mt-0.5">{signer.signer_name}</p>
                    <div className="flex items-center justify-between mt-2">
                       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                         signer.has_signed 
                           ? 'bg-green-100 text-green-700' 
                           : signer.status === 'rejected'
                           ? 'bg-red-100 text-red-700'
                           : contract.status === 'cancelled'
                           ? 'bg-slate-100 text-slate-400 line-through'
                           : 'bg-slate-100 text-slate-500'
                       }`}>
                         {signer.has_signed 
                           ? 'FIRMADO' 
                           : signer.status === 'rejected' 
                           ? 'RECHAZÓ' 
                           : contract.status === 'cancelled'
                           ? 'CANCELADO'
                           : 'PENDIENTE'}
                       </span>
                       {signer.signed_at && (
                         <span className="text-[10px] text-slate-400 font-mono">
                           {format(new Date(signer.signed_at), 'dd/MM/yy')}
                         </span>
                       )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
              {canSign && (
                <button 
                  onClick={handleOpenSignatureFlow} 
                  className="w-full bg-primary-600 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-primary-500 transition-all shadow-lg shadow-primary-100 flex items-center justify-center gap-2"
                >
                  <PenTool className="h-4 w-4" /> Proceder a Firmar
                </button>
              )}

              <button 
                onClick={handleGeneratePDF}
                disabled={isGenerating}
                className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
              >
                <Download className="h-4 w-4" /> {isGenerating ? 'Generando...' : 'Descargar PDF Oficial'}
              </button>
              
              <p className="text-[10px] text-slate-400 text-center mt-4">
                El PDF incluye sellos de tiempo y hashes criptográficos de cada firma.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
             <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Estado del Contrato</h3>
             </div>
             <p className="text-xs text-slate-500 leading-relaxed">
                {contractStatus === 'signed' 
                  ? 'Este acuerdo ha sido legalmente vinculado y cerrado. Todas las firmas son válidas.' 
                  : 'Este documento se encuentra en fase de recolección de firmas. El contenido está bloqueado.'}
             </p>
          </div>
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
