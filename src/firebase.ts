import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC4VLw-x5eRw4thFFTFLD7eQsvyQL81t5A",
  authDomain: "auditbpm-backend.firebaseapp.com",
  projectId: "auditbpm-backend",
  storageBucket: "auditbpm-backend.firebasestorage.app",
  messagingSenderId: "597993103966",
  appId: "1:597993103966:web:c9d910abbb7f3c56d5cacf"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Funciones para Sitios
export const getSites = async () => {
  const q = query(collection(db, 'sites'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createSite = async (data: any) => {
  const docRef = await addDoc(collection(db, 'sites'), data);
  return { id: docRef.id, ...data };
};

// Funciones para Cuestionarios
export const getQuestionnaires = async () => {
  const q = query(collection(db, 'questionnaires'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createQuestionnaire = async (data: any) => {
  const docRef = await addDoc(collection(db, 'questionnaires'), data);
  return { id: docRef.id, ...data };
};

export const deleteQuestionnaire = async (id: string) => {
  await deleteDoc(doc(db, 'questionnaires', id));
};

// Funciones para Auditorías
export const getAudits = async () => {
  const q = query(collection(db, 'audits'), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createAudit = async (data: any) => {
  const docRef = await addDoc(collection(db, 'audits'), {
    ...data,
    date: new Date().toISOString().split('T')[0],
    hasCriticalFailures: data.hasCriticalFailures || false
  });
  return { id: docRef.id, ...data };
};

// Funciones para Notificaciones
export const getNotifications = async () => {
  const q = query(collection(db, 'notifications'), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const markNotificationRead = async (id: string) => {
  await updateDoc(doc(db, 'notifications', id), { read: true });
};

// Funciones para Usuarios
export const getUsers = async () => {
  const q = query(collection(db, 'users'), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createUser = async (data: any) => {
  const docRef = await addDoc(collection(db, 'users'), data);
  return { id: docRef.id, ...data };
};