import React, { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Product, StockMovement } from '../types';
import { calculateDaysRemaining } from '../utils/storage';
import {
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Layers,
} from 'lucide-react';

interface DashboardChartsProps {
  products: Product[];
  movements: StockMovement[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Grãos e Cereais': '#059669', // Emerald
  'Laticínios e Matinais': '#2563eb', // Blue
  'Mercearia e Temperos': '#d97706', // Amber
  'Bebidas e Sucos': '#7c3aed', // Purple
  Proteínas: '#ea580c', // Orange
  Higiene: '#0284c7', // Sky
  Limpeza: '#0d9488', // Teal
  Outros: '#64748b', // Slate
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ products, movements }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'entriesExits' | 'categories' | 'autonomy'>('all');

  // 1. Calculate Daily Entries vs Exits for Past 7 Days
  const dailyMovementsData = useMemo(() => {
    const dates: { iso: string; br: string; label: string }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const iso = `${yr}-${mo}-${da}`;
      const br = `${da}/${mo}/${yr}`;
      const label = `${da}/${mo}`;
      dates.push({ iso, br, label });
    }

    return dates.map(({ iso, br, label }) => {
      const dayMovs = movements.filter((m) => m.date === iso || m.date === br || (m.date && m.date.startsWith(iso)));
      const entriesVol = dayMovs.filter((m) => m.type === 'entrada').reduce((acc, m) => acc + (m.quantity || 0), 0);
      const exitsVol = dayMovs.filter((m) => m.type === 'saida').reduce((acc, m) => acc + (m.quantity || 0), 0);

      return {
        date: label,
        fullDate: br,
        Entradas: Math.round(entriesVol * 100) / 100,
        Saídas: Math.round(exitsVol * 100) / 100,
      };
    });
  }, [movements]);

  // 2. Calculate Stock Distribution by Category
  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category || 'Outros';
      totals[cat] = (totals[cat] || 0) + (p.currentStock || 0);
    });

    const totalStock = Object.values(totals).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 10) / 10,
        percentage: Math.round((value / totalStock) * 100),
        color: CATEGORY_COLORS[name] || '#64748b',
      }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  // 3. Autonomy / Days Remaining Data
  const autonomyData = useMemo(() => {
    return products
      .map((p) => {
        const days = calculateDaysRemaining(p);
        let color = '#059669'; // Emerald
        if (days <= 5 || p.currentStock <= p.minStock) {
          color = '#e11d48'; // Rose
        } else if (days <= 8) {
          color = '#ea580c'; // Orange
        }
        return {
          name: p.name.length > 16 ? `${p.name.substring(0, 14)}...` : p.name,
          fullName: p.name,
          days: Math.min(days, 30),
          exactDays: days,
          unit: p.unit,
          stock: p.currentStock,
          color,
        };
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, 7);
  }, [products]);

  return (
    <div className="space-y-4 mb-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900 p-2 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos os Gráficos</span>
          </button>

          <button
            onClick={() => setActiveTab('entriesExits')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'entriesExits'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Entradas vs Saídas</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'categories'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5 text-blue-500" />
            <span>Categorias</span>
          </button>

          <button
            onClick={() => setActiveTab('autonomy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'autonomy'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
            <span>Previsão de Término</span>
          </button>
        </div>

        <span className="hidden sm:inline-flex text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-2">
          Conciliação e Consumo
        </span>
      </div>

      {/* Grid of Modern SaaS Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart 1: Entradas vs Saídas */}
        {(activeTab === 'all' || activeTab === 'entriesExits') && (
          <div
            className={`${
              activeTab === 'entriesExits' ? 'lg:col-span-12' : 'lg:col-span-7'
            } bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between`}
          >
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Entradas vs Saídas (Últimos 7 Dias)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Comparativo de volumes movimentados diariamente no almoxarifado.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span>
                    <span>Entradas</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-orange-600"></span>
                    <span>Saídas</span>
                  </div>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyMovementsData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis unit="v" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-xs text-white shadow-xl space-y-1">
                              <p className="font-bold text-slate-300">{data.fullDate}</p>
                              <p className="text-emerald-400 font-semibold">
                                Entradas: <strong className="text-white">+{data.Entradas} vol.</strong>
                              </p>
                              <p className="text-orange-400 font-semibold">
                                Saídas: <strong className="text-white">-{data.Saídas} vol.</strong>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="Entradas" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Saídas" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Chart 2: Distribuição por Categoria */}
        {(activeTab === 'all' || activeTab === 'categories') && (
          <div
            className={`${
              activeTab === 'categories' ? 'lg:col-span-12' : 'lg:col-span-5'
            } bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Estoque por Categoria
                </h3>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {categoryData.length} Grupos
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Volume de estoque armazenado por grupo de suprimento.
              </p>

              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cat-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs text-white shadow-xl">
                              <p className="font-bold">{data.name}</p>
                              <p className="text-slate-300">
                                {data.value} vol. ({data.percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Legend */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {categoryData.slice(0, 6).map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate text-slate-600 dark:text-slate-400 font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums shrink-0">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chart 3: Previsão de Autonomia (Horizontal Bar Chart) */}
        {(activeTab === 'all' || activeTab === 'autonomy') && (
          <div
            className="lg:col-span-12 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    Previsão de Autonomia do Estoque (Dias Estimados)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Projeção de duração dos produtos com base na taxa de consumo diário.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Crítico (&le;5d)
                  </span>
                  <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
                    <span className="w-2 h-2 rounded-full bg-orange-500" /> Atenção (&le;8d)
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Seguro (&gt;8d)
                  </span>
                </div>
              </div>

              <div className="h-56 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={autonomyData} layout="vertical" margin={{ top: 5, right: 25, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                    <XAxis type="number" unit=" dias" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl text-xs text-white shadow-xl">
                              <p className="font-bold text-amber-400">{data.fullName}</p>
                              <p className="text-slate-300">
                                Saldo: <strong className="text-white">{data.stock} {data.unit}</strong>
                              </p>
                              <p className="text-slate-300">
                                Autonomia: <strong className="text-emerald-400">{data.exactDays} dias</strong>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="days" radius={[0, 6, 6, 0]}>
                      {autonomyData.map((entry, index) => (
                        <Cell key={`auton-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
