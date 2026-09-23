import React, { useState } from 'react';
import { Product, StockMovement } from '../types';
import { analyzeExpiryPVPS, calculateStockRunway, ExpiryItem } from '../utils/expiryAutonomy';
import { Clock, AlertTriangle, ShieldCheck, Flame, ChevronRight, Utensils, Sparkles, CheckCircle2 } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';
import { soundFeedback } from '../utils/audioFeedback';

interface PvpsRunwayBannerProps {
  products: Product[];
  movements: StockMovement[];
  onOpenExitForProduct?: (product: Product) => void;
}

export const PvpsRunwayBanner: React.FC<PvpsRunwayBannerProps> = ({
  products,
  movements,
  onOpenExitForProduct,
}) => {
  const [showAllExpiring, setShowAllExpiring] = useState(false);

  const pvps = analyzeExpiryPVPS(products);
  const runway = calculateStockRunway(products, movements);

  const urgentItems = [...pvps.expired, ...pvps.urgent7, ...pvps.warning15];

  const getStatusColor = (status: 'safe' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'safe':
      default:
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] space-y-5 backdrop-blur-md transition-all">
      {/* Barra de Inteligência e Autonomia Alimentar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-inner">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Autonomia Alimentar do Galpão (Runway)
              </h3>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getStatusColor(
                  runway.status
                )}`}
              >
                {runway.statusLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
              {runway.summaryMessage}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Autonomia Média
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
              ~<AnimatedNumber value={runway.averageAutonomyDays} /> <span className="text-sm font-semibold text-slate-400">dias</span>
            </span>
          </div>
          <div className="w-28 sm:w-36 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                runway.status === 'safe'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : runway.status === 'warning'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  : 'bg-gradient-to-r from-rose-500 to-red-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
              }`}
              style={{ width: `${Math.min(100, Math.max(10, (runway.averageAutonomyDays / 30) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Regra PVPS: Alerta de Validades Críticas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Regra PVPS — Primeiro que Vence, Primeiro que Sai ({urgentItems.length} em atenção)
            </h4>
          </div>
          {urgentItems.length > 3 && (
            <button
              onClick={() => {
                soundFeedback.play('click');
                setShowAllExpiring(!showAllExpiring);
              }}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {showAllExpiring ? 'Mostrar Menos' : 'Ver Todos'}
            </button>
          )}
        </div>

        {urgentItems.length === 0 ? (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 rounded-2xl flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Nenhum lote com vencimento crítico nos próximos 15 dias. Estoque sob controle total.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(showAllExpiring ? urgentItems : urgentItems.slice(0, 3)).map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all shadow-xs ${
                  item.status === 'expired'
                    ? 'bg-red-500/5 border-red-500/30 dark:bg-red-950/30'
                    : item.status === 'urgent_7'
                    ? 'bg-amber-500/5 border-amber-500/30 dark:bg-amber-950/30'
                    : 'bg-blue-500/5 border-blue-500/20 dark:bg-blue-950/30'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1">
                      {item.product.name}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                        item.status === 'expired'
                          ? 'bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30'
                          : item.status === 'urgent_7'
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {item.daysRemaining <= 0 ? 'VENCIDO' : `${item.daysRemaining}d`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Saldo: <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{item.product.currentStock} {item.product.unit}</strong> · {item.urgencyLabel}
                  </p>
                </div>

                {onOpenExitForProduct && (
                  <button
                    onClick={() => {
                      soundFeedback.play('open');
                      onOpenExitForProduct(item.product);
                    }}
                    className="mt-3 py-1.5 px-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  >
                    <Utensils className="w-3.5 h-3.5 text-amber-500" />
                    <span>Destinar para Cozinha / Refeitório</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
