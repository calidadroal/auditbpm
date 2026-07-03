// src/components/Audit/AuditScheduler.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import {
  getAuditSchedules,
  createAuditSchedule,
  updateAuditSchedule,
  deleteAuditSchedule,
  calcularProximaAuditoria,
  verificarVencimientos
} from '../../firebase';
import { Calendar, Clock, AlertTriangle, CheckCircle, Plus, Trash2, RefreshCw, Mail, Edit3 } from 'lucide-react';
import type { AuditSchedule, FrecuenciaAuditoria } from '../../types';

const FRECUENCIAS: { value: FrecuenciaAuditoria; label: string }[] = [
  { value: 'diaria', label: 'Diaria' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
];

const AuditScheduler: React.FC = () => {
  const { user } = useAuth();
  const { sites, questionnaires } = useAppContext();
  const [schedules, setSchedules] = useState<AuditSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);

  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [frecuencia, setFrecuencia] = useState<FrecuenciaAuditoria>('mensual');
  const [cuestionarioIds, setCuestionarioIds] = useState<string[]>([]);
  const [diasAlerta, setDiasAlerta] = useState(3);
  const [emailsAlerta, setEmailsAlerta] = useState('');
  const [alertarVencimiento, setAlertarVencimiento] = useState(true);

  const isAdminUser = user?.role === 'admin';
  const isGestor = user?.role === 'gestor';
  const canEdit = isAdminUser || isGestor;
  const userSites = user?.assignedSites || [];
  const availableSites = isAdminUser ? sites : sites.filter(s => userSites.includes(s.id));

  useEffect(() => { loadSchedules(); }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await getAuditSchedules();
      setSchedules(isAdminUser ? data : data.filter(s => userSites.includes(s.siteId)));
    } catch (error) { console.error('Error cargando programaciones:', error); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setSelectedSiteId(''); setFrecuencia('mensual'); setCuestionarioIds([]);
    setDiasAlerta(3); setEmailsAlerta(''); setAlertarVencimiento(true);
    setEditingId(null); setShowForm(false);
  };

  const handleEdit = (schedule: AuditSchedule) => {
    setEditingId(schedule.id); setSelectedSiteId(schedule.siteId);
    setFrecuencia(schedule.frecuencia); setCuestionarioIds(schedule.cuestionarioIds || []);
    setDiasAlerta(schedule.diasAlertaVencimiento || 3);
    setEmailsAlerta((schedule.emailsAlerta || []).join(', '));
    setAlertarVencimiento(schedule.alertarVencimiento); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) { alert('Seleccione un sitio'); return; }
    try {
      const site = sites.find(s => s.id === selectedSiteId);
      const emailsArr = emailsAlerta.split(',').map(e => e.trim()).filter(Boolean);
      const scheduleData: any = {
        siteId: selectedSiteId, siteName: site?.name || '', frecuencia, cuestionarioIds,
        alertarVencimiento, diasAlertaVencimiento: diasAlerta,
        emailsAlerta: emailsArr.length > 0 ? emailsArr : (site?.notificationEmails || []), active: true,
      };
      if (editingId) { await updateAuditSchedule(editingId, scheduleData); }
      else { scheduleData.proximaAuditoria = calcularProximaAuditoria(frecuencia); scheduleData.estado = 'al_dia'; await createAuditSchedule(scheduleData); }
      await loadSchedules(); resetForm();
    } catch (error) { console.error('Error guardando:', error); alert('Error al guardar'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta programación?')) return;
    try { await deleteAuditSchedule(id); await loadSchedules(); } catch (error) { console.error('Error:', error); }
  };

  const handleVerificar = async () => {
    setVerificando(true);
    try { await verificarVencimientos(); await loadSchedules(); alert('Verificación completada'); }
    catch (error) { console.error('Error:', error); } finally { setVerificando(false); }
  };

  if (loading) return <div className="p-6"><div className="animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Programación de Auditorías</h2>
        <div className="flex gap-2">
          <button onClick={handleVerificar} disabled={verificando} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1">
            <RefreshCw className={`w-4 h-4 ${verificando ? 'animate-spin' : ''}`} /> {verificando ? 'Verificando...' : 'Verificar Vencimientos'}
          </button>
          {canEdit && (
            <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1">
              <Plus className="w-4 h-4" /> {showForm ? 'Cancelar' : 'Nueva Programación'}
            </button>
          )}
        </div>
      </div>

      {showForm && canEdit && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{editingId ? 'Editar Programación' : 'Nueva Programación'}</h3>
            {editingId && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Editando - Frecuencia y fecha no se modifican</span>}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sitio *</label>
                <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required disabled={!!editingId}>
                  <option value="">Seleccionar sitio...</option>
                  {availableSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Frecuencia *</label>
                <select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as FrecuenciaAuditoria)} className="w-full px-3 py-2 border rounded-lg" disabled={!!editingId}>
                  {FRECUENCIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                {editingId && <p className="text-xs text-gray-400 mt-1">No editable</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cuestionarios</label>
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                  {questionnaires.map(q => (
                    <label key={q.id} className="flex items-center gap-2 py-1 text-sm">
                      <input type="checkbox" checked={cuestionarioIds.includes(q.id)} onChange={(e) => { if (e.target.checked) setCuestionarioIds([...cuestionarioIds, q.id]); else setCuestionarioIds(cuestionarioIds.filter(id => id !== q.id)); }} />
                      {q.name} ({q.norma})
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Días de alerta antes</label>
                <input type="number" value={diasAlerta} onChange={(e) => setDiasAlerta(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-lg" min="0" max="30" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Mail className="w-4 h-4" /> Emails de alerta</label>
                <input type="text" value={emailsAlerta} onChange={(e) => setEmailsAlerta(e.target.value)} placeholder="gestor@empresa.com, calidad@empresa.com" className="w-full px-3 py-2 border rounded-lg text-sm" />
                <p className="text-xs text-gray-500 mt-1">Si se deja vacío, se usan los emails del sitio</p>
              </div>
              <div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={alertarVencimiento} onChange={(e) => setAlertarVencimiento(e.target.checked)} /><span className="text-sm">Alertar por email al vencer</span></label>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <button type="submit" className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">{editingId ? 'Guardar Cambios' : 'Crear Programación'}</button>
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sitio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frecuencia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Próxima</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alertas</th>
                {canEdit && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {schedules.length === 0 ? (
                <tr><td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-gray-500">No hay programaciones</td></tr>
              ) : (
                schedules.map(s => {
                  const proxima = s.proximaAuditoria?.seconds ? new Date(s.proximaAuditoria.seconds * 1000) : new Date(s.proximaAuditoria);
                  const dias = Math.ceil((proxima.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-sm">{s.siteName}</td>
                      <td className="px-4 py-3 text-sm capitalize">{s.frecuencia}</td>
                      <td className="px-4 py-3 text-sm"><div>{proxima.toLocaleDateString('es-AR')}</div><div className="text-xs text-gray-500">{dias > 0 ? `${dias} días` : 'Vencida'}</div></td>
                      <td className="px-4 py-3">
                        {s.estado === 'al_dia' && <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Al día</span>}
                        {s.estado === 'proxima' && <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Próxima</span>}
                        {s.estado === 'vencida' && <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 flex items-center gap-1 w-fit"><AlertTriangle className="w-3 h-3" /> Vencida</span>}
                      </td>
                      <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{s.alertarVencimiento && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{s.diasAlertaVencimiento}d antes</span>}{s.emailsAlerta?.length > 0 && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">📧 {s.emailsAlerta.length}</span>}</div></td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(s)} className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"><Edit3 className="w-3 h-3" /> Editar</button>
                            <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"><Trash2 className="w-3 h-3" /> Eliminar</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditScheduler;