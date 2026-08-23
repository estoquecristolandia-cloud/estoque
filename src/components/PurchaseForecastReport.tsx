import React, { useState, useMemo } from 'react';
import { Product, StockMovement, Category, InventoryAudit } from '../types';
import { UserRole } from '../firebase';
import { calculatePurchaseForecast, ForecastItem } from '../utils/purchaseForecasting';
import { generatePurchaseForecastPDF } from '../utils/pdfExport';
import {
  ShoppingCart,
  FileDown,
  Printer,
  Calendar,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingDown,
  Clock,
  Send,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  Flame,
  Info,
  Layers,
  FileText,
  Eye,
} from 'lucide-react';

interface PurchaseForecastReportProps {
  products: Product[];
  movements: StockMovement[];
  inventoryAudits?: InventoryAudit[];
  userRole?: UserRole;
  userName?: string;
}

const CATEGORIES: Category[] = [
  'Grãos e Cereais',
  'Óleos e Condimentos',
  'Matinais e Bebidas',
  'Proteínas e Carnes',
  'Laticínios e Massas',
  'Hortifrúti e Temperos',
  'Higiene e Limpeza',
  'Outros',
];

export const PurchaseForecastReport: React.FC<PurchaseForecastReportProps> = ({
  products,
  movements,
  inventoryAudits = [],
  userRole = 'admin',
  userName = 'Marconi Castro (Gestor do Estoque)',
}) => {
  // Period filter: 7, 15, 30 days (default: 30)
  const [periodDays, setPeriodDays] = useState<7 | 15 | 30>(30);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'buy_only' | 'urgent_only' | 'warning_only' | 'comfortable_only'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [subView, setSubView] = useState<'coordination_list' | 'full_table'>('coordination_list');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedManagerialNote, setCopiedManagerialNote] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Pure read-only computation of forecast data
  const forecast = useMemo(() => {
    return calculatePurchaseForecast(products, movements, periodDays, inventoryAudits, {
      category: categoryFilter,
      statusFilter,
      searchTerm,
    });
  }, [products, movements, periodDays, inventoryAudits, categoryFilter, statusFilter, searchTerm]);

  const handleGeneratePDF = () => {
    setIsGeneratingPdf(true);
    try {
      generatePurchaseForecastPDF(products, movements, periodDays, inventoryAudits, userName, {
        category: categoryFilter,
        statusFilter,
      });
    } catch (err) {
      console.error('Error generating Purchase Forecast PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintReport = () => {
    // Generate PDF for immediate high-quality print or invoke print
    handleGeneratePDF();
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleCopyCoordinationList = () => {
    let msg = `🏛️ *JUNTA DE MISSÕES NACIONAIS - CRISTOLÂNDIA (LEM/BA)*\n`;
    msg += `📋 *RELATÓRIO DE NECESSIDADE DE COMPRAS E PREVISÃO DE ESTOQUE*\n`;
    msg += `📅 *Período de Análise:* Últimos ${periodDays} dias (${forecast.startDateFormatted} a ${forecast.endDateFormatted})\n`;
    msg += `👤 *Responsável:* ${userName}\n\n`;

    if (forecast.urgentItems.length > 0) {
      msg += `🚨 *ITENS COM PRIORIDADE URGENTE / CRÍTICA:*\n`;
      forecast.urgentItems.forEach((item) => {
        const autText = item.daysAutonomy !== null ? `${item.daysAutonomy.toFixed(1)} dias` : 'Indeterminada';
        msg += `• *${item.name}*: Estoque Atual: *${item.currentStock} ${item.unit}* | Mínimo: ${item.minStock} ${item.unit} | Autonomia: ${autText} ➔ *COMPRAR: +${item.suggestedPurchaseQty} ${item.unit}*\n`;
      });
      msg += `\n`;
    }

    const otherPurchases = forecast.purchasesList.filter((i) => i.priority !== 'URGENTE');
    if (otherPurchases.length > 0) {
      msg += `📦 *OUTRAS NECESSIDADES DE REPOSIÇÃO (META ESTOQUE IDEAL):*\n`;
      otherPurchases.forEach((item) => {
        const autText = item.daysAutonomy !== null ? `${item.daysAutonomy.toFixed(1)} dias` : 'Sem consumo reg.';
        msg += `• *${item.name}*: Estoque Atual: ${item.currentStock} ${item.unit} (Ideal: ${item.idealStock} ${item.unit}) ➔ *Sugerido: +${item.suggestedPurchaseQty} ${item.unit}*\n`;
      });
      msg += `\n`;
    }

    msg += `📊 *Resumo da Análise:*\n`;
    msg += `• Total de Produtos Analisados: ${forecast.totalProducts}\n`;
    msg += `• Itens Sem Estoque: ${forecast.outOfStockCount}\n`;
    msg += `• Itens para Comprar (Críticos): ${forecast.needPurchaseCount}\n`;
    msg += `• Itens em Atenção: ${forecast.warningCount}\n`;
    msg += `• Itens com Estoque Confortável: ${forecast.comfortableCount}\n`;
    msg += `• Total Sugerido de Reposição: ${forecast.totalSuggestedPurchaseUnits} unidades/kg\n\n`;
    msg += `*Documento gerado automaticamente pelo sistema Estoque Cristolândia.*`;

    navigator.clipboard.writeText(msg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  const handleCopyManagerialObservation = () => {
    navigator.clipboard.writeText(forecast.managerialObservation);
    setCopiedManagerialNote(true);
    setTimeout(() => setCopiedManagerialNote(false), 3000);
  };

  const handleWhatsAppChefeMarcos = () => {
    let msg = `🏛️ *JUNTA DE MISSÕES NACIONAIS - CRISTOLÂNDIA (LEM/BA)*\n`;
    msg += `📋 *COMUNICADO OFICIAL DE COMPRAS & ABASTECIMENTO*\n\n`;
    msg += `Prezado *Chefe Marcos*,\n`;
    msg += `Segue a previsão oficial de compras baseada no consumo real dos últimos ${periodDays} dias:\n\n`;

    if (forecast.urgentItems.length > 0) {
      msg += `🚨 *ITENS URGENTES:*\n`;
      forecast.urgentItems.forEach((i) => {
        msg += `• *${i.name}*: Atual: ${i.currentStock} ${i.unit} (Mín: ${i.minStock}) ➔ *Comprar: +${i.suggestedPurchaseQty} ${i.unit}*\n`;
      });
      msg += `\n`;
    }

    if (forecast.purchasesList.length > 0) {
      msg += `🛒 *Total de Itens com Sugestão de Reposição:* ${forecast.purchasesList.length} produtos (Total: +${forecast.totalSuggestedPurchaseUnits} unidades).\n`;
    } else {
      msg += `✅ *Todos os produtos estão com níveis confortáveis de estoque.*\n`;
    }

    msg += `\nAlmoxarifado / Estoque Cristolândia`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/5562999746823?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner with Title and Action Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Relatório de Compras / Previsão de Estoque
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cálculo de consumo médio diário, autonomia, meta de estoque ideal e conciliação física de auditoria.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPdf}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
            title="Gerar e baixar PDF em formato A4 paisagem profissional pronto para envio à Coordenação"
          >
            <FileDown className="w-4 h-4" />
            <span>📄 Gerar PDF</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm shadow-md shadow-slate-900/10 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            title="Imprimir relatório formatado"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>🖨️ Imprimir Relatório</span>
          </button>

          <button
            onClick={handleCopyCoordinationList}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95"
            title="Copiar lista consolidada formatada para envio via WhatsApp"
          >
            {copiedWhatsApp ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copiar p/ WhatsApp</span>
              </>
            )}
          </button>

          <button
            onClick={handleWhatsAppChefeMarcos}
            className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Disparo direto no WhatsApp para o Chefe Marcos"
          >
            <Send className="w-4 h-4" />
            <span>Chefe Marcos</span>
          </button>
        </div>
      </div>

      {/* Filter and Period Selection Bar (Flow: 1. Escolher período -> 2. Prévia -> 3. Gerar PDF / Imprimir) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Period Selector (7, 15, 30 days) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Período de Análise:
            </span>
            <button
              onClick={() => setPeriodDays(7)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodDays === 7
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              7 dias
            </button>
            <button
              onClick={() => setPeriodDays(15)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodDays === 15
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              15 dias
            </button>
            <button
              onClick={() => setPeriodDays(30)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodDays === 30
                  ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              30 dias (Padrão)
            </button>
            <span className="text-[11px] text-slate-400 ml-1">
              ({forecast.startDateFormatted} a {forecast.endDateFormatted})
            </span>
          </div>

          {/* Sub-view switcher: Coordination List vs Full Forecast Table */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
            <button
              onClick={() => setSubView('coordination_list')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subView === 'coordination_list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🛒 1. Necessidade de Compras ({forecast.purchasesList.length})
            </button>
            <button
              onClick={() => setSubView('full_table')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subView === 'full_table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📋 2. Visão Completa & Auditoria ({forecast.totalProducts})
            </button>
          </div>
        </div>

        {/* Filters Row: Situation, Category & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Situation Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Situação do Produto
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todas as Situações</option>
              <option value="buy_only">🔴 Somente para Comprar (Críticos & Zerados)</option>
              <option value="urgent_only">🚨 Somente Urgentes (Autonomia ≤ 3 dias)</option>
              <option value="warning_only">🟡 Somente em Atenção</option>
              <option value="comfortable_only">🟢 Somente Estoque Confortável</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Categoria
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todas as Categorias</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Search Term */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Buscar Produto
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ex: Arroz, Feijão, Óleo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary Cards (7 key metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Products */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
            <span>Analisados</span>
            <Package className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            {forecast.totalProducts}
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">
            Cadastrados
          </p>
        </div>

        {/* Sem Estoque */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
            <span>Sem Estoque</span>
            <span className="text-[10px]">⚫</span>
          </div>
          <div className={`text-xl font-black ${forecast.outOfStockCount > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            {forecast.outOfStockCount}
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5">
            Estoque zerado
          </p>
        </div>

        {/* Urgente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-500 mb-1">
            <span>Urgente</span>
            <Flame className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className={`text-xl font-black ${forecast.urgentCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
            {forecast.urgentCount}
          </div>
          <p className="text-[9px] text-rose-500/80 mt-0.5">
            Autonomia ≤ 3d
          </p>
        </div>

        {/* Comprar (Crítico) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-orange-500 mb-1">
            <span>Comprar</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className={`text-xl font-black ${forecast.needPurchaseCount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}>
            {forecast.needPurchaseCount}
          </div>
          <p className="text-[9px] text-orange-500/80 mt-0.5">
            Abaixo do mínimo
          </p>
        </div>

        {/* Atenção */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-500 mb-1">
            <span>Em Atenção</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className={`text-xl font-black ${forecast.warningCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
            {forecast.warningCount}
          </div>
          <p className="text-[9px] text-amber-500/80 mt-0.5">
            Autonomia ≤ 15d
          </p>
        </div>

        {/* Estoque Confortável */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-500 mb-1">
            <span>Confortável</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {forecast.comfortableCount}
          </div>
          <p className="text-[9px] text-emerald-500/80 mt-0.5">
            Níveis normais
          </p>
        </div>

        {/* Total Reposição Sugerida */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-500 mb-1">
            <span>Total Reposição</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400">
            {forecast.totalSuggestedPurchaseUnits}
          </div>
          <p className="text-[9px] text-blue-500/80 mt-0.5">
            Unidades / kg total
          </p>
        </div>
      </div>

      {/* Urgent Alert Banner (if any item is urgent) */}
      {forecast.urgentItems.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                🚨 {forecast.urgentItems.length} {forecast.urgentItems.length === 1 ? 'Item com Prioridade Urgente' : 'Itens com Prioridade Urgente'} de Compra
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                Produtos esgotados ou com autonomia crítica de 3 dias ou menos:{' '}
                <strong>{forecast.urgentItems.map((i) => `${i.name} (+${i.suggestedPurchaseQty} ${i.unit})`).join(', ')}</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={handleGeneratePDF}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all cursor-pointer whitespace-nowrap shadow-sm"
          >
            Emitir PDF Imediato
          </button>
        </div>
      )}

      {/* SUB-VIEW 1: LISTA CONSOLIDADA DE COMPRAS PARA A COORDENAÇÃO */}
      {subView === 'coordination_list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                1. Necessidade de Compras (Lista Consolidada para a Coordenação)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Exibindo somente os produtos classificados como URGENTE, COMPRAR ou ATENÇÃO ordenados por prioridade estrita.
              </p>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Fórmula: <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400 font-bold">Qtd Sugerida = max(0, Ideal - Atual)</code>
            </div>
          </div>

          {forecast.purchasesList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Estoque 100% Suprido
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Nenhum produto analisado encontra-se abaixo do estoque mínimo ou necessitando de reposição no momento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Prioridade</th>
                    <th className="py-3 px-3">Produto / Item</th>
                    <th className="py-3 px-3">Unidade</th>
                    <th className="py-3 px-3">Estoque Atual</th>
                    <th className="py-3 px-3">Consumo Diário</th>
                    <th className="py-3 px-3">Autonomia</th>
                    <th className="py-3 px-3">Estoque Ideal</th>
                    <th className="py-3 px-3 text-right">Comprar (Sugerido)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {forecast.purchasesList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black ${
                            item.priority === 'URGENTE'
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : item.priority === 'ALTA'
                              ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {item.priorityLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-900 dark:text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400">{item.category}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">
                        {item.unit}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`font-black ${item.currentStock <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                          {item.currentStock} {item.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 font-semibold">
                        {item.dailyAvgConsumption > 0 ? `${item.dailyAvgConsumption} ${item.unit}/dia` : 'Sem consumo'}
                      </td>
                      <td className="py-3.5 px-3">
                        {item.daysAutonomy !== null ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs ${
                              item.daysAutonomy <= 3
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                : item.daysAutonomy <= 7
                                ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {item.daysAutonomy.toFixed(1)} dias
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Indeterminada</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-indigo-600 dark:text-indigo-400 font-bold">
                        {item.idealStock} {item.unit}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <span className="inline-flex items-center gap-1 font-black text-rose-600 dark:text-rose-400 text-sm bg-rose-50 dark:bg-rose-950/60 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-800">
                          +{item.suggestedPurchaseQty} {item.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: QUADRO GERAL DE PREVISÃO & CONCILIAÇÃO FÍSICA (TODOS OS PRODUTOS) */}
      {subView === 'full_table' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-500" />
                2. Visão Completa do Estoque, Conciliação Física & Autonomia
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Relação dinâmica de todos os {forecast.totalProducts} produtos cadastrados, contagem física e consumo médio diário.
              </p>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Consumo baseado exclusivamente em saídas (type: "saida")
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3">Unid.</th>
                  <th className="py-3 px-3 text-right">Sistema</th>
                  <th className="py-3 px-3 text-right">Físico</th>
                  <th className="py-3 px-3 text-center">Diferença</th>
                  <th className="py-3 px-3 text-right">Cons. Médio/Dia</th>
                  <th className="py-3 px-3 text-center">Autonomia</th>
                  <th className="py-3 px-3 text-right">Mínimo</th>
                  <th className="py-3 px-3 text-right">Ideal</th>
                  <th className="py-3 px-3 text-right">Comprar</th>
                  <th className="py-3 px-3">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {forecast.filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 px-3 font-extrabold text-slate-900 dark:text-white">
                      <div>{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.category}</div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">
                      {item.unit}
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-slate-900 dark:text-white">
                      {item.currentStock}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300 font-semibold">
                      {item.hasPhysicalCount ? item.physicalStock : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {item.hasPhysicalCount ? (
                        item.inventoryStatus === 'DIVERGENTE' ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            ⚠️ {item.physicalDifference > 0 ? `+${item.physicalDifference}` : item.physicalDifference}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                            CONFERIDO
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {item.dailyAvgConsumption > 0 ? (
                        <span>{item.dailyAvgConsumption} /dia</span>
                      ) : (
                        <span className="text-slate-400 italic">0.0 (sem reg.)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {item.daysAutonomy !== null ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-extrabold ${
                            item.daysAutonomy <= 3
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                              : item.daysAutonomy <= 7
                              ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300'
                              : item.daysAutonomy <= 15
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {item.daysAutonomy.toFixed(1)} dias
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Indeterminada</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-500">
                      {item.minStock}
                    </td>
                    <td className="py-3.5 px-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                      {item.idealStock}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {item.suggestedPurchaseQty > 0 ? (
                        <span className="font-black text-rose-600 dark:text-rose-400">
                          +{item.suggestedPurchaseQty}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black ${
                          item.situation === 'SEM_ESTOQUE'
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : item.situation === 'COMPRAR'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : item.situation === 'ATENCAO'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {item.situationBadge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Automated Managerial Observation Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <FileText className="w-4 h-4 text-amber-500" />
            <span>📌 Parecer Gerencial Automático para a Coordenação</span>
          </div>
          <button
            onClick={handleCopyManagerialObservation}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            {copiedManagerialNote ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar Parecer</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          {forecast.managerialObservation}
        </p>
      </div>

      {/* Audit & Read-Only Guarantee Footer Notice */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>
            <strong>Garantia de Integridade e Somente Leitura:</strong> A emissão do relatório e os cálculos de previsão de estoque operam exclusivamente em modo de leitura (Read-Only), sem realizar qualquer gravação, ajuste automático de saldo ou mutação de dados no Firestore.
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 shrink-0">
          Período: {periodDays} dias ({forecast.startDateFormatted} a {forecast.endDateFormatted})
        </span>
      </div>
    </div>
  );
};
