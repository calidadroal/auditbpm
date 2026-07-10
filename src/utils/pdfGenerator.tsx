// src/utils/pdfGenerator.ts
// ============================================================
// PDF GENERATOR - TodoEnRegla
// ============================================================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { AuditRecord } from '../types';
import {
  calcularScore,
  clasificarRiesgo,
  getClasificacionLabel,
  generarConclusion,
  calcularScoreChecklist,
  clasificarRiesgoChecklist,
} from './auditUtils';

interface PdfContext {
  page: any;
  cursorY: number;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  marginLeft: number;
  marginRight: number;
  marginBottom: number;
  contentWidth: number;
  font: any;
  boldFont: any;
}

interface StyleColors {
  principal: ReturnType<typeof rgb>;
  secundario: ReturnType<typeof rgb>;
  etiqueta: ReturnType<typeof rgb>;
  valor: ReturnType<typeof rgb>;
  pregunta: ReturnType<typeof rgb>;
  norma: ReturnType<typeof rgb>;
  comentarioTexto: ReturnType<typeof rgb>;
  comentarioBg: ReturnType<typeof rgb>;
  separador: ReturnType<typeof rgb>;
  blanco: ReturnType<typeof rgb>;
  cumple: ReturnType<typeof rgb>;
  cumpleBg: ReturnType<typeof rgb>;
  parcial: ReturnType<typeof rgb>;
  parcialBg: ReturnType<typeof rgb>;
  noCumple: ReturnType<typeof rgb>;
  noCumpleBg: ReturnType<typeof rgb>;
  noAplica: ReturnType<typeof rgb>;
  noAplicaBg: ReturnType<typeof rgb>;
  riesgoAlto: ReturnType<typeof rgb>;
  geoBg: ReturnType<typeof rgb>;
}

interface Spacing {
  lineHeight: number;
  padding: number;
  headerHeight: number;
  section: number;
  small: number;
  commentLine: number;
  box: number;
}

function createColors(): StyleColors {
  return {
    principal: rgb(0.06, 0.69, 0.51),
    secundario: rgb(0.17, 0.24, 0.31),
    etiqueta: rgb(0.20, 0.27, 0.33),
    valor: rgb(0.17, 0.24, 0.31),
    pregunta: rgb(0.10, 0.10, 0.10),
    norma: rgb(0.50, 0.50, 0.55),
    comentarioTexto: rgb(0.17, 0.24, 0.31),
    comentarioBg: rgb(0.98, 0.98, 0.98),
    separador: rgb(0.84, 0.86, 0.87),
    blanco: rgb(1, 1, 1),
    cumple: rgb(0.15, 0.68, 0.38),
    cumpleBg: rgb(0.91, 0.97, 0.94),
    parcial: rgb(0.95, 0.61, 0.07),
    parcialBg: rgb(1.0, 0.98, 0.90),
    noCumple: rgb(0.91, 0.30, 0.24),
    noCumpleBg: rgb(0.99, 0.93, 0.93),
    noAplica: rgb(0.58, 0.65, 0.65),
    noAplicaBg: rgb(0.95, 0.95, 0.96),
    riesgoAlto: rgb(0.91, 0.30, 0.24),
    geoBg: rgb(0.91, 0.94, 0.99),
  };
}

function createSpacing(): Spacing {
  return {
    lineHeight: 12,
    padding: 8,
    headerHeight: 18,
    section: 14,
    small: 4,
    commentLine: 10,
    box: 8,
  };
}

