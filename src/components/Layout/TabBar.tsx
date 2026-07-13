// src/components/Layout/TabBar.tsx
import React from 'react';

interface Tab {
  id: string;
  lbl: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-4">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3 text-xs font-bold">
        {tabs.map(tb => {
          const Icon = tb.icon;
          const isActive = activeTab === tb.id;
          return (
            <button
              key={tb.id}
              onClick={() => onTabChange(tb.id)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border transition-all ${
                isActive 
                  ? 'bg-green-600 text-white border-transparent' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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