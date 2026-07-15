// src/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  limit,
  setDoc
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type {
  User,
  Site,
  SectorQR,
  QuestionnaireConfig,
  AuditRecord,
  AuditSchedule,
  FrecuenciaAuditoria,
  UserRole,
  ValidationResult,
  RecurrenceResult,
  Notificacion,
  Solicitud,
  Requisito,
  Empresa,
  Factura,
  FacturacionConfig,
  HistorialEstado,
  AlertaConfig,
} from './types';

const firebaseConfig = {
  apiKey: "AIzaSyAuBRwI3V_j0mkNwNkuZE9Qh7H51QBL8Vo",
  authDomain: "todoenregla-e63aa.firebaseapp.com",
  projectId: "todoenregla-e63aa",
  storageBucket: "todoenregla-e63aa.firebasestorage.app",
  messagingSenderId: "396645482275",
  appId: "1:396645482275:web:ea4bacf8c5659b9d0e5696"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// IDs de cuestionarios trial
const TRIAL_QUESTIONNAIRES = [
  'h8eUdPSqEPIY6RH4bJaa', // Checklist Municipal Prueba
  'x8sYQMlGObLxyBb3pSM5', // Local de Prueba
  'SAT1NTkAr0ftEoRMiFnO', // Cuestionario BPM Prueba
];

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================
// AUTENTICACIÓN
// ============================================

export const loginWithEmail = async (email: string, password: string): Promise<FirebaseAuthUser> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const registerUser = async (email: string, password: string): Promise<FirebaseAuthUser> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const onAuthChange = (callback: (user: FirebaseAuthUser | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

export const updateUserPassword = async (currentPassword: string, newPassword: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No hay usuario autenticado');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};

export const resetUserPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// ============================================
// USUARIOS
// ============================================

export const createUserInFirestore = async (uid: string, email: string, role: UserRole, displayName: string): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { uid, email, role, displayName, assignedSites: [], assignedQuestionnaires: [], active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
};

export const getUserData = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    return { uid: data.uid || uid, email: data.email || '', role: data.role || 'lector', displayName: data.displayName || data.name || '', assignedSites: data.assignedSites || [], active: data.active !== false, trialEndsAt: data.trialEndsAt || null, createdAt: data.createdAt, updatedAt: data.updatedAt } as User;
  }
  return null;
};

export const getAllUsers = async (): Promise<User[]> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('active', '==', true));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
};

export const updateUserRole = async (uid: string, role: UserRole): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { role, updatedAt: serverTimestamp() });
};

export const assignSitesToUser = async (userId: string, siteIds: string[]): Promise<void> => {
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', userId);
  batch.update(userRef, { assignedSites: siteIds, updatedAt: serverTimestamp() });
  const assignmentRef = doc(db, 'userSiteAssignments', userId);
  batch.set(assignmentRef, { userId, siteIds, updatedAt: serverTimestamp() });
  await batch.commit();
};

export const assignQuestionnairesToUser = async (userId: string, questionnaireIds: string[]): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { assignedQuestionnaires: questionnaireIds, updatedAt: serverTimestamp() });
};

export const getUserSites = async (userId: string): Promise<string[]> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) return userDoc.data().assignedSites || [];
  return [];
};

// ============================================
// SITIOS
// ============================================

