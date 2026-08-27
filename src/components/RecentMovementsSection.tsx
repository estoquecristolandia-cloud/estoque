import React from 'react';
import { ArrowDownLeft, ArrowUpRight, History, Calendar, Clock, User, Building2, ArrowRight, Scale } from 'lucide-react';
import { StockMovement, Product } from '../types';
import { UserRole } from '../firebase';

interface RecentMovementsSectionProps {
  movements: StockMovement[];
  products: Product[];
  userRole?: UserRole;
  onViewAllMovements: () => void;
  onOpenProductTimeline?: (productId: string) => void;
}

export const RecentMovementsSection: React.FC<RecentMovementsSectionProps> = ({
  movements,
  products,
  onViewAllMovements,
  onOpenProductTimeline,
}) => {
  // Get latest 6 movements sorted by timestamp/date/time descending
  const recentList = [...movements]
    .sort((a, b) => {
      const dateA = `${a.date || ''}T${a.time || '00:00'}`;
      const dateB = `${b.date || ''}T${b.time || '00:00'}`;
      return dateB.localeCompare(dateA);
    })
    .slice(0, 6);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '--/--';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  const getProductUnit = (productId: string) => {
    const p = products.find((prod) => prod.id === productId);
    return p ? p.unit : 'un';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Últimas Movimentações
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Tempo Real" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Extrato recente de entradas, saídas e conciliações
            </p>
          </div>
        </div>

        <button
          onClick={onViewAllMovements}
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
        >
          <span>Ver histórico completo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      {recentList.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs font-medium">
          Nenhuma movimentação registrada no momento.
        </div>
      ) : (
        <div className="space-y-2">
          {recentList.map((m) => {
            const isEntry = m.type === 'entrada';
            const isAjuste = m.type === 'ajuste';
            const unit = getProductUnit(m.productId);

            return (
              <div
                key={m.id}
                onClick={() => onOpenProductTimeline?.(m.productId)}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer hover:shadow-xs ${
                  isAjuste
                    ? 'bg-purple-50/30 dark:bg-purple-950/20 border-purple-200/70 dark:border-purple-900/40 hover:border-purple-300'
                    : isEntry
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/40 hover:border-emerald-300'
                    : 'bg-orange-50/30 dark:bg-orange-950/20 border-orange-200/70 dark:border-orange-900/40 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Badge Icon */}
                  <div
                    className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold ${
                      isAjuste
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        : isEntry
                        ? 'bg-emerald-100 text-[#059669] dark:bg-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-orange-100 text-[#EA580C] dark:bg-orange-900 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                    }`}
                  >
                    {isAjuste ? (
                      <Scale className="w-3.5 h-3.5" />
                    ) : isEntry ? (
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Product & Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                          isAjuste
                            ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300'
                            : isEntry
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                            : 'bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300'
                        }`}
                      >
                        {isAjuste ? 'Ajuste' : isEntry ? 'Entrada' : 'Saída'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[160px] sm:max-w-[220px]" title={m.productName}>
                        {m.productName}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDateDisplay(m.date)} {m.time ? `às ${m.time}` : ''}
                      </span>

                      <span className="text-slate-300 dark:text-slate-600">•</span>

                      <span className="truncate max-w-[120px]">
                        {isAjuste ? (
                          m.reason || 'Inventário'
                        ) : isEntry ? (
                          m.supplierOrDonor || 'Doação'
                        ) : (
                          m.sector || 'Cozinha'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantity */}
                <div className="text-right shrink-0">
                  <span
                    className={`text-sm font-extrabold tabular-nums block ${
                      isAjuste
                        ? 'text-purple-700 dark:text-purple-300'
                        : isEntry
                        ? 'text-[#059669] dark:text-emerald-400'
                        : 'text-[#EA580C] dark:text-orange-400'
                    }`}
                  >
                    {isAjuste ? '' : isEntry ? '+' : '-'}{m.quantity} {unit}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate max-w-[90px]">
                    {m.receivedBy || m.retrievedBy || m.responsible || 'Sistema'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
