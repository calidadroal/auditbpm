// src/utils/auditUtils.ts
import type { AuditResponse, ClasificacionRiesgo } from '../types';

export function calcularScore(responses: AuditResponse[]): {
  score: number;
  totalAplicables: number;
  totalCumplen: number;
  totalCumplenParcial: number;
  totalNoCumplen: number;
  totalNoAplica: number;
  criticosNC: number;
} {
  let puntaje = 0;
  let aplicables = 0;
  let cumplen = 0;
  let cumplenParcial = 0;
  let noCumplen = 0;
  let noAplica = 0;
  let criticosNC = 0;

  for (const r of responses) {
    if (r.valor === 'NA') {
      noAplica++;
      continue;
    }
    aplicables++;
    if (r.valor === 'C') {
      puntaje += 1;
      cumplen++;
    } else if (r.valor === 'CP') {
      puntaje += 0.5;
      cumplenParcial++;
    } else if (r.valor === 'NC') {
      noCumplen++;
      if (r.esCriticoInocuidad) criticosNC++;
    }
  }

  const score = aplicables > 0 ? (puntaje / aplicables) * 100 : 100;

  return {
    score: Math.round(score * 10) / 10,
    totalAplicables: aplicables,
    totalCumplen: cumplen,
    totalCumplenParcial: cumplenParcial,
    totalNoCumplen: noCumplen,
    totalNoAplica: noAplica,
    criticosNC
  };
}

export function clasificarRiesgo(score: number, criticosNC: number): ClasificacionRiesgo {
  if (criticosNC >= 2) return 'riesgo_alto';
  if (score >= 90) return 'conforme';
  if (score >= 81) return 'a_mejorar';
  return 'riesgo_alto';
}

export function getClasificacionLabel(clasificacion: ClasificacionRiesgo): string {
  switch (clasificacion) {
    case 'conforme': return 'CONFORME - Cumple BPM';
    case 'a_mejorar': return 'A MEJORAR - Acciones correctivas necesarias';
    case 'riesgo_alto': return 'RIESGO ALTO - Intervención requerida';
  }
}

export function getClasificacionColorHex(clasificacion: ClasificacionRiesgo): string {
  switch (clasificacion) {
    case 'conforme': return '#22c55e';
    case 'a_mejorar': return '#eab308';
    case 'riesgo_alto': return '#ef4444';
  }
}

export function getClasificacionBg(clasificacion: ClasificacionRiesgo): string {
  switch (clasificacion) {
    case 'conforme': return 'bg-green-100 text-green-800 border-green-300';
    case 'a_mejorar': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'riesgo_alto': return 'bg-red-100 text-red-800 border-red-300';
  }
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 81) return 'text-yellow-600';
  return 'text-red-600';
}

export function generarConclusion(score: number, criticosNC: number, clasificacion: ClasificacionRiesgo): string {
  const base = `Resultado: ${score}% de cumplimiento. `;
  
  if (clasificacion === 'conforme') {
    return base + 'El establecimiento CUMPLE con las Buenas Prácticas de Manufactura. No se detectaron desvíos críticos.';
  }
  
  if (clasificacion === 'a_mejorar') {
    return base + `El establecimiento requiere ACCIONES CORRECTIVAS. Se detectaron ${criticosNC} desvío(s) crítico(s) de inocuidad.`;
  }
  
  return base + `⚠️ RIESGO ALTO. Se detectaron ${criticosNC} desvío(s) crítico(s) de inocuidad. Se recomienda intervención inmediata y posible clausura preventiva.`;
}

// ==========================================
// FUNCIONES PARA CHECKLIST MUNICIPAL
// ==========================================

export function calcularScoreChecklist(responses: AuditResponse[]): {
  score: number;
  totalAplicables: number;
  totalCumplen: number;
  totalCumplenParcial: number;
  totalNoCumplen: number;
  totalNoAplica: number;
  criticosNC: number;
  criticosMunicipalesNC: number;
  mediosMunicipalesNC: number;
} {
  let cumplen = 0;
  let noCumplen = 0;
  let criticosMunicipalesNC = 0;
  let mediosMunicipalesNC = 0;

  for (const r of responses) {
    if (r.valor === 'CUMPLE') {
      cumplen++;
    } else if (r.valor === 'NO_CUMPLE') {
      noCumplen++;
      if (r.nivelRiesgoMunicipal === 'critico') criticosMunicipalesNC++;
      if (r.nivelRiesgoMunicipal === 'medio') mediosMunicipalesNC++;
    }
  }

  const total = cumplen + noCumplen;
  const score = total > 0 ? (cumplen / total) * 100 : 100;

  return {
    score: Math.round(score * 10) / 10,
    totalAplicables: total,
    totalCumplen: cumplen,
    totalCumplenParcial: 0,
    totalNoCumplen: noCumplen,
    totalNoAplica: 0,
    criticosNC: criticosMunicipalesNC,
    criticosMunicipalesNC,
    mediosMunicipalesNC
  };
}

export function clasificarRiesgoChecklist(score: number, criticosNC: number): ClasificacionRiesgo {
  if (criticosNC >= 1) return 'riesgo_alto';
  if (score < 70) return 'riesgo_alto';
  if (score < 85) return 'a_mejorar';
  return 'conforme';
}