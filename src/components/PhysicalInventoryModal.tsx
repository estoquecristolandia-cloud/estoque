import React, { useState, useMemo } from 'react';
import { Product, InventoryAudit, InventorySessionSummary } from '../types';
import { UserRole, MASTER_ADMIN_EMAIL } from '../firebase';
import {
  executeInventoryAdjustmentTransaction,
  saveInventorySessionToFirestore,
} from '../services/firestoreService';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  X,
  History,
  Info,
  Scale,
  RefreshCw,
  Award,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { ModalWrapper } from './ui/ModalWrapper';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { SearchInput } from './ui/SearchInput';

interface PhysicalInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: productsList;
  userRole?: UserRole;
  currentUserEmail?: string;
  currentUserUid?: string;
  currentUserName?: string;
  inventoryAudits: InventoryAudit[];
  inventorySessions?: InventorySessionSummary[];
  onNotify?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

type productsList = Product[];

const PRESET_REASONS = [
  'Contagem física',
  'Estoque inicial não registrado',
  'Perda',
  'Quebra',
  'Doação não registrada',
  'Erro de lançamento anterior',
  'Outro',
];

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export const PhysicalInventoryModal: React.FC<PhysicalInventoryModalProps> = ({
  isOpen,
  onClose,
  products,
  userRole = 'admin',
  currentUserEmail = '',
  currentUserUid = '',
  currentUserName = 'Administrador',
  inventoryAudits = [],
  inventorySessions = [],
  onNotify,
}) => {
  const isAdmin = userRole === 'admin' || (currentUserEmail || '').toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

  // Tab State: 'count' (Conferência) or 'history' (Auditorias & Marcos)
  const [activeTab, setActiveTab] = useState<'count' | 'history'>('count');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'checked' | 'divergent'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Physical counts state (keyed by product.id)
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});

  // Individual Adjustment Confirmation Modal
  const [selectedProductForAdj, setSelectedProductForAdj] = useState<Product | null>(null);
  const [adjReasonPreset, setAdjReasonPreset] = useState<string>('Contagem física');
  const [adjReasonNotes, setAdjReasonNotes] = useState<string>('');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);
  const [adjErrorMessage, setAdjErrorMessage] = useState<string | null>(null);

  // Marco Zero Confirmation Modal
  const [showMarcoZeroModal, setShowMarcoZeroModal] = useState(false);
  const [marcoZeroNotes, setMarcoZeroNotes] = useState('');
  const [isSavingMarcoZero, setIsSavingMarcoZero] = useState(false);

  // Derive categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Calculations per product
  const productsAnalysis = useMemo(() => {
    return products.map((p) => {
      const rawCount = physicalCounts[p.id];
      const hasCount = rawCount !== undefined && rawCount.trim() !== '';
      const physicalNum = hasCount ? parseFloat(rawCount) : null;
      const validNum = physicalNum !== null && !isNaN(physicalNum) && physicalNum >= 0 ? round2(physicalNum) : null;
      const currentStock = round2(p.currentStock || 0);

      let status: 'pending' | 'checked' | 'divergent' = 'pending';
      let difference = 0;

      if (validNum !== null) {
        difference = round2(validNum - currentStock);
        if (difference === 0) {
          status = 'checked';
        } else {
          status = 'divergent';
        }
      }

      return {
        product: p,
        rawCount: rawCount || '',
        validNum,
        currentStock,
        difference,
        status,
      };
    });
  }, [products, physicalCounts]);

  // Summary stats
  const totalProducts = products.length;
  const checkedCount = productsAnalysis.filter((item) => item.status === 'checked').length;
  const divergentCount = productsAnalysis.filter((item) => item.status === 'divergent').length;
  const pendingCount = productsAnalysis.filter((item) => item.status === 'pending').length;

  // Filtered products
  const filteredAnalysis = useMemo(() => {
    return productsAnalysis.filter((item) => {
      const matchesSearch =
        item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product.location?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        item.status === statusFilter;

      const matchesCategory =
        categoryFilter === 'all' || item.product.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [productsAnalysis, searchTerm, statusFilter, categoryFilter]);

  if (!isOpen) return null;

  const handlePhysicalCountChange = (productId: string, value: string) => {
    if (!isAdmin) return;
    setPhysicalCounts((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  const handlePreFillSystemStock = (productId: string, currentStock: number) => {
    if (!isAdmin) return;
    setPhysicalCounts((prev) => ({
      ...prev,
      [productId]: String(currentStock),
    }));
  };

  const handleClearAllCounts = () => {
    if (window.confirm('Deseja limpar todos os valores de contagem física preenchidos nesta sessão? (Nenhum dado do sistema será alterado)')) {
      setPhysicalCounts({});
    }
  };

  // Open adjustment modal
  const handleOpenAdjustment = (product: Product) => {
    if (!isAdmin) return;
    setSelectedProductForAdj(product);
    setAdjReasonPreset('Contagem física');
    setAdjReasonNotes('');
    setAdjErrorMessage(null);
  };

  // Execute adjustment transaction
  const handleConfirmAdjustment = async () => {
    if (!selectedProductForAdj || !isAdmin) return;

    const rawCount = physicalCounts[selectedProductForAdj.id];
    const physicalNum = parseFloat(rawCount);
    if (isNaN(physicalNum) || physicalNum < 0) {
      setAdjErrorMessage('Informe um valor de estoque físico válido e não negativo.');
      return;
    }

    const finalReason = adjReasonPreset === 'Outro' 
      ? (adjReasonNotes.trim() || 'Ajuste de inventário físico')
      : adjReasonNotes.trim()
      ? `${adjReasonPreset} - ${adjReasonNotes.trim()}`
      : adjReasonPreset;

    setIsSubmittingAdj(true);
    setAdjErrorMessage(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      await executeInventoryAdjustmentTransaction(
        selectedProductForAdj.id,
        physicalNum,
        finalReason,
        currentUserName || 'Administrador',
        today,
        nowTime,
        currentUserUid,
        currentUserEmail,
        selectedProductForAdj.currentStock
      );

      onNotify?.(`Ajuste de ${selectedProductForAdj.name} registrado com sucesso para ${physicalNum} ${selectedProductForAdj.unit}.`, 'success');
      
      // Update local count to match the newly established stock
      setPhysicalCounts((prev) => ({
        ...prev,
        [selectedProductForAdj.id]: String(physicalNum),
      }));

      setSelectedProductForAdj(null);
    } catch (err: any) {
      console.error('Erro ao registrar ajuste:', err);
      setAdjErrorMessage(err.message || 'Ocorreu um erro ao gravar o ajuste no Firestore.');
      onNotify?.(err.message || 'Falha ao registrar o ajuste.', 'error');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  // Save Marco Zero / Inventory Session
  const handleConfirmMarcoZero = async () => {
    if (!isAdmin) return;
    setIsSavingMarcoZero(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      await saveInventorySessionToFirestore({
        date: today,
        time: nowTime,
        responsible: currentUserName || currentUserEmail || 'Administrador',
        totalProducts,
        checkedCount,
        divergentCount,
        adjustedCount: inventoryAudits.filter((a) => a.date === today).length,
        notes: marcoZeroNotes.trim() || 'Marco Zero / Inventário Físico concluído com sucesso.',
        userEmail: currentUserEmail,
      });

      onNotify?.('Marco Zero do Estoque registrado com sucesso na auditoria!', 'success');
      setShowMarcoZeroModal(false);
      setMarcoZeroNotes('');
      setActiveTab('history');
    } catch (err: any) {
      console.error('Erro ao registrar Marco Zero:', err);
      onNotify?.(err.message || 'Falha ao registrar o Marco Zero.', 'error');
    } finally {
      setIsSavingMarcoZero(false);
    }
  };

  return (
    <ModalWrapper
      id="physical-inventory-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Inventário Físico & Ajuste Auditado"
      subtitle="Conferência física, apuração de divergências e registro de ajustes auditados"
      icon={<Scale className="w-6 h-6 text-emerald-600" />}
      maxWidth="max-w-6xl"
    >
      <div className="space-y-6">
        {/* Read-only / Admin Safety Banner */}
        {!isAdmin ? (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Modo Somente Leitura:</strong> Apenas o administrador oficial (<code>{MASTER_ADMIN_EMAIL}</code>) possui autorização para lançar ajustes físicos e registrar o Marco Zero.
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
            <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span>
              <strong>Aviso de Integridade:</strong> A digitação da contagem NÃO altera o estoque automaticamente. O saldo só é atualizado quando você clica em <strong>Registrar Ajuste</strong> e confirma o motivo.
            </span>
          </div>
        )}

        {/* Navigation Tabs & Key Counters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('count')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'count'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              <span>Conferência de Estoque</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold">
                {totalProducts}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-4 h-4 text-blue-600" />
              <span>Histórico de Auditorias</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold">
                {inventoryAudits.length}
              </span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs">
              <span className="text-slate-400 font-medium">Total:</span>
              <span className="text-slate-900 dark:text-white">{totalProducts} produtos</span>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{checkedCount} Conferidos</span>
            </div>

            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              divergentCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500'
            }`}>
              <AlertTriangle className={`w-3.5 h-3.5 ${divergentCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
              <span>{divergentCount} Divergentes</span>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{pendingCount} Pendentes</span>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'count' ? (
          <div className="space-y-4">
            {/* Filters & Action Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                <div className="flex-1 max-w-sm">
                  <SearchInput
                    id="inventory-search"
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Buscar produto por nome ou categoria..."
                  />
                </div>

                {/* Filter by Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">Todos os Status ({totalProducts})</option>
                  <option value="pending">Pendentes ({pendingCount})</option>
                  <option value="divergent">Divergentes ({divergentCount})</option>
                  <option value="checked">Conferidos ({checkedCount})</option>
                </select>

                {/* Filter by Category */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none hidden sm:block"
                >
                  <option value="all">Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marco Zero Action Button (Admin Only) */}
              {isAdmin && (
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  {Object.keys(physicalCounts).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllCounts}
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Limpar Contagens
                    </Button>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowMarcoZeroModal(true)}
                    icon={<Award className="w-4 h-4" />}
                  >
                    Registrar Marco Zero
                  </Button>
                </div>
              )}
            </div>

            {/* Table of Products */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                      <th className="py-3 px-4">Produto & Categoria</th>
                      <th className="py-3 px-4 text-center">Unidade</th>
                      <th className="py-3 px-4 text-right">Estoque Sistema</th>
                      <th className="py-3 px-4 text-center">Estoque Físico Contado</th>
                      <th className="py-3 px-4 text-right">Diferença</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Ação Auditada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredAnalysis.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                          Nenhum produto encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredAnalysis.map(({ product, rawCount, validNum, currentStock, difference, status }) => {
                        const isDivergent = status === 'divergent';
                        const isChecked = status === 'checked';
                        const isPending = status === 'pending';

                        return (
                          <tr
                            key={product.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                              isDivergent
                                ? 'bg-amber-50/40 dark:bg-amber-950/20'
                                : isChecked
                                ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                                : ''
                            }`}
                          >
                            {/* Product & Category */}
                            <td className="py-3.5 px-4">
                              <div className="font-black text-sm text-slate-900 dark:text-white">
                                {product.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold">
                                  {product.category}
                                </span>
                                {product.location && (
                                  <span>• {product.location}</span>
                                )}
                              </div>
                            </td>

                            {/* Unit */}
                            <td className="py-3.5 px-4 text-center">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-700 dark:text-slate-300">
                                {product.unit}
                              </span>
                            </td>

                            {/* Current System Stock */}
                            <td className="py-3.5 px-4 text-right font-black text-sm text-slate-900 dark:text-white">
                              {currentStock} <span className="text-xs font-normal text-slate-400">{product.unit}</span>
                            </td>

                            {/* Physical Count Input */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  disabled={!isAdmin}
                                  placeholder={String(currentStock)}
                                  value={rawCount}
                                  onChange={(e) => handlePhysicalCountChange(product.id, e.target.value)}
                                  className={`w-28 text-center font-black py-1.5 px-2 rounded-xl text-sm border focus:outline-none transition-all ${
                                    !isAdmin
                                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                                      : isDivergent
                                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-200 focus:ring-2 focus:ring-amber-500'
                                      : isChecked
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500'
                                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500'
                                  }`}
                                />
                                {isAdmin && isPending && (
                                  <button
                                    onClick={() => handlePreFillSystemStock(product.id, currentStock)}
                                    title="Preencher com o mesmo valor do sistema"
                                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer px-1 py-0.5"
                                  >
                                    = Sist.
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Difference */}
                            <td className="py-3.5 px-4 text-right">
                              {isPending ? (
                                <span className="text-slate-400 italic text-[11px]">—</span>
                              ) : (
                                <span
                                  className={`font-black text-sm ${
                                    difference > 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : difference < 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {difference > 0 ? `+${difference}` : difference} {product.unit}
                                </span>
                              )}
                            </td>

                            {/* Status Chip */}
                            <td className="py-3.5 px-4 text-center">
                              {isPending && (
                                <Badge variant="neutral">PENDENTE</Badge>
                              )}
                              {isChecked && (
                                <Badge variant="success">CONFERIDO</Badge>
                              )}
                              {isDivergent && (
                                <Badge variant="warning">DIVERGENTE</Badge>
                              )}
                            </td>

                            {/* Action: Registrar Ajuste */}
                            <td className="py-3.5 px-4 text-center">
                              {isDivergent && isAdmin ? (
                                <Button
                                  variant="warning"
                                  size="sm"
                                  onClick={() => handleOpenAdjustment(product)}
                                  icon={<Scale className="w-3.5 h-3.5" />}
                                >
                                  Ajustar
                                </Button>
                              ) : isChecked ? (
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                  Alinhado
                                </span>
                              ) : !isAdmin ? (
                                <span className="text-[10px] text-slate-400 italic">
                                  Leitura
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Aguardando
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Tab: Histórico de Auditorias & Marco Zero */
          <div className="space-y-6">
            {/* Marco Zero Sessions Card */}
            {inventorySessions.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-5 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-sm mb-3">
                  <Award className="w-5 h-5 text-emerald-600" />
                  <span>Marcos Zero & Conclusões de Balanço Registrados</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {inventorySessions.map((s) => (
                    <div
                      key={s.id}
                      className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-xl shadow-xs text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-black text-slate-900 dark:text-white">
                        <span>Data: {s.date} às {s.time}</span>
                        <Badge variant="success">MARCO ZERO</Badge>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span>Responsável: <strong>{s.responsible}</strong></span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span>Total: <strong>{s.totalProducts}</strong></span>
                        <span>• Conferidos: <strong>{s.checkedCount}</strong></span>
                        <span>• Divergências: <strong>{s.divergentCount}</strong></span>
                      </div>
                      {s.notes && (
                        <p className="text-slate-500 dark:text-slate-400 italic text-[11px] mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          "{s.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Audited Adjustments Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Registro Individual de Ajustes Auditados ({inventoryAudits.length})</span>
                </h3>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-4">Data & Hora</th>
                        <th className="py-3 px-4">Produto</th>
                        <th className="py-3 px-4 text-right">Estoque Anterior</th>
                        <th className="py-3 px-4 text-right">Estoque Físico</th>
                        <th className="py-3 px-4 text-right">Diferença</th>
                        <th className="py-3 px-4">Motivo do Ajuste</th>
                        <th className="py-3 px-4">Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {inventoryAudits.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                            Nenhum ajuste auditado registrado até o momento.
                          </td>
                        </tr>
                      ) : (
                        inventoryAudits.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="font-bold text-slate-900 dark:text-white">{a.date}</span>
                              <span className="text-[11px] text-slate-400 ml-1.5">{a.time}</span>
                            </td>
                            <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                              {a.productName}
                            </td>
                            <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                              {a.previousStock} {a.unit}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                              {a.physicalStock} {a.unit}
                            </td>
                            <td className="py-3 px-4 text-right font-black">
                              <span className={a.difference > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                {a.difference > 0 ? `+${a.difference}` : a.difference} {a.unit}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-semibold text-[11px]">
                                {a.reason}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {a.responsible}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Módulo de Inventário Auditado • Cristolândia</span>
          </div>

          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      {/* INDIVIDUAL ADJUSTMENT CONFIRMATION MODAL */}
      {selectedProductForAdj && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-6 h-6 text-amber-200" />
                <div>
                  <h3 className="font-black text-base text-white">Confirmar Ajuste de Inventário</h3>
                  <p className="text-xs text-amber-100">Atualização atômica auditada de saldo físico</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProductForAdj(null)}
                disabled={isSubmittingAdj}
                className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-amber-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              {/* Product Difference Card */}
              {(() => {
                const rawCount = physicalCounts[selectedProductForAdj.id];
                const physicalNum = parseFloat(rawCount) || 0;
                const currentStock = selectedProductForAdj.currentStock || 0;
                const diff = round2(physicalNum - currentStock);

                return (
                  <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Produto:</span>
                      <strong className="text-sm text-slate-900 dark:text-white">{selectedProductForAdj.name}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Estoque Anterior no Sistema:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{currentStock} {selectedProductForAdj.unit}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Novo Estoque Físico Apurado:</span>
                      <span className="font-black text-sm text-slate-900 dark:text-white bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded">
                        {physicalNum} {selectedProductForAdj.unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 font-semibold">Diferença a Registrar:</span>
                      <strong className={`text-sm ${diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {diff > 0 ? `+${diff}` : diff} {selectedProductForAdj.unit}
                      </strong>
                    </div>
                  </div>
                );
              })()}

              {/* Motivo do Ajuste (Obrigatório) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Motivo do Ajuste <span className="text-red-500">*</span>
                </label>
                <select
                  value={adjReasonPreset}
                  onChange={(e) => setAdjReasonPreset(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {PRESET_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Observações Complementares */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Detalhamento / Observações (Opcional):
                </label>
                <textarea
                  rows={2}
                  value={adjReasonNotes}
                  onChange={(e) => setAdjReasonNotes(e.target.value)}
                  placeholder="Ex: Conferência física geral do dia, acerto de sobra após evento..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Safety Warning */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 rounded-xl flex items-start gap-2 text-amber-800 dark:text-amber-300 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Esta operação atualizará o saldo atual do produto e ficará registrada permanentemente na auditoria (<code>inventory_audits</code> e <code>movements</code> tipo <code>ajuste</code>).
                </span>
              </div>

              {/* Error Message */}
              {adjErrorMessage && (
                <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 p-3 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{adjErrorMessage}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedProductForAdj(null)}
                disabled={isSubmittingAdj}
              >
                Cancelar
              </Button>

              <Button
                variant="warning"
                size="sm"
                onClick={handleConfirmAdjustment}
                disabled={isSubmittingAdj}
                icon={isSubmittingAdj ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              >
                {isSubmittingAdj ? 'Gravando no Firestore...' : 'Confirmar e Registrar Ajuste'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MARCO ZERO CONFIRMATION MODAL */}
      {showMarcoZeroModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-6 h-6 text-emerald-200" />
                <div>
                  <h3 className="font-black text-base text-white">Registrar Marco Zero do Estoque</h3>
                  <p className="text-xs text-emerald-100">Consolidação e fechamento de inventário físico</p>
                </div>
              </div>
              <button
                onClick={() => setShowMarcoZeroModal(false)}
                disabled={isSavingMarcoZero}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Total de Produtos:</span>
                  <strong className="text-slate-900 dark:text-white">{totalProducts} produtos</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Produtos Conferidos:</span>
                  <span className="font-bold text-emerald-600">{checkedCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Produtos com Divergência:</span>
                  <span className="font-bold text-amber-600">{divergentCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Responsável:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{currentUserName} ({currentUserEmail})</span>
                </div>
              </div>

              {divergentCount > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-xl flex items-start gap-2 text-amber-800 dark:text-amber-300 text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Ainda existem <strong>{divergentCount} produto(s)</strong> com divergência física informada que não foram ajustados individualmente.
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Observações da Sessão de Inventário:
                </label>
                <textarea
                  rows={3}
                  value={marcoZeroNotes}
                  onChange={(e) => setMarcoZeroNotes(e.target.value)}
                  placeholder="Ex: Marco Zero realizado com sucesso. Todos os itens contados fisicamente."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowMarcoZeroModal(false)}
                disabled={isSavingMarcoZero}
              >
                Cancelar
              </Button>

              <Button
                variant="success"
                size="sm"
                onClick={handleConfirmMarcoZero}
                disabled={isSavingMarcoZero}
                icon={isSavingMarcoZero ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-4 h-4" />}
              >
                {isSavingMarcoZero ? 'Registrando Sessão...' : 'Concluir e Registrar Marco Zero'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
};
