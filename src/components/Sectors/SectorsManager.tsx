// src/components/Sectors/SectorsManager.tsx
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  getSectors,
  createSector,
  updateSector,
  deleteSector,
  generateNewQRToken
} from '../../firebase';
import { generarQRPDF } from '../../utils/qrPdfGenerator';
import type { SectorQR } from '../../types';
import { Download, RefreshCw, Copy } from 'lucide-react';

const SectorsManager: React.FC = () => {
  const { sites, isAdmin } = useAppContext();
  const { user } = useAuth();
  const [sectors, setSectors] = useState<SectorQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSector, setEditingSector] = useState<SectorQR | null>(null);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [active, setActive] = useState(true);

  const isAdminUser = user?.role === 'admin';
  const isGestor = user?.role === 'gestor';
  const canEdit = isAdminUser || isGestor;
  const userSites = user?.assignedSites || [];
  const availableSites = isAdminUser ? sites : sites.filter(s => userSites.includes(s.id));

  useEffect(() => { loadSectors(); }, []);

  const loadSectors = async () => {
    try {
      setLoading(true);
      const sectorsData = await getSectors();
      if (isAdminUser) setSectors(sectorsData);
      else setSectors(sectorsData.filter(s => userSites.includes(s.siteId)));
    } catch (error) { console.error('Error cargando sectores:', error); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setName(''); setSelectedSiteId(''); setActive(true);
    setEditingSector(null); setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedSiteId) { alert('Complete todos los campos'); return; }
    try {
      if (editingSector) { await updateSector(editingSector.id, { name, siteId: selectedSiteId, active }); }
      else { await createSector({ name, siteId: selectedSiteId, active: true }); }
      await loadSectors(); resetForm();
    } catch (error) { console.error('Error guardando sector:', error); alert('Error al guardar el sector'); }
  };

  const handleEdit = (sector: SectorQR) => {
    setEditingSector(sector); setName(sector.name);
    setSelectedSiteId(sector.siteId); setActive(sector.active); setShowForm(true);
  };

  const handleDelete = async (sectorId: string) => {
    if (!window.confirm('¿Desactivar este sector?')) return;
    try { await deleteSector(sectorId); await loadSectors(); }
    catch (error) { console.error('Error eliminando sector:', error); alert('Error al eliminar el sector'); }
  };

  const handleRegenerateQR = async (sectorId: string) => {
    if (!window.confirm('¿Generar nuevo QR? El anterior dejará de funcionar.')) return;
    try {
      const newToken = await generateNewQRToken(sectorId);
      alert(`✅ Nuevo token QR generado:\n\n${newToken}\n\nEl token fue copiado al portapapeles.`);
      await navigator.clipboard.writeText(newToken); await loadSectors();
    } catch (error) { console.error('Error generando QR:', error); alert('Error al generar nuevo QR'); }
  };

  const handleCopyToken = async (token: string) => {
    try { await navigator.clipboard.writeText(token); alert('✅ Token copiado al portapapeles'); }
    catch (error) {
      const textArea = document.createElement('textarea'); textArea.value = token;
      document.body.appendChild(textArea); textArea.select();
      document.execCommand('copy'); document.body.removeChild(textArea);
      alert('✅ Token copiado al portapapeles');
    }
  };

  const handleDownloadQR = async (sector: SectorQR) => {
    const site = sites.find(s => s.id === sector.siteId);
    if (!site) { alert('No se encontró el sitio asociado'); return; }
    setGeneratingQR(sector.id);
    try {
      await generarQRPDF({
        siteName: site.name, sectorName: sector.name, qrToken: sector.qrToken,
        instructions: '1. Escanee este código QR con la app\n2. Inicie la auditoría correspondiente\n3. Complete el cuestionario\n4. Finalice y genere el informe'
      });
    } catch (error) { console.error('Error generando PDF:', error); alert('Error al generar el PDF del QR'); }
    finally { setGeneratingQR(null); }
  };

  if (!canEdit && !isAdminUser) {
    return (
      <div className="p-6"><div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-600">No tenés permisos para gestionar sectores</p></div></div>
    );
  }

  if (loading) {
    return <div className="p-6"><div className="animate-pulse"><div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div></div></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Sectores QR</h2>
        {canEdit && (
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            {showForm ? 'Cancelar' : '+ Nuevo Sector'}
          </button>
        )}
      </div>

      {showForm && canEdit && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">{editingSector ? 'Editar Sector' : 'Nuevo Sector'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Sector</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Ej: Cocina, Salón, Barra..." required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sitio</label>
              <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required>
                <option value="">Seleccionar sitio...</option>
                {availableSites.filter(s => s.active).map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </div>
            {editingSector && (
              <div><label className="flex items-center space-x-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="form-checkbox h-5 w-5" /><span className="text-sm font-medium">Activo</span></label></div>
            )}
            <div className="flex space-x-4">
              <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">{editingSector ? 'Guardar Cambios' : 'Crear Sector'}</button>
              <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sector</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sitio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">QR Token</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sectors.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">No hay sectores creados</td></tr>
              ) : (
                sectors.map(sector => {
                  const site = sites.find(s => s.id === sector.siteId);
                  return (
                    <tr key={sector.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{sector.name}</td>
                      <td className="px-6 py-4">{site?.name || sector.siteId}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">{sector.qrToken.substring(0, 12)}...</code>
                          <button type="button" onClick={() => handleCopyToken(sector.qrToken)} className="text-blue-500 hover:text-blue-700 text-xs underline flex items-center gap-1" title="Copiar token completo"><Copy className="w-3 h-3" /> Copiar</button>
                        </div>
                      </td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs ${sector.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{sector.active ? 'Activo' : 'Inactivo'}</span></td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => handleDownloadQR(sector)} disabled={generatingQR === sector.id} className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 disabled:bg-gray-300"><Download className="w-3 h-3" />{generatingQR === sector.id ? '...' : 'Descargar QR'}</button>
                          {canEdit && (
                            <>
                              <button onClick={() => handleEdit(sector)} className="text-blue-600 hover:text-blue-800 text-xs">Editar</button>
                              <button onClick={() => handleRegenerateQR(sector.id)} className="flex items-center gap-1 text-purple-600 hover:text-purple-800 text-xs"><RefreshCw className="w-3 h-3" />Nuevo QR</button>
                              <button onClick={() => handleDelete(sector.id)} className="text-red-600 hover:text-red-800 text-xs">Desactivar</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SectorsManager;