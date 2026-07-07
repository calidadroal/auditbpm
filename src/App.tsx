// src/App.tsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, ListChecks, Home, FileSpreadsheet, QrCode, User, Calendar, MessageSquare, Bell, FileCheck, WifiOff, Users } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useAppContext } from './context/AppContext';
import { syncOfflineAudits, getPendingSyncCount } from './firebase';
import LoginScreen from './components/Auth/LoginScreen';
import TermsAcceptance from './components/Auth/TermsAcceptance';
import Header from './components/Layout/Header';
import TabBar from './components/Layout/TabBar';
import PlantDashboard from './components/Dashboard/PlantDashboard';
import AuditForm from './components/Audit/AuditForm';
import SitesManager from './components/Sites/SitesManager';
import SectorsManager from './components/Sectors/SectorsManager';
import QuestionnaireManager from './components/Questionnaires/QuestionnaireManager';
import UsersManager from './components/Users/UsersManager';
import TeamManager from './components/Users/TeamManager';
import AuditScheduler from './components/Audit/AuditScheduler';
import SolicitudesPanel from './components/Solicitudes/SolicitudesPanel';
import AdminSolicitudes from './components/Solicitudes/AdminSolicitudes';
import NotificationsPanel from './components/Notifications/NotificationsPanel';
import RequisitosManager from './components/Admin/RequisitosManager';
import AlertasConfig from './components/Admin/AlertasConfig';
import type { AuditRecord } from './types';

type TabId = 'indicadores' | 'auditoria' | 'programacion' | 'solicitudes' | 'notificaciones' | 'sitios' | 'sectores' | 'requisitos' | 'cuestionarios' | 'usuarios' | 'alertas' | 'equipo';

const App: React.FC = () => {
  const { loading: authLoading, user, needTermsAcceptance, acceptTerms } = useAuth();
  const {
    isAuthenticated,
    isAdmin,
    canVerDashboard,
    canEjecutarAuditoria,
    canVerTodasAuditorias,
    canGestionarUsuarios,
    canGestionarChecklist,
    canCrearSitio,
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabId>('indicadores');
  const [editingAudit, setEditingAudit] = useState<AuditRecord | null>(null);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[Offline] Conexión restablecida - sincronizando...');
      syncOfflineAudits().then(result => {
        if (result.sincronizados > 0) {
          console.log(`[Offline] Sincronización automática: ${result.sincronizados} auditorías`);
        }
        setPendingSync(getPendingSyncCount());
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('[Offline] Sin conexión - se guardará localmente');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setPendingSync(getPendingSyncCount());
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPendingSync(getPendingSyncCount());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.tab === 'notificaciones') setActiveTab('notificaciones');
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.audit) {
        setEditingAudit(e.detail.audit);
      }
    };
    window.addEventListener('editAudit', handler);
    return () => window.removeEventListener('editAudit', handler);
  }, []);

  useEffect(() => {
    if (editingAudit) {
      setActiveTab('auditoria');
    }
  }, [editingAudit]);

  // ✅ Pestaña "Mi Equipo" SOLO visible para gestores (NO para coordinadores)
  const mostrarMiEquipo = user?.role === 'gestor' || user?.role === 'admin';

  const allTabs: { id: TabId; lbl: string; icon: any; visible: boolean }[] = [
    { id: 'indicadores', lbl: 'Indicadores', icon: TrendingUp, visible: canVerDashboard },
    { id: 'auditoria', lbl: 'Nueva Recorrida', icon: ListChecks, visible: canEjecutarAuditoria },
    { id: 'programacion', lbl: 'Programación', icon: Calendar, visible: canVerTodasAuditorias || canVerDashboard },
    { id: 'solicitudes', lbl: 'Solicitudes', icon: MessageSquare, visible: true },
    { id: 'notificaciones', lbl: 'Notificaciones', icon: Bell, visible: true },
    { id: 'sitios', lbl: 'Sitios', icon: Home, visible: canCrearSitio || user?.role === 'gestor' || user?.role === 'coordinador' },
    { id: 'sectores', lbl: 'Sectores QR', icon: QrCode, visible: canGestionarUsuarios || canCrearSitio },
    { id: 'requisitos', lbl: 'Requisitos', icon: FileCheck, visible: canGestionarChecklist || user?.role === 'gestor' || user?.role === 'coordinador' },
    { id: 'cuestionarios', lbl: 'Cuestionarios', icon: FileSpreadsheet, visible: canGestionarChecklist || user?.role === 'gestor' || user?.role === 'coordinador' },
    { id: 'usuarios', lbl: 'Usuarios', icon: User, visible: canGestionarUsuarios },
    // ✅ MI EQUIPO - SOLO GESTOR O ADMIN
    { id: 'equipo', lbl: 'Mi Equipo', icon: Users, visible: mostrarMiEquipo },
    { id: 'alertas', lbl: 'Alertas', icon: Bell, visible: isAdmin },
  ];

  const visibleTabs = allTabs.filter(tab => tab.visible).map(({ id, lbl, icon }) => ({ id, lbl, icon }));

  useEffect(() => {
    const isActiveVisible = visibleTabs.some(tab => tab.id === activeTab);
    if (!isActiveVisible && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].id as TabId);
    }
  }, [visibleTabs, activeTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (user && needTermsAcceptance) {
    return <TermsAcceptance onAccept={acceptTerms} />;
  }

  const renderContent = () => {
    if (activeTab === 'indicadores') return <PlantDashboard />;
    if (activeTab === 'auditoria') return (
      <AuditForm 
        auditToEdit={editingAudit}
        onCancelEdit={() => setEditingAudit(null)}
        onEditComplete={() => setEditingAudit(null)}
      />
    );
    if (activeTab === 'programacion') return <AuditScheduler />;
    if (activeTab === 'solicitudes') return isAdmin ? <AdminSolicitudes /> : <SolicitudesPanel />;
    if (activeTab === 'notificaciones') return <NotificationsPanel />;
    if (activeTab === 'sitios') return <SitesManager />;
    if (activeTab === 'sectores') return <SectorsManager />;
    if (activeTab === 'requisitos') return <RequisitosManager />;
    if (activeTab === 'cuestionarios') return <QuestionnaireManager />;
    if (activeTab === 'usuarios') return <UsersManager />;
    if (activeTab === 'equipo') return <TeamManager />;
    if (activeTab === 'alertas') return <AlertasConfig />;
    return <div className="p-6">Pestaña no encontrada: {activeTab}</div>;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Sin conexión a internet - Las auditorías se guardarán localmente
        </div>
      )}
      
      {isOnline && pendingSync > 0 && (
        <div className="bg-blue-500 text-white px-4 py-2 text-center text-sm font-medium">
          📤 {pendingSync} auditoría{pendingSync !== 1 ? 's' : ''} pendiente{pendingSync !== 1 ? 's' : ''} de sincronizar - 
          <button 
            onClick={async () => {
              const result = await syncOfflineAudits();
              setPendingSync(getPendingSyncCount());
              alert(`Sincronización completada: ${result.sincronizados} éxitos, ${result.errores} errores`);
            }}
            className="underline ml-1 font-bold hover:text-blue-100"
          >
            Sincronizar ahora
          </button>
        </div>
      )}
      
      <Header />
      <TabBar tabs={visibleTabs} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as TabId)} />
      <main>{renderContent()}</main>
    </div>
  );
};

export default App;