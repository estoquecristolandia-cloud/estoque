import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Product, StockMovement } from '../types';
import { calculateDaysRemaining } from '../utils/storage';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Layers,
} from 'lucide-react';

interface DashboardChartsProps {
  products: Product[];
  movements: StockMovement[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Grãos e Cereais': '#059669', // Emerald
  'Óleos e Condimentos': '#d97706', // Amber
  'Matinais e Bebidas': '#2563eb', // Blue
  'Proteínas e Carnes': '#ea580c', // Orange
  'Laticínios e Massas': '#7c3aed', // Purple
  'Hortifrúti e Temperos': '#10b981', // Emerald light
  'Higiene e Limpeza': '#0284c7', // Sky
  Outros: '#64748b', // Slate
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ products, movements }) => {
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
          name: p.name.length > 15 ? `${p.name.substring(0, 13)}...` : p.name,
          fullName: p.name,
          days: Math.min(days, 30),
          exactDays: days,
          unit: p.unit,
          stock: p.currentStock,
          color,
        };
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, 6);
  }, [products]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Chart 1: Entradas vs Saídas */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Entradas × Saídas (Últimos 7 Dias)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comparativo de volumes movimentados diariamente no almoxarifado
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#059669]"></span>
                <span>Entradas</span>
              </div>
              <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#EA580C]"></span>
                <span>Saídas</span>
              </div>
            </div>
          </div>

          <div className="h-60 sm:h-64 w-full">
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
                <Bar dataKey="Entradas" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Saídas" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 2: Autonomia Estimada */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                Autonomia do Estoque
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dias de consumo garantidos por alimento
              </p>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Projeção
            </span>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={autonomyData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis type="number" unit="d" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={95} tick={{ fill: '#64748b', fontSize: 11 }} />
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
                <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                  {autonomyData.map((entry, index) => (
                    <Cell key={`auton-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
