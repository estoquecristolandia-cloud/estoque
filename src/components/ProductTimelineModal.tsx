import React, { useState } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, ShieldCheck, Clock, User, Building2, Package, Sparkles, AlertTriangle, Scale, Trash2 } from 'lucide-react';
import { Product, StockMovement } from '../types';
import { UserRole } from '../firebase';
import { calculateDaysRemaining, verifyProductAudit, formatDaysRemainingText, getProductAutonomyLabel } from '../utils/storage';
import { isMarcoZeroRecord } from '../services/firestoreService';

interface ProductTimelineModalProps {
  product: Product | null;
  movements: StockMovement[];
  userRole?: UserRole;
  onClose: () => void;
  onOpenEntry: (product: Product) => void;
  onOpenExit: (product: Product) => void;
  onDeleteMovement?: (movementId: string) => Promise<void> | void;
}

export const ProductTimelineModal: React.FC<ProductTimelineModalProps> = ({
  product,
  movements,
  userRole = 'viewer',
  onClose,
  onOpenEntry,
  onOpenExit,
  onDeleteMovement,
}) => {
  const isAdmin = userRole === 'admin';
  const [movementToDelete, setMovementToDelete] = useState<StockMovement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">{product.name}</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {product.category}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Rastreabilidade completa de todas as entradas, doações e saídas por setor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Key Product Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <span className="text-xs text-slate-400 block">Estoque Atual</span>
              <span className="text-xl font-black text-white mt-1 block">
                {product.currentStock} <span className="text-xs font-normal text-slate-400">{product.unit}</span>
              </span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              {product.id === 'prod-flocao' || product.name.toLowerCase().includes('flocão') || product.name.toLowerCase().includes('flocao') ? (
                <>
                  <span className="text-xs text-slate-400 block">Consumo por Preparo</span>
                  <span className="text-xl font-bold text-amber-400 mt-1 block">
                    20 <span className="text-xs font-normal text-slate-400">pacotes/preparo</span>
                  </span>
                  <span className="text-[10px] text-amber-400/80 block mt-0.5">Somente Quartas e Domingos</span>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-400 block">Consumo Diário</span>
                  <span className="text-xl font-bold text-amber-400 mt-1 block">
                    {product.dailyAvgConsumption} <span className="text-xs font-normal text-slate-400">{product.unit}/dia</span>
                  </span>
                  {product.usageFrequency && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">{product.usageFrequency}</span>
                  )}
                </>
              )}
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <span className="text-xs text-slate-400 block">Estoque Mínimo</span>
              <span className="text-xl font-bold text-slate-300 mt-1 block">
                {product.minStock} <span className="text-xs font-normal text-slate-400">{product.unit}</span>
              </span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <span className="text-xs text-slate-400 block">Autonomia Estimada</span>
              <span className={`text-sm font-bold mt-1 block ${daysRemaining <= 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {getProductAutonomyLabel(product)}
              </span>
            </div>
          </div>

          {/* Mathematical Audit Verification Box */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Auditoria Matemática do Estoque
              </span>
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold ${
                audit.isBalanced ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {audit.isBalanced ? '✅ Conta Bateu Perfeitamente' : '⚠️ Divergência no Saldo'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block">Total de Entradas:</span>
                <strong className="text-emerald-400 font-mono text-sm">+{audit.totalEntries} {product.unit}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Total de Saídas:</span>
                <strong className="text-rose-400 font-mono text-sm">-{audit.totalExits} {product.unit}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Saldo Atual Calculado:</span>
                <strong className="text-blue-400 font-mono text-sm">= {audit.calculatedBalance} {product.unit}</strong>
              </div>
            </div>

            {/* Sector distribution pills */}
            {Object.keys(sectorBreakdown).length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-medium block mb-1.5">Consumo por Setor de Destino:</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sectorBreakdown).map(([sec, qty]) => (
                    <span key={sec} className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/80">
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
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Histórico Cronológico de Movimentações ({prodMovements.length})
              </h4>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenEntry(product);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs font-bold border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    + Entrada
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenExit(product);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 text-xs font-bold border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    - Saída
                  </button>
                </div>
              )}
            </div>

            {prodMovements.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Nenhuma movimentação registrada para este produto.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {prodMovements.map((mov) => {
                  const isEntry = mov.type === 'entrada';
                  const isAjuste = mov.type === 'ajuste';
                  return (
                    <div key={mov.id} className="relative group">
                      {/* Node circle */}
                      <div
                        className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                          isAjuste
                            ? 'bg-purple-950 border-purple-500 text-purple-400'
                            : isEntry
                            ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                            : 'bg-amber-950 border-amber-500 text-amber-400'
                        }`}
                      >
                        {isAjuste ? '⚖️' : isEntry ? '+' : '-'}
                      </div>

                      <div className={`border rounded-xl p-3 text-xs space-y-1.5 transition-colors ${
                        isAjuste 
                          ? 'bg-purple-950/20 border-purple-800/60 hover:bg-purple-950/40' 
                          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70'
                      }`}>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                isAjuste
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : isEntry
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isAjuste ? 'Ajuste de Inventário' : isEntry ? `Entrada (${mov.entryType || 'Compra'})` : `Saída: ${mov.sector}`}
                            </span>
                            <span className="text-slate-400">
                              {mov.date} às {mov.time || '00:00'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`font-black text-sm ${
                              isAjuste ? 'text-purple-400' : isEntry ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {isAjuste 
                                ? `${(mov.difference || 0) > 0 ? '+' : ''}${mov.difference !== undefined ? mov.difference : mov.quantity} ${mov.unit}`
                                : `${isEntry ? '+' : '-'}${mov.quantity} ${mov.unit}`}
                            </span>

                            {isAdmin && onDeleteMovement && !isMarcoZeroRecord(mov.id) && (
                              <button
                                onClick={() => setMovementToDelete(mov)}
                                title="Excluir movimentação e recalcular saldo"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="text-slate-300 text-xs space-y-1 pt-1 border-t border-slate-800">
                          {isAjuste ? (
                            <p className="flex items-center gap-1.5 text-slate-400 flex-wrap">
                              <Scale className="w-3.5 h-3.5 text-purple-400" />
                              <span>Motivo: <strong className="text-slate-200">{mov.reason || 'Conferência física'}</strong></span>
                              <span className="text-slate-600">|</span>
                              <span>Resp.: <strong className="text-slate-200">{mov.responsible || 'Admin'}</strong></span>
                              {mov.previousStock !== undefined && mov.physicalStock !== undefined && (
                                <span className="text-slate-500">
                                  ({mov.previousStock} → {mov.physicalStock} {mov.unit})
                                </span>
                              )}
                            </p>
                          ) : isEntry ? (
                            <p className="flex items-center gap-1.5 text-slate-400">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <span>Fornecedor/Doador: <strong>{mov.supplierOrDonor || 'Não informado'}</strong></span>
                              <span className="text-slate-600">|</span>
                              <span>Recebido por: <strong>{mov.receivedBy || 'Não informado'}</strong></span>
                            </p>
                          ) : (
                            <p className="flex items-center gap-1.5 text-slate-400 flex-wrap">
                              <Building2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>Retirado por: <strong className="text-slate-200">{mov.retrievedBy || 'Não informado'}</strong></span>
                              <span className="text-slate-600">|</span>
                              <span>Entregue por: <strong className="text-slate-200">{mov.deliveredBy || 'Não informado'}</strong></span>
                            </p>
                          )}

                          {mov.notes && (
                            <p className="text-slate-400 italic text-[11px]">
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
      </div>

      {/* Confirmation Modal for Movement Deletion */}
      {movementToDelete && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white animate-fade-in">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Excluir Lançamento?</h3>
                <p className="text-xs text-slate-400">O saldo do produto será recalculado automaticamente.</p>
              </div>
            </div>

            <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Produto:</span>
                <strong className="text-slate-200">{movementToDelete.productName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tipo:</span>
                <span className={`font-bold uppercase ${movementToDelete.type === 'entrada' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {movementToDelete.type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quantidade:</span>
                <strong className="text-slate-200">{movementToDelete.quantity} {movementToDelete.unit}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data:</span>
                <span className="text-slate-200">{movementToDelete.date} às {movementToDelete.time || '00:00'}</span>
              </div>
            </div>

            <div className="text-xs text-amber-300 bg-amber-950/40 p-3 rounded-xl border border-amber-800/60">
              ℹ️ Se for uma <strong>Entrada</strong>, a quantidade será subtraída do estoque. Se for uma <strong>Saída</strong>, a quantidade será devolvida ao saldo.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovementToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeleteMovement || !movementToDelete) return;
                  try {
                    setIsDeleting(true);
                    await onDeleteMovement(movementToDelete.id);
                    setMovementToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer flex items-center gap-2 text-xs disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
