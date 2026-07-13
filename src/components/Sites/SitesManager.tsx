// src/components/Sites/SitesManager.tsx
import React, { useState, useEffect } from 'react';
import { MapPin, Home, Trash2, Mail, Edit3, X, FileCheck, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { createSite, deleteSite, updateSite, getRequisitos } from '../../firebase';
import type { Requisito, RequisitoAplicado } from '../../types';

const SitesManager: React.FC = () => {
  const { sites } = useAppContext();
  const { user } = useAuth();
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSectors, setNewSectors] = useState('');
  const [newEmails, setNewEmails] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const [requisitosDisponibles, setRequisitosDisponibles] = useState<Requisito[]>([]);
  const [requisitosSeleccionados, setRequisitosSeleccionados] = useState<{ [id: string]: RequisitoAplicado }>({});
  const [mostrarRequisitos, setMostrarRequisitos] = useState(false);

  const [editingSite, setEditingSite] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSectors, setEditSectors] = useState('');
  const [editEmails, setEditEmails] = useState('');
  const [editRequisitosSeleccionados, setEditRequisitosSeleccionados] = useState<{ [id: string]: RequisitoAplicado }>({});

  useEffect(() => {
    loadRequisitosDisponibles();
  }, []);

  const loadRequisitosDisponibles = async () => {
    try {
      const reqs = await getRequisitos();
      setRequisitosDisponibles(reqs);
    } catch (error) {
      console.error('Error cargando requisitos:', error);
    }
  };

  const getEstadoVencimiento = (fecha: string | null | undefined) => {
    if (!fecha) return null;
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const diffDias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDias < 0) return { estado: 'vencida', color: 'text-red-600 bg-red-50', icon: AlertTriangle, label: 'Vencida' };
    if (diffDias <= 30) return { estado: 'por_vencer', color: 'text-yellow-600 bg-yellow-50', icon: AlertTriangle, label: `Vence en ${diffDias} días` };
    if (diffDias <= 90) return { estado: 'proxima', color: 'text-green-600 bg-green-50', icon: Calendar, label: `Vence en ${diffDias} días` };
    return { estado: 'vigente', color: 'text-green-600 bg-green-50', icon: CheckCircle2, label: 'Vigente' };
  };

  const VencimientoBadge = ({ fecha }: { fecha: string | null | undefined }) => {
    const estado = getEstadoVencimiento(fecha);
    if (!estado) return <span className="text-[9px] text-gray-400">Sin fecha</span>;
    const Icon = estado.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${estado.color}`}>
        <Icon className="w-3 h-3" />
        {estado.label}
      </span>
    );
  };

  const tieneVencimientosCriticos = (sitio: any) => {
    const reqs = sitio.requisitosAplicados;
    if (!reqs) return false;
    return Object.values(reqs).some((r: any) => {
      if (!r.fechaVencimiento) return false;
      const estado = getEstadoVencimiento(r.fechaVencimiento);
      return estado?.estado === 'vencida' || estado?.estado === 'por_vencer';
    });
  };

  const handleToggleRequisito = (reqId: string, req: Requisito, isEdit: boolean = false) => {
    const target = isEdit ? editRequisitosSeleccionados : requisitosSeleccionados;
    const setter = isEdit ? setEditRequisitosSeleccionados : setRequisitosSeleccionados;
    
    if (target[reqId]) {
      const newReqs = { ...target };
      delete newReqs[reqId];
      setter(newReqs);
    } else {
      setter({
        ...target,
        [reqId]: {
          numero: '',
          fechaVencimiento: null
        }
      });
    }
  };

  const handleRequisitoChange = (reqId: string, field: 'numero' | 'fechaVencimiento', value: string, isEdit: boolean = false) => {
    const target = isEdit ? editRequisitosSeleccionados : requisitosSeleccionados;
    const setter = isEdit ? setEditRequisitosSeleccionados : setRequisitosSeleccionados;
    
    setter({
      ...target,
      [reqId]: {
        ...target[reqId],
        [field]: value || (field === 'fechaVencimiento' ? null : '')
      }
    });
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role === 'lector') {
      alert('Solo lectura: no puedes crear sitios.');
      return;
    }
    const sectorsArr = newSectors.split(',').map(s => s.trim()).filter(Boolean);
    const emailsArr = newEmails.split(',').map(e => e.trim()).filter(Boolean);
    if (!newName.trim() || sectorsArr.length === 0) {
      alert('Completá nombre y al menos un sector');
      return;
    }

    setIsSaving(true);
    try {
      await createSite({ 
        name: newName, 
        description: newDesc, 
        sectors: sectorsArr,
        notificationEmails: emailsArr,
        requisitosAplicados: Object.keys(requisitosSeleccionados).length > 0 ? requisitosSeleccionados : null
      } as any);
      setNewName('');
      setNewDesc('');
      setNewSectors('');
      setNewEmails('');
      setRequisitosSeleccionados({});
      setMostrarRequisitos(false);
      alert('Sitio creado con éxito');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (site: any) => {
    setEditingSite(site.id);
    setEditName(site.name || '');
    setEditDesc(site.description || '');
    setEditSectors((site.sectors || []).join(', '));
    setEditEmails((site.notificationEmails || []).join(', '));
    setEditRequisitosSeleccionados(site.requisitosAplicados || {});
  };

  const handleCancelEdit = () => {
    setEditingSite(null);
  };

  const handleSaveEdit = async (siteId: string) => {
    const sectorsArr = editSectors.split(',').map(s => s.trim()).filter(Boolean);
    const emailsArr = editEmails.split(',').map(e => e.trim()).filter(Boolean);
    
    if (!editName.trim() || sectorsArr.length === 0) {
      alert('Completá nombre y al menos un sector');
      return;
    }

    setIsSaving(true);
    try {
      await updateSite(siteId, {
        name: editName,
        description: editDesc,
        sectors: sectorsArr,
        notificationEmails: emailsArr,
        requisitosAplicados: Object.keys(editRequisitosSeleccionados).length > 0 ? editRequisitosSeleccionados : null
      } as any);
      alert('Sitio actualizado con éxito');
      handleCancelEdit();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSite = async (siteId: string, siteName: string) => {
    if (!window.confirm(`¿Eliminar "${siteName}"? Esta acción borrará el sitio permanentemente.`)) return;
    try {
      await deleteSite(siteId);
      if (selectedSite === siteId) setSelectedSite('');
      if (editingSite === siteId) handleCancelEdit();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b pb-2 mb-3">
            <Home className="w-4 h-4 text-green-600" />
            Establecimientos
          </h3>
          {sites.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No hay plantas configuradas</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sites.map(s => {
                const criticos = tieneVencimientosCriticos(s);
                const reqsAplicados = s.requisitosAplicados || {};
                const reqsConVencimiento = Object.entries(reqsAplicados).filter(([_, v]: any) => v.fechaVencimiento);
                
                return (
                <div
                  key={s.id}
                  className={`p-4 rounded-xl border transition-all relative ${
                    editingSite === s.id 
                      ? 'border-green-500 bg-green-50/30' 
                      : selectedSite === s.id 
                        ? 'border-green-500 bg-green-50/30' 
                        : criticos 
                          ? 'border-red-300 bg-red-50/20' 
                          : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {editingSite === s.id ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-green-700 text-[10px] uppercase">Editando</span>
                        <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded border border-slate-300 h-8 px-2 text-xs font-bold" placeholder="Nombre" />
                      <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full rounded border border-slate-300 h-8 px-2 text-xs" placeholder="Descripción" />
                      <input type="text" value={editSectors} onChange={(e) => setEditSectors(e.target.value)} className="w-full rounded border border-slate-300 h-8 px-2 text-xs" placeholder="Sectores (separados por coma)" />
                      <input type="text" value={editEmails} onChange={(e) => setEditEmails(e.target.value)} className="w-full rounded border border-slate-300 h-8 px-2 text-xs" placeholder="Emails (separados por coma)" />
                      
                      <div className="border-t pt-2 mt-2">
                        <span className="font-bold text-[10px] text-slate-500 flex items-center gap-1 mb-2">
                          <FileCheck className="w-3 h-3" /> Requisitos
                        </span>
                        {requisitosDisponibles.length === 0 ? (
                          <p className="text-[9px] text-gray-400 italic">No hay requisitos configurados. Ve a la pestaña "Requisitos".</p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {requisitosDisponibles.map(req => {
                              const aplicado = editRequisitosSeleccionados[req.id];
                              const seleccionado = !!aplicado;
                              return (
                                <div key={req.id} className={`p-2 rounded border text-[10px] ${seleccionado ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={seleccionado} onChange={() => handleToggleRequisito(req.id, req, true)} className="w-3 h-3" />
                                    <span className="font-medium">{req.nombre}</span>
                                  </label>
                                  {seleccionado && (
                                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                                      {req.pideNumero && (
                                        <input type="text" value={aplicado.numero || ''} onChange={(e) => handleRequisitoChange(req.id, 'numero', e.target.value, true)} className="w-full rounded border border-slate-300 h-6 px-1.5 text-[9px]" placeholder="N°" />
                                      )}
                                      {req.pideFechaVencimiento && (
                                        <input type="date" value={aplicado.fechaVencimiento || ''} onChange={(e) => handleRequisitoChange(req.id, 'fechaVencimiento', e.target.value, true)} className="w-full rounded border border-slate-300 h-6 px-1.5 text-[9px]" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      <button onClick={() => handleSaveEdit(s.id)} disabled={isSaving} className="w-full py-1.5 bg-green-600 text-white font-bold rounded text-xs hover:bg-green-700 disabled:opacity-50">
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  ) : (
                    <>
                      {criticos && (
                        <div className="absolute -top-1 -right-1">
                          <span className="flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                        </div>
                      )}
                      <div onClick={() => setSelectedSite(s.id === selectedSite ? '' : s.id)} className="cursor-pointer">
                        <h4 className="font-extrabold text-xs flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-green-600" />
                          {s.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{s.description}</p>
                        
                        {reqsConVencimiento.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                              <FileCheck className="w-2.5 h-2.5" /> Requisitos
                            </span>
                            <div className="space-y-0.5">
                              {reqsConVencimiento.map(([reqId, data]: any) => {
                                const req = requisitosDisponibles.find(r => r.id === reqId);
                                return (
                                  <div key={reqId} className="flex items-center justify-between py-0.5 px-1.5 rounded bg-white/60 border border-slate-100">
                                    <span className="text-[9px] text-slate-600">{req?.nombre || reqId}</span>
                                    {data.fechaVencimiento && <VencimientoBadge fecha={data.fechaVencimiento} />}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 pt-2 border-t">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Sectores:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.sectors?.map((sec: string) => (
                              <span key={sec} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{sec}</span>
                            ))}
                          </div>
                        </div>
                        {s.notificationEmails && s.notificationEmails.length > 0 && (
                          <div className="mt-2 pt-2 border-t">
                            <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                              <Mail className="w-2.5 h-2.5" /> Avisos a:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.notificationEmails.map((email: string) => (
                                <span key={email} className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700">{email}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleStartEdit(s); }} className="p-1 rounded-full hover:bg-green-50 text-slate-400 hover:text-green-500 transition-colors" title="Editar sitio">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSite(s.id, s.name); }} className="p-1 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Eliminar sitio">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3.5">
          <h3 className="font-bold text-xs uppercase text-slate-500 border-b pb-1">Nuevo Establecimiento</h3>
          <form onSubmit={handleCreateSite} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-400">Nombre</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Planta San Miguel" className="w-full rounded border border-slate-200 mt-1 h-9 p-2 bg-white" required />
            </div>
            <div>
              <label className="font-bold text-slate-400">Descripción</label>
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Planta principal" className="w-full rounded border border-slate-200 mt-1 h-9 p-2 bg-white" />
            </div>
            <div>
              <label className="font-bold text-slate-400">Sectores (separados por coma)</label>
              <input type="text" value={newSectors} onChange={(e) => setNewSectors(e.target.value)} placeholder="Cocina, Cámaras, Depósito" className="w-full rounded border border-slate-200 mt-1 h-9 p-2 bg-white" required />
            </div>
            <div>
              <label className="font-bold text-slate-400 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Emails de aviso
              </label>
              <input type="text" value={newEmails} onChange={(e) => setNewEmails(e.target.value)} placeholder="jefe@planta.com, calidad@planta.com" className="w-full rounded border border-slate-200 mt-1 h-9 p-2 bg-white" />
            </div>
            
            <div className="border-t pt-3">
              <button type="button" onClick={() => setMostrarRequisitos(!mostrarRequisitos)} className="font-bold text-slate-500 flex items-center gap-1 text-[10px] hover:text-green-600">
                <FileCheck className="w-3 h-3" />
                {mostrarRequisitos ? '▼' : '▶'} Requisitos aplicables
              </button>
              
              {mostrarRequisitos && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                  {requisitosDisponibles.length === 0 ? (
                    <p className="text-[9px] text-gray-400 italic">No hay requisitos configurados. Ve a la pestaña "Requisitos".</p>
                  ) : (
                    requisitosDisponibles.map(req => {
                      const aplicado = requisitosSeleccionados[req.id];
                      const seleccionado = !!aplicado;
                      return (
                        <div key={req.id} className={`p-2 rounded border text-[10px] ${seleccionado ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={seleccionado} onChange={() => handleToggleRequisito(req.id, req)} className="w-3 h-3" />
                            <span className="font-medium">{req.nombre}</span>
                          </label>
                          {seleccionado && (
                            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                              {req.pideNumero && (
                                <input type="text" value={aplicado.numero || ''} onChange={(e) => handleRequisitoChange(req.id, 'numero', e.target.value)} className="w-full rounded border border-slate-300 h-6 px-1.5 text-[9px]" placeholder="N°" />
                              )}
                              {req.pideFechaVencimiento && (
                                <input type="date" value={aplicado.fechaVencimiento || ''} onChange={(e) => handleRequisitoChange(req.id, 'fechaVencimiento', e.target.value)} className="w-full rounded border border-slate-300 h-6 px-1.5 text-[9px]" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            
            <button type="submit" disabled={isSaving} className="w-full py-2 bg-green-600 text-white font-bold rounded text-xs hover:bg-green-700 disabled:opacity-50">
              {isSaving ? 'Guardando...' : 'Registrar Sitio'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SitesManager;