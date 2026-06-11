import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { TrendingUp, ListChecks, Home, FileSpreadsheet, Bot, ShieldAlert, User } from 'lucide-react';

const tabs = [
  { id: 'indicadores', lbl: 'Indicadores', icon: TrendingUp },
  { id: 'auditoria', lbl: 'Nueva Recorrida', icon: ListChecks },
  { id: 'sitios', lbl: 'Sitios', icon: Home },
  { id: 'cuestionarios', lbl: 'Cuestionarios', icon: FileSpreadsheet },
  { id: 'analisis-ia', lbl: 'Informe IA', icon: Bot },
  { id: 'notificaciones', lbl: 'Hallazgos', icon: ShieldAlert },
  { id: 'usuarios', lbl: 'Usuarios', icon: User },
];

const TabBar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppContext();

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3 text-xs font-bold">
        {tabs.map(tb => {
          const Icon = tb.icon;
          const isActive = activeTab === tb.id;
          return (
            <button
              key={tb.id}
              onClick={() => setActiveTab(tb.id)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border transition-all ${
                isActive ? 'bg-blue-600 text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tb.lbl}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabBar;