import React, { useState, useEffect } from 'react';
import { Sparkles, Signature } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import QuestionItem from './QuestionItem';
import SignatureCanvas from './SignatureCanvas';
import { calculateScore } from '../../utils/calculations';
import { createAudit } from '../../firebase';

const AuditForm: React.FC = () => {
  const { activeUser, sites, questionnaires, refreshData } = useAppContext();
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState('');
  const [auditorName, setAuditorName] = useState(activeUser?.name || '');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [signatureName, setSignatureName] = useState('');
  const [tempSignature, setTempSignature] = useState<string | null>(null);
  const [isSigningOpen, setIsSigningOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id);
      setSelectedSector(sites[0].sectors[0] || '');
    }
  }, [sites]);

  useEffect(() => {
    if (questionnaires.length > 0 && !selectedQuestionnaireId) {
      setSelectedQuestionnaireId(questionnaires[0].id);
    }
  }, [questionnaires]);

  useEffect(() => {
    const quest = questionnaires.find(q => q.id === selectedQuestionnaireId);
    if (quest) {
      const init: Record<string, any> = {};
      quest.items.forEach((item: any) => {
        init[item.id] = { status: 'C', comment: '', photo: null };
      });
      setAnswers(init);
    }
  }, [selectedQuestionnaireId, questionnaires]);

  const handleStatusChange = (itemId: string, status: string) => {
    setAnswers(prev => ({ ...prev, [itemId]: { ...prev[itemId], status } }));
  };

  const handleCommentChange = (itemId: string, comment: string) => {
    setAnswers(prev => ({ ...prev, [itemId]: { ...prev[itemId], comment } }));
  };

  const handlePhotoSelect = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAnswers(prev => ({ ...prev, [itemId]: { ...prev[itemId], photo: reader.result as string } }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (itemId: string) => {
    setAnswers(prev => ({ ...prev, [itemId]: { ...prev[itemId], photo: null } }));
  };

  const currentScore = calculateScore(answers);

  const hasCriticalNC = () => {
    const quest = questionnaires.find(q => q.id === selectedQuestionnaireId);
    if (!quest) return false;
    return quest.items.some((item: any) => item.critical && answers[item.id]?.status === 'NC');
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (activeUser?.role === 'lector') {
      alert('Solo lectura: no tienes permisos.');
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedSite = sites.find(s => s.id === selectedSiteId);
      const payload = {
        auditorName,
        area: selectedSector || 'General',
        siteId: selectedSiteId,
        siteName: selectedSite?.name || '',
        questionnaireId: selectedQuestionnaireId,
        answers,
        score: currentScore,
        isSubmitted: !isDraft,
        signature: tempSignature || null,
        signatureName: signatureName || null,
        hasCriticalFailures: hasCriticalNC()
      };
      await createAudit(payload);
      if (!isDraft) {
        setAnswers({});
        setTempSignature(null);
        setSignatureName('');
      }
      await refreshData();
      alert(isDraft ? 'Borrador guardado' : 'Auditoría enviada correctamente');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeQuest = questionnaires.find(q => q.id === selectedQuestionnaireId);
  const currentSectors = sites.find(s => s.id === selectedSiteId)?.sectors || [];

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3.5">
        <h3 className="font-extrabold text-slate-900 text-sm border-b pb-1.5">Nueva Recorrida de Auditoría</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
          <div><label className="text-[10px] uppercase font-bold text-slate-400">Inspector</label>
            <input type="text" value={auditorName} onChange={(e) => setAuditorName(e.target.value)} className="w-full text-xs rounded border border-slate-200 h-9 p-2 mt-1" />
          </div>
          <div><label className="text-[10px] uppercase font-bold text-slate-400">Planta</label>
            <select value={selectedSiteId} onChange={(e) => { setSelectedSiteId(e.target.value); const secs = sites.find(s => s.id === e.target.value)?.sectors || []; setSelectedSector(secs[0] || ''); }} className="w-full text-xs rounded border border-slate-200 h-9 p-2 mt-1 bg-white">
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="text-[10px] uppercase font-bold text-slate-400">Sector</label>
            <select value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)} className="w-full text-xs rounded border border-slate-200 h-9 p-2 mt-1 bg-white">
              {currentSectors.map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
          </div>
          <div><label className="text-[10px] uppercase font-bold text-slate-400">Cuestionario</label>
            <select value={selectedQuestionnaireId} onChange={(e) => setSelectedQuestionnaireId(e.target.value)} className="w-full text-xs rounded border border-blue-200 h-9 p-2 mt-1 bg-white font-bold text-blue-950">
              {questionnaires.map(q => <option key={q.id} value={q.id}>{q.name} ({q.items?.length || 0} items)</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
        <span className="text-xs font-bold text-blue-700">Cumplimiento parcial:</span>
        <span className="text-lg font-black text-blue-900">{currentScore}%</span>
      </div>

      <div className="space-y-3">
        {activeQuest?.items?.map((item: any, idx: number) => (
          <QuestionItem key={item.id} item={item} index={idx} answer={answers[item.id] || { status: 'C', comment: '', photo: null }} onStatusChange={handleStatusChange} onCommentChange={handleCommentChange} onPhotoSelect={handlePhotoSelect} onRemovePhoto={removePhoto} />
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
        <h3 className="font-bold text-xs uppercase text-slate-500">Validación (Firma)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Nombre del responsable" className="w-full text-xs rounded border border-slate-200 h-9 p-2" />
            <button onClick={() => setIsSigningOpen(true)} className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded text-xs flex items-center gap-1.5">
              <Signature className="w-4 h-4" /> Firmar digitalmente
            </button>
          </div>
          <div className="bg-slate-50 border border-dashed rounded-lg p-3 flex items-center justify-center min-h-[90px]">
            {tempSignature ? (
              <div className="text-center"><img src={tempSignature} className="max-h-16 bg-white p-1 border rounded" alt="Firma" /><p className="text-[10px] font-bold text-slate-500 mt-1">{signatureName}</p></div>
            ) : <span className="text-[11px] text-slate-400">Sin firma registrada</span>}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <button onClick={() => handleSubmit(true)} disabled={isSubmitting} className="px-5 py-2.5 bg-white border rounded text-xs font-bold text-slate-600">Guardar Borrador</button>
        <button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded shadow-sm flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" /> Enviar y Analizar
        </button>
      </div>

      {isSigningOpen && <SignatureCanvas onSave={(dataUrl) => { setTempSignature(dataUrl); setIsSigningOpen(false); }} onCancel={() => setIsSigningOpen(false)} />}
    </div>
  );
};

export default AuditForm;