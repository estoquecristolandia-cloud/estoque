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
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { StatCard } from './ui/StatCard';
import { SearchInput } from './ui/SearchInput';

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
      msg += `🚨 *ITENS COM PRIORIDADE URGENTE (Autonomia ≤ 3 dias ou Esgotados):*\n`;
      forecast.urgentItems.forEach((item) => {
        msg += `• *${item.name}*: Atual: ${item.currentStock} ${item.unit} | Média: ${item.avgDailyConsumption} ${item.unit}/dia | Autonomia: ${item.daysRemaining} dias ➔ *COMPRAR: +${item.suggestedPurchaseQty} ${item.unit}*\n`;
      });
      msg += `\n`;
    }

    if (forecast.purchasesList.length > 0) {
      msg += `🛒 *LISTA GERAL DE COMPRAS SUGERIDAS (Meta: ${periodDays} dias de autonomia):*\n`;
      forecast.purchasesList.forEach((item, index) => {
        const priorityBadge = item.isUrgent ? '🔴 [URGENTE]' : item.currentStock <= item.minStock ? '🟡 [MÍNIMO]' : '⚪ [REPOSIÇÃO]';
        msg += `${index + 1}. ${priorityBadge} *${item.name}* (${item.category})\n`;
        msg += `   - Estoque Atual: ${item.currentStock} ${item.unit} (Mín: ${item.minStock} | Ideal: ${item.targetStock})\n`;
        msg += `   - Consumo Diário: ${item.avgDailyConsumption} ${item.unit}/dia | Autonomia: ${item.daysRemaining} dias\n`;
        msg += `   - *Qtd a Comprar: +${item.suggestedPurchaseQty} ${item.unit}*\n`;
      });
      msg += `\n📊 *Total de Itens para Compra:* ${forecast.purchasesList.length} produtos\n`;
      msg += `📦 *Volume Total de Reposição:* ${forecast.totalSuggestedPurchaseUnits} unidades/kg\n\n`;
    } else {
      msg += `✅ *Nenhum item necessita de compra imediata para a meta de ${periodDays} dias.*\n\n`;
    }

    msg += `📍 *Unidade:* Cristolândia LEM/BA\n`;
    msg += `📅 *Emitido em:* ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    navigator.clipboard.writeText(msg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  const handleCopyManagerialNote = () => {
    let note = `MEMORANDO INTERNO - GESTÃO DE ESTOQUE\n`;
    note += `UNIDADE: Missão Cristolândia Luís Eduardo Magalhães / BA\n`;
    note += `DATA: ${new Date().toLocaleDateString('pt-BR')}\n`;
    note += `ASSUNTO: Previsão de Compras e Abastecimento do Estoque de Mantimentos (Meta: ${periodDays} dias)\n\n`;
    note += `1. DIAGNÓSTICO GERAL:\n`;
    note += `- Total de produtos cadastrados: ${forecast.totalProducts}\n`;
    note += `- Itens com estoque esgotado: ${forecast.outOfStockCount}\n`;
    note += `- Itens com autonomia crítica (≤ 3 dias): ${forecast.urgentCount}\n`;
    note += `- Itens abaixo do estoque mínimo: ${forecast.needPurchaseCount}\n`;
    note += `- Volume total sugerido para compra: ${forecast.totalSuggestedPurchaseUnits} unidades/kg distribuídas em ${forecast.purchasesList.length} itens.\n\n`;

    if (forecast.urgentItems.length > 0) {
      note += `2. PRIORIDADES EMERGENCIAIS (Aquisição em 24-48h):\n`;
      forecast.urgentItems.forEach((item) => {
        note += `- ${item.name}: Estoque atual de ${item.currentStock} ${item.unit} com consumo de ${item.avgDailyConsumption} ${item.unit}/dia. Aquisição recomendada de ${item.suggestedPurchaseQty} ${item.unit}.\n`;
      });
      note += `\n`;
    }

    note += `3. AUDITORIA E CONCILIAÇÃO:\n`;
    note += `- Período histórico analisado: ${forecast.startDateFormatted} até ${forecast.endDateFormatted} (${periodDays} dias).\n`;
    note += `- Os cálculos levam em conta saídas operacionais e reconciliações de inventário físico com data-base.\n\n`;
    note += `Atenciosamente,\n${userName}\nCoordenação de Almoxarifado / Estoque`;

    navigator.clipboard.writeText(note);
    setCopiedManagerialNote(true);
    setTimeout(() => setCopiedManagerialNote(false), 2500);
  };

  const handleWhatsAppChefeMarcos = () => {
    let msg = `🏛️ *ESTOQUE CRISTOLÂNDIA (LEM/BA) - CHEFE MARCOS*\n\n`;
    msg += `Olá Chefe Marcos, segue o resumo rápido da necessidade de compras para *${periodDays} dias*:\n\n`;

    if (forecast.urgentItems.length > 0) {
      msg += `🚨 *Itens Urgentes (Autonomia Baixa):*\n`;
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
    <div className="space-y-6">
      {/* Header Banner with Title and Action Controls */}
      <Card id="purchase-forecast-header-card" className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Relatório de Compras / Previsão de Estoque
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cálculo de consumo médio diário, autonomia, meta de estoque ideal e conciliação física de auditoria.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="warning"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPdf}
            icon={<FileDown className="w-4 h-4" />}
          >
            Gerar PDF
          </Button>

          <Button
            variant="secondary"
            onClick={handlePrintReport}
            icon={<Printer className="w-4 h-4 text-amber-500" />}
          >
            Imprimir
          </Button>

          <Button
            variant="secondary"
            onClick={handleCopyCoordinationList}
            icon={copiedWhatsApp ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
          >
            {copiedWhatsApp ? 'Copiado!' : 'WhatsApp'}
          </Button>

          <Button
            variant="primary"
            onClick={handleWhatsAppChefeMarcos}
            icon={<Send className="w-4 h-4" />}
          >
            Chefe Marcos
          </Button>
        </div>
      </Card>

      {/* Filter and Period Selection Bar */}
      <Card id="purchase-forecast-filter-card" className="p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Period Selector (7, 15, 30 days) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-blue-500" />
              Período de Análise:
            </span>
            <button
              onClick={() => setPeriodDays(7)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodDays === 7
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              7 dias
            </button>
            <button
              onClick={() => setPeriodDays(15)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodDays === 15
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              15 dias
            </button>
            <button
              onClick={() => setPeriodDays(30)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                periodDays === 30
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
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
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🛒 1. Necessidade de Compras ({forecast.purchasesList.length})
            </button>
            <button
              onClick={() => setSubView('full_table')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subView === 'full_table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
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
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
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
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
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
            <SearchInput
              id="forecast-search-input"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Ex: Arroz, Feijão, Óleo..."
            />
          </div>
        </div>
      </Card>

      {/* Executive Summary Cards (7 key metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard
          id="stat-fc-total"
          label="Analisados"
          value={forecast.totalProducts}
          subtext="Cadastrados"
          icon={<Package className="w-4 h-4 text-blue-500" />}
          variant="default"
        />

        <StatCard
          id="stat-fc-out"
          label="Sem Estoque"
          value={forecast.outOfStockCount}
          subtext="Estoque zerado"
          icon={<AlertTriangle className="w-4 h-4 text-slate-500" />}
          variant="default"
        />

        <StatCard
          id="stat-fc-urgent"
          label="Urgente"
          value={forecast.urgentCount}
          subtext="Autonomia ≤ 3d"
          icon={<Flame className="w-4 h-4 text-rose-500" />}
          variant="default"
        />

        <StatCard
          id="stat-fc-buy"
          label="Comprar"
          value={forecast.needPurchaseCount}
          subtext="Abaixo do mín."
          icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
          variant="default"
        />

        <StatCard
          id="stat-fc-warning"
          label="Em Atenção"
          value={forecast.warningCount}
          subtext="Autonomia ≤ 15d"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
          variant="default"
        />

        <StatCard
          id="stat-fc-ok"
          label="Confortável"
          value={forecast.comfortableCount}
          subtext="Níveis normais"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          variant="default"
        />

        <StatCard
          id="stat-fc-units"
          label="Total Reposição"
          value={forecast.totalSuggestedPurchaseUnits}
          subtext="Unidades / kg"
          icon={<Layers className="w-4 h-4 text-blue-500" />}
          variant="default"
        />
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
          <Button
            variant="danger"
            onClick={handleGeneratePDF}
          >
            Emitir PDF Imediato
          </Button>
        </div>
      )}

      {/* SUB-VIEW 1: LISTA CONSOLIDADA DE COMPRAS PARA A COORDENAÇÃO */}
      {subView === 'coordination_list' && (
        <Card id="coordination-list-card" className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                1. Necessidade de Compras (Lista Consolidada para a Coordenação)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Itens filtrados que requerem aquisição para atingir a meta de <strong>{periodDays} dias</strong> de autonomia alimentar.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleCopyManagerialNote}
                icon={copiedManagerialNote ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <FileText className="w-3.5 h-3.5 text-slate-500" />}
              >
                {copiedManagerialNote ? 'Nota Copiada!' : 'Copiar Memorando'}
              </Button>
            </div>
          </div>

          {forecast.purchasesList.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Nenhum produto necessita de compra no momento!
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Todos os produtos possuem autonomia superior à meta selecionada ({periodDays} dias) ou não possuem demanda registrada.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 w-10">#</th>
                    <th className="py-3 px-3">Produto</th>
                    <th className="py-3 px-3">Categoria</th>
                    <th className="py-3 px-3 text-right">Estoque Atual</th>
                    <th className="py-3 px-3 text-right">Mínimo / Ideal</th>
                    <th className="py-3 px-3 text-right">Consumo Diário</th>
                    <th className="py-3 px-3 text-center">Autonomia</th>
                    <th className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">Comprar Sugerido</th>
                    <th className="py-3 px-3 text-center">Prioridade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {forecast.purchasesList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-black text-slate-900 dark:text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400">Unidade: {item.unit}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500">{item.category}</td>
                      <td className="py-3.5 px-3 text-right font-bold">
                        <span className={item.currentStock === 0 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-slate-800 dark:text-slate-200'}>
                          {item.currentStock} {item.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-500 font-mono">
                        {item.minStock} / {item.targetStock} {item.unit}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">
                        {item.avgDailyConsumption} {item.unit}/dia
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <Badge variant={item.daysRemaining <= 3 ? 'danger' : item.daysRemaining <= 15 ? 'warning' : 'success'}>
                          {item.daysRemaining === 999 ? '∞' : `~${item.daysRemaining} dias`}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-sm text-amber-600 dark:text-amber-400">
                        +{item.suggestedPurchaseQty} {item.unit}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {item.isUrgent ? (
                          <Badge variant="danger">
                            <Flame className="w-3 h-3 text-rose-500" />
                            URGENTE
                          </Badge>
                        ) : item.currentStock <= item.minStock ? (
                          <Badge variant="warning">
                            ABAIXO DO MÍNIMO
                          </Badge>
                        ) : (
                          <Badge variant="neutral">
                            REPOSIÇÃO META
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* SUB-VIEW 2: VISÃO COMPLETA & AUDITORIA DE TODOS OS PRODUTOS */}
      {subView === 'full_table' && (
        <Card id="full-table-card" className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" />
                2. Visão Completa de Estoque & Auditoria Contábil
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Relação integral de todos os itens com detalhamento do Marco Zero, entradas e saídas no período de {periodDays} dias.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3 text-right">Estoque Atual</th>
                  <th className="py-3 px-3 text-right">Consumo Diário</th>
                  <th className="py-3 px-3 text-center">Autonomia</th>
                  <th className="py-3 px-3 text-right">Meta ({periodDays}d)</th>
                  <th className="py-3 px-3 text-right font-black">Comprar Recomendado</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {forecast.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                      <div className="text-[10px] text-slate-400">Unidade: {item.unit}</div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">{item.category}</td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {item.currentStock} {item.unit}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {item.avgDailyConsumption} {item.unit}/dia
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <Badge variant={item.daysRemaining <= 3 ? 'danger' : item.daysRemaining <= 15 ? 'warning' : 'success'}>
                        {item.daysRemaining === 999 ? '∞' : `~${item.daysRemaining} dias`}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-500 font-mono">
                      {item.targetStock} {item.unit}
                    </td>
                    <td className="py-3.5 px-3 text-right font-black">
                      {item.suggestedPurchaseQty > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">+{item.suggestedPurchaseQty} {item.unit}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">0 (Confortável)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {item.isUrgent ? (
                        <Badge variant="danger">
                          URGENTE
                        </Badge>
                      ) : item.currentStock <= item.minStock ? (
                        <Badge variant="warning">
                          ATENÇÃO
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          CONFORTÁVEL
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
