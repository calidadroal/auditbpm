// src/components/Users/DocumentacionManager.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, query, where, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, uploadAuditPhoto } from '../../firebase';
import type { DocumentoUsuario } from '../../types';
import { Plus, Trash2, FileText, Upload, X, ExternalLink, Camera } from 'lucide-react';

interface DocumentacionManagerProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

const TIPOS_DOCUMENTO = [
  { value: 'dni' as const, label: '📇 DNI' },
  { value: 'certificado' as const, label: '📜 Certificado' },
  { value: 'contrato' as const, label: '📄 Contrato' },
  { value: 'otro' as const, label: '📎 Otro' },
];

const DocumentacionManager: React.FC<DocumentacionManagerProps> = ({ userId, userName, onClose }) => {
  const { user } = useAuth();
  const [documentos, setDocumentos] = useState<DocumentoUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<DocumentoUsuario['tipo']>('dni');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [archivoFile, setArchivoFile] = useState<File | null>(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadDocumentos();
  }, [userId]);

  const loadDocumentos = async () => {
    try {
      setLoading(true);
      const docRef = collection(db, 'documentosUsuarios');
      const q = query(docRef, where('userId', '==', userId), where('activo', '==', true), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentoUsuario));
      setDocumentos(data);
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setArchivoFile(files[0]);
      setArchivoSeleccionado(files[0].name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { alert('El nombre es requerido'); return; }
    if (!archivoFile) { alert('Seleccione un archivo o tome una foto'); return; }

    setUploading(true);
    try {
      const tempId = `doc_${Date.now()}`;
      const url = await uploadAuditPhoto(tempId, userId, archivoFile);

      const data: Omit<DocumentoUsuario, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        nombre: nombre.trim(),
        tipo,
        archivoURL: url,
        fechaVencimiento: fechaVencimiento || null,
        activo: true,
      };

      await addDoc(collection(db, 'documentosUsuarios'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await loadDocumentos();
      resetForm();
    } catch (error) {
      console.error('Error subiendo documento:', error);
      alert('Error al subir el documento');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('¿Desactivar este documento?')) return;
    try {
      const docRef = doc(db, 'documentosUsuarios', docId);
      await updateDoc(docRef, { activo: false, updatedAt: serverTimestamp() });
      await loadDocumentos();
    } catch (error) {
      console.error('Error eliminando documento:', error);
    }
  };

  const resetForm = () => {
    setNombre('');
    setTipo('dni');
    setFechaVencimiento('');
    setArchivoFile(null);
    setArchivoSeleccionado('');
    setShowForm(false);
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'dni': return 'bg-blue-100 text-blue-800';
      case 'certificado': return 'bg-green-100 text-green-800';
      case 'contrato': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
          <p className="text-red-600">Solo administradores pueden gestionar documentación</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-300 rounded-lg">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Documentación de {userName}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {documentos.length} documento{documentos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showForm && (
            <div className="bg-gray-50 border rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-4">📄 Subir nuevo documento</h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: DNI frente, Certificado manipulación..."
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo *</label>
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as DocumentoUsuario['tipo'])}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      {TIPOS_DOCUMENTO.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">📅 Fecha de vencimiento (opcional)</label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                
                {/* ✅ INPUT DE ARCHIVO MEJORADO */}
                <div>
                  <label className="block text-sm font-medium mb-1">📎 Archivo *</label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors">
                      <Camera className="w-5 h-5" />
                      <span>📸 Tomar foto o seleccionar archivo</span>
                      <input
                        type="file"
                        accept="image/*, .pdf, .doc, .docx"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    
                    {archivoSeleccionado && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium">{archivoSeleccionado}</span>
                        <button
                          type="button"
                          onClick={() => { setArchivoFile(null); setArchivoSeleccionado(''); }}
                          className="ml-auto text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">📱 En el celular se abrirá la cámara para tomar una foto</p>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 text-sm"
                  >
                    {uploading ? 'Subiendo...' : '✅ Subir documento'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1 text-sm"
            >
              <Upload className="w-4 h-4" /> 📄 Subir documento
            </button>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : documentos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay documentos cargados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documentos.map(docItem => (
                <div key={docItem.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium text-sm">{docItem.nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getTipoBadge(docItem.tipo)}`}>
                          {docItem.tipo}
                        </span>
                        {docItem.fechaVencimiento && (
                          <span className="text-xs text-gray-500">
                            Vence: {new Date(docItem.fechaVencimiento).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={docItem.archivoURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                      title="Ver documento"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(docItem.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Desactivar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentacionManager;