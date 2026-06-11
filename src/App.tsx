import React from 'react';
import { useAppContext } from './context/AppContext';
import Header from './components/Layout/Header';
import TabBar from './components/Layout/TabBar';
import GlobalDashboard from './components/Dashboard/GlobalDashboard';
import PlantDashboard from './components/Dashboard/PlantDashboard';
import RecurrenceAnalysis from './components/Dashboard/RecurrenceAnalysis';
import SystemAnalysis from './components/Dashboard/SystemAnalysis';
import AuditForm from './components/Audit/AuditForm';
import SitesManager from './components/Sites/SitesManager';
import QuestionnaireManager from './components/Questionnaires/QuestionnaireManager';
import AIAnalysisPanel from './components/AIAnalysis/AIAnalysisPanel';
import NotificationsPanel from './components/Notifications/NotificationsPanel';
import UsersManager from './components/Users/UsersManager';
import LoadingOverlay from './components/common/LoadingOverlay';

const App: React.FC = () => {
  const { activeTab, isLoading } = useAppContext();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {isLoading && <LoadingOverlay />}
      <Header />
      <TabBar />
      <main className="max-w-7xl mx-auto px-4 py-5">
        {activeTab === 'indicadores' && (
          <div>
            <GlobalDashboard />
            <PlantDashboard />
            <RecurrenceAnalysis />
            <SystemAnalysis />
          </div>
        )}
        {activeTab === 'auditoria' && <AuditForm />}
        {activeTab === 'sitios' && <SitesManager />}
        {activeTab === 'cuestionarios' && <QuestionnaireManager />}
        {activeTab === 'analisis-ia' && <AIAnalysisPanel />}
        {activeTab === 'notificaciones' && <NotificationsPanel />}
        {activeTab === 'usuarios' && <UsersManager />}
      </main>
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 mt-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="font-bold text-white">BPM Gastronomía & SSO v2 - &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default App;