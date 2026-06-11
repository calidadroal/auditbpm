import React from 'react';
import { RefreshCw } from 'lucide-react';

const LoadingOverlay: React.FC = () => (
  <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-6 text-center shadow-2xl">
      <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
      <h3 className="font-bold text-slate-900">Cargando...</h3>
      <p className="text-xs text-slate-400 mt-1">Sincronizando datos</p>
    </div>
  </div>
);

export default LoadingOverlay;