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
import { StatusBadge } from './ui/StatusBadge';

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
    <div className="bg-surface border border-border-subtle rounded-3xl p-6 shadow-xs space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-status-info-bg text-status-info border border-status-info-border">
              <Boxes className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-black text-text-primary tracking-tight">
              Controle de Estoque Atual & Saldos Físicos
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-status-info-bg text-status-info border border-status-info-border">
              Ao Vivo
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Visão detalhada dos saldos disponíveis em prateleira, localização, estoque mínimo e ações diretas de movimentação.
          </p>
        </div>

        {/* Status Summary Counter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all cursor-pointer border tabular-nums ${
              statusFilter === 'all'
                ? 'bg-text-primary text-surface border-text-primary'
                : 'bg-surface-raised text-text-secondary border-border-subtle hover:bg-surface'
            }`}
          >
            Total: {totalProducts}
          </button>

          <button
            onClick={() => setStatusFilter('normal')}
            className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 tabular-nums ${
              statusFilter === 'normal'
                ? 'bg-status-success text-slate-950 border-status-success'
                : 'bg-status-success-bg text-status-success border-status-success-border hover:opacity-90'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
            Normal: {normalProducts.length}
          </button>

          {warningProducts.length > 0 && (
            <button
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 tabular-nums ${
                statusFilter === 'warning'
                  ? 'bg-status-warning text-slate-950 border-status-warning'
                  : 'bg-status-warning-bg text-status-warning border-status-warning-border hover:opacity-90'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
              Alerta: {warningProducts.length}
            </button>
          )}

          {criticalProducts.length > 0 && (
            <button
              onClick={() => setStatusFilter('critical')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all cursor-pointer border flex items-center gap-1.5 tabular-nums ${
                statusFilter === 'critical'
                  ? 'bg-status-critical text-white border-status-critical'
                  : 'bg-status-critical-bg text-status-critical border-status-critical-border hover:opacity-90'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-status-critical" />
              Crítico/Zerado: {criticalProducts.length}
            </button>
          )}

          {onOpenReconciliationPreview && (
            <button
              onClick={onOpenReconciliationPreview}
              className="px-3 py-1.5 rounded-2xl text-xs font-black bg-surface-raised hover:bg-surface-raised/80 text-accent border border-border-default transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Abrir Prévia da Conciliação Física dos 14 produtos (Marco Zero)"
            >
              <Scale className="w-3.5 h-3.5 text-accent" />
              <span>Prévia Marco Zero</span>
            </button>
          )}

          {canManageEmails && (
            <button
              onClick={() => setIsNewsletterOpen(true)}
              className="px-3.5 py-1.5 rounded-2xl text-xs font-black bg-accent hover:bg-accent/90 text-slate-950 shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ml-auto"
              title="Gerar e-mail executivo / newsletter profissional com a tabela detalhada de saldos físicos"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>✉️ Gerar Newsletter / E-mail</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-raised p-3 rounded-2xl border border-border-subtle">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, categoria ou prateleira..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-surface text-text-primary text-xs border border-border-default rounded-xl focus:outline-none focus:ring-1 focus:ring-status-info"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Filter className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-surface text-text-primary text-xs border border-border-default rounded-xl focus:outline-none focus:ring-1 focus:ring-status-info cursor-pointer w-full sm:w-auto font-medium"
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
              className="px-3.5 py-1.5 bg-accent hover:bg-accent/90 text-slate-950 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ml-auto"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>⚖️ Inventário Físico / Marco Zero</span>
            </button>
          )}

          {onForceSyncPhysicalStock && (
            <button
              onClick={onForceSyncPhysicalStock}
              title="Ajusta e sincroniza imediatamente o sistema com o inventário físico real da despensa (19/08)"
              className="px-3 py-1.5 bg-status-info-bg hover:bg-status-info-bg/80 text-status-info border border-status-info-border rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-status-info" />
              <span>Sincronizar Estoque Real (19/08)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="overflow-x-auto rounded-2xl border border-border-subtle">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-raised text-text-muted text-[11px] font-black uppercase tracking-wider border-b border-border-subtle">
              <th className="py-3 px-4">Produto & Categoria</th>
              <th className="py-3 px-4">Localização</th>
              <th className="py-3 px-4 text-center">Saldo Atual</th>
              <th className="py-3 px-4 text-center">Mín. Segurança</th>
              <th className="py-3 px-4 text-center">Autonomia</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">{isAdmin ? 'Ações Rápidas' : 'Rastreabilidade'}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border-subtle text-xs">
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
                  className={`hover:bg-surface-raised transition-colors ${
                    isZero ? 'bg-status-critical-bg/20' : ''
                  }`}
                >
                  {/* Product & Category */}
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onOpenTimeline(p.id)}
                      className="font-extrabold text-text-primary hover:text-status-info text-xs text-left cursor-pointer transition-colors block"
                    >
                      {p.name}
                    </button>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-text-muted font-medium">{p.category}</span>
                      <span className="text-[10px] text-border-default">&bull;</span>
                      <span className="text-[10px] text-accent font-semibold">{p.usageFrequency}</span>
                    </div>
                  </td>

                  {/* Storage Location */}
                  <td className="py-3.5 px-4 text-text-secondary">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      <span className="truncate max-w-[180px] font-medium" title={p.location}>
                        {p.location}
                      </span>
                    </div>
                  </td>

                  {/* Current Stock Balance */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span
                        className={`text-sm font-black tracking-tight tabular-nums ${
                          isZero
                            ? 'text-status-critical'
                            : p.currentStock <= p.minStock
                            ? 'text-status-warning'
                            : 'text-text-primary'
                        }`}
                      >
                        {p.currentStock} {p.unit}
                      </span>

                      {/* Micro Progress Bar */}
                      <div className="w-16 bg-surface-raised rounded-full h-1.5 mt-1 overflow-hidden border border-border-subtle">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isZero
                              ? 'bg-status-critical'
                              : status === 'critical'
                              ? 'bg-status-critical'
                              : status === 'warning'
                              ? 'bg-status-warning'
                              : 'bg-status-success'
                          }`}
                          style={{ width: `${Math.max(8, stockRatioPct)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Minimum Stock Level */}
                  <td className="py-3.5 px-4 text-center text-text-muted font-semibold tabular-nums">
                    {p.minStock} {p.unit}
                  </td>

                  {/* Estimated Autonomy */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`text-xs font-extrabold tabular-nums ${
                        days <= 1.5
                          ? 'text-status-critical'
                          : days <= 3
                          ? 'text-status-warning'
                          : 'text-status-success'
                      }`}
                    >
                      {getProductAutonomyLabel(p)}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge
                      status={isZero ? 'critical' : status}
                      label={isZero ? 'ZERADO' : status === 'critical' ? 'Crítico' : status === 'warning' ? 'Alerta' : 'Normal'}
                    />
                  </td>

                  {/* Quick Entry & Exit Actions (Admin Only) or Timeline Link */}
                  <td className="py-3.5 px-4 text-right">
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenExit(p)}
                          title={`Dar saída no item: ${p.name}`}
                          className="p-1.5 rounded-xl bg-surface-raised hover:bg-status-warning-bg text-text-primary hover:text-status-warning border border-border-subtle transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-status-warning" />
                          <span className="hidden sm:inline">Saída</span>
                        </button>

                        <button
                          onClick={() => onOpenEntry(p)}
                          title={`Lançar entrada no item: ${p.name}`}
                          className="p-1.5 rounded-xl bg-status-info-bg hover:bg-status-info-bg/80 text-status-info border border-status-info-border transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5 text-status-success" />
                          <span className="hidden sm:inline">+ Entrada</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onOpenTimeline(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-text-muted hover:text-status-info text-xs font-semibold hover:bg-surface-raised rounded-lg transition-colors cursor-pointer"
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
                <td colSpan={7} className="py-8 text-center text-text-muted text-xs font-medium">
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
