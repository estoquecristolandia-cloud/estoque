import React, { useState } from 'react';
import { Product, StockMovement, InventoryAudit } from '../types';
import { UserRole } from '../firebase';
import {
  Boxes,
  Search,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  MapPin,
  Filter,
  Plus,
  Minus,
  Sparkles,
  Clock,
  Layers,
  AlertCircle,
  Scale,
  Mail,
} from 'lucide-react';
import { getProductStockStatus, calculateDaysRemaining, getProductAutonomyLabel } from '../utils/storage';
import { StockNewsletterModal } from './StockNewsletterModal';

interface CurrentStockOverviewProps {
  products: Product[];
  movements?: StockMovement[];
  inventoryAudits?: InventoryAudit[];
  userRole?: UserRole;
  userEmail?: string;
  onOpenEntry: (product: Product) => void;
  onOpenExit: (product: Product) => void;
  onOpenTimeline: (productId: string) => void;
  onOpenPhysicalInventory?: () => void;
  onOpenReconciliationPreview?: () => void;
  onForceSyncPhysicalStock?: () => void;
}

export const CurrentStockOverview: React.FC<CurrentStockOverviewProps> = ({
  products,
  movements = [],
  inventoryAudits = [],
  userRole = 'admin',
  userEmail = '',
  onOpenEntry,
  onOpenExit,
  onOpenTimeline,
  onOpenPhysicalInventory,
  onOpenReconciliationPreview,
  onForceSyncPhysicalStock,
}) => {
  const canManageEmails = Boolean(
    userEmail &&
    (userEmail.trim().toLowerCase() === 'estoquecristolandia@gmail.com' ||
     userEmail.trim().toLowerCase() === 'admin@app.local')
  );
  const isAdmin = userRole === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);

  // Stats calculation
  const totalProducts = products.length;
  const criticalProducts = products.filter((p) => p.currentStock === 0 || getProductStockStatus(p) === 'critical');
  const warningProducts = products.filter((p) => p.currentStock > 0 && getProductStockStatus(p) === 'warning');
  const normalProducts = products.filter((p) => getProductStockStatus(p) === 'normal');

  // Unique categories
  const categories = Array.from(new Set(products.map((p) => p.category)));

  // Filtering
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

    const status = p.currentStock === 0 || getProductStockStatus(p) === 'critical' ? 'critical' : getProductStockStatus(p);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Boxes className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Controle de Estoque Atual & Saldos Físicos
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Ao Vivo
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visão detalhada dos saldos disponíveis em prateleira, localização, estoque mínimo e ações diretas de movimentação.
          </p>
        </div>

        {/* Status Summary Counter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all cursor-pointer border ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-blue-600 border-slate-900 dark:border-blue-500'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            Total: {totalProducts}
          </button>

          <button
            onClick={() => setStatusFilter('normal')}
            className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${
              statusFilter === 'normal'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Normal: {normalProducts.length}
          </button>

          {warningProducts.length > 0 && (
            <button
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${
                statusFilter === 'warning'
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Alerta: {warningProducts.length}
            </button>
          )}

          {criticalProducts.length > 0 && (
            <button
              onClick={() => setStatusFilter('critical')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 ${
                statusFilter === 'critical'
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 animate-pulse'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              Crítico/Zerado: {criticalProducts.length}
            </button>
          )}

          {onOpenReconciliationPreview && (
            <button
              onClick={onOpenReconciliationPreview}
              className="px-3 py-1.5 rounded-2xl text-xs font-black bg-amber-500/10 dark:bg-amber-950/40 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Abrir Prévia da Conciliação Física dos 14 produtos (Marco Zero)"
            >
              <Scale className="w-3.5 h-3.5 text-amber-500" />
              <span>Prévia Marco Zero</span>
            </button>
          )}

          {canManageEmails && (
            <button
              onClick={() => setIsNewsletterOpen(true)}
              className="px-3.5 py-1.5 rounded-2xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ml-auto"
              title="Gerar e-mail executivo / newsletter profissional com a tabela detalhada de saldos físicos"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>✉️ Gerar Newsletter / E-mail</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, categoria ou prateleira..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-auto font-medium"
          >
            <option value="all">Todas as Categorias ({products.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {onOpenPhysicalInventory && (
            <button
              onClick={onOpenPhysicalInventory}
              title="Abrir Conferência de Inventário Físico, Ajustes e Marco Zero"
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ml-auto"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>⚖️ Inventário Físico / Marco Zero</span>
            </button>
          )}

          {onForceSyncPhysicalStock && (
            <button
              onClick={onForceSyncPhysicalStock}
              title="Ajusta e sincroniza imediatamente o sistema com o inventário físico real da despensa (19/08)"
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Sincronizar Estoque Real (19/08)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <th className="py-3 px-4">Produto & Categoria</th>
              <th className="py-3 px-4">Localização</th>
              <th className="py-3 px-4 text-center">Saldo Atual</th>
              <th className="py-3 px-4 text-center">Mín. Segurança</th>
              <th className="py-3 px-4 text-center">Autonomia</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">{isAdmin ? 'Ações Rápidas' : 'Rastreabilidade'}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {filteredProducts.map((p) => {
              const days = calculateDaysRemaining(p);
              const isZero = p.currentStock === 0;
              const status = isZero ? 'critical' : getProductStockStatus(p);

              // Stock health percentage relative to 3x minimum safety level
              const targetMax = Math.max(p.minStock * 3, 10);
              const stockRatioPct = Math.min(100, Math.round((p.currentStock / targetMax) * 100));

              return (
                <tr
                  key={p.id}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    isZero ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                  }`}
                >
                  {/* Product & Category */}
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onOpenTimeline(p.id)}
                      className="font-extrabold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-xs text-left cursor-pointer transition-colors block"
                    >
                      {p.name}
                    </button>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">{p.category}</span>
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">&bull;</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">{p.usageFrequency}</span>
                    </div>
                  </td>

                  {/* Storage Location */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[180px] font-medium" title={p.location}>
                        {p.location}
                      </span>
                    </div>
                  </td>

                  {/* Current Stock Balance */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span
                        className={`text-sm font-black tracking-tight ${
                          isZero
                            ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                            : p.currentStock <= p.minStock
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {p.currentStock} {p.unit}
                      </span>

                      {/* Micro Progress Bar */}
                      <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isZero
                              ? 'bg-rose-500'
                              : status === 'critical'
                              ? 'bg-rose-500'
                              : status === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(8, stockRatioPct)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Minimum Stock Level */}
                  <td className="py-3.5 px-4 text-center text-slate-500 dark:text-slate-400 font-semibold">
                    {p.minStock} {p.unit}
                  </td>

                  {/* Estimated Autonomy */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`text-xs font-extrabold ${
                        days <= 1.5
                          ? 'text-rose-600 dark:text-rose-400'
                          : days <= 3
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {getProductAutonomyLabel(p)}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 text-center">
                    {isZero ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500 text-white animate-pulse shadow-sm">
                        <AlertCircle className="w-3 h-3" />
                        ZERADO
                      </span>
                    ) : status === 'critical' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        <ShieldAlert className="w-3 h-3" />
                        Crítico
                      </span>
                    ) : status === 'warning' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <AlertTriangle className="w-3 h-3" />
                        Alerta
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Normal
                      </span>
                    )}
                  </td>

                  {/* Quick Entry & Exit Actions (Admin Only) or Timeline Link */}
                  <td className="py-3.5 px-4 text-right">
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenExit(p)}
                          title={`Dar saída no item: ${p.name}`}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 dark:bg-slate-800 dark:hover:bg-amber-950 dark:text-slate-300 dark:hover:text-amber-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="hidden sm:inline">Saída</span>
                        </button>

                        <button
                          onClick={() => onOpenEntry(p)}
                          title={`Lançar entrada no item: ${p.name}`}
                          className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="hidden sm:inline">+ Entrada</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onOpenTimeline(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Histórico</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-medium">
                  Nenhum produto encontrado para o filtro selecionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Stock Newsletter Modal (Restrito a estoquecristolandia@gmail.com) */}
      {canManageEmails && (
        <StockNewsletterModal
          isOpen={isNewsletterOpen}
          onClose={() => setIsNewsletterOpen(false)}
          products={products}
          movements={movements}
          inventoryAudits={inventoryAudits}
        />
      )}
    </div>
  );
};
