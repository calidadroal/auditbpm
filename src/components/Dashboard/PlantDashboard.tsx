import React from 'react';
import { useAppContext } from '../../context/AppContext';

const PlantDashboard: React.FC = () => {
  const { audits, sites } = useAppContext();

  const plantData = sites.map(site => {
    const siteAudits = audits.filter(a => a.siteId === site.id && a.isSubmitted);
    const avgScore = siteAudits.length
      ? Math.round(siteAudits.reduce((sum, a) => sum + (a.score || 0), 0) / siteAudits.length)
      : 0;
    return { ...site, avgScore, total: siteAudits.length };
  });

  if (plantData.length === 0) {
    return (
      <div className="mt-6 bg-white p-4 rounded-xl border shadow-sm">
        <h3 className="font-bold text-sm text-slate-900 mb-2">Desempeño por Planta</h3>
        <p className="text-xs text-slate-400">No hay plantas configuradas</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="font-bold text-sm text-slate-900 mb-3">Desempeño por Planta</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plantData.map(plant => (
          <div key={plant.id} className="bg-white p-4 rounded-xl border">
            <h4 className="font-extrabold text-xs text-slate-900">{plant.name}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">{plant.description}</p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs">Cumplimiento: <strong>{plant.avgScore}%</strong></span>
              <span className="text-xs text-slate-400">{plant.total} auditorías</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${plant.avgScore}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlantDashboard;