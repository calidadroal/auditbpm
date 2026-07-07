// src/components/Questionnaires/QuestionnaireManager.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  getQuestionnaires,
  createQuestionnaire,
  updateQuestionnaireWithPermisos,
  deleteQuestionnaireWithPermisos,
  getSectors
} from '../../firebase';
import ExcelImporter from './ExcelImporter';
import { descargarPlantilla, duplicarCuestionario } from '../../utils/excelTemplate';
import type { QuestionnaireConfig, QuestionnaireQuestion, NivelDesvio, NivelRiesgoMunicipal, SectorQR, QRGroupConfig, TipoCuestionario, PreguntaGestion, TipoPreguntaGestion, OpcionMultipleChoice } from '../../types';
import { FileText, Building2, ClipboardCheck, ShoppingBag, Plus, Trash2, GripVertical } from 'lucide-react';

const NORMAS = [
  'IRAM 14201', 'CAA Capítulo X', 'CAA Capítulo V', 'CAA Art. 18-36',
  'BPM General', 'HACCP', 'ISO 22000', 'Norma Municipal Córdoba',
  'Gestión Comercio'
];

const RIESGOS_MUNICIPALES: { value: NivelRiesgoMunicipal; label: string; color: string }[] = [
  { value: 'critico', label: '🔴 Crítico - Puede derivar en clausura', color: 'text-red-700' },
  { value: 'medio', label: '🟡 Medio - Requiere atención', color: 'text-yellow-700' },
  { value: 'bajo', label: '🟢 Bajo - Observación menor', color: 'text-blue-700' },
];

const TIPOS_PREGUNTA_GESTION: { value: TipoPreguntaGestion; label: string; icon: string }[] = [
  { value: 'texto', label: 'Texto abierto', icon: '📝' },
  { value: 'multiple_choice', label: 'Multiple choice', icon: '☑️' },
  { value: 'numerica', label: 'Numérica', icon: '🔢' },
  { value: 'si_no', label: 'Sí / No', icon: '✅' },
  { value: 'foto', label: 'Foto', icon: '📸' },
  { value: 'fecha', label: 'Fecha', icon: '📅' },
];

