// src/components/Users/UsersManager.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  getAllUsers,
  createUserInFirestore,
  updateUserRole,
  assignSitesToUser,
  assignQuestionnairesToUser,
  registerUser,
} from '../../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { getPermisosEfectivos, getOrigenPermisos, overridesVencidos } from '../../utils/permissionChecker';
import {
  ROLES_PERMISOS,
  PERMISOS_LABELS,
  type User,
  type UserRole,
  type PermisoNombre,
  type PermisoHistorial,
  type CambioPermiso,
} from '../../types';

type PermissionsModalTab = 'permisos' | 'historial';

const UsersManager: React.FC = () => {
  const { sites, questionnaires, isAdmin } = useAppContext();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignedSites, setAssignedSites] = useState<string[]>([]);
  const [assignedQuestionnaires, setAssignedQuestionnaires] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'sitios' | 'cuestionarios'>('sitios');

  // Estados para el modal de permisos
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState<User | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<Record<string, boolean>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionsModalTab, setPermissionsModalTab] = useState<PermissionsModalTab>('permisos');

  // Estados para el historial
  const [historial, setHistorial] = useState<PermisoHistorial[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // NUEVO: Estado para fecha de vencimiento
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('');

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('lector');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newDisplayName) { alert('Complete todos los campos'); return; }
    if (newPassword.length < 6) { alert('La contraseña debe tener al menos 6 caracteres'); return; }
    try {
      const firebaseUser = await registerUser(newEmail, newPassword);
      await createUserInFirestore(firebaseUser.uid, newEmail, newRole, newDisplayName);
      alert('Usuario creado exitosamente');
      setShowCreateForm(false);
      setNewEmail(''); setNewPassword(''); setNewDisplayName(''); setNewRole('lector');
      await loadUsers();
    } catch (error: any) {
      console.error('Error creando usuario:', error);
      if (error.code === 'auth/email-already-in-use') { alert('El email ya está en uso'); }
      else { alert('Error al crear el usuario: ' + (error.message || '')); }
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!window.confirm(`¿Cambiar rol a ${newRole}?`)) return;
    try { await updateUserRole(userId, newRole); await loadUsers(); alert('Rol actualizado'); }
    catch (error) { console.error('Error actualizando rol:', error); alert('Error al actualizar el rol'); }
  };

  const handleDeactivateUser = async (user: User) => {
    if (user.uid === currentUser?.uid) { alert('No podés desactivar tu propio usuario'); return; }
    if (!window.confirm(`¿Desactivar a "${user.displayName}"? No podrá iniciar sesión.`)) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { active: false });
      alert('Usuario desactivado'); await loadUsers();
    } catch (error: any) { console.error('Error desactivando usuario:', error); alert('Error al desactivar usuario'); }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setAssignedSites(user.assignedSites || []);
    setAssignedQuestionnaires((user as any).assignedQuestionnaires || []);
    setActiveTab('sitios');
  };

  const handleSaveSitesAssignment = async () => {
    if (!selectedUser) return;
    try { await assignSitesToUser(selectedUser.uid, assignedSites); alert('Sitios asignados correctamente'); await loadUsers(); }
    catch (error) { console.error('Error asignando sitios:', error); alert('Error al asignar sitios'); }
  };

  const handleSaveQuestionnairesAssignment = async () => {
    if (!selectedUser) return;
    try { await assignQuestionnairesToUser(selectedUser.uid, assignedQuestionnaires); alert('Cuestionarios asignados correctamente'); await loadUsers(); }
    catch (error) { console.error('Error asignando cuestionarios:', error); alert('Error al asignar cuestionarios'); }
  };

  // ============================================================
  // CARGA DE HISTORIAL
  // ============================================================
  const loadHistorial = async (userId: string) => {
    setLoadingHistorial(true);
    try {
      const histRef = collection(db, 'permisosHistorial');
      const q = query(histRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PermisoHistorial));
      setHistorial(data);
    } catch (error) {
      console.error('Error cargando historial:', error);
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  // ============================================================
  // GUARDADO DE HISTORIAL
  // ============================================================
  const saveHistorial = async (
    userId: string,
    userName: string,
    userRole: string,
    cambios: CambioPermiso[]
  ) => {
    if (cambios.length === 0) return;

    const historialEntry: Omit<PermisoHistorial, 'id'> = {
      userId,
      userName,
      userRole,
      modificadoPorUid: currentUser?.uid || '',
      modificadoPorNombre: currentUser?.displayName || '',
      cambios,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'permisosHistorial'), historialEntry);
  };

  // ============================================================
  // MANEJO DEL MODAL DE PERMISOS
  // ============================================================
  const handleOpenPermissions = (user: User) => {
    setPermissionsUser(user);
    const efectivos = getPermisosEfectivos(user);
    setEditedPermissions(efectivos as Record<string, boolean>);
    
    // Cargar fecha de vencimiento existente
    setFechaVencimiento(user.fechaVencimientoOverrides || '');
    
    setPermissionsModalTab('permisos');
    setShowPermissionsModal(true);
    loadHistorial(user.uid);
  };

  const handleTogglePermission = (permiso: string) => {
    if (permissionsUser?.role === 'admin') return;
    setEditedPermissions(prev => ({
      ...prev,
      [permiso]: !prev[permiso]
    }));
  };

  const handleResetPermissions = () => {
    if (!permissionsUser) return;
    if (!window.confirm('¿Restaurar todos los permisos a los valores por defecto del rol?')) return;
    const basePermissions = ROLES_PERMISOS[permissionsUser.role];
    setEditedPermissions({ ...basePermissions } as Record<string, boolean>);
    setFechaVencimiento('');
  };

  const handleSavePermissions = async () => {
    if (!permissionsUser || !currentUser) return;

    if (permissionsUser.uid === currentUser.uid && permissionsUser.role === 'admin') {
      alert('No podés modificar tus propios permisos de admin');
      return;
    }

    setSavingPermissions(true);
    try {
      const basePermissions = ROLES_PERMISOS[permissionsUser.role];
      const overrides: Record<string, boolean> = {};

      // Detectar cambios para el historial
      const cambios: CambioPermiso[] = [];
      const permisosEfectivosAntes = getPermisosEfectivos(permissionsUser);

      (Object.keys(basePermissions) as PermisoNombre[]).forEach((permiso) => {
        if (editedPermissions[permiso] !== basePermissions[permiso]) {
          overrides[permiso] = editedPermissions[permiso];
        }

        const antes = permisosEfectivosAntes[permiso] ?? false;
        const despues = editedPermissions[permiso] ?? false;
        if (antes !== despues) {
          cambios.push({
            permiso,
            label: PERMISOS_LABELS[permiso] || permiso,
            antes,
            despues,
          });
        }
      });

      const tieneOverrides = Object.keys(overrides).length > 0;

      // Guardar en Firestore
      const userRef = doc(db, 'users', permissionsUser.uid);
      const updateData: Record<string, any> = {
        permisosOverride: overrides,
        overrideActivo: tieneOverrides,
        permisosActualizadosPor: currentUser.uid,
        permisosActualizadosEn: new Date(),
        updatedAt: new Date(),
        fechaVencimientoOverrides: fechaVencimiento || null,
      };

      await updateDoc(userRef, updateData);

      // Guardar historial
      await saveHistorial(
        permissionsUser.uid,
        permissionsUser.displayName,
        permissionsUser.role,
        cambios
      );

      alert('Permisos actualizados correctamente');
      setShowPermissionsModal(false);
      setPermissionsUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Error guardando permisos:', error);
      alert('Error al guardar permisos: ' + (error.message || ''));
    } finally {
      setSavingPermissions(false);
    }
  };

  // ============================================================
  // HELPERS DE UI
  // ============================================================
  const getRoleBadgeColor = (role: UserRole): string => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'auditor': return 'bg-blue-100 text-blue-800';
      case 'gestor': return 'bg-purple-100 text-purple-800';
      case 'lector': return 'bg-green-100 text-green-800';
      case 'operador': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '—';
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString('es-AR');
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString('es-AR');
    }
    return String(timestamp);
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Solo administradores pueden gestionar usuarios</p>
        </div>
      </div>
    );
  }

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
        <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          {showCreateForm ? 'Cancelar' : '+ Nuevo Usuario'}
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Nuevo Usuario</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input type="text" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contraseña *</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required minLength={6} />
                <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rol *</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="lector">Lector</option>
                  <option value="gestor">Gestor</option>
                  <option value="auditor">Auditor</option>
                  <option value="operador">Operador</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button type="submit" className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Crear Usuario</button>
          </form>
        </div>
      )}

      {selectedUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Asignar a: {selectedUser.displayName}</h3>
            <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-gray-700">✕ Cerrar</button>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab('sitios')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'sitios' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border'}`}>Sitios</button>
            <button onClick={() => setActiveTab('cuestionarios')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'cuestionarios' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border'}`}>Cuestionarios</button>
          </div>

          {activeTab === 'sitios' && (
            <>
              <p className="text-sm text-gray-600 mb-4">Seleccione los sitios que este usuario puede ver</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {sites.map(site => (
                  <label key={site.id} className="flex items-center space-x-2 p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={assignedSites.includes(site.id)} onChange={(e) => { if (e.target.checked) setAssignedSites([...assignedSites, site.id]); else setAssignedSites(assignedSites.filter(id => id !== site.id)); }} className="form-checkbox h-4 w-4" />
                    <span className="text-sm">{site.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex space-x-4">
                <button onClick={handleSaveSitesAssignment} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Guardar Sitios</button>
                <button onClick={() => setAssignedSites(sites.map(s => s.id))} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Todos</button>
                <button onClick={() => setAssignedSites([])} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Ninguno</button>
              </div>
            </>
          )}

          {activeTab === 'cuestionarios' && (
            <>
              <p className="text-sm text-gray-600 mb-4">Seleccione los cuestionarios que este usuario puede usar</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 max-h-64 overflow-y-auto">
                {questionnaires.filter(q => q.active).map(q => (
                  <label key={q.id} className="flex items-center space-x-2 p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={assignedQuestionnaires.includes(q.id)} onChange={(e) => { if (e.target.checked) setAssignedQuestionnaires([...assignedQuestionnaires, q.id]); else setAssignedQuestionnaires(assignedQuestionnaires.filter(id => id !== q.id)); }} className="form-checkbox h-4 w-4" />
                    <div>
                      <span className="text-sm">{q.name}</span>
                      <span className="text-xs text-gray-500 block">{q.tipo === 'checklist' ? '🏛️ Municipal' : q.sectorizado ? '🏢 Sectorizado' : '📋 Simple'}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex space-x-4">
                <button onClick={handleSaveQuestionnairesAssignment} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Guardar Cuestionarios</button>
                <button onClick={() => setAssignedQuestionnaires(questionnaires.filter(q => q.active).map(q => q.id))} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Todos</button>
                <button onClick={() => setAssignedQuestionnaires([])} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Ninguno</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TABLA DE USUARIOS */}
      {/* ============================================================ */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sitios</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cuest.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permisos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(user => {
                const origen = getOrigenPermisos(user);
                const tieneOverrides = Object.values(origen).some(o => o === 'override');
                const vencidos = overridesVencidos(user);

                return (
                  <tr key={user.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">
                      {user.displayName}
                      {user.uid === currentUser?.uid && (
                        <span className="ml-2 text-xs text-gray-400">(vos)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getRoleBadgeColor(user.role)}`}>{user.role}</span>
                    </td>
                    <td className="px-6 py-4"><span className="text-sm">{user.assignedSites?.length || 0}</span></td>
                    <td className="px-6 py-4"><span className="text-sm">{(user as any).assignedQuestionnaires?.length || 0}</span></td>
                    <td className="px-6 py-4">
                      {tieneOverrides && vencidos ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          Vencido
                        </span>
                      ) : tieneOverrides ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          Personalizado
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                          Por rol
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <button onClick={() => handleSelectUser(user)} className="text-blue-600 hover:text-blue-800 text-xs">Asignar</button>
                        <select value={user.role} onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)} className="text-xs border rounded px-2 py-1">
                          <option value="lector">Lector</option>
                          <option value="gestor">Gestor</option>
                          <option value="auditor">Auditor</option>
                          <option value="operador">Operador</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleOpenPermissions(user)}
                          className="text-purple-600 hover:text-purple-800 text-xs"
                          title="Editar permisos"
                        >
                          🔒
                        </button>
                        <button onClick={() => handleDeactivateUser(user)} className="text-red-500 hover:text-red-700 text-xs" title="Desactivar usuario">✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No hay usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL DE EDICIÓN DE PERMISOS + HISTORIAL */}
      {/* ============================================================ */}
      {showPermissionsModal && permissionsUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header del modal */}
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  Editar permisos
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Usuario: <span className="font-medium text-gray-700">{permissionsUser.displayName}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getRoleBadgeColor(permissionsUser.role)}`}>
                    {permissionsUser.role}
                  </span>
                </p>
              </div>
              <button
                onClick={() => { setShowPermissionsModal(false); setPermissionsUser(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Tabs del modal */}
            <div className="flex border-b">
              <button
                onClick={() => setPermissionsModalTab('permisos')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  permissionsModalTab === 'permisos'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                🔒 Permisos
              </button>
              <button
                onClick={() => setPermissionsModalTab('historial')}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  permissionsModalTab === 'historial'
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                📋 Historial
              </button>
            </div>

            {/* Cuerpo del modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {permissionsModalTab === 'permisos' ? (
                /* ========== TAB PERMISOS ========== */
                permissionsUser.role === 'admin' ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-yellow-700 text-sm">
                      ⚠️ <strong>Admin</strong> tiene todos los permisos por defecto y no se pueden restringir.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-blue-700 text-sm">
                        💡 <strong>Tildá</strong> para activar un permiso, <strong>destildá</strong> para desactivarlo.<br />
                        Los permisos modificados se guardan como <strong>excepción</strong> al rol base.
                      </p>
                    </div>

                    <div className="space-y-1">
                      {Object.keys(ROLES_PERMISOS[permissionsUser.role] || {}).map((permiso) => {
                        const valorActual = editedPermissions[permiso] ?? false;
                        const valorBase = ROLES_PERMISOS[permissionsUser.role]?.[permiso as PermisoNombre] ?? false;
                        const esModificado = valorActual !== valorBase;

                        return (
                          <label
                            key={permiso}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              esModificado
                                ? 'bg-purple-50 border-purple-300 hover:bg-purple-100'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={valorActual}
                                onChange={() => handleTogglePermission(permiso)}
                                className="form-checkbox h-5 w-5 text-purple-600 rounded"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-800">
                                  {PERMISOS_LABELS[permiso as PermisoNombre] || permiso}
                                </span>
                                {esModificado && (
                                  <span className="ml-2 text-xs text-purple-600 font-medium">
                                    {valorActual ? '(Agregado)' : '(Quitado)'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {esModificado ? (
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                  Custom
                                </span>
                              ) : (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                  Rol
                                </span>
                              )}
                              <span className={`text-lg ${valorActual ? 'text-green-500' : 'text-red-400'}`}>
                                {valorActual ? '✅' : '❌'}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* ============================================================ */}
                    {/* SECCIÓN DE VENCIMIENTO DE OVERRIDES */}
                    {/* ============================================================ */}
                    <div className="mt-6 border-t pt-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <span className="text-lg">⏰</span>
                          <div>
                            <h4 className="text-sm font-semibold text-amber-800">Vencimiento de permisos personalizados</h4>
                            <p className="text-xs text-amber-600 mt-0.5">
                              Si configurás una fecha, los permisos personalizados se desactivarán automáticamente al llegar ese día y el usuario volverá a los permisos base de su rol.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="date"
                            value={fechaVencimiento}
                            onChange={(e) => setFechaVencimiento(e.target.value)}
                            className="px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                            min={new Date().toISOString().split('T')[0]}
                          />
                          {fechaVencimiento && (
                            <button
                              onClick={() => setFechaVencimiento('')}
                              className="text-xs text-amber-600 hover:text-amber-800 underline"
                            >
                              Sin vencimiento
                            </button>
                          )}
                        </div>
                        {fechaVencimiento && (
                          <p className="text-xs text-amber-700 mt-2">
                            📅 Los permisos personalizados vencerán el <strong>{new Date(fechaVencimiento + 'T23:59:59').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )
              ) : (
                /* ========== TAB HISTORIAL ========== */
                <div>
                  {loadingHistorial ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-3">Cargando historial...</p>
                    </div>
                  ) : historial.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border">
                      <p className="text-gray-400 text-sm">Sin cambios registrados</p>
                      <p className="text-gray-300 text-xs mt-1">Los cambios de permisos aparecerán aquí</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {historial.map((entry) => (
                        <div key={entry.id} className="bg-white border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                Modificado por: <span className="text-purple-700">{entry.modificadoPorNombre}</span>
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {formatDate(entry.createdAt)}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                              {entry.cambios.length} cambio{entry.cambios.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {entry.cambios.map((cambio, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-2 rounded text-xs ${
                                  cambio.despues
                                    ? 'bg-green-50 border border-green-200'
                                    : 'bg-red-50 border border-red-200'
                                }`}
                              >
                                <span className="font-medium text-gray-700">{cambio.label}</span>
                                <div className="flex items-center gap-1">
                                  <span className={cambio.antes ? 'text-green-600' : 'text-red-400'}>
                                    {cambio.antes ? '✅' : '❌'}
                                  </span>
                                  <span className="text-gray-400">→</span>
                                  <span className={cambio.despues ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>
                                    {cambio.despues ? '✅' : '❌'}
                                  </span>
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

            {/* Footer del modal (solo en tab Permisos) */}
            {permissionsModalTab === 'permisos' && (
              <div className="border-t p-4 flex justify-between items-center bg-gray-50">
                <button
                  onClick={handleResetPermissions}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
                  disabled={permissionsUser.role === 'admin'}
                >
                  Restaurar valores del rol
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowPermissionsModal(false); setPermissionsUser(null); }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    disabled={savingPermissions || permissionsUser.role === 'admin'}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {savingPermissions ? 'Guardando...' : 'Guardar permisos'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManager;