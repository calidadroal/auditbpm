import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, Download } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { createQuestionnaire } from '../../firebase';

const ExcelImporter: React.FC = () => {
  const { refreshData } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }) as any[][];
        if (rows.length <= 1) return alert('Excel vacío');
        const headers = rows[0].map((h: string) => String(h).toLowerCase().trim());
        const txtIdx = headers.findIndex((h: string) => h.includes('preg') || h.includes('item') || h.includes('text'));
        const descIdx = headers.findIndex((h: string) => h.includes('desc') || h.includes('instru'));
        const stdIdx = headers.findIndex((h: string) => h.includes('norm') || h.includes('stand'));
        const catIdx = headers.findIndex((h: string) => h.includes('cat') || h.includes('rubro'));
        const critIdx = headers.findIndex((h: string) => h.includes('crit'));

        const items: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || !r[txtIdx]) continue;
          items.push({
            id: `excel-${Date.now()}-${i}`,
            text: String(r[txtIdx]).trim(),
            description: descIdx !== -1 && r[descIdx] ? String(r[descIdx]).trim() : 'Control obligatorio',
            standard: stdIdx !== -1 && r[stdIdx] ? String(r[stdIdx]).trim() : 'IRAM 14201',
            category: catIdx !== -1 && r[catIdx] ? String(r[catIdx]).trim() : 'Inspección',
            critical: critIdx !== -1 && r[critIdx] ? ['si', 'true', '1'].includes(String(r[critIdx]).toLowerCase().trim()) : false
          });
        }
        setQuestions(items);
        setName(f.name.replace(/\.[^/.]+$/, ''));
        setDesc(`Importado de: ${f.name}`);
      } catch (err: any) {
        alert('Error al leer Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(f);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || questions.length === 0) return alert('Cargá el Excel primero');
    setSaving(true);
    try {
      await createQuestionnaire({ name, description: desc, items: questions, isCustom: true });
      setName(''); setDesc(''); setQuestions([]); setFile(null);
      await refreshData();
      alert('Cuestionario importado con éxito');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const sample = [
      ['Pregunta', 'Instruccion', 'Normativa', 'Rubro', 'Critico'],
      ['¿Está limpia la cocina?', 'Inspección visual', 'IRAM 14201', 'Higiene', 'SI'],
      ['¿Usan cofia y barbijo?', 'Verificar EPP', 'IRAM 14201', 'Personal', 'NO']
    ];
    const ws = XLSX.utils.aoa_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Preguntas');
    XLSX.writeFile(wb, 'plantilla_cuestionario.xlsx');
  };

  return (
    <div className="space-y-3.5">
      <p className="text-[11px] text-slate-400">Importá preguntas desde un Excel</p>
      <button onClick={downloadTemplate} className="text-[11px] underline font-bold text-emerald-700 flex items-center gap-1">
        <Download className="w-3.5 h-3.5" /> Descargar plantilla
      </button>
      <div className="border border-dashed p-5 text-center rounded bg-slate-50 relative">
        <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1" />
        <span className="text-[11px] text-slate-500 block font-bold">Seleccionar Excel</span>
        {file && <span className="text-[10px] text-blue-600 block mt-1.5">{file.name}</span>}
      </div>
      {questions.length > 0 && (
        <form onSubmit={handleSave} className="space-y-3 border-t pt-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del cuestionario" className="w-full text-xs rounded border p-2 bg-white" required />
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción" className="w-full text-xs rounded border p-2 bg-white" />
          <p className="text-[10px] text-slate-400">{questions.length} preguntas detectadas</p>
          <button type="submit" disabled={saving} className="w-full py-2 bg-blue-600 text-white font-bold rounded text-xs">
            {saving ? 'Guardando...' : `Importar ${questions.length} preguntas`}
          </button>
        </form>
      )}
    </div>
  );
};

export default ExcelImporter;