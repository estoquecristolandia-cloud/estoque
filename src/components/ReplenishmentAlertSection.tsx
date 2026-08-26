import React from 'react';
import { AlertTriangle, AlertCircle, PlusCircle, ArrowUpRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { UserRole } from '../firebase';
import { calculateDaysRemaining } from '../utils/storage';

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
      let badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';

      if (isZero) {
        urgencyLevel = 100;
        statusLabel = 'SEM SALDO (ZERADO)';
        badgeColor = 'bg-rose-600 text-white font-extrabold shadow-2xs';
      } else if (isBelowMin) {
        urgencyLevel = 80 + Math.min(stockDeficitPercent, 19);
        statusLabel = 'ABAIXO DO MÍNIMO';
        badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold';
      } else if (days <= 5) {
        urgencyLevel = 50 + (5 - days);
        statusLabel = `AUTONOMIA BAIXA (${days}d)`;
        badgeColor = 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800 font-bold';
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/60 dark:border-rose-800/40">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Produtos em Ponto de Reposição
              </h3>
              {urgentProducts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white">
                  {urgentProducts.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Itens em situação de atenção ou desabastecimento prioritário
            </p>
          </div>
        </div>

        {urgentProducts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {zeroCount > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-800">
                {zeroCount} Zerados
              </span>
            )}
            {belowMinCount > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 rounded-lg border border-orange-200 dark:border-orange-800">
                {belowMinCount} Abaixo do Mínimo
              </span>
            )}
          </div>
        )}
      </div>

      {/* List or Zero State */}
      {urgentProducts.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center space-y-2 text-slate-400">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Nenhum produto em nível crítico no momento.
          </p>
          <p className="text-xs text-slate-500 max-w-sm">
            Todos os itens cadastrados estão acima do estoque de segurança com abastecimento regular.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentProducts.map(({ product: p, days, isZero, statusLabel, badgeColor, deficit }) => (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                  isZero
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                      {p.category}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={p.name}>
                      {p.name}
                    </h4>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md shrink-0 ${badgeColor}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Atual</span>
                    <span
                      className={`text-sm font-extrabold tabular-nums ${
                        isZero
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {p.currentStock} <span className="text-[10px] font-medium">{p.unit}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Mínimo</span>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                      {p.minStock} <span className="text-[10px] font-medium">{p.unit}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Autonomia</span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        days <= 3
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-orange-600 dark:text-orange-400'
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
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Entrada</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1 flex justify-end">
            <button
              onClick={onViewAllProducts}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
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
