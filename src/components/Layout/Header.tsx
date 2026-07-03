// src/components/Layout/Header.tsx
import React, { useState, useEffect } from 'react';
import { ClipboardCheck, User, LogOut, Key, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logoutUser, getNotificacionesNoLeidas } from '../../firebase';
import ChangePasswordModal from '../Profile/ChangePasswordModal';

const Header: React.FC = () => {
  const { user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    if (user) loadNoLeidas();
    const interval = setInterval(() => { if (user) loadNoLeidas(); }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadNoLeidas = async () => {
    try {
      const data = await getNotificacionesNoLeidas();
      if (user?.role === 'admin') {
        setNoLeidas(data.length);
      } else {
        const userSites = user?.assignedSites || [];
        setNoLeidas(data.filter(n => userSites.includes(n.siteId)).length);
      }
    } catch (error) { /* silencioso */ }
  };

  const getRoleLabel = (): string => {
    switch (user?.role) {
      case 'admin': return 'Administrador';
      case 'auditor': return 'Auditor';
      case 'gestor': return 'Gestor';
      case 'lector': return 'Lector';
      case 'operador': return 'Operador';
      default: return 'Usuario';
    }
  };

  const handleLogout = async () => {
    try { await logoutUser(); setShowUserMenu(false); }
    catch (error) { console.error('Error al cerrar sesión:', error); }
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
    setShowUserMenu(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-950">AuditBPM Gastronomía</h1>
              <p className="text-[10px] text-slate-400">Multi-Cuestionarios IRAM & SSO</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Campana de notificaciones */}
            <button
              onClick={() => {
                const event = new CustomEvent('navigate', { detail: { tab: 'notificaciones' } });
                window.dispatchEvent(event);
              }}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Notificaciones"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {noLeidas > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {noLeidas > 9 ? '9+' : noLeidas}
                </span>
              )}
            </button>

            {user && (
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 p-2 border rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="text-left">
                    <span className="font-bold text-slate-800 text-xs block">{user.displayName}</span>
                    <span className="text-[9px] uppercase font-extrabold text-blue-700">{getRoleLabel()}</span>
                  </div>
                  <User className="w-4 h-4 text-blue-600" />
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-20 overflow-hidden">
                      <div className="p-3 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-800">{user.displayName}</p>
                        <p className="text-[10px] text-slate-500">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <button onClick={handleChangePassword} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                          <Key className="w-4 h-4 text-blue-600" /> Cambiar Contraseña
                        </button>
                        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <LogOut className="w-4 h-4" /> Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </>
  );
};

export default Header;