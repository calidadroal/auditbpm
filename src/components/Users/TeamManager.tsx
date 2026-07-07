// src/components/Users/TeamManager.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { getUsersBySites, assignSitesToUser, updateUserRole } from '../../firebase';
import type { User } from '../../types';
import { Users, CheckCircle, XCircle } from 'lucide-react';

const ROLES_PERMITIDOS_GESTOR = [
  { value: 'lector', label: 'Lector' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'operador', label: 'Operador' },
  { value: 'coordinador', label: 'Coordinador' },
];

const TeamManager: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { sites } = useAppContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAssignSites, setShowAssignSites] = useState(false);
  const [assignedSites, setAssignedSites] = useState<string[]>([]);

  // ✅ Verificar permisos SOLO al inicio
  if (currentUser?.role !== 'gestor' && currentUser?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">⚠️ Acceso restringido</p>
          <p className="text-sm text-red-500 mt-1">
            Solo gestores y administradores pueden gestionar equipos.
          </p>
          <p className="text-xs text-red-400 mt-2">
            Tu rol actual es: <strong>{currentUser?.role || 'sin rol'}</strong>
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadTeamUsers();
  }, [currentUser]);

  const loadTeamUsers = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const gestorSites = currentUser.assignedSites || [];
      if (gestorSites.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      
      const allUsers = await getUsersBySites(gestorSites);
      const teamUsers = allUsers.filter(u => u.uid !== currentUser.uid);
      setUsers(teamUsers);
    } catch (error) {
      console.error('Error cargando equipo:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      auditor: 'bg-blue-100 text-blue-800',
      gestor: 'bg-purple-100 text-purple-800',
      lector: 'bg-green-100 text-green-800',
      operador: 'bg-yellow-100 text-yellow-800',
      coordinador: 'bg-indigo-100 text-indigo-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setAssignedSites(user.assignedSites || []);
    setShowAssignSites(true);
  };

  const handleSaveSitesAssignment = async () => {
    if (!selectedUser) return;
    try {
      await assignSitesToUser(selectedUser.uid, assignedSites);
      alert('✅ Sitios asignados correctamente');
      setShowAssignSites(false);
      setSelectedUser(null);
      await loadTeamUsers();
    } catch (error) {
      console.error('Error asignando sitios:', error);
      alert('❌ Error al asignar sitios');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const rolValido = ROLES_PERMITIDOS_GESTOR.some(r => r.value === newRole);
    if (!rolValido) {
      alert('❌ No tenés permiso para asignar este rol');
      return;
    }
    
    if (!window.confirm(`¿Cambiar rol a ${newRole}?`)) return;
    try {
      await updateUserRole(userId, newRole as any);
      alert('✅ Rol actualizado');
      await loadTeamUsers();
    } catch (error) {
      console.error('Error actualizando rol:', error);
      alert('❌ Error al actualizar el rol');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">👥 Mi Equipo</h2>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} usuarios en tus sitios
          </p>
        </div>
        <button 
          onClick={loadTeamUsers} 
          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors"
        >
          🔄 Actualizar
        </button>
      </div>

      {currentUser?.assignedSites?.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-700 text-sm">
            ⚠️ No tenés sitios asignados. Contactá al administrador para que te asigne sitios.
          </p>
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Todavía no hay usuarios asignados a tus sitios.</p>
          <p className="text-sm mt-1">
            Los usuarios se asignan a sitios desde la gestión de usuarios (solo administradores).
          </p>
          <p className="text-xs text-gray-300 mt-2">
            O asigná sitios a tus usuarios desde el botón "Asignar" en este panel.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sitios</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-sm">{user.displayName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role} 
                        onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                        className="text-xs border rounded px-2 py-1 bg-white"
                      >
                        {ROLES_PERMITIDOS_GESTOR.map(rol => (
                          <option key={rol.value} value={rol.value}>{rol.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.assignedSites?.length || 0} sitios</td>
                    <td className="px-6 py-4">
                      {user.active !== false ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="w-3 h-3" /> Activo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <XCircle className="w-3 h-3" /> Desactivado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleSelectUser(user)} 
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Asignar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAssignSites && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Asignar Sitios a {selectedUser.displayName}</h3>
              <button onClick={() => { setShowAssignSites(false); setSelectedUser(null); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
              {sites.map(site => (
                <label key={site.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border hover:bg-gray-100 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={assignedSites.includes(site.id)} 
                    onChange={(e) => { 
                      if (e.target.checked) {
                        setAssignedSites([...assignedSites, site.id]);
                      } else {
                        setAssignedSites(assignedSites.filter(id => id !== site.id));
                      }
                    }} 
                    className="form-checkbox h-4 w-4"
                  />
                  <span className="text-sm">{site.name}</span>
                </label>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setAssignedSites(sites.map(s => s.id))} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">
                Todos
              </button>
              <button onClick={() => setAssignedSites([])} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">
                Ninguno
              </button>
              <button onClick={handleSaveSitesAssignment} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 ml-auto">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManager;