import React from 'react';
import { AlertTriangle, AlertCircle, PlusCircle, ArrowUpRight, PackageX, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { UserRole } from '../firebase';
import { calculateDaysRemaining, getProductStockStatus } from '../utils/storage';

interface ReplenishmentAlertSectionProps {
  products: Product[];
  userRole?: UserRole;
  onOpenEntry: (product?: Product) => void;
  onViewAllProducts: () => void;
}

export const ReplenishmentAlertSection: React.FC<ReplenishmentAlertSectionProps> = ({
  products,
  userRole = 'viewer',
  onOpenEntry,
  onViewAllProducts,
}) => {
  const isAdmin = userRole === 'admin';

  // Calculate items requiring attention
  const urgentProducts = products
    .map((p) => {
      const days = calculateDaysRemaining(p);
      const isZero = p.currentStock === 0;
      const isBelowMin = p.currentStock <= p.minStock;
      const stockDeficitPercent = p.minStock > 0 ? ((p.minStock - p.currentStock) / p.minStock) * 100 : 0;

      let urgencyLevel = 0;
      let statusLabel = 'Adequado';
      let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';

      if (isZero) {
        urgencyLevel = 100;
        statusLabel = 'SEM SALDO (ZERADO)';
        badgeColor = 'bg-rose-600 text-white animate-pulse font-black shadow-xs';
      } else if (isBelowMin) {
        urgencyLevel = 80 + Math.min(stockDeficitPercent, 19);
        statusLabel = 'ABAIXO DO MÍNIMO';
        badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold';
      } else if (days <= 5) {
        urgencyLevel = 50 + (5 - days);
        statusLabel = `AUTONOMIA BAIXA (${days}d)`;
        badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold';
      }

      return {
        product: p,
        isZero,
        isBelowMin,
        days,
        urgencyLevel,
        statusLabel,
        badgeColor,
        deficit: Math.max(0, p.minStock - p.currentStock),
      };
    })
    .filter((item) => item.isZero || item.isBelowMin || item.days <= 5)
    .sort((a, b) => b.urgencyLevel - a.urgencyLevel);

  const zeroCount = urgentProducts.filter((i) => i.isZero).length;
  const belowMinCount = urgentProducts.filter((i) => !i.isZero && i.isBelowMin).length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Produtos que Precisam de Reposição
              </h3>
              {urgentProducts.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500 text-white">
                  {urgentProducts.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Itens em situação crítica de estoque ordenados por nível de urgência
            </p>
          </div>
        </div>

        {urgentProducts.length > 0 && (
          <div className="flex items-center gap-2">
            {zeroCount > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-full border border-rose-200 dark:border-rose-800">
                🔴 {zeroCount} Zerados
              </span>
            )}
            {belowMinCount > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800">
                ⚠️ {belowMinCount} Abaixo do Mínimo
              </span>
            )}
          </div>
        )}
      </div>

      {/* List or Zero State */}
      {urgentProducts.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center space-y-2 text-slate-400">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Nenhum produto crítico no momento!
          </p>
          <p className="text-xs text-slate-500 max-w-sm">
            Todos os itens cadastrados estão acima do estoque mínimo e possuem autonomia de consumo satisfatória.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Responsive Card List (Mobile-friendly) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentProducts.map(({ product: p, days, isZero, statusLabel, badgeColor, deficit }) => (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isZero
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                    : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                      {p.category}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white truncate" title={p.name}>
                      {p.name}
                    </h4>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${badgeColor}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Atual</span>
                    <span
                      className={`text-sm font-black ${
                        isZero
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {p.currentStock} <span className="text-[10px] font-bold">{p.unit}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Mínimo</span>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {p.minStock} <span className="text-[10px] font-medium">{p.unit}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Autonomia</span>
                    <span
                      className={`text-sm font-bold ${
                        days <= 3
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {days > 90 ? '90+d' : `${days}d`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {deficit > 0 ? (
                      <>Déficit: <strong className="text-rose-600 dark:text-rose-400 font-bold">{deficit} {p.unit}</strong></>
                    ) : (
                      <>Consumo: {p.dailyAvgConsumption > 0 ? `${p.dailyAvgConsumption} ${p.unit}/dia` : 'Sob demanda'}</>
                    )}
                  </span>

                  {isAdmin && (
                    <button
                      onClick={() => onOpenEntry(p)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Entrada</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onViewAllProducts}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos os produtos no Estoque Geral</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
