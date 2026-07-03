// src/App.tsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, ListChecks, Home, FileSpreadsheet, QrCode, User, Calendar, MessageSquare, Bell, FileCheck } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useAppContext } from './context/AppContext';
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
import AuditScheduler from './components/Audit/AuditScheduler';
import SolicitudesPanel from './components/Solicitudes/SolicitudesPanel';
import AdminSolicitudes from './components/Solicitudes/AdminSolicitudes';
import NotificationsPanel from './components/Notifications/NotificationsPanel';
import RequisitosManager from './components/Admin/RequisitosManager';
import type { AuditRecord } from './types';

type TabId = 'indicadores' | 'auditoria' | 'programacion' | 'solicitudes' | 'notificaciones' | 'sitios' | 'sectores' | 'requisitos' | 'cuestionarios' | 'usuarios';

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

  const allTabs: { id: TabId; lbl: string; icon: any; visible: boolean }[] = [
    { id: 'indicadores', lbl: 'Indicadores', icon: TrendingUp, visible: canVerDashboard },
    { id: 'auditoria', lbl: 'Nueva Recorrida', icon: ListChecks, visible: canEjecutarAuditoria },
    { id: 'programacion', lbl: 'Programación', icon: Calendar, visible: canVerTodasAuditorias || canVerDashboard },
    { id: 'solicitudes', lbl: 'Solicitudes', icon: MessageSquare, visible: true },
    { id: 'notificaciones', lbl: 'Notificaciones', icon: Bell, visible: true },
    { id: 'sitios', lbl: 'Sitios', icon: Home, visible: canCrearSitio },
    { id: 'sectores', lbl: 'Sectores QR', icon: QrCode, visible: canGestionarUsuarios || canCrearSitio },
    { id: 'requisitos', lbl: 'Requisitos', icon: FileCheck, visible: canGestionarChecklist },
    { id: 'cuestionarios', lbl: 'Cuestionarios', icon: FileSpreadsheet, visible: canGestionarChecklist },
    { id: 'usuarios', lbl: 'Usuarios', icon: User, visible: canGestionarUsuarios },
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
    return <div className="p-6">Pestaña no encontrada: {activeTab}</div>;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <TabBar tabs={visibleTabs} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as TabId)} />
      <main>{renderContent()}</main>
    </div>
  );
};

export default App;