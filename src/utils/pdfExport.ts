import jsPDF from 'jspdf';
import { Product, StockMovement } from '../types';

export function generateInventoryPDF(
  products: Product[],
  movements: StockMovement[],
  title = 'Relatório Oficial de Controle de Estoque'
) {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 32, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('JUNTA DE MISSÕES NACIONAIS - CBB', 14, 12);

  doc.setFontSize(11);
  doc.setTextColor(245, 158, 11); // amber-500
  doc.text('CENTRO DE FORMAÇÃO E ASSISTÊNCIA SOCIAL CRISTOLÂNDIA (LEM/BA)', 14, 19);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Gerado em: ${dateStr} às ${timeStr} | Documento de Auditoria e Controle Interno`, 14, 26);

  // Document Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 14, 42);

  // Summary Metrics Bar
  const totalProducts = products.length;
  const criticalProducts = products.filter((p) => p.currentStock <= p.minStock).length;
  const warningProducts = products.filter(
    (p) => p.currentStock > p.minStock && p.currentStock <= p.minStock * 1.5
  ).length;

  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, 46, 182, 14, 'F');

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total de Itens Cadastrados: ${totalProducts}`, 18, 55);
  doc.text(`Itens Críticos (Reposição Urgente): ${criticalProducts}`, 85, 55);
  doc.text(`Itens em Alerta: ${warningProducts}`, 150, 55);

  // Table Headers
  let y = 68;
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(14, y, 182, 8, 'F');

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUTO / ITEM', 18, y + 5.5);
  doc.text('CATEGORIA', 85, y + 5.5);
  doc.text('ESTOQUE', 130, y + 5.5);
  doc.text('MÍNIMO', 155, y + 5.5);
  doc.text('SITUAÇÃO', 178, y + 5.5);

  y += 8;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  products.forEach((p, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;

      // Repeat Table Headers on new page
      doc.setFillColor(30, 41, 59);
      doc.rect(14, y, 182, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('PRODUTO / ITEM', 18, y + 5.5);
      doc.text('CATEGORIA', 85, y + 5.5);
      doc.text('ESTOQUE', 130, y + 5.5);
      doc.text('MÍNIMO', 155, y + 5.5);
      doc.text('SITUAÇÃO', 178, y + 5.5);
      y += 8;
      doc.setFont('helvetica', 'normal');
    }

    // Zebra striping
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 7, 'F');
    }

    doc.setTextColor(15, 23, 42);
    // Truncate long names
    const prodName = p.name.length > 35 ? p.name.substring(0, 32) + '...' : p.name;
    doc.text(prodName, 18, y + 5);
    doc.text(p.category || 'Geral', 85, y + 5);
    doc.text(`${p.currentStock} ${p.unit}`, 130, y + 5);
    doc.text(`${p.minStock} ${p.unit}`, 155, y + 5);

    // Status Badge text & color
    if (p.currentStock <= p.minStock) {
      doc.setTextColor(225, 29, 72); // rose-600
      doc.setFont('helvetica', 'bold');
      doc.text('CRÍTICO', 178, y + 5);
      doc.setFont('helvetica', 'normal');
    } else if (p.currentStock <= p.minStock * 1.5) {
      doc.setTextColor(217, 119, 6); // amber-600
      doc.setFont('helvetica', 'bold');
      doc.text('ALERTA', 178, y + 5);
      doc.setFont('helvetica', 'normal');
    } else {
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text('OK', 178, y + 5);
    }

    y += 7;
  });

  // Footer Signatures
  y = Math.max(y + 15, 240);
  if (y > 260) {
    doc.addPage();
    y = 220;
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);

  doc.line(20, y, 90, y);
  doc.line(120, y, 190, y);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Responsável pelo Almoxarifado / Estoque', 25, y + 5);
  doc.text('Coordenação Cristolândia LEM/BA', 130, y + 5);

  // Download PDF
  doc.save(`Relatorio_Estoque_Cristolandia_${now.toISOString().split('T')[0]}.pdf`);
}