const QuestionnaireManager: React.FC = () => {
  const { isAdmin, sites } = useAppContext();
  const { user } = useAuth();
  
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
  const [preguntasGestion, setPreguntasGestion] = useState<PreguntaGestion[]>([]);
  const [selectedSitios, setSelectedSitios] = useState<string[]>([]);

  const [notificationEmails, setNotificationEmails] = useState('');
  const [notifyOnCritical, setNotifyOnCritical] = useState(true);
  const [notifyOnRecurrence, setNotifyOnRecurrence] = useState(true);
  const [notifyOnScoreBelow, setNotifyOnScoreBelow] = useState<number | null>(null);

  const puedeGestionarCuestionarios = isAdmin || user?.role === 'gestor' || user?.role === 'coordinador';

  useEffect(() => { loadQuestionnaires(); loadSectors(); }, []);

  const loadSectors = async () => {
    try { const data = await getSectors(); setAllSectors(data); }
    catch (error) { console.error('Error cargando sectores:', error); }
  };

  const loadQuestionnaires = async () => {
    try {
      setLoading(true);
      const data = await getQuestionnaires();
      
      // ✅ Si el usuario es gestor o coordinador, filtrar por sus sitios
      if (user?.role === 'gestor' || user?.role === 'coordinador') {
        const assignedSites = user.assignedSites || [];
        const filtered = data.filter(q => {
          if (q.sitioIds && q.sitioIds.length > 0) {
            return q.sitioIds.some(siteId => assignedSites.includes(siteId));
          }
          return false;
        });
        setQuestionnaires(filtered);
      } else {
        setQuestionnaires(data);
      }
    } catch (error) {
      console.error('Error cargando cuestionarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(''); setDescription(''); setNorma('BPM General'); setRequireQR(false);
    setRequirePhotos(false); setMinimumTimeMinutes(0); setAllowPartialSave(false);
    setRequireLocation(false); setQuestions([]); setSectorizado(false); setTipoCuestionario('auditoria');
    setQrConfig({}); setSelectedSiteForQR({});
    setPreguntasGestion([]); setSelectedSitios([]);
    setNotificationEmails(''); setNotifyOnCritical(true); setNotifyOnRecurrence(true);
    setNotifyOnScoreBelow(null); setEditingId(null); setShowForm(false);
  };

  const startNewSimple = () => { resetForm(); setSectorizado(false); setTipoCuestionario('auditoria'); setShowForm(true); };
  const startNewSectorizado = () => { resetForm(); setSectorizado(true); setTipoCuestionario('auditoria'); setRequireQR(true); setShowForm(true); };
  const startNewChecklist = () => { resetForm(); setTipoCuestionario('checklist'); setNorma('Norma Municipal Córdoba'); setShowForm(true); };
  const startNewGestionComercio = () => { 
    resetForm(); 
    setTipoCuestionario('gestion_comercio'); 
    setNorma('Gestión Comercio'); 
    setShowForm(true); 
  };

  const handleEdit = (q: QuestionnaireConfig) => {
    setEditingId(q.id); setName(q.name); setDescription(q.description || '');
    setNorma(q.norma || 'BPM General'); setRequireQR(q.requireQR);
    setRequirePhotos(q.requirePhotos); setMinimumTimeMinutes(q.minimumTimeMinutes);
    setAllowPartialSave(q.allowPartialSave); setRequireLocation(q.requireLocation);
    setQuestions(q.questions || []); setSectorizado(q.sectorizado || false);
    setTipoCuestionario(q.tipo || 'auditoria');
    setQrConfig(q.qrGroupsConfig || {});
    setPreguntasGestion((q as any).preguntasGestion || []);
    setSelectedSitios(q.sitioIds || []);
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
    setPreguntasGestion((duplicated as any).preguntasGestion || []);
    setSelectedSitios(duplicated.sitioIds || []);
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

  const addPreguntaGestion = () => {
    const nueva: PreguntaGestion = {
      id: `pg_${Date.now()}`,
      texto: '',
      tipo: 'texto',
      requerido: true,
      opciones: [],
      instrucciones: '',
      orden: preguntasGestion.length,
      grupo: ''
    };
    setPreguntasGestion([...preguntasGestion, nueva]);
  };

  const updatePreguntaGestion = (index: number, updates: Partial<PreguntaGestion>) => {
    const updated = [...preguntasGestion];
    updated[index] = { ...updated[index], ...updates };
    if (updates.tipo === 'multiple_choice' && !updated[index].opciones?.length) {
      updated[index].opciones = [
        { id: `op_${Date.now()}_1`, texto: '' },
        { id: `op_${Date.now()}_2`, texto: '' }
      ];
    }
    setPreguntasGestion(updated);
  };

  const removePreguntaGestion = (index: number) => {
    setPreguntasGestion(preguntasGestion.filter((_, i) => i !== index));
  };

  const addOpcion = (preguntaIndex: number) => {
    const updated = [...preguntasGestion];
    const opciones = updated[preguntaIndex].opciones || [];
    opciones.push({ id: `op_${Date.now()}`, texto: '' });
    updated[preguntaIndex].opciones = opciones;
    setPreguntasGestion(updated);
  };

  const updateOpcion = (preguntaIndex: number, opcionIndex: number, texto: string) => {
    const updated = [...preguntasGestion];
    if (updated[preguntaIndex].opciones) {
      updated[preguntaIndex].opciones![opcionIndex].texto = texto;
    }
    setPreguntasGestion(updated);
  };

  const removeOpcion = (preguntaIndex: number, opcionIndex: number) => {
    const updated = [...preguntasGestion];
    if (updated[preguntaIndex].opciones) {
      updated[preguntaIndex].opciones = updated[preguntaIndex].opciones!.filter((_, i) => i !== opcionIndex);
    }
    setPreguntasGestion(updated);
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

  const handleToggleSitio = (siteId: string) => {
    setSelectedSitios(prev => 
      prev.includes(siteId) 
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { alert('El nombre es requerido'); return; }
    
    // ✅ Verificar que haya sitios seleccionados (si no es admin)
    if (user?.role !== 'admin' && selectedSitios.length === 0) {
      alert('Debe seleccionar al menos un sitio donde se pueda usar este cuestionario');
      return;
    }
    
    const esGestionComercio = tipoCuestionario === 'gestion_comercio';
    
    if (esGestionComercio) {
      if (preguntasGestion.length === 0) { alert('Debe agregar al menos una pregunta'); return; }
      for (const q of preguntasGestion) {
        if (!q.texto.trim()) { alert('Todas las preguntas deben tener texto'); return; }
        if (q.tipo === 'multiple_choice' && (!q.opciones || q.opciones.filter(o => o.texto.trim()).length < 2)) {
          alert(`La pregunta "${q.texto}" es multiple choice y necesita al menos 2 opciones con texto`);
          return;
        }
      }
    } else {
      if (questions.length === 0) { alert('Debe agregar al menos una pregunta'); return; }
      for (const q of questions) {
        if (!q.text.trim()) { alert('Todas las preguntas deben tener texto'); return; }
        if (!q.puntoNorma.trim()) { alert(`Falta punto de norma en: ${q.text}`); return; }
      }
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
      let configData: any;

      if (esGestionComercio) {
        configData = {
          name,
          description,
          norma,
          tipo: 'gestion_comercio',
          requireQR: false,
          requirePhotos: false,
          minimumTimeMinutes,
          allowPartialSave,
          requireLocation,
          questions: [],
          preguntasGestion: preguntasGestion.map((q, i) => ({
            ...q,
            orden: i
          })),
          sitioIds: selectedSitios, // ✅ GUARDAR SITIOS SELECCIONADOS
          sectorizado: false,
          qrGroups: [],
          qrGroupsConfig: {},
          notificationEmails: notificationEmails.split(',').map(e => e.trim()).filter(Boolean),
          notifyOnCritical: false,
          notifyOnRecurrence: false,
          notifyOnScoreBelow: null,
          active: true
        };
      } else {
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

        configData = {
          name, description, norma, tipo: tipoCuestionario,
          requireQR: tipoCuestionario === 'checklist' ? false : requireQR,
          requirePhotos, minimumTimeMinutes, allowPartialSave, requireLocation,
          questions: cleanQuestions,
          sitioIds: selectedSitios, // ✅ GUARDAR SITIOS SELECCIONADOS
          sectorizado: tipoCuestionario === 'checklist' ? false : (sectorizado || false),
          qrGroups: grupos,
          qrGroupsConfig: qrConfig,
          notificationEmails: notificationEmails.split(',').map(e => e.trim()).filter(Boolean),
          notifyOnCritical: notifyOnCritical || false,
          notifyOnRecurrence: notifyOnRecurrence || false,
          notifyOnScoreBelow: notifyOnScoreBelow || null,
          active: true
        };
      }

      let sitioIdsParaVerificar = selectedSitios;
      if (user?.role !== 'admin' && sitioIdsParaVerificar.length === 0) {
        alert('Debe seleccionar al menos un sitio');
        return;
      }

      if (editingId) { 
        await updateQuestionnaireWithPermisos(editingId, configData, user!); 
      } else { 
        await createQuestionnaire(configData); 
      }
      await loadQuestionnaires(); 
      resetForm();
    } catch (error: any) { 
      console.error('Error guardando cuestionario:', error); 
      alert('Error al guardar: ' + (error.message || '')); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Desactivar este cuestionario?')) return;
    try { 
      await deleteQuestionnaireWithPermisos(id, user!); 
      await loadQuestionnaires(); 
    } catch (error: any) { 
      console.error('Error eliminando:', error); 
      alert('Error al eliminar: ' + (error.message || '')); 
    }
  };

  const grupos = sectorizado ? [...new Set(questions.filter(q => q.group).map(q => q.group!))] : [];
  const esChecklist = tipoCuestionario === 'checklist';
  const esGestionComercio = tipoCuestionario === 'gestion_comercio';

  // ✅ VERIFICACIÓN DE PERMISOS
  if (!puedeGestionarCuestionarios) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">⚠️ Acceso restringido</p>
          <p className="text-sm text-red-500 mt-1">
            Solo administradores, gestores y coordinadores pueden gestionar cuestionarios.
          </p>
          <p className="text-xs text-red-400 mt-2">
            Tu rol actual es: <strong>{user?.role || 'sin rol'}</strong>
          </p>
        </div>
      </div>
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
          <button onClick={startNewGestionComercio} className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm flex items-center gap-1">
            <ShoppingBag className="w-4 h-4" /> + Gestión Comercio
          </button>
          {showForm && <button onClick={resetForm} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 text-sm">Cancelar</button>}
        </div>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          {/* ... formulario (igual que antes) ... */}
          
          {/* ✅ SELECTOR DE SITIOS (para gestores/coordinadores) */}
          {user?.role !== 'admin' && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-sm text-blue-800 mb-2">📌 Sitios donde se aplica este cuestionario</h4>
              <p className="text-xs text-blue-600 mb-3">Seleccioná los sitios que podrán usar este cuestionario</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {sites.map(site => (
                  <label key={site.id} className="flex items-center space-x-2 p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={selectedSitios.includes(site.id)} 
                      onChange={() => handleToggleSitio(site.id)} 
                      className="form-checkbox h-4 w-4"
                    />
                    <span className="text-sm">{site.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ... resto del formulario ... */}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sitios</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preguntas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {questionnaires.map(q => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-medium text-sm">{q.name}</p></td>
                  <td className="px-4 py-3">
                    {q.tipo === 'gestion_comercio' ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit"><ShoppingBag className="w-3 h-3" /> Gestión</span>
                    ) : q.tipo === 'checklist' ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 flex items-center gap-1 w-fit"><ClipboardCheck className="w-3 h-3" /> Municipal</span>
                    ) : q.sectorizado ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 flex items-center gap-1 w-fit"><Building2 className="w-3 h-3" /> Sectorizado</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 flex items-center gap-1 w-fit"><FileText className="w-3 h-3" /> Simple</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{q.norma || 'BPM General'}</td>
                  <td className="px-4 py-3 text-xs">
                    {q.sitioIds && q.sitioIds.length > 0 
                      ? q.sitioIds.length 
                      : 'Todos'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {q.tipo === 'gestion_comercio' 
                      ? `${(q as any).preguntasGestion?.length || 0} preguntas` 
                      : `${q.questions?.length || 0} preguntas`
                    }
                  </td>
                  <td className="px-4 py-3"><div className="flex space-x-2"><button onClick={() => handleEdit(q)} className="text-blue-600 hover:text-blue-800 text-xs">Editar</button><button onClick={() => handleDuplicate(q)} className="text-purple-600 hover:text-purple-800 text-xs">Duplicar</button><button onClick={() => handleDelete(q.id)} className="text-red-600 hover:text-red-800 text-xs">Desactivar</button></div></td>
                </tr>
              ))}
              {questionnaires.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay cuestionarios</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireManager;