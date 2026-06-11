import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { calculateRiskLevel } from '../../utils/calculations';

const GlobalDashboard: React.FC = () => {
  const { stats, notifications } = useAppContext();
  const unread = notifications.filter(n => !n.read).length;
  const risk = calculateRiskLevel(stats.averageScore || 0, unread > 0);

  const riskColor = risk === 'Alto' ? 'bg-red-100 text-red-800' : risk === 'Medio' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800';

  return (
    <div>
      <h2 className="font-extrabold text-sm text-slate-900 mb-3">Resumen Global del Sistema</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Cumplimiento Promedio</span>
          <span className="text-xl font-black text-slate-900 block">{stats.averageScore || 0}%</span>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Auditorías</span>
          <span className="text-xl font-black text-slate-900 block">{stats.totalAudits || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Riesgo IA</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${riskColor} inline-block mt-1`}>{risk.toUpperCase()}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-bold">Hallazgos Críticos</span>
          <span className="text-xl font-black text-red-600 block">{unread}</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalDashboard;