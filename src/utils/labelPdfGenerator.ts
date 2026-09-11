import jsPDF from 'jspdf';
import { Product } from '../types';

// Tabela oficial do Code128 (Subconjunto B - Alfanumérico padrão)
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

/**
 * Converte um texto no conjunto de padrões de barras/espaços Code128B
 */
function getCode128Patterns(text: string): string[] {
  const clean = text.trim() || 'ESTOQUE';
  let checksum = 104; // Start B
  const list: string[] = [CODE128_PATTERNS[104]];

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    const validCode = code >= 0 && code <= 94 ? code : 0;
    checksum += validCode * (i + 1);
    list.push(CODE128_PATTERNS[validCode]);
  }

  const checkChar = checksum % 103;
  list.push(CODE128_PATTERNS[checkChar]);
  list.push(CODE128_PATTERNS[106]); // Stop
  return list;
}

/**
 * Desenha um código de barras Code128 vetorial com fidelidade micrométrica
 */
function drawVectorBarcode(
  doc: jsPDF,
  text: string,
  startX: number,
  startY: number,
  targetWidth: number,
  height: number
) {
  const patterns = getCode128Patterns(text);

  // Calcula total de módulos
  let totalModules = 0;
  for (const p of patterns) {
    for (let j = 0; j < p.length; j++) {
      totalModules += parseInt(p[j], 10);
    }
  }

  const moduleWidth = targetWidth / totalModules;
  let currentX = startX;

  doc.setFillColor(15, 23, 42); // slate-900 para barras

  for (const p of patterns) {
    for (let j = 0; j < p.length; j++) {
      const digit = parseInt(p[j], 10);
      const width = digit * moduleWidth;

      // Dígitos em posições pares são BARRAS (preenchidas)
      if (j % 2 === 0) {
        doc.rect(currentX, startY, width, height, 'F');
      }
      // Dígitos em posições ímpares são ESPAÇOS em branco
      currentX += width;
    }
  }
}

export interface ShelfLabelsOptions {
  format?: 'large' | 'compact';
  showLocation?: boolean;
  showMinStock?: boolean;
  showConsumption?: boolean;
  showCutLines?: boolean;
  showInstitutionalHeader?: boolean;
}

/**
 * Gera o documento PDF A4 contendo as etiquetas de prateleira prontas para impressão
 */
export function generateShelfLabelsPdf(products: Product[], options: ShelfLabelsOptions = {}) {
  const {
    format = 'large',
    showLocation = true,
    showMinStock = true,
    showConsumption = true,
    showCutLines = true,
    showInstitutionalHeader = true,
  } = options;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const isLarge = format === 'large';
  const cols = 2;
  const rows = isLarge ? 4 : 6;
  const labelsPerPage = cols * rows;

  const marginX = 10;
  const marginY = isLarge ? 10 : 8;
  const gapX = 6;
  const gapY = isLarge ? 5 : 4;

  const labelWidth = 92;
  const labelHeight = isLarge ? 65 : 44;

  products.forEach((prod, index) => {
    const pageItemIndex = index % labelsPerPage;

    // Cria nova página a cada grupo de etiquetas
    if (index > 0 && pageItemIndex === 0) {
      doc.addPage();
    }

    const col = pageItemIndex % cols;
    const row = Math.floor(pageItemIndex / cols);

    const x = marginX + col * (labelWidth + gapX);
    const y = marginY + row * (labelHeight + gapY);

    // 1. Linhas de corte tracejadas (Guias de tesoura/estilete)
    if (showCutLines) {
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.rect(x, y, labelWidth, labelHeight);
      doc.setLineDashPattern([], 0); // Restaura linha sólida
    }

    // Fundo da etiqueta (branco limpo)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x + 0.5, y + 0.5, labelWidth - 1, labelHeight - 1, 1.5, 1.5, 'F');

    let currentY = y + 1.2;

    // 2. Faixa Institucional de Cabeçalho
    if (showInstitutionalHeader) {
      doc.setFillColor(15, 23, 42); // slate-900
      const headerHeight = isLarge ? 6.2 : 5.0;
      doc.roundedRect(x + 1, currentY, labelWidth - 2, headerHeight, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isLarge ? 7 : 6);
      doc.setTextColor(255, 255, 255);
      doc.text(
        'CRISTOLÂNDIA LEM • GESTÃO DE ALMOXARIFADO',
        x + labelWidth / 2,
        currentY + headerHeight / 2,
        { align: 'center', baseline: 'middle' }
      );
      currentY += headerHeight + 2.2;
    } else {
      currentY += 2.0;
    }

    // 3. Nome do Alimento (Destaque Principal com ajuste de tamanho dinâmico)
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    const nameFontSize = isLarge
      ? prod.name.length > 26
        ? 10.5
        : 11.5
      : prod.name.length > 26
      ? 8.5
      : 9.5;
    doc.setFontSize(nameFontSize);

    const nameLineHeight = isLarge ? 4.6 : 3.8;
    const splitName = doc.splitTextToSize(prod.name.toUpperCase(), labelWidth - 8);
    doc.text(splitName, x + 4, currentY, { baseline: 'top' });
    currentY += splitName.length * nameLineHeight + 1.8;

    // 4. Categoria e Unidade (Espaçamento limpo e garantido, sem sobreposição)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isLarge ? 7 : 6);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
      `${prod.category.toUpperCase()} • UNIDADE: ${prod.unit.toUpperCase()}`,
      x + 4,
      currentY,
      { baseline: 'top' }
    );
    currentY += isLarge ? 4.2 : 3.2;

    // 5. Bloco de Logística (Localização, Estoque Mínimo e Consumo Diário)
    const hasLogisticsData = showLocation || showMinStock || showConsumption;
    if (isLarge && hasLogisticsData) {
      const boxHeight = 11.5;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(x + 4, currentY, labelWidth - 8, boxHeight, 1, 1, 'FD');

      const locText = prod.location ? `LOCAL: ${prod.location.toUpperCase()}` : 'LOCAL: DEPÓSITO PRINCIPAL';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text(locText, x + 6, currentY + 2.2, { baseline: 'top' });

      if (showMinStock) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // red-600
        doc.text(`MÍNIMO: ${prod.minStock} ${prod.unit}`, x + 6, currentY + 6.8, { baseline: 'top' });
      }

      if (showConsumption) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235); // blue-600
        doc.text(
          `CONSUMO: ${prod.dailyAvgConsumption} ${prod.unit}/dia`,
          x + labelWidth - 6,
          currentY + 6.8,
          { align: 'right', baseline: 'top' }
        );
      }

      currentY += boxHeight + 2.5;
    } else if (!isLarge && showLocation) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(
        prod.location ? `LOCAL: ${prod.location.toUpperCase()}` : 'LOCAL: DEPÓSITO',
        x + 4,
        currentY,
        { baseline: 'top' }
      );
      currentY += 3.5;
    }

    // 6. Código de Barras Vetorial Code128 (Fixado próximo à base da etiqueta)
    const barcodeValue = (prod.barcode && prod.barcode.trim()) || prod.id;
    const barcodeWidth = isLarge ? labelWidth - 18 : labelWidth - 14;
    const barcodeHeight = isLarge ? 12.0 : 8.0;
    const barcodeX = x + (labelWidth - barcodeWidth) / 2;
    const barcodeY = isLarge
      ? Math.max(currentY, y + labelHeight - 19.5)
      : y + labelHeight - 14.5;

    drawVectorBarcode(doc, barcodeValue, barcodeX, barcodeY, barcodeWidth, barcodeHeight);

    // 7. Texto Legível do Código de Barras
    doc.setFont('courier', 'bold');
    doc.setFontSize(isLarge ? 7.5 : 6.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(
      `* ${barcodeValue} *`,
      x + labelWidth / 2,
      barcodeY + barcodeHeight + (isLarge ? 1.5 : 1.2),
      { align: 'center', baseline: 'top' }
    );
  });

  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`Etiquetas_Prateleira_Cristolandia_${timestamp}.pdf`);
}
