import React from 'react';
import {
  Package,
  AlertTriangle,
  ArrowDownUp,
  UtensilsCrossed,
  ChefHat,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { Product, StockMovement, DailyKit, DailyMealRecord } from '../types';
import { UserRole } from '../firebase';
import { getProductStockStatus } from '../utils/storage';
import { StatusBadge } from './ui/StatusBadge';

interface KpiCardsProps {
  products: Product[];
  movements: StockMovement[];
  dailyKit?: DailyKit;
  meals: DailyMealRecord[];
  userRole?: UserRole;
  onNavigateTab: (tab: 'products' | 'entries' | 'exits' | 'meals' | 'reports') => void;
  onOpenEntryModal?: () => void;
  onOpenExitModal?: () => void;
  onOpenKitModal?: () => void;
  onOpenMealsModal?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  products,
  movements,
  dailyKit,
  meals,
  userRole = 'viewer',
  onNavigateTab,
  onOpenEntryModal,
  onOpenExitModal,
  onOpenKitModal,
}) => {
  const isAdmin = userRole === 'admin';

  // 1. Total de Produtos & Categorias
  const totalProducts = products.length;
  const activeCategories = new Set(products.map((p) => p.category)).size;

  // 2. Estoque em Alerta & Zerados
  const zeroStockProducts = products.filter((p) => p.currentStock === 0);
  const belowMinProducts = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock);
  const alertTotal = zeroStockProducts.length + belowMinProducts.length;

  // 3. Movimentações de Hoje
  // Format today as YYYY-MM-DD
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayBR = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const todayMovements = movements.filter(
    (m) => m.date === todayISO || m.date === todayBR || (m.date && m.date.startsWith(todayISO))
  );

  const todayEntries = todayMovements.filter((m) => m.type === 'entrada');
  const todayExits = todayMovements.filter((m) => m.type === 'saida');

  // 4. Refeições do Dia
  const todayMealRecord = meals.find(
    (m) => m.date === todayISO || m.date === todayBR || (m.date && m.date.startsWith(todayISO))
  );

  const latestMealRecord = [...meals].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  const activeMealRecord = todayMealRecord || latestMealRecord;
  const isMealFromToday = Boolean(todayMealRecord);
  const totalMealsCount = activeMealRecord
    ? activeMealRecord.totalMeals ||
      (activeMealRecord.breakfast || 0) +
        (activeMealRecord.lunch || 0) +
        (activeMealRecord.dinner || 0) +
        (activeMealRecord.snack || 0)
    : 0;

  // 5. Kit Cozinha Diário Status Check
  const kitItems = dailyKit?.items || [];
  let kitStatus: 'disponivel' | 'atencao' | 'indisponivel' = 'disponivel';
  let missingItemsCount = 0;
  let warningItemsCount = 0;

  if (kitItems.length === 0) {
    kitStatus = 'disponivel';
  } else {
    for (const item of kitItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod || prod.currentStock < item.quantity) {
        missingItemsCount++;
        kitStatus = 'indisponivel';
      } else if (prod.currentStock - item.quantity < prod.minStock) {
        warningItemsCount++;
        if (kitStatus !== 'indisponivel') {
          kitStatus = 'atencao';
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Quick Action Bar for Admin */}
      {isAdmin && (
        <div className="bg-surface-raised border border-border-default rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-text-primary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h4 className="text-sm font-black tracking-tight text-text-primary">Atalhos Operacionais Rápidos</h4>
              <p className="text-xs text-text-secondary">
                Ações imediatas de entrada, saída e baixa do Kit Diário da Cozinha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={onOpenEntryModal}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-status-success hover:bg-status-success/90 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ Nova Entrada</span>
            </button>

            <button
              onClick={onOpenExitModal}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-status-info hover:bg-status-info/90 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>- Nova Saída</span>
            </button>

            <button
              onClick={onOpenKitModal}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-accent hover:bg-accent/90 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ChefHat className="w-4 h-4" />
              <span>⚡ Baixar Kit Cozinha</span>
            </button>
          </div>
        </div>
      )}

      {/* 5 Main KPIs Grid (Responsive: 1 col on mobile, 2 on sm, 3 on md, 5 on xl) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: Total de Produtos */}
        <div
          onClick={() => onNavigateTab('products')}
          className="bg-surface border border-border-subtle hover:border-border-default rounded-3xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-status-info-bg text-status-info border border-status-info-border">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-surface-raised border border-border-subtle text-text-secondary">
              {activeCategories} Categorias
            </span>
          </div>

          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight tabular-nums">
              {totalProducts}
            </span>
            <p className="text-xs font-extrabold text-text-primary mt-1">
              Total de Produtos
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Cadastrados no catálogo
            </p>
          </div>

          <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs font-bold text-status-info group-hover:underline">
            <span>Ver Catálogo Geral</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 2: Estoque em Alerta */}
        <div
          onClick={() => onNavigateTab('products')}
          className="bg-surface border border-border-subtle hover:border-border-default rounded-3xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div
              className={`p-2.5 rounded-2xl border ${
                alertTotal > 0
                  ? 'bg-status-critical-bg text-status-critical border-status-critical-border'
                  : 'bg-status-success-bg text-status-success border-status-success-border'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <StatusBadge
              status={
                zeroStockProducts.length > 0
                  ? 'critical'
                  : alertTotal > 0
                  ? 'warning'
                  : 'normal'
              }
              label={
                zeroStockProducts.length > 0
                  ? `${zeroStockProducts.length} Zerados`
                  : alertTotal > 0
                  ? 'Abaixo Mín.'
                  : 'Regular'
              }
            />
          </div>

          <div className="my-3">
            <span
              className={`text-3xl sm:text-4xl font-black tracking-tight tabular-nums ${
                alertTotal > 0 ? 'text-status-critical' : 'text-text-primary'
              }`}
            >
              {String(alertTotal).padStart(2, '0')}
            </span>
            <p className="text-xs font-extrabold text-text-primary mt-1">
              Estoque em Alerta
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {zeroStockProducts.length > 0
                ? `${zeroStockProducts.length} zerado(s) • ${belowMinProducts.length} abaixo do mín.`
                : alertTotal > 0
                ? `${belowMinProducts.length} abaixo do estoque de segurança`
                : 'Todos os produtos com saldo OK'}
            </p>
          </div>

          <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs font-bold text-status-critical group-hover:underline">
            <span>Ver Itens Críticos</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 3: Movimentações de Hoje */}
        <div
          onClick={() => onNavigateTab('entries')}
          className="bg-surface border border-border-subtle hover:border-border-default rounded-3xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-status-info-bg text-status-info border border-status-info-border">
              <ArrowDownUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-surface-raised border border-border-subtle text-text-secondary">
              Hoje
            </span>
          </div>

          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight tabular-nums">
              {todayMovements.length}
            </span>
            <p className="text-xs font-extrabold text-text-primary mt-1">
              Movimentações do Dia
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold text-status-success flex items-center gap-0.5 tabular-nums">
                +{todayEntries.length} Entradas
              </span>
              <span className="text-text-muted">•</span>
              <span className="text-[11px] font-bold text-status-info flex items-center gap-0.5 tabular-nums">
                -{todayExits.length} Saídas
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs font-bold text-status-info group-hover:underline">
            <span>Ver Movimentações</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 4: Refeições do Dia */}
        <div
          onClick={() => onNavigateTab('meals')}
          className="bg-surface border border-border-subtle hover:border-border-default rounded-3xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-status-warning-bg text-status-warning border border-status-warning-border">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                isMealFromToday
                  ? 'bg-status-success-bg text-status-success border-status-success-border'
                  : 'bg-surface-raised text-text-secondary border-border-subtle'
              }`}
            >
              {isMealFromToday ? 'Hoje' : 'Último Registro'}
            </span>
          </div>

          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight tabular-nums">
              {totalMealsCount}
            </span>
            <p className="text-xs font-extrabold text-text-primary mt-1">
              Refeições Servidas
            </p>
            <p className="text-[11px] text-text-muted mt-0.5 truncate">
              {activeMealRecord ? (
                <>
                  Café: {activeMealRecord.breakfast || 0} | Almoço: {activeMealRecord.lunch || 0} | Jantar: {activeMealRecord.dinner || 0}
                </>
              ) : (
                'Nenhum registro ainda'
              )}
            </p>
          </div>

          <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-xs font-bold text-status-warning group-hover:underline">
            <span>Gestão de Refeições</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 5: Kit Cozinha Diário */}
        <div
          onClick={() => {
            if (onOpenKitModal) onOpenKitModal();
            else onNavigateTab('exits');
          }}
          className="bg-surface border border-border-subtle hover:border-border-default rounded-3xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div
              className={`p-2.5 rounded-2xl border ${
                kitStatus === 'disponivel'
                  ? 'bg-status-success-bg text-status-success border-status-success-border'
                  : kitStatus === 'atencao'
                  ? 'bg-status-warning-bg text-status-warning border-status-warning-border'
                  : 'bg-status-critical-bg text-status-critical border-status-critical-border'
              }`}
            >
              <ChefHat className="w-5 h-5" />
            </div>
            <StatusBadge
              status={
                kitStatus === 'disponivel'
                  ? 'normal'
                  : kitStatus === 'atencao'
                  ? 'warning'
                  : 'critical'
              }
              label={
                kitStatus === 'disponivel'
                  ? 'Disponível'
                  : kitStatus === 'atencao'
                  ? 'Atenção'
                  : 'Indisponível'
              }
            />
          </div>

          <div className="my-3">
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                kitStatus === 'disponivel'
                  ? 'text-status-success'
                  : kitStatus === 'atencao'
                  ? 'text-status-warning'
                  : 'text-status-critical'
              }`}
            >
              {kitStatus === 'disponivel' ? '100% Pronto' : kitStatus === 'atencao' ? 'Saldo Mínimo' : 'Faltam Itens'}
            </span>
            <p className="text-xs font-extrabold text-text-primary mt-1">
              Kit Cozinha Diário
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {kitItems.length} itens essenciais no modelo
            </p>
          </div>

          <div
            className={`pt-2 border-t border-border-subtle flex items-center justify-between text-xs font-bold group-hover:underline ${
              kitStatus === 'disponivel'
                ? 'text-status-success'
                : kitStatus === 'atencao'
                ? 'text-status-warning'
                : 'text-status-critical'
            }`}
          >
            <span>{isAdmin ? 'Baixar / Editar Kit' : 'Visualizar Kit'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

