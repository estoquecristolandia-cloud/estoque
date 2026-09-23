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
  Sparkles,
  Bath,
} from 'lucide-react';
import { Product, StockMovement, DailyKit, DailyMealRecord, Department } from '../types';
import { UserRole } from '../firebase';
import { getProductStockStatus } from '../utils/storage';
import { AnimatedNumber } from './AnimatedNumber';
import { soundFeedback } from '../utils/audioFeedback';

interface KpiCardsProps {
  products: Product[];
  movements: StockMovement[];
  dailyKit?: DailyKit;
  meals: DailyMealRecord[];
  userRole?: UserRole;
  activeDepartment?: Department;
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
  activeDepartment = 'alimentacao',
  onNavigateTab,
  onOpenEntryModal,
  onOpenExitModal,
  onOpenKitModal,
}) => {
  const isDml = activeDepartment === 'dml';
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
      {/* 5 Main KPIs Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: Total de Produtos */}
        <div
          onClick={() => {
            soundFeedback.play('click');
            onNavigateTab('products');
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-blue-500/40 dark:hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>{activeCategories} categorias</span>
            </div>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              <AnimatedNumber value={totalProducts} />
            </div>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
              Total de Produtos
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Cadastrados no catálogo
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
            <span>Ver Catálogo Geral</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* KPI 2: Estoque em Alerta */}
        <div
          onClick={() => {
            soundFeedback.play('click');
            onNavigateTab('products');
          }}
          className={`border rounded-3xl p-5 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.99] ${
            alertTotal > 0
              ? 'bg-gradient-to-br from-rose-50/80 to-white dark:from-rose-950/25 dark:to-slate-900 border-rose-200/90 dark:border-rose-900/60 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/5'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`p-2.5 rounded-2xl group-hover:scale-105 transition-transform ${
                alertTotal > 0
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${
                  zeroStockProducts.length > 0
                    ? 'bg-rose-500 animate-ping'
                    : alertTotal > 0
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
              <span
                className={
                  zeroStockProducts.length > 0
                    ? 'text-rose-600 dark:text-rose-400 font-black'
                    : alertTotal > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
              >
                {zeroStockProducts.length > 0
                  ? `${zeroStockProducts.length} Zerados`
                  : alertTotal > 0
                  ? 'Abaixo do Mín.'
                  : 'Regular'}
              </span>
            </div>
          </div>

          <div className="my-3">
            <div
              className={`text-3xl sm:text-4xl font-black tracking-tight tabular-nums ${
                alertTotal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
              }`}
            >
              <AnimatedNumber value={alertTotal} />
            </div>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
              Estoque em Alerta
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {zeroStockProducts.length > 0
                ? `${zeroStockProducts.length} zerado(s) · ${belowMinProducts.length} abaixo do mín.`
                : alertTotal > 0
                ? `${belowMinProducts.length} abaixo do estoque de segurança`
                : 'Todos os produtos com saldo regular'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:underline">
            <span>Ver Itens Críticos</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* KPI 3: Movimentações de Hoje */}
        <div
          onClick={() => {
            soundFeedback.play('click');
            onNavigateTab('entries');
          }}
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-indigo-500/40 dark:hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
              <ArrowDownUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Hoje
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
              <AnimatedNumber value={todayMovements.length} />
            </div>
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
              Movimentações do Dia
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">
                +{todayEntries.length} Entradas
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-blue-600 dark:text-blue-400">
                -{todayExits.length} Saídas
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
            <span>Ver Movimentações</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* KPI 4: Refeições do Dia (Alimentação) OU Distribuição por Setores (DML) */}
        {isDml ? (
          <div
            onClick={() => {
              soundFeedback.play('click');
              onNavigateTab('exits');
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-amber-500/40 dark:hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Bath className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Setores Atendidos
              </span>
            </div>

            <div className="my-3">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                <AnimatedNumber value={movements.filter((m) => m.type === 'saida').length} />
              </div>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                Saídas DML Registradas
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Banheiros, Dormitórios, Lavanderia e Kits
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:underline">
              <span>Extrato de Saídas DML</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              soundFeedback.play('click');
              onNavigateTab('meals');
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-amber-500/40 dark:hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className={`w-1.5 h-1.5 rounded-full ${isMealFromToday ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span className={isMealFromToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                  {isMealFromToday ? 'Hoje' : 'Último'}
                </span>
              </div>
            </div>

            <div className="my-3">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
                <AnimatedNumber value={totalMealsCount} />
              </div>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                Refeições Servidas
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {activeMealRecord ? (
                  <>
                    Café: {activeMealRecord.breakfast || 0} · Almoço: {activeMealRecord.lunch || 0} · Jantar: {activeMealRecord.dinner || 0}
                  </>
                ) : (
                  'Nenhum registro ainda'
                )}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:underline">
              <span>Gestão de Refeições</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        )}

        {/* KPI 5: Kit Cozinha Diário (Alimentação) OU Kit Higiene Acolhidos (DML) */}
        <div
          onClick={() => {
            soundFeedback.play('click');
            if (onOpenKitModal) onOpenKitModal();
            else onNavigateTab('exits');
          }}
          className={`border rounded-3xl p-5 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.99] ${
            kitStatus === 'disponivel'
              ? 'bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-200/90 dark:border-emerald-900/60 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/5'
              : kitStatus === 'atencao'
              ? 'bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-200/90 dark:border-amber-900/60 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/5'
              : 'bg-gradient-to-br from-rose-50/70 to-white dark:from-rose-950/20 dark:to-slate-900 border-rose-200/90 dark:border-rose-900/60 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`p-2.5 rounded-2xl group-hover:scale-105 transition-transform ${
                kitStatus === 'disponivel'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : kitStatus === 'atencao'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isDml ? <Sparkles className="w-5 h-5" /> : <ChefHat className="w-5 h-5" />}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={`w-2 h-2 rounded-full ${
                  kitStatus === 'disponivel'
                    ? 'bg-emerald-500'
                    : kitStatus === 'atencao'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              <span
                className={
                  kitStatus === 'disponivel'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : kitStatus === 'atencao'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {kitStatus === 'disponivel'
                  ? 'Disponível'
                  : kitStatus === 'atencao'
                  ? 'Atenção'
                  : 'Indisponível'}
              </span>
            </div>
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
              {isDml ? 'Kit Higiene Acolhidos' : 'Kit Cozinha Diário'}
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
            <span>{isAdmin ? (isDml ? 'Distribuir / Editar Kit' : 'Baixar / Editar Kit') : 'Visualizar Kit'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
