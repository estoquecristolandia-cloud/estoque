import React, { useState } from 'react';
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
  Eye,
  MessageCircle,
} from 'lucide-react';
import { Product, DailyKit } from '../types';
import { UserRole } from '../firebase';
import { getProductStockStatus } from '../utils/storage';

interface HeroAlertBannerProps {
  products: Product[];
  dailyKit?: DailyKit;
  userRole?: UserRole;
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
  onOpenEntryModal,
  onOpenExitModal,
  onOpenKitModal,
  onOpenReports,
  onOpenMeals,
  onOpenWhatsAppAlert,
}) => {
  const isAdmin = userRole === 'admin';
  const [viewTab, setViewTab] = useState<'alerts' | 'staples' | 'all'>('alerts');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
  const stapleIds = new Set([
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

  const stapleProducts = productsWithAutonomy.filter((item) =>
    stapleIds.has(item.product.id)
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
    const feijao = products.find((p) => p.id === 'prod-feijao');
    const alertItems = products.filter((p) => {
      const daily = p.dailyAvgConsumption > 0 ? p.dailyAvgConsumption : 1;
      const days = p.currentStock / daily;
      return days <= 5 || p.currentStock <= p.minStock;
    });

    let msg = `🏛️ *JUNTA DE MISSÕES NACIONAIS - CRISTOLÂNDIA (LEM/BA)*\n`;
    msg += `📋 *ALERTA OFICIAL DE ESTOQUE & SUPRIMENTOS*\n\n`;
    msg += `Prezado *Chefe Marcos*,\n`;
    msg += `Segue o comunicado oficial do Almoxarifado / Estoque da unidade:\n\n`;

    msg += `🚨 *ITEM EM NÍVEL CRÍTICO DE REPOSIÇÃO:*\n`;
    if (feijao) {
      const daily = feijao.dailyAvgConsumption || 9;
      const days = (feijao.currentStock / daily).toFixed(1);
      msg += `• *Produto:* Feijão Carioca\n`;
      msg += `• *Estoque Físico Atual:* *${feijao.currentStock} kg*\n`;
      msg += `• *Estoque Mínimo de Segurança:* ${feijao.minStock} kg\n`;
      msg += `• *Consumo Diário Médio:* ${daily} kg/dia\n`;
      msg += `• *Autonomia Estimada:* *~${days} dias* (Previsão de término em breve)\n\n`;
    }

    if (alertItems.length > 1) {
      msg += `📌 *Outros itens com atenção para compra/reposição:*\n`;
      alertItems
        .filter((p) => p.id !== 'prod-feijao')
        .forEach((p) => {
          const daily = p.dailyAvgConsumption || 1;
          const days = (p.currentStock / daily).toFixed(1);
          msg += `• ${p.name}: ${p.currentStock} ${p.unit} (~${days} dias de autonomia)\n`;
        });
      msg += `\n`;
    }

    msg += `💡 *Recomendação Operacional:*\n`;
    msg += `Programar a compra/reabastecimento prioritário de Feijão Carioca para as próximas 48 horas para assegurar as refeições da unidade.\n\n`;
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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      {/* 1. Header Bar: Exactly matches the Clean Date & Card Header Style from Image 1 */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900">
        {/* Left Side: Icon box + Title + Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Visão de Autonomia de Alimentos por Item
              </h2>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ({products.length} itens cadastrados)
              </span>
            </div>

            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mt-0.5">
              <span>+ {totalVolume} vol. total em estoque físico</span>
              {alertProducts.length > 0 && (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  &bull; {alertProducts.length} itens próximos a acabar (≤ 5 dias)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Action Buttons matching green/orange pill buttons from Image 1 */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => onOpenEntryModal()}
                className="px-3.5 py-1.5 bg-[#009b62] hover:bg-[#008252] text-white font-bold rounded-xl text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ + Entrada no dia</span>
              </button>

              <button
                onClick={() => onOpenExitModal()}
                className="px-3.5 py-1.5 bg-[#f08519] hover:bg-[#d9730e] text-white font-bold rounded-xl text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ + Saída no dia</span>
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
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Enviar Alerta Oficial de Feijão / Estoque para Chefe Marcos (+55 62 99974-6823)"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Alerta WhatsApp (Chefe Marcos)</span>
          </button>

          <button
            onClick={onOpenKitModal}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Kit Cozinha' : 'Ver Kit Cozinha'}</span>
          </button>

          {onOpenMeals && (
            <button
              onClick={onOpenMeals}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              <span>Refeições</span>
            </button>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-2 py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ml-1"
          >
            <span>{isCollapsed ? 'Expandir' : 'Recolher'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Sub-Header (Only visible when expanded) */}
      {!isCollapsed && (
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewTab('alerts')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewTab === 'alerts'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Itens em Alerta ({alertProducts.length})</span>
            </button>

            <button
              onClick={() => setViewTab('staples')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewTab === 'staples'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-slate-200 dark:border-slate-700 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-500" />
              <span>Kit Cozinha Diário</span>
            </button>

            <button
              onClick={() => setViewTab('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewTab === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Todos ({products.length})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Buscar item de autonomia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none w-full sm:w-56"
            />
          </div>
        </div>
      )}

      {/* 2. Item Rows: Exact List Item Row Structure from Image 1 */}
      {!isCollapsed && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {displayedList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
              Nenhum produto encontrado neste filtro.
            </div>
          ) : (
            displayedList.map(({ product, dailyRate, days, inKit }) => {
              const isSporadic = days >= 900 || dailyRate <= 0;
              const isCritical = !isSporadic && days <= 3;
              const isWarning = !isSporadic && days > 3 && days <= 5;
              const isComfortable = !isSporadic && days > 5;

              return (
                <div
                  key={product.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Left Side: Rounded Icon Box + Title + Pills + Subtitle */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Rounded Icon Box (Green for safe, amber/rose for alert) */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isCritical
                          ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/60 dark:border-rose-900/40'
                          : isWarning
                          ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/60 dark:border-amber-900/40'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/60 dark:border-emerald-900/40'
                      }`}
                    >
                      {isCritical || isWarning ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    {/* Product Name + Badges + Subtext details */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {product.name}
                        </span>

                        {/* Status Pill Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-tight uppercase ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                              : isWarning
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40'
                          }`}
                        >
                          {isSporadic
                            ? 'SOB DEMANDA'
                            : isCritical
                            ? `ALERTA CRÍTICO (${days} DIAS)`
                            : isWarning
                            ? `ALERTA (${days} DIAS)`
                            : `AUTONOMIA: ${days} DIAS`}
                        </span>

                        {/* Daily Rate Pill */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {dailyRate > 0 ? `${dailyRate} ${product.unit}/dia` : 'Esporádico'}
                        </span>
                      </div>

                      {/* Subtitle with stock, location and notes in italics/gray */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Local: <strong>{product.location}</strong> &bull; Estoque Mínimo:{' '}
                        <strong>
                          {product.minStock} {product.unit}
                        </strong>{' '}
                        &bull; Categoria: {product.category}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Big Bold Quantity + Direct Action Pill Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-base sm:text-lg font-black tracking-tight ${
                          isCritical
                            ? 'text-rose-600 dark:text-rose-400'
                            : isWarning
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {product.currentStock} {product.unit}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Saldo Físico em Prateleira
                      </div>
                    </div>

                    {/* Green "+ Entrada" Pill Button (Admin only) */}
                    {isAdmin && (
                      <button
                        onClick={() => onOpenEntryModal(product)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer border border-emerald-200 dark:border-emerald-800 shadow-2xs active:scale-95"
                        title="Registrar Entrada / Reposição"
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
