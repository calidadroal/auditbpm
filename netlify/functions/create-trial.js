// netlify/functions/create-trial.js
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { nombre, email } = body;

    if (!nombre || !email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Nombre y email son requeridos' }) };
    }

    // Generar contraseña aleatoria
    const password = generateUUID().substring(0, 8);

    // Crear usuario en Firebase Auth
    const userRecord = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userRecord.user.uid;

    // Calcular fecha de vencimiento (7 días)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    // Crear sitio de prueba
    const siteId = generateUUID();
    const siteRef = doc(db, 'sites', siteId);
    await setDoc(siteRef, {
      id: siteId,
      name: `Prueba - ${nombre}`,
      description: 'Sitio de prueba gratuita',
      sectors: ['General'],
      active: true,
      isTrial: true,
      notificationEmails: [email],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Crear usuario en Firestore
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      uid,
      email,
      role: 'auditor',
      displayName: nombre,
      assignedSites: [siteId],
      active: true,
      trialEndsAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Usuario creado correctamente',
        email,
        password,
        appUrl: 'https://auditoriacalidad.netlify.app'
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al crear usuario', details: error.message })
    };
  }
};