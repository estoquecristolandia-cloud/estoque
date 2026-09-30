import jsPDF from 'jspdf';
import { AiAssistantResponse } from '../types';

interface ParsedMarkdownTable {
  headers: string[];
  rows: string[][];
}

interface AnalysisSection {
  type: 'heading' | 'subheading' | 'paragraph' | 'bullet' | 'table';
  content?: string;
  table?: ParsedMarkdownTable;
}

function parseDetailedAnalysis(text: string): AnalysisSection[] {
  const sections: AnalysisSection[] = [];
  if (!text) return sections;

  const paragraphs = text.split('\n\n');

  for (const rawPara of paragraphs) {
    const trimmed = rawPara.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('### ')) {
      sections.push({
        type: 'heading',
        content: trimmed.replace(/^###\s+/, '').replace(/\*\*/g, ''),
      });
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      sections.push({
        type: 'subheading',
        content: trimmed.replace(/^####\s+/, '').replace(/\*\*/g, ''),
      });
      continue;
    }

    // Markdown Table
    if (trimmed.startsWith('|')) {
      const lines = trimmed
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('|') && !l.includes(':---') && !l.includes('---'));

      if (lines.length >= 2) {
        const headers = lines[0]
          .split('|')
          .map((c) => c.trim().replace(/\*\*/g, ''))
          .filter(Boolean);

        const rows = lines.slice(1).map((line) =>
          line
            .split('|')
            .map((c) => c.trim().replace(/\*\*/g, ''))
            .filter((_, idx, arr) => idx > 0 && idx < arr.length) // strip outer empty cells
        );

        sections.push({
          type: 'table',
          table: { headers, rows },
        });
        continue;
      }
    }

    // Bullet points
    const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
    const hasBullets = lines.some((l) => l.trim().startsWith('•') || l.trim().startsWith('-'));

    if (hasBullets) {
      for (const line of lines) {
        const clean = line.trim().replace(/^[•\-]\s*/, '').replace(/\*\*/g, '');
        sections.push({
          type: 'bullet',
          content: clean,
        });
      }
      continue;
    }

    // Normal paragraph
    sections.push({
      type: 'paragraph',
      content: trimmed.replace(/\*\*/g, ''),
    });
  }

  return sections;
}