export function generateMovementsDetailedPDF(
  movements: StockMovement[],
  title = 'Extrato Cronológico Detalhado de Entradas e Saídas',
  startDate?: string,
  endDate?: string
) {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');

  // Filter movements by range if provided
  let filtered = [...movements];
  if (startDate) filtered = filtered.filter((m) => m.date >= startDate);
  if (endDate) filtered = filtered.filter((m) => m.date <= endDate);

  // Sort descending by date, then by time
  filtered.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

  // Metrics
  const totalMovs = filtered.length;
  const totalEntriesQty = filtered.filter((m) => m.type === 'entrada').reduce((sum, m) => sum + m.quantity, 0);
  const totalExitsQty = filtered.filter((m) => m.type === 'saida').reduce((sum, m) => sum + m.quantity, 0);
  const totalEntriesCount = filtered.filter((m) => m.type === 'entrada').length;
  const totalExitsCount = filtered.filter((m) => m.type === 'saida').length;

  const renderHeader = (pageNumber: number) => {
    // Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 30, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('JUNTA DE MISSÕES NACIONAIS - CBB', 14, 11);

    doc.setFontSize(10);
    doc.setTextColor(245, 158, 11); // amber-500
    doc.text('CENTRO DE FORMAÇÃO E ASSISTÊNCIA SOCIAL CRISTOLÂNDIA (LEM/BA)', 14, 18);

    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225); // slate-300
    const periodText = startDate && endDate ? `Período: ${startDate} a ${endDate} | ` : '';
    doc.text(`${periodText}Emitido em: ${dateStr} às ${timeStr} | Pág. ${pageNumber}`, 14, 25);
  };

  let currentPage = 1;
  renderHeader(currentPage);

  // Document Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 14, 38);

  // Summary Metrics Bar
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(14, 42, 182, 12, 'F');

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de Lançamentos: ${totalMovs}`, 18, 49.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.setFont('helvetica', 'bold');
  doc.text(`Entradas (+): ${totalEntriesCount} lançam. (${totalEntriesQty.toFixed(1)} vol.)`, 72, 49.5);
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(`Saídas (-): ${totalExitsCount} lançam. (${totalExitsQty.toFixed(1)} vol.)`, 135, 49.5);

  let y = 60;

  // Group by Date
  const dateMap: Record<string, StockMovement[]> = {};
  filtered.forEach((m) => {
    if (!dateMap[m.date]) dateMap[m.date] = [];
    dateMap[m.date].push(m);
  });

  const dates = Object.keys(dateMap).sort().reverse();

  dates.forEach((dateKey) => {
    const dayMovs = dateMap[dateKey];
    dayMovs.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

    const dayEntries = dayMovs.filter((m) => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0);
    const dayExits = dayMovs.filter((m) => m.type === 'saida').reduce((s, m) => s + m.quantity, 0);

    // Format date string
    let formattedDateLabel = dateKey;
    try {
      const [year, month, day] = dateKey.split('-');
      const dObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      const weekDay = dObj.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase();
      formattedDateLabel = `${day}/${month}/${year} (${weekDay})`;
    } catch {
      // fallback
    }

    // Check if day header fits
    if (y > 255) {
      doc.addPage();
      currentPage++;
      renderHeader(currentPage);
      y = 36;
    }

    // Day Header Bar
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(14, y, 182, 7, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`DATA: ${formattedDateLabel}`, 18, y + 4.8);

    doc.setFontSize(7.5);
    doc.setTextColor(110, 231, 183); // emerald-300
    doc.text(`Entradas: +${dayEntries.toFixed(1)} vol.`, 115, y + 4.8);
    doc.setTextColor(253, 164, 175); // rose-300
    doc.text(`Saídas: -${dayExits.toFixed(1)} vol.`, 155, y + 4.8);

    y += 7;

    // Table Column Sub-Headers
    doc.setFillColor(226, 232, 240); // slate-200
    doc.rect(14, y, 182, 6, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('HORA', 16, y + 4.2);
    doc.text('TIPO', 30, y + 4.2);
    doc.text('PRODUTO / ITEM', 52, y + 4.2);
    doc.text('QUANTIDADE', 105, y + 4.2);
    doc.text('SETOR / DESTINO / ORIGEM', 130, y + 4.2);
    doc.text('RESPONSÁVEL / OBS.', 165, y + 4.2);

    y += 6;

    // Render movements for this day
    dayMovs.forEach((m, idx) => {
      if (y > 270) {
        doc.addPage();
        currentPage++;
        renderHeader(currentPage);
        y = 36;

        // Repeat Sub-Headers
        doc.setFillColor(226, 232, 240);
        doc.rect(14, y, 182, 6, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text('HORA', 16, y + 4.2);
        doc.text('TIPO', 30, y + 4.2);
        doc.text('PRODUTO / ITEM', 52, y + 4.2);
        doc.text('QUANTIDADE', 105, y + 4.2);
        doc.text('SETOR / DESTINO / ORIGEM', 130, y + 4.2);
        doc.text('RESPONSÁVEL / OBS.', 165, y + 4.2);
        y += 6;
      }

      // Zebra striping
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 6, 'F');
      }

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(m.time || '--:--', 16, y + 4.2);

      // Badge type
      if (m.type === 'entrada') {
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.setFont('helvetica', 'bold');
        doc.text('ENTRADA', 30, y + 4.2);
      } else {
        doc.setTextColor(225, 29, 72); // rose-600
        doc.setFont('helvetica', 'bold');
        doc.text('SAÍDA', 30, y + 4.2);
      }

      // Product name
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const pName = m.productName.length > 25 ? m.productName.substring(0, 23) + '..' : m.productName;
      doc.text(pName, 52, y + 4.2);

      // Quantity with sign
      doc.setFont('helvetica', 'bold');
      if (m.type === 'entrada') {
        doc.setTextColor(5, 150, 105);
        doc.text(`+${m.quantity} ${m.unit}`, 105, y + 4.2);
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text(`-${m.quantity} ${m.unit}`, 105, y + 4.2);
      }

      // Sector or Origin
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const sectorOrSupplier = m.type === 'entrada' ? (m.supplierOrDonor || m.entryType || 'Doação/Compra') : (m.sector || 'Cozinha');
      const secText = sectorOrSupplier.length > 20 ? sectorOrSupplier.substring(0, 18) + '..' : sectorOrSupplier;
      doc.text(secText, 130, y + 4.2);

      // Responsible / Notes
      const resp = m.retrievedBy || m.receivedBy || m.deliveredBy || '';
      const notes = m.notes ? ` (${m.notes})` : '';
      const fullResp = (resp + notes).trim();
      const respText = fullResp.length > 22 ? fullResp.substring(0, 20) + '..' : (fullResp || '-');
      doc.text(respText, 165, y + 4.2);

      y += 6;
    });

    y += 2; // small space between days
  });

  // Footer Signatures
  if (y > 245) {
    doc.addPage();
    currentPage++;
    renderHeader(currentPage);
    y = 60;
  } else {
    y = Math.max(y + 15, 245);
  }

  doc.setLineWidth(0.5);
  doc.setDrawColor(203, 213, 225);
  doc.line(20, y, 90, y);
  doc.line(120, y, 190, y);

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text('Responsável pelo Almoxarifado / Estoque', 25, y + 4.5);
  doc.text('Coordenação Cristolândia LEM/BA', 130, y + 4.5);

  // Download PDF
  doc.save(`Extrato_Diario_Entradas_Saidas_Cristolandia_${now.toISOString().split('T')[0]}.pdf`);
}

