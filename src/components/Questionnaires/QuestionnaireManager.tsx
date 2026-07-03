// src/components/Questionnaires/QuestionnaireManager.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
  getQuestionnaires,
  createQuestionnaire,
  updateQuestionnaire,
  deleteQuestionnaire,
  getSectors
} from '../../firebase';
import ExcelImporter from './ExcelImporter';
import { descargarPlantilla, duplicarCuestionario } from '../../utils/excelTemplate';
import type { QuestionnaireConfig, QuestionnaireQuestion, NivelDesvio, NivelRiesgoMunicipal, SectorQR, QRGroupConfig, TipoCuestionario } from '../../types';
import { FileText, Building2, ClipboardCheck } from 'lucide-react';

const NORMAS = [
  'IRAM 14201', 'CAA Capítulo X', 'CAA Capítulo V', 'CAA Art. 18-36',
  'BPM General', 'HACCP', 'ISO 22000', 'Norma Municipal Córdoba'
];

const RIESGOS_MUNICIPALES: { value: NivelRiesgoMunicipal; label: string; color: string }[] = [
  { value: 'critico', label: '🔴 Crítico - Puede derivar en clausura', color: 'text-red-700' },
  { value: 'medio', label: '🟡 Medio - Requiere atención', color: 'text-yellow-700' },
  { value: 'bajo', label: '🟢 Bajo - Observación menor', color: 'text-blue-700' },
];