export function exportAiAssistantReportPDF(
  response: AiAssistantResponse,
  isDml: boolean
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');

  let y = 0;

  // Helper for page break
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > 275) {
      doc.addPage();
      renderPageHeader();
      y = 38;
    }
  };

  // Repeated compact header for secondary pages
  const renderPageHeader = () => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 16, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(
      isDml
        ? 'CRISTOLÂNDIA (LEM/BA) • RELATÓRIO DE INTELIGÊNCIA DML & HIGIENE'
        : 'CRISTOLÂNDIA (LEM/BA) • RELATÓRIO DE INTELIGÊNCIA & AUDITORIA DE ESTOQUE',
      marginX,
      7.5
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225);
    doc.text(`Emissão: ${dateStr} ${timeStr}`, pageWidth - marginX - 35, 7.5);

    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, 16, pageWidth - marginX, 16);
  };

  // 1. PRIMEIRA PÁGINA: BANNER SUPERIOR EXECUTIVO (SLATE-900)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Badge institucional
  doc.setFillColor(245, 158, 11); // amber-500
  doc.roundedRect(marginX, 7, 65, 4.5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('JUNTA DE MISSÕES NACIONAIS • CBB', marginX + 3, 10.2);

  // Título principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(
    isDml
      ? 'RELATÓRIO AUDITADO — DML & MATERIAIS DE HIGIENE'
      : 'RELATÓRIO AUDITADO — ALIMENTAÇÃO & SUPRIMENTOS',
    marginX,
    18
  );

  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text(
    'Centro de Formação e Assistência Social Cristolândia • Luís Eduardo Magalhães (BA)',
    marginX,
    23.5
  );

  // Metadados da emissão
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Documento Oficial de Inteligência Operacional • Emitido em: ${dateStr} às ${timeStr}`,
    marginX,
    28.5
  );

  y = 38;

  // 2. CAIXA DA CONSULTA AUDITADA (PERGUNTA DO USUÁRIO)
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(marginX, y, contentWidth, 16, 2, 2, 'FD');

  // Faixa lateral de destaque
  doc.setFillColor(isDml ? 8 : 16, isDml ? 145 : 185, isDml ? 178 : 129); // cyan-600 ou emerald-500
  doc.roundedRect(marginX, y, 2.5, 16, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(isDml ? 14 : 5, isDml ? 116 : 150, isDml ? 144 : 105);
  doc.text('CONSULTA DO ASSISTENTE IA:', marginX + 6, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42); // slate-900
  const splitQuery = doc.splitTextToSize(`"${response.query}"`, contentWidth - 12);
  doc.text(splitQuery, marginX + 6, y + 11);

  y += 20;

  // 3. CAIXA BENTO DE MÉTRICAS PRINCIPAIS (AUDITORIA DOS DADOS)
  const calc = response.calculationBase;
  const colW = (contentWidth - 6) / 3; // 3 colunas de ~58mm cada
  const bentoH = 15;

  // Card 1: Período
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(marginX, y, colW, bentoH, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PERÍODO ANALISADO', marginX + 3.5, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const periodText = doc.splitTextToSize(calc.periodAnalyzed || 'Histórico Completo', colW - 7);
  doc.text(periodText, marginX + 3.5, y + 10);

  // Card 2: Lançamentos Auditados
  const col2X = marginX + colW + 3;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(col2X, y, colW, bentoH, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('LANÇAMENTOS CONSIDERADOS', col2X + 3.5, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${calc.movementsCount} movimentações`, col2X + 3.5, y + 10);

  // Card 3: Total Calculado / Status
  const col3X = col2X + colW + 3;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(col3X, y, colW, bentoH, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('TOTAL AUDITADO NO PERÍODO', col3X + 3.5, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text(`${calc.totalQuantity} ${calc.unit || 'itens'}`, col3X + 3.5, y + 10.5);

  y += bentoH + 5;

  // 4. RESUMO EXECUTIVO (PAINEL DESTACADO)
  checkPageBreak(30);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);

  const summaryLines = doc.splitTextToSize(response.summary || 'Sem resumo fornecido.', contentWidth - 10);
  const summaryHeight = summaryLines.length * 4.5 + 13;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, y, contentWidth, summaryHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('RESUMO EXECUTIVO DA ANÁLISE', marginX + 5, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(summaryLines, marginX + 5, y + 11);

  y += summaryHeight + 6;

  // 5. SEÇÕES DO DETALHAMENTO TÉCNICO (TABELAS DE RANKING, PRODUTOS E PARÁGRAFOS)
  const sections = parseDetailedAnalysis(response.detailedAnalysis);

  for (const sec of sections) {
    if (sec.type === 'heading') {
      checkPageBreak(12);
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(sec.content || '', marginX, y);
      y += 5;
      continue;
    }

    if (sec.type === 'subheading') {
      checkPageBreak(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text(sec.content || '', marginX, y);
      y += 4.5;
      continue;
    }

    if (sec.type === 'bullet') {
      checkPageBreak(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text('•', marginX + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const bulletLines = doc.splitTextToSize(sec.content || '', contentWidth - 8);
      doc.text(bulletLines, marginX + 6, y);
      y += bulletLines.length * 4 + 1.5;
      continue;
    }

    if (sec.type === 'paragraph') {
      checkPageBreak(10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const pLines = doc.splitTextToSize(sec.content || '', contentWidth);
      doc.text(pLines, marginX, y);
      y += pLines.length * 4 + 2;
      continue;
    }

    // RENDERIZAÇÃO DE TABELA MARKDOWN (ZEBRADA COM CABEÇALHO SLATE-800)
    if (sec.type === 'table' && sec.table) {
      const { headers, rows } = sec.table;
      if (headers.length === 0) continue;

      const numCols = headers.length;
      const tableWidth = contentWidth;
      const cellWidth = tableWidth / numCols;
      const rowHeight = 6.5;

      checkPageBreak(14 + rows.length * rowHeight);

      // Cabeçalho da Tabela (Slate-800)
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(marginX, y, tableWidth, 7, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      headers.forEach((h, colIdx) => {
        const cellX = marginX + colIdx * cellWidth + 2;
        doc.text(h.toUpperCase(), cellX, y + 4.8);
      });

      y += 7;

      // Linhas da Tabela
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      rows.forEach((row, rowIdx) => {
        checkPageBreak(rowHeight);

        // Zebra striping
        if (rowIdx % 2 === 0) {
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(marginX, y, tableWidth, rowHeight, 'F');
        }

        // Borda inferior suave
        doc.setDrawColor(241, 245, 249);
        doc.line(marginX, y + rowHeight, marginX + tableWidth, y + rowHeight);

        doc.setTextColor(15, 23, 42); // slate-900

        row.forEach((cell, colIdx) => {
          if (colIdx >= numCols) return;
          const cellX = marginX + colIdx * cellWidth + 2;
          const truncated = doc.splitTextToSize(cell || '-', cellWidth - 4)[0] || '-';
          doc.text(truncated, cellX, y + 4.5);
        });

        y += rowHeight;
      });

      y += 5; // Respiro pós tabela
    }
  }

  // 6. TABELA CRONOLÓGICA DE LANÇAMENTOS AUDITADOS
  if (calc.movementsSummary && calc.movementsSummary.length > 0) {
    checkPageBreak(25);

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('RASTREABILIDADE CRONOLÓGICA DOS LANÇAMENTOS:', marginX, y);
    y += 5;

    // Colunas fixas otimizadas
    const colWidths = [24, 18, 52, 26, 32, 30]; // total = 182mm
    const colTitles = ['DATA/HORA', 'TIPO', 'PRODUTO', 'QUANTIDADE', 'RESPONSÁVEL', 'SETOR'];

    const renderMovTableHeader = () => {
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(marginX, y, contentWidth, 6.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);

      let curX = marginX;
      colTitles.forEach((title, idx) => {
        doc.text(title, curX + 2, y + 4.5);
        curX += colWidths[idx];
      });

      y += 6.5;
    };

    renderMovTableHeader();

    const maxItems = Math.min(calc.movementsSummary.length, 35);
    const movRows = calc.movementsSummary.slice(0, maxItems);

    movRows.forEach((m, idx) => {
      if (y + 6 > 275) {
        doc.addPage();
        renderPageHeader();
        y = 38;
        renderMovTableHeader();
      }

      // Zebra striping
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, contentWidth, 5.8, 'F');
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, y + 5.8, marginX + contentWidth, y + 5.8);

      let curX = marginX;

      // 1. Data/Hora
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      const timeClean = m.time ? ` ${m.time}` : '';
      doc.text(`${m.date}${timeClean}`, curX + 1.5, y + 4);
      curX += colWidths[0];

      // 2. Tipo (Badge)
      doc.setFont('helvetica', 'bold');
      if (m.type === 'entrada') {
        doc.setTextColor(5, 150, 105);
        doc.text('ENTRADA', curX + 1.5, y + 4);
      } else if (m.type === 'saida') {
        doc.setTextColor(225, 29, 72);
        doc.text('SAÍDA', curX + 1.5, y + 4);
      } else {
        doc.setTextColor(79, 70, 229);
        doc.text('AJUSTE', curX + 1.5, y + 4);
      }
      curX += colWidths[1];

      // 3. Produto
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const prodName = doc.splitTextToSize(m.productName || '-', colWidths[2] - 3)[0] || '-';
      doc.text(prodName, curX + 1.5, y + 4);
      curX += colWidths[2];

      // 4. Quantidade
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${m.quantity} ${m.unit || ''}`, curX + 1.5, y + 4);
      curX += colWidths[3];

      // 5. Responsável
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const respName = doc.splitTextToSize(m.responsible || '-', colWidths[4] - 3)[0] || '-';
      doc.text(respName, curX + 1.5, y + 4);
      curX += colWidths[4];

      // 6. Setor
      const sectorName = doc.splitTextToSize(m.sector || '-', colWidths[5] - 3)[0] || '-';
      doc.text(sectorName, curX + 1.5, y + 4);

      y += 5.8;
    });

    if (calc.movementsSummary.length > maxItems) {
      y += 3;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `* Exibindo os primeiros ${maxItems} de ${calc.movementsSummary.length} registros auditados. A consulta completa permanece preservada no histórico digital.`,
        marginX,
        y
      );
      y += 5;
    }
  }

  // 7. CONCLUSÕES E INSIGHTS (SE HOUVER)
  if (response.insights && response.insights.length > 0) {
    checkPageBreak(25);
    y += 4;

    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(251, 191, 36); // amber-400
    doc.roundedRect(marginX, y, contentWidth, 6 + response.insights.length * 4.5, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('INSIGHTS & OBSERVAÇÕES OPERACIONAIS:', marginX + 3.5, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(69, 26, 3); // amber-950

    let insightY = y + 9;
    response.insights.forEach((ins) => {
      doc.text(`• ${ins.replace(/\*\*/g, '')}`, marginX + 5, insightY);
      insightY += 4.5;
    });

    y = insightY + 4;
  }

  // 8. BLOCO DE ASSINATURAS FORMAIS (PADRÃO JMN / AUDITORIA)
  y = Math.max(y + 12, 245);
  if (y > 260) {
    doc.addPage();
    renderPageHeader();
    y = 230;
  }

  doc.setLineWidth(0.4);
  doc.setDrawColor(203, 213, 225); // slate-300

  // Linha 1: Gestor do Estoque
  doc.line(marginX + 10, y, marginX + 75, y);
  // Linha 2: Coordenação / Pastor
  doc.line(marginX + 105, y, marginX + 170, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('Marconi Castro', marginX + 42.5, y + 4.5, { align: 'center' });
  doc.text('Coordenação / Direção Cristolândia', marginX + 137.5, y + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Gestor do Estoque & Suprimentos (LEM/BA)', marginX + 42.5, y + 8, { align: 'center' });
  doc.text('Centro de Formação e Assistência Social • JMN', marginX + 137.5, y + 8, { align: 'center' });

  // Rodapé técnico
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Auditoria Digital Cristolândia • ID da Consulta: ia-${Date.now()} • Documento Válido para Prestação de Contas`,
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );

  // Nome do arquivo padronizado
  const sanitizedQuery = response.query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);

  const fileName = `Relatorio_IA_Cristolandia_${sanitizedQuery}_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
