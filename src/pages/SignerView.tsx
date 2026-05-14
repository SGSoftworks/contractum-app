import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FileText, Shield, CheckCircle, XCircle, Download } from 'lucide-react';
import SignaturePad from 'signature_pad';
import { format } from 'date-fns';
import * as jspdf from 'jspdf';
const jsPDF: any = jspdf.jsPDF || jspdf.default || jspdf;

async function generateHash(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function SignerView() {
  const { id } = useParams<{ id: string }>();
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSigners, setAllSigners] = useState<any[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const [contract, setContract] = useState<any>(null);
  const [signerId, setSignerId] = useState<string | null>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && canvasRef.current && !signaturePadRef.current) {
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      
      // Ajustar resolución del canvas
      const resizeCanvas = () => {
        const container = containerRef.current;
        if (container && canvas) {
          const width = container.offsetWidth;
          const height = 192; // fixed height 48 * 4
          canvas.width = width * ratio;
          canvas.height = height * ratio;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          canvas.getContext("2d")?.scale(ratio, ratio);
          signaturePadRef.current?.clear();
        }
      };

      window.addEventListener("resize", resizeCanvas);
      resizeCanvas();

      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgb(248, 250, 252)'
      });
      
      return () => window.removeEventListener("resize", resizeCanvas);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (contract && contract.status === 'signed' && !contract.pdf_url && allSigners.length > 0 && !isGeneratingPdf) {
      console.log('Generating missing PDF automatically...');
      generateFinalPDF(contract, allSigners);
    }
  }, [contract?.status, contract?.pdf_url, allSigners, isGeneratingPdf]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Timeout de seguridad: 10 segundos máximo para la validación
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('La conexión tardó demasiado. Verifica tu internet e intenta de nuevo.')), 10000)
    );

    try {
      // Validar en la tabla de firmantes con timeout
      const signerQuery = supabase
        .from('contract_signers')
        .select('*')
        .eq('contract_id', id)
        .eq('signer_national_id', nationalId.trim())
        .eq('signer_email', email.trim().toLowerCase());

      const { data: signers, error: signerError } = await Promise.race([
        signerQuery,
        timeoutPromise
      ]) as any;

      if (signerError) {
        console.error('[SignerView] Signer query error:', signerError);
        throw new Error(`Error de base de datos: ${signerError.message}`);
      }

      if (!signers || signers.length === 0) {
        setError('Credenciales inválidas. Verifica tu cédula y correo electrónico.');
        return;
      }

      const currentSigner = signers[0];
      setSignerId(currentSigner.id);

      if (currentSigner.has_signed || currentSigner.status === 'signed') {
        setHasSigned(true);
      }
      if (currentSigner.status === 'rejected') {
        setIsRejected(true);
      }

      // Obtener el contrato con timeout
      const contractQuery = supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();

      const { data: contractData, error: contractError } = await Promise.race([
        contractQuery,
        timeoutPromise
      ]) as any;

      if (contractError) {
        console.error('[SignerView] Contract query error:', contractError);
        throw new Error(`No se pudo cargar el contrato: ${contractError.message}`);
      }
      if (contractData) {
        setContract(contractData);
        // Fetch all signers for the contract (needed for PDF signatures block)
        const { data: signersList } = await supabase
          .from('contract_signers')
          .select('*')
          .eq('contract_id', id)
          .order('signer_name', { ascending: true });
        
        setAllSigners(signersList || []);
      }
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('[SignerView] Validation error:', err);
      setError(err.message || 'Error al validar credenciales. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearSignature = () => {
    signaturePadRef.current?.clear();
  };

  const handleSign = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setError('Por favor, ingresa tu firma.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const signatureData = signaturePadRef.current.toDataURL('image/png');

      // Actualizar el firmante
      const { error: updateSignerError } = await supabase
        .from('contract_signers')
        .update({
          has_signed: true,
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_data: signatureData
        })
        .eq('id', signerId);

      if (updateSignerError) throw updateSignerError;

      // Generar hash de firma y guardarlo en el registro del firmante
      const signedAt = new Date().toISOString();
      const signatureHash = await generateHash(`${id}-${signerId}-${nationalId}-${signedAt}`);
      
      await supabase
        .from('contract_signers')
        .update({ signature_hash: signatureHash })
        .eq('id', signerId);

      // Registrar en el Log de Auditoría con cadena de hashes
      try {
        const { data: lastLog } = await supabase
          .from('contract_logs')
          .select('hash')
          .eq('contract_id', id)
          .order('action_timestamp', { ascending: false })
          .limit(1)
          .single();

        const previousHash = lastLog?.hash || 'GENESIS';
        const blockHash = await generateHash(`${previousHash}-${signerId}-${Date.now()}`);

        const signerName = contract?.signer_name || email;
        const logData = {
          contract_id: id,
          action: 'signature',
          actor: signerName,
          hash: blockHash,
          previous_hash: previousHash,
          details: {
            signer_national_id: nationalId,
            signature_hash: signatureHash
          }
        };

        const { error: logErr1 } = await supabase.from('contract_logs').insert(logData);
        if (logErr1) {
          console.warn('Log extendido falló, reintentando con campos básicos:', logErr1.message);
          await supabase.from('contract_logs').insert({
            contract_id: id,
            action: 'signature',
            hash: blockHash,
            details: { signer_name: signerName, signature_hash: signatureHash }
          });
        }
      } catch (logErr) {
        console.warn('No se pudo guardar el log de auditoría:', logErr);
      }

      // Verificar si todos los firmantes han firmado
      const { data: allSigners, error: signersError } = await supabase
        .from('contract_signers')
        .select('has_signed')
        .eq('contract_id', id);

      if (signersError) throw signersError;

      const allSigned = allSigners && allSigners.every(s => s.has_signed);

      if (allSigned) {
        const { error: updateContractError } = await supabase
          .from('contracts')
          .update({ status: 'signed' })
          .eq('id', id);

        if (updateContractError) throw updateContractError;
        
        // Re-fetch signers for the official PDF
        const { data: finalSigners } = await supabase
          .from('contract_signers')
          .select('*')
          .eq('contract_id', id)
          .order('signer_name', { ascending: true });

        const updatedContract = { ...contract, status: 'signed' };
        setContract(updatedContract);
        if (finalSigners) {
          setAllSigners(finalSigners);
          await generateFinalPDF(updatedContract, finalSigners);
        }
      }

      setHasSigned(true);
    } catch (err: any) {
      setError('Error al firmar: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFinalPDF = async (targetContract: any, targetSigners: any[]) => {
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      const addFooter = () => {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(150);
        const footerText = `Documento firmado electrónicamente en Contractum - ID: ${targetContract.id.substring(0,18)}...`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
      };

      const addPageIfNeeded = (heightNeeded: number) => {
        if (yPos + heightNeeded > pageHeight - 25) {
          addFooter();
          doc.addPage();
          yPos = margin;
          doc.setTextColor(40);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
        }
      };

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30);
      const titleLines = doc.splitTextToSize(targetContract.title.toUpperCase(), contentWidth);
      doc.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
      yPos += (titleLines.length * 7) + 10;

      // Metadata
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`FECHA: ${format(new Date(targetContract.created_at), 'dd/MM/yyyy HH:mm')}`, margin, yPos);
      doc.text(`HASH: ${targetContract.genesis_hash || 'N/A'}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 15;

      // Content
      const cleanHtml = targetContract.content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<li>/gi, '  • ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '');

      const blocks = cleanHtml.split('\n');
      doc.setTextColor(40);
      blocks.forEach((block: string) => {
        const text = block.trim();
        if (!text) return;
        const isHeader = text.toUpperCase() === text && text.length < 100 || text.includes('CLÁUSULA');
        if (isHeader) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          const lines = doc.splitTextToSize(text, contentWidth);
          addPageIfNeeded(lines.length * 6 + 5);
          doc.text(lines, margin, yPos);
          yPos += (lines.length * 6) + 4;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(text, contentWidth);
          lines.forEach((line: string) => {
            addPageIfNeeded(6);
            doc.text(line, margin, yPos, { align: 'justify', maxWidth: contentWidth });
            yPos += 5;
          });
          yPos += 2;
        }
      });

      // Signatures
      addPageIfNeeded(80);
      yPos += 15;
      doc.setDrawColor(0);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('ACEPTACIÓN Y FIRMAS DIGITALES', pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;

      const colWidth = contentWidth / 2;
      for (let i = 0; i < targetSigners.length; i++) {
        const s = targetSigners[i];
        const isLeft = i % 2 === 0;
        const xPos = isLeft ? margin : margin + colWidth + 5;
        if (isLeft) addPageIfNeeded(65);
        const currentYBase = yPos;

        if (s.has_signed && s.signature_data) {
          try {
            doc.addImage(s.signature_data, 'PNG', xPos, currentYBase, 40, 20);
          } catch (e) {
            doc.setFontSize(8);
            doc.text('[Firma Registrada]', xPos, currentYBase + 10);
          }
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(s.signer_name.toUpperCase(), xPos, currentYBase + 28);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`CC: ${s.signer_national_id}`, xPos, currentYBase + 33);
        doc.text(`Rol: ${s.role}`, xPos, currentYBase + 38);
        
        if (s.has_signed) {
          doc.setFontSize(7);
          doc.setTextColor(100);
          doc.text(`Fecha: ${format(new Date(s.signed_at!), 'dd/MM/yyyy HH:mm:ss')}`, xPos, currentYBase + 43);
          doc.setFontSize(6);
          doc.text(`Hash: ${s.signature_hash || 'VERIFIED'}`, xPos, currentYBase + 48, { maxWidth: colWidth - 10 });
          doc.setTextColor(40);
        }
        if (!isLeft || i === targetSigners.length - 1) yPos += 65;
      }

      addFooter();
      const pdfBlob = doc.output('blob');
      const fileName = `${targetContract.id}.pdf`;
      const { error: uploadError } = await supabase.storage.from('contracts').upload(fileName, pdfBlob, { contentType: 'application/pdf', upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from('contracts').getPublicUrl(fileName);
        await supabase.from('contracts').update({ pdf_url: data.publicUrl }).eq('id', targetContract.id);
        setContract({ ...targetContract, pdf_url: data.publicUrl });
      }
    } catch (err) {
      console.error('Error generating final PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Por favor, indica el motivo del rechazo.');
      return;
    }
    
    setIsLoading(true);
    try {
      const rejectedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('contract_signers')
        .update({ 
          status: 'rejected', 
          rejection_reason: rejectionReason,
          rejected_at: rejectedAt,
          signed_at: rejectedAt  // Para ordenamiento cronológico
        })
        .eq('id', signerId);

      if (updateError) throw updateError;

      // Actualizar estado del contrato a rechazado
      await supabase.from('contracts').update({ status: 'rejected' }).eq('id', id);
      
      // Registrar en el Log con encadenamiento de hashes
      try {
        const { data: lastLog } = await supabase
          .from('contract_logs')
          .select('hash')
          .eq('contract_id', id)
          .order('action_timestamp', { ascending: false })
          .limit(1)
          .single();

        const previousHash = lastLog?.hash || 'GENESIS';
        const blockHash = await generateHash(`${previousHash}-${signerId}-rejected-${Date.now()}`);

        const signerName = email;
        const logData = {
          contract_id: id,
          action: 'rejection',
          actor: signerName,
          hash: blockHash,
          previous_hash: previousHash,
          details: { 
            signer_national_id: nationalId,
            reason: rejectionReason
          }
        };

        const { error: logErr1 } = await supabase.from('contract_logs').insert(logData);
        if (logErr1) {
           await supabase.from('contract_logs').insert({
             contract_id: id,
             action: 'rejection',
             hash: blockHash,
             details: { reason: rejectionReason, signer_name: signerName }
           });
        }
      } catch (e) {
        console.warn('No se pudo registrar el log de rechazo:', e);
      }

      setIsRejected(true);
      setShowRejectModal(false);
      setContract({ ...contract, status: 'rejected' });
    } catch (err: any) {
      alert('Error al rechazar: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-primary-900 p-6 text-center">
            <Shield className="h-12 w-12 text-primary-200 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white">Portal de Consulta</h2>
            <p className="text-primary-200 mt-2 text-sm">Ingresa tus credenciales para ver el documento</p>
          </div>
          
          <form onSubmit={handleValidate} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label>
              <input
                type="text"
                required
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ej: 1234567890"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="correo@ejemplo.com"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 text-white font-medium py-2.5 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 mt-4"
            >
              {isLoading ? 'Validando...' : 'Acceder al Contrato'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Documento */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{contract.title}</h1>
              <p className="text-sm text-slate-500">
                Estado: {' '}
                <span className={`font-medium ${
                  contract.status === 'signed' ? 'text-green-600' :
                  contract.status === 'rejected' ? 'text-red-600' :
                  contract.status === 'cancelled' ? 'text-slate-600' :
                  'text-amber-600'
                }`}>
                  {contract.status === 'signed' ? 'Firmado' :
                   contract.status === 'rejected' ? 'Rechazado' :
                   contract.status === 'cancelled' ? 'Cancelado' :
                   'Pendiente de Firma'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Contenido del Documento */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 prose max-w-none min-h-[400px]">
          <div dangerouslySetInnerHTML={{ __html: contract.content.replace(/\n/g, '<br />') }} />
        </div>

        {/* Área de Firma */}
        {contract.status === 'pending' && !hasSigned && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Firmar Documento</h3>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            <div ref={containerRef} className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 mb-4 overflow-hidden h-48">
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair touch-none"
              />
            </div>
            
            <div className="flex flex-wrap gap-4 justify-between items-center">
              <button
                onClick={clearSignature}
                type="button"
                className="text-sm text-slate-500 hover:text-slate-700 font-medium px-4 py-2"
              >
                Limpiar pad
              </button>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="h-5 w-5" />
                  Rechazar
                </button>
                <button
                  onClick={handleSign}
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  <CheckCircle className="h-5 w-5" />
                  Firmar
                </button>
              </div>
            </div>
          </div>
        )}

        {(hasSigned || isRejected || contract.status === 'signed' || contract.status === 'rejected') && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xl shadow-slate-100 animate-in zoom-in duration-300">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isRejected || contract.status === 'rejected' ? 'bg-red-100' : 'bg-green-100'
            }`}>
              {isRejected || contract.status === 'rejected' ? <XCircle className="h-10 w-10 text-red-600" /> : <CheckCircle className="h-10 w-10 text-green-600" />}
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {isRejected || contract.status === 'rejected' ? 'Documento Rechazado' : '¡Firma Registrada!'}
            </h3>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto">
              {isRejected || contract.status === 'rejected' 
                ? 'Has marcado este documento como rechazado.' 
                : 'Tu firma ha sido vinculada criptográficamente a este documento.'}
            </p>

            <div className="mt-8 pt-6 border-t border-slate-100">
              {(contract.status === 'signed' || contract.status === 'rejected') ? (
                <div className="space-y-4">
                   <p className="text-sm font-medium text-slate-700">
                     El proceso ha finalizado ({contract.status === 'rejected' ? 'Rechazado' : 'Legalizado'}).
                   </p>
                   {contract.pdf_url ? (
                      <a 
                        href={contract.pdf_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
                          contract.status === 'rejected' 
                          ? 'bg-slate-700 text-white hover:bg-slate-800 shadow-slate-200' 
                          : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                        }`}
                      >
                        <Download className="h-5 w-5" />
                        Descargar {contract.status === 'rejected' ? 'Evidencia de Rechazo' : 'Contrato Legalizado'}
                      </a>
                   ) : (
                     <p className="text-sm text-slate-400 italic">Generando copia oficial, por favor recarga en unos segundos...</p>
                   )}
                </div>
              ) : (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                  <p className="text-sm text-amber-800 font-medium leading-relaxed">
                    El proceso sigue en curso. <br/> 
                    <span className="font-bold">Vuelve a consultar este enlace más tarde</span> para descargar tu copia una vez el proceso termine.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Motivo de Rechazo */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" /> Motivo del Rechazo
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Por favor, explica brevemente por qué rechazas este contrato. Esta información será visible para todas las partes.
              </p>
              
              <textarea 
                className="w-full mt-4 rounded-xl border border-slate-200 p-4 text-sm min-h-[120px] focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Ej. El valor de la cláusula 5 no es el acordado..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
              
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleReject}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-100 disabled:opacity-50"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </div>
          </div>
        )}
        
        {contract.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900">Documento Rechazado</h3>
            <p className="text-red-700 mt-1">Has rechazado firmar este documento.</p>
          </div>
        )}

      </div>
    </div>
  );
}
