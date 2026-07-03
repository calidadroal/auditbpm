// src/components/Solicitudes/SolicitudesPanel.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { getSolicitudes, createSolicitud } from '../../firebase';
import { MessageSquare, Plus, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import type { Solicitud, TipoSolicitud } from '../../types';

const TIPOS: { value: TipoSolicitud; label: string }[] = [
  { value: 'nuevo_sitio', label: '🏢 Nuevo Sitio' },
  { value: 'nuevo_cuestionario', label: '📋 Nuevo Cuestionario' },
  { value: 'modificar_sitio', label: '🔧 Modificar Sitio' },
  { value: 'nuevo_usuario', label: '👤 Nuevo Usuario' },
  { value: 'cambio_frecuencia', label: '📅 Cambiar Frecuencia' },
  { value: 'otro', label: '📝 Otro' },
];

const SolicitudesPanel: React.FC = () => {
  const { user } = useAuth();
  const { sites } = useAppContext();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState<TipoSolicitud>('otro');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sitioId, setSitioId] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const userSites = user?.assignedSites || [];

  useEffect(() => { loadSolicitudes(); }, []);

  const loadSolicitudes = async () => {
    try {
      setLoading(true);
      const data = await getSolicitudes(user?.uid, false);
      setSolicitudes(data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descripcion.trim()) { alert('Completá título y descripción'); return; }
    setSaving(true);
    try {
      const sitio = sites.find(s => s.id === sitioId);
      const payload: any = {
        tipo, titulo, descripcion,
        solicitanteId: user?.uid || '',
        solicitanteNombre: user?.displayName || '',
        solicitanteEmail: user?.email || '',
        estado: 'pendiente'
      };
      // Solo agregar si hay sitio seleccionado
      if (sitioId && sitio) {
        payload.sitioId = sitioId;
        payload.sitioNombre = sitio.name;
      }
      await createSolicitud(payload);
      setSuccess(true);
      setTitulo(''); setDescripcion(''); setSitioId(''); setTipo('otro');
      setShowForm(false);
      await loadSolicitudes();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) { console.error('Error:', error); alert('Error al enviar solicitud'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6"><div className="animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Solicitudes</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1">
          <Plus className="w-4 h-4" /> {showForm ? 'Cancelar' : 'Nueva Solicitud'}
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          ✅ Solicitud enviada. El administrador la revisará pronto.
        </div>
      )}

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Nueva Solicitud</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo *</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoSolicitud)} className="w-full px-3 py-2 border rounded-lg">
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Título *</label>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Necesito un nuevo sitio para..." className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción *</label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detallá lo que necesitás..." className="w-full px-3 py-2 border rounded-lg h-24" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sitio relacionado (opcional)</label>
              <select value={sitioId} onChange={(e) => setSitioId(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Ninguno</option>
                {userSites.map(id => { const s = sites.find(site => site.id === id); return s ? <option key={s.id} value={s.id}>{s.name}</option> : null; })}
              </select>
            </div>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
              {saving ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {solicitudes.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-lg border">No tenés solicitudes. ¡Creá la primera!</div>
        ) : (
          solicitudes.map(s => (
            <div key={s.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-bold text-gray-500">{TIPOS.find(t => t.value === s.tipo)?.label || s.tipo}</span>
                  <h4 className="font-semibold text-sm mt-1">{s.titulo}</h4>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  s.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                  s.estado === 'aprobada' ? 'bg-green-100 text-green-800' :
                  s.estado === 'rechazada' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                } flex items-center gap-1`}>
                  {s.estado === 'pendiente' && <Clock className="w-3 h-3" />}
                  {s.estado === 'aprobada' && <CheckCircle className="w-3 h-3" />}
                  {s.estado === 'rechazada' && <XCircle className="w-3 h-3" />}
                  {s.estado === 'en_revision' && <Loader className="w-3 h-3" />}
                  {s.estado.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-600">{s.descripcion}</p>
              {s.adminRespuesta && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="font-medium text-blue-800">📩 Respuesta del admin:</p>
                  <p className="text-blue-700 mt-1">{s.adminRespuesta}</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toLocaleDateString('es-AR') : ''}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SolicitudesPanel;