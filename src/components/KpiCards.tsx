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
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <ChefHat className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-black tracking-tight">Atalhos Operacionais Rápidos</h4>
              <p className="text-xs text-blue-200">
                Ações imediatas de entrada, saída e baixa do Kit Diário da Cozinha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={onOpenEntryModal}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ Nova Entrada</span>
            </button>

            <button
              onClick={onOpenExitModal}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>- Nova Saída</span>
            </button>

            <button
              onClick={onOpenKitModal}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {activeCategories} Categorias
            </span>
          </div>

          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalProducts}
            </span>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
              Total de Produtos
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Cadastrados no catálogo
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
            <span>Ver Catálogo Geral</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 2: Estoque em Alerta */}
        <div
          onClick={() => onNavigateTab('products')}
          className={`border rounded-3xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group ${
            alertTotal > 0
              ? 'bg-gradient-to-br from-rose-50/80 to-white dark:from-rose-950/30 dark:to-slate-900 border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`p-2.5 rounded-2xl ${
                alertTotal > 0
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                zeroStockProducts.length > 0
                  ? 'bg-rose-600 text-white animate-pulse'
                  : alertTotal > 0
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {zeroStockProducts.length > 0
                ? `${zeroStockProducts.length} Zerados`
                : alertTotal > 0
                ? 'Abaixo do Mín.'
                : 'Regular'}
            </span>
          </div>

          <div className="my-3">
            <span
              className={`text-3xl sm:text-4xl font-black tracking-tight ${
                alertTotal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
              }`}
            >
              {String(alertTotal).padStart(2, '0')}
            </span>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
              Estoque em Alerta
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {zeroStockProducts.length > 0
                ? `${zeroStockProducts.length} zerado(s) • ${belowMinProducts.length} abaixo do mín.`
                : alertTotal > 0
                ? `${belowMinProducts.length} abaixo do estoque de segurança`
                : 'Todos os produtos com saldo OK'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:underline">
            <span>Ver Itens Críticos</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 3: Movimentações de Hoje */}
        <div
          onClick={() => onNavigateTab('entries')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ArrowDownUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Hoje
            </span>
          </div>

          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {todayMovements.length}
            </span>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
              Movimentações do Dia
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                +{todayEntries.length} Entradas
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                -{todayExits.length} Saídas
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
            <span>Ver Movimentações</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* KPI 4: Refeições do Dia */}
        <div
          onClick={() => onNavigateTab('meals')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                isMealFromToday
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {isMealFromToday ? 'Hoje' : 'Último Registro'}
            </span>
          </div>

          <div className="my-3">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalMealsCount}
            </span>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
              Refeições Servidas
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {activeMealRecord ? (
                <>
                  Café: {activeMealRecord.breakfast || 0} | Almoço: {activeMealRecord.lunch || 0} | Jantar: {activeMealRecord.dinner || 0}
                </>
              ) : (
                'Nenhum registro ainda'
              )}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:underline">
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
          className={`border rounded-3xl p-5 shadow-xs transition-all cursor-pointer flex flex-col justify-between group ${
            kitStatus === 'disponivel'
              ? 'bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400'
              : kitStatus === 'atencao'
              ? 'bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-200 dark:border-amber-900/60 hover:border-amber-400'
              : 'bg-gradient-to-br from-rose-50/70 to-white dark:from-rose-950/20 dark:to-slate-900 border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`p-2.5 rounded-2xl ${
                kitStatus === 'disponivel'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : kitStatus === 'atencao'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              <ChefHat className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                kitStatus === 'disponivel'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : kitStatus === 'atencao'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
              }`}
            >
              {kitStatus === 'disponivel'
                ? 'Disponível'
                : kitStatus === 'atencao'
                ? 'Atenção'
                : 'Indisponível'}
            </span>
          </div>

          <div className="my-3">
            <span
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                kitStatus === 'disponivel'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : kitStatus === 'atencao'
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {kitStatus === 'disponivel' ? '100% Pronto' : kitStatus === 'atencao' ? 'Saldo Mínimo' : 'Faltam Itens'}
            </span>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
              Kit Cozinha Diário
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {kitItems.length} itens essenciais no modelo
            </p>
          </div>

          <div
            className={`pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold group-hover:underline ${
              kitStatus === 'disponivel'
                ? 'text-emerald-600 dark:text-emerald-400'
                : kitStatus === 'atencao'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
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
