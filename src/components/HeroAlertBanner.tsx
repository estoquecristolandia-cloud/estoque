import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Utensils,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  Search,
  Sparkles,
  Calendar,
  MessageCircle,
  FileText,
  Activity,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Product, DailyKit, Department } from '../types';
import { UserRole } from '../firebase';
import { getProductStockStatus } from '../utils/storage';
import { AnimatedNumber } from './AnimatedNumber';
import { soundFeedback } from '../utils/audioFeedback';

interface HeroAlertBannerProps {
  products: Product[];
  dailyKit?: DailyKit;
  userRole?: UserRole;
  activeDepartment?: Department;
  onOpenEntryModal: (product?: Product) => void;
  onOpenExitModal: (product?: Product) => void;
  onOpenKitModal: () => void;
  onOpenReports: () => void;
  onOpenMeals?: () => void;
  onOpenWhatsAppAlert?: () => void;
}

export const HeroAlertBanner: React.FC<HeroAlertBannerProps> = ({
  products,
  dailyKit,
  userRole = 'admin',
  activeDepartment = 'alimentacao',
  onOpenEntryModal,
  onOpenExitModal,
  onOpenKitModal,
  onOpenReports,
  onOpenMeals,
  onOpenWhatsAppAlert,
}) => {
  const isDml = activeDepartment === 'dml';
  const isAdmin = userRole === 'admin';
  const [viewTab, setViewTab] = useState<'alerts' | 'staples' | 'all'>('alerts');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveClock, setLiveClock] = useState('');

  // Relógio ao vivo em horário de Brasília para sensação de Central de Operações
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const dateStr = now.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
      setLiveClock(`${dateStr} • ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to get daily consumption from Kit Cozinha or product fallback
  const getProductDailyRate = (p: Product) => {
    if (dailyKit?.items) {
      const kitItem = dailyKit.items.find((item) => item.productId === p.id);
      if (kitItem && kitItem.quantity > 0) {
        return kitItem.quantity;
      }
    }
    return p.dailyAvgConsumption > 0 ? p.dailyAvgConsumption : 0;
  };

  // Helper to calculate autonomy in days for a product
  const getProductAutonomyDays = (p: Product) => {
    const dailyRate = getProductDailyRate(p);
    if (dailyRate <= 0) return 999;
    return Math.round((p.currentStock / dailyRate) * 10) / 10;
  };

  // Categorize products by calculated autonomy
  const productsWithAutonomy = products.map((p) => {
    const dailyRate = getProductDailyRate(p);
    const days = getProductAutonomyDays(p);
    const status = getProductStockStatus(p);
    const inKit = Boolean(dailyKit?.items.some((k) => k.productId === p.id));
    return { product: p, dailyRate, days, status, inKit };
  });

  // Filter items in urgent alert (<= 5 days autonomy or below minimum stock or critical)
  const alertProducts = productsWithAutonomy
    .filter(
      (item) =>
        item.days <= 5 ||
        item.status === 'critical' ||
        item.status === 'warning' ||
        item.product.currentStock <= item.product.minStock
    )
    .sort((a, b) => a.days - b.days);

  // Key staples IDs
  const foodStapleIds = new Set([
    'prod-arroz',
    'prod-feijao',
    'prod-macarrao',
    'prod-leite',
    'prod-acucar',
    'prod-cafe',
    'prod-oleo',
    'prod-manteiga',
    'prod-sal',
    'prod-suco',
    'prod-flocao',
    'prod-alho',
    'prod-farinha',
    'prod-molho',
  ]);

  const dmlStapleIds = new Set([
    'dml-agua-sanitaria',
    'dml-desinfetante',
    'dml-sabao-po',
    'dml-detergente',
    'dml-sabonete',
    'dml-creme-dental',
    'dml-papel-higienico',
    'dml-saco-lixo-100l',
    'dml-esponja-dupla',
    'dml-amaciante',
  ]);

  const stapleProducts = productsWithAutonomy.filter((item) =>
    (isDml ? dmlStapleIds.has(item.product.id) : foodStapleIds.has(item.product.id))
  );

  const displayedList = (
    viewTab === 'alerts'
      ? alertProducts.length > 0
        ? alertProducts
        : productsWithAutonomy
      : viewTab === 'staples'
      ? stapleProducts
      : productsWithAutonomy
  ).filter(
    (item) =>
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendWhatsAppAlert = () => {
    soundFeedback.play('open');
    const alertItems = products.filter((p) => {
      const daily = p.dailyAvgConsumption > 0 ? p.dailyAvgConsumption : 1;
      const days = p.currentStock / daily;
      return days <= 5 || p.currentStock <= p.minStock;
    });

    const topCritical = alertItems[0];

    let msg = `🏛️ *JUNTA DE MISSÕES NACIONAIS - CRISTOLÂNDIA (LEM/BA)*\n`;
    msg += `📋 *ALERTA OFICIAL DE ESTOQUE — ${isDml ? 'DML & HIGIENE' : 'ALIMENTAÇÃO'}*\n\n`;
    msg += `Prezado(a) *${isDml ? 'Coordenação / Almoxarifado' : 'Chefe Marcos'}*,\n`;
    msg += `Segue o comunicado oficial do setor de ${isDml ? 'DML, Limpeza Predial e Higiene dos Acolhidos' : 'Alimentação e Cozinha'}:\n\n`;

    msg += `🚨 *ITEM EM NÍVEL CRÍTICO DE REPOSIÇÃO:*\n`;
    if (topCritical) {
      const daily = topCritical.dailyAvgConsumption || 1;
      const days = (topCritical.currentStock / daily).toFixed(1);
      msg += `• *Produto:* ${topCritical.name}\n`;
      msg += `• *Estoque Físico Atual:* *${topCritical.currentStock} ${topCritical.unit}*\n`;
      msg += `• *Estoque Mínimo de Segurança:* ${topCritical.minStock} ${topCritical.unit}\n`;
      msg += `• *Consumo Médio:* ${daily} ${topCritical.unit}/dia\n`;
      msg += `• *Autonomia Estimada:* *~${days} dias* (Necessita reposição)\n\n`;
    }

    if (alertItems.length > 1) {
      msg += `📌 *Outros itens com atenção para compra/reposição:*\n`;
      alertItems
        .filter((p) => p.id !== topCritical?.id)
        .forEach((p) => {
          const daily = p.dailyAvgConsumption || 1;
          const days = (p.currentStock / daily).toFixed(1);
          msg += `• ${p.name}: ${p.currentStock} ${p.unit} (~${days} dias de autonomia)\n`;
        });
      msg += `\n`;
    }

    msg += `💡 *Recomendação Operacional:*\n`;
    msg += isDml
      ? `Programar a compra/reposição de materiais de limpeza e kits de higiene para manter a conservação dos dormitórios, banheiros e acolhidos.\n\n`
      : `Programar a compra/reabastecimento prioritário para assegurar as refeições da unidade sem interrupções.\n\n`;
    msg += `👤 *Gestor Responsável:* Marconi Castro\n`;
    msg += `📍 *Unidade:* Cristolândia LEM/BA\n`;
    msg += `📅 *Emitido em:* ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const url = `https://api.whatsapp.com/send?phone=5562999746823&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const totalVolume = products.reduce((acc, p) => acc + p.currentStock, 0);

  // Média de autonomia geral dos itens ativos
  const validAutonomies = productsWithAutonomy.filter((p) => p.days < 900);
  const avgAutonomyDays = validAutonomies.length > 0
    ? Math.round(validAutonomies.reduce((a, b) => a + b.days, 0) / validAutonomies.length)
    : 14;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-blue-500/20 bg-white dark:bg-gradient-to-br dark:from-slate-900/95 dark:via-slate-900/90 dark:to-blue-950/40 shadow-xl dark:shadow-[0_12px_45px_-10px_rgba(30,58,138,0.3)] transition-all">
      {/* Radiant ambient glow line on top */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-500" />

      {/* 1. Cockpit Header Bar */}
      <div className="p-5 sm:p-7 space-y-6">
        {/* Institutional status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              🏛️ JUNTA DE MISSÕES NACIONAIS • CBB
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SISTEMA AUDITADO & HOMOLOGADO</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 px-3 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
              <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>{liveClock || 'Carregando...'}</span>
            </div>
          </div>
        </div>

        {/* Hero Title and Action Launcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                {isDml ? 'MÓDULO DML & HIGIENE' : 'MÓDULO ALIMENTAÇÃO & COZINHA'}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Unidade Luís Eduardo Magalhães / BA
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Cockpit de Autonomia & Inteligência Logística
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Monitoramento preventivo em tempo real com regra PVPS, runway de abastecimento e despacho diário de refeições.
            </p>
          </div>

          {/* Action Dock: High impact glowing buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    soundFeedback.play('open');
                    onOpenEntryModal();
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>+ Entrada no Estoque</span>
                </button>

                <button
                  onClick={() => {
                    soundFeedback.play('open');
                    onOpenExitModal();
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-xl text-xs shadow-lg shadow-amber-600/25 hover:shadow-amber-600/40 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>- Baixa / Consumo</span>
                </button>
              </>
            )}

            <button
              onClick={() => {
                if (onOpenWhatsAppAlert) {
                  onOpenWhatsAppAlert();
                } else {
                  handleSendWhatsAppAlert();
                }
              }}
              className="px-3.5 py-2.5 bg-[#25D366] hover:bg-[#1ebd5a] text-slate-950 font-black rounded-xl text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              title={isDml ? 'Enviar Alerta WhatsApp de DML / Limpeza' : 'Enviar Alerta Oficial para Chefe Marcos (+55 62 99974-6823)'}
            >
              <MessageCircle className="w-4 h-4 fill-slate-950" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => {
                soundFeedback.play('open');
                onOpenKitModal();
              }}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-xl text-xs border border-slate-200 dark:border-slate-700/80 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5 text-amber-500" />
              <span>{isDml ? (isAdmin ? 'Kit Higiene' : 'Ver Kit') : (isAdmin ? 'Kit Cozinha' : 'Ver Kit')}</span>
            </button>

            <button
              onClick={() => {
                soundFeedback.play('click');
                onOpenReports();
              }}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Gerar Relatório Executivo Oficial de Prestação de Contas JMN em PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Relatório JMN</span>
            </button>
          </div>
        </div>

        {/* 2. HUD Metric Tiles (3 Bento Indicators) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Autonomia Geral */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                Autonomia Estimada
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                ~<AnimatedNumber value={avgAutonomyDays} /> dias
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Segurança Alimentar Ativa
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Alertas Críticos */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
            alertProducts.length > 0
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 text-slate-900 dark:text-white'
          }`}>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                Alerta de Reposição (≤ 5 dias)
              </span>
              <div className="text-2xl font-black tabular-nums mt-0.5">
                <AnimatedNumber value={alertProducts.length} /> itens
              </div>
              <span className="text-[11px] font-bold">
                {alertProducts.length > 0 ? 'Requer atenção imediata' : 'Nenhum item zerado'}
              </span>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              alertProducts.length > 0 ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-200 dark:bg-slate-700/50 text-slate-500'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${alertProducts.length > 0 ? 'animate-bounce' : ''}`} />
            </div>
          </div>

          {/* Volume Total Físico */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                Estoque Físico Ativo
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                <AnimatedNumber value={totalVolume} /> vol.
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {products.length} produtos monitorados
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs & Search Sub-Header */}
      <div className="px-5 sm:px-7 py-3 bg-slate-50/80 dark:bg-slate-900/90 border-t border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              soundFeedback.play('click');
              setViewTab('alerts');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              viewTab === 'alerts'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Itens em Alerta ({alertProducts.length})</span>
          </button>

          <button
            onClick={() => {
              soundFeedback.play('click');
              setViewTab('staples');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              viewTab === 'staples'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{isDml ? 'Kits de Higiene' : 'Kits Diários (Cozinha)'}</span>
          </button>

          <button
            onClick={() => {
              soundFeedback.play('click');
              setViewTab('all');
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              viewTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-700 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos os Itens ({products.length})</span>
          </button>
        </div>

        {/* Search & Collapse Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar item ou local..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-full"
            />
          </div>

          <button
            onClick={() => {
              soundFeedback.play('click');
              setIsCollapsed(!isCollapsed);
            }}
            className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shrink-0"
          >
            <span>{isCollapsed ? 'Expandir' : 'Recolher'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 4. Item Rows: Modern Enterprise Grid List */}
      {!isCollapsed && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-96 overflow-y-auto">
          {displayedList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              Nenhum produto encontrado neste filtro.
            </div>
          ) : (
            displayedList.map(({ product, dailyRate, days }) => {
              const isSporadic = days >= 900 || dailyRate <= 0;
              const isCritical = !isSporadic && days <= 3;
              const isWarning = !isSporadic && days > 3 && days <= 5;

              return (
                <div
                  key={product.id}
                  className="p-4 sm:px-7 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Left Side: Icon + Name + Location + Autonomy Bar */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isCritical
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                          : isWarning
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                      }`}
                    >
                      {isCritical || isWarning ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                          {product.name}
                        </span>

                        {/* Status text dot */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isCritical ? 'bg-rose-500 animate-pulse' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className={isCritical ? 'text-rose-600 dark:text-rose-400' : isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {isSporadic ? 'Sob Demanda' : `${days} dias de autonomia`}
                          </span>
                        </span>

                        {dailyRate > 0 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
                            ({dailyRate} {product.unit}/dia)
                          </span>
                        )}
                      </div>

                      {/* Mini Autonomy Progress Bar */}
                      {!isSporadic && (
                        <div className="w-full max-w-xs h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (days / 15) * 100)}%` }}
                          />
                        </div>
                      )}

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Local: <strong>{product.location}</strong> &bull; Mínimo: <strong>{product.minStock} {product.unit}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Physical Quantity + Quick Entry */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
                        {product.currentStock} <span className="text-xs font-semibold text-slate-400">{product.unit}</span>
                      </div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Saldo Físico
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          soundFeedback.play('click');
                          onOpenEntryModal(product);
                        }}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer border border-emerald-500/20 active:scale-95"
                        title="Registrar reposição rápida para este item"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">+ Entrada</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
