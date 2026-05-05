import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ShieldCheck, PenTool, X, Download, UserCircle } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// MOCK: Simulamos que el usuario logueado actualmente es EmpleadoDemo
const CURRENT_USER = {
  id: 'user-2',
  nationalId: '20000000',
  name: 'EmpleadoDemo',
  email: 'empleado@correo.com'
};

export function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<'confirm' | 'sign'>('confirm');
  
  const sigCanvas = useRef<SignatureCanvas>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  // MOCK DATA: Estructura actualizada con múltiples firmantes
  const [contract, setContract] = useState({
    id,
    title: 'Contrato de Prestación de Servicios',
    date: new Date('2026-05-01'),
    jurisdiction: 'Colombia',
    confidentiality: 'Estándar',
    validity: '1 Año desde la firma',
    content: '<h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Términos y Condiciones</h2><p>1. El proveedor se compromete a entregar los servicios descritos en los anexos correspondientes, asegurando la calidad y los plazos pactados.</p><p><br/>2. El pago se realizará a los 30 días de emitida la factura electrónica debidamente validada.</p><p><br/>3. Ambas partes acuerdan que este documento electrónico firmado mediante la plataforma Contractum tiene total validez legal y es vinculante.</p>',
    signers: [
      { id: '1', name: 'Usuario Demo', email: 'juan@correo.com', nationalId: '10000000', role: 'Empleador', status: 'signed', signedAt: new Date('2026-05-01T10:30:00') },
      { id: '2', name: 'EmpleadoDemo', email: 'empleado@correo.com', nationalId: '20000000', role: 'Cliente', status: 'pending', signedAt: null }
    ]
  });

  const isFullySigned = contract.signers.every(s => s.status === 'signed');
  const contractStatus = isFullySigned ? 'signed' : 'pending_signature';

  // Lógica inteligente: Buscar si el usuario actual debe firmar este contrato
  const currentUserSigner = contract.signers.find(s => s.nationalId === CURRENT_USER.nationalId);
  const canSign = currentUserSigner && currentUserSigner.status === 'pending';

  const handleOpenSignatureFlow = () => {
    setStep('confirm');
    setIsModalOpen(true);
  };

  const handleConfirmIdentity = () => {
    setStep('sign');
  };

  const handleSign = () => {
    if (sigCanvas.current?.isEmpty()) {
      alert('Por favor, dibuje su firma antes de confirmar.');
      return;
    }
    
    // Simulate updating the signer status
    const updatedSigners = contract.signers.map(s => 
      s.nationalId === CURRENT_USER.nationalId 
        ? { ...s, status: 'signed', signedAt: new Date() } 
        : s
    );
    
    setContract({ ...contract, signers: updatedSigners as any });
    setIsModalOpen(false);
  };

  const handleClear = () => {
    sigCanvas.current?.clear();
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
      pdf.save(`Contrato_Contractum_${contract.id}.pdf`);
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
            <p className="text-sm text-slate-500 mt-1">ID: #{contract.id} • Creado el {format(contract.date, 'dd/MM/yyyy')}</p>
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
                  <p><span className="font-semibold text-slate-700">Jurisdicción:</span> {contract.jurisdiction}</p>
                  <p><span className="font-semibold text-slate-700">Confidencialidad:</span> {contract.confidentiality}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-semibold text-slate-700">Vigencia:</span> {contract.validity}</p>
                </div>
             </div>

             <div 
                className="prose max-w-none text-slate-800 flex-1"
                dangerouslySetInnerHTML={{ __html: contract.content }}
             />
             
             {/* Firmas incrustadas */}
             <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8">
                {contract.signers.map(signer => (
                  <div key={signer.id} className="flex flex-col items-center justify-center opacity-90 p-4 border border-dashed border-slate-200 rounded-lg">
                    {signer.status === 'signed' ? (
                      <>
                        <div className="text-primary-600 mb-2"><ShieldCheck className="h-8 w-8" /></div>
                        <p className="text-sm font-semibold text-slate-700">Firmado por: {signer.name}</p>
                        <p className="text-xs text-slate-500 mt-1">CC: {signer.nationalId} • {signer.role}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-2 break-all text-center">Hash Validado: {Math.random().toString(36).substring(2, 15)}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{format(signer.signedAt!, 'dd/MM/yyyy HH:mm')}</p>
                      </>
                    ) : (
                      <>
                        <div className="text-slate-300 mb-2"><UserCircle className="h-8 w-8" /></div>
                        <p className="text-sm font-medium text-slate-400">Firma Pendiente</p>
                        <p className="text-xs text-slate-400 mt-1">{signer.name} ({signer.role})</p>
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
              {contract.signers.map(signer => (
                <div key={signer.id} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {signer.status === 'signed' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-300" />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{signer.role}</p>
                    <p className="text-sm font-medium text-slate-900 mt-0.5">{signer.name}</p>
                    <p className="text-xs text-slate-500">CC: {signer.nationalId}</p>
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
      {isModalOpen && currentUserSigner && (
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
                   <p className="text-lg font-bold text-slate-900">{CURRENT_USER.name}</p>
                   <p className="font-mono text-slate-500 bg-slate-200 inline-block px-2 py-0.5 rounded text-xs">ID: {CURRENT_USER.nationalId}</p>
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
                <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50 relative group">
                  <SignatureCanvas ref={sigCanvas} penColor="#0f172a" canvasProps={{className: 'w-full h-[200px] cursor-crosshair'}} />
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
