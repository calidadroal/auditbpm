const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();

const PLAN_STORAGE_DAYS = {
  'trial': 1,
  'basico': 3,
  'premium': 30,
};

exports.handler = async () => {
  const bucket = admin.storage().bucket();
  const hoy = new Date();

  try {
    const [files] = await bucket.getFiles({ prefix: 'audit-photos/' });
    let borrados = 0;

    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const created = new Date(metadata.timeCreated);
      const diffDays = Math.floor((hoy - created) / (1000 * 60 * 60 * 24));

      // Si tiene más de 7 días, borrar (limpieza conservadora)
      if (diffDays > 7) {
        await file.delete();
        borrados++;
        console.log(`🗑️ Borrado: ${file.name} (${diffDays} días)`);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, borrados }),
    };
  } catch (error) {
    console.error('Error en cleanStorage:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};