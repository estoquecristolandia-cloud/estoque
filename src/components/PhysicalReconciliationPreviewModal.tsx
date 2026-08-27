import React, { useState, useMemo } from 'react';
import { Product, InventoryAudit, InventorySessionSummary } from '../types';
import { UserRole, MASTER_ADMIN_EMAIL } from '../firebase';
import {
  executeInventoryAdjustmentTransaction,
  saveInventorySessionToFirestore,
} from '../services/firestoreService';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  X,
  Info,
  Layers,
  Lock,
  RefreshCw,
  Sparkles,
  ClipboardList,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface PhysicalReconciliationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  userRole?: UserRole;
  currentUserEmail?: string;
  currentUserUid?: string;
  currentUserName?: string;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

// Reference physical count values for the 14 items
export const OFFICIAL_MARCO_ZERO_COUNTS: Record<string, number> = {
  'prod-acucar': 35,          // Açúcar Cristal: 35 kg
  'prod-alho': 16.5,          // Alho (Pacote c/ 10 cabeças): 16,5 pacotes
  'prod-arroz': 107,          // Arroz Branco: 107 kg
  'prod-cafe': 12,            // Café Torrado e Moído (250g): 12 pacotes
  'prod-farinha': 26,         // Farinha de Trigo / Mandioca: 26 kg
  'prod-feijao': 44,          // Feijão Carioca: 44 kg
  'prod-flocao': 52,          // Flocão de Milho (Cuscuz 400g): 52 pacotes
  'prod-leite': 18,           // Leite Integral: 18 litros
  'prod-macarrao': 56,        // Macarrão Espaguete: 56 pacotes
  'prod-manteiga': 24,        // Manteiga / Margarina (Balde 14,5kg): 24 kg
  'prod-milho-pipoca': 10,    // Milho para Pipoca (500g): 10 pacotes
  'prod-oleo': 11,            // Óleo de Soja (900ml): 11 litros
  'prod-sal': 3,              // Sal Refinado: 3 kg
  'prod-suco': 13,            // Suco em Pó (250g): 13 pacotes
};

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export const PhysicalReconciliationPreviewModal: React.FC<PhysicalReconciliationPreviewModalProps> = ({
  isOpen,
  onClose,
  products,
  userRole = 'admin',
  currentUserEmail = '',
  currentUserUid = '',
  currentUserName = 'Marconi Castro (Gestor do Estoque)',
  onNotify,
}) => {
  const isAdmin = userRole === 'admin' || (currentUserEmail || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  // Custom physical counts (initialized with official reference values)
  const [customCounts, setCustomCounts] = useState<Record<string, number>>(() => ({
    ...OFFICIAL_MARCO_ZERO_COUNTS,
  }));

  // Reason for the adjustment
  const [adjustmentReason, setAdjustmentReason] = useState<string>(
    'Conciliação física e estabelecimento de Marco Zero — contagem e recontagem física realizada em 21/08/2026.'
  );

  // Filter and view state
  const [statusFilter, setStatusFilter] = useState<'all' | 'conciliated' | 'shortage' | 'surplus'>('all');
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [isExecutingAdjustments, setIsExecutingAdjustments] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<string | null>(null);
  const [executionErrors, setExecutionErrors] = useState<string[]>([]);

  // Detailed Analysis per product
  const reconciliationData = useMemo(() => {
    return products.map((p) => {
      const currentStock = round2(Number(p.currentStock || 0));
      const refCount = customCounts[p.id] !== undefined ? customCounts[p.id] : currentStock;
      const physicalStock = round2(Number(refCount));
      const difference = round2(physicalStock - currentStock);

      let situation: 'CONCILIADO' | 'FALTA' | 'SOBRA' = 'CONCILIADO';
      if (difference < 0) {
        situation = 'FALTA';
      } else if (difference > 0) {
        situation = 'SOBRA';
      }

      return {
        product: p,
        currentStock,
        physicalStock,
        difference,
        situation,
        unit: p.unit,
        targetMarcoZero: physicalStock,
      };
    });
  }, [products, customCounts]);

  // Summary Metrics
  const totalProducts = reconciliationData.length;
  const conciliatedItems = reconciliationData.filter((i) => i.situation === 'CONCILIADO');
  const shortageItems = reconciliationData.filter((i) => i.situation === 'FALTA');
  const surplusItems = reconciliationData.filter((i) => i.situation === 'SOBRA');
  const needsAdjustmentItems = reconciliationData.filter((i) => i.situation !== 'CONCILIADO');

  const filteredData = useMemo(() => {
    if (statusFilter === 'conciliated') return reconciliationData.filter((i) => i.situation === 'CONCILIADO');
    if (statusFilter === 'shortage') return reconciliationData.filter((i) => i.situation === 'FALTA');
    if (statusFilter === 'surplus') return reconciliationData.filter((i) => i.situation === 'SOBRA');
    return reconciliationData;
  }, [reconciliationData, statusFilter]);

  if (!isOpen) return null;

  const handleUpdateCount = (productId: string, value: number) => {
    setCustomCounts((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  const handleResetToOfficialDefaults = () => {
    setCustomCounts({ ...OFFICIAL_MARCO_ZERO_COUNTS });
    onNotify?.('Valores restaurados para a contagem oficial de 21/08/2026.', 'info');
  };

  // Safe Execution Handler (ONLY triggered if user explicitly confirms)
  const handleExecuteAllAdjustments = async () => {
    if (!isAdmin) {
      onNotify?.('Apenas administradores podem gravar o Marco Zero.', 'error');
      return;
    }

    if (!confirmedCheckbox) {
      onNotify?.('Marque a caixa de confirmação para autorizar a gravação.', 'warning');
      return;
    }

    setIsExecutingAdjustments(true);
    setExecutionErrors([]);
    setExecutionProgress('Iniciando conciliação transacional...');

    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const errors: string[] = [];
    let successCount = 0;

    for (let index = 0; index < needsAdjustmentItems.length; index++) {
      const item = needsAdjustmentItems[index];
      setExecutionProgress(`Gravando item ${index + 1} de ${needsAdjustmentItems.length}: ${item.product.name}...`);

      try {
        await executeInventoryAdjustmentTransaction(
          item.product.id,
          item.physicalStock,
          adjustmentReason,
          currentUserName || 'Marconi Castro (Gestor do Estoque)',
          today,
          nowTime,
          currentUserUid,
          currentUserEmail,
          item.currentStock // Enforces concurrency check!
        );
        successCount++;
      } catch (err: any) {
        console.error(`Erro ao ajustar ${item.product.name}:`, err);
        errors.push(`${item.product.name}: ${err.message || 'Erro transacional'}`);
      }
    }

    // Save session record if at least one item was adjusted or if full inventory was completed
    try {
      await saveInventorySessionToFirestore({
        date: today,
        time: nowTime,
        responsible: currentUserName || currentUserEmail || 'Marconi Castro',
        totalProducts,
        checkedCount: totalProducts,
        divergentCount: needsAdjustmentItems.length,
        adjustedCount: successCount,
        notes: `Marco Zero Oficial: ${adjustmentReason} (${successCount} itens ajustados com sucesso).`,
        userEmail: currentUserEmail,
      });
    } catch (err) {
      console.error('Erro ao registrar sessão de inventário:', err);
    }

    setIsExecutingAdjustments(false);
    setExecutionProgress(null);

    if (errors.length > 0) {
      setExecutionErrors(errors);
      onNotify?.(`Conciliação concluída com ${errors.length} alertas. Verifique os detalhes.`, 'warning');
    } else {
      onNotify?.(`Marco Zero estabelecido com sucesso para ${successCount} produtos!`, 'success');
      setShowConfirmStep(false);
      onClose();
    }
  };

  return (
    <div
      id="physical-reconciliation-preview-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200 dark:border-blue-800/60 shadow-xs">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Prévia da Conciliação Física
                </h2>
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  SIMULAÇÃO &bull; LEITURA PURA
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Conferência comparativa dos 14 produtos do estoque físico real vs. saldo no Firestore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar Janela"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Read-Only Simulation Watermark Banner */}
        <div className="bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/30 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-extrabold uppercase tracking-wide">Ambiente de Simulação Segura:</span>{' '}
              <span>Nenhum documento do Firestore e nenhum saldo foi modificado. Esta tabela reflete a projeção exata do Marco Zero antes de qualquer gravação.</span>
            </div>
          </div>
          <button
            onClick={handleResetToOfficialDefaults}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 font-bold text-xs border border-amber-500/40 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
            title="Restaurar valores de contagem física de 21/08/2026"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restaurar Valores Oficiais</span>
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Total Itens</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">{totalProducts}</span>
          </div>

          <button
            onClick={() => setStatusFilter('conciliated')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'conciliated'
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Conciliados</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{conciliatedItems.length}</span>
          </button>

          <button
            onClick={() => setStatusFilter('shortage')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'shortage'
                ? 'bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-300 ring-2 ring-rose-500/30'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Com Falta</span>
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">{shortageItems.length}</span>
          </button>

          <button
            onClick={() => setStatusFilter('surplus')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'surplus'
                ? 'bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-300 ring-2 ring-blue-500/30'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Com Sobra</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{surplusItems.length}</span>
          </button>

          <button
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/30'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Precisam Ajuste</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{needsAdjustmentItems.length}</span>
          </button>

          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 block">Status Geral</span>
            <span className="text-xs font-black text-indigo-700 dark:text-indigo-200 mt-1 block">
              {needsAdjustmentItems.length === 0 ? '100% Conciliado' : 'Ajustes Pendentes'}
            </span>
          </div>
        </div>

        {/* Content Table Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Produto</th>
                    <th className="p-3.5 text-center">Unidade</th>
                    <th className="p-3.5 text-right bg-slate-200/50 dark:bg-slate-800/50">Estoque Atual (Firestore)</th>
                    <th className="p-3.5 text-right bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300">Contagem Física Informada</th>
                    <th className="p-3.5 text-right font-black">Diferença (Física - Atual)</th>
                    <th className="p-3.5 text-center">Situação</th>
                    <th className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 text-right">Novo Marco Zero</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredData.map((row, idx) => {
                    const isConciliated = row.situation === 'CONCILIADO';
                    const isShortage = row.situation === 'FALTA';
                    const isSurplus = row.situation === 'SOBRA';

                    return (
                      <tr
                        key={row.product.id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          !isConciliated ? 'bg-amber-500/[0.02]' : ''
                        }`}
                      >
                        <td className="p-3.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex flex-col">
                            <span className="text-sm font-black">{row.product.name}</span>
                            <span className="text-[10px] text-slate-400">{row.product.category} • {row.product.location}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-500 uppercase">
                          {row.unit}
                        </td>
                        <td className="p-3.5 text-right font-bold text-slate-700 dark:text-slate-300 bg-slate-200/30 dark:bg-slate-800/30 font-mono text-sm">
                          {row.currentStock} {row.unit}
                        </td>
                        <td className="p-3.5 text-right font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/20 font-mono text-sm">
                          {row.physicalStock} {row.unit}
                        </td>
                        <td className="p-3.5 text-right font-mono text-sm font-black">
                          {isConciliated ? (
                            <span className="text-emerald-600 dark:text-emerald-400">0.00</span>
                          ) : isShortage ? (
                            <span className="text-rose-600 dark:text-rose-400 font-black">
                              {row.difference} {row.unit}
                            </span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-black">
                              +{row.difference} {row.unit}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {isConciliated && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              CONCILIADO
                            </span>
                          )}
                          {isShortage && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                              <ArrowDownRight className="w-3 h-3" />
                              FALTA ({Math.abs(row.difference)} {row.unit})
                            </span>
                          )}
                          {isSurplus && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                              <ArrowUpRight className="w-3 h-3" />
                              SOBRA (+{row.difference} {row.unit})
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/10 font-mono text-base">
                          {row.targetMarcoZero} {row.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Justification & Operational Notes */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-500" />
              <span>Motivo Oficial dos Ajustes de Inventário / Marco Zero</span>
            </label>
            <input
              type="text"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="Descreva o motivo oficial do inventário"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500">
              Este motivo será gravado em cada movimentação de auditoria (`movements`) e no log de inventário (`inventory_audits`).
            </p>
          </div>

          {/* Confirmation Step Container */}
          {showConfirmStep && (
            <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Confirmação de Gravação Transacional do Marco Zero
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Você está prestes a aplicar os ajustes em <strong>{needsAdjustmentItems.length} produtos</strong> no Firestore. Cada produto receberá um registro auditado em <code>movements</code> e <code>inventory_audits</code>, e o <code>currentStock</code> será atualizado transacionalmente para o Marco Zero.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-500/30 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="confirm-marco-zero-checkbox"
                  checked={confirmedCheckbox}
                  onChange={(e) => setConfirmedCheckbox(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="confirm-marco-zero-checkbox" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Confirmo que verifiquei os 14 valores de contagem física e autorizo a gravação dos ajustes no Firestore com proteção de concorrência.
                </label>
              </div>

              {executionProgress && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{executionProgress}</span>
                </div>
              )}

              {executionErrors.length > 0 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <span className="font-bold block">Erros encontrados durante a execução:</span>
                  {executionErrors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmStep(false)}
                  disabled={isExecutingAdjustments}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Voltar para Prévia
                </button>

                <button
                  onClick={handleExecuteAllAdjustments}
                  disabled={!confirmedCheckbox || isExecutingAdjustments}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                    confirmedCheckbox && !isExecutingAdjustments
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:scale-[1.02]'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {isExecutingAdjustments ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gravando Transações...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Gravar Marco Zero no Firestore</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>
              Modo Atual: <strong className="text-slate-800 dark:text-slate-200">1. PRÉVIA — NÃO GRAVADO</strong> (Somente Leitura)
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Fechar Prévia
            </button>

            {isAdmin && !showConfirmStep && (
              <button
                onClick={() => setShowConfirmStep(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>2. Ir para Confirmação de Ajustes</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
