import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuditRecord, NotificationRecord, Site, Questionnaire, AppUser } from '../types/index';

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeUser: AppUser | null;
  setActiveUser: (user: AppUser | null) => void;
  audits: AuditRecord[];
  notifications: NotificationRecord[];
  sites: Site[];
  questionnaires: Questionnaire[];
  users: AppUser[];
  stats: any;
  selectedAuditId: string | null;
  setSelectedAuditId: (id: string | null) => void;
  refreshData: () => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('indicadores');
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [stats, setStats] = useState<any>({});
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [auditsRes, notifRes, statsRes, sitesRes, questRes, usersRes] = await Promise.all([
        fetch('/api/audits').then(r => r.json()),
        fetch('/api/notifications').then(r => r.json()),
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/sites').then(r => r.json()),
        fetch('/api/questionnaires').then(r => r.json()),
        fetch('/api/users').then(r => r.json())
      ]);
      setAudits(auditsRes);
      setNotifications(notifRes);
      setStats(statsRes);
      setSites(sitesRes);
      setQuestionnaires(questRes);
      setUsers(usersRes);
      const storedId = localStorage.getItem('activeUserId');
      const defaultUser = usersRes.find((u: any) => u.id === storedId) || usersRes[0];
      if (defaultUser) setActiveUser(defaultUser);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refreshData(); }, []);

  return (
    <AppContext.Provider value={{
      activeTab, setActiveTab, activeUser, setActiveUser,
      audits, notifications, sites, questionnaires, users, stats,
      selectedAuditId, setSelectedAuditId, refreshData, isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);