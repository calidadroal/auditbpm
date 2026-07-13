// src/components/Audit/AuditDetail.tsx
import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, User, FileSpreadsheet, AlertTriangle, CheckCircle, AlertCircle, HelpCircle, Edit3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getClasificacionColor } from '../../firebase';
import { getClasificacionLabel, getClasificacionBg, getScoreColor, generarConclusion } from '../../utils/auditUtils';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import type { AuditRecord, AuditHistorial } from '../../types';

interface AuditDetailProps {
  audit: AuditRecord;
  siteName: string;
  onClose: () => void;
  onDownloadPDF?: () => void;
  onEdit?: (audit: AuditRecord) => void;
}

type DetailTab = 'detalle' | 'historial';

const AuditDetail: React.FC<AuditDetailProps> = ({ audit, siteName, onClose, onDownloadPDF, onEdit }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DetailTab>('detalle');
  const [historial, setHistorial] = useState<AuditHistorial[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isOwner = user?.uid === audit.auditorId;
  const canEdit = isAdmin || isOwner;

  useEffect(() => {
    loadHistorial();
  }, [audit.id]);

  const loadHistorial = async () => {
    setLoadingHistorial(true);
    try {
      const histRef = collection(db, 'auditHistorial');
      const q = query(histRef, where('auditId', '==', audit.id), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditHistorial));
      setHistorial(data);
    } catch (error) {
      console.error('Error cargando historial:', error);
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const fecha = audit.completedAt?.seconds
    ? new Date(audit.completedAt.seconds * 1000)
    : audit.completedAt instanceof Date
      ? audit.completedAt
      : audit.createdAt?.seconds
        ? new Date(audit.createdAt.seconds * 1000)
        : new Date();

  const getRespuestaIcon = (valor: string) => {
    switch (valor) {
      case 'C': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'CP': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'NC': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'NA': return <HelpCircle className="w-4 h-4 text-gray-400" />;
      default: return null;
    }
  };

  const getRespuestaBg = (valor: string) => {
    switch (valor) {
      case 'C': return 'bg-green-50 border-green-200';
      case 'CP': return 'bg-yellow-50 border-yellow-200';
      case 'NC': return 'bg-red-50 border-red-200';
      case 'NA': return 'bg-gray-50 border-gray-200';
      default: return 'bg-white border-gray-200';
    }
  };

  const getRespuestaTexto = (valor: string) => {
    switch (valor) {
      case 'C': return 'CUMPLE';
      case 'CP': return 'CUMPLE PARCIAL';
      case 'NC': return 'NO CUMPLE';
      case 'NA': return 'NO APLICA';
      default: return valor;
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '—';
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleString('es-AR');
    if (timestamp instanceof Date) return timestamp.toLocaleString('es-AR');
    return String(timestamp);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-10 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full mx-4 my-4 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        <div className="bg-white border-b px-6 py-4 rounded-t-xl z-10 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Detalle de Auditoría</h2>
            <p className="text-sm text-gray-500 mt-1">{audit.questionnaireName} - {audit.norma}</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(audit)}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm font-medium flex items-center gap-1"
                title="Editar esta auditoría"
              >
                <Edit3 className="w-4 h-4" /> Editar
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('detalle')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'detalle'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            📋 Detalle
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'historial'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            📝 Historial
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {activeTab === 'detalle' ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600"><MapPin className="w-4 h-4" /><span>{siteName}</span></div>
                <div className="flex items-center gap-2 text-gray-600"><User className="w-4 h-4" /><span>{audit.auditorName || audit.auditorEmail}</span></div>
                <div className="flex items-center gap-2 text-gray-600"><Clock className="w-4 h-4" /><span>{fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></div>
                <div className="flex items-center gap-2 text-gray-600"><FileSpreadsheet className="w-4 h-4" /><span>{audit.durationMinutes || 0} min</span></div>
              </div>

              {audit.sectorName && <div className="text-sm text-gray-500">📍 Sector: <strong>{audit.sectorName}</strong></div>}
              {audit.establecimiento && (
                <div className="text-sm text-gray-500">🏫 Establecimiento: <strong>{audit.establecimiento}</strong></div>
              )}

              {audit.geolocalizacion && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700 font-medium">📍 Ubicación</p>
                  <p className="text-xs text-green-500 mt-1">
                    Lat: {audit.geolocalizacion.lat.toFixed(6)} | Lng: {audit.geolocalizacion.lng.toFixed(6)}
                    {audit.geolocalizacion.precision && <span className="ml-2">Precisión: ±{Math.round(audit.geolocalizacion.precision)}m</span>}
                  </p>
                  <a href={`https://www.google.com/maps?q=${audit.geolocalizacion.lat},${audit.geolocalizacion.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 underline mt-1 inline-block">
                    🗺️ Ver en Google Maps
                  </a>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-6 text-center border">
                <div className={`text-5xl font-black mb-2 ${getScoreColor(audit.score)}`}>{audit.score}%</div>
                <div className={`inline-block px-4 py-2 rounded-lg text-lg font-bold border mb-2 ${getClasificacionBg(audit.clasificacion)}`}>{getClasificacionColor(audit.clasificacion)}</div>
                <p className="text-sm text-gray-500">{getClasificacionLabel(audit.clasificacion)}</p>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center text-sm">
                <div className="bg-green-50 p-2 rounded-lg border border-green-200"><div className="font-bold text-green-700 text-lg">{audit.totalCumplen}</div><div className="text-xs text-green-600">Cumplen</div></div>
                <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200"><div className="font-bold text-yellow-700 text-lg">{audit.totalCumplenParcial}</div><div className="text-xs text-yellow-600">Parcial</div></div>
                <div className="bg-red-50 p-2 rounded-lg border border-red-200"><div className="font-bold text-red-700 text-lg">{audit.totalNoCumplen}</div><div className="text-xs text-red-600">No Cumplen</div></div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200"><div className="font-bold text-gray-600 text-lg">{audit.totalNoAplica}</div><div className="text-xs text-gray-500">No Aplica</div></div>
                <div className="bg-red-100 p-2 rounded-lg border border-red-300"><div className="font-bold text-red-800 text-lg">{audit.criticosNC}</div><div className="text-xs text-red-700">Críticos NC</div></div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">{generarConclusion(audit.score, audit.criticosNC, audit.clasificacion)}</p>
              </div>

              {audit.recurrenciaDetectada && audit.desviosSistematicos?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-bold text-red-800 text-sm mb-2">⚠️ Desvíos Sistemáticos Detectados</p>
                  {audit.desviosSistematicos.map((d: string, i: number) => (<p key={i} className="text-xs text-red-600 mt-1">{d}</p>))}
                </div>
              )}

              <div>
                <h3 className="font-bold text-lg mb-3">Preguntas ({audit.responses?.length || 0})</h3>
                <div className="space-y-3">
                  {audit.responses?.map((r, i) => (
                    <div key={r.questionId} className={`border rounded-lg p-4 ${getRespuestaBg(r.valor)}`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getRespuestaIcon(r.valor)}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="font-medium text-sm"><span className="text-gray-400 text-xs mr-1">#{i + 1}</span>{r.questionText}</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.valor === 'C' ? 'bg-green-100 text-green-700' : r.valor === 'CP' ? 'bg-yellow-100 text-yellow-700' : r.valor === 'NC' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{getRespuestaTexto(r.valor)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{r.norma} - {r.puntoNorma}</p>
                          {r.esCriticoInocuidad && <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">🚨 Crítico Inocuidad</span>}
                          {r.comentario && <div className="mt-2 bg-white bg-opacity-60 rounded p-2 text-sm italic text-gray-600">"{r.comentario}"</div>}
                          {r.photoURLs && r.photoURLs.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {r.photoURLs.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} alt={`Foto ${idx + 1}`} className="h-24 w-24 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer" />
                                </a>
                              ))}
                            </div>
                          )}
                          {r.responseTimeSeconds > 0 && <p className="text-xs text-gray-400 mt-1">⏱ {r.responseTimeSeconds}s en responder</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              {loadingHistorial ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-3">Cargando historial...</p>
                </div>
              ) : historial.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border">
                  <p className="text-gray-400 text-sm">Sin cambios registrados</p>
                  <p className="text-gray-300 text-xs mt-1">Las ediciones de esta auditoría aparecerán aquí</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historial.map((entry) => (
                    <div key={entry.id} className="bg-white border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            Modificado por: <span className="text-green-700">{entry.modificadoPorNombre}</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(entry.createdAt)}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {entry.cambios.length} cambio{entry.cambios.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {entry.cambios.map((cambio, idx) => (
                          <div key={idx} className="p-2 rounded text-xs bg-gray-50 border">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-700">
                                {cambio.campo === 'respuesta' ? '🔹 Valor' : cambio.campo === 'comentario' ? '💬 Comentario' : '📝 Observaciones'}
                                {cambio.preguntaTexto && <span className="text-gray-500 ml-1">- {cambio.preguntaTexto}</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="line-through text-red-400">{String(cambio.antes)}</span>
                              <span className="text-gray-400">→</span>
                              <span className="font-bold text-green-600">{String(cambio.despues)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border-t px-6 py-4 rounded-b-xl flex justify-end gap-3">
          {onDownloadPDF && (
            <button onClick={onDownloadPDF} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
              📄 Descargar PDF
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditDetail;