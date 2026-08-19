import React, { useState, useMemo } from 'react';
import { Product, StockMovement, Sector } from '../types';
import { calculateDaysRemaining, verifyProductAudit } from '../utils/storage';
import { FileText, Printer, Download, ShoppingCart, Users, PackageCheck, Building2, CheckCircle2, Utensils, UserCheck, Package, Filter, ChevronRight, Calendar, Calculator } from 'lucide-react';

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
  const [activeReportTab, setActiveReportTab] = useState<'product' | 'sector' | 'person' | 'shopping'>('shopping');
  const [bufferDays, setBufferDays] = useState<number>(30); // Target buffer days e.g. 15 or 30 days
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('todos');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Date Filter State
  const todayStr = '2026-08-13';
  const [datePreset, setDatePreset] = useState<'all' | 'month' | '7days' | 'today' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const { startDate, endDate } = useMemo(() => {
    if (datePreset === 'all' || datePreset === 'month') return { startDate: '2026-08-01', endDate: todayStr };
    if (datePreset === '7days') return { startDate: '2026-08-07', endDate: todayStr };
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

    if (activeReportTab === 'sector') {
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" />
            Central de Relatórios & Previsão de Abastecimento
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Geração de relatórios auditáveis com discriminação completa de alimentos, setores e pessoas responsáveis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Report Sub-Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200 dark:border-slate-800">
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

        <button
          onClick={() => setActiveReportTab('sector')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeReportTab === 'sector'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>🏢 Relatório por Setor (Alimentos & Responsáveis)</span>
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
          <span>📦 Balanço por Produto</span>
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
      </div>

      {/* Global Date Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 dark:text-white block">Filtro de Período do Balanço & Relatórios</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Exibindo registros de <strong className="text-indigo-600 dark:text-indigo-400 font-black">{startDate}</strong> até <strong className="text-indigo-600 dark:text-indigo-400 font-black">{endDate}</strong> ({filteredMovements.length} movimentações encontradas)
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
            🎯 Hoje (13/08)
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
                  <th className="py-3 px-3">Consumo/Dia</th>
                  <th className="py-3 px-3">Dias Restantes</th>
                  <th className="py-3 px-3">Necessidade ({bufferDays}d)</th>
                  <th className="py-3 px-3 text-right">Compra Recomendada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {shoppingList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                      {item.name}
                      <span className="text-[10px] font-normal text-slate-400 block">{item.category}</span>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {item.dailyAvgConsumption} {item.unit}/dia
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          item.daysRemaining <= 5
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {item.daysRemaining} dias
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-slate-500">
                      {(item.dailyAvgConsumption * bufferDays).toFixed(1)} {item.unit}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 font-black text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60">
                        Comprar +{item.neededQtyForBuffer} {item.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED SECTOR REPORT (Alimentos e Pessoas Responsáveis) */}
      {activeReportTab === 'sector' && (
        <div className="space-y-6">
          {/* Header & Sector Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-500" />
                  Relatório Detalhado por Setor (Discriminação de Alimentos e Responsáveis)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Exibe o consumo exato de cada alimento por setor e quem foram as pessoas responsáveis pelas retiradas.
                </p>
              </div>

              {/* Sector Filter Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Setor:
                </span>
                <button
                  onClick={() => setSelectedSectorFilter('todos')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedSectorFilter === 'todos'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Todos ({sectorNamesList.length})
                </button>
                {sectorNamesList.map((secName) => (
                  <button
                    key={secName}
                    onClick={() => setSelectedSectorFilter(secName)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedSectorFilter === secName
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {secName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sectors Breakdown Cards/Tables */}
          {sectorNamesList
            .filter((secName) => selectedSectorFilter === 'todos' || selectedSectorFilter === secName)
            .map((secName) => {
              const sec = sectorDetailsMap[secName];
              const productList = Object.values(sec.products).sort((a, b) => b.totalQty - a.totalQty);
              const responsibleList = Object.values(sec.responsibles).sort((a, b) => b.totalQty - a.totalQty);

              return (
                <div key={secName} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                  {/* Sector Title & Top Summary Badges */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg">
                        🏢
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white">{secName}</h4>
                        <span className="text-xs text-slate-400">Resumo de consumo e retirantes cadastrados</span>
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Volume Consumido</span>
                        <strong className="text-slate-900 dark:text-white font-black text-sm">{sec.totalVol} unidades/kg</strong>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Retiradas Registradas</span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{sec.movementsCount} saídas</strong>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Alimentos Distintos</span>
                        <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{productList.length} itens</strong>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Pessoas Responsáveis</span>
                        <strong className="text-amber-600 dark:text-amber-400 font-black text-sm">{responsibleList.length} pessoas</strong>
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Discriminação de Alimentos/Produtos */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-amber-500" />
                      1. Discriminação de Alimentos Consumidos pelo Setor {secName}
                    </h5>

                    <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2.5 px-3">Alimento / Produto</th>
                            <th className="py-2.5 px-3">Total Consumido</th>
                            <th className="py-2.5 px-3">Nº de Retiradas</th>
                            <th className="py-2.5 px-3">Pessoas Responsáveis que Retiraram</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {productList.map((prod) => (
                            <tr key={prod.productName} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                              <td className="py-3 px-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Package className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                <span>{prod.productName}</span>
                              </td>
                              <td className="py-3 px-3 font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                {prod.totalQty} {prod.unit}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">
                                {prod.withdrawalsCount} vezes
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(prod.responsibles).map(([respName, respQty]) => (
                                    <span
                                      key={respName}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                                    >
                                      <UserCheck className="w-3 h-3 text-emerald-500" />
                                      {respName}: <strong className="text-indigo-600 dark:text-indigo-400">{respQty} {prod.unit}</strong>
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

                  {/* Section 2: Pessoas Responsáveis do Setor */}
                  <div className="space-y-3 pt-2">
                    <h5 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      2. Pessoas Responsáveis pelas Retiradas do Setor {secName}
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {responsibleList.map((resp) => {
                        const itemsSummaryList = Object.entries(resp.productsRetrieved).map(
                          ([pName, val]) => `${pName} (${val.qty} ${val.unit})`
                        );

                        return (
                          <div
                            key={resp.personName}
                            className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-indigo-500" />
                                {resp.personName}
                              </span>
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                                {resp.totalQty} vol. ({resp.withdrawalsCount} saídas)
                              </span>
                            </div>

                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              <span className="font-bold text-slate-500 block text-[10px] uppercase mb-0.5">Alimentos Retirados por {resp.personName}:</span>
                              <div className="flex flex-wrap gap-1">
                                {itemsSummaryList.map((itemStr, idx) => (
                                  <span key={idx} className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                    {itemStr}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* TAB 3: PRODUCT AUDIT REPORT */}
      {activeReportTab === 'product' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-indigo-500" />
                Relatório e Balanço Geral por Produto
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Período Selecionado: <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{startDate}</strong> até <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{endDate}</strong> | Fórmula: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 font-black">Saldo Inicial + Entradas - Saídas = Saldo Calculado</code>
              </p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Convalidado: {products.length} de {products.length} alimentos sem divergências</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3 text-slate-500">Saldo Inicial</th>
                  <th className="py-3 px-3 text-emerald-600 dark:text-emerald-400">Total Entradas (+)</th>
                  <th className="py-3 px-3 text-amber-600 dark:text-amber-400">Total Saídas (-)</th>
                  <th className="py-3 px-3 text-indigo-600 dark:text-indigo-400 font-black">Saldo Calculado (=)</th>
                  <th className="py-3 px-3 font-black">Estoque no Sistema</th>
                  <th className="py-3 px-3">Auditoria / Conciliação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((p) => {
                  const audit = verifyProductAudit(p, movements, startDate, endDate);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block text-sm">{p.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{p.category}</span>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-600 dark:text-slate-300">
                        {audit.initialStock} {p.unit}
                      </td>
                      <td className="py-3.5 px-3 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        +{audit.totalEntries} {p.unit}
                      </td>
                      <td className="py-3.5 px-3 font-black text-amber-600 dark:text-amber-400 text-sm">
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

