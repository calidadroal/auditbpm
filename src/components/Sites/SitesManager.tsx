import React, { useState } from 'react';
import { MapPin, Home, Plus, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const SitesManager: React.FC = () => {
  const { sites, activeUser, refreshData } = useAppContext();
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSectors, setNewSectors] = useState('');
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeUser?.role === 'lector') {
      alert('Solo lectura: no puedes crear sitios.');
      return;
    }
    const sectorsArr = newSectors.split(',').map(s => s.trim()).filter(Boolean);
    if (!newName.trim() || sectorsArr.length === 0) {
      alert('Completá nombre y al menos un sector');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc, sectors: sectorsArr })
      });
      if (!res.ok) throw new Error('Error al guardar');
      setNewName('');
      setNewDesc('');
      setNewSectors('');
      await refreshData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lista de sitios */}
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border shadow-sm">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b pb-2 mb-3">
            <Home className="w-4 h-4 text-indigo-600" />
            Establecimientos
          </h3>
          {sites.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No hay plantas configuradas</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sites.map(s => (
                <div
                  key={s.id}
                  onClick={() => setSelectedSite(s.id === selectedSite ? '' : s.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedSite === s.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <h4 className="font-extrabold text-xs flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    {s.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.description}</p>
                  <div className="mt-2 pt-2 border-t">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Sectores:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.sectors.map(sec => (
                        <span key={sec} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulario nuevo sitio */}
        <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3.5">
          <h3 className="font-bold text-xs uppercase text-slate-500 border-b pb-1">Nuevo Establecimiento</h3>
          <form onSubmit={handleCreateSite} className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-400">Nombre</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Planta San Miguel"
                className="w-full rounded border border-slate-200 mt-1 h-9 p-2 bg-white"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-400">Descripción</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Planta principal de distribución"
                className="w-full rounded border border-slate-200 mt-1 h-9 p-2 bg-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-400">Sectores (separados por coma)</label>
              <input
                type="text"
                value={newSectors}
                onChange={(e) => setNewSectors(e.target.value)}
                placeholder="Cocina, Cámaras, Depósito"
                className="w-full rounded border border-slate-200 mt-1 h-9 p-2 bg-white"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2 bg-indigo-600 text-white font-bold rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Registrar Sitio'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SitesManager;