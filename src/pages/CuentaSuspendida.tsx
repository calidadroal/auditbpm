// src/pages/CuentaSuspendida.tsx
import React from 'react';
import { ShieldAlert } from 'lucide-react';

const CuentaSuspendida: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
        <ShieldAlert className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 className="text-3xl font-black text-slate-900 mb-4">Cuenta Suspendida</h1>
        <p className="text-sm text-slate-600 mb-6">
          Tu empresa tiene facturas pendientes de pago. El acceso al sistema ha sido suspendido temporalmente.
        </p>
        <a
          href="mailto:todoenregla.app@gmail.com"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
        >
          Contactar para regularizar
        </a>
      </div>
    </div>
  );
};

export default CuentaSuspendida;