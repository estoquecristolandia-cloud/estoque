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
  AreaChart,
  Area,
} from 'recharts';
import { Product, StockMovement, Sector } from '../types';
import { calculateDaysRemaining } from '../utils/storage';
import { PieChart as PieChartIcon, BarChart3, TrendingUp, CalendarDays, Filter, Sparkles, Layers } from 'lucide-react';
import { soundFeedback } from '../utils/audioFeedback';

interface DashboardChartsProps {
  products: Product[];
  movements: StockMovement[];
}

const ALL_SECTORS: Sector[] = [
  'Cozinha',
  'Padaria',
  'Casa Missionária Masculina',
  'Casa Missionária Feminina',
  'Administração',
  'Casa da Coordenação (Huberto & Débora)',
  'Casa Lana & Joabe (Cesta Básica)',
  'Casa Marcos & Fabíola (Cesta Básica)',
  'Casa Tainã (Cesta Básica)',
  'Eventos',
  'Outros',
];

const SECTOR_COLORS: Record<string, string> = {
  Cozinha: '#2563eb', // Blue
  Padaria: '#f59e0b', // Amber / Gold
  'Casa Missionária Masculina': '#0d9488', // Teal
  'Casa Missionária Feminina': '#d946ef', // Fuchsia / Purple
  Administração: '#64748b', // Slate
  'Casa da Coordenação (Huberto & Débora)': '#06b6d4', // Cyan
  'Casa Lana & Joabe (Cesta Básica)': '#ec4899', // Pink
  'Casa Marcos & Fabíola (Cesta Básica)': '#6366f1', // Indigo
  'Casa Tainã (Cesta Básica)': '#10b981', // Emerald
  Eventos: '#8b5cf6', // Violet
  Outros: '#f43f5e', // Rose
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ products, movements }) => {
  const [chartTab, setChartTab] = useState<'all' | 'duration' | 'sector' | 'trend'>('all');

  // 1. Calculate Sector Consumption Data for ALL Sectors
  const sectorData = useMemo(() => {
    const exitMovements = movements.filter((m) => m.type === 'saida');
    const totals: Record<string, number> = {};
    ALL_SECTORS.forEach((sec) => {
      totals[sec] = 0;
    });

    exitMovements.forEach((m) => {
      const sec = m.sector || 'Outros';
      totals[sec] = (totals[sec] || 0) + m.quantity;
    });

    const totalExitVolume = Object.values(totals).reduce((a, b) => a + b, 0) || 1;

    return ALL_SECTORS.map((name) => {
      const value = totals[name] || 0;
      return {
        name,
        value: Math.round(value * 10) / 10,
        percentage: Math.round((value / totalExitVolume) * 100),
      };
    }).sort((a, b) => b.value - a.value); // Higher consumption first
  }, [movements]);

  // Slices for Pie Chart (only non-zero slices so pie chart renders cleanly)
  const pieChartData = useMemo(() => {
    const active = sectorData.filter((item) => item.value > 0);
    return active.length > 0 ? active : [{ name: 'Sem Consumo', value: 1, percentage: 0 }];
  }, [sectorData]);

  // 2. Calculate Days Remaining Bar Chart Data for Top Products
  const daysRemainingData = useMemo(() => {
    return products
      .map((p) => {
        const days = calculateDaysRemaining(p);
        let color = '#10b981'; // Green
        if (days <= 5 || p.currentStock <= p.minStock) {
          color = '#f43f5e'; // Red
        } else if (days <= 8) {
          color = '#f59e0b'; // Amber
        }
        return {
          name: p.name.length > 18 ? `${p.name.substring(0, 16)}...` : p.name,
          fullName: p.name,
          days: Math.min(days, 30), // Cap for bar visualization readability
          exactDays: days,
          unit: p.unit,
          stock: p.currentStock,
          color,
        };
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, 8); // Top 8 items sorted by urgency
  }, [products]);

  // 3. Last 7 Days Consumption Trend
  const trendData = useMemo(() => {
    // Generate dates for past 7 days using local time
    const dates: string[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      dates.push(`${yr}-${mo}-${da}`);
    }

    return dates.map((dateStr) => {
      const displayDate = dateStr.split('-').slice(1).reverse().join('/'); // DD/MM

      const dayMovs = movements.filter((m) => m.type === 'saida' && m.date === dateStr);

      const arroz = dayMovs.filter((m) => m.productName.toLowerCase().includes('arroz')).reduce((acc, m) => acc + m.quantity, 0);
      const feijao = dayMovs.filter((m) => m.productName.toLowerCase().includes('feijão') || m.productName.toLowerCase().includes('feijao')).reduce((acc, m) => acc + m.quantity, 0);
      const oleo = dayMovs.filter((m) => m.productName.toLowerCase().includes('óleo') || m.productName.toLowerCase().includes('oleo')).reduce((acc, m) => acc + m.quantity, 0);
      const manteiga = dayMovs.filter((m) => m.productName.toLowerCase().includes('manteiga') || m.productName.toLowerCase().includes('margarina')).reduce((acc, m) => acc + m.quantity, 0);

      return {
        date: displayDate,
        Arroz: arroz,
        Feijão: feijao,
        Óleo: oleo,
        Manteiga: manteiga,
      };
    });
  }, [movements]);

  return (
    <div className="space-y-6 mb-8">
      {/* Interactive Tabs for Chart Focus */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900/90 p-2 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none">
          <button
            onClick={() => {
              soundFeedback.play('click');
              setChartTab('all');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              chartTab === 'all'
                ? 'bg-slate-950 text-white dark:bg-blue-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Todos os Gráficos</span>
          </button>

          <button
            onClick={() => {
              soundFeedback.play('click');
              setChartTab('duration');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              chartTab === 'duration'
                ? 'bg-slate-950 text-white dark:bg-blue-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
            <span>Previsão de Término</span>
          </button>

          <button
            onClick={() => {
              soundFeedback.play('click');
              setChartTab('sector');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              chartTab === 'sector'
                ? 'bg-slate-950 text-white dark:bg-blue-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>Consumo por Setor</span>
          </button>

          <button
            onClick={() => {
              soundFeedback.play('click');
              setChartTab('trend');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              chartTab === 'trend'
                ? 'bg-slate-950 text-white dark:bg-blue-600 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tendência Diária</span>
          </button>
        </div>

        <span className="hidden lg:inline-flex text-[11px] font-bold text-slate-400 px-3 py-1">
          📊 Análise em Tempo Real
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Previsão de Término do Estoque (Bar Chart) */}
        {(chartTab === 'all' || chartTab === 'duration') && (
          <div className={`${chartTab === 'duration' ? 'lg:col-span-12' : 'lg:col-span-7'} bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between`}>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Previsão de Duração do Estoque (Dias Restantes)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tempo estimado de abastecimento baseado no consumo médio diário.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold flex-wrap">
                  <span className="inline-flex items-center gap-1 text-rose-500">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Crítico (&le;5d)
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-500">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Alerta (&le;8d)
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Seguro
                  </span>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={daysRemainingData}
                    layout="vertical"
                    margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.15} />
                    <XAxis type="number" domain={[0, 'auto']} unit=" dias" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-xs text-white shadow-2xl space-y-1">
                              <p className="font-extrabold text-amber-400">{data.fullName}</p>
                              <p className="text-slate-300">
                                Estoque Atual: <strong className="text-white font-bold">{data.stock} {data.unit}</strong>
                              </p>
                              <p className="text-slate-300">
                                Duração Estimada: <strong className="text-rose-400 font-black">{data.exactDays} dias</strong>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="days" radius={[0, 8, 8, 0]}>
                      {daysRemainingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Chart 2: Consumo por Setor (Donut Chart Bento Card) */}
        {(chartTab === 'all' || chartTab === 'sector') && (
          <div className={`${chartTab === 'sector' ? 'lg:col-span-12' : 'lg:col-span-5'} bg-white dark:bg-slate-900/90 text-slate-900 dark:text-white p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-black flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-amber-500" />
                  Consumo por Setor
                </h3>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                  11 Setores
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Proporção do consumo de alimentos entregue a cada setor da Cristolândia.
              </p>

              <div className="h-52 w-full flex items-center justify-center">
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={SECTOR_COLORS[entry.name] || '#64748b'}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-xs text-white shadow-2xl">
                                <p className="font-bold text-amber-400">{data.name}</p>
                                <p className="mt-1">
                                  Volume Entregue: <strong className="text-white font-bold tabular-nums">{data.value} vol.</strong> ({data.percentage}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400">Nenhum consumo registrado ainda.</p>
                )}
              </div>
            </div>

            {/* Legend list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs max-h-56 overflow-y-auto pr-1">
              {sectorData.map((s) => (
                <div key={s.name} className={`flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl border ${s.value > 0 ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60' : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-100 dark:border-slate-900 opacity-60'}`}>
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: SECTOR_COLORS[s.name] || '#64748b' }}
                    />
                    <span className="truncate font-semibold text-slate-700 dark:text-slate-300">{s.name}</span>
                  </div>
                  <span className={`font-bold tabular-nums shrink-0 ${s.value > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{s.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart 3: Tendência Diária de Consumo dos Principais Alimentos */}
        {(chartTab === 'all' || chartTab === 'trend') && (
          <div className="lg:col-span-12 bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Evolução do Consumo Diário (Últimos 7 Dias)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Volume de retiradas diárias para Arroz (kg), Feijão (kg), Óleo (L) e Manteiga (kg).
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold flex-wrap">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <span className="w-2.5 h-1 bg-blue-500 rounded-full"></span> Arroz
                </span>
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <span className="w-2.5 h-1 bg-amber-500 rounded-full"></span> Feijão
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-1 bg-emerald-500 rounded-full"></span> Óleo
                </span>
                <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                  <span className="w-2.5 h-1 bg-purple-500 rounded-full"></span> Manteiga
                </span>
              </div>
            </div>

            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorArroz" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFeijao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOleo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-xs text-white shadow-2xl space-y-1">
                            <p className="font-extrabold text-slate-300 border-b border-slate-800 pb-1">Data: {label}</p>
                            {payload.map((p) => (
                              <p key={p.name} style={{ color: p.color }} className="font-extrabold">
                                {p.name}: {p.value} unidades/kg
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="Arroz" stroke="#3b82f6" fillOpacity={1} fill="url(#colorArroz)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Feijão" stroke="#f59e0b" fillOpacity={1} fill="url(#colorFeijao)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="Óleo" stroke="#10b981" fillOpacity={1} fill="url(#colorOleo)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

