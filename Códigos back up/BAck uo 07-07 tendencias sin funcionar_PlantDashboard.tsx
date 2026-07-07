// src/components/Dashboard/PlantDashboard.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { deleteAudit, getAuditSchedules, getRequisitos, getAlertasConfig } from '../../firebase';
import { generarPDF } from '../../utils/pdfGenerator';
import AuditDetail from '../Audit/AuditDetail';
import { Calendar, Clock, AlertTriangle, CheckCircle, BarChart3, ChevronDown, ChevronUp, FileCheck, ShieldAlert, ClipboardCheck, TrendingUp, TrendingDown, Minus, Camera, Timer, RotateCcw, Bell, ShoppingBag, Trophy } from 'lucide-react';
import type { AuditRecord, AuditSchedule, Requisito, Site, TipoCuestionario, AlertaConfig } from '../../types';

const PlantDashboard: React.FC = () => {
  const { user } = useAuth();
  const { audits, sites, questionnaires } = useAppContext();
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<string>('');
  const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);
  const [schedules, setSchedules] = useState<AuditSchedule[]>([]);
  const [requisitos, setRequisitos] = useState<Requisito[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'auditoria' | 'checklist' | 'gestion_comercio'>('todos');

  const [alertasConfig, setAlertasConfig] = useState<AlertaConfig[]>([]);
  const [mostrarAlertasConfig, setMostrarAlertasConfig] = useState(false);

  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [mostrarHistograma, setMostrarHistograma] = useState(false);
  const [mostrarVencimientos, setMostrarVencimientos] = useState(false);
  const [mostrarReincidencia, setMostrarReincidencia] = useState(false);
  const [mostrarTendencias, setMostrarTendencias] = useState(true); // ✅ CORREGIDO

  const isAdminUser = user?.role === 'admin';
  const isGestor = user?.role === 'gestor';
  const isAuditor = user?.role === 'auditor';
  const userSites = user?.assignedSites || [];

  useEffect(() => { loadSchedules(); loadRequisitos(); loadAlertasConfig(); }, []);

  useEffect(() => {
    const hoy = new Date();
    const hace6Meses = new Date();
    hace6Meses.setMonth(hace6Meses.getMonth() - 6);
    setFechaDesde(hace6Meses.toISOString().split('T')[0]);
    setFechaHasta(hoy.toISOString().split('T')[0]);
  }, []);

  useEffect(() => { setSelectedQuestionnaireId(''); }, [selectedSiteId]);

  const loadSchedules = async () => {
    try { const data = await getAuditSchedules(); setSchedules(isAdminUser ? data : data.filter(s => userSites.includes(s.siteId))); }
    catch (error) { console.error('Error cargando programaciones:', error); }
  };

  const loadRequisitos = async () => {
    try { const data = await getRequisitos(); setRequisitos(data); }
    catch (error) { console.error('Error cargando requisitos:', error); }
  };

  const loadAlertasConfig = async () => {
    try { const data = await getAlertasConfig(); setAlertasConfig(data); }
    catch (error) { console.warn('Error cargando alertas config:', error); }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'vencimiento_requisito': 'Vencimiento de Requisitos',
      'vencimiento_cuestionario': 'Vencimiento de Auditorías',
      'score_bajo': 'Score Bajo'
    };
    return labels[tipo] || tipo;
  };

  const availableSites = useMemo(() => {
    if (isAdminUser) return sites.filter(s => s.active);
    return sites.filter(s => userSites.includes(s.id) && s.active);
  }, [sites, isAdminUser, userSites]);

  const availableQuestionnaires = useMemo(() => {
    if (!selectedSiteId) return [];
    const cuestionariosIds = new Set(audits.filter(a => a.siteId === selectedSiteId && a.questionnaireId).map(a => a.questionnaireId));
    return questionnaires.filter(q => cuestionariosIds.has(q.id));
  }, [audits, questionnaires, selectedSiteId]);

  const filteredAudits = useMemo(() => {
    let filtered = audits;
    if (!isAdminUser) filtered = filtered.filter(a => userSites.includes(a.siteId));
    if (isAuditor) filtered = filtered.filter(a => a.auditorId === user?.uid);
    if (selectedSiteId) filtered = filtered.filter(a => a.siteId === selectedSiteId);
    if (selectedQuestionnaireId) filtered = filtered.filter(a => a.questionnaireId === selectedQuestionnaireId);
    if (tipoFiltro !== 'todos') filtered = filtered.filter(a => (a.tipoCuestionario || 'auditoria') === tipoFiltro);
    return filtered;
  }, [audits, selectedSiteId, selectedQuestionnaireId, isAdminUser, userSites, tipoFiltro, isAuditor, user]);

  const auditorMetrics = useMemo(() => {
    if (!isAuditor || !user) return null;
    const misAuditorias = audits.filter(a => a.auditorId === user.uid && a.status === 'completed');
    const total = misAuditorias.length;
    const avgScore = total > 0 ? misAuditorias.reduce((sum, a) => sum + (a.score || 0), 0) / total : 0;
    const totalNC = misAuditorias.reduce((sum, a) => sum + (a.criticosNC || 0) + (a.totalNoCumplen || 0), 0);
    const totalFotos = misAuditorias.reduce((sum, a) => sum + (a.responses?.reduce((s, r) => s + (r.photoURLs?.length || 0), 0) || 0), 0);
    const totalPreguntas = misAuditorias.reduce((sum, a) => sum + (a.responses?.length || 0), 0);
    const tasaFotos = totalPreguntas > 0 ? Math.round((totalFotos / totalPreguntas) * 100) : 0;
    const avgDuracion = total > 0 ? Math.round(misAuditorias.reduce((sum, a) => sum + (a.durationMinutes || 0), 0) / total) : 0;
    return { total, avgScore, totalNC, tasaFotos, avgDuracion };
  }, [audits, isAuditor, user]);

  const semaforoRiesgo = useMemo(() => {
    if (isAuditor) return [];
    const sitiosAMostrar = selectedSiteId ? availableSites.filter(s => s.id === selectedSiteId) : availableSites;
    return sitiosAMostrar.map(site => {
      const ultimaAuditoria = audits
        .filter(a => a.siteId === site.id && a.status === 'completed')
        .sort((a, b) => {
          const fechaA = a.completedAt?.seconds ? a.completedAt.seconds * 1000 : a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const fechaB = b.completedAt?.seconds ? b.completedAt.seconds * 1000 : b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return fechaB - fechaA;
        })[0];
      
      const criticos = ultimaAuditoria?.criticosMunicipalesNC || ultimaAuditoria?.criticosNC || 0;
      const esChecklist = ultimaAuditoria?.tipoCuestionario === 'checklist';
      let riesgo: '🔴 Alto' | '🟡 Medio' | '🟢 Bajo' | '⚪ Sin datos';
      let color: string;
      
      if (!ultimaAuditoria) { riesgo = '⚪ Sin datos'; color = 'bg-gray-100 text-gray-600'; }
      else if (criticos >= 2) { riesgo = '🔴 Alto'; color = 'bg-red-100 text-red-800'; }
      else if (criticos === 1) { riesgo = '🟡 Medio'; color = 'bg-yellow-100 text-yellow-800'; }
      else { riesgo = '🟢 Bajo'; color = 'bg-green-100 text-green-800'; }

      const diasDesdeUltima = ultimaAuditoria ? Math.ceil((Date.now() - (ultimaAuditoria.completedAt?.seconds ? ultimaAuditoria.completedAt.seconds * 1000 : new Date(ultimaAuditoria.completedAt).getTime())) / (1000 * 60 * 60 * 24)) : null;

      return { site, ultimaAuditoria, criticos, riesgo, color, diasDesdeUltima, esChecklist };
    });
  }, [availableSites, audits, selectedSiteId, isAuditor]);

  const reincidenciaDesvios = useMemo(() => {
    if (isAuditor) return [];
    const sitiosAMostrar = selectedSiteId ? availableSites.filter(s => s.id === selectedSiteId) : availableSites;
    const resultados: { siteName: string; puntoNorma: string; norma: string; count: number; ultimoValor: string; }[] = [];

    sitiosAMostrar.forEach(site => {
      const siteAudits = audits
        .filter(a => a.siteId === site.id && a.status === 'completed')
        .sort((a, b) => {
          const fechaA = a.completedAt?.seconds ? a.completedAt.seconds * 1000 : a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const fechaB = b.completedAt?.seconds ? b.completedAt.seconds * 1000 : b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return fechaB - fechaA;
        })
        .slice(0, 6);

      if (siteAudits.length < 2) return;

      const desviosPorPunto: { [key: string]: { norma: string; counts: boolean[]; ultimoValor: string; } } = {};

      siteAudits.forEach((audit, idx) => {
        audit.responses?.forEach(resp => {
          if (resp.valor === 'NC' || resp.valor === 'NO_CUMPLE' || resp.valor === 'CP') {
            const key = resp.puntoNorma || resp.questionText?.substring(0, 60) || 'Sin clasificar';
            if (!desviosPorPunto[key]) desviosPorPunto[key] = { norma: resp.norma || '', counts: [], ultimoValor: resp.valor };
            desviosPorPunto[key].counts.push(true);
            if (idx === 0) desviosPorPunto[key].ultimoValor = resp.valor;
          }
        });
      });

      Object.entries(desviosPorPunto).forEach(([punto, data]) => {
        if (data.counts.length >= 3) {
          resultados.push({
            siteName: site.name,
            puntoNorma: punto,
            norma: data.norma,
            count: data.counts.length,
            ultimoValor: data.ultimoValor
          });
        }
      });
    });

    return resultados.sort((a, b) => b.count - a.count).slice(0, 10);
  }, [availableSites, audits, selectedSiteId, isAuditor]);



  const tendenciaScore = useMemo(() => {
  if (isAuditor) return [];

  // Obtener sitios a mostrar
  const sitiosAMostrar = selectedSiteId
    ? availableSites.filter(s => s.id === selectedSiteId)
    : availableSites;

  if (sitiosAMostrar.length === 0) return [];

  const resultado = sitiosAMostrar
    .map(site => {
      // Obtener auditorías completadas del sitio con fecha válida
      const siteAudits = audits
        .filter(a => a.siteId === site.id && a.status === 'completed')
        .filter(a => {
          // Verificar que tenga fecha válida
          const fecha = a.completedAt?.seconds
            ? new Date(a.completedAt.seconds * 1000)
            : a.completedAt
            ? new Date(a.completedAt)
            : null;
          return fecha !== null && !isNaN(fecha.getTime());
        })
        .sort((a, b) => {
          // Ordenar por fecha descendente (más reciente primero)
          const fechaA = a.completedAt?.seconds
            ? a.completedAt.seconds * 1000
            : a.completedAt
            ? new Date(a.completedAt).getTime()
            : 0;
          const fechaB = b.completedAt?.seconds
            ? b.completedAt.seconds * 1000
            : b.completedAt
            ? new Date(b.completedAt).getTime()
            : 0;
          return fechaB - fechaA;
        })
        .slice(0, 3) // Tomar las 3 más recientes
        .reverse(); // Invertir para que queden en orden cronológico ascendente

      // Si hay menos de 2 auditorías, no hay tendencia
      if (siteAudits.length < 2) {
        return null;
      }

      const scores = siteAudits.map(a => a.score || 0);
      const primera = scores[0];
      const ultima = scores[scores.length - 1];
      const diff = ultima - primera;

      let tendencia: 'subiendo' | 'bajando' | 'estable' = 'estable';
      if (diff >= 5) tendencia = 'subiendo';
      else if (diff <= -5) tendencia = 'bajando';

      return {
        site,
        scores,
        tendencia,
      };
    })
    .filter((item): item is { site: Site; scores: number[]; tendencia: 'subiendo' | 'bajando' | 'estable' } =>
      item !== null
    );

  // 🔍 LOG DE DEPURACIÓN (eliminar después de probar)
  console.log('📊 tendenciaScore final:', resultado);
  console.log('📊 cantidad de sitios con tendencia:', resultado.length);

  return resultado;
}, [availableSites, audits, selectedSiteId, isAuditor]);

  // ============================================================
  // RANKING DE SITIOS
  // ============================================================
  const rankingSitios = useMemo(() => {
    if (isAuditor) return [];
    
    const sitiosAMostrar = selectedSiteId 
      ? availableSites.filter(s => s.id === selectedSiteId) 
      : availableSites;
    
    return sitiosAMostrar
      .map(site => {
        const siteAudits = audits
          .filter(a => a.siteId === site.id && a.status === 'completed')
          .sort((a, b) => {
            const fechaA = a.completedAt?.seconds ? a.completedAt.seconds * 1000 : a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const fechaB = b.completedAt?.seconds ? b.completedAt.seconds * 1000 : b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return fechaB - fechaA;
          });
        
        const total = siteAudits.length;
        const avgScore = total > 0 
          ? siteAudits.reduce((sum, a) => sum + (a.score || 0), 0) / total 
          : 0;
        
        const ultimas3 = siteAudits.slice(0, 3).reverse();
        const scores = ultimas3.map(a => a.score || 0);
        let tendencia: 'subiendo' | 'bajando' | 'estable' = 'estable';
        if (scores.length >= 2) {
          const diff = scores[scores.length - 1] - scores[0];
          if (diff >= 5) tendencia = 'subiendo';
          else if (diff <= -5) tendencia = 'bajando';
        }
        
        return {
          site,
          avgScore,
          total,
          tendencia,
          ultimoScore: siteAudits.length > 0 ? siteAudits[0]?.score || 0 : 0,
        };
      })
      .filter(s => s.total > 0)
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [availableSites, audits, selectedSiteId, isAuditor]);

  const vencimientosRequisitos = useMemo(() => {
    if (!selectedSiteId) return [];
    const sitio = sites.find(s => s.id === selectedSiteId);
    if (!sitio?.requisitosAplicados) return [];
    const ahora = new Date();
    const items: { id: string; nombre: string; numero: string; fechaVencimiento: string; diasRestantes: number; estado: 'vencida' | 'critica' | 'proxima' | 'vigente'; }[] = [];
    Object.entries(sitio.requisitosAplicados).forEach(([reqId, data]) => {
      if (!data.fechaVencimiento) return;
      const req = requisitos.find(r => r.id === reqId);
      if (!req) return;
      const fechaVenc = new Date(data.fechaVencimiento);
      const dias = Math.ceil((fechaVenc.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
      let estado: 'vencida' | 'critica' | 'proxima' | 'vigente';
      if (dias < 0) estado = 'vencida';
      else if (dias <= 30) estado = 'critica';
      else if (dias <= 90) estado = 'proxima';
      else estado = 'vigente';
      items.push({ id: reqId, nombre: req.nombre, numero: data.numero || 'S/N', fechaVencimiento: data.fechaVencimiento, diasRestantes: dias, estado });
    });
    return items.sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [sites, selectedSiteId, requisitos]);

  const tieneVencimientosUrgentes = vencimientosRequisitos.some(v => v.estado === 'vencida' || v.estado === 'critica');

  const getVencimientoBadge = (estado: string, dias: number) => {
    switch (estado) {
      case 'vencida': return { color: 'bg-red-100 text-red-800 border-red-300', icon: ShieldAlert, label: `Vencida hace ${Math.abs(dias)} días` };
      case 'critica': return { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertTriangle, label: `Vence en ${dias} días` };
      case 'proxima': return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock, label: `Vence en ${dias} días` };
      default: return { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle, label: 'Vigente' };
    }
  };

  const histogramaDesvios = useMemo(() => {
    if (!selectedSiteId) return [];
    if (!fechaDesde && !fechaHasta) return [];
    const desde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
    const hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null;
    const auditsEnRango = audits.filter(a => {
      if (a.siteId !== selectedSiteId) return false;
      if (a.status !== 'completed') return false;
      if (selectedQuestionnaireId && a.questionnaireId !== selectedQuestionnaireId) return false;
      if (tipoFiltro !== 'todos' && (a.tipoCuestionario || 'auditoria') !== tipoFiltro) return false;
      const fechaAudit = a.completedAt?.seconds ? new Date(a.completedAt.seconds * 1000) : a.completedAt ? new Date(a.completedAt) : null;
      if (!fechaAudit) return false;
      if (desde && fechaAudit < desde) return false;
      if (hasta && fechaAudit > hasta) return false;
      return true;
    });
    const esChecklist = tipoFiltro === 'checklist' || (tipoFiltro === 'todos' && auditsEnRango.some(a => (a.tipoCuestionario || 'auditoria') === 'checklist'));
    const desviosPorCapitulo: { [capitulo: string]: { nc: number; cp: number; totalPreguntas: number; criticos: number; medios: number; }; } = {};
    auditsEnRango.forEach(audit => {
      audit.responses?.forEach(resp => {
        const capitulo = resp.puntoNorma || resp.questionText?.substring(0, 50) || 'Sin clasificar';
        if (!desviosPorCapitulo[capitulo]) desviosPorCapitulo[capitulo] = { nc: 0, cp: 0, totalPreguntas: 0, criticos: 0, medios: 0 };
        desviosPorCapitulo[capitulo].totalPreguntas++;
        if (resp.valor === 'NC' || resp.valor === 'NO_CUMPLE') {
          desviosPorCapitulo[capitulo].nc++;
          if (resp.nivelRiesgoMunicipal === 'critico') desviosPorCapitulo[capitulo].criticos++;
          if (resp.nivelRiesgoMunicipal === 'medio') desviosPorCapitulo[capitulo].medios++;
        } else if (resp.valor === 'CP') {
          desviosPorCapitulo[capitulo].cp++;
        }
      });
    });
    const resultado = Object.entries(desviosPorCapitulo)
      .map(([capitulo, datos]) => ({ capitulo, nc: datos.nc, cp: datos.cp, totalDesvios: datos.nc + datos.cp, totalPreguntas: datos.totalPreguntas, criticos: datos.criticos, medios: datos.medios, esChecklist: esChecklist && auditsEnRango.some(a => a.responses?.some(r => r.puntoNorma === capitulo && r.nivelRiesgoMunicipal)) }))
      .filter(d => d.totalDesvios > 0)
      .sort((a, b) => b.totalDesvios - a.totalDesvios);
    return resultado;
  }, [audits, selectedSiteId, selectedQuestionnaireId, fechaDesde, fechaHasta, tipoFiltro]);

  const maxDesvios = useMemo(() => { if (histogramaDesvios.length === 0) return 1; return Math.max(...histogramaDesvios.map(d => d.totalDesvios)); }, [histogramaDesvios]);
  const totalDesviosGeneral = useMemo(() => histogramaDesvios.reduce((sum, d) => sum + d.totalDesvios, 0), [histogramaDesvios]);
  const esHistogramaChecklist = histogramaDesvios.length > 0 && histogramaDesvios[0].esChecklist;

  const siteStats = useMemo(() => {
    const sitiosAMostrar = selectedSiteId ? availableSites.filter(s => s.id === selectedSiteId) : availableSites;
    return sitiosAMostrar.map(site => {
      const siteAudits = audits.filter(a => a.siteId === site.id && a.status === 'completed' && (!isAuditor || a.auditorId === user?.uid));
      const completed = siteAudits.length;
      const avgScore = completed > 0 ? siteAudits.reduce((sum, a) => sum + (a.score || 0), 0) / completed : 0;
      return { site, total: audits.filter(a => a.siteId === site.id && (!isAuditor || a.auditorId === user?.uid)).length, completed, avgScore };
    });
  }, [availableSites, audits, selectedSiteId, isAuditor, user]);

  const filteredSchedules = useMemo(() => {
    if (selectedSiteId) return schedules.filter(s => s.siteId === selectedSiteId);
    return schedules;
  }, [schedules, selectedSiteId]);

  const canDelete = isAdminUser;
  const canSeeSchedules = isAdminUser || isGestor || user?.role === 'lector' || user?.role === 'coordinador';

  const handleDeleteAudit = async (auditId: string, siteName: string) => {
    if (!window.confirm(`¿Eliminar esta de "${siteName}"?`)) return;
    try { await deleteAudit(auditId); if (selectedAudit?.id === auditId) setSelectedAudit(null); }
    catch (err: any) { alert('Error: ' + err.message); }
  };

  const getScoreColor = (score: number) => { if (score >= 90) return 'text-green-600'; if (score >= 81) return 'text-yellow-600'; return 'text-red-600'; };
  const getStatusBadge = (status: string) => {
    if (status === 'completed') return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Completada</span>;
    if (status === 'in_progress') return <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">En progreso</span>;
    return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">{status}</span>;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        {isAuditor ? '📊 Mis Métricas' : 'Dashboard por Planta'}
      </h2>

      {isAdminUser && alertasConfig.length > 0 && (
        <div className="bg-white border rounded-lg mb-8">
          <div className="px-6 py-4 bg-blue-50 border-b flex items-center justify-between cursor-pointer" onClick={() => setMostrarAlertasConfig(!mostrarAlertasConfig)}>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">🔔 Alertas Configuradas</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{alertasConfig.length}</span>
            </div>
            {mostrarAlertasConfig ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-blue-600" />}
          </div>
          {mostrarAlertasConfig && (
            <div className="p-4 space-y-3">
              {alertasConfig.map(alerta => (
                <div key={alerta.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">{alerta.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {getTipoLabel(alerta.tipo)} · {(alerta.diasAntes || []).sort((a: number, b: number) => b - a).map((d: number) => `${d}d`).join(', ')} antes
                        {alerta.emailsDestino.length > 0 && ` · 📧 ${alerta.emailsDestino.length} email(s)`}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Activa</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isAuditor && (
        <div className="mb-6 flex flex-wrap gap-3">
          <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
            <option value="">Todas las plantas</option>
            {availableSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
          {selectedSiteId && availableQuestionnaires.length > 0 && (
            <select value={selectedQuestionnaireId} onChange={(e) => setSelectedQuestionnaireId(e.target.value)} className="px-4 py-2 border rounded-lg bg-white">
              <option value="">Todos los cuestionarios</option>
              {availableQuestionnaires.map(q => (
                <option key={q.id} value={q.id}>{q.name} ({q.tipo === 'gestion_comercio' ? 'Gestión' : q.tipo === 'checklist' ? 'Municipal' : q.sectorizado ? 'Sectorizado' : 'Simple'})</option>
              ))}
            </select>
          )}
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value as any)} className="px-4 py-2 border rounded-lg bg-white">
            <option value="todos">Todos los tipos</option>
            <option value="auditoria">Auditorías BPM</option>
            <option value="checklist">Checklists Municipales</option>
            <option value="gestion_comercio">Gestión Comercio</option>
          </select>
        </div>
      )}

      {isAuditor && auditorMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{auditorMetrics.total}</p>
            <p className="text-xs text-gray-600">Auditorías realizadas</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className={`text-2xl font-bold ${getScoreColor(auditorMetrics.avgScore)}`}>{auditorMetrics.avgScore.toFixed(1)}%</p>
            <p className="text-xs text-gray-600">Score promedio</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{auditorMetrics.totalNC}</p>
            <p className="text-xs text-gray-600">No Cumplimientos</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-purple-600"><Camera className="w-4 h-4 inline mr-1" />{auditorMetrics.tasaFotos}%</p>
            <p className="text-xs text-gray-600">Tasa de fotos</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-orange-600"><Timer className="w-4 h-4 inline mr-1" />{auditorMetrics.avgDuracion}m</p>
            <p className="text-xs text-gray-600">Duración prom.</p>
          </div>
        </div>
      )}

      {!isAuditor && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {siteStats.map(({ site, total, completed, avgScore }) => (
            <div key={site.id} className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h3 className="font-semibold text-lg mb-2">{site.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{site.address || site.city || ''}</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center"><p className="text-2xl font-bold text-blue-600">{total}</p><p className="text-xs text-gray-600">Total</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-green-600">{completed}</p><p className="text-xs text-gray-600">Completadas</p></div>
                <div className="text-center"><p className="text-2xl font-bold text-purple-600">{avgScore.toFixed(1)}%</p><p className="text-xs text-gray-600">Score</p></div>
              </div>
            </div>
          ))}
          {siteStats.length === 0 && <div className="col-span-full text-center py-8 text-gray-400">No hay plantas disponibles</div>}
        </div>
      )}

      {!isAuditor && semaforoRiesgo.length > 0 && (
        <div className="bg-white border rounded-lg mb-8">
          <div className="px-6 py-4 bg-gray-50 border-b flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold">🚨 Semáforo de Riesgo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sitio</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Última Auditoría</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Críticos</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Días sin auditar</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Riesgo</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {semaforoRiesgo.map(({ site, ultimaAuditoria, criticos, riesgo, color, diasDesdeUltima, esChecklist }) => (
                  <tr key={site.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{site.name}</td>
                    <td className="px-4 py-3 text-sm">
                      {ultimaAuditoria ? (
                        <>
                          {new Date(ultimaAuditoria.completedAt?.seconds ? ultimaAuditoria.completedAt.seconds * 1000 : ultimaAuditoria.completedAt).toLocaleDateString('es-AR')}
                          <span className="ml-1 text-xs text-gray-400">({ultimaAuditoria.score || 0}%)</span>
                          {esChecklist && <span className="ml-1 text-xs text-red-500">🏛️</span>}
                        </>
                      ) : 'Sin datos'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-red-600">{criticos}</td>
                    <td className="px-4 py-3 text-sm">
                      {diasDesdeUltima !== null ? (
                        <span className={diasDesdeUltima > 30 ? 'text-red-600 font-bold' : diasDesdeUltima > 15 ? 'text-yellow-600' : 'text-green-600'}>
                          {diasDesdeUltima} días
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>{riesgo}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
           {/* ============================================================
          RANKING DE SITIOS - NUEVA SECCIÓN (CORREGIDO)
          ============================================================ */}
      {!isAuditor && rankingSitios.length > 0 && (
        <div className="bg-white border rounded-lg mb-8">
          <div className="px-6 py-4 bg-gray-50 border-b flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold">🏆 Ranking de Sitios</h3>
            <span className="text-xs text-gray-400 ml-auto">
              Basado en score promedio
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sitio</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score Promedio</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Último Score</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Auditorías</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tendencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rankingSitios.map((item, index) => {
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                  const TendenciaIcon = item.tendencia === 'subiendo' 
                    ? TrendingUp 
                    : item.tendencia === 'bajando' 
                      ? TrendingDown 
                      : Minus;
                  const tendenciaColor = item.tendencia === 'subiendo' 
                    ? 'text-green-600' 
                    : item.tendencia === 'bajando' 
                      ? 'text-red-600' 
                      : 'text-yellow-600';
                  return (
                    <tr key={item.site.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-bold text-gray-500">{medal}</td>
                      <td className="px-4 py-3 text-sm font-medium">{item.site.name}</td>
                      <td className="px-4 py-3 text-sm font-bold">
                        <span className={getScoreColor(item.avgScore)}>
                          {item.avgScore.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={getScoreColor(item.ultimoScore)}>
                          {item.ultimoScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.total}</td>
                      <td className="px-4 py-3">
                        <TendenciaIcon className={`w-4 h-4 ${tendenciaColor}`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isAuditor && tendenciaScore.length > 0 && (
        <div className="bg-white border rounded-lg mb-8">
          <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between cursor-pointer" onClick={() => setMostrarTendencias(!mostrarTendencias)}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">📈 Tendencia de Score (últimas 3)</h3>
            </div>
            {mostrarTendencias ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          {mostrarTendencias && (
            <div className="p-4 space-y-3">
              {tendenciaScore.map(({ site, scores, tendencia }) => {
                const Icono = tendencia === 'subiendo' ? TrendingUp : tendencia === 'bajando' ? TrendingDown : Minus;
                const colorTendencia = tendencia === 'subiendo' ? 'text-green-600' : tendencia === 'bajando' ? 'text-red-600' : 'text-yellow-600';
                return (
                  <div key={site.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">{site.name}</span>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {scores.map((s, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreColor(s)} bg-white border`}>{s.toFixed(0)}%</span>
                        ))}
                      </div>
                      <Icono className={`w-4 h-4 ${colorTendencia}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!isAuditor && reincidenciaDesvios.length > 0 && (
        <div className="bg-white border rounded-lg mb-8">
          <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between cursor-pointer" onClick={() => setMostrarReincidencia(!mostrarReincidencia)}>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold">🔁 Desvíos Reincidentes (3+ auditorías)</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">{reincidenciaDesvios.length}</span>
            </div>
            {mostrarReincidencia ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          {mostrarReincidencia && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sitio</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Punto / Capítulo</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reincidencias</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Último valor</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {reincidenciaDesvios.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{item.siteName}</td>
                      <td className="px-4 py-3 text-sm">{item.puntoNorma}<br /><span className="text-xs text-gray-400">{item.norma}</span></td>
                      <td className="px-4 py-3 text-sm font-bold text-red-600">{item.count}x</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">{item.ultimoValor}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!isAuditor && selectedSiteId && vencimientosRequisitos.length > 0 && (
        <div className="bg-white border rounded-lg mb-8">
          <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between cursor-pointer" onClick={() => setMostrarVencimientos(!mostrarVencimientos)}>
            <div className="flex items-center gap-2">
              {tieneVencimientosUrgentes ? <ShieldAlert className="w-5 h-5 text-red-600 animate-pulse" /> : <FileCheck className="w-5 h-5 text-blue-600" />}
              <h3 className="font-semibold">Vencimientos de Requisitos</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tieneVencimientosUrgentes ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{vencimientosRequisitos.length}</span>
            </div>
            {mostrarVencimientos ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          {mostrarVencimientos && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Requisito</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">N°</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {vencimientosRequisitos.map((v) => {
                    const badge = getVencimientoBadge(v.estado, v.diasRestantes);
                    const Icon = badge.icon;
                    return (
                      <tr key={v.id} className={`hover:bg-gray-50 ${v.estado === 'vencida' ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium">{v.nombre}</td>
                        <td className="px-4 py-3 text-sm font-mono">{v.numero}</td>
                        <td className="px-4 py-3 text-sm">{new Date(v.fechaVencimiento).toLocaleDateString('es-AR')}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}><Icon className="w-3 h-3" />{badge.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!isAuditor && selectedSiteId && (
        <div className="bg-white border rounded-lg mb-8">
          <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between cursor-pointer" onClick={() => setMostrarHistograma(!mostrarHistograma)}>
            <div className="flex items-center gap-2">
              {esHistogramaChecklist ? <ClipboardCheck className="w-5 h-5 text-red-600" /> : <BarChart3 className="w-5 h-5 text-red-600" />}
              <h3 className="font-semibold">{esHistogramaChecklist ? 'Histograma de Desvíos (Checklist)' : 'Histograma de Desvíos por Capítulo'}</h3>
              {totalDesviosGeneral > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{totalDesviosGeneral} desvíos</span>}
            </div>
            {mostrarHistograma ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          {mostrarHistograma && (
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
                <label className="text-xs font-medium text-gray-600">Desde:</label>
                <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="px-3 py-1.5 border rounded text-sm" />
                <label className="text-xs font-medium text-gray-600">Hasta:</label>
                <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="px-3 py-1.5 border rounded text-sm" />
              </div>
              <div className="flex items-center gap-6 mb-4">
                {esHistogramaChecklist ? (
                  <>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded"></div><span className="text-xs font-medium">No Cumple</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-500 rounded"></div><span className="text-xs font-medium">Crítico</span></div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded"></div><span className="text-xs font-medium">NC</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded"></div><span className="text-xs font-medium">CP</span></div>
                  </>
                )}
              </div>
              {histogramaDesvios.length === 0 ? (
                <div className="text-center py-8 text-gray-400"><BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-sm">No hay desvíos en el período seleccionado</p></div>
              ) : (
                <div className="space-y-3">
                  {histogramaDesvios.map((item, index) => {
                    const porcentajeNC = (item.nc / maxDesvios) * 100;
                    const porcentajeCP = (item.cp / maxDesvios) * 100;
                    return (
                      <div key={index} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]" title={item.capitulo}>{item.capitulo}</span>
                          <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                            <span className="text-red-600 font-bold">{item.nc}</span> NC
                            {!esHistogramaChecklist && <><span className="text-yellow-600 font-bold"> / {item.cp}</span> CP</>}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden flex">
                          <div className="bg-red-500 h-full transition-all flex items-center justify-center text-white text-[10px] font-bold min-w-[2px]" style={{ width: `${porcentajeNC}%` }}>{item.nc > 0 && porcentajeNC > 8 ? item.nc : ''}</div>
                          {!esHistogramaChecklist && (
                            <div className="bg-yellow-500 h-full transition-all flex items-center justify-center text-white text-[10px] font-bold min-w-[2px]" style={{ width: `${porcentajeCP}%` }}>{item.cp > 0 && porcentajeCP > 8 ? item.cp : ''}</div>
                          )}
                          <div className="flex-1 bg-gray-100 h-full"></div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-600">TOTAL</span>
                    <span className="text-sm font-bold text-gray-800">
                      <span className="text-red-600">{histogramaDesvios.reduce((s, d) => s + d.nc, 0)} NC</span>
                      {!esHistogramaChecklist && <span className="text-yellow-600"> / {histogramaDesvios.reduce((s, d) => s + d.cp, 0)} CP</span>}
                      {' = '}{totalDesviosGeneral} desvíos
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {canSeeSchedules && !isAuditor && (
        <div className="bg-white border rounded-lg mb-8">
          <div className="px-6 py-4 bg-gray-50 border-b flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /><h3 className="font-semibold">Próximas Auditorías Programadas</h3></div>
          {filteredSchedules.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No hay programaciones.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sitio</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frecuencia</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Próxima</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSchedules.map(s => {
                    const proxima = s.proximaAuditoria?.seconds ? new Date(s.proximaAuditoria.seconds * 1000) : new Date(s.proximaAuditoria);
                    const dias = Math.ceil((proxima.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium">{s.siteName}</td><td className="px-4 py-2 text-sm capitalize">{s.frecuencia}</td>
                        <td className="px-4 py-2 text-sm">{proxima.toLocaleDateString('es-AR')}<span className="text-xs text-gray-500 ml-1">({dias > 0 ? `${dias}d` : 'hoy'})</span></td>
                        <td className="px-4 py-2">
                          {s.estado === 'al_dia' && <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Al día</span>}
                          {s.estado === 'proxima' && <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Próxima</span>}
                          {s.estado === 'vencida' && <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" /> Vencida</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-white border rounded-lg">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="font-semibold">
            {isAuditor ? '📋 Mis Últimas Auditorías' : `Últimas Auditorías ${selectedSiteId ? '(filtrado)' : ''}`}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead><tr className="bg-gray-50"><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planta</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th></tr></thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAudits.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400">No hay registros para mostrar</td></tr> : (
                filteredAudits.slice(0, 10).map(audit => {
                  const site = sites.find(s => s.id === audit.siteId);
                  const esChecklist = (audit.tipoCuestionario || 'auditoria') === 'checklist';
                  const esGestionComercio = (audit.tipoCuestionario || 'auditoria') === 'gestion_comercio';
                  return (
                    <tr key={audit.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedAudit(audit)}>
                      <td className="px-6 py-4 text-sm font-medium">{site?.name || audit.siteName || 'Sitio desconocido'}</td>
                      <td className="px-6 py-4">
                        {esGestionComercio ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit"><ShoppingBag className="w-3 h-3" /> Gestión</span>
                        ) : esChecklist ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 flex items-center gap-1 w-fit"><ClipboardCheck className="w-3 h-3" /> Municipal</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">BPM</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">{audit.completedAt?.seconds ? new Date(audit.completedAt.seconds * 1000).toLocaleDateString('es-AR') : 'N/A'}</td>
                      <td className="px-6 py-4"><span className={`font-medium ${getScoreColor(audit.score || 0)}`}>{audit.score || 0}%</span></td>
                      <td className="px-6 py-4">{getStatusBadge(audit.status)}</td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedAudit(audit)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Ver</button>
                          {canDelete && <button onClick={() => handleDeleteAudit(audit.id, site?.name || audit.siteName || '')} className="text-red-500 hover:text-red-700 text-sm font-medium">Eliminar</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAudit && (
        <AuditDetail 
          audit={selectedAudit} 
          siteName={sites.find(s => s.id === selectedAudit.siteId)?.name || selectedAudit.siteName || 'Sitio desconocido'} 
          onClose={() => setSelectedAudit(null)} 
          onDownloadPDF={() => generarPDF(selectedAudit)}
          onEdit={(audit) => {
            setSelectedAudit(null);
            const event = new CustomEvent('editAudit', { detail: { audit } });
            window.dispatchEvent(event);
          }}
        />
      )}
    </div>
  );
};

export default PlantDashboard;