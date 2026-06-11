import React from 'react';
import { useAppContext } from '../../context/AppContext';

const RecurrenceAnalysis: React.FC = () => {
  const { audits, sites } = useAppContext();

  const recurrenceMap: Record<string, { itemId: string; itemText: string; plantName: string; count: number; lastDate: string }> = {};

  audits.filter(a => a.isSubmitted && a.hasCriticalFailures).forEach(audit => {
    const site = sites.find(s => s.id === audit.siteId);
    const key = `${audit.siteId}-${audit.area}`;
    if (!recurrenceMap[key]) {
      recurrenceMap[key] = {
        itemId: 'PCC-' + audit.id.slice(0, 4),
        itemText: audit.area,
        plantName: site?.name || audit.siteName,
        count: 1,
        lastDate: audit.date
      };
    } else {
      recurrenceMap[key].count++;
      if (audit.date > recurrenceMap[key].lastDate) {
        recurrenceMap[key].lastDate = audit.date;
      }
    }
  });

  const items = Object.values(recurrenceMap);

  return (
    <div className="mt-6 bg-white p-4 rounded-xl border shadow-sm">
      <h3 className="font-bold text-sm text-slate-900 mb-3">Análisis de Recurrencia de Desvíos</h3>
      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase font-bold">
                <th className="p-2">Ref</th>
                <th className="p-2">Hallazgo</th>
                <th className="p-2">Planta</th>
                <th className="p-2">Repeticiones</th>
                <th className="p-2">Última fecha</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.itemId + item.plantName} className="border-t">
                  <td className="p-2 font-bold text-slate-700">{item.itemId}</td>
                  <td className="p-2">{item.itemText}</td>
                  <td className="p-2">{item.plantName}</td>
                  <td className="p-2 text-red-600 font-bold">{item.count}</td>
                  <td className="p-2">{item.lastDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-slate-400 p-4 text-center">No hay desvíos recurrentes registrados</p>
      )}
    </div>
  );
};

export default RecurrenceAnalysis;