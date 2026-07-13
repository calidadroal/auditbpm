// src/utils/qrPdfGenerator.ts
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface QRCardData {
  siteName: string;
  sectorName: string;
  qrToken: string;
  instructions?: string;
}

export const generarQRPDF = async (data: QRCardData): Promise<void> => {
  const { siteName, sectorName, qrToken, instructions } = data;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  const qrDataURL = await QRCode.toDataURL(qrToken, {
    width: 400,
    margin: 2,
    color: {
      dark: '#16a34a',
      light: '#ffffff'
    }
  });

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  pdf.setDrawColor(22, 163, 74);
  pdf.setLineWidth(1.5);
  pdf.roundedRect(8, 8, pageWidth - 16, pageHeight - 16, 5, 5, 'S');

  pdf.setFontSize(22);
  pdf.setTextColor(22, 163, 74);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TodoEnRegla', centerX, 30, { align: 'center' });

  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sistema de Auditorías y Gestión', centerX, 40, { align: 'center' });

  pdf.setDrawColor(22, 163, 74);
  pdf.setLineWidth(0.5);
  pdf.line(30, 48, pageWidth - 30, 48);

  pdf.setFontSize(16);
  pdf.setTextColor(22, 163, 74);
  pdf.setFont('helvetica', 'bold');
  pdf.text(siteName, centerX, 62, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setTextColor(60, 60, 60);
  pdf.text(`Sector: ${sectorName}`, centerX, 74, { align: 'center' });

  const qrSize = 100;
  const qrX = centerX - qrSize / 2;
  const qrY = 85;
  pdf.addImage(qrDataURL, 'PNG', qrX, qrY, qrSize, qrSize);

  pdf.setFontSize(9);
  pdf.setTextColor(150, 150, 150);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Token: ${qrToken.substring(0, 16)}...`, centerX, qrY + qrSize + 8, { align: 'center' });

  pdf.setFontSize(12);
  pdf.setTextColor(60, 60, 60);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Instrucciones:', centerX, qrY + qrSize + 22, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.setFont('helvetica', 'normal');
  
  const instruccionesTexto = instructions || 
    '1. Escanee este código QR con la app TodoEnRegla\n' +
    '2. Inicie la auditoría correspondiente a este sector\n' +
    '3. Complete todas las preguntas del cuestionario\n' +
    '4. Finalice y genere el informe PDF';

  const lineas = instruccionesTexto.split('\n');
  lineas.forEach((linea, index) => {
    pdf.text(linea, centerX, qrY + qrSize + 32 + (index * 7), { align: 'center' });
  });

  pdf.setFontSize(8);
  pdf.setTextColor(180, 180, 180);
  pdf.text('TodoEnRegla - Auditorías y Gestión de Comercios', centerX, pageHeight - 15, { align: 'center' });
  pdf.text(new Date().toLocaleDateString('es-AR'), centerX, pageHeight - 10, { align: 'center' });

  const fileName = `QR_${siteName.replace(/\s+/g, '_')}_${sectorName.replace(/\s+/g, '_')}.pdf`;
  pdf.save(fileName);
};

export const generarQRMultiplesPDF = async (
  qrCards: QRCardData[],
  titulo: string = 'Códigos QR de Sectores'
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const cardsPerRow = 3;
  const cardsPerCol = 2;
  const cardWidth = (pageWidth - 30) / cardsPerRow;
  const cardHeight = (pageHeight - 50) / cardsPerCol;
  const marginX = 10;
  const marginY = 20;

  pdf.setFontSize(16);
  pdf.setTextColor(22, 163, 74);
  pdf.setFont('helvetica', 'bold');
  pdf.text(titulo, pageWidth / 2, 12, { align: 'center' });

  for (let i = 0; i < Math.min(qrCards.length, 12); i++) {
    const card = qrCards[i];
    const col = i % cardsPerRow;
    const row = Math.floor(i / cardsPerRow) % cardsPerCol;
    
    const x = marginX + col * cardWidth;
    const y = marginY + row * cardHeight;

    const qrDataURL = await QRCode.toDataURL(card.qrToken, {
      width: 150,
      margin: 1,
      color: { dark: '#16a34a', light: '#ffffff' }
    });

    const qrSize = 25;
    const centerCardX = x + cardWidth / 2;

    pdf.setFontSize(8);
    pdf.setTextColor(22, 163, 74);
    pdf.setFont('helvetica', 'bold');
    pdf.text(card.sectorName, centerCardX, y + 6, { align: 'center' });

    pdf.addImage(qrDataURL, 'PNG', centerCardX - qrSize / 2, y + 10, qrSize, qrSize);

    pdf.setFontSize(6);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.text(card.siteName, centerCardX, y + qrSize + 14, { align: 'center' });

    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x + 2, y + 2, cardWidth - 4, cardHeight - 4, 2, 2, 'S');
  }

  pdf.save('QR_Sectores.pdf');
};