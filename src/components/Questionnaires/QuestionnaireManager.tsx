import React, { useState } from 'react';
import { FileSpreadsheet, Trash2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import ExcelImporter from './ExcelImporter';
import ManualCreator from './ManualCreator';

const QuestionnaireManager: React.FC = () => {
  const { questionnaires, activeUser, refreshData } = useAppContext();
  const [mode, setMode] = useState<'excel' | 'manual'>('excel');
  const [selectedId, setSelectedId] = useState('');

  const handleDelete = async (id: string) => {
    if (activeUser?.role === 'lector') {
      alert('Solo lectura');
      return;
    }
    if (!confirm('¿Eliminar este cuestionario?')) return;
    try {
      await fetch(`/api/questionnaires/${id}`, { method: 'DELETE' });
      await refreshData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lista de cuestionarios */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border shadow-sm">
          <h3 className="font-bold text-xs uppercase text-slate-500 border-b pb-1.5 mb-3">Cuestionarios Disponibles</h3>
          {questionnaires.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No hay cuestionarios creados</p>
          ) : (
            <div className="space-y-2">
              {questionnaires.map(q => (
                <div
                  key={q.id}
                  className={`p-3 border rounded-xl flex justify-between items-center ${
                    selectedId === q.id ? 'border-indigo-600 bg-indigo-50/10' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <h4 className="font-black text-xs flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                      {q.name}
                    </h4>
                    <p className="text-[10px] text-slate-400">{q.description}</p>
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {q.items?.length || 0} preguntas
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedId(q.id === selectedId ? '' : q.id)}
                      className="text-[10px] font-bold px-2 py-1 rounded border"
                    >
                      {selectedId === q.id ? 'Seleccionado' : 'Elegir'}
                    </button>
                    {q.isCustom && (
                      <button onClick={() => handleDelete(q.id)} className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Crear */}
        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-bold">
            <button
              onClick={() => setMode('excel')}
              className={`w-1/2 py-1 rounded ${mode === 'excel' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Importar Excel
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`w-1/2 py-1 rounded ${mode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              Crear Manual
            </button>
          </div>
          {mode === 'excel' ? <ExcelImporter /> : <ManualCreator />}
        </div>
      </div>
    </div>
  );
};

export default QuestionnaireManager;