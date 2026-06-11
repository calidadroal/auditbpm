import React from 'react';
import { useAppContext } from '../../context/AppContext';

const SystemAnalysis: React.FC = () => {
  const { stats } = useAppContext();
  const standardsBreakdown = stats.standardsBreakdown || {};

  return (
    <div className="mt-6 bg-white p-4 rounded-xl border shadow-sm">
      <h3 className="font-bold text-sm text-slate-900 mb-3">Análisis del Sistema Integrado de Gestión</h3>
      <p className="text-xs text-slate-500 mb-3">Conformidad por normativa aplicable</p>
      {Object.keys(standardsBreakdown).length > 0 ? (
        <div className="space-y-3">
          {Object.entries(standardsBreakdown).map(([norm, val]) => (
            <div key={norm} className="text-xs">
              <div className="flex justify-between font-bold mb-1">
                <span>{norm}</span>
                <span>{val as number}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${val}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">Cargando datos de normativas...</p>
      )}
    </div>
  );
};

export default SystemAnalysis;