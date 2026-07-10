// src/components/Admin/EmpresaManager.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, updateDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Empresa } from '../../types';

const EmpresaManager: React.FC = () => {
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nombre: '', cuit: '', direccion: '', telefono: '', email: '',
    plan: 'basico' as Empresa['plan'],
    estadoPago: 'al_dia' as Empresa['estadoPago'],
  });

  const loadEmpresas = async () => {
    const snap = await getDocs(collection(db, 'empresas'));
    setEmpresas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Empresa)));
    setLoading(false);
  };

  useEffect(() => { if (user?.role === 'admin') loadEmpresas(); }, [user]);

  const resetForm = () => {
    setForm({ nombre: '', cuit: '', direccion: '', telefono: '', email: '', plan: 'basico', estadoPago: 'al_dia' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateDoc(doc(db, 'empresas', editingId), { ...form, updatedAt: serverTimestamp() });
    } else {
      const ref = doc(collection(db, 'empresas'));
      await setDoc(ref, { ...form, id: ref.id, usuariosAsignados: [], fechaUltimoCalculo: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    resetForm();
    loadEmpresas();
  };

  const startEdit = (emp: Empresa) => {
    setForm({ nombre: emp.nombre, cuit: emp.cuit, direccion: emp.direccion || '', telefono: emp.telefono || '', email: emp.email, plan: emp.plan, estadoPago: emp.estadoPago });
    setEditingId(emp.id);
    setShowForm(true);
  };

  if (user?.role !== 'admin') return <div className="p-6 text-red-600">Solo administradores</div>;
  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">Empresas</h2>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-4 py-2 bg-blue-500 text-white rounded">
          {showForm ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded mb-4 space-y-3">
          <input type="text" placeholder="Nombre" required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full p-2 border rounded" />
          <input type="text" placeholder="CUIT" required value={form.cuit} onChange={e => setForm({...form, cuit: e.target.value})} className="w-full p-2 border rounded" />
          <input type="email" placeholder="Email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-2 border rounded" />
          <select value={form.plan} onChange={e => setForm({...form, plan: e.target.value as any})} className="w-full p-2 border rounded">
            <option value="basico">Básico</option>
            <option value="empresa">Empresa</option>
            <option value="premium">Premium</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded">{editingId ? 'Actualizar' : 'Crear'}</button>
        </form>
      )}

      <table className="w-full">
        <thead><tr className="bg-gray-100"><th className="p-2 text-left">Nombre</th><th className="p-2 text-left">CUIT</th><th className="p-2 text-left">Plan</th><th className="p-2 text-left">Estado</th><th></th></tr></thead>
        <tbody>
          {empresas.map(emp => (
            <tr key={emp.id} className="border-t">
              <td className="p-2">{emp.nombre}</td>
              <td className="p-2">{emp.cuit}</td>
              <td className="p-2 capitalize">{emp.plan}</td>
              <td className="p-2 capitalize">{emp.estadoPago.replace('_', ' ')}</td>
              <td className="p-2"><button onClick={() => startEdit(emp)} className="text-blue-600 text-sm">Editar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmpresaManager;