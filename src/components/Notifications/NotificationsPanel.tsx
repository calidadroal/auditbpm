// src/components/Notifications/NotificationsPanel.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { getNotificaciones, markNotificacionRead } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Bell, CheckCircle, AlertTriangle, TrendingDown, ExternalLink, Calendar, Trash2 } from 'lucide-react';
import type { Notificacion } from '../../types';
import AuditDetail from '../Audit/AuditDetail';

const NotificationsPanel: React.FC = () => {
  const { user } = useAuth();
  const { audits, sites } = useAppContext();
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotificaciones();
      const activas = data.filter(n => !n._deleted);
      if (user?.role === 'admin') {
        setNotifications(activas);
      } else {
        const userSites = user?.assignedSites || [];
        setNotifications(activas.filter(n => userSites.includes(n.siteId)));
      }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  const handleMarkRead = async (id: string) => {
    try {
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, { read: true });
      await loadNotifications();
    } catch (error) { console.error('Error:', error); }
  };

  const handleMarkAllRead = async () => {
    for (const n of unreadNotifications) {
      const notifRef = doc(db, 'notifications', n.id);
      await updateDoc(notifRef, { read: true });
    }
    await loadNotifications();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta notificación?')) return;
    try {
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, { _deleted: true });
      await loadNotifications();
    } catch (error) { console.error('Error:', error); }
  };

  const handleDeleteAllRead = async () => {
    if (!window.confirm('¿Eliminar todas las notificaciones leídas?')) return;
    for (const n of readNotifications) {
      const notifRef = doc(db, 'notifications', n.id);
      await updateDoc(notifRef, { _deleted: true });
    }
    await loadNotifications();
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'critico': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'recurrencia': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'score_bajo': return <TrendingDown className="w-5 h-5 text-yellow-500" />;
      case 'vencimiento': return <Calendar className="w-5 h-5 text-purple-500" />;
      default: return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const getBgColor = (tipo: string, read: boolean) => {
    if (read) return 'bg-white';
    switch (tipo) {
      case 'critico': return 'bg-red-50 border-red-200';
      case 'recurrencia': return 'bg-orange-50 border-orange-200';
      case 'score_bajo': return 'bg-yellow-50 border-yellow-200';
      case 'vencimiento': return 'bg-purple-50 border-purple-200';
      default: return 'bg-white';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'critico': return '🚨 Crítico';
      case 'recurrencia': return '⚠️ Recurrencia';
      case 'score_bajo': return '📊 Score bajo';
      case 'vencimiento': return '📅 Vencimiento';
      default: return tipo;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const selectedAudit = selectedAuditId ? audits.find(a => a.id === selectedAuditId) : null;

  if (loading) return <div className="p-6"><div className="animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Notificaciones</h2>
        <div className="flex gap-2">
          {unreadNotifications.length > 0 && (
            <button onClick={handleMarkAllRead} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
              Marcar todas leídas
            </button>
          )}
          {readNotifications.length > 0 && (
            <button onClick={handleDeleteAllRead} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Limpiar leídas
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">No leídas</p>
          <p className="text-2xl font-bold text-red-700">{unreadNotifications.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Leídas</p>
          <p className="text-2xl font-bold text-green-700">{readNotifications.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total</p>
          <p className="text-2xl font-bold text-blue-700">{notifications.length}</p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay notificaciones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div key={notif.id} className={`border rounded-lg p-4 transition-colors ${getBgColor(notif.tipo, notif.read)} ${!notif.read ? 'shadow-sm' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getIcon(notif.tipo)}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-gray-500">{getTipoLabel(notif.tipo)}</span>
                      {!notif.read && <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full"></span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{formatDate(notif.createdAt)}</span>
                      <button onClick={() => handleDelete(notif.id)} className="text-gray-400 hover:text-red-500" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="font-medium text-sm mt-1">{notif.mensaje}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.siteName} | Score: {notif.score}% | Críticos: {notif.criticosEncontrados}</p>
                  {notif.emailsEnviados && notif.emailsEnviados.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">📧 Aviso a: {notif.emailsEnviados.join(', ')}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setSelectedAuditId(notif.auditId)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Ver auditoría
                    </button>
                    {!notif.read && (
                      <button onClick={() => handleMarkRead(notif.id)} className="text-xs text-green-600 hover:text-green-800">Marcar leída</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAudit && (
        <AuditDetail 
          audit={selectedAudit} 
          siteName={sites.find(s => s.id === selectedAudit.siteId)?.name || selectedAudit.siteName || 'Sitio desconocido'} 
          onClose={() => setSelectedAuditId(null)}
          onDownloadPDF={async () => {
            const { generarPDF } = await import('../../utils/pdfGenerator');
            if (selectedAudit) generarPDF(selectedAudit);
          }}
        />
      )}
    </div>
  );
};

export default NotificationsPanel;