const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

exports.handler = async () => {
  const hoy = new Date();
  const configsSnap = await db.collection('facturacionConfig').where('suspensionAutomatica', '==', true).get();

  for (const doc of configsSnap.docs) {
    const config = doc.data();
    const empresaRef = db.collection('empresas').doc(config.empresaId);
    const empresaSnap = await empresaRef.get();
    if (!empresaSnap.exists) continue;
    const empresa = empresaSnap.data();

    const facturasSnap = await db.collection('facturas')
      .where('empresaId', '==', config.empresaId)
      .where('estado', '==', 'vencida')
      .orderBy('fechaVencimiento', 'asc')
      .get();

    const vencidas = facturasSnap.docs.length;
    if (vencidas === 0) {
      if (empresa.estadoPago !== 'al_dia') {
        await cambiarEstado(empresaRef, empresa.estadoPago, 'al_dia', 'Sin facturas vencidas');
      }
      continue;
    }

    const masAntigua = facturasSnap.docs[0].data();
    const diasMora = Math.floor((hoy - new Date(masAntigua.fechaVencimiento)) / 86400000);

    let nuevoEstado = empresa.estadoPago;
    if (diasMora >= 40 || (diasMora >= 20 && vencidas >= 2)) nuevoEstado = 'suspendido';
    else if (diasMora >= 20) nuevoEstado = 'solo_lectura';
    else if (diasMora >= 1) nuevoEstado = 'alertado';

    if (nuevoEstado !== empresa.estadoPago) {
      await cambiarEstado(empresaRef, empresa.estadoPago, nuevoEstado, `Mora: ${diasMora} días, ${vencidas} facturas vencidas`);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};

async function cambiarEstado(ref, anterior, nuevo, motivo) {
  await ref.update({ estadoPago: nuevo, fechaUltimoCalculo: admin.firestore.Timestamp.now(), updatedAt: admin.firestore.Timestamp.now() });
  await ref.collection('historialEstados').add({
    estadoAnterior: anterior, estadoNuevo: nuevo, motivo,
    timestamp: admin.firestore.Timestamp.now(), origen: 'cron',
  });
}