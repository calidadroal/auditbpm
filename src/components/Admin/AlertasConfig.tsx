// src/components/Admin/AlertasConfig.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAlertasConfig, createAlertaConfig, deleteAlertaConfig } from '../../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import type { AlertaConfig } from '../../types';
import { Bell, Plus, Trash2, Clock, FileCheck, AlertTriangle, BarChart3 } from 'lucide-react';

const TIPOS_ALERTA = [
  { value: 'vencimiento_requisito' as const, label: 'Vencimiento de Requisitos', icon: FileCheck, color: 'text-blue-600' },
  { value: 'vencimiento_cuestionario' as const, label: 'Vencimiento de Cuestionarios', icon: Clock, color: 'text-orange-600' },
  { value: 'score_bajo' as const, label: 'Score Bajo', icon: BarChart3, color: 'text-red-600' },
];

const DIAS_PREDEFINIDOS = [30, 15, 7, 1];

const AlertasConfig: React.FC = () => {
  const { user } = useAuth();
  const [alertas, setAlertas] = useState<AlertaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<AlertaConfig['tipo']>('vencimiento_requisito');
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([30, 7]);
  const [emails, setEmails] = useState('');
  const [mensaje, setMensaje] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) loadAlertas();
  }, [isAdmin]);

  const loadAlertas = async () => {
    try {
      setLoading(true);
      const data = await getAlertasConfig();
      setAlertas(data);
    } catch (error) {
      console.error('Error cargando alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNombre('');
    setTipo('vencimiento_requisito');
    setDiasSeleccionados([30, 7]);
    setEmails('');
    setMensaje('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (alerta: AlertaConfig) => {
    setEditingId(alerta.id);
    setNombre(alerta.nombre);
    setTipo(alerta.tipo);
    setDiasSeleccionados(alerta.diasAntes || []);
    setEmails((alerta.emailsDestino || []).join(', '));
    setMensaje(alerta.mensajePersonalizado || '');
    setShowForm(true);
  };

  const toggleDia = (dia: number) => {
    setDiasSeleccionados(prev =>
      prev.includes(dia)
        ? prev.filter(d => d !== dia)
        : [...prev, dia].sort((a, b) => b - a)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { alert('El nombre es requerido'); return; }
    if (diasSeleccionados.length === 0) { alert('Seleccione al menos un día de anticipación'); return; }

    try {
      const data = {
        nombre: nombre.trim(),
        tipo,
        diasAntes: diasSeleccionados,
        activo: true,
        emailsDestino: emails.split(',').map(e => e.trim()).filter(Boolean),
        mensajePersonalizado: mensaje.trim() || undefined,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'alertaConfigs', editingId), data);
      } else {
        await createAlertaConfig(data as any);
      }

      await loadAlertas();
      resetForm();
    } catch (error) {
      console.error('Error guardando alerta:', error);
      alert('Error al guardar la alerta');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Desactivar esta alerta?')) return;
    try {
      await deleteAlertaConfig(id);
      await loadAlertas();
    } catch (error) {
      console.error('Error eliminando alerta:', error);
    }
  };

  const getDiasLabel = (dias: number[]) => {
    return (dias || []).sort((a, b) => b - a).map(d => `${d} días`).join(', ');
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Solo administradores pueden configurar alertas</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Configuración de Alertas
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configurá alertas escalonadas para vencimientos y scores
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1 text-sm"
        >
          <Plus className="w-4 h-4" /> Nueva Alerta
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Editar Alerta' : 'Nueva Alerta'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Alerta de habilitación municipal"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de alerta *</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as AlertaConfig['tipo'])}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {TIPOS_ALERTA.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                ¿Con cuántos días de anticipación?
              </label>
              <div className="flex flex-wrap gap-2">
                {DIAS_PREDEFINIDOS.map(dia => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => toggleDia(dia)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      diasSeleccionados.includes(dia)
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {dia} día{dia !== 1 ? 's' : ''} antes
                  </button>
                ))}
              </div>
              {diasSeleccionados.length > 0 && (
                <p className="text-xs text-blue-600 mt-2">
                  📅 Se enviarán alertas: {getDiasLabel(diasSeleccionados)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Emails destino (separados por coma)
              </label>
              <input
                type="text"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="responsable@empresa.com, supervisor@empresa.com"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Dejar vacío si solo querés notificaciones en la app
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Mensaje personalizado (opcional)
              </label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Texto adicional que aparecerá en la notificación..."
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                rows={3}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">📋 Vista previa</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <p>
                  <strong>Tipo:</strong>{' '}
                  {TIPOS_ALERTA.find(t => t.value === tipo)?.label}
                </p>
                <p>
                  <strong>Días de anticipación:</strong>{' '}
                  {diasSeleccionados.length > 0 ? getDiasLabel(diasSeleccionados) : 'Ninguno seleccionado'}
                </p>
                {emails.trim() && (
                  <p>
                    <strong>Emails:</strong>{' '}
                    {emails.split(',').map(e => e.trim()).filter(Boolean).join(', ')}
                  </p>
                )}
                <p>
                  <strong>Canales:</strong>{' '}
                  {emails.trim() ? '📧 Email + 🔔 App' : '🔔 Solo en la app'}
                </p>
              </div>
            </div>

            <div className="flex space-x-4 pt-4 border-t">
              <button
                type="submit"
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                {editingId ? 'Guardar Cambios' : 'Crear Alerta'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        {alertas.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay alertas configuradas</p>
            <p className="text-sm text-gray-400 mt-1">
              Creá alertas para recibir notificaciones de vencimientos y scores bajos
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {alertas.map(alerta => {
              const TipoIcon = TIPOS_ALERTA.find(t => t.value === alerta.tipo)?.icon || Bell;
              const tipoLabel = TIPOS_ALERTA.find(t => t.value === alerta.tipo)?.label || alerta.tipo;
              const tipoColor = TIPOS_ALERTA.find(t => t.value === alerta.tipo)?.color || 'text-gray-600';
              const dias = alerta.diasAntes || [];

              return (
                <div key={alerta.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${tipoColor}`}>
                        <TipoIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{alerta.nombre}</h3>
                        <p className="text-sm text-gray-500">{tipoLabel}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {dias.sort((a, b) => b - a).map(dia => (
                            <span
                              key={dia}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                            >
                              ⏰ {dia} día{dia !== 1 ? 's' : ''} antes
                            </span>
                          ))}
                        </div>
                        {(alerta.emailsDestino || []).length > 0 && (
                          <p className="text-xs text-gray-400 mt-2">
                            📧 {(alerta.emailsDestino || []).join(', ')}
                          </p>
                        )}
                        {alerta.mensajePersonalizado && (
                          <p className="text-xs text-gray-400 mt-1 italic">
                            "{alerta.mensajePersonalizado}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(alerta)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(alerta.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertasConfig;