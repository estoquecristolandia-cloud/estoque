import React, { useState } from 'react';
import { Product } from '../types';
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
  Sparkles,
  Clock,
  AlertCircle,
  Scale,
} from 'lucide-react';
import { getProductStockStatus, calculateDaysRemaining } from '../utils/storage';

interface CurrentStockOverviewProps {
  products: Product[];
  userRole?: UserRole;
  onOpenEntry: (product: Product) => void;
  onOpenExit: (product: Product) => void;
  onOpenTimeline: (productId: string) => void;
  onOpenPhysicalInventory?: () => void;
  onOpenReconciliationPreview?: () => void;
  onForceSyncPhysicalStock?: () => void;
}

export const CurrentStockOverview: React.FC<CurrentStockOverviewProps> = ({
  products,
  userRole = 'admin',
  onOpenEntry,
  onOpenExit,
  onOpenTimeline,
  onOpenPhysicalInventory,
  onOpenReconciliationPreview,
  onForceSyncPhysicalStock,
}) => {
  const isAdmin = userRole === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');

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
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40">
              <Boxes className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Visão Geral de Estoque & Saldos Físicos
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {totalProducts} Itens
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Controle analítico de saldos disponíveis, estoque de segurança, autonomia calculada e atalhos operacionais.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            Todos: {totalProducts}
          </button>

          <button
            onClick={() => setStatusFilter('normal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              statusFilter === 'normal'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Normal: {normalProducts.length}
          </button>

          {warningProducts.length > 0 && (
            <button
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                statusFilter === 'warning'
                  ? 'bg-orange-600 text-white border-orange-500 shadow-2xs'
                  : 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/80 hover:bg-orange-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Alerta: {warningProducts.length}
            </button>
          )}

          {criticalProducts.length > 0 && (
            <button
              onClick={() => setStatusFilter('critical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                statusFilter === 'critical'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-2xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/80 hover:bg-rose-100'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Crítico: {criticalProducts.length}
            </button>
          )}

          {onOpenReconciliationPreview && (
            <button
              onClick={onOpenReconciliationPreview}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 dark:bg-amber-950/40 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ml-auto"
              title="Abrir Prévia da Conciliação Física dos 14 produtos (Marco Zero)"
            >
              <Scale className="w-3.5 h-3.5 text-amber-500" />
              <span>Prévia Marco Zero</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por produto, categoria ou prateleira..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer w-full sm:w-auto font-medium"
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
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ml-auto"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Inventário / Marco Zero</span>
            </button>
          )}

          {onForceSyncPhysicalStock && (
            <button
              onClick={onForceSyncPhysicalStock}
              title="Ajusta e sincroniza imediatamente o sistema com o inventário físico real da despensa (19/08)"
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Sincronizar (19/08)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200/90 dark:border-slate-800">
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
                    isZero ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                  }`}
                >
                  {/* Product & Category */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onOpenTimeline(p.id)}
                      className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 text-xs text-left cursor-pointer transition-colors block"
                    >
                      {p.name}
                    </button>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">{p.category}</span>
                      <span className="text-[10px] text-slate-300 dark:text-slate-600">&bull;</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{p.usageFrequency}</span>
                    </div>
                  </td>

                  {/* Storage Location */}
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[160px] font-medium" title={p.location}>
                        {p.location}
                      </span>
                    </div>
                  </td>

                  {/* Current Stock Balance */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span
                        className={`text-sm font-extrabold tracking-tight tabular-nums ${
                          isZero
                            ? 'text-rose-600 dark:text-rose-400'
                            : p.currentStock <= p.minStock
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {p.currentStock} {p.unit}
                      </span>

                      {/* Micro Progress Bar */}
                      <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isZero || status === 'critical'
                              ? 'bg-rose-500'
                              : status === 'warning'
                              ? 'bg-orange-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(8, stockRatioPct)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Minimum Stock Level */}
                  <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                    {p.minStock} {p.unit}
                  </td>

                  {/* Estimated Autonomy */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        days <= 1.5
                          ? 'text-rose-600 dark:text-rose-400'
                          : days <= 3
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {days >= 900 ? 'Esporádico' : `${days} dias`}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4 text-center">
                    {isZero ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        <AlertCircle className="w-3 h-3" />
                        Zerado
                      </span>
                    ) : status === 'critical' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <ShieldAlert className="w-3 h-3" />
                        Crítico
                      </span>
                    ) : status === 'warning' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                        <AlertTriangle className="w-3 h-3" />
                        Alerta
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Normal
                      </span>
                    )}
                  </td>

                  {/* Quick Entry & Exit Actions (Admin Only) or Timeline Link */}
                  <td className="py-3 px-4 text-right">
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenExit(p)}
                          title={`Dar saída no item: ${p.name}`}
                          className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:hover:bg-orange-900 dark:text-orange-300 border border-orange-200 dark:border-orange-800 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                          <span className="hidden sm:inline">Saída</span>
                        </button>

                        <button
                          onClick={() => onOpenEntry(p)}
                          title={`Lançar entrada no item: ${p.name}`}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="hidden sm:inline">+ Entrada</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onOpenTimeline(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
    </div>
  );
};