const QuestionnaireManager: React.FC = () => {
  const { isAdmin, sites } = useAppContext();
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showExcelImporter, setShowExcelImporter] = useState(false);
  const [sectorizado, setSectorizado] = useState(false);
  const [tipoCuestionario, setTipoCuestionario] = useState<TipoCuestionario>('auditoria');
  const [allSectors, setAllSectors] = useState<SectorQR[]>([]);
  const [qrConfig, setQrConfig] = useState<{ [grupo: string]: QRGroupConfig }>({});
  const [selectedSiteForQR, setSelectedSiteForQR] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [norma, setNorma] = useState('BPM General');
  const [requireQR, setRequireQR] = useState(false);
  const [requirePhotos, setRequirePhotos] = useState(false);
  const [minimumTimeMinutes, setMinimumTimeMinutes] = useState(0);
  const [allowPartialSave, setAllowPartialSave] = useState(false);
  const [requireLocation, setRequireLocation] = useState(false);
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([]);

  const [notificationEmails, setNotificationEmails] = useState('');
  const [notifyOnCritical, setNotifyOnCritical] = useState(true);
  const [notifyOnRecurrence, setNotifyOnRecurrence] = useState(true);
  const [notifyOnScoreBelow, setNotifyOnScoreBelow] = useState<number | null>(null);

  useEffect(() => { loadQuestionnaires(); loadSectors(); }, []);

  const loadSectors = async () => {
    try { const data = await getSectors(); setAllSectors(data); }
    catch (error) { console.error('Error cargando sectores:', error); }
  };

  const loadQuestionnaires = async () => {
    try { setLoading(true); const data = await getQuestionnaires(); setQuestionnaires(data); }
    catch (error) { console.error('Error cargando cuestionarios:', error); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setName(''); setDescription(''); setNorma('BPM General'); setRequireQR(false);
    setRequirePhotos(false); setMinimumTimeMinutes(0); setAllowPartialSave(false);
    setRequireLocation(false); setQuestions([]); setSectorizado(false); setTipoCuestionario('auditoria');
    setQrConfig({}); setSelectedSiteForQR({});
    setNotificationEmails(''); setNotifyOnCritical(true); setNotifyOnRecurrence(true);
    setNotifyOnScoreBelow(null); setEditingId(null); setShowForm(false);
  };

  const startNewSimple = () => { resetForm(); setSectorizado(false); setTipoCuestionario('auditoria'); setShowForm(true); };
  const startNewSectorizado = () => { resetForm(); setSectorizado(true); setTipoCuestionario('auditoria'); setRequireQR(true); setShowForm(true); };
  const startNewChecklist = () => { resetForm(); setTipoCuestionario('checklist'); setNorma('Norma Municipal Córdoba'); setShowForm(true); };

  const handleEdit = (q: QuestionnaireConfig) => {
    setEditingId(q.id); setName(q.name); setDescription(q.description || '');
    setNorma(q.norma || 'BPM General'); setRequireQR(q.requireQR);
    setRequirePhotos(q.requirePhotos); setMinimumTimeMinutes(q.minimumTimeMinutes);
    setAllowPartialSave(q.allowPartialSave); setRequireLocation(q.requireLocation);
    setQuestions(q.questions || []); setSectorizado(q.sectorizado || false);
    setTipoCuestionario(q.tipo || 'auditoria');
    setQrConfig(q.qrGroupsConfig || {});
    setNotificationEmails((q.notificationEmails || []).join(', '));
    setNotifyOnCritical(q.notifyOnCritical !== false);
    setNotifyOnRecurrence(q.notifyOnRecurrence !== false);
    setNotifyOnScoreBelow(q.notifyOnScoreBelow || null);
    setShowForm(true);
  };

  const handleDuplicate = (q: QuestionnaireConfig) => {
    const newName = prompt('Nombre para el cuestionario duplicado:', q.name + ' (copia)');
    if (!newName) return;
    const duplicated = duplicarCuestionario(q, newName);
    setEditingId(null); setName(duplicated.name); setDescription(duplicated.description || '');
    setNorma(duplicated.norma || 'BPM General'); setRequireQR(duplicated.requireQR);
    setRequirePhotos(duplicated.requirePhotos); setMinimumTimeMinutes(duplicated.minimumTimeMinutes);
    setAllowPartialSave(duplicated.allowPartialSave); setRequireLocation(duplicated.requireLocation);
    setQuestions(duplicated.questions); setSectorizado(duplicated.sectorizado || false);
    setTipoCuestionario(duplicated.tipo || 'auditoria');
    setQrConfig(duplicated.qrGroupsConfig || {});
    setNotificationEmails((duplicated.notificationEmails || []).join(', '));
    setNotifyOnCritical(duplicated.notifyOnCritical !== false);
    setNotifyOnRecurrence(duplicated.notifyOnRecurrence !== false);
    setNotifyOnScoreBelow(duplicated.notifyOnScoreBelow || null);
    setShowForm(true);
  };

  const addQuestion = (group?: string) => {
    const newQuestion: QuestionnaireQuestion = {
      id: `q_${Date.now()}`, text: '', type: 'cumplimiento', required: true,
      requirePhoto: false, requireComment: false, instructions: '', norma: norma,
      puntoNorma: '', esCriticoInocuidad: false, nivelDesvio: 'ninguno',
      nivelRiesgoMunicipal: tipoCuestionario === 'checklist' ? 'bajo' : undefined,
      minimumTimeSeconds: 0, order: questions.length, group: group || ''
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<QuestionnaireQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleImportFromExcel = (importedQuestions: QuestionnaireQuestion[]) => {
    setQuestions([...questions, ...importedQuestions]);
  };

  const handleSiteChange = (grupo: string, siteId: string) => {
    setSelectedSiteForQR(prev => ({ ...prev, [grupo]: siteId }));
    setQrConfig(prev => {
      const updated = { ...prev };
      delete updated[grupo];
      return updated;
    });
  };

  const handleSectorChange = (grupo: string, sectorQRId: string) => {
    const sector = allSectors.find(s => s.id === sectorQRId);
    const site = sites.find(s => s.id === sector?.siteId);
    if (sector && site) {
      setQrConfig(prev => ({
        ...prev,
        [grupo]: {
          sectorQRId: sector.id,
          qrToken: sector.qrToken,
          siteId: sector.siteId,
          sectorName: sector.name,
          siteName: site.name
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { alert('El nombre es requerido'); return; }
    if (questions.length === 0) { alert('Debe agregar al menos una pregunta'); return; }
    for (const q of questions) {
      if (!q.text.trim()) { alert('Todas las preguntas deben tener texto'); return; }
      if (!q.puntoNorma.trim()) { alert(`Falta punto de norma en: ${q.text}`); return; }
    }

    const grupos = sectorizado ? [...new Set(questions.filter(q => q.group).map(q => q.group!))] : [];

    if (sectorizado) {
      for (const g of grupos) {
        if (!qrConfig[g]) {
          alert(`Falta configurar el QR para el grupo: ${g}`);
          return;
        }
      }
    }

    try {
      const cleanQuestions = questions.map(q => {
        const clean: any = {
          id: q.id, text: q.text, type: q.type, required: q.required,
          requirePhoto: q.requirePhoto || false, requireComment: q.requireComment || false,
          instructions: q.instructions || '', norma: q.norma || norma,
          puntoNorma: q.puntoNorma, esCriticoInocuidad: tipoCuestionario === 'checklist' ? false : (q.esCriticoInocuidad || false),
          nivelDesvio: tipoCuestionario === 'checklist' ? 'ninguno' : (q.nivelDesvio || 'ninguno'),
          minimumTimeSeconds: q.minimumTimeSeconds || 0, order: q.order || 0
        };
        if (tipoCuestionario === 'checklist' && q.nivelRiesgoMunicipal) {
          clean.nivelRiesgoMunicipal = q.nivelRiesgoMunicipal;
        }
        if (sectorizado && q.group) clean.group = q.group;
        return clean;
      });

      const configData: any = {
        name, description, norma, tipo: tipoCuestionario,
        requireQR: tipoCuestionario === 'checklist' ? false : requireQR,
        requirePhotos, minimumTimeMinutes, allowPartialSave, requireLocation,
        questions: cleanQuestions,
        sectorizado: tipoCuestionario === 'checklist' ? false : (sectorizado || false),
        qrGroups: grupos,
        qrGroupsConfig: qrConfig,
        notificationEmails: notificationEmails.split(',').map(e => e.trim()).filter(Boolean),
        notifyOnCritical: notifyOnCritical || false,
        notifyOnRecurrence: notifyOnRecurrence || false,
        notifyOnScoreBelow: notifyOnScoreBelow || null,
        active: true
      };

      if (editingId) { await updateQuestionnaire(editingId, configData); }
      else { await createQuestionnaire(configData); }
      await loadQuestionnaires(); resetForm();
    } catch (error) { console.error('Error guardando cuestionario:', error); alert('Error al guardar'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Desactivar este cuestionario?')) return;
    try { await deleteQuestionnaire(id); await loadQuestionnaires(); }
    catch (error) { console.error('Error eliminando:', error); }
  };

  const grupos = sectorizado ? [...new Set(questions.filter(q => q.group).map(q => q.group!))] : [];
  const esChecklist = tipoCuestionario === 'checklist';

  if (!isAdmin) {
    return (
      <div className="p-6"><div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-600">Solo administradores pueden gestionar cuestionarios</p></div></div>
    );
  }

  if (loading) {
    return (
      <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-4 bg-gray-200 rounded w-1/4"></div><div className="h-10 bg-gray-200 rounded"></div></div></div>
    );
  }

  return (
    <div className="p-6">
      {showExcelImporter && (
        <ExcelImporter norma={norma} onImport={handleImportFromExcel} onClose={() => setShowExcelImporter(false)} sectorizado={sectorizado && !esChecklist} esChecklist={esChecklist} />
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Cuestionarios</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={startNewSimple} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm flex items-center gap-1">
            <FileText className="w-4 h-4" /> + Simple
          </button>
          <button onClick={startNewSectorizado} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm flex items-center gap-1">
            <Building2 className="w-4 h-4" /> + Sectorizado
          </button>
          <button onClick={startNewChecklist} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm flex items-center gap-1">
            <ClipboardCheck className="w-4 h-4" /> + Checklist Municipal
          </button>
          {showForm && <button onClick={resetForm} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 text-sm">Cancelar</button>}
        </div>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            {esChecklist ? <ClipboardCheck className="w-5 h-5 text-red-600" /> : sectorizado ? <Building2 className="w-5 h-5 text-purple-600" /> : <FileText className="w-5 h-5 text-blue-600" />}
            <h3 className="text-lg font-semibold">
              {editingId ? 'Editar Cuestionario' : esChecklist ? 'Nuevo Checklist Municipal' : sectorizado ? 'Nuevo Cuestionario Sectorizado' : 'Nuevo Cuestionario Simple'}
            </h3>
          </div>

          {esChecklist && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              🚨 <strong>Checklist Municipal:</strong> Cuestionario de 2 opciones (Cumple / No Cumple). Cada pregunta tiene un nivel de riesgo. Un crítico sin cumplir implica riesgo de clausura.
            </div>
          )}

          {sectorizado && !esChecklist && (
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
              🏢 <strong>Sectorizado:</strong> Las preguntas se agrupan por sectores. Seleccioná el QR correspondiente a cada grupo.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Norma *</label>
                <select value={norma} onChange={(e) => setNorma(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  {NORMAS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>

            {/* QR Config para sectorizado */}
            {sectorizado && !esChecklist && grupos.length > 0 && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-medium mb-3">🔒 Configuración de QR por Grupo</h4>
                <div className="space-y-3">
                  {grupos.map(grupo => (
                    <div key={grupo} className="bg-white p-3 rounded border">
                      <p className="text-sm font-bold text-purple-800 mb-2">{grupo}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium mb-1">Sitio</label>
                          <select value={selectedSiteForQR[grupo] || ''} onChange={(e) => handleSiteChange(grupo, e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm">
                            <option value="">Seleccionar sitio...</option>
                            {sites.filter(s => s.active).map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Sector QR</label>
                          <select value={qrConfig[grupo]?.sectorQRId || ''} onChange={(e) => handleSectorChange(grupo, e.target.value)} className="w-full px-2 py-1.5 border rounded text-sm" disabled={!selectedSiteForQR[grupo]}>
                            <option value="">Seleccionar sector...</option>
                            {allSectors.filter(s => s.active && s.siteId === selectedSiteForQR[grupo]).map(sector => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
                          </select>
                        </div>
                      </div>
                      {qrConfig[grupo] ? <p className="text-xs text-green-600 mt-1">✅ QR: {qrConfig[grupo].siteName} → {qrConfig[grupo].sectorName}</p> : <p className="text-xs text-red-500 mt-1">⚠️ Falta configurar QR</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Configuraciones (solo para auditorías) */}
            {!esChecklist && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Configuraciones</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {!sectorizado && (
                    <label className="flex items-center space-x-2"><input type="checkbox" checked={requireQR} onChange={(e) => setRequireQR(e.target.checked)} /><span className="text-sm">Requerir QR</span></label>
                  )}
                  <label className="flex items-center space-x-2"><input type="checkbox" checked={requirePhotos} onChange={(e) => setRequirePhotos(e.target.checked)} /><span className="text-sm">Requerir fotos</span></label>
                  <label className="flex items-center space-x-2"><input type="checkbox" checked={allowPartialSave} onChange={(e) => setAllowPartialSave(e.target.checked)} /><span className="text-sm">Guardado parcial</span></label>
                  <div><label className="block text-xs font-medium">Tiempo mín (min)</label><input type="number" value={minimumTimeMinutes} onChange={(e) => setMinimumTimeMinutes(parseInt(e.target.value) || 0)} className="w-24 px-2 py-1 border rounded text-sm" min="0" /></div>
                </div>
              </div>
            )}

            {/* Alertas */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium mb-3">📧 Configuración de Alertas</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Emails de respaldo (opcional)</label>
                  <input type="text" value={notificationEmails} onChange={(e) => setNotificationEmails(e.target.value)} placeholder="respaldo@empresa.com" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                {!esChecklist && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="flex items-center space-x-2"><input type="checkbox" checked={notifyOnCritical} onChange={(e) => setNotifyOnCritical(e.target.checked)} /><span className="text-sm">🚨 Desvíos críticos</span></label>
                    <label className="flex items-center space-x-2"><input type="checkbox" checked={notifyOnRecurrence} onChange={(e) => setNotifyOnRecurrence(e.target.checked)} /><span className="text-sm">⚠️ Recurrencias</span></label>
                    <div><label className="block text-xs font-medium">📊 Alertar si score &lt;</label><select value={notifyOnScoreBelow || ''} onChange={(e) => setNotifyOnScoreBelow(e.target.value ? parseInt(e.target.value) : null)} className="w-full px-2 py-1 border rounded text-sm"><option value="">No alertar</option><option value="90">90%</option><option value="81">81%</option><option value="70">70%</option></select></div>
                  </div>
                )}
              </div>
            </div>

            {/* Preguntas */}
            <div>
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <h4 className="font-medium">Preguntas ({questions.length}) {sectorizado && <span className="text-xs text-purple-600">- {grupos.length} grupos</span>}</h4>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowExcelImporter(true); }} className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600">📥 Importar Excel</button>
                  <button type="button" onClick={() => addQuestion()} className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">+ Agregar Manual</button>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border"><p className="text-gray-500 mb-2">No hay preguntas.</p></div>
              ) : (
                <div className="space-y-3">
                  {sectorizado && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-xs font-bold text-gray-500">Grupos:</span>
                      {grupos.map(g => <span key={g} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">{g}</span>)}
                    </div>
                  )}
                  {questions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {sectorizado && !esChecklist && (
                            <input type="text" value={question.group || ''} onChange={(e) => updateQuestion(index, { group: e.target.value })} placeholder="Grupo" className="w-24 px-2 py-1 border rounded text-xs font-medium text-purple-700" />
                          )}
                          <h5 className="font-medium text-sm">Pregunta {index + 1}</h5>
                        </div>
                        <button type="button" onClick={() => removeQuestion(index)} className="text-red-600 hover:text-red-800 text-xs">Eliminar</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2"><label className="block text-xs font-medium mb-1">Texto *</label><input type="text" value={question.text} onChange={(e) => updateQuestion(index, { text: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                        <div><label className="block text-xs font-medium mb-1">Punto de Norma *</label><input type="text" value={question.puntoNorma} onChange={(e) => updateQuestion(index, { puntoNorma: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                        <div><label className="block text-xs font-medium mb-1">Norma ref.</label><input type="text" value={question.norma} onChange={(e) => updateQuestion(index, { norma: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                        <div className="md:col-span-2"><label className="block text-xs font-medium mb-1">Instrucciones</label><input type="text" value={question.instructions} onChange={(e) => updateQuestion(index, { instructions: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                        
                        {/* Nivel de Riesgo (solo checklists) */}
                        {esChecklist && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-1">Nivel de Riesgo si NO cumple</label>
                            <div className="flex gap-2 flex-wrap">
                              {RIESGOS_MUNICIPALES.map(riesgo => (
                                <button
                                  key={riesgo.value}
                                  type="button"
                                  onClick={() => updateQuestion(index, { nivelRiesgoMunicipal: riesgo.value })}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${question.nivelRiesgoMunicipal === riesgo.value ? 'ring-2 ring-offset-1 border-' + (riesgo.value === 'critico' ? 'red-500 bg-red-50' : riesgo.value === 'medio' ? 'yellow-500 bg-yellow-50' : 'blue-500 bg-blue-50') : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                                >
                                  {riesgo.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {!esChecklist && (
                            <label className="flex items-center space-x-1"><input type="checkbox" checked={question.esCriticoInocuidad} onChange={(e) => updateQuestion(index, { esCriticoInocuidad: e.target.checked })} /><span className="text-xs">🚨 Crítico</span></label>
                          )}
                          <label className="flex items-center space-x-1"><input type="checkbox" checked={question.requirePhoto} onChange={(e) => updateQuestion(index, { requirePhoto: e.target.checked })} /><span className="text-xs">📸 Foto</span></label>
                          <label className="flex items-center space-x-1"><input type="checkbox" checked={question.requireComment} onChange={(e) => updateQuestion(index, { requireComment: e.target.checked })} /><span className="text-xs">💬 Coment.</span></label>
                          <div><label className="block text-xs font-medium">Tiempo (seg)</label><input type="number" value={question.minimumTimeSeconds} onChange={(e) => updateQuestion(index, { minimumTimeSeconds: parseInt(e.target.value) || 0 })} className="w-full px-2 py-1 border rounded text-sm" min="0" /></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-4 pt-4 border-t">
              <button type="submit" className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">{editingId ? 'Guardar Cambios' : 'Crear Cuestionario'}</button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de cuestionarios */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Norma</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preguntas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {questionnaires.map(q => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-medium text-sm">{q.name}</p></td>
                  <td className="px-4 py-3">
                    {q.tipo === 'checklist' ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 flex items-center gap-1 w-fit"><ClipboardCheck className="w-3 h-3" /> Municipal</span>
                    ) : q.sectorizado ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 flex items-center gap-1 w-fit"><Building2 className="w-3 h-3" /> Sectorizado</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 flex items-center gap-1 w-fit"><FileText className="w-3 h-3" /> Simple</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{q.norma || 'BPM General'}</td>
                  <td className="px-4 py-3 text-xs">{q.questions?.length || 0} preguntas</td>
                  <td className="px-4 py-3"><div className="flex space-x-2"><button onClick={() => handleEdit(q)} className="text-blue-600 hover:text-blue-800 text-xs">Editar</button><button onClick={() => handleDuplicate(q)} className="text-purple-600 hover:text-purple-800 text-xs">Duplicar</button><button onClick={() => handleDelete(q.id)} className="text-red-600 hover:text-red-800 text-xs">Desactivar</button></div></td>
                </tr>
              ))}
              {questionnaires.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No hay cuestionarios</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireManager;