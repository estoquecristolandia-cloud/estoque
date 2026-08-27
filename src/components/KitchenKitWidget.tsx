import React from 'react';
import { Utensils, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, ChefHat } from 'lucide-react';
import { DailyKit, Product } from '../types';
import { UserRole } from '../firebase';

interface KitchenKitWidgetProps {
  dailyKit?: DailyKit;
  products: Product[];
  userRole?: UserRole;
  onOpenKitModal: () => void;
}

export const KitchenKitWidget: React.FC<KitchenKitWidgetProps> = ({
  dailyKit,
  products,
  userRole = 'viewer',
  onOpenKitModal,
}) => {
  const isAdmin = userRole === 'admin';
  const kitItems = dailyKit?.items || [];

  // Analyze each kit item against current real stock
  const analyzedItems = kitItems.map((item) => {
    const prod = products.find((p) => p.id === item.productId);
    const currentStock = prod ? prod.currentStock : 0;
    const isSufficient = currentStock >= item.quantity;
    const stockCoverage = item.quantity > 0 ? Math.min(Math.round((currentStock / item.quantity) * 100), 100) : 100;
    return {
      ...item,
      currentStock,
      isSufficient,
      stockCoverage,
    };
  });

  const totalRequiredItems = analyzedItems.length;
  const readyItemsCount = analyzedItems.filter((i) => i.isSufficient).length;
  const readinessPercent = totalRequiredItems > 0 ? Math.round((readyItemsCount / totalRequiredItems) * 100) : 0;
  const isFullyReady = readinessPercent === 100 && totalRequiredItems > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Kit Cozinha Diário
              </h3>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  isFullyReady
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}
              >
                {isFullyReady ? 'Pronto para Baixa' : 'Atenção ao Saldo'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Suprimentos diários essenciais para o preparo das refeições
            </p>
          </div>
        </div>

        {/* Circular / Pill Readiness Metric */}
        <div className="text-right shrink-0">
          <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            {readinessPercent}%
          </span>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Prontidão
          </span>
        </div>
      </div>

      {/* Modern Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-600 dark:text-slate-400">
            {readyItemsCount} de {totalRequiredItems} itens com saldo suficiente
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            {totalRequiredItems - readyItemsCount} pendentes
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isFullyReady ? 'bg-emerald-500' : readinessPercent >= 70 ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            style={{ width: `${readinessPercent}%` }}
          />
        </div>
      </div>

      {/* Quick Items Preview in Compact Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {analyzedItems.slice(0, 6).map((item) => (
          <div
            key={item.productId}
            className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-colors ${
              item.isSufficient
                ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60'
                : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
            }`}
          >
            <div className="min-w-0 pr-1">
              <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]" title={item.productName}>
                {item.productName}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                Ped: {item.quantity} {item.unit}
              </p>
            </div>
            <span
              className={`text-[10px] font-extrabold tabular-nums px-1.5 py-0.5 rounded shrink-0 ${
                item.isSufficient
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950'
                  : 'text-rose-700 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-950'
              }`}
            >
              {item.currentStock} {item.unit}
            </span>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          Setor: <strong className="text-slate-700 dark:text-slate-300">Cozinha Geral</strong>
        </span>

        <button
          onClick={onOpenKitModal}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>{isAdmin ? 'Efetivar Baixa do Kit' : 'Visualizar Kit'}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
