// src/components/Admin/RequisitosManager.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getAllRequisitos, createRequisito, updateRequisito, deleteRequisito } from '../../firebase';
import { FileCheck, Plus, Edit3, Trash2, X } from 'lucide-react';
import type { Requisito, CategoriaRequisito } from '../../types';

const CATEGORIAS: { value: CategoriaRequisito; label: string; color: string }[] = [
  { value: 'municipal', label: '🏛️ Municipal', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'nacional', label: '🇦🇷 Nacional', color: 'bg-blue-100 text-blue-800' },
  { value: 'seguros', label: '🛡️ Seguros', color: 'bg-green-100 text-green-800' },
  { value: 'sanidad', label: '🧪 Sanidad', color: 'bg-purple-100 text-purple-800' },
  { value: 'bomberos', label: '🚒 Bomberos', color: 'bg-red-100 text-red-800' },
  { value: 'otro', label: '📋 Otro', color: 'bg-gray-100 text-gray-800' },
];

const RequisitosManager: React.FC = () => {
  const { isAdmin } = useAppContext();
  const [requisitos, setRequisitos] = useState<Requisito[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<CategoriaRequisito>('municipal');
  const [descripcion, setDescripcion] = useState('');
  const [pideNumero, setPideNumero] = useState(true);
  const [pideFechaVencimiento, setPideFechaVencimiento] = useState(true);

  useEffect(() => { loadRequisitos(); }, []);

  const loadRequisitos = async () => {
    try {
      setLoading(true);
      const data = await getAllRequisitos();
      setRequisitos(data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setNombre('');
    setCategoria('municipal');
    setDescripcion('');
    setPideNumero(true);
    setPideFechaVencimiento(true);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (req: Requisito) => {
    setNombre(req.nombre);
    setCategoria(req.categoria);
    setDescripcion(req.descripcion || '');
    setPideNumero(req.pideNumero);
    setPideFechaVencimiento(req.pideFechaVencimiento);
    setEditingId(req.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { alert('El nombre es obligatorio'); return; }
    if (!pideNumero && !pideFechaVencimiento) {
      if (!window.confirm('¿Este requisito no pide número ni fecha? Se guardará solo como checklist.')) return;
    }

    setSaving(true);
    try {
      const data = {
        nombre: nombre.trim(),
        categoria,
        descripcion: descripcion.trim() || '',
        pideNumero,
        pideFechaVencimiento,
        active: true
      };

      if (editingId) {
        await updateRequisito(editingId, data);
      } else {
        await createRequisito(data as any);
      }
      await loadRequisitos();
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (req: Requisito) => {
    if (!window.confirm(`¿Desactivar "${req.nombre}"? Ya no aparecerá para nuevos sitios.`)) return;
    try {
      await deleteRequisito(req.id);
      await loadRequisitos();
    } catch (error) { console.error('Error:', error); }
  };

  const getCategoriaInfo = (cat: CategoriaRequisito) => {
    return CATEGORIAS.find(c => c.value === cat) || CATEGORIAS[5];
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Solo administradores pueden gestionar requisitos</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-blue-600" />
          Biblioteca de Requisitos
        </h2>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Nuevo Requisito'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Editar Requisito' : 'Nuevo Requisito'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ej: Habilitación de Establecimiento"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaRequisito)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {CATEGORIAS.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Detalle adicional (opcional)"
                />
              </div>
            </div>

            <div className="flex gap-6 p-4 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pideNumero}
                  onChange={(e) => setPideNumero(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium">Pide N° de registro</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pideFechaVencimiento}
                  onChange={(e) => setPideFechaVencimiento(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium">Pide fecha de vencimiento</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Requisito'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requisito</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {requisitos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No hay requisitos configurados. Creá el primero.
                  </td>
                </tr>
              ) : (
                requisitos.map(req => {
                  const catInfo = getCategoriaInfo(req.categoria);
                  const campos: string[] = [];
                  if (req.pideNumero) campos.push('N°');
                  if (req.pideFechaVencimiento) campos.push('Fecha');
                  if (campos.length === 0) campos.push('Checklist');

                  return (
                    <tr key={req.id} className={`hover:bg-gray-50 ${!req.active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{req.nombre}</p>
                        {req.descripcion && (
                          <p className="text-xs text-gray-500">{req.descripcion}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {campos.map(campo => (
                            <span key={campo} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {campo}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          req.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {req.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(req)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {req.active && (
                            <button
                              onClick={() => handleDelete(req)}
                              className="text-red-500 hover:text-red-700"
                              title="Desactivar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
    </div>
  );
};

export default RequisitosManager;