function normalizarTexto(texto: string): string {
  if (!texto) return '';
  return texto
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≠/g, '!=')
    .replace(/±/g, '+/-')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitTextToSize(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function drawParagraph(ctx: PdfContext, lines: string[], x: number, fontSize: number, color: ReturnType<typeof rgb>, customLineHeight?: number): number {
  const lh = customLineHeight ?? ctx.spacing.lineHeight;
  let cy = ctx.cursorY;
  for (const line of lines) {
    ctx.page.drawText(line, { x, y: cy, size: fontSize, font: ctx.font, color });
    cy -= lh;
  }
  ctx.cursorY = cy;
  return lines.length * lh;
}

function drawParagraphBold(ctx: PdfContext, lines: string[], x: number, fontSize: number, color: ReturnType<typeof rgb>, customLineHeight?: number): number {
  const lh = customLineHeight ?? ctx.spacing.lineHeight;
  let cy = ctx.cursorY;
  for (const line of lines) {
    ctx.page.drawText(line, { x, y: cy, size: fontSize, font: ctx.boldFont, color });
    cy -= lh;
  }
  ctx.cursorY = cy;
  return lines.length * lh;
}

function ensureSpace(ctx: PdfContext, height: number): void {
  if (ctx.cursorY - height < ctx.marginBottom) {
    newPage(ctx);
  }
}

function newPage(ctx: PdfContext, tituloSeccion?: string): void {
  ctx.page = (ctx as any).doc.addPage([ctx.pageWidth, ctx.pageHeight]);
  ctx.pageNumber++;
  ctx.cursorY = ctx.pageHeight - 85;
  drawHeader(ctx);
  drawFooter(ctx);
  if (tituloSeccion) {
    ctx.page.drawText(tituloSeccion, {
      x: ctx.marginLeft,
      y: ctx.cursorY,
      size: 11,
      font: ctx.boldFont,
      color: ctx.colors.secundario,
    });
    ctx.cursorY -= ctx.spacing.section;
  }
}

function drawHeader(ctx: PdfContext): void {
  const headerHeight = 68;
  ctx.page.drawRectangle({
    x: 0,
    y: ctx.pageHeight - headerHeight,
    width: ctx.pageWidth,
    height: headerHeight,
    color: ctx.colors.principal,
  });

  const titulo = (ctx as any).esChecklist ? 'CHECKLIST MUNICIPAL' : 'INFORME DE AUDITORIA';
  const subtitulo = (ctx as any).esChecklist
    ? 'Control Interno - Evaluacion de Riesgo de Clausura'
    : 'Sistema de Gestion de Calidad - TodoEnRegla';
  const fecha = (ctx as any).fecha;
  const auditor = (ctx as any).audit.auditorName || (ctx as any).audit.auditorEmail || 'N/D';

  const tituloWidth = ctx.boldFont.widthOfTextAtSize(titulo, 14);
  const xTitulo = (ctx.pageWidth - tituloWidth) / 2;
  ctx.page.drawText(titulo, {
    x: xTitulo,
    y: ctx.pageHeight - 36,
    size: 14,
    font: ctx.boldFont,
    color: ctx.colors.blanco,
  });

  const subtituloWidth = ctx.font.widthOfTextAtSize(subtitulo, 8);
  const xSubtitulo = (ctx.pageWidth - subtituloWidth) / 2;
  ctx.page.drawText(subtitulo, {
    x: xSubtitulo,
    y: ctx.pageHeight - 50,
    size: 8,
    font: ctx.font,
    color: ctx.colors.blanco,
  });

  ctx.page.drawText(`Fecha: ${fecha}`, {
    x: ctx.marginLeft,
    y: ctx.pageHeight - 62,
    size: 7,
    font: ctx.font,
    color: ctx.colors.blanco,
  });

  ctx.page.drawText(`Auditor: ${auditor}`, {
    x: ctx.marginLeft + 120,
    y: ctx.pageHeight - 62,
    size: 7,
    font: ctx.font,
    color: ctx.colors.blanco,
  });
}

function drawFooter(ctx: PdfContext): void {
  ctx.page.drawLine({
    start: { x: ctx.marginLeft, y: 50 },
    end: { x: ctx.pageWidth - ctx.marginRight, y: 50 },
    thickness: 0.2,
    color: ctx.colors.separador,
  });

  ctx.page.drawText(`TodoEnRegla - Generado el ${new Date().toLocaleDateString('es-AR')}`, {
    x: ctx.marginLeft,
    y: 40,
    size: 7,
    font: ctx.font,
    color: ctx.colors.norma,
  });

  ctx.page.drawText(`www.todoenregla.com.ar`, {
    x: ctx.marginLeft + 160,
    y: 40,
    size: 7,
    font: ctx.font,
    color: ctx.colors.principal,
  });

  ctx.page.drawText(`Pagina ${ctx.pageNumber}`, {
    x: ctx.pageWidth - ctx.marginRight,
    y: 40,
    size: 7,
    font: ctx.font,
    color: ctx.colors.norma,
  });
}

function drawSectionTitle(ctx: PdfContext, texto: string): void {
  ctx.page.drawText(texto, { x: ctx.marginLeft, y: ctx.cursorY, size: 13, font: ctx.boldFont, color: ctx.colors.secundario });
  ctx.cursorY -= ctx.spacing.section;
  ctx.page.drawLine({
    start: { x: ctx.marginLeft, y: ctx.cursorY },
    end: { x: ctx.marginLeft + 80, y: ctx.cursorY },
    thickness: 0.5,
    color: ctx.colors.principal,
  });
  ctx.cursorY -= ctx.spacing.section;
}

function drawInfoRow(ctx: PdfContext, label: string, value: string): void {
  ctx.page.drawText(`${label} ${value}`, { x: ctx.marginLeft, y: ctx.cursorY, size: 9, font: ctx.font, color: ctx.colors.valor });
  ctx.cursorY -= ctx.spacing.section;
}

function drawColoredBox(ctx: PdfContext, height: number, color: ReturnType<typeof rgb>, text: string, fontSize: number, textColor: ReturnType<typeof rgb>, xOffset: number = 5, yOffset: number = 4): void {
  ctx.page.drawRectangle({
    x: ctx.marginLeft,
    y: ctx.cursorY - height,
    width: ctx.contentWidth,
    height: height,
    color,
  });
  ctx.page.drawText(text, { x: ctx.marginLeft + xOffset, y: ctx.cursorY - yOffset, size: fontSize, font: ctx.font, color: textColor });
  ctx.cursorY -= height + ctx.spacing.padding;
}

function drawProgressBar(ctx: PdfContext, score: number): void {
  const barWidth = ctx.contentWidth;
  const barHeight = 6;
  const barX = ctx.marginLeft;
  const barY = ctx.cursorY - ctx.spacing.small;
  const scoreClamped = Math.min(100, Math.max(0, score));
  const fillWidth = (scoreClamped / 100) * barWidth;

  let barColor = ctx.colors.cumple;
  if (scoreClamped < 81) barColor = ctx.colors.parcial;
  if (scoreClamped < 70) barColor = ctx.colors.noCumple;

  ctx.page.drawRectangle({ x: barX, y: barY, width: barWidth, height: barHeight, color: rgb(0.92, 0.92, 0.92) });
  ctx.page.drawRectangle({ x: barX, y: barY, width: fillWidth, height: barHeight, color: barColor });
  ctx.cursorY -= ctx.spacing.section + ctx.spacing.small;
}

function drawResultBox(ctx: PdfContext, clasifLabel: string, clasificacion: string): number {
  const cColor = clasificacion === 'riesgo_alto' ? ctx.colors.riesgoAlto : clasificacion === 'a_mejorar' ? ctx.colors.parcial : ctx.colors.cumple;
  const lines = splitTextToSize(clasifLabel, ctx.boldFont, 12, ctx.contentWidth - 20);
  const lineH = ctx.spacing.section;
  const textHeight = lines.length * lineH;
  const boxHeight = textHeight + ctx.spacing.box * 2;

  ensureSpace(ctx, boxHeight);
  ctx.page.drawRectangle({
    x: ctx.marginLeft,
    y: ctx.cursorY - boxHeight,
    width: ctx.contentWidth,
    height: boxHeight,
    color: cColor,
  });

  let cy = ctx.cursorY - (boxHeight - textHeight) / 2 - ctx.spacing.small;
  for (const line of lines) {
    const lineWidth = ctx.boldFont.widthOfTextAtSize(line, 12);
    const xCentered = ctx.marginLeft + (ctx.contentWidth - lineWidth) / 2;
    ctx.page.drawText(line, { x: xCentered, y: cy, size: 12, font: ctx.boldFont, color: ctx.colors.blanco });
    cy -= lineH;
  }
  ctx.cursorY -= boxHeight + ctx.spacing.section;
  return boxHeight;
}

function drawSummaryItem(ctx: PdfContext, label: string, value: number, color: ReturnType<typeof rgb>): void {
  ctx.page.drawRectangle({ x: ctx.marginLeft, y: ctx.cursorY - ctx.spacing.small, width: 4, height: 4, color });
  ctx.page.drawText(`${label}: ${value}`, { x: ctx.marginLeft + 10, y: ctx.cursorY, size: 9, font: ctx.font, color: ctx.colors.valor });
  ctx.cursorY -= ctx.spacing.section;
}

function drawQuestionBlock(ctx: PdfContext, response: any, index: number, auditNorma: string): number {
  const preguntaTexto = normalizarTexto(response.questionText);
  const normaTexto = normalizarTexto(`${response.norma || auditNorma} ${response.puntoNorma ? `- ${response.puntoNorma}` : ''}`);
  const comentarioTexto = response.comentario ? normalizarTexto(`Comentario: ${response.comentario}`) : '';
  const lineasPregunta = splitTextToSize(preguntaTexto, ctx.font, 8, ctx.contentWidth - 20);
  const lineasComentario = comentarioTexto ? splitTextToSize(comentarioTexto, ctx.font, 7, ctx.contentWidth - 20) : [];
  const totalHeight = ctx.spacing.headerHeight + (lineasPregunta.length * ctx.spacing.lineHeight) + ctx.spacing.section + (lineasComentario.length * ctx.spacing.commentLine) + ctx.spacing.box * 2 + ctx.spacing.small;

  ensureSpace(ctx, totalHeight);

  let bgColor = ctx.colors.blanco;
  let resultText = 'NO APLICA';
  let resultColor = ctx.colors.noAplica;
  if (response.valor === 'C' || response.valor === 'CUMPLE') { bgColor = ctx.colors.cumpleBg; resultText = 'CUMPLE'; resultColor = ctx.colors.cumple; }
  else if (response.valor === 'CP') { bgColor = ctx.colors.parcialBg; resultText = 'PARCIAL'; resultColor = ctx.colors.parcial; }
  else if (response.valor === 'NC' || response.valor === 'NO_CUMPLE') { bgColor = ctx.colors.noCumpleBg; resultText = 'NO CUMPLE'; resultColor = ctx.colors.noCumple; }

  ctx.page.drawRectangle({
    x: ctx.marginLeft, y: ctx.cursorY - totalHeight,
    width: ctx.contentWidth, height: totalHeight,
    color: bgColor, borderColor: ctx.colors.separador, borderWidth: 0.5,
  });

  let y2 = ctx.cursorY - ctx.spacing.box;
  ctx.page.drawText(`Pregunta ${index + 1}`, { x: ctx.marginLeft + 10, y: y2, size: 9, font: ctx.boldFont, color: ctx.colors.secundario });
  ctx.page.drawText(resultText, { x: ctx.marginLeft + ctx.contentWidth - 90, y: y2, size: 8, font: ctx.boldFont, color: resultColor });
  y2 -= ctx.spacing.section;

  ctx.cursorY = y2;
  drawParagraph(ctx, lineasPregunta, ctx.marginLeft + 10, 8, ctx.colors.pregunta);
  y2 = ctx.cursorY - ctx.spacing.small;

  ctx.page.drawText(normaTexto, { x: ctx.marginLeft + 10, y: y2, size: 6.5, font: ctx.font, color: ctx.colors.norma });
  y2 -= ctx.spacing.section;

  if (lineasComentario.length > 0) {
    ctx.cursorY = y2;
    drawParagraph(ctx, lineasComentario, ctx.marginLeft + 10, 7, ctx.colors.comentarioTexto, ctx.spacing.commentLine);
  }

  ctx.cursorY = ctx.cursorY - totalHeight - ctx.spacing.padding + ctx.spacing.box;
  return totalHeight;
}

function drawGeoLocation(ctx: PdfContext, geo: any): void {
  const lat = geo.lat.toFixed(6);
  const lng = geo.lng.toFixed(6);
  const precision = geo.precision ? ` +/-${Math.round(geo.precision)}m` : '';
  const geoText = `[GPS] Ubicacion: Lat: ${lat}  Lng: ${lng}${precision}`;
  const mapsUrl = `https://www.google.com/maps?q=${geo.lat},${geo.lng}`;
  const linkText = `Ver en Google Maps: ${mapsUrl}`;

  ensureSpace(ctx, ctx.spacing.section * 2 + ctx.spacing.small);

  drawColoredBox(ctx, ctx.spacing.section, ctx.colors.geoBg, geoText, 8, ctx.colors.principal);

  ctx.page.drawText(linkText, {
    x: ctx.marginLeft,
    y: ctx.cursorY,
    size: 7,
    font: ctx.font,
    color: ctx.colors.principal,
  });
  ctx.cursorY -= ctx.spacing.section;
}

// ============================================================
// OBSERVACIONES - CORREGIDO CON TOPOFFSET
// ============================================================

function drawObservations(ctx: PdfContext, observaciones: string): void {
  const obsText = normalizarTexto(observaciones);
  const lines = splitTextToSize(obsText, ctx.font, 9, ctx.contentWidth - 10);

  // ✅ topOffset = distancia entre el techo de la caja y la BASELINE del primer renglón
  const topOffset = 12;
  const bottomPadding = 8;
  const alturaObs = topOffset + (lines.length - 1) * ctx.spacing.lineHeight + bottomPadding;

  ensureSpace(ctx, alturaObs + ctx.spacing.section);

  ctx.page.drawText('OBSERVACIONES GENERALES', {
    x: ctx.marginLeft,
    y: ctx.cursorY,
    size: 12,
    font: ctx.boldFont,
    color: ctx.colors.secundario,
  });
  ctx.cursorY -= ctx.spacing.section;

  const boxTop = ctx.cursorY;
  ctx.page.drawRectangle({
    x: ctx.marginLeft,
    y: boxTop - alturaObs,
    width: ctx.contentWidth,
    height: alturaObs,
    color: ctx.colors.comentarioBg,
    borderColor: ctx.colors.separador,
    borderWidth: 0.5,
  });

  ctx.cursorY = boxTop - topOffset;
  drawParagraph(ctx, lines, ctx.marginLeft + 5, 9, ctx.colors.comentarioTexto);

  ctx.cursorY = boxTop - alturaObs - ctx.spacing.padding;
}

function drawSystematicFindings(ctx: PdfContext, desvios: string[]): void {
  const alturaDesvios = desvios.length * ctx.spacing.section + ctx.spacing.section + ctx.spacing.padding;
  ensureSpace(ctx, alturaDesvios);
  ctx.page.drawText('DESVIOS SISTEMATICOS DETECTADOS:', { x: ctx.marginLeft, y: ctx.cursorY, size: 10, font: ctx.boldFont, color: ctx.colors.noCumple });
  ctx.cursorY -= ctx.spacing.section;
  for (const desvio of desvios) {
    ctx.page.drawText(`- ${normalizarTexto(desvio)}`, { x: ctx.marginLeft + 6, y: ctx.cursorY, size: 8, font: ctx.font, color: ctx.colors.noCumple });
    ctx.cursorY -= ctx.spacing.section;
  }
  ctx.cursorY -= ctx.spacing.padding;
}

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================

export async function generarPDF(audit: AuditRecord): Promise<void> {
  try {
    console.log('PDF: Generando...');

    const doc = await PDFDocument.create();
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const marginLeft = 50;
    const marginRight = 50;
    const marginBottom = 50;

    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

    const esChecklist = audit.tipoCuestionario === 'checklist';
    const fecha = audit.completedAt?.seconds
      ? new Date(audit.completedAt.seconds * 1000).toLocaleDateString('es-AR')
      : new Date().toLocaleDateString('es-AR');

    const resultado = esChecklist
      ? calcularScoreChecklist(audit.responses)
      : calcularScore(audit.responses);

    const clasificacion = esChecklist
      ? clasificarRiesgoChecklist(resultado.score, resultado.criticosNC)
      : clasificarRiesgo(resultado.score, resultado.criticosNC);

    const clasifLabel = normalizarTexto(getClasificacionLabel(clasificacion));
    const conclusion = normalizarTexto(generarConclusion(resultado.score, resultado.criticosNC, clasificacion));
    const responsesFiltradas = audit.responses.filter((r) => r.questionText && r.questionText.trim().length > 0);
    const colors = createColors();
    const spacing = createSpacing();

    let page = doc.addPage([pageWidth, pageHeight]);
    let cursorY = pageHeight - 85;
    let pageNumber = 1;

    const ctx: PdfContext = {
      page, cursorY, pageNumber, pageWidth, pageHeight,
      marginLeft, marginRight, marginBottom,
      contentWidth: pageWidth - marginLeft - marginRight,
      font, boldFont,
      spacing, colors,
    } as any;

    (ctx as any).doc = doc;
    (ctx as any).esChecklist = esChecklist;
    (ctx as any).fecha = fecha;
    (ctx as any).audit = audit;
    (ctx as any).newPage = (titulo?: string) => newPage(ctx, titulo);
    (ctx as any).ensureSpace = (h: number) => ensureSpace(ctx, h);

    drawHeader(ctx);
    drawFooter(ctx);

    drawSectionTitle(ctx, 'DATOS DEL CONTROL');
    const datos: [string, string][] = [
      ['Establecimiento:', audit.establecimiento || audit.siteName || 'No especificado'],
      ['Norma de referencia:', audit.norma || 'No especificada'],
      ['Cuestionario aplicado:', audit.questionnaireName || 'No especificado'],
      ['Responsable:', audit.auditorName || audit.auditorEmail || 'No especificado'],
      ['Fecha de realizacion:', fecha],
      ['Duracion:', audit.durationMinutes ? `${audit.durationMinutes} minutos` : 'No disponible'],
    ];
    if (audit.sectorName) datos.push(['Sector auditado:', audit.sectorName]);
    for (const [label, value] of datos) drawInfoRow(ctx, label, value);
    ctx.cursorY -= spacing.padding;

    if (audit.geolocalizacion) drawGeoLocation(ctx, audit.geolocalizacion);

    if (audit.observacionesGenerales?.trim()) drawObservations(ctx, audit.observacionesGenerales);

    ctx.cursorY -= spacing.padding;
    drawSectionTitle(ctx, 'RESULTADO DE LA EVALUACION');
    ctx.page.drawText(`${esChecklist ? 'Cumplimiento:' : 'Score:'} ${resultado.score}%`, {
      x: ctx.marginLeft, y: ctx.cursorY, size: 11, font: boldFont, color: colors.principal,
    });
    ctx.cursorY -= spacing.section;
    drawProgressBar(ctx, resultado.score);
    drawResultBox(ctx, clasifLabel, clasificacion);

    const resumenData = esChecklist
      ? [
          { label: 'Items que Cumplen', value: resultado.totalCumplen, color: colors.cumple },
          { label: 'Items que No Cumplen', value: resultado.totalNoCumplen, color: colors.noCumple },
          { label: 'Criticos en No Cumplimiento', value: resultado.criticosNC, color: colors.riesgoAlto },
        ]
      : [
          { label: 'Cumplen (C)', value: resultado.totalCumplen, color: colors.cumple },
          { label: 'Cumplen Parcialmente (CP)', value: resultado.totalCumplenParcial, color: colors.parcial },
          { label: 'No Cumplen (NC)', value: resultado.totalNoCumplen, color: colors.noCumple },
          { label: 'No Aplica (NA)', value: resultado.totalNoAplica, color: colors.noAplica },
          { label: 'Criticos en No Cumplimiento', value: resultado.criticosNC, color: colors.riesgoAlto },
        ];
    ensureSpace(ctx, resumenData.length * spacing.section + spacing.section + spacing.padding);
    ctx.page.drawText('RESUMEN CUANTITATIVO', { x: ctx.marginLeft, y: ctx.cursorY, size: 12, font: boldFont, color: colors.secundario });
    ctx.cursorY -= spacing.section;
    for (const item of resumenData) drawSummaryItem(ctx, item.label, item.value, item.color);
    ctx.cursorY -= spacing.padding;

    const conclusionLines = splitTextToSize(conclusion, font, 9, ctx.contentWidth - 10);
    const alturaConclusion = conclusionLines.length * spacing.lineHeight + spacing.section + spacing.padding;
    ensureSpace(ctx, alturaConclusion);
    ctx.page.drawText('CONCLUSION', { x: ctx.marginLeft, y: ctx.cursorY, size: 12, font: boldFont, color: colors.secundario });
    ctx.cursorY -= spacing.section;
    drawParagraph(ctx, conclusionLines, ctx.marginLeft + 5, 9, colors.comentarioTexto);
    ctx.cursorY -= spacing.padding;

    if (audit.recurrenciaDetectada && audit.desviosSistematicos.length > 0) {
      drawSystematicFindings(ctx, audit.desviosSistematicos);
    }

    ctx.cursorY -= spacing.padding;
    drawSectionTitle(ctx, 'DETALLE DE PREGUNTAS');
    for (let i = 0; i < responsesFiltradas.length; i++) {
      drawQuestionBlock(ctx, responsesFiltradas[i], i, audit.norma);
    }

    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `${esChecklist ? 'Checklist' : 'Auditoria'}_${(audit.siteName || 'sitio').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    console.log('PDF: Generado correctamente');
  } catch (error) {
    console.error('PDF: Error:', error);
    throw new Error('No se pudo generar el PDF. Por favor, intente nuevamente.');
  }
}