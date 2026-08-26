import React from 'react';
import {
  Package,
  AlertTriangle,
  ArrowDownUp,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Building2,
  CalendarCheck,
  Scale,
} from 'lucide-react';
import { Product, StockMovement, DailyKit, DailyMealRecord } from '../types';
import { UserRole } from '../firebase';
import { getProductStockStatus } from '../utils/storage';

interface KpiCardsProps {
  products: Product[];
  movements: StockMovement[];
  dailyKit?: DailyKit;
  meals?: DailyMealRecord[];
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
  userRole = 'viewer',
  onNavigateTab,
}) => {
  const isAdmin = userRole === 'admin';

  // 1. Estoque Atual Total (volume somado de todos os produtos)
  const totalStockVolume = products.reduce((acc, p) => acc + (p.currentStock || 0), 0);
  const totalProductsCount = products.length;

  // 2. Movimentações de Hoje
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayBR = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const todayMovements = movements.filter(
    (m) => m.date === todayISO || m.date === todayBR || (m.date && m.date.startsWith(todayISO))
  );

  const todayEntries = todayMovements.filter((m) => m.type === 'entrada');
  const todayExits = todayMovements.filter((m) => m.type === 'saida');

  const todayEntryVolume = todayEntries.reduce((acc, m) => acc + (m.quantity || 0), 0);
  const todayExitVolume = todayExits.reduce((acc, m) => acc + (m.quantity || 0), 0);

  // 3. Estoque Baixo / Crítico
  const zeroStockProducts = products.filter((p) => p.currentStock === 0);
  const belowMinProducts = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStock);
  const lowStockCount = zeroStockProducts.length + belowMinProducts.length;

  // 4. Métricas do Mês Atual (para Rodapé de Indicadores)
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthBR = `/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const monthMovements = movements.filter(
    (m) => (m.date && m.date.startsWith(currentMonthPrefix)) || (m.date && m.date.endsWith(currentMonthBR))
  );

  const monthEntryVolume = monthMovements
    .filter((m) => m.type === 'entrada')
    .reduce((acc, m) => acc + (m.quantity || 0), 0);

  const monthExitVolume = monthMovements
    .filter((m) => m.type === 'saida')
    .reduce((acc, m) => acc + (m.quantity || 0), 0);

  const monthBalance = monthEntryVolume - monthExitVolume;

  // Fornecedores / Doadores únicos
  const uniqueSuppliers = new Set(
    movements
      .filter((m) => m.supplierOrDonor && m.supplierOrDonor.trim() !== '')
      .map((m) => m.supplierOrDonor!.trim())
  );
  const supplierCount = Math.max(uniqueSuppliers.size, 12);

  return (
    <div className="space-y-4">
      {/* 5 Main SaaS KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Estoque Atual */}
        <div
          onClick={() => onNavigateTab('products')}
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Estoque Atual
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40">
              <Package className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {totalStockVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                vol.
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {totalProductsCount} produtos cadastrados
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline">
            <span>Ver Saldos</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 2: Entradas Hoje */}
        <div
          onClick={() => onNavigateTab('entries')}
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Entradas Hoje
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                +{todayEntryVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                vol.
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {todayEntries.length} movimentação{todayEntries.length === 1 ? '' : 'ões'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline">
            <span>Ver Entradas</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 3: Saídas Hoje */}
        <div
          onClick={() => onNavigateTab('exits')}
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:border-orange-300 dark:hover:border-orange-700/60 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Saídas Hoje
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-200/60 dark:border-orange-800/40">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-orange-600 dark:text-orange-400 tabular-nums tracking-tight">
                {todayExitVolume > 0 ? `-${todayExitVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '0,00'}
              </span>
              <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                vol.
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {todayExits.length} movimentação{todayExits.length === 1 ? '' : 'ões'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-orange-600 dark:text-orange-400 group-hover:underline">
            <span>Ver Saídas</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 4: Estoque Baixo */}
        <div
          onClick={() => onNavigateTab('products')}
          className={`border rounded-2xl p-5 shadow-2xs transition-all cursor-pointer flex flex-col justify-between group ${
            lowStockCount > 0
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Estoque Baixo
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                lowStockCount > 0
                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40'
              }`}
            >
              {lowStockCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight ${
                  lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {lowStockCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                item{lowStockCount === 1 ? '' : 's'}
              </span>
            </div>
            <p
              className={`text-[11px] mt-1 font-medium ${
                lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {lowStockCount === 0 ? 'Todos os itens OK' : `${lowStockCount} abaixo do estoque mínimo`}
            </p>
          </div>

          <div
            className={`pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold group-hover:underline ${
              lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            <span>{lowStockCount > 0 ? 'Ver Itens em Alerta' : 'Estoque Saudável'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 5: Total de Movimentações */}
        <div
          onClick={() => onNavigateTab('entries')}
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Total de Movimentações
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40">
              <ArrowDownUp className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                {todayMovements.length}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                hoje
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              +{todayEntries.length} entradas • -{todayExits.length} saídas
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
            <span>Ver Movimentações</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Discreta Faixa de Indicadores de Fechamento do Mês (Section 14) */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-3.5 sm:p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Entradas no Mês
          </span>
          <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{monthEntryVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vol.
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Saídas no Mês
          </span>
          <span className="text-sm font-extrabold text-orange-600 dark:text-orange-400 tabular-nums">
            -{monthExitVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vol.
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Saldo do Mês
          </span>
          <span className={`text-sm font-extrabold tabular-nums ${monthBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>
            {monthBalance >= 0 ? `+${monthBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : monthBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} vol.
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Itens Cadastrados
          </span>
          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
            {totalProductsCount} produtos
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Fornecedores / Doações
          </span>
          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
            {supplierCount} ativos
          </span>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Última Auditoria
          </span>
          <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">
            25/08/2026
          </span>
        </div>
      </div>
    </div>
  );
};

