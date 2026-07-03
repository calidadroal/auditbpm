// src/components/Solicitudes/AdminSolicitudes.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSolicitudes, updateSolicitud } from '../../firebase';
import { CheckCircle, XCircle, Loader, Clock, MessageSquare, Send } from 'lucide-react';
import type { Solicitud, EstadoSolicitud } from '../../types';

const TIPOS: Record<string, string> = {
  nuevo_sitio: '🏢 Nuevo Sitio', nuevo_cuestionario: '📋 Nuevo Cuestionario',
  modificar_sitio: '🔧 Modificar Sitio', nuevo_usuario: '👤 Nuevo Usuario',
  cambio_frecuencia: '📅 Cambiar Frecuencia', otro: '📝 Otro'
};

const AdminSolicitudes: React.FC = () => {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [filtro, setFiltro] = useState<EstadoSolicitud | 'todas'>('todas');

  useEffect(() => { loadSolicitudes(); }, []);

  const loadSolicitudes = async () => {
    try { setLoading(true); const data = await getSolicitudes(undefined, true); setSolicitudes(data); }
    catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

  const handleEstado = async (id: string, estado: EstadoSolicitud) => {
    try {
      await updateSolicitud(id, { estado, adminId: user?.uid });
      await loadSolicitudes();
    } catch (error) { console.error('Error:', error); alert('Error al cambiar estado'); }
  };

  const handleResponder = async (id: string) => {
    if (!respuesta.trim()) return;
    try {
      await updateSolicitud(id, { estado: 'aprobada', adminRespuesta: respuesta, adminId: user?.uid });
      setRespondiendo(null); setRespuesta('');
      await loadSolicitudes();
    } catch (error) { console.error('Error:', error); alert('Error al responder'); }
  };

  const filtered = filtro === 'todas' ? solicitudes : solicitudes.filter(s => s.estado === filtro);

  if (loading) return <div className="p-6"><div className="animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div></div></div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Solicitudes Recibidas</h2>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['todas', 'pendiente', 'en_revision', 'aprobada', 'rechazada'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filtro === f ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            {f === 'todas' ? 'Todas' : f.replace('_', ' ')} ({f === 'todas' ? solicitudes.length : solicitudes.filter(s => s.estado === f).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 bg-white rounded-lg border">No hay solicitudes</div>
        ) : (
          filtered.map(s => (
            <div key={s.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs font-bold text-gray-500">{TIPOS[s.tipo] || s.tipo}</span>
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
              <p className="text-sm text-gray-600 mb-2">{s.descripcion}</p>
              <div className="text-xs text-gray-400 mb-3">
                Solicitante: <strong>{s.solicitanteNombre}</strong> ({s.solicitanteEmail})
                {s.sitioNombre && <> | Sitio: {s.sitioNombre}</>}
                <br />{s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toLocaleDateString('es-AR') : ''}
              </div>

              {/* Chat/Respuesta */}
              {s.adminRespuesta ? (
                <div className="p-3 bg-green-50 rounded-lg text-sm mb-3">
                  <p className="font-medium text-green-800">✅ Respuesta:</p>
                  <p className="text-green-700 mt-1">{s.adminRespuesta}</p>
                </div>
              ) : respondiendo === s.id ? (
                <div className="p-3 bg-blue-50 rounded-lg mb-3">
                  <textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Escribí tu respuesta..." className="w-full px-3 py-2 border rounded-lg text-sm h-20 mb-2" />
                  <div className="flex gap-2">
                    <button onClick={() => handleResponder(s.id)} className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600 flex items-center gap-1"><Send className="w-3 h-3" /> Enviar</button>
                    <button onClick={() => setRespondiendo(null)} className="px-3 py-1.5 bg-gray-300 rounded text-sm hover:bg-gray-400">Cancelar</button>
                  </div>
                </div>
              ) : null}

              {/* Botones de acción - SIEMPRE visibles */}
              <div className="flex gap-2 flex-wrap">
                {s.estado !== 'pendiente' && (
                  <button onClick={() => handleEstado(s.id, 'pendiente')} className="px-3 py-1.5 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">Pendiente</button>
                )}
                {s.estado !== 'en_revision' && (
                  <button onClick={() => handleEstado(s.id, 'en_revision')} className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">En Revisión</button>
                )}
                {s.estado !== 'aprobada' && (
                  <button onClick={() => setRespondiendo(s.id)} className="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600">Responder</button>
                )}
                {s.estado !== 'rechazada' && (
                  <button onClick={() => handleEstado(s.id, 'rechazada')} className="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600">Rechazar</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminSolicitudes;