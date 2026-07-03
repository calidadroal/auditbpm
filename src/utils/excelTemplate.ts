// src/utils/excelTemplate.ts
import * as XLSX from 'xlsx';

export function descargarPlantilla(norma: string, sectorizado: boolean = false) {
  const template = sectorizado ? [
    {
      'Grupo': 'Recepcion',
      'Pregunta': '¿El personal utiliza cofia y guantes?',
      'Punto Norma': '7.1 - Uso de EPP',
      'Norma': norma,
      'Instrucciones': 'Observar al personal en sus puestos de trabajo',
      'Crítico Inocuidad': 'SI',
      'Nivel Desvío': 'critico',
      'Requiere Foto': 'SI',
      'Requiere Comentario': 'SI',
      'Tiempo Mín (seg)': '30'
    },
    {
      'Grupo': 'Cocina',
      'Pregunta': '¿La temperatura de la heladera es adecuada?',
      'Punto Norma': 'Art. 33 - Control de temperatura',
      'Norma': norma,
      'Instrucciones': 'Medir con termómetro calibrado',
      'Crítico Inocuidad': 'SI',
      'Nivel Desvío': 'critico',
      'Requiere Foto': 'SI',
      'Requiere Comentario': 'NO',
      'Tiempo Mín (seg)': '20'
    },
    {
      'Grupo': 'Deposito',
      'Pregunta': '¿Las superficies de trabajo están limpias?',
      'Punto Norma': '5.1 - Limpieza y desinfección',
      'Norma': norma,
      'Instrucciones': 'Verificar visualmente y con hisopado si es necesario',
      'Crítico Inocuidad': 'NO',
      'Nivel Desvío': 'mayor',
      'Requiere Foto': 'NO',
      'Requiere Comentario': 'NO',
      'Tiempo Mín (seg)': '10'
    }
  ] : [
    {
      'Pregunta': '¿El personal utiliza cofia y guantes?',
      'Punto Norma': '7.1 - Uso de EPP',
      'Norma': norma,
      'Instrucciones': 'Observar al personal en sus puestos de trabajo',
      'Crítico Inocuidad': 'SI',
      'Nivel Desvío': 'critico',
      'Requiere Foto': 'SI',
      'Requiere Comentario': 'SI',
      'Tiempo Mín (seg)': '30'
    },
    {
      'Pregunta': '¿La temperatura de la heladera es adecuada?',
      'Punto Norma': 'Art. 33 - Control de temperatura',
      'Norma': norma,
      'Instrucciones': 'Medir con termómetro calibrado',
      'Crítico Inocuidad': 'SI',
      'Nivel Desvío': 'critico',
      'Requiere Foto': 'SI',
      'Requiere Comentario': 'NO',
      'Tiempo Mín (seg)': '20'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  ws['!cols'] = sectorizado ? [
    { wch: 15 }, { wch: 50 }, { wch: 30 }, { wch: 20 }, { wch: 40 },
    { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
  ] : [
    { wch: 50 }, { wch: 30 }, { wch: 20 }, { wch: 40 },
    { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Preguntas');
  XLSX.writeFile(wb, sectorizado ? 'plantilla_cuestionario_sectorizado.xlsx' : 'plantilla_cuestionario.xlsx');
}

export function duplicarCuestionario(original: any, nuevoNombre: string): any {
  return {
    ...original,
    name: nuevoNombre,
    questions: original.questions.map((q: any, index: number) => ({
      ...q,
      id: `q_${Date.now()}_${index}`
    }))
  };
}