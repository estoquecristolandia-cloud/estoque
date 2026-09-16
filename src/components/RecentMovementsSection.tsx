import React from 'react';
import { History, ArrowRight } from 'lucide-react';
import { StockMovement, Product } from '../types';
import { UserRole } from '../firebase';
import { MovementRow } from './ui/MovementRow';

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

  const getProductUnit = (productId: string) => {
    const p = products.find((prod) => prod.id === productId);
    return p ? p.unit : 'un';
  };

  return (
    <div className="bg-surface border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-status-info-bg text-status-info border border-status-info-border">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-text-primary flex items-center gap-2">
              Movimentações Recentes
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" title="Atualização em tempo real"></span>
            </h3>
            <p className="text-xs text-text-secondary">
              Últimas 10 entradas e saídas registradas no estoque
            </p>
          </div>
        </div>

        <button
          onClick={onViewAllMovements}
          className="px-3.5 py-2 bg-surface-raised hover:bg-surface-raised/80 text-text-primary border border-border-subtle hover:border-border-default font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <span>Ver Histórico Completo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      {recentList.length === 0 ? (
        <div className="py-8 text-center text-text-muted text-xs">
          Nenhuma movimentação registrada no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {recentList.map((m) => (
            <MovementRow
              key={m.id}
              movement={{ ...m, unit: m.unit || getProductUnit(m.productId) }}
              onClick={() => onOpenProductTimeline?.(m.productId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

