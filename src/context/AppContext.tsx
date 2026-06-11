import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuditRecord, NotificationRecord, Site, Questionnaire, AppUser } from '../types/index';
import { getAudits, getSites, getQuestionnaires, getUsers, getNotifications } from '../firebase';

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
      const [auditsData, sitesData, questData, usersData, notifData] = await Promise.all([
        getAudits(),
        getSites(),
        getQuestionnaires(),
        getUsers(),
        getNotifications()
      ]);
      setAudits(auditsData as AuditRecord[]);
      setSites(sitesData as Site[]);
      setQuestionnaires(questData as Questionnaire[]);
      setUsers(usersData as AppUser[]);
      setNotifications(notifData as NotificationRecord[]);
      
      setStats({
        totalAudits: auditsData.length,
        averageScore: auditsData.length > 0 
          ? Math.round((auditsData as AuditRecord[]).reduce((sum, a) => sum + (a.score || 0), 0) / auditsData.length) 
          : 0,
        standardsBreakdown: {}
      });

      const storedId = localStorage.getItem('activeUserId');
      const defaultUser = (usersData as AppUser[]).find(u => u.id === storedId) || (usersData as AppUser[])[0];
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