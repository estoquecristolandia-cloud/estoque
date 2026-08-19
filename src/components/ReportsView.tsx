import React, { useState, useMemo } from 'react';
import { Product, StockMovement, Sector } from '../types';
import { calculateDaysRemaining, verifyProductAudit, getTodayDateString } from '../utils/storage';
import { generateInventoryPDF, generateMovementsDetailedPDF } from '../utils/pdfExport';
import {
  FileText,
  Printer,
  Download,
  ShoppingCart,
  Users,
  PackageCheck,
  Building2,
  CheckCircle2,
  Utensils,
  UserCheck,
  Package,
  Filter,
  ChevronRight,
  Calendar,
  Calculator,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Layers,
  History,
} from 'lucide-react';

interface ReportsViewProps {
  products: Product[];
  movements: StockMovement[];
}

interface ProductInSector {
  productName: string;
  unit: string;
  totalQty: number;
  withdrawalsCount: number;
  responsibles: Record<string, number>; // personName -> totalQty
}

interface ResponsibleInSector {
  personName: string;
  totalQty: number;
  withdrawalsCount: number;
  productsRetrieved: Record<string, { qty: number; unit: string }>; // productName -> { qty, unit }
}

interface SectorDetails {
  sectorName: string;
  totalVol: number;
  movementsCount: number;
  products: Record<string, ProductInSector>;
  responsibles: Record<string, ResponsibleInSector>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ products, movements }) => {
  const [activeReportTab, setActiveReportTab] = useState<'daily_ledger' | 'product' | 'sector' | 'person' | 'shopping'>('daily_ledger');
  const [bufferDays, setBufferDays] = useState<number>(30); // Target buffer days e.g. 15 or 30 days
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('todos');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Daily Ledger Tab filters
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'entrada' | 'saida'>('all');
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');

  // Date Filter State
  const todayStr = getTodayDateString();
  const [datePreset, setDatePreset] = useState<'all' | 'month' | '7days' | 'today' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const { startDate, endDate } = useMemo(() => {
    if (datePreset === 'all') return { startDate: '2026-08-01', endDate: todayStr };
    if (datePreset === 'month') {
      const parts = todayStr.split('-');
      return { startDate: `${parts[0]}-${parts[1]}-01`, endDate: todayStr };
    }
    if (datePreset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return { startDate: `${y}-${m}-${day}`, endDate: todayStr };
    }
    if (datePreset === 'today') return { startDate: todayStr, endDate: todayStr };
    return { startDate: customStartDate || '2026-08-01', endDate: customEndDate || todayStr };
  }, [datePreset, customStartDate, customEndDate, todayStr]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (startDate && m.date < startDate) return false;
      if (endDate && m.date > endDate) return false;
      return true;
    });
  }, [movements, startDate, endDate]);

  // Grouped Movements for Day by Day Ledger
  const ledgerGroupedDays = useMemo(() => {
    let list = filteredMovements;
    if (ledgerTypeFilter !== 'all') {
      list = list.filter((m) => m.type === ledgerTypeFilter);
    }
    if (ledgerSearchTerm.trim()) {
      const q = ledgerSearchTerm.toLowerCase();
      list = list.filter(
        (m) =>
          m.productName.toLowerCase().includes(q) ||
          (m.retrievedBy && m.retrievedBy.toLowerCase().includes(q)) ||
          (m.receivedBy && m.receivedBy.toLowerCase().includes(q)) ||
          (m.supplierOrDonor && m.supplierOrDonor.toLowerCase().includes(q)) ||
          (m.sector && m.sector.toLowerCase().includes(q)) ||
          (m.notes && m.notes.toLowerCase().includes(q))
      );
    }

    const map: Record<string, StockMovement[]> = {};
    list.forEach((m) => {
      if (!map[m.date]) map[m.date] = [];
      map[m.date].push(m);
    });

    const sortedDates = Object.keys(map).sort().reverse();
    return sortedDates.map((dateStr) => {
      const items = map[dateStr].sort((a, b) => (b.time || '').localeCompare(a.time || ''));
      const entriesCount = items.filter((m) => m.type === 'entrada').length;
      const exitsCount = items.filter((m) => m.type === 'saida').length;
      const entriesVolume = items.filter((m) => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0);
      const exitsVolume = items.filter((m) => m.type === 'saida').reduce((s, m) => s + m.quantity, 0);

      // Date label formatting
      let dateLabel = dateStr;
      try {
        const [yr, mo, dy] = dateStr.split('-');
        const dObj = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, parseInt(dy, 10));
        const weekDay = dObj.toLocaleDateString('pt-BR', { weekday: 'long' });
        const capitalizedWeekday = weekDay.charAt(0).toUpperCase() + weekDay.slice(1);
        dateLabel = `${dy}/${mo}/${yr} — ${capitalizedWeekday}`;
      } catch {
        // fallback
      }

      return {
        dateStr,
        dateLabel,
        items,
        entriesCount,
        exitsCount,
        entriesVolume,
        exitsVolume,
      };
    });
  }, [filteredMovements, ledgerTypeFilter, ledgerSearchTerm]);

  // Overall metrics in filtered period
  const periodTotalEntriesQty = useMemo(
    () => filteredMovements.filter((m) => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0),
    [filteredMovements]
  );
  const periodTotalExitsQty = useMemo(
    () => filteredMovements.filter((m) => m.type === 'saida').reduce((s, m) => s + m.quantity, 0),
    [filteredMovements]
  );
  const periodTotalEntriesCount = useMemo(
    () => filteredMovements.filter((m) => m.type === 'entrada').length,
    [filteredMovements]
  );
  const periodTotalExitsCount = useMemo(
    () => filteredMovements.filter((m) => m.type === 'saida').length,
    [filteredMovements]
  );

  // Calculate Shopping Recommendations
  const shoppingList = products
    .map((p) => {
      const days = calculateDaysRemaining(p);
      const neededQtyForBuffer = Math.max(0, Math.ceil(p.dailyAvgConsumption * bufferDays - p.currentStock));
      return {
        ...p,
        daysRemaining: days,
        neededQtyForBuffer,
      };
    })
    .filter((p) => p.neededQtyForBuffer > 0 || p.daysRemaining <= 10)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const handleCopyWhatsAppText = () => {
    let msg = `*CRISTOLÂNDIA - PEDIDO DE DOAÇÕES DE ALIMENTOS*\n`;
    msg += `*Meta de Abastecimento:* ${bufferDays} dias\n\n`;
    msg += `Paz do Senhor! Para mantermos a cozinha e padaria da Cristolândia supridas, compartilhamos nossa lista de necessidades:\n\n`;

    const criticals = shoppingList.filter((item) => item.daysRemaining <= 5);
    const warnings = shoppingList.filter((item) => item.daysRemaining > 5);

    if (criticals.length > 0) {
      msg += `🚨 *ITENS URGENTES (REPOSIÇÃO IMEDIATA):*\n`;
      criticals.forEach((item) => {
        msg += `• *${item.name}*: +${item.neededQtyForBuffer} ${item.unit} (Resta para ${item.daysRemaining} dias)\n`;
      });
      msg += `\n`;
    }

    if (warnings.length > 0) {
      msg += `🟡 *OUTROS SUPRIMENTOS:*\n`;
      warnings.forEach((item) => {
        msg += `• *${item.name}*: +${item.neededQtyForBuffer} ${item.unit}\n`;
      });
      msg += `\n`;
    }

    msg += `📍 *Local de Recebimento:* Cristolândia - Central de Abastecimento\n`;
    msg += `Agradecemos pelo apoio e generosidade com a obra missionária! 🙏✨`;

    navigator.clipboard.writeText(msg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  // Group Movements into detailed Sector Data based on Date Filter
  const sectorDetailsMap: Record<string, SectorDetails> = {};
  filteredMovements
    .filter((m) => m.type === 'saida')
    .forEach((m) => {
      const sec = m.sector || 'Outros';
      const prodName = m.productName || 'Produto Não Especificado';
      const unit = m.unit || 'unidade';
      const person = m.retrievedBy?.trim() || 'Não Informado';
      const qty = m.quantity || 0;

      if (!sectorDetailsMap[sec]) {
        sectorDetailsMap[sec] = {
          sectorName: sec,
          totalVol: 0,
          movementsCount: 0,
          products: {},
          responsibles: {},
        };
      }

      const secObj = sectorDetailsMap[sec];
      secObj.totalVol += qty;
      secObj.movementsCount += 1;

      // Product breakdown
      if (!secObj.products[prodName]) {
        secObj.products[prodName] = {
          productName: prodName,
          unit,
          totalQty: 0,
          withdrawalsCount: 0,
          responsibles: {},
        };
      }
      secObj.products[prodName].totalQty += qty;
      secObj.products[prodName].withdrawalsCount += 1;
      secObj.products[prodName].responsibles[person] = (secObj.products[prodName].responsibles[person] || 0) + qty;

      // Responsible breakdown
      if (!secObj.responsibles[person]) {
        secObj.responsibles[person] = {
          personName: person,
          totalQty: 0,
          withdrawalsCount: 0,
          productsRetrieved: {},
        };
      }
      secObj.responsibles[person].totalQty += qty;
      secObj.responsibles[person].withdrawalsCount += 1;
      if (!secObj.responsibles[person].productsRetrieved[prodName]) {
        secObj.responsibles[person].productsRetrieved[prodName] = { qty: 0, unit };
      }
      secObj.responsibles[person].productsRetrieved[prodName].qty += qty;
    });

  // Group Movements by Responsible Person overall based on Date Filter
  const personSummary: Record<string, { totalRetrieved: number; sector: string; count: number; itemsList: string[] }> = {};
  filteredMovements
    .filter((m) => m.type === 'saida' && m.retrievedBy)
    .forEach((m) => {
      const person = m.retrievedBy!.trim();
      const sec = m.sector || 'Outros';
      const prodName = m.productName || 'Produto';
      if (!personSummary[person]) {
        personSummary[person] = { totalRetrieved: 0, sector: sec, count: 0, itemsList: [] };
      }
      personSummary[person].totalRetrieved += m.quantity;
      personSummary[person].count += 1;
      if (!personSummary[person].itemsList.includes(prodName)) {
        personSummary[person].itemsList.push(prodName);
      }
    });

  const sectorNamesList = Object.keys(sectorDetailsMap).sort();

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeReportTab === 'daily_ledger') {
      csvContent += 'Data,Hora,Tipo,Produto,Quantidade,Unidade,Setor/Origem,Responsavel/Recebedor,Observacoes\n';
      const sortedMovs = [...filteredMovements].sort((a, b) =>
        (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))
      );
      sortedMovs.forEach((m) => {
        const sectorOrSupplier =
          m.type === 'entrada' ? m.supplierOrDonor || m.entryType || 'Doação/Compra' : m.sector || 'Cozinha';
        const resp = m.retrievedBy || m.receivedBy || m.deliveredBy || '';
        csvContent += `"${m.date}","${m.time || ''}","${m.type.toUpperCase()}","${m.productName}",${m.quantity},"${m.unit}","${sectorOrSupplier}","${resp}","${m.notes || ''}"\n`;
      });
    } else if (activeReportTab === 'sector') {
      csvContent += 'Setor,Alimento/Produto,Quantidade Consumida,Unidade,N de Retiradas,Pessoas Responsaveis\n';
      Object.values(sectorDetailsMap).forEach((sec) => {
        Object.values(sec.products).forEach((p) => {
          const respStr = Object.entries(p.responsibles)
            .map(([rName, rQty]) => `${rName} (${rQty} ${p.unit})`)
            .join(' | ');
          csvContent += `"${sec.sectorName}","${p.productName}",${p.totalQty},"${p.unit}",${p.withdrawalsCount},"${respStr}"\n`;
        });
      });
    } else if (activeReportTab === 'person') {
      csvContent += 'Responsavel,Setor,Retiradas Efetuadas,Volume Total,Alimentos Retirados\n';
      Object.entries(personSummary).forEach(([personName, data]) => {
        csvContent += `"${personName}","${data.sector}",${data.count},${data.totalRetrieved},"${data.itemsList.join(', ')}"\n`;
      });
    } else if (activeReportTab === 'product') {
      csvContent += 'Produto,Categoria,Saldo Inicial,Total Entradas,Total Saidas,Saldo Calculado,Estoque Atual,Status Auditoria\n';
      products.forEach((p) => {
        const audit = verifyProductAudit(p, movements, startDate, endDate);
        const status = audit.isBalanced ? 'CONCILIADO' : 'DIVERGENTE';
        csvContent += `"${p.name}","${p.category}",${audit.initialStock},${audit.totalEntries},${audit.totalExits},${audit.calculatedBalance},${p.currentStock},"${status}"\n`;
      });
    } else {
      csvContent += 'Produto,Categoria,Estoque Atual,Consumo Diario,Dias Restantes,Mínimo,Comprar Recomendado (30d)\n';
      products.forEach((p) => {
        const days = calculateDaysRemaining(p);
        const buyNeeded = Math.max(0, Math.ceil(p.dailyAvgConsumption * 30 - p.currentStock));
        csvContent += `"${p.name}","${p.category}",${p.currentStock},${p.dailyAvgConsumption},${days},${p.minStock},${buyNeeded}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_${activeReportTab}_cristolandia_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" />
            Central de Relatórios & Extratos de Estoque
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Extratos diários cronológicos com todas as entradas e saídas, balanço por produto, setor e previsão de compras.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => generateMovementsDetailedPDF(filteredMovements, 'Extrato Oficial de Entradas e Saídas (Dia a Dia)', startDate, endDate)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all hover:scale-[1.02]"
            title="Baixar Extrato Completo com todas as Entradas e Saídas Dia a Dia em PDF"
          >
            <FileText className="w-4 h-4" />
            <span>📄 Baixar Extrato Dia a Dia (PDF)</span>
          </button>
          <button
            onClick={() => generateInventoryPDF(products, movements, 'Relatório Oficial de Auditoria e Controle de Estoque')}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
            title="Baixar Relatório de Saldo e Inventário Atual em PDF"
          >
            <PackageCheck className="w-4 h-4 text-indigo-500" />
            <span>📦 PDF Saldo do Estoque</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-all"
            title="Baixar planilha formatada para Excel com todas as movimentações"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel (CSV)</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Report Sub-Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveReportTab('daily_ledger')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeReportTab === 'daily_ledger'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>📋 Extrato Dia a Dia (Entradas & Saídas)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('product')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeReportTab === 'product'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>📦 Balanço por Produto (Saldos)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('sector')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeReportTab === 'sector'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>🏢 Relatório por Setor (Alimentos & Destino)</span>
        </button>

        <button
          onClick={() => setActiveReportTab('person')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeReportTab === 'person'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👤 Relatório por Responsável</span>
        </button>

        <button
          onClick={() => setActiveReportTab('shopping')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeReportTab === 'shopping'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>🛒 Previsão de Compras</span>
        </button>
      </div>

      {/* Global Date Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 dark:text-white block">Filtro de Período do Relatório</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Exibindo registros de <strong className="text-indigo-600 dark:text-indigo-400 font-black">{startDate}</strong> até <strong className="text-indigo-600 dark:text-indigo-400 font-black">{endDate}</strong> ({filteredMovements.length} movimentações no período)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setDatePreset('all')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
              datePreset === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            📅 Todo o Período (Desde 01/08)
          </button>
          <button
            onClick={() => setDatePreset('month')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
              datePreset === 'month'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            📆 Este Mês
          </button>
          <button
            onClick={() => setDatePreset('7days')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
              datePreset === '7days'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            ⏱️ Últimos 7 dias
          </button>
          <button
            onClick={() => setDatePreset('today')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
              datePreset === 'today'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            🎯 Hoje
          </button>
          <button
            onClick={() => setDatePreset('custom')}
            className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
              datePreset === 'custom'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            🗓️ Personalizado
          </button>
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold">De:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-white font-bold"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold">Até:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-800 dark:text-white font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* TAB 0: DAILY LEDGER (EXTRATO DIA A DIA) */}
      {activeReportTab === 'daily_ledger' && (
        <div className="space-y-6">
          {/* Summary Metrics Bar for the period */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total de Lançamentos</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{filteredMovements.length}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Total de Entradas (+)</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  +{periodTotalEntriesQty.toLocaleString('pt-BR')} <span className="text-xs font-bold text-slate-400">({periodTotalEntriesCount} itens)</span>
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Total de Saídas (-)</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  -{periodTotalExitsQty.toLocaleString('pt-BR')} <span className="text-xs font-bold text-slate-400">({periodTotalExitsCount} itens)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Ledger Search & Type Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por produto, responsável, setor ou observação..."
                value={ledgerSearchTerm}
                onChange={(e) => setLedgerSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold mr-1">Exibir:</span>
              <button
                onClick={() => setLedgerTypeFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                  ledgerTypeFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Tudo
              </button>
              <button
                onClick={() => setLedgerTypeFilter('entrada')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1 ${
                  ledgerTypeFilter === 'entrada'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Entradas</span>
              </button>
              <button
                onClick={() => setLedgerTypeFilter('saida')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1 ${
                  ledgerTypeFilter === 'saida'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Saídas</span>
              </button>
            </div>
          </div>

          {/* Grouped Days List */}
          {ledgerGroupedDays.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhum lançamento encontrado</h4>
              <p className="text-xs text-slate-400 mt-1">
                Não há movimentações com os filtros selecionados para o período de {startDate} até {endDate}.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {ledgerGroupedDays.map((dayGroup) => (
                <div
                  key={dayGroup.dateStr}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
                >
                  {/* Day Header */}
                  <div className="bg-slate-900 text-white p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                        📅
                      </div>
                      <div>
                        <h4 className="text-sm font-black tracking-wide text-white">{dayGroup.dateLabel}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {dayGroup.items.length} lançamentos registrados
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {dayGroup.entriesCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                          <span>Entradas: +{dayGroup.entriesVolume} vol. ({dayGroup.entriesCount})</span>
                        </span>
                      )}
                      {dayGroup.exitsCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Saídas: -{dayGroup.exitsVolume} vol. ({dayGroup.exitsCount})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Movements Table for the day */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-4 w-20">Hora</th>
                          <th className="py-2.5 px-3 w-28">Tipo</th>
                          <th className="py-2.5 px-4">Produto / Alimento</th>
                          <th className="py-2.5 px-4 text-right">Quantidade</th>
                          <th className="py-2.5 px-4">Setor / Origem</th>
                          <th className="py-2.5 px-4">Responsável</th>
                          <th className="py-2.5 px-4">Observações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {dayGroup.items.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 font-semibold">
                              {m.time || '--:--'}
                            </td>
                            <td className="py-3 px-3">
                              {m.type === 'entrada' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                                  ENTRADA
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  <ArrowUpRight className="w-3 h-3 text-rose-500" />
                                  SAÍDA
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {m.productName}
                            </td>
                            <td className="py-3 px-4 text-right font-black">
                              {m.type === 'entrada' ? (
                                <span className="text-emerald-600 dark:text-emerald-400">+{m.quantity} {m.unit}</span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400">-{m.quantity} {m.unit}</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                              {m.type === 'entrada' ? (
                                <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                                  {m.supplierOrDonor || m.entryType || 'Doação / Compra'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                  {m.sector || 'Cozinha'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                              {m.retrievedBy || m.receivedBy || m.deliveredBy || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-400 dark:text-slate-500 italic max-w-xs truncate">
                              {m.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 1: SHOPPING RECOMMENDATION LIST */}
      {activeReportTab === 'shopping' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                Previsão de Compras para Abastecimento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cálculo automático da quantidade de cada produto necessária para manter a Cristolândia abastecida.
              </p>
            </div>

            {/* Buffer Selector & WhatsApp Action */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCopyWhatsAppText}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                title="Copiar lista de necessidades formatada para grupos de WhatsApp"
              >
                <span>📱 {copiedWhatsApp ? 'Copiado para WhatsApp!' : 'Copiar Pedido (WhatsApp)'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Reserva:</span>
                <button
                  onClick={() => setBufferDays(15)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    bufferDays === 15 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  15 Dias
                </button>
                <button
                  onClick={() => setBufferDays(30)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    bufferDays === 30 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  30 Dias
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3">Estoque Atual</th>
                  <th className="py-3 px-3">Consumo Diário</th>
                  <th className="py-3 px-3">Autonomia (Dias)</th>
                  <th className="py-3 px-3">Mínimo</th>
                  <th className="py-3 px-3 text-right">Comprar p/ {bufferDays} Dias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {shoppingList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">
                      {item.dailyAvgConsumption} {item.unit}/dia
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          item.daysRemaining <= 3
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            : item.daysRemaining <= 7
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {item.daysRemaining} dias
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-amber-600 dark:text-amber-400 text-sm">
                      +{item.neededQtyForBuffer} {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SECTOR REPORT */}
      {activeReportTab === 'sector' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                Relatório de Consumo por Setor
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Alimentos e volumes destinados a cada setor da Cristolândia e suas respectivas pessoas responsáveis.
              </p>
            </div>

            {/* Filter by Specific Sector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Setor:</span>
              <select
                value={selectedSectorFilter}
                onChange={(e) => setSelectedSectorFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="todos">Todos os Setores ({sectorNamesList.length})</option>
                {sectorNamesList.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {sectorNamesList
              .filter((sec) => selectedSectorFilter === 'todos' || selectedSectorFilter === sec)
              .map((secName) => {
                const sec = sectorDetailsMap[secName];
                const productItems = Object.values(sec.products).sort((a, b) => b.totalQty - a.totalQty);

                return (
                  <div
                    key={secName}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-800/30 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700/60 gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-base font-extrabold text-slate-900 dark:text-white">{secName}</h4>
                          <span className="text-xs text-slate-500">
                            {sec.movementsCount} retiradas realizadas | {productItems.length} tipos de alimentos consumidos
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">Volume Total do Setor</span>
                        <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                          {sec.totalVol.toLocaleString('pt-BR')} vol.
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700/60 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-2.5 px-3">Alimento / Item</th>
                            <th className="py-2.5 px-3 text-right">Qtd Consumida</th>
                            <th className="py-2.5 px-3 text-center">Nº Retiradas</th>
                            <th className="py-2.5 px-3">Pessoas Responsáveis</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/40">
                          {productItems.map((p) => (
                            <tr key={p.productName} className="hover:bg-white/80 dark:hover:bg-slate-800/80">
                              <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                                {p.productName}
                              </td>
                              <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white text-sm">
                                {p.totalQty} {p.unit}
                              </td>
                              <td className="py-3 px-3 text-center font-semibold text-slate-600 dark:text-slate-300">
                                {p.withdrawalsCount}x
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(p.responsibles).map(([rName, rQty]) => (
                                    <span
                                      key={rName}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                                    >
                                      <UserCheck className="w-3 h-3 text-indigo-500" />
                                      {rName} ({rQty} {p.unit})
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCT AUDIT REPORT */}
      {activeReportTab === 'product' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-indigo-500" />
                Balanço Geral de Movimentações por Produto
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Auditoria matemática: Saldo Inicial + Entradas - Saídas = Estoque Calculado vs Estoque Atual.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Saldo Inicial</th>
                  <th className="py-3 px-3">Entradas (+)</th>
                  <th className="py-3 px-3">Saídas (-)</th>
                  <th className="py-3 px-3">Saldo Calculado</th>
                  <th className="py-3 px-3">Estoque Atual</th>
                  <th className="py-3 px-3">Auditoria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => {
                  const audit = verifyProductAudit(p, movements, startDate, endDate);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-600 dark:text-slate-300">
                        {audit.initialStock} {p.unit}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                        +{audit.totalEntries} {p.unit}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-rose-600 dark:text-rose-400">
                        -{audit.totalExits} {p.unit}
                      </td>
                      <td className="py-3.5 px-3 font-black text-indigo-600 dark:text-indigo-400 text-sm">
                        {audit.calculatedBalance} {p.unit}
                      </td>
                      <td className="py-3.5 px-3 font-black text-slate-900 dark:text-white text-sm">
                        {p.currentStock} {p.unit}
                      </td>
                      <td className="py-3.5 px-3">
                        {audit.isBalanced ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Saldo Perfeito
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({audit.initialStock} + {audit.totalEntries} - {audit.totalExits} = {audit.calculatedBalance} {p.unit})
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                              Divergência: {audit.discrepancy} {p.unit}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PERSON / RESPONSIBLE REPORT */}
      {activeReportTab === 'person' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Rastreio de Retiradas por Responsável
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Nome do Responsável</th>
                  <th className="py-3 px-3">Setor Principal</th>
                  <th className="py-3 px-3">Retiradas Efetuadas</th>
                  <th className="py-3 px-3">Alimentos Retirados</th>
                  <th className="py-3 px-3 text-right">Volume Total Retirado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(personSummary).map(([personName, data]) => (
                  <tr key={personName} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                      {personName}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                      {data.sector}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {data.count} retiradas
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 max-w-xs">
                      <span className="truncate block text-xs">{data.itemsList.join(', ')}</span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-indigo-600 dark:text-indigo-400 text-sm">
                      {data.totalRetrieved} vol.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
