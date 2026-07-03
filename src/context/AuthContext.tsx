// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, loginWithEmail, logoutUser, checkTrialExpired, getTrialDaysLeft } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User, UserRole } from '../types';
import type { User as FirebaseAuthUser } from 'firebase/auth';

const TERMS_VERSION = 'v1.0';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  loading: boolean;
  trialExpired: boolean;
  trialDaysLeft: number;
  needTermsAcceptance: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  acceptTerms: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};

const ROLES_VALIDOS: UserRole[] = ['admin', 'auditor', 'gestor', 'lector', 'operador'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [needTermsAcceptance, setNeedTermsAcceptance] = useState(false);

  const acceptTerms = async () => {
    if (!firebaseUser) throw new Error('No hay usuario autenticado');
    
    const userRef = doc(db, 'users', firebaseUser.uid);
    await updateDoc(userRef, {
      termsAccepted: true,
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    if (user) {
      setUser({
        ...user,
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
        termsAcceptedAt: new Date().toISOString()
      });
    }
    setNeedTermsAcceptance(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthChange(async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data();
            const role: UserRole = ROLES_VALIDOS.includes(data.role) ? data.role : 'lector';
            
            if (data.trialEndsAt) {
              const expired = await checkTrialExpired(fbUser.uid);
              if (expired) {
                setTrialExpired(true);
                setTrialDaysLeft(0);
                setUser(null);
                setNeedTermsAcceptance(false);
                setLoading(false);
                return;
              }
              setTrialDaysLeft(getTrialDaysLeft(data.trialEndsAt));
            }
            
            const termsAccepted = data.termsAccepted === true;
            const termsVersion = data.termsVersion || '';
            const needsTerms = !termsAccepted || termsVersion !== TERMS_VERSION;
            
            setNeedTermsAcceptance(needsTerms);
            
            const appUser: User = {
              uid: fbUser.uid,
              email: data.email || fbUser.email || '',
              role: role,
              displayName: data.displayName || data.name || fbUser.email || '',
              assignedSites: data.assignedSites || [],
              active: data.active !== false,
              trialEndsAt: data.trialEndsAt || null,
              permisosOverride: data.permisosOverride || {},
              overrideActivo: data.overrideActivo || false,
              permisosActualizadosPor: data.permisosActualizadosPor || null,
              permisosActualizadosEn: data.permisosActualizadosEn || null,
              fechaVencimientoOverrides: data.fechaVencimientoOverrides || null,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              termsAccepted: data.termsAccepted || false,
              termsVersion: data.termsVersion || '',
              termsAcceptedAt: data.termsAcceptedAt || null
            };
            
            console.log('Usuario cargado:', appUser.role, appUser.email);
            if (appUser.trialEndsAt) console.log('Trial: quedan', trialDaysLeft, 'dias');
            console.log('Términos aceptados:', appUser.termsAccepted, 'Versión:', appUser.termsVersion);
            
            setUser(appUser);
            
            if (data.active === false) {
              setTrialExpired(true);
              setUser(null);
              setNeedTermsAcceptance(false);
            }
            
          } else {
            setUser(null);
            setNeedTermsAcceptance(false);
          }
        } catch (error) {
          console.error('Error cargando datos del usuario:', error);
          setUser(null);
          setNeedTermsAcceptance(false);
        }
      } else {
        setUser(null);
        setNeedTermsAcceptance(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await loginWithEmail(email, password);
  };

  const logout = async () => {
    await logoutUser();
    setNeedTermsAcceptance(false);
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    trialExpired,
    trialDaysLeft,
    needTermsAcceptance,
    login,
    logout,
    acceptTerms
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;