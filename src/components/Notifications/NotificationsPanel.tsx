import React from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const NotificationsPanel: React.FC = () => {
  const { notifications, refreshData } = useAppContext();

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      await refreshData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  return (
    <div className="space-y-5">
      {/* Contadores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 p-4 rounded-xl border border-red-200">
          <span className="text-[10px] text-red-500 uppercase font-bold">Pendientes</span>
          <span className="text-2xl font-black text-red-700 block">{unread.length}</span>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
          <span className="text-[10px] text-green-500 uppercase font-bold">Resueltas</span>
          <span className="text-2xl font-black text-green-700 block">{read.length}</span>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <h3 className="font-extrabold text-slate-900 text-sm border-b pb-2 mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600" />
          Buzón de Hallazgos Críticos
        </h3>

        {notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p className="text-sm font-bold">Sin hallazgos pendientes</p>
            <p className="text-xs">Todos los desvíos fueron resueltos</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Pendientes primero */}
            {unread.map(n => (
              <div key={n.id} className="p-4 rounded-lg border bg-red-50/30 border-red-200">
                <div className="flex justify-between items-start text-xs">
                  <span className="bg-red-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded">PENDIENTE</span>
                  <span className="text-[10px] text-slate-400 font-bold">{n.date} | {n.area}</span>
                </div>
                <h4 className="font-bold text-xs mt-1.5 text-slate-900">{n.itemName}</h4>
                <blockquote className="border-l-2 border-red-300 pl-2 py-1 italic text-slate-500 mt-1.5 text-[11px] bg-white rounded">
                  "{n.comment}"
                </blockquote>
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="mt-2 px-3 py-1 bg-indigo-600 text-white font-bold text-[10px] rounded hover:bg-indigo-700"
                >
                  Marcar como resuelto
                </button>
              </div>
            ))}

            {/* Resueltas */}
            {read.map(n => (
              <div key={n.id} className="p-4 rounded-lg border bg-slate-50 border-slate-200 opacity-70">
                <div className="flex justify-between items-start text-xs">
                  <span className="bg-green-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded">RESUELTO</span>
                  <span className="text-[10px] text-slate-400 font-bold">{n.date} | {n.area}</span>
                </div>
                <h4 className="font-bold text-xs mt-1.5 text-slate-700">{n.itemName}</h4>
                <blockquote className="border-l-2 border-slate-300 pl-2 py-1 italic text-slate-400 mt-1.5 text-[11px] bg-white rounded">
                  "{n.comment}"
                </blockquote>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;