export const getSites = async (): Promise<Site[]> => {
  const sitesRef = collection(db, 'sites');
  const q = query(sitesRef, where('active', '==', true), orderBy('name'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
};

export const createSite = async (siteData: Omit<Site, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const sitesRef = collection(db, 'sites');
  const docRef = await addDoc(sitesRef, { ...siteData, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
};

export const updateSite = async (siteId: string, updates: Partial<Site>): Promise<void> => {
  const siteRef = doc(db, 'sites', siteId);
  await updateDoc(siteRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteSite = async (siteId: string): Promise<void> => {
  const siteRef = doc(db, 'sites', siteId);
  await deleteDoc(siteRef);
};

// ============================================
// SECTORES QR
// ============================================

export const getSectors = async (siteId?: string): Promise<SectorQR[]> => {
  const sectorsRef = collection(db, 'sectors');
  let q;
  if (siteId) {
    q = query(sectorsRef, where('siteId', '==', siteId), where('active', '==', true), orderBy('name'));
  } else {
    q = query(sectorsRef, where('active', '==', true), orderBy('name'));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SectorQR));
};

export const createSector = async (sectorData: Omit<SectorQR, 'id' | 'qrToken' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const sectorsRef = collection(db, 'sectors');
  const qrToken = generateUUID();
  const docRef = await addDoc(sectorsRef, { ...sectorData, qrToken, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
};

export const updateSector = async (sectorId: string, updates: Partial<SectorQR>): Promise<void> => {
  const sectorRef = doc(db, 'sectors', sectorId);
  await updateDoc(sectorRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteSector = async (sectorId: string): Promise<void> => {
  const sectorRef = doc(db, 'sectors', sectorId);
  await updateDoc(sectorRef, { active: false, updatedAt: serverTimestamp() });
};

export const generateNewQRToken = async (sectorId: string): Promise<string> => {
  const sectorRef = doc(db, 'sectors', sectorId);
  const newToken = generateUUID();
  await updateDoc(sectorRef, { qrToken: newToken, updatedAt: serverTimestamp() });
  return newToken;
};

export const validateQRToken = async (token: string): Promise<ValidationResult & { sector?: SectorQR }> => {
  const sectorsRef = collection(db, 'sectors');
  const q = query(sectorsRef, where('qrToken', '==', token), where('active', '==', true), limit(1));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return { isValid: false, errors: ['QR inválido o sector inactivo'] };
  const sector = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as SectorQR;
  return { isValid: true, errors: [], sector };
};

// ============================================
// CUESTIONARIOS
// ============================================

export const getQuestionnaires = async (): Promise<QuestionnaireConfig[]> => {
  const questionnairesRef = collection(db, 'questionnaires');
  const q = query(questionnairesRef, where('active', '==', true), orderBy('name'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuestionnaireConfig));
};

export const createQuestionnaire = async (config: Omit<QuestionnaireConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const questionnairesRef = collection(db, 'questionnaires');
  const docRef = await addDoc(questionnairesRef, { ...config, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
};

export const updateQuestionnaire = async (id: string, updates: Partial<QuestionnaireConfig>): Promise<void> => {
  const questionnaireRef = doc(db, 'questionnaires', id);
  await updateDoc(questionnaireRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteQuestionnaire = async (id: string): Promise<void> => {
  const questionnaireRef = doc(db, 'questionnaires', id);
  await updateDoc(questionnaireRef, { active: false, updatedAt: serverTimestamp() });
};

export const updateQuestionnaireWithPermisos = async (id: string, data: Partial<QuestionnaireConfig>, user: User): Promise<void> => {
  const userRole = (user as any).role || user?.role;
  if (!['admin', 'gestor', 'coordinador'].includes(userRole)) {
    throw new Error('No tenés permisos para modificar cuestionarios');
  }
  await updateQuestionnaire(id, data);
};

export const deleteQuestionnaireWithPermisos = async (id: string, user: User): Promise<void> => {
  const userRole = (user as any).role || user?.role;
  if (!['admin', 'gestor', 'coordinador'].includes(userRole)) {
    throw new Error('No tenés permisos para desactivar cuestionarios');
  }
  await updateDoc(doc(db, 'questionnaires', id), { active: false, updatedAt: serverTimestamp() });
};

// ============================================
// AUDITORÍAS
// ============================================

export const getAudits = async (userId?: string): Promise<AuditRecord[]> => {
  let auditsQuery;
  if (userId) {
    const userSites = await getUserSites(userId);
    const user = await getUserData(userId);
    if (user?.role === 'admin') {
      auditsQuery = query(collection(db, 'audits'), orderBy('createdAt', 'desc'));
    } else {
      if (userSites.length === 0) return [];
      auditsQuery = query(collection(db, 'audits'), where('siteId', 'in', userSites), orderBy('createdAt', 'desc'));
    }
  } else {
    auditsQuery = query(collection(db, 'audits'), orderBy('createdAt', 'desc'));
  }
  const querySnapshot = await getDocs(auditsQuery);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditRecord));
};

export const getAuditsBySite = async (siteId: string): Promise<AuditRecord[]> => {
  const auditsRef = collection(db, 'audits');
  const q = query(auditsRef, where('siteId', '==', siteId), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditRecord));
};

export const analizarRecurrencia = async (auditoriaActual: AuditRecord): Promise<RecurrenceResult> => {
  const auditoriasAnteriores = await getAuditsBySite(auditoriaActual.siteId);
  const desviosSistematicos: string[] = [];
  const criticosActuales = auditoriaActual.responses.filter(r => r.esCriticoInocuidad && r.valor === 'NC');
  for (const critico of criticosActuales) {
    let recurrencias = 0;
    for (const anterior of auditoriasAnteriores) {
      if (anterior.id === auditoriaActual.id) continue;
      const mismoDesvio = anterior.responses.some(r => r.puntoNorma === critico.puntoNorma && r.valor === 'NC');
      if (mismoDesvio) recurrencias++;
    }
    if (recurrencias >= 2) {
      desviosSistematicos.push(`${critico.puntoNorma} - ${critico.norma}: ${recurrencias} recurrencias detectadas. DESVÍO SISTEMÁTICO.`);
    }
  }
  return {
    detectada: desviosSistematicos.length > 0,
    detalle: desviosSistematicos.length > 0 ? `Se detectaron ${desviosSistematicos.length} desvíos sistemáticos críticos.` : 'Sin recurrencias críticas detectadas.',
    desviosSistematicos
  };
};

export const createAudit = async (auditData: Omit<AuditRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const auditsRef = collection(db, 'audits');
  const docRef = await addDoc(auditsRef, { ...auditData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
};

export const updateAudit = async (auditId: string, updates: Partial<AuditRecord>): Promise<void> => {
  const auditRef = doc(db, 'audits', auditId);
  await updateDoc(auditRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteAudit = async (auditId: string): Promise<void> => {
  const auditRef = doc(db, 'audits', auditId);
  await deleteDoc(auditRef);
};

// ============================================
// NOTIFICACIONES
// ============================================

export const createNotificacion = async (notificacion: Omit<Notificacion, 'id' | 'createdAt'>): Promise<string> => {
  const notifRef = collection(db, 'notifications');
  const docRef = await addDoc(notifRef, { ...notificacion, read: false, createdAt: serverTimestamp() });
  return docRef.id;
};

export const getNotificaciones = async (): Promise<Notificacion[]> => {
  const notifRef = collection(db, 'notifications');
  const q = query(notifRef, orderBy('createdAt', 'desc'), limit(50));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notificacion));
};

export const getNotificacionesNoLeidas = async (): Promise<Notificacion[]> => {
  const notifRef = collection(db, 'notifications');
  const q = query(notifRef, where('read', '==', false), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notificacion));
};

export const markNotificacionRead = async (notifId: string): Promise<void> => {
  const notifRef = doc(db, 'notifications', notifId);
  await updateDoc(notifRef, { read: true });
};

// ============================================
// ENVÍO DE EMAILS (EmailJS)
// ============================================

const EMAILJS_SERVICE_ID = 'service_llr9rt9';
const EMAILJS_TEMPLATE_ID = 'template_3dk2kkc';
const EMAILJS_PUBLIC_KEY = 'rMpR4dCtf3Fe9GqzH';

export const sendEmailNotification = async (to: string[], subject: string, body: string): Promise<void> => {
  for (const recipient of to) {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: EMAILJS_SERVICE_ID, template_id: EMAILJS_TEMPLATE_ID, user_id: EMAILJS_PUBLIC_KEY, template_params: { to_email: recipient, subject: subject, message: body } })
      });
      if (response.ok) { console.log(`Email enviado a ${recipient}`); } else { console.error(`Error enviando a ${recipient}:`, await response.text()); }
    } catch (error: any) { console.error(`Error enviando a ${recipient}:`, error); }
  }
};

export function getClasificacionColor(clasificacion: string): string {
  switch (clasificacion) {
    case 'conforme': return 'Verde - Cumple BPM';
    case 'a_mejorar': return 'Amarillo - A Mejorar';
    case 'riesgo_alto': return 'Rojo - Riesgo Alto';
    default: return 'Sin clasificar';
  }
}

// ============================================
// STORAGE - SUBIDA DE FOTOS
// ============================================

export const uploadAuditPhoto = (auditId: string, questionId: string, file: File, onProgress?: (progress: number) => void): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const fileName = `${auditId}/${questionId}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, `audit-photos/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on('state_changed',
      (snapshot) => { const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100; if (onProgress) onProgress(progress); },
      (error) => { console.error('Error subiendo foto:', error); reject(error); },
      async () => { const downloadURL = await getDownloadURL(uploadTask.snapshot.ref); resolve(downloadURL); }
    );
  });
};

// ============================================
// PROGRAMACIÓN DE AUDITORÍAS
// ============================================

export const getAuditSchedules = async (siteId?: string): Promise<AuditSchedule[]> => {
  const schedulesRef = collection(db, 'auditSchedules');
  let q;
  if (siteId) {
    q = query(schedulesRef, where('siteId', '==', siteId), where('active', '==', true), orderBy('proximaAuditoria', 'asc'));
  } else {
    q = query(schedulesRef, where('active', '==', true), orderBy('proximaAuditoria', 'asc'));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditSchedule));
};

export const createAuditSchedule = async (scheduleData: Omit<AuditSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const schedulesRef = collection(db, 'auditSchedules');
  const docRef = await addDoc(schedulesRef, { ...scheduleData, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
};

export const updateAuditSchedule = async (scheduleId: string, updates: Partial<AuditSchedule>): Promise<void> => {
  const scheduleRef = doc(db, 'auditSchedules', scheduleId);
  await updateDoc(scheduleRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteAuditSchedule = async (scheduleId: string): Promise<void> => {
  const scheduleRef = doc(db, 'auditSchedules', scheduleId);
  await updateDoc(scheduleRef, { active: false, updatedAt: serverTimestamp() });
};

export const calcularProximaAuditoria = (frecuencia: FrecuenciaAuditoria, desde: Date = new Date()): Date => {
  const fecha = new Date(desde);
  switch (frecuencia) {
    case 'diaria': fecha.setDate(fecha.getDate() + 1); break;
    case 'semanal': fecha.setDate(fecha.getDate() + 7); break;
    case 'quincenal': fecha.setDate(fecha.getDate() + 15); break;
    case 'mensual': fecha.setMonth(fecha.getMonth() + 1); break;
    case 'trimestral': fecha.setMonth(fecha.getMonth() + 3); break;
  }
  return fecha;
};

export const verificarVencimientos = async (): Promise<void> => {
  const schedules = await getAuditSchedules();
  const ahora = new Date();
  for (const schedule of schedules) {
    if (!schedule.alertarVencimiento || !schedule.active) continue;
    const proxima = new Date(schedule.proximaAuditoria.seconds ? schedule.proximaAuditoria.seconds * 1000 : schedule.proximaAuditoria);
    const diasRestantes = Math.ceil((proxima.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
    if (diasRestantes <= 0) {
      await updateAuditSchedule(schedule.id, { estado: 'vencida' });
      if (schedule.emailsAlerta.length > 0) {
        await sendEmailNotification(schedule.emailsAlerta, `[TodoEnRegla] Auditoria VENCIDA - ${schedule.siteName}`, `La auditoria programada para ${schedule.siteName} esta VENCIDA.\nFrecuencia: ${schedule.frecuencia}\nVencia el: ${proxima.toLocaleDateString('es-AR')}\nDias de atraso: ${Math.abs(diasRestantes)}\n\nVer en: https://auditoriacalidad.netlify.app`);
      }
    } else if (diasRestantes <= schedule.diasAlertaVencimiento) {
      await updateAuditSchedule(schedule.id, { estado: 'proxima' });
      if (schedule.emailsAlerta.length > 0) {
        await sendEmailNotification(schedule.emailsAlerta, `[TodoEnRegla] Auditoria proxima - ${schedule.siteName}`, `La auditoria de ${schedule.siteName} vence en ${diasRestantes} dias.\nFrecuencia: ${schedule.frecuencia}\nFecha limite: ${proxima.toLocaleDateString('es-AR')}\n\nVer en: https://auditoriacalidad.netlify.app`);
      }
    } else {
      await updateAuditSchedule(schedule.id, { estado: 'al_dia' });
    }
  }
};

export const actualizarScheduleDespuesDeAuditoria = async (siteId: string): Promise<void> => {
  const schedules = await getAuditSchedules(siteId);
  for (const schedule of schedules) {
    const nuevaProxima = calcularProximaAuditoria(schedule.frecuencia);
    await updateAuditSchedule(schedule.id, { ultimaAuditoria: serverTimestamp(), proximaAuditoria: nuevaProxima, estado: 'al_dia' });
  }
};

// ============================================
// SOLICITUDES
// ============================================

export const getSolicitudes = async (userId?: string, isAdmin?: boolean): Promise<Solicitud[]> => {
  const solRef = collection(db, 'solicitudes');
  let q;
  if (isAdmin) {
    q = query(solRef, orderBy('createdAt', 'desc'));
  } else if (userId) {
    q = query(solRef, where('solicitanteId', '==', userId), orderBy('createdAt', 'desc'));
  } else {
    q = query(solRef, orderBy('createdAt', 'desc'), limit(20));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Solicitud));
};

export const createSolicitud = async (data: Omit<Solicitud, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const solRef = collection(db, 'solicitudes');
  const docRef = await addDoc(solRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
};

export const updateSolicitud = async (id: string, updates: Partial<Solicitud>): Promise<void> => {
  const solRef = doc(db, 'solicitudes', id);
  await updateDoc(solRef, { ...updates, updatedAt: serverTimestamp() });
};

// ============================================
// REQUISITOS CONFIGURABLES
// ============================================

export const getRequisitos = async (): Promise<Requisito[]> => {
  const reqRef = collection(db, 'requisitos');
  const q = query(reqRef, where('active', '==', true));
  const snapshot = await getDocs(q);
  const requisitos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Requisito));
  requisitos.sort((a, b) => {
    if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
    return a.nombre.localeCompare(b.nombre);
  });
  return requisitos;
};

export const getAllRequisitos = async (): Promise<Requisito[]> => {
  const reqRef = collection(db, 'requisitos');
  const q = query(reqRef);
  const snapshot = await getDocs(q);
  const requisitos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Requisito));
  requisitos.sort((a, b) => {
    if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
    return a.nombre.localeCompare(b.nombre);
  });
  return requisitos;
};

export const createRequisito = async (data: Omit<Requisito, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const reqRef = collection(db, 'requisitos');
  const docRef = await addDoc(reqRef, { ...data, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return docRef.id;
};

export const updateRequisito = async (id: string, updates: Partial<Requisito>): Promise<void> => {
  const reqRef = doc(db, 'requisitos', id);
  await updateDoc(reqRef, { ...updates, updatedAt: serverTimestamp() });
};

export const deleteRequisito = async (id: string): Promise<void> => {
  const reqRef = doc(db, 'requisitos', id);
  await updateDoc(reqRef, { active: false, updatedAt: serverTimestamp() });
};

// ============================================
// FREE TRIAL
// ============================================

export const createTrialUser = async (nombre: string, email: string, password: string): Promise<{ uid: string; siteId: string }> => {
  const fbUser = await registerUser(email, password);
  const uid = fbUser.uid;

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  const siteName = `Prueba - ${nombre}`;
  const siteId = await createSite({
    name: siteName,
    description: 'Sitio de prueba gratuita',
    sectors: ['General'],
    active: true,
    isTrial: true
  } as any);

  // Asignar los 3 cuestionarios trial al sitio
  try {
    for (const qId of TRIAL_QUESTIONNAIRES) {
      const qRef = doc(db, 'questionnaires', qId);
      const qSnap = await getDoc(qRef);
      if (qSnap.exists()) {
        const qData = qSnap.data();
        const sitiosActuales = qData.sitioIds || [];
        if (!sitiosActuales.includes(siteId)) {
          await updateDoc(qRef, { sitioIds: [...sitiosActuales, siteId], updatedAt: serverTimestamp() });
        }
      }
    }
  } catch (e) {
    console.error('Error asignando cuestionarios trial:', e);
  }

  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    role: 'auditor',
    displayName: nombre,
    assignedSites: [siteId],
    assignedQuestionnaires: TRIAL_QUESTIONNAIRES,
    active: true,
    isTrial: true,
    trialEndsAt,
    plan: 'trial',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return { uid, siteId };
};

export const checkTrialExpired = async (uid: string): Promise<boolean> => {
  const userData = await getUserData(uid);
  if (!userData || !userData.trialEndsAt) return false;

  const trialEnd = userData.trialEndsAt.seconds 
    ? new Date(userData.trialEndsAt.seconds * 1000) 
    : new Date(userData.trialEndsAt);
  
  const ahora = new Date();
  
  if (ahora > trialEnd && userData.role === 'auditor') {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { active: false, updatedAt: serverTimestamp() });
    
    if (userData.assignedSites && userData.assignedSites.length > 0) {
      for (const siteId of userData.assignedSites) {
        const site = await getDoc(doc(db, 'sites', siteId));
        if (site.exists() && site.data().isTrial) {
          await deleteDoc(doc(db, 'sites', siteId));
        }
      }
    }
    
    return true;
  }
  
  return false;
};

export const getTrialDaysLeft = (trialEndsAt: any): number => {
  if (!trialEndsAt) return 0;
  const end = trialEndsAt.seconds ? new Date(trialEndsAt.seconds * 1000) : new Date(trialEndsAt);
  const ahora = new Date();
  const diff = Math.ceil((end.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

// ============================================
// OFFLINE
// ============================================

export const saveAuditOffline = (audit: any): void => {
  const offline = JSON.parse(localStorage.getItem('offlineAudits') || '[]');
  offline.push(audit);
  localStorage.setItem('offlineAudits', JSON.stringify(offline));
};

export const getPendingSyncCount = (): number => {
  const offline = JSON.parse(localStorage.getItem('offlineAudits') || '[]');
  return offline.filter((a: any) => !a.sincronizado).length;
};

export const syncOfflineAudits = async (): Promise<{ sincronizados: number }> => {
  if (typeof window === 'undefined') return { sincronizados: 0 };
  const offline = JSON.parse(localStorage.getItem('offlineAudits') || '[]');
  let sincronizados = 0;
  for (const audit of offline) {
    if (!audit.sincronizado) {
      try {
        await createAudit(audit);
        audit.sincronizado = true;
        sincronizados++;
      } catch (e) {
        console.error('Error sincronizando:', e);
      }
    }
  }
  localStorage.setItem('offlineAudits', JSON.stringify(offline));
  return { sincronizados };
};

// ============================================
// ALERTAS CONFIG
// ============================================

export const getAlertaConfigs = async (): Promise<AlertaConfig[]> => {
  const snap = await getDocs(collection(db, 'alertaConfigs'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AlertaConfig));
};

export const getAlertasConfig = getAlertaConfigs;

// ============================================
// ETAPA 4: FACTURACIÓN
// ============================================

export const getEmpresa = async (empresaId: string): Promise<Empresa | null> => {
  const snap = await getDoc(doc(db, 'empresas', empresaId));
  return snap.exists() ? (snap.data() as Empresa) : null;
};

export const getEmpresaByUserId = async (userId: string): Promise<Empresa | null> => {
  const user = await getUserData(userId);
  if (!user?.empresaId) return null;
  return getEmpresa(user.empresaId);
};

export const createEmpresa = async (data: Omit<Empresa, 'id' | 'createdAt' | 'updatedAt' | 'fechaUltimoCalculo'>) => {
  const ref = doc(collection(db, 'empresas'));
  const empresa: Empresa = { ...data, id: ref.id, fechaUltimoCalculo: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await setDoc(ref, empresa);
  return ref.id;
};

export const updateEmpresa = async (empresaId: string, data: Partial<Empresa>) => {
  await updateDoc(doc(db, 'empresas', empresaId), { ...data, updatedAt: serverTimestamp() });
};

export const getAllEmpresas = async (): Promise<Empresa[]> => {
  const snap = await getDocs(collection(db, 'empresas'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Empresa));
};

export const getFacturasVencidasOrdenadas = async (empresaId: string): Promise<Factura[]> => {
  const q = query(collection(db, 'facturas'), where('empresaId', '==', empresaId), where('estado', '==', 'vencida'), orderBy('fechaVencimiento', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Factura));
};

export const createFactura = async (data: Omit<Factura, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = doc(collection(db, 'facturas'));
  const factura: Factura = { ...data, id: ref.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await setDoc(ref, factura);
  return ref.id;
};

export const updateFactura = async (facturaId: string, data: Partial<Factura>) => {
  await updateDoc(doc(db, 'facturas', facturaId), { ...data, updatedAt: serverTimestamp() });
};

export const getFacturasByEmpresa = async (empresaId: string): Promise<Factura[]> => {
  const q = query(collection(db, 'facturas'), where('empresaId', '==', empresaId), orderBy('fechaEmision', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Factura));
};

export const getFacturacionConfig = async (empresaId: string): Promise<FacturacionConfig | null> => {
  const snap = await getDoc(doc(db, 'facturacionConfig', empresaId));
  return snap.exists() ? (snap.data() as FacturacionConfig) : null;
};

export const setFacturacionConfig = async (empresaId: string, data: Omit<FacturacionConfig, 'empresaId' | 'updatedAt'>) => {
  const ref = doc(db, 'facturacionConfig', empresaId);
  await setDoc(ref, { ...data, empresaId, updatedAt: serverTimestamp() });
};

export const addHistorialEstado = async (empresaId: string, data: Omit<HistorialEstado, 'id' | 'empresaId' | 'timestamp'>) => {
  await addDoc(collection(db, 'empresas', empresaId, 'historialEstados'), { ...data, empresaId, timestamp: serverTimestamp() });
};

export const getHistorialEstados = async (empresaId: string): Promise<HistorialEstado[]> => {
  const q = query(collection(db, 'empresas', empresaId, 'historialEstados'), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as HistorialEstado));
};
export const getUsersBySites = async (siteIds: string[]): Promise<User[]> => {
  if (!siteIds.length) return [];
  const snap = await getDocs(query(collection(db, 'users'), where('assignedSites', 'array-contains-any', siteIds)));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
};
export const createAlertaConfig = async (data: Omit<AlertaConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = doc(collection(db, 'alertaConfigs'));
  const a: AlertaConfig = { ...data, id: ref.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  await setDoc(ref, a);
  return ref.id;
};
export const deleteAlertaConfig = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'alertaConfigs', id));
};