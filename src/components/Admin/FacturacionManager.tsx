// src/components/Admin/FacturacionManager.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db, getFacturacionConfig, setFacturacionConfig, getFacturasByEmpresa, addHistorialEstado, updateEmpresa } from '../../firebase';
import type { Empresa, FacturacionConfig, Factura } from '../../types';

const FacturacionManager: React.FC = () => {
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [config, setConfig] = useState<FacturacionConfig | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [emails, setEmails] = useState('');
  const [diasAlerta, setDiasAlerta] = useState('0,20,30,40');
  const [suspensionAuto, setSuspensionAuto] = useState(true);
  const [arcaHabilitado, setArcaHabilitado] = useState(false);
  const [fechaLimite, setFechaLimite] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') loadEmpresas();
  }, [user]);

  const loadEmpresas = async () => {
    const snap = await getDocs(collection(db, 'empresas'));
    setEmpresas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Empresa)));
    setLoading(false);
  };

  const selectEmpresa = async (emp: Empresa) => {
    setSelectedEmpresa(emp);
    const cfg = await getFacturacionConfig(emp.id);
    setConfig(cfg);
    if (cfg) {
      setEmails(cfg.emailsDestino.join(', '));
      setDiasAlerta(cfg.diasAlerta.join(','));
      setSuspensionAuto(cfg.suspensionAutomatica);
      setArcaHabilitado(cfg.arcaHabilitado);
      setFechaLimite(cfg.fechaLimiteManual || '');
    } else {
      setEmails(emp.email);
      setDiasAlerta('0,20,30,40');
      setSuspensionAuto(true);
      setArcaHabilitado(false);
      setFechaLimite('');
    }
    const facts = await getFacturasByEmpresa(emp.id);
    setFacturas(facts);
  };

  const handleSaveConfig = async () => {
    if (!selectedEmpresa) return;
    setSaving(true);
    try {
      await setFacturacionConfig(selectedEmpresa.id, {
        emailsDestino: emails.split(',').map(e => e.trim()).filter(Boolean),
        diasAlerta: diasAlerta.split(',').map(d => parseInt(d.trim())).filter(n => !isNaN(n)),
        suspensionAutomatica: suspensionAuto,
        arcaHabilitado: arcaHabilitado,
        fechaLimiteManual: fechaLimite || null,
      });
      alert('Configuración guardada');
      const cfg = await getFacturacionConfig(selectedEmpresa.id);
      setConfig(cfg);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCambiarEstado = async (nuevoEstado: Empresa['estadoPago']) => {
    if (!selectedEmpresa) return;
    if (!confirm(`¿Cambiar a "${nuevoEstado.replace('_', ' ')}"?`)) return;
    try {
      await addHistorialEstado(selectedEmpresa.id, {
        estadoAnterior: selectedEmpresa.estadoPago,
        estadoNuevo: nuevoEstado,
        motivo: 'Cambio manual por administrador',
        origen: 'admin_manual',
      });
      await updateEmpresa(selectedEmpresa.id, { estadoPago: nuevoEstado });
      alert('Estado actualizado');
      setSelectedEmpresa({ ...selectedEmpresa, estadoPago: nuevoEstado });
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  if (user?.role !== 'admin') return <div className="p-6 text-red-600">Solo administradores.</div>;
  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Gestión de Facturación</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Empresa</label>
        <select
          value={selectedEmpresa?.id || ''}
          onChange={e => {
            const emp = empresas.find(em => em.id === e.target.value);
            if (emp) selectEmpresa(emp);
          }}
          className="w-full md:w-96 px-3 py-2 border rounded-lg"
        >
          <option value="">Seleccionar...</option>
          {empresas.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.nombre} ({emp.cuit})</option>
          ))}
        </select>
      </div>

      {selectedEmpresa && (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-3">Estado actual: <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              selectedEmpresa.estadoPago === 'al_dia' ? 'bg-green-100 text-green-800' :
              selectedEmpresa.estadoPago === 'alertado' ? 'bg-yellow-100 text-yellow-800' :
              selectedEmpresa.estadoPago === 'solo_lectura' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>{selectedEmpresa.estadoPago.replace('_', ' ')}</span></h3>
            <div className="flex gap-2 flex-wrap mt-3">
              <button onClick={() => handleCambiarEstado('al_dia')} className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">Al día</button>
              <button onClick={() => handleCambiarEstado('alertado')} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">Alertado</button>
              <button onClick={() => handleCambiarEstado('solo_lectura')} className="px-3 py-1 bg-orange-100 text-orange-800 rounded text-sm">Solo lectura</button>
              <button onClick={() => handleCambiarEstado('suspendido')} className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm">Suspendido</button>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Configuración de facturación</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Emails destino (separados por coma)</label>
                <input type="text" value={emails} onChange={e => setEmails(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Días de alerta (separados por coma)</label>
                <input type="text" value={diasAlerta} onChange={e => setDiasAlerta(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={suspensionAuto} onChange={e => setSuspensionAuto(e.target.checked)} className="h-4 w-4" />
                <label className="text-sm">Suspensión automática</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={arcaHabilitado} onChange={e => setArcaHabilitado(e.target.checked)} className="h-4 w-4" />
                <label className="text-sm">Emitir factura fiscal (ARCA)</label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha límite manual (opcional)</label>
                <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} className="px-3 py-2 border rounded-lg" />
              </div>
              <button onClick={handleSaveConfig} disabled={saving} className="px-6 py-2 bg-blue-500 text-white rounded-lg">
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Facturas</h3>
            {facturas.length === 0 ? (
              <p className="text-gray-400">Sin facturas registradas</p>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="py-2">N°</th>
                    <th className="py-2">Emisión</th>
                    <th className="py-2">Vencimiento</th>
                    <th className="py-2">Monto</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">CAE</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {facturas.map(f => (
                    <tr key={f.id} className="text-sm">
                      <td className="py-2">{f.numero}</td>
                      <td className="py-2">{f.fechaEmision}</td>
                      <td className="py-2">{f.fechaVencimiento}</td>
                      <td className="py-2">${f.monto}</td>
                      <td className="py-2 capitalize">{f.estado}</td>
                      <td className="py-2">{f.cae || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturacionManager;