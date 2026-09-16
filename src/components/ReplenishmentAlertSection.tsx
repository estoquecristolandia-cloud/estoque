import React from 'react';
import { AlertTriangle, AlertCircle, PlusCircle, ArrowUpRight, PackageX, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { UserRole } from '../firebase';
import { calculateDaysRemaining, getProductStockStatus } from '../utils/storage';
import { StatusBadge } from './ui/StatusBadge';

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
      let badgeStatus: 'critical' | 'warning' | 'normal' = 'normal';

      if (isZero) {
        urgencyLevel = 100;
        statusLabel = 'SEM SALDO (ZERADO)';
        badgeStatus = 'critical';
      } else if (isBelowMin) {
        urgencyLevel = 80 + Math.min(stockDeficitPercent, 19);
        statusLabel = 'ABAIXO DO MÍNIMO';
        badgeStatus = 'critical';
      } else if (days <= 5) {
        urgencyLevel = 50 + (5 - days);
        statusLabel = `AUTONOMIA BAIXA (${days}d)`;
        badgeStatus = 'warning';
      }

      return {
        product: p,
        isZero,
        isBelowMin,
        days,
        urgencyLevel,
        statusLabel,
        badgeStatus,
        deficit: Math.max(0, p.minStock - p.currentStock),
      };
    })
    .filter((item) => item.isZero || item.isBelowMin || item.days <= 5)
    .sort((a, b) => b.urgencyLevel - a.urgencyLevel);

  const zeroCount = urgentProducts.filter((i) => i.isZero).length;
  const belowMinCount = urgentProducts.filter((i) => !i.isZero && i.isBelowMin).length;

  return (
    <div className="bg-surface border border-border-subtle rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-status-critical-bg text-status-critical border border-status-critical-border">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-text-primary">
                Produtos que Precisam de Reposição
              </h3>
              {urgentProducts.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-status-critical text-white tabular-nums">
                  {urgentProducts.length}
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              Itens em situação crítica de estoque ordenados por nível de urgência
            </p>
          </div>
        </div>

        {urgentProducts.length > 0 && (
          <div className="flex items-center gap-2">
            {zeroCount > 0 && (
              <StatusBadge status="critical" label={`${zeroCount} Zerados`} />
            )}
            {belowMinCount > 0 && (
              <StatusBadge status="warning" label={`${belowMinCount} Abaixo do Mínimo`} />
            )}
          </div>
        )}
      </div>

      {/* List or Zero State */}
      {urgentProducts.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center space-y-2 text-text-muted">
          <div className="w-12 h-12 rounded-full bg-status-success-bg text-status-success border border-status-success-border flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-text-primary">
            Nenhum produto crítico no momento!
          </p>
          <p className="text-xs text-text-secondary max-w-sm">
            Todos os itens cadastrados estão acima do estoque mínimo e possuem autonomia de consumo satisfatória.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Responsive Card List (Mobile-friendly) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentProducts.map(({ product: p, days, isZero, statusLabel, badgeStatus, deficit }) => (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isZero
                    ? 'bg-status-critical-bg/40 border-status-critical-border'
                    : 'bg-surface border-border-subtle hover:border-border-default'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block truncate">
                      {p.category}
                    </span>
                    <h4 className="text-sm font-black text-text-primary truncate" title={p.name}>
                      {p.name}
                    </h4>
                  </div>
                  <StatusBadge status={badgeStatus} label={statusLabel} />
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-surface-raised border border-border-subtle text-center">
                  <div>
                    <span className="text-[10px] text-text-muted block font-medium">Atual</span>
                    <span
                      className={`text-sm font-black tabular-nums ${
                        isZero
                          ? 'text-status-critical'
                          : 'text-text-primary'
                      }`}
                    >
                      {p.currentStock} <span className="text-[10px] font-bold">{p.unit}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block font-medium">Mínimo</span>
                    <span className="text-sm font-bold text-text-secondary tabular-nums">
                      {p.minStock} <span className="text-[10px] font-medium">{p.unit}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted block font-medium">Autonomia</span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        days <= 3
                          ? 'text-status-critical'
                          : 'text-status-warning'
                      }`}
                    >
                      {days > 90 ? '90+d' : `${days}d`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-text-secondary">
                    {deficit > 0 ? (
                      <>Déficit: <strong className="text-status-critical font-bold tabular-nums">{deficit} {p.unit}</strong></>
                    ) : (
                      <>Consumo: {p.dailyAvgConsumption > 0 ? <span className="tabular-nums">{p.dailyAvgConsumption} {p.unit}/dia</span> : 'Sob demanda'}</>
                    )}
                  </span>

                  {isAdmin && (
                    <button
                      onClick={() => onOpenEntry(p)}
                      className="px-3 py-1.5 rounded-xl bg-status-success hover:bg-status-success/90 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
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
              className="text-xs font-bold text-status-info hover:underline flex items-center gap-1 cursor-pointer"
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
