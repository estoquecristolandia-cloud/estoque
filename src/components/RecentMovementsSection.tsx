import React from 'react';
import { ArrowDownLeft, ArrowUpRight, History, Calendar, Clock, User, Building2, ArrowRight } from 'lucide-react';
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
  userRole = 'viewer',
  onViewAllMovements,
  onOpenProductTimeline,
}) => {
  // Get latest 10 movements sorted by timestamp/date/time descending
  const recentList = [...movements]
    .sort((a, b) => {
      const dateA = `${a.date || ''}T${a.time || '00:00'}`;
      const dateB = `${b.date || ''}T${b.time || '00:00'}`;
      return dateB.localeCompare(dateA);
    })
    .slice(0, 10);

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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Movimentações Recentes
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Atualização em tempo real"></span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Últimas 10 entradas e saídas registradas no estoque
            </p>
          </div>
        </div>

        <button
          onClick={onViewAllMovements}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <span>Ver Histórico Completo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      {recentList.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          Nenhuma movimentação registrada no momento.
        </div>
      ) : (
        <div className="space-y-2">
          {/* Mobile-Friendly Cards for all screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {recentList.map((m) => {
              const isEntry = m.type === 'entrada';
              const unit = getProductUnit(m.productId);

              return (
                <div
                  key={m.id}
                  onClick={() => onOpenProductTimeline?.(m.productId)}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isEntry
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/40 hover:border-emerald-400'
                      : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-900/40 hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Badge Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-bold ${
                        isEntry
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-blue-600 text-white shadow-xs'
                      }`}
                    >
                      {isEntry ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>

                    {/* Product & Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isEntry
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {isEntry ? 'Entrada' : 'Saída'}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[160px] sm:max-w-[200px]" title={m.productName}>
                          {m.productName}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDateDisplay(m.date)} {m.time ? `às ${m.time}` : ''}
                        </span>

                        <span className="text-slate-300 dark:text-slate-600">•</span>

                        <span className="flex items-center gap-1 truncate max-w-[130px]">
                          {isEntry ? (
                            <span title={m.supplierOrDonor || 'Doação/Compra'}>
                              {m.supplierOrDonor || 'Doação / Compra'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1" title={m.sector || 'Cozinha'}>
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {m.sector || 'Cozinha'}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Responsible */}
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm sm:text-base font-black ${
                        isEntry
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {isEntry ? '+' : '-'}{m.quantity} <span className="text-[10px] font-bold text-slate-500">{unit}</span>
                    </div>

                    <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1 mt-0.5">
                      <User className="w-3 h-3" />
                      <span className="truncate max-w-[80px]" title={m.responsible || 'Responsável'}>
                        {m.responsible?.split(' ')[0] || 'Marconi'}
                      </span>
                    </div>
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
