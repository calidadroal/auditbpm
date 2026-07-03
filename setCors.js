const { initializeApp } = require('firebase/app');
const { getStorage, connectStorageEmulator } = require('firebase/storage');

// No necesitamos Firebase para esto, usamos Google Cloud Storage directo
const { Storage } = require('@google-cloud/storage');

// Tu proyecto
const projectId = 'auditbpm-backend';

async function setCors() {
  const storage = new Storage({ projectId });
  const bucket = storage.bucket('auditbpm-backend.firebasestorage.app');

  await bucket.setCorsConfiguration([
    {
      origin: ['*'],
      method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
      responseHeader: ['Content-Type', 'Content-Disposition'],
      maxAgeSeconds: 3600
    }
  ]);

  console.log('✅ CORS configurado correctamente');
}

setCors().catch(console.error);