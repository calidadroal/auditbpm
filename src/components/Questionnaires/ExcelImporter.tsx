// src/components/Questionnaires/ExcelImporter.tsx
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { QuestionnaireQuestion, NivelDesvio, NivelRiesgoMunicipal } from '../../types';

interface ExcelImporterProps {
  norma: string;
  onImport: (questions: QuestionnaireQuestion[]) => void;
  onClose: () => void;
  sectorizado?: boolean;
  esChecklist?: boolean;
}

const ExcelImporter: React.FC<ExcelImporterProps> = ({ norma, onImport, onClose, sectorizado = false, esChecklist = false }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<QuestionnaireQuestion[]>([]);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<any>(sheet);

      const questions: QuestionnaireQuestion[] = json.map((row, index) => ({
        id: `q_${Date.now()}_${index}`,
        text: row['Pregunta'] || row['pregunta'] || '',
        type: 'cumplimiento',
        required: true,
        requirePhoto: row['Requiere Foto'] === 'SI' || row['requiereFoto'] === 'SI',
        requireComment: row['Requiere Comentario'] === 'SI' || row['requiereComentario'] === 'SI',
        instructions: row['Instrucciones'] || row['instrucciones'] || '',
        norma: row['Norma'] || row['norma'] || norma,
        puntoNorma: row['Punto Norma'] || row['puntoNorma'] || '',
        esCriticoInocuidad: !esChecklist && (row['Crítico Inocuidad'] === 'SI' || row['criticoInocuidad'] === 'SI'),
        nivelDesvio: esChecklist ? 'ninguno' : ((row['Nivel Desvío'] || row['nivelDesvio'] || 'ninguno') as NivelDesvio),
        nivelRiesgoMunicipal: esChecklist ? ((row['Nivel Riesgo'] || row['nivelRiesgo'] || 'bajo') as NivelRiesgoMunicipal) : undefined,
        minimumTimeSeconds: parseInt(row['Tiempo Mín (seg)'] || row['tiempoMin'] || '0') || 0,
        group: sectorizado ? (row['Grupo'] || row['grupo'] || '') : undefined,
        order: index
      }));

      setPreview(questions);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    onImport(preview);
    onClose();
  };

  const handleDownloadTemplate = () => {
    let template: any[];
    
    if (esChecklist) {
      template = [
        {
          'Pregunta': '¿La salida de emergencia está señalizada?',
          'Punto Norma': 'Art. 12 - Salidas de emergencia',
          'Norma': norma,
          'Instrucciones': 'Verificar cartel luminoso y puerta sin obstrucciones',
          'Nivel Riesgo': 'critico',
          'Requiere Foto': 'SI',
          'Requiere Comentario': 'SI',
          'Tiempo Mín (seg)': '20'
        },
        {
          'Pregunta': '¿Los extintores tienen carga vigente?',
          'Punto Norma': 'Art. 15 - Protección contra incendios',
          'Norma': norma,
          'Instrucciones': 'Verificar fecha de carga en el marbete',
          'Nivel Riesgo': 'critico',
          'Requiere Foto': 'SI',
          'Requiere Comentario': 'NO',
          'Tiempo Mín (seg)': '15'
        },
        {
          'Pregunta': '¿Hay agua caliente en los baños del personal?',
          'Punto Norma': 'Art. 22 - Condiciones sanitarias',
          'Norma': norma,
          'Instrucciones': 'Abrir canilla y verificar temperatura',
          'Nivel Riesgo': 'medio',
          'Requiere Foto': 'NO',
          'Requiere Comentario': 'SI',
          'Tiempo Mín (seg)': '10'
        },
        {
          'Pregunta': '¿El piso de la cocina está en buen estado?',
          'Punto Norma': 'Art. 8 - Instalaciones',
          'Norma': norma,
          'Instrucciones': 'Revisar grietas, roturas o desniveles',
          'Nivel Riesgo': 'bajo',
          'Requiere Foto': 'NO',
          'Requiere Comentario': 'NO',
          'Tiempo Mín (seg)': '5'
        }
      ];
    } else {
      template = sectorizado ? [
        { 'Grupo': 'Recepcion', 'Pregunta': '¿El personal utiliza cofia y guantes?', 'Punto Norma': '7.1 - Uso de EPP', 'Norma': norma, 'Instrucciones': 'Observar al personal en sus puestos', 'Crítico Inocuidad': 'SI', 'Nivel Desvío': 'critico', 'Requiere Foto': 'SI', 'Requiere Comentario': 'SI', 'Tiempo Mín (seg)': '30' },
        { 'Grupo': 'Cocina', 'Pregunta': '¿La temperatura de la heladera es adecuada?', 'Punto Norma': 'Art. 33 - Control de temperatura', 'Norma': norma, 'Instrucciones': 'Medir con termómetro calibrado', 'Crítico Inocuidad': 'SI', 'Nivel Desvío': 'critico', 'Requiere Foto': 'SI', 'Requiere Comentario': 'NO', 'Tiempo Mín (seg)': '20' }
      ] : [
        { 'Pregunta': '¿El personal utiliza cofia y guantes?', 'Punto Norma': '7.1 - Uso de EPP', 'Norma': norma, 'Instrucciones': 'Observar al personal en sus puestos', 'Crítico Inocuidad': 'SI', 'Nivel Desvío': 'critico', 'Requiere Foto': 'SI', 'Requiere Comentario': 'SI', 'Tiempo Mín (seg)': '30' },
        { 'Pregunta': '¿La temperatura de la heladera es adecuada?', 'Punto Norma': 'Art. 33 - Control de temperatura', 'Norma': norma, 'Instrucciones': 'Medir con termómetro calibrado', 'Crítico Inocuidad': 'SI', 'Nivel Desvío': 'critico', 'Requiere Foto': 'SI', 'Requiere Comentario': 'NO', 'Tiempo Mín (seg)': '20' }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Preguntas');
    
    if (esChecklist) {
      ws['!cols'] = [{ wch: 50 }, { wch: 30 }, { wch: 20 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
    } else if (sectorizado) {
      ws['!cols'] = [{ wch: 15 }, { wch: 50 }, { wch: 30 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
    } else {
      ws['!cols'] = [{ wch: 50 }, { wch: 30 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
    }

    const fileName = esChecklist ? 'plantilla_checklist_municipal.xlsx' : sectorizado ? 'plantilla_cuestionario_sectorizado.xlsx' : 'plantilla_cuestionario.xlsx';
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Importar desde Excel {esChecklist ? '(Checklist Municipal)' : sectorizado ? '(Sectorizado)' : ''}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="mb-4 flex space-x-3">
          <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
            📥 Descargar Plantilla
          </button>
          <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
            📁 Subir Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
        </div>

        {fileName && <p className="text-sm text-gray-600 mb-3">Archivo: <strong>{fileName}</strong></p>}

        {preview.length > 0 && (
          <>
            <div className="mb-4">
              <p className="font-medium text-sm mb-2">Vista previa ({preview.length} preguntas):</p>
              <div className="max-h-60 overflow-y-auto border rounded">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">#</th>
                      {sectorizado && <th className="px-2 py-1 text-left">Grupo</th>}
                      <th className="px-2 py-1 text-left">Pregunta</th>
                      <th className="px-2 py-1 text-left">Punto Norma</th>
                      {esChecklist ? (
                        <th className="px-2 py-1 text-center">Riesgo</th>
                      ) : (
                        <th className="px-2 py-1 text-center">Crítico</th>
                      )}
                      <th className="px-2 py-1 text-center">Foto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.map((q, i) => (
                      <tr key={q.id}>
                        <td className="px-2 py-1">{i + 1}</td>
                        {sectorizado && <td className="px-2 py-1 font-medium text-blue-600">{q.group || '-'}</td>}
                        <td className="px-2 py-1">{q.text}</td>
                        <td className="px-2 py-1">{q.puntoNorma}</td>
                        {esChecklist ? (
                          <td className="px-2 py-1 text-center">
                            {q.nivelRiesgoMunicipal === 'critico' ? '🔴' : q.nivelRiesgoMunicipal === 'medio' ? '🟡' : '🟢'}
                          </td>
                        ) : (
                          <td className="px-2 py-1 text-center">{q.esCriticoInocuidad ? '🚨' : '-'}</td>
                        )}
                        <td className="px-2 py-1 text-center">{q.requirePhoto ? '📸' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex space-x-3">
              <button onClick={handleConfirmImport} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                ✅ Importar {preview.length} preguntas
              </button>
              <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExcelImporter;