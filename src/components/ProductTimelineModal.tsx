import React from 'react';
import { Package, ShieldCheck, Clock, User, Building2, Scale, Plus, Minus } from 'lucide-react';
import { Product, StockMovement } from '../types';
import { UserRole } from '../firebase';
import { calculateDaysRemaining, verifyProductAudit, formatDaysRemainingText } from '../utils/storage';
import { ModalWrapper } from './ui/ModalWrapper';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface ProductTimelineModalProps {
  product: Product | null;
  movements: StockMovement[];
  userRole?: UserRole;
  onClose: () => void;
  onOpenEntry: (product: Product) => void;
  onOpenExit: (product: Product) => void;
}

export const ProductTimelineModal: React.FC<ProductTimelineModalProps> = ({
  product,
  movements,
  userRole = 'viewer',
  onClose,
  onOpenEntry,
  onOpenExit,
}) => {
  const isAdmin = userRole === 'admin';
  if (!product) return null;

  const prodMovements = movements.filter((m) => m.productId === product.id);
  const audit = verifyProductAudit(product, movements);
  const daysRemaining = calculateDaysRemaining(product);

  // Sector breakdown for this specific product
  const sectorBreakdown: Record<string, number> = {};
  prodMovements
    .filter((m) => m.type === 'saida')
    .forEach((m) => {
      const sec = m.sector || 'Outros';
      sectorBreakdown[sec] = (sectorBreakdown[sec] || 0) + m.quantity;
    });

  return (
    <ModalWrapper
      id="product-timeline-modal"
      isOpen={!!product}
      onClose={onClose}
      title={product.name}
      subtitle="Rastreabilidade completa de todas as entradas, doações, saídas por setor e ajustes"
      icon={<Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="success"
                onClick={() => {
                  onClose();
                  onOpenEntry(product);
                }}
                icon={<Plus className="w-4 h-4" />}
              >
                Nova Entrada
              </Button>
              <Button
                variant="warning"
                onClick={() => {
                  onClose();
                  onOpenExit(product);
                }}
                icon={<Minus className="w-4 h-4" />}
              >
                Nova Saída
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Key Product Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Estoque Atual</span>
            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
              {product.currentStock} <span className="text-xs font-normal text-slate-500">{product.unit}</span>
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Consumo Diário</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
              {product.dailyAvgConsumption} <span className="text-xs font-normal text-slate-500">{product.unit}/dia</span>
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Estoque Mínimo</span>
            <span className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1 block">
              {product.minStock} <span className="text-xs font-normal text-slate-500">{product.unit}</span>
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Previsão</span>
            <span className={`text-base font-bold mt-1 block ${daysRemaining <= 5 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatDaysRemainingText(daysRemaining)}
            </span>
          </div>
        </div>

        {/* Mathematical Audit Verification Box */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Auditoria Matemática do Estoque
            </span>
            <Badge variant={audit.isBalanced ? 'success' : 'danger'}>
              {audit.isBalanced ? 'Conta Bateu Perfeitamente' : 'Divergência no Saldo'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <span className="text-slate-500 text-[11px] block">Total de Entradas:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">+{audit.totalEntries} {product.unit}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Total de Saídas:</span>
              <strong className="text-rose-600 dark:text-rose-400 font-mono text-sm">-{audit.totalExits} {product.unit}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Saldo Atual Calculado:</span>
              <strong className="text-blue-600 dark:text-blue-400 font-mono text-sm">= {audit.calculatedBalance} {product.unit}</strong>
            </div>
          </div>

          {/* Sector distribution pills */}
          {Object.keys(sectorBreakdown).length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">Consumo por Setor de Destino:</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(sectorBreakdown).map(([sec, qty]) => (
                  <span key={sec} className="text-xs px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-medium">
                    <strong>{sec}:</strong> {qty} {product.unit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeline Feed Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Histórico Cronológico de Movimentações ({prodMovements.length})
            </h4>
          </div>

          {prodMovements.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Nenhuma movimentação registrada para este produto.</p>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {prodMovements.map((mov) => {
                const isEntry = mov.type === 'entrada';
                const isAjuste = mov.type === 'ajuste';
                return (
                  <div key={mov.id} className="relative group">
                    {/* Node circle */}
                    <div
                      className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                        isAjuste
                          ? 'bg-purple-100 dark:bg-purple-950 border-purple-500 text-purple-600 dark:text-purple-400'
                          : isEntry
                          ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-100 dark:bg-amber-950 border-amber-500 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isAjuste ? '⚖️' : isEntry ? '+' : '-'}
                    </div>

                    <div className={`border rounded-2xl p-3.5 text-xs space-y-2 transition-all ${
                      isAjuste 
                        ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                    }`}>
                      <div className="flex items-center justify-between flex-wrap gap-1.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isAjuste ? 'warning' : isEntry ? 'success' : 'warning'}
                          >
                            {isAjuste ? 'Ajuste de Inventário' : isEntry ? `Entrada (${mov.entryType || 'Compra'})` : `Saída: ${mov.sector}`}
                          </Badge>
                          <span className="text-slate-500 dark:text-slate-400 text-xs">
                            {mov.date} às {mov.time || '00:00'}
                          </span>
                        </div>

                        <span className={`font-black text-sm ${
                          isAjuste ? 'text-purple-600 dark:text-purple-400' : isEntry ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {isAjuste 
                            ? `${(mov.difference || 0) > 0 ? '+' : ''}${mov.difference !== undefined ? mov.difference : mov.quantity} ${mov.unit}`
                            : `${isEntry ? '+' : '-'}${mov.quantity} ${mov.unit}`}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="text-slate-600 dark:text-slate-300 text-xs space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {isAjuste ? (
                          <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 flex-wrap">
                            <Scale className="w-3.5 h-3.5 text-purple-500" />
                            <span>Motivo: <strong className="text-slate-800 dark:text-slate-200">{mov.reason || 'Conferência física'}</strong></span>
                            <span className="text-slate-400">|</span>
                            <span>Resp.: <strong className="text-slate-800 dark:text-slate-200">{mov.responsible || 'Admin'}</strong></span>
                            {mov.previousStock !== undefined && mov.physicalStock !== undefined && (
                              <span className="text-slate-500">
                                ({mov.previousStock} → {mov.physicalStock} {mov.unit})
                              </span>
                            )}
                          </p>
                        ) : isEntry ? (
                          <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>Fornecedor/Doador: <strong className="text-slate-800 dark:text-slate-200">{mov.supplierOrDonor || 'Não informado'}</strong></span>
                            <span className="text-slate-400">|</span>
                            <span>Recebido por: <strong className="text-slate-800 dark:text-slate-200">{mov.receivedBy || 'Não informado'}</strong></span>
                          </p>
                        ) : (
                          <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 flex-wrap">
                            <Building2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>Retirado por: <strong className="text-slate-800 dark:text-slate-200">{mov.retrievedBy || 'Não informado'}</strong></span>
                            <span className="text-slate-400">|</span>
                            <span>Entregue por: <strong className="text-slate-800 dark:text-slate-200">{mov.deliveredBy || 'Não informado'}</strong></span>
                          </p>
                        )}

                        {mov.notes && (
                          <p className="text-slate-500 dark:text-slate-400 italic text-[11px]">
                            Obs: "{mov.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};

