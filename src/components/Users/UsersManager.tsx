import React, { useState } from 'react';
import { User, Shield } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { createUser } from '../../firebase';

const UsersManager: React.FC = () => {
  const { users, activeUser, setActiveUser, refreshData } = useAppContext();
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'auditor' | 'lector'>('auditor');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return alert('Completá todos los campos');
    setSaving(true);
    try {
      const saved = await createUser({ name: newName, email: newEmail, role: newRole });
      setNewName(''); setNewEmail('');
      await refreshData();
      setActiveUser(saved as any);
      localStorage.setItem('activeUserId', saved.id);
      alert(`Usuario ${saved.name} creado y activado`);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSwitch = (u: any) => {
    setActiveUser(u);
    localStorage.setItem('activeUserId', u.id);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-sm border-b pb-2 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" /> Directorio del Personal
          </h3>
          {users.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No hay usuarios registrados</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {users.map(u => (
                <div key={u.id} onClick={() => handleSwitch(u)}
                  className={`p-4 rounded-lg border cursor-pointer ${activeUser?.id === u.id ? 'border-blue-600 bg-blue-50/20' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.role === 'auditor' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900">{u.name}</h4>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${u.role === 'auditor' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                      {u.role === 'auditor' ? 'Auditor' : 'Lector'}
                    </span>
                    {activeUser?.id === u.id && <span className="text-[8px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">ACTIVO</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase text-slate-500 border-b pb-1">Nuevo Usuario</h3>
          <form onSubmit={handleCreate} className="space-y-3 text-xs">
            <div><label className="font-bold text-slate-400">Nombre completo</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Ing. Mateo Rossi" className="w-full rounded border border-slate-200 mt-1 h-9 p-2 bg-white" required />
            </div>
            <div><label className="font-bold text-slate-400">Email</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="mateo@planta.com" className="w-full rounded border border-slate-200 mt-1 h-9 p-2 bg-white" required />
            </div>
            <div><label className="font-bold text-slate-400">Rol</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)} className="w-full rounded border border-slate-200 h-9 mt-1 p-1 bg-white font-bold">
                <option value="auditor">Auditor (carga y firma)</option>
                <option value="lector">Lector (solo lectura)</option>
              </select>
            </div>
            <button type="submit" disabled={saving} className="w-full py-2 bg-blue-600 text-white font-bold rounded text-xs hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear Usuario'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UsersManager;