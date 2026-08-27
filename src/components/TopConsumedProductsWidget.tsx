import React, { useMemo } from 'react';
import { TrendingUp, ArrowUpRight, Award, Flame } from 'lucide-react';
import { Product, StockMovement } from '../types';
import { calculateDaysRemaining } from '../utils/storage';

interface TopConsumedProductsWidgetProps {
  products: Product[];
  movements: StockMovement[];
  onOpenProductTimeline?: (productId: string) => void;
  onNavigateProducts?: () => void;
}

export const TopConsumedProductsWidget: React.FC<TopConsumedProductsWidgetProps> = ({
  products,
  movements,
  onOpenProductTimeline,
  onNavigateProducts,
}) => {
  // Aggregate real exit quantities by product
  const topList = useMemo(() => {
    const consumptionMap: Record<string, { totalExits: number; movementCount: number }> = {};

    movements
      .filter((m) => m.type === 'saida')
      .forEach((m) => {
        if (!consumptionMap[m.productId]) {
          consumptionMap[m.productId] = { totalExits: 0, movementCount: 0 };
        }
        consumptionMap[m.productId].totalExits += m.quantity || 0;
        consumptionMap[m.productId].movementCount += 1;
      });

    const items = products.map((p) => {
      const stats = consumptionMap[p.id] || { totalExits: 0, movementCount: 0 };
      const days = calculateDaysRemaining(p);
      return {
        product: p,
        totalExits: stats.totalExits,
        movementCount: stats.movementCount,
        dailyAvg: p.dailyAvgConsumption || 0,
        daysRemaining: days,
      };
    });

    // Sort by exit volume, falling back to dailyAvgConsumption
    items.sort((a, b) => {
      if (b.totalExits !== a.totalExits) {
        return b.totalExits - a.totalExits;
      }
      return b.dailyAvg - a.dailyAvg;
    });

    return items.slice(0, 5);
  }, [products, movements]);

  // Max volume for scaling progress bar
  const maxExit = Math.max(...topList.map((i) => i.totalExits || i.dailyAvg * 7 || 1), 10);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200/60 dark:border-orange-800/40 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Produtos com Maior Saída
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Itens com maior demanda e giro no almoxarifado
            </p>
          </div>
        </div>

        {onNavigateProducts && (
          <button
            onClick={onNavigateProducts}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver todos</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* List with clean Crewix style progress bars */}
      <div className="space-y-3.5">
        {topList.map(({ product: p, totalExits, dailyAvg, daysRemaining }, idx) => {
          const val = totalExits > 0 ? totalExits : dailyAvg * 7;
          const pct = Math.min(Math.round((val / maxExit) * 100), 100);

          return (
            <div
              key={p.id}
              onClick={() => onOpenProductTimeline?.(p.id)}
              className="group cursor-pointer space-y-1.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" title={p.name}>
                      {p.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {p.category}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {totalExits > 0 ? `${totalExits} ${p.unit}` : `${dailyAvg} ${p.unit}/dia`}
                  </span>
                  <span
                    className={`block text-[10px] font-bold ${
                      daysRemaining <= 5
                        ? 'text-rose-600 dark:text-rose-400'
                        : daysRemaining <= 8
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {daysRemaining > 90 ? '90+d' : `${daysRemaining}d`} restantes
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(pct, 8)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Base: Movimentações registradas</span>
        <span>Atualização em tempo real</span>
      </div>
    </div>
  );
};
