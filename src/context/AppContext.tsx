// src/context/AppContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { tienePermiso } from '../utils/permissionChecker';
import { db } from '../firebase';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { Site, QuestionnaireConfig, AuditRecord } from '../types';

interface AppState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuditor: boolean;
  isGestor: boolean;
  isLector: boolean;
  canGestionarUsuarios: boolean;
  canModificarPermisos: boolean;
  canEjecutarAuditoria: boolean;
  canCrearAuditoria: boolean;
  canVerDashboard: boolean;
  canExportarReportes: boolean;
  canGestionarChecklist: boolean;
  canCrearSitio: boolean;
  canEditarSitio: boolean;
  canVerTodasAuditorias: boolean;
  canVerSusAuditorias: boolean;
  sites: Site[];
  questionnaires: QuestionnaireConfig[];
  audits: AuditRecord[];
  loading: boolean;
  selectedSector: any | null;
  setSelectedSector: (sector: any | null) => void;
  validateAuditRequirements: (data: any) => { isValid: boolean; errors: string[] };
}

const AppContext = createContext<AppState | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext debe usarse dentro de AppProvider');
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  const [sites, setSites] = useState<Site[]>([]);
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireConfig[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [selectedSector, setSelectedSector] = useState<any | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const isAuthenticated = !!user;

  const isAdmin = user?.role === 'admin';
  const isAuditor = user?.role === 'auditor';
  const isGestor = user?.role === 'gestor';
  const isLector = user?.role === 'lector';
  const isTrial = (user as any)?.isTrial === true || (user as any)?.plan === 'trial';

  const canGestionarUsuarios = tienePermiso(user, 'gestionar_usuarios');
  const canModificarPermisos = tienePermiso(user, 'modificar_permisos');
  const canEjecutarAuditoria = tienePermiso(user, 'ejecutar_auditoria');
  const canCrearAuditoria = tienePermiso(user, 'crear_auditoria');
  const canVerDashboard = tienePermiso(user, 'ver_dashboard');
  const canExportarReportes = tienePermiso(user, 'exportar_reportes');
  const canGestionarChecklist = tienePermiso(user, 'gestionar_checklist');
  const canCrearSitio = tienePermiso(user, 'crear_sitio');
  const canEditarSitio = tienePermiso(user, 'editar_sitio');
  const canVerTodasAuditorias = tienePermiso(user, 'ver_todas_auditorias');
  const canVerSusAuditorias = tienePermiso(user, 'ver_sus_auditorias');

  const loading = authLoading || (isAuthenticated && dataLoading);

  // Cargar sitios
  useEffect(() => {
    if (!user) { setSites([]); setDataLoading(false); return; }

    const q = query(collection(db, 'sites'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let sitesData: Site[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Site[];

      if (user.role !== 'admin') {
        const assignedIds = (user.assignedSites || []).filter((id: string) => id && id.trim() !== '');
        sitesData = sitesData.filter((site) => assignedIds.includes(site.id));
      }

      setSites(sitesData);
      setDataLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // Cargar cuestionarios
  useEffect(() => {
    if (!user) { setQuestionnaires([]); return; }

    const q = query(collection(db, 'questionnaires'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let questData: QuestionnaireConfig[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as QuestionnaireConfig[];

      if (user.role !== 'admin') {
        const assignedSites = user.assignedSites || [];
        
        questData = questData.filter((q) => {
          // Si el cuestionario es solo para trial y el usuario no es trial → ocultar
          const trialOnly = (q as any).trialOnly === true;
          if (trialOnly && !isTrial) return false;
          
          // Si el cuestionario tiene sitioIds, verificar que coincida con los sitios del usuario
          if (q.sitioIds && q.sitioIds.length > 0) {
            return q.sitioIds.some(siteId => assignedSites.includes(siteId));
          }
          
          // Si no tiene sitioIds y no es trialOnly, mostrarlo a todos
          return true;
        });
      }

      setQuestionnaires(questData);
    });
    return unsubscribe;
  }, [user, isTrial]);

  // Cargar auditorías
  useEffect(() => {
    if (!user) { setAudits([]); return; }

    const q = query(collection(db, 'audits'), orderBy('completedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let auditsData: AuditRecord[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as AuditRecord[];

      if (user.role !== 'admin') {
        const assignedIds = (user.assignedSites || []).filter((id: string) => id && id.trim() !== '');
        auditsData = auditsData.filter((audit) => assignedIds.includes(audit.siteId));
      }

      setAudits(auditsData);
    });
    return unsubscribe;
  }, [user]);

  const validateAuditRequirements = (data: any) => {
    const errors: string[] = [];
    if (!data.siteId) errors.push('Debe seleccionar un sitio');
    if (!data.questionnaireId) errors.push('Debe seleccionar un cuestionario');
    return { isValid: errors.length === 0, errors };
  };

  const value: AppState = {
    isAuthenticated,
    isAdmin,
    isAuditor,
    isGestor,
    isLector,
    canGestionarUsuarios,
    canModificarPermisos,
    canEjecutarAuditoria,
    canCrearAuditoria,
    canVerDashboard,
    canExportarReportes,
    canGestionarChecklist,
    canCrearSitio,
    canEditarSitio,
    canVerTodasAuditorias,
    canVerSusAuditorias,
    sites,
    questionnaires,
    audits,
    loading,
    selectedSector,
    setSelectedSector,
    validateAuditRequirements,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};