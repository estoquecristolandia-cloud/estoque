import React from 'react';
import { ShieldAlert, ShoppingCart, Utensils, AlertTriangle, ArrowDownLeft } from 'lucide-react';
import { Product } from '../types';
import { calculateDaysRemaining, getProductStockStatus, getRecommendedPurchaseDate } from '../utils/storage';

interface KpiCardsProps {
  products: Product[];
  onSelectCategoryFilter?: (filter: 'all' | 'critical' | 'warning') => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ products, onSelectCategoryFilter }) => {
  // Key essential items
  const arroz = products.find((p) => p.name.toLowerCase().includes('arroz'));
  const arrozStock = arroz ? arroz.currentStock : 0;
  const arrozDays = arroz ? calculateDaysRemaining(arroz) : 0;

  const feijao = products.find((p) => p.name.toLowerCase().includes('feijão') || p.name.toLowerCase().includes('feijao'));
  const feijaoStock = feijao ? feijao.currentStock : 0;
  const feijaoDays = feijao ? calculateDaysRemaining(feijao) : 0;

  const oleo = products.find((p) => p.name.toLowerCase().includes('óleo') || p.name.toLowerCase().includes('oleo'));
  const oleoStock = oleo ? oleo.currentStock : 0;
  const oleoDays = oleo ? calculateDaysRemaining(oleo) : 0;

  const manteiga = products.find((p) => p.name.toLowerCase().includes('manteiga') || p.name.toLowerCase().includes('margarina'));
  const manteigaStock = manteiga ? manteiga.currentStock : 0;
  const manteigaDays = manteiga ? calculateDaysRemaining(manteiga) : 0;

  // Urgent items needing repurchase (autonomy <= 5 days OR below minimum stock or critical/warning)
  const itemsNeedingAttention = products.filter((p) => {
    const days = calculateDaysRemaining(p);
    const status = getProductStockStatus(p);
    return days <= 5 || status === 'critical' || status === 'warning' || p.currentStock <= p.minStock;
  });

  const criticalOnly = products.filter((p) => {
    const days = calculateDaysRemaining(p);
    return days <= 3 || p.currentStock <= p.minStock || getProductStockStatus(p) === 'critical';
  });

  const { dateStr } = getRecommendedPurchaseDate(products);

  // Average autonomy in days across all products
  const avgDaysRemaining = Math.round(
    products.reduce((acc, p) => acc + calculateDaysRemaining(p), 0) / (products.length || 1)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
      {/* 1. Urgent Repurchase / Critical Alert Tile */}
      <div
        onClick={() => onSelectCategoryFilter?.('critical')}
        className={`lg:col-span-3 rounded-3xl p-6 border transition-all cursor-pointer shadow-sm group flex flex-col justify-between ${
          itemsNeedingAttention.length > 0
            ? 'bg-gradient-to-br from-rose-50 to-red-100/60 dark:from-rose-950/40 dark:to-slate-900 border-rose-200 dark:border-rose-800 hover:border-rose-400'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-2.5 rounded-2xl ${
                itemsNeedingAttention.length > 0
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Urgência de Compra
            </span>
          </div>

          <span
            className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
              itemsNeedingAttention.length > 0
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {itemsNeedingAttention.length > 0 ? `${itemsNeedingAttention.length} em Alerta` : 'Estoque OK'}
          </span>
        </div>

        <div className="my-4">
          <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            {String(itemsNeedingAttention.length).padStart(2, '0')}
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
            {itemsNeedingAttention.length === 1 ? 'Produto Requer Reposição' : 'Produtos Requerem Reposição'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {itemsNeedingAttention.length > 0
              ? `${itemsNeedingAttention.map((p) => p.name.split(' ')[0]).slice(0, 3).join(', ')} (≤ 5 dias restantes)`
              : 'Todos os produtos acima do estoque de segurança.'}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-extrabold text-rose-600 dark:text-rose-400 group-hover:underline">
          <span>Ver Produtos em Alerta</span>
          <span>&rarr;</span>
        </div>
      </div>

      {/* 2. Autonomia Média & Próxima Compra Tile */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Previsão de Reposição
            </span>
          </div>

          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
            Sugerido
          </span>
        </div>

        <div className="my-3">
          <div className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            {dateStr.split('/').slice(0, 2).join('/')}
          </div>
          <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-1">
            Data Limite Recomendada
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Autonomia Média Estimada: <strong className="text-slate-900 dark:text-white">{avgDaysRemaining} dias</strong>
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            Próximos do Fim: <strong className="text-amber-600 dark:text-amber-400 font-bold">{itemsNeedingAttention.length} itens</strong>
          </span>
        </div>
      </div>

      {/* 3. Essential Foods Main Inventory Card (Arroz, Feijão, Óleo, Padaria) */}
      <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Utensils className="w-4 h-4 text-amber-500" />
              Alimentos de Maior Impacto (Cozinha & Padaria)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Nível atual em relação ao consumo diário das refeições
            </p>
          </div>

          <span className="hidden sm:inline-flex text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700">
            Tempo Real
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Arroz */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-extrabold text-xs text-slate-900 dark:text-white block">Arroz Branco</span>
                <span className="text-[10px] text-slate-400">Consumo: {arroz?.dailyAvgConsumption || 17}kg/dia</span>
              </div>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                  arrozDays <= 5
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {arrozDays} dias
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Restante: <strong className="text-slate-800 dark:text-slate-200">{arrozStock}kg</strong></span>
              <span>Mín: {arroz?.minStock || 51}kg</span>
            </div>
          </div>

          {/* Feijão */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-extrabold text-xs text-slate-900 dark:text-white block">Feijão Carioca</span>
                <span className="text-[10px] text-slate-400">Consumo: {feijao?.dailyAvgConsumption || 9}kg/dia</span>
              </div>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                  feijaoDays <= 5
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                {feijaoDays} dias
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Restante: <strong className="text-slate-800 dark:text-slate-200">{feijaoStock}kg</strong></span>
              <span>Mín: {feijao?.minStock || 27}kg</span>
            </div>
          </div>

          {/* Óleo */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-extrabold text-xs text-slate-900 dark:text-white block">Óleo de Soja</span>
                <span className="text-[10px] text-slate-400">Consumo: {oleo?.dailyAvgConsumption || 1.5}L/dia</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {oleoDays} dias
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Restante: <strong className="text-slate-800 dark:text-slate-200">{oleoStock}L</strong></span>
              <span>Mín: {oleo?.minStock || 4.5}L</span>
            </div>
          </div>

          {/* Manteiga/Margarina */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-extrabold text-xs text-slate-900 dark:text-white block">Manteiga / Margarina</span>
                <span className="text-[10px] text-slate-400">Consumo: {manteiga?.dailyAvgConsumption || 1}kg/dia</span>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {manteigaDays} dias
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Restante: <strong className="text-slate-800 dark:text-slate-200">{manteigaStock}kg</strong></span>
              <span>Mín: {manteiga?.minStock || 5}kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
