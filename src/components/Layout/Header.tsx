import React from 'react';
import { ClipboardCheck, Bell } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Header: React.FC = () => {
  const { activeUser, setActiveTab, notifications } = useAppContext();
  const unread = notifications.filter(n => !n.read).length;

  return (
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
        <div className="flex items-center space-x-3 text-xs">
          {activeUser && (
            <div onClick={() => setActiveTab('usuarios')} className="p-2 border rounded-lg bg-blue-50 cursor-pointer">
              <span className="font-bold text-slate-800 block">{activeUser.name}</span>
              <span className="text-[9px] uppercase font-extrabold text-blue-700">{activeUser.role}</span>
            </div>
          )}
          <button onClick={() => setActiveTab('notificaciones')} className="relative p-2 rounded-full border bg-white">
            <Bell className="w-4 h-4 text-slate-600" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-[9px] px-1 font-bold">
                {unread}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;