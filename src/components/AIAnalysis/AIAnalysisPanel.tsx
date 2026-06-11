import React, { useState } from 'react';
import { Bot, RefreshCw, History, Info, Sparkles } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import { calculateRiskLevel } from '../../utils/calculations';
import { db } from '../../firebase';
import { analyzeAuditWithGemini } from '../../gemini';

const AIAnalysisPanel: React.FC = () => {
  const { audits, selectedAuditId, setSelectedAuditId, refreshData } = useAppContext();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const submittedAudits = audits.filter(a => a.isSubmitted);
  const selectedAudit = audits.find(a => a.id === selectedAuditId);

  const triggerAnalysis = async () => {
    if (!selectedAuditId || !selectedAudit) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeAuditWithGemini(selectedAudit);
      if (analysis) {
        await updateDoc(doc(db, 'audits', selectedAuditId), { aiAnalysis: analysis });
        await refreshData();
      } else {
        alert('No se pudo completar el análisis. Reintentá en unos segundos.');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const risk = selectedAudit ? calculateRiskLevel(selectedAudit.score || 0, selectedAudit.hasCriticalFailures || false) : 'N/A';
  const riskColor = risk === 'Alto' ? 'bg-red-100 text-red-800' : risk === 'Medio' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800';

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-xl border flex flex-col md:flex-row justify-between items-center gap-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900">Análisis Avanzado con IA</h3>
          <p className="text-xs text-slate-400">Diagnóstico de causa raíz y planes de acción</p>
        </div>
        <select
          value={selectedAuditId || ''}
          onChange={(e) => setSelectedAuditId(e.target.value)}
          className="text-xs font-bold rounded border bg-white h-9 p-1"
        >
          <option value="">Seleccionar auditoría</option>
          {submittedAudits.map(a => (
            <option key={a.id} value={a.id}>{a.date} | {a.area} ({a.score}%)</option>
          ))}
        </select>
      </div>

      {selectedAudit ? (
        <div className="space-y-5">
          <div className="bg-slate-900 text-white rounded-xl overflow-hidden">
            <div className="bg-blue-900 p-5 flex justify-between items-center">
              <div>
                <span className="bg-blue-600 text-[10px] font-black px-2 py-0.5 rounded">DIAGNÓSTICO: {selectedAudit.area}</span>
                <h2 className="text-lg font-bold mt-1 flex items-center gap-1.5">
                  <Bot className="w-5 h-5 text-blue-300" /> Executive Insights AI
                </h2>
              </div>
              <button
                onClick={triggerAnalysis}
                disabled={isAnalyzing}
                className="bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analizando...' : 'Actualizar'}
              </button>
            </div>
            <div className="p-5">
              <p className="font-bold text-blue-300 text-xs mb-1.5 uppercase">Resumen Ejecutivo</p>
              <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                {selectedAudit.aiAnalysis?.executiveSummary || `Auditoría realizada el ${selectedAudit.date} en ${selectedAudit.area}. Puntuación: ${selectedAudit.score}%. `}
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${riskColor}`}>Riesgo: {risk}</span>
                {selectedAudit.hasCriticalFailures ? ' ⚠️ Se detectaron hallazgos críticos.' : ' No se detectaron desvíos críticos.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <h4 className="font-extrabold text-xs text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" /> Recurrencia de Fallos
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedAudit.aiAnalysis?.recurrenceAnalysis || 'Sin datos de recurrencia. Ejecutá el análisis para obtener resultados.'}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <h4 className="font-extrabold text-xs text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600" /> Causa Raíz (5 Porqués)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selectedAudit.aiAnalysis?.rootCauseAnalysis || 'Sin análisis de causa raíz. Ejecutá el análisis para obtener resultados con metodología 5 Porqués.'}
              </p>
            </div>
          </div>

          {selectedAudit.aiAnalysis?.suggestedActionPlans && selectedAudit.aiAnalysis.suggestedActionPlans.length > 0 && (
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <h4 className="font-bold text-sm text-slate-900 border-b pb-1.5 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" /> Acciones Correctivas Sugeridas
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase font-bold">
                      <th className="p-2">Ítem</th>
                      <th className="p-2">Hallazgo</th>
                      <th className="p-2">Acción Correctiva</th>
                      <th className="p-2">Acción Preventiva</th>
                      <th className="p-2">Responsable</th>
                      <th className="p-2">Plazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAudit.aiAnalysis.suggestedActionPlans.map((plan: any, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-bold">{plan.itemId}</td>
                        <td className="p-2">{plan.itemText}</td>
                        <td className="p-2 text-blue-700 font-bold">{plan.correctiveAction}</td>
                        <td className="p-2 text-emerald-700 font-bold">{plan.preventiveAction}</td>
                        <td className="p-2">{plan.responsible}</td>
                        <td className="p-2 text-center">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-[10px]">{plan.termDays} días</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl border text-center text-slate-400">
          <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm">Seleccioná una auditoría para ver el análisis de IA</p>
          <p className="text-xs mt-1">Los diagnósticos incluyen causa raíz, recurrencia y planes de acción</p>
        </div>
      )}
    </div>
  );
};

export default AIAnalysisPanel;