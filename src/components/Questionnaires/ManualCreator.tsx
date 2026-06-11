import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { createQuestionnaire } from '../../firebase';

const ManualCreator: React.FC = () => {
  const { refreshData } = useAppContext();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [items, setItems] = useState([
    { text: '', description: '', standard: 'IRAM 14201', category: 'Inspección', critical: false }
  ]);
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    setItems([...items, { text: '', description: '', standard: 'IRAM 14201', category: 'Inspección', critical: false }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = items.filter(i => i.text.trim());
    if (!name.trim() || valid.length === 0) return alert('Completá nombre y al menos una pregunta');
    setSaving(true);
    try {
      const itemsWithIds = valid.map((item, i) => ({
        ...item,
        id: `manual-${Date.now()}-${i}`
      }));
      await createQuestionnaire({ name, description: desc, items: itemsWithIds, isCustom: true });
      setName(''); setDesc('');
      setItems([{ text: '', description: '', standard: 'IRAM 14201', category: 'Inspección', critical: false }]);
      await refreshData();
      alert('Cuestionario creado con éxito');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del cuestionario" className="w-full rounded border p-2 bg-white" required />
      <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Objetivos generales" className="w-full rounded border p-2 bg-white" />
      <div className="border-t pt-2 space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
          <span>Preguntas ({items.length})</span>
          <button type="button" onClick={addItem} className="text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Añadir</button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <div key={idx} className="p-2 border rounded bg-slate-50 space-y-1 text-[11px]">
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>Pregunta #{idx + 1}</span>
                <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:underline flex items-center gap-0.5"><Trash2 className="w-3 h-3" /> Quitar</button>
              </div>
              <input type="text" value={item.text} onChange={(e) => updateItem(idx, 'text', e.target.value)} placeholder="Ej: ¿El personal usa cofia?" className="w-full rounded border p-1 bg-white" required />
              <input type="text" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Instrucción de control" className="w-full rounded border p-1 bg-white" />
              <div className="flex gap-2">
                <select value={item.standard} onChange={(e) => updateItem(idx, 'standard', e.target.value)} className="rounded border p-1 bg-white text-[10px] flex-1">
                  <option>IRAM 14201</option>
                  <option>IRAM 14301</option>
                  <option>ISO 9001</option>
                  <option>ISO 45001</option>
                </select>
                <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                  <input type="checkbox" checked={item.critical} onChange={(e) => updateItem(idx, 'critical', e.target.checked)} className="rounded" /> ¿Crítico?
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button type="submit" disabled={saving} className="w-full py-2 bg-blue-600 text-white font-bold rounded text-xs">
        {saving ? 'Guardando...' : 'Crear Cuestionario'}
      </button>
    </form>
  );
};

export default ManualCreator;