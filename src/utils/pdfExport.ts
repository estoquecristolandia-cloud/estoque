import jsPDF from 'jspdf';
import { Product, StockMovement, InventoryAudit, DailyMealRecord } from '../types';
import { calculatePurchaseForecast } from './purchaseForecasting';

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

export function generatePurchaseForecastPDF(
  products: Product[],
  movements: StockMovement[],
  periodDays: 7 | 15 | 30 = 30,
  inventoryAudits: any[] = [],
  responsibleName = 'Marconi Castro (Gestor do Estoque)',
  options?: {
    category?: string;
    statusFilter?: 'all' | 'buy_only' | 'urgent_only' | 'warning_only' | 'comfortable_only';
  }
) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Use the central forecasting logic to guarantee consistent calculations
  const forecast = calculatePurchaseForecast(products, movements, periodDays, inventoryAudits, options);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273mm

  const renderHeader = (pageNumber: number) => {
    // Header Dark Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Accent Line
    doc.setFillColor(245, 158, 11); // amber-500
    doc.rect(0, 28, pageWidth, 1.5, 'F');

    // Institutional Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('JUNTA DE MISSÕES NACIONAIS — CBB', margin, 9);

    doc.setFontSize(9);
    doc.setTextColor(245, 158, 11); // amber-500
    doc.text('CRISTOLÂNDIA LEM/BA — RELATÓRIO DE ESTOQUE E NECESSIDADE DE COMPRAS', margin, 15);

    // Meta details line
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Período de análise: ${forecast.startDateFormatted} a ${forecast.endDateFormatted} (${periodDays} dias) | Produtos Analisados: ${forecast.totalProducts}`,
      margin,
      21
    );
    doc.text(
      `Emissão: ${dateStr} às ${timeStr} | Responsável: ${responsibleName}`,
      margin,
      25
    );

    // Right-hand badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(245, 158, 11);
    doc.text('DOCUMENTO OFICIAL DA COORDENAÇÃO', pageWidth - margin - 65, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('AUDITORIA E ABASTECIMENTO', pageWidth - margin - 65, 17);
  };

  let y = 35;
  renderHeader(1);

  // Subtitle / Legal notice
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text(
    '* Relatório gerado com base no consumo real de saídas (type === "saida"). Não altera saldos ou registros do sistema.',
    margin,
    y
  );
  y += 4.5;

  // Executive Summary Cards Bar (7 metrics)
  const cardW = (contentWidth - 6 * 2.5) / 7;
  const cards = [
    { label: 'Analisados', val: `${forecast.totalProducts}`, color: [15, 23, 42], bg: [241, 245, 249] },
    { label: 'Sem Estoque', val: `${forecast.outOfStockCount}`, color: [15, 23, 42], bg: [254, 242, 242] },
    { label: 'Urgente', val: `${forecast.urgentCount}`, color: [225, 29, 72], bg: [255, 241, 242] },
    { label: 'Comprar', val: `${forecast.needPurchaseCount}`, color: [234, 88, 12], bg: [255, 247, 237] },
    { label: 'Atenção', val: `${forecast.warningCount}`, color: [217, 119, 6], bg: [254, 252, 232] },
    { label: 'Confortável', val: `${forecast.comfortableCount}`, color: [16, 185, 129], bg: [240, 253, 244] },
    { label: 'Total Reposição', val: `${forecast.totalSuggestedPurchaseUnits} un.`, color: [37, 99, 235], bg: [239, 246, 255] },
  ];

  cards.forEach((c, i) => {
    const x = margin + i * (cardW + 2.5);
    doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
    doc.roundedRect(x, y, cardW, 11, 1.5, 1.5, 'F');

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(c.label.toUpperCase(), x + 2, y + 4);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.val, x + 2, y + 9);
  });

  y += 15;

  // TABELA 1: NECESSIDADE DE COMPRAS (SOMENTE URGENTE, COMPRAR, ATENÇÃO)
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(margin, y, 3, 5.5, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('1. NECESSIDADE DE COMPRAS — LISTA CONSOLIDADA PARA A COORDENAÇÃO (PRIORIDADES)', margin + 5, y + 4.2);

  y += 7;

  // Filter shopping list items: priority URGENTE, COMPRAR, or ATENCAO
  const shoppingItems = forecast.allItems.filter(
    (i: any) => i.priority === 'URGENTE' || i.priority === 'COMPRAR' || i.priority === 'ATENCAO'
  );

  if (shoppingItems.length === 0) {
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text('[NORMAL] Todos os produtos analisados estão abastecidos e dentro dos níveis ideais de segurança.', margin + 4, y + 4.8);
    y += 10;
  } else {
    // Header for Table 1
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    // Columns: Prioridade | Produto | Unidade | Estoque Atual | Consumo/Dia | Autonomia | Estoque Ideal | Comprar
    doc.text('PRIORIDADE', margin + 3, y + 4.2);
    doc.text('PRODUTO / ITEM', margin + 28, y + 4.2);
    doc.text('UNIDADE', margin + 95, y + 4.2);
    doc.text('ESTOQUE ATUAL', margin + 120, y + 4.2);
    doc.text('CONSUMO/DIA', margin + 155, y + 4.2);
    doc.text('AUTONOMIA', margin + 190, y + 4.2);
    doc.text('ESTOQUE IDEAL', margin + 225, y + 4.2);
    doc.text('COMPRAR (SUGESTÃO)', margin + 250, y + 4.2);

    y += 6;

    shoppingItems.forEach((item: any, idx: number) => {
      if (y > 190) {
        doc.addPage();
        renderHeader(doc.getNumberOfPages());
        y = 35;

        // Repeat Table 1 header
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, y, contentWidth, 6, 'F');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('PRIORIDADE', margin + 3, y + 4.2);
        doc.text('PRODUTO / ITEM', margin + 28, y + 4.2);
        doc.text('UNIDADE', margin + 95, y + 4.2);
        doc.text('ESTOQUE ATUAL', margin + 120, y + 4.2);
        doc.text('CONSUMO/DIA', margin + 155, y + 4.2);
        doc.text('AUTONOMIA', margin + 190, y + 4.2);
        doc.text('ESTOQUE IDEAL', margin + 225, y + 4.2);
        doc.text('COMPRAR (SUGESTÃO)', margin + 250, y + 4.2);
        y += 6;
      }

      // Zebra striping
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 5.5, 'F');
      }

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      if (item.priority === 'URGENTE') {
        doc.setFillColor(225, 29, 72); // rose-600
        doc.circle(margin + 4.5, y + 2.7, 1.2, 'F');
        doc.setTextColor(225, 29, 72); // rose-600
        doc.text('URGENTE', margin + 7.5, y + 3.8);
      } else if (item.priority === 'COMPRAR') {
        doc.setFillColor(234, 88, 12); // orange-600
        doc.circle(margin + 4.5, y + 2.7, 1.2, 'F');
        doc.setTextColor(234, 88, 12); // orange-600
        doc.text('COMPRAR', margin + 7.5, y + 3.8);
      } else {
        doc.setFillColor(217, 119, 6); // amber-600
        doc.circle(margin + 4.5, y + 2.7, 1.2, 'F');
        doc.setTextColor(217, 119, 6); // amber-600
        doc.text('ATENÇÃO', margin + 7.5, y + 3.8);
      }

      doc.setTextColor(15, 23, 42);
      doc.text(item.name, margin + 28, y + 3.8);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(item.unit, margin + 95, y + 3.8);
      doc.text(`${item.currentStock}`, margin + 120, y + 3.8);

      if (item.dailyAvgConsumption > 0) {
        doc.text(`${item.dailyAvgConsumption} ${item.unit}/dia`, margin + 155, y + 3.8);
      } else {
        doc.text('0.0 (sem consumo)', margin + 155, y + 3.8);
      }

      if (item.daysAutonomy !== null) {
        doc.text(`${item.daysAutonomy.toFixed(1)} dias`, margin + 190, y + 3.8);
      } else {
        doc.text('Indeterminada', margin + 190, y + 3.8);
      }

      doc.text(`${item.idealStock} ${item.unit}`, margin + 225, y + 3.8);

      // Comprar column
      doc.setFont('helvetica', 'bold');
      if (item.suggestedPurchaseQty > 0) {
        doc.setTextColor(225, 29, 72);
        doc.text(`+${item.suggestedPurchaseQty} ${item.unit}`, margin + 250, y + 3.8);
      } else {
        doc.setTextColor(16, 185, 129);
        doc.text('0', margin + 250, y + 3.8);
      }

      y += 5.5;
    });

    y += 4;
  }

  // TABELA 2: VISÃO COMPLETA DO ESTOQUE & CONCILIAÇÃO FÍSICA (TODOS OS PRODUTOS)
  if (y > 145) {
    doc.addPage();
    renderHeader(doc.getNumberOfPages());
    y = 35;
  }

  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(margin, y, 3, 5.5, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. VISÃO COMPLETA DO ESTOQUE — CONCILIAÇÃO FÍSICA, CONSUMO MÉDIO E AUTONOMIA', margin + 5, y + 4.2);

  y += 7;

  // Header Table 2
  // Colunas: Produto | Unid. | Sistema | Físico | Diferença | Consumo/Dia | Autonomia | Mínimo | Ideal | Comprar | Situação
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);

  doc.text('PRODUTO / ITEM', margin + 3, y + 4.2);
  doc.text('UNID.', margin + 65, y + 4.2);
  doc.text('SISTEMA', margin + 78, y + 4.2);
  doc.text('FÍSICO', margin + 98, y + 4.2);
  doc.text('DIFERENÇA', margin + 116, y + 4.2);
  doc.text('CONSUMO/DIA', margin + 146, y + 4.2);
  doc.text('AUTONOMIA', margin + 176, y + 4.2);
  doc.text('MÍNIMO', margin + 204, y + 4.2);
  doc.text('IDEAL', margin + 220, y + 4.2);
  doc.text('COMPRAR', margin + 236, y + 4.2);
  doc.text('SITUAÇÃO', margin + 252, y + 4.2);

  y += 6;

  forecast.allItems.forEach((item: any, idx: number) => {
    if (y > 185) {
      doc.addPage();
      renderHeader(doc.getNumberOfPages());
      y = 35;

      // Repeat Table 2 Header
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('PRODUTO / ITEM', margin + 3, y + 4.2);
      doc.text('UNID.', margin + 65, y + 4.2);
      doc.text('SISTEMA', margin + 78, y + 4.2);
      doc.text('FÍSICO', margin + 98, y + 4.2);
      doc.text('DIFERENÇA', margin + 116, y + 4.2);
      doc.text('CONSUMO/DIA', margin + 146, y + 4.2);
      doc.text('AUTONOMIA', margin + 176, y + 4.2);
      doc.text('MÍNIMO', margin + 204, y + 4.2);
      doc.text('IDEAL', margin + 220, y + 4.2);
      doc.text('COMPRAR', margin + 236, y + 4.2);
      doc.text('SITUAÇÃO', margin + 252, y + 4.2);
      y += 6;
    }

    // Zebra striping
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 5.2, 'F');
    }

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const pName = item.name.length > 34 ? item.name.substring(0, 32) + '..' : item.name;
    doc.text(pName, margin + 3, y + 3.6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(item.unit, margin + 65, y + 3.6);
    doc.text(`${item.currentStock}`, margin + 78, y + 3.6);

    // Physical count & difference
    if (item.hasPhysicalCount) {
      doc.text(`${item.physicalStock}`, margin + 98, y + 3.6);
      if (item.inventoryStatus === 'DIVERGENTE') {
        doc.setFont('helvetica', 'bold');
        const diffSign = item.physicalDifference > 0 ? `+${item.physicalDifference}` : `${item.physicalDifference}`;
        if (item.physicalDifference > 0) {
          doc.setFillColor(234, 88, 12); // orange
          doc.circle(margin + 114.5, y + 2.5, 1, 'F');
          doc.setTextColor(234, 88, 12);
        } else {
          doc.setFillColor(225, 29, 72); // rose
          doc.circle(margin + 114.5, y + 2.5, 1, 'F');
          doc.setTextColor(225, 29, 72);
        }
        doc.text(diffSign, margin + 117.5, y + 3.6);
      } else {
        doc.setTextColor(5, 150, 105);
        doc.text('0 (OK)', margin + 116, y + 3.6);
      }
    } else {
      doc.text('-', margin + 98, y + 3.6);
      doc.text('-', margin + 116, y + 3.6);
    }

    // Daily Avg
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    if (item.dailyAvgConsumption > 0) {
      doc.text(`${item.dailyAvgConsumption} /dia`, margin + 146, y + 3.6);
    } else {
      doc.text('0.0 (sem reg.)', margin + 146, y + 3.6);
    }

    // Autonomy
    if (item.daysAutonomy !== null) {
      doc.setFont('helvetica', 'bold');
      if (item.daysAutonomy <= 3) {
        doc.setTextColor(225, 29, 72);
      } else if (item.daysAutonomy <= 7) {
        doc.setTextColor(234, 88, 12);
      } else if (item.daysAutonomy <= 15) {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(16, 185, 129);
      }
      doc.text(`${item.daysAutonomy.toFixed(1)} d`, margin + 176, y + 3.6);
    } else {
      doc.setTextColor(148, 163, 184);
      doc.text('Indeterm.', margin + 176, y + 3.6);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${item.minStock}`, margin + 204, y + 3.6);
    doc.text(`${item.idealStock}`, margin + 220, y + 3.6);

    // Suggested purchase
    if (item.suggestedPurchaseQty > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(225, 29, 72);
      doc.text(`+${item.suggestedPurchaseQty}`, margin + 236, y + 3.6);
    } else {
      doc.setTextColor(16, 185, 129);
      doc.text('0', margin + 236, y + 3.6);
    }

    // Situation
    doc.setFont('helvetica', 'bold');
    if (item.situation === 'SEM_ESTOQUE') {
      doc.setTextColor(15, 23, 42);
      doc.text('SEM ESTOQUE', margin + 252, y + 3.6);
    } else if (item.situation === 'COMPRAR') {
      doc.setTextColor(225, 29, 72);
      doc.text('COMPRAR', margin + 252, y + 3.6);
    } else if (item.situation === 'ATENCAO') {
      doc.setTextColor(217, 119, 6);
      doc.text('ATENÇÃO', margin + 252, y + 3.6);
    } else {
      doc.setTextColor(16, 185, 129);
      doc.text('CONFORTÁVEL', margin + 252, y + 3.6);
    }

    y += 5.2;
  });

  y += 4;

  // OBSERVAÇÃO GERENCIAL DA COORDENAÇÃO
  if (y > 165) {
    doc.addPage();
    renderHeader(doc.getNumberOfPages());
    y = 35;
  }

  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'S');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('PARECER GERENCIAL AUTOMÁTICO PARA A COORDENAÇÃO:', margin + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  const splitNotes = doc.splitTextToSize(forecast.managerialObservation, contentWidth - 8);
  doc.text(splitNotes, margin + 4, y + 8.5);

  y += 18;

  // ASSINATURAS
  if (y > 175) {
    doc.addPage();
    renderHeader(doc.getNumberOfPages());
    y = 45;
  }

  doc.setLineWidth(0.4);
  doc.setDrawColor(148, 163, 184);
  doc.line(margin + 20, y + 6, margin + 110, y + 6);
  doc.line(margin + 160, y + 6, margin + 250, y + 6);

  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Coordenação Cristolândia LEM/BA', margin + 40, y + 10.5);
  doc.text('Responsável pelo Almoxarifado / Estoque', margin + 175, y + 10.5);

  // Rastreabilidade e Numeração de Páginas em Todas as Páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'Relatório gerado automaticamente pelo sistema Estoque Cristolândia. Sistema em modo 100% somente leitura. Este relatório não altera os saldos ou registros do estoque.',
      margin,
      pageHeight - 6
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 22, pageHeight - 6);
  }

  // Save / Download PDF
  const filename = `Relatorio_Estoque_Necessidade_Compras_Cristolandia_${periodDays}dias_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

const PT_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const PT_WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function generateMonthlyMealsPDF(
  meals: DailyMealRecord[],
  monthStr: string, // 'YYYY-MM', e.g. '2026-08'
  title = 'Relatório Mensal de Refeições Servidas'
) {
  const doc = new jsPDF();
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');

  // Parse month and year
  const [yearPart, monthPart] = monthStr.split('-');
  const monthIdx = parseInt(monthPart, 10) - 1;
  const monthName = PT_MONTHS[monthIdx] || monthPart;
  const formattedMonthYear = `${monthName} de ${yearPart}`;

  // Filter records for this month and sort ascending
  const monthRecords = meals
    .filter((m) => m.date.startsWith(monthStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute metrics
  const totalDaysRecorded = monthRecords.length;
  const totalBreakfast = monthRecords.reduce((sum, m) => sum + (Number(m.breakfast) || 0), 0);
  const totalLunch = monthRecords.reduce((sum, m) => sum + (Number(m.lunch) || 0), 0);
  const totalSnack = monthRecords.reduce((sum, m) => sum + (Number(m.afternoonSnack) || 0), 0);
  const totalDinner = monthRecords.reduce((sum, m) => sum + (Number(m.dinner) || 0), 0);
  const totalMonthMeals = monthRecords.reduce((sum, m) => sum + (Number(m.totalMeals) || 0), 0);

  const avgBreakfast = totalDaysRecorded > 0 ? Math.round(totalBreakfast / totalDaysRecorded) : 0;
  const avgLunch = totalDaysRecorded > 0 ? Math.round(totalLunch / totalDaysRecorded) : 0;
  const avgSnack = totalDaysRecorded > 0 ? Math.round(totalSnack / totalDaysRecorded) : 0;
  const avgDinner = totalDaysRecorded > 0 ? Math.round(totalDinner / totalDaysRecorded) : 0;
  const avgDailyMeals = totalDaysRecorded > 0 ? Math.round(totalMonthMeals / totalDaysRecorded) : 0;

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
    doc.text(
      `Gerado em: ${dateStr} às ${timeStr} | Controle de Cozinha & Refeitório | Página ${pageNumber}`,
      14,
      25
    );
  };

  renderHeader(1);

  // Document Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${title.toUpperCase()} — ${formattedMonthYear.toUpperCase()}`, 14, 38);

  // Executive Summary Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, 42, 182, 33, 2, 2, 'FD');

  // KPI 1: Total Geral do Mês
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('TOTAL REFEIÇÕES NO MÊS', 18, 48);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`${totalMonthMeals.toLocaleString('pt-BR')}`, 18, 56);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${totalDaysRecorded} ${totalDaysRecorded === 1 ? 'dia registrado' : 'dias registrados'}`, 18, 62);

  // KPI 2: Média Diária Geral
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('MÉDIA DIÁRIA GERAL', 58, 48);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(`${avgDailyMeals}`, 58, 56);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('refeições / dia', 58, 62);

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.line(98, 44, 98, 72);

  // Breakdown by Meal (Averages & Totals) - Clean, aligned, no broken emojis
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('MÉDIAS DIÁRIAS POR REFEIÇÃO (PESSOAS/DIA):', 104, 48);

  // Row 1: Café da Manhã (Amber)
  doc.setFillColor(217, 119, 6);
  doc.circle(106, 52.8, 1.1, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Café da Manhã:', 109, 53.5);
  doc.setTextColor(180, 83, 9);
  doc.text(`${avgBreakfast} pessoas/dia`, 133, 53.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`(Total: ${totalBreakfast.toLocaleString('pt-BR')})`, 161, 53.5);

  // Row 2: Almoço (Emerald)
  doc.setFillColor(16, 185, 129);
  doc.circle(106, 58.3, 1.1, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Almoço (Pico):', 109, 59.0);
  doc.setTextColor(4, 120, 87);
  doc.text(`${avgLunch} pessoas/dia`, 133, 59.0);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`(Total: ${totalLunch.toLocaleString('pt-BR')})`, 161, 59.0);

  // Row 3: Lanche 16h (Orange)
  doc.setFillColor(249, 115, 22);
  doc.circle(106, 63.8, 1.1, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Lanche 16h:', 109, 64.5);
  doc.setTextColor(194, 65, 12);
  doc.text(`${avgSnack} pessoas/dia`, 133, 64.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`(Total: ${totalSnack.toLocaleString('pt-BR')})`, 161, 64.5);

  // Row 4: Jantar (Indigo)
  doc.setFillColor(99, 102, 241);
  doc.circle(106, 69.3, 1.1, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('Jantar:', 109, 70.0);
  doc.setTextColor(67, 56, 202);
  doc.text(`${avgDinner} pessoas/dia`, 133, 70.0);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`(Total: ${totalDinner.toLocaleString('pt-BR')})`, 161, 70.0);

  // TABLE HEADER
  let y = 80;
  const renderTableHeader = (currentY: number) => {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(14, currentY, 182, 7.5, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('DATA / DIA', 18, currentY + 5.2);
    doc.text('CAFÉ', 60, currentY + 5.2);
    doc.text('ALMOÇO', 78, currentY + 5.2);
    doc.text('LANCHE 16H', 98, currentY + 5.2);
    doc.text('JANTAR', 122, currentY + 5.2);
    doc.text('TOTAL DIA', 142, currentY + 5.2);
    doc.text('RESPONSÁVEL', 165, currentY + 5.2);
  };

  renderTableHeader(y);
  y += 7.5;

  if (monthRecords.length === 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhum registro de refeição encontrado para o mês selecionado.', 18, y + 10);
    y += 20;
  } else {
    monthRecords.forEach((record, index) => {
      if (y > 265) {
        doc.addPage();
        renderHeader(doc.getNumberOfPages());
        y = 38;
        renderTableHeader(y);
        y += 7.5;
      }

      // Zebra striping
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 6.5, 'F');
      }

      // Format Date & Weekday
      const dateParts = record.date.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : record.date;
      const dObj = new Date(`${record.date}T12:00:00Z`);
      const weekday = PT_WEEKDAYS[dObj.getUTCDay()] || '';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${formattedDate} (${weekday})`, 18, y + 4.5);

      // Quantities
      doc.text(String(record.breakfast || 0), 63, y + 4.5);
      doc.text(String(record.lunch || 0), 82, y + 4.5);
      doc.text(String(record.afternoonSnack || 0), 103, y + 4.5);
      doc.text(String(record.dinner || 0), 125, y + 4.5);

      // Total Day in bold
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(String(record.totalMeals || 0), 146, y + 4.5);

      // Responsible
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      const respName = (record.responsible || '-').substring(0, 24);
      doc.text(respName, 165, y + 4.5);

      y += 6.5;
    });

    // TOTALS ROW
    if (y > 255) {
      doc.addPage();
      renderHeader(doc.getNumberOfPages());
      y = 38;
    }

    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, y, 182, 7, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL DO MÊS:', 18, y + 4.8);
    doc.text(String(totalBreakfast), 63, y + 4.8);
    doc.text(String(totalLunch), 82, y + 4.8);
    doc.text(String(totalSnack), 103, y + 4.8);
    doc.text(String(totalDinner), 125, y + 4.8);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(String(totalMonthMeals), 146, y + 4.8);
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Soma Geral', 165, y + 4.8);

    y += 7;

    // AVERAGES ROW
    doc.setFillColor(255, 251, 235); // amber-50
    doc.rect(14, y, 182, 7, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('MÉDIA DIÁRIA:', 18, y + 4.8);
    doc.text(`${avgBreakfast}/dia`, 60, y + 4.8);
    doc.text(`${avgLunch}/dia`, 79, y + 4.8);
    doc.text(`${avgSnack}/dia`, 100, y + 4.8);
    doc.text(`${avgDinner}/dia`, 122, y + 4.8);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text(`${avgDailyMeals}/dia`, 144, y + 4.8);
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Média por Turno', 165, y + 4.8);

    y += 13;
  }

  // Signatures
  if (y > 240) {
    doc.addPage();
    renderHeader(doc.getNumberOfPages());
    y = 50;
  }

  doc.setLineWidth(0.3);
  doc.setDrawColor(148, 163, 184);
  doc.line(20, y + 10, 95, y + 10);
  doc.line(115, y + 10, 190, y + 10);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Responsável pela Cozinha / Refeitório', 28, y + 15);
  doc.text('Coordenação Geral Cristolândia LEM/BA', 120, y + 15);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Documento interno emitido pelo Sistema de Estoque & Refeições Cristolândia LEM/BA. Registros auditados.',
      14,
      290
    );
    doc.text(`Página ${i} de ${totalPages}`, 175, 290);
  }

  const filename = `Relatorio_Mensal_Refeicoes_Cristolandia_${yearPart}_${monthPart}.pdf`;
  doc.save(filename);
}



