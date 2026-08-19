import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Utensils,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Package,
  Calendar,
  Layers,
  Search,
  PieChart,
} from 'lucide-react';
import { Product, DailyKit } from '../types';
import { getRecommendedPurchaseDate, getProductStockStatus } from '../utils/storage';

interface HeroAlertBannerProps {
  products: Product[];
  dailyKit?: DailyKit;
  onOpenEntryModal: () => void;
  onOpenExitModal: () => void;
  onOpenKitModal: () => void;
  onOpenReports: () => void;
}

export const HeroAlertBanner: React.FC<HeroAlertBannerProps> = ({
  products,
  dailyKit,
  onOpenEntryModal,
  onOpenExitModal,
  onOpenKitModal,
  onOpenReports,
}) => {
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

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
    if (dailyRate <= 0) return 999; // Sporadic / non-estimated
    return Math.round((p.currentStock / dailyRate) * 10) / 10;
  };

  // Categorize products by calculated autonomy
  const productsWithAutonomy = products.map((p) => {
    const dailyRate = getProductDailyRate(p);
    const days = getProductAutonomyDays(p);
    const inKit = Boolean(dailyKit?.items.some((k) => k.productId === p.id));
    return { product: p, dailyRate, days, inKit };
  });

  const criticalProducts = productsWithAutonomy.filter(
    (item) => item.days <= 3 || getProductStockStatus(item.product) === 'critical'
  );

  const { dateStr } = getRecommendedPurchaseDate(products);
  const totalItemsCount = products.reduce((acc, p) => acc + p.currentStock, 0);

  // Key staples for quick banner chips
  const keyStaples = [
    { id: 'prod-arroz', label: 'Arroz', icon: '🍚' },
    { id: 'prod-feijao', label: 'Feijão', icon: '🫘' },
    { id: 'prod-macarrao', label: 'Macarrão', icon: '🍝' },
    { id: 'prod-leite', label: 'Leite', icon: '🥛' },
    { id: 'prod-acucar', label: 'Açúcar', icon: '🍬' },
    { id: 'prod-cafe', label: 'Café', icon: '☕' },
    { id: 'prod-oleo', label: 'Óleo', icon: '🛢️' },
    { id: 'prod-manteiga', label: 'Margarina', icon: '🧈' },
  ];

  const highlightedStaples = keyStaples
    .map((staple) => {
      const item = productsWithAutonomy.find((p) => p.product.id === staple.id);
      return item ? { ...staple, ...item } : null;
    })
    .filter(Boolean);

  const filteredBreakdown = productsWithAutonomy.filter((item) =>
    item.product.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.product.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl p-6 sm:p-8 space-y-6">
      {/* Background Subtle Ambient Glow Accent */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Side: Detailed Autonomia Status & Mission Control Badges */}
        <div className="space-y-4 max-w-3xl">
          {/* Top Pill Tags */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Painel de Autonomia Cristolândia
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Utensils className="w-3.5 h-3.5" />
              Base: Kit Cozinha Diário
            </span>

            {criticalProducts.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                {criticalProducts.length} Item(ns) em Reposição Próxima
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Estoque de Alimentos Abastecido
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-400 bg-slate-900 border border-slate-800">
              <Clock className="w-3 h-3 text-slate-400" />
              Atualizado Agora
            </span>
          </div>

          {/* Headline Title & Description */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Visão de Autonomia de Alimentos por Item
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium leading-relaxed">
              Cada produto possui um tempo de duração específico calculado com base na quantidade em estoque e na média de consumo diária da cozinha (Kit Diário).
            </p>
          </div>

          {/* Key Staples Detailed Autonomy Strip */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                Autonomia dos Alimentos Principais (Kit Cozinha)
              </span>
              <span className="text-slate-500">Consumo em dias corridos</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {highlightedStaples.map((st) => {
                if (!st) return null;
                const isLow = st.days <= 5;
                const isGood = st.days >= 14;

                return (
                  <div
                    key={st.product.id}
                    className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                      isLow
                        ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                        : isGood
                        ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                      <span>{st.icon} {st.label}</span>
                    </div>

                    <div className="mt-1">
                      <span className="text-sm font-black tracking-tight text-white">
                        {st.days >= 900 ? 'Esporádico' : `${st.days} dias`}
                      </span>
                      <div className="text-[10px] text-slate-400 font-semibold truncate">
                        {st.product.currentStock} {st.product.unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Micro Stat Pills & Detailed Breakdown Trigger */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/80">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Total de Itens: <strong className="text-white font-bold">{products.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Volume Total: <strong className="text-white font-bold">{totalItemsCount} vol.</strong></span>
              </div>
            </div>

            <button
              onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 font-bold border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer text-xs"
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>{showDetailedBreakdown ? 'Ocultar Autonomia Completa' : 'Ver Autonomia Detalhada por Produto'}</span>
              {showDetailedBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Right Side: Quick Action Button Group */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
          <button
            onClick={onOpenKitModal}
            className="w-full sm:w-auto px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all active:scale-95 text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <Utensils className="w-4 h-4" />
            <span>+ Kit Cozinha Diário</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenExitModal}
              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl border border-slate-800 hover:border-slate-700 transition-all active:scale-95 text-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
              <span>Nova Saída</span>
            </button>

            <button
              onClick={onOpenEntryModal}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-2xl shadow-md shadow-blue-600/20 transition-all active:scale-95 text-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-300" />
              <span>+ Entrada</span>
            </button>
          </div>

          <button
            onClick={onOpenReports}
            className="w-full px-4 py-2 bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white font-bold rounded-xl border border-slate-800 text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ver Relatórios e Previsões</span>
          </button>
        </div>
      </div>

      {/* Expandable Detailed Autonomia Breakdown Table */}
      {showDetailedBreakdown && (
        <div className="relative z-10 pt-4 border-t border-slate-800/90 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Tabela de Autonomia Estimada de Todos os Itens
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculado dividindo o Estoque Atual pelo Consumo Diário do Kit de Cozinha
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-slate-950 text-white border border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none w-full sm:w-56"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredBreakdown.map(({ product, dailyRate, days, inKit }) => {
              const isSporadic = days >= 900 || dailyRate <= 0;
              const isCritical = !isSporadic && days <= 4;
              const isWarning = !isSporadic && days > 4 && days <= 10;
              const isComfortable = !isSporadic && days > 10;

              return (
                <div
                  key={product.id}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                    isCritical
                      ? 'bg-rose-950/30 border-rose-800/80'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-800/60'
                      : isComfortable
                      ? 'bg-slate-900/90 border-slate-800'
                      : 'bg-slate-900/60 border-slate-800/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">{product.name}</span>
                        {inKit && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Kit
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{product.category} &bull; {product.location}</span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase shrink-0 ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isComfortable
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {isSporadic ? 'Esporádico' : `${days} Dias`}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Estoque Atual:</span>
                      <strong className="text-white font-extrabold">
                        {product.currentStock} {product.unit}
                      </strong>
                    </div>

                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Consumo Diário (Kit):</span>
                      <span className="text-slate-200 font-medium">
                        {dailyRate > 0 ? `${dailyRate} ${product.unit}/dia` : 'Consumo sob demanda'}
                      </span>
                    </div>

                    {/* Progress Bar Visual Gauge */}
                    {!isSporadic && (
                      <div className="pt-1">
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (days / 30) * 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                          <span>0d</span>
                          <span>15d</span>
                          <span>30d+</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};



