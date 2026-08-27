import React, { useState, useMemo } from 'react';
import { DailyMealRecord, Missionary } from '../types';
import { UserRole } from '../firebase';
import { getTodayDateString } from '../utils/storage';
import { toast } from '../utils/toast';
import { 
  Coffee, 
  Utensils, 
  SunMedium, 
  Soup, 
  Calendar, 
  User, 
  CheckCircle2, 
  Users, 
  FileSpreadsheet, 
  Edit2, 
  Trash2, 
  Plus, 
  Minus,
  Clock,
  Printer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from './ui/PageHeader';
import { StatCard } from './ui/StatCard';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { SearchInput } from './ui/SearchInput';

interface MealManagerProps {
  meals: DailyMealRecord[];
  missionaries: Missionary[];
  userRole?: UserRole;
  currentUserDisplayName?: string;
  onSaveMealRecord: (record: Omit<DailyMealRecord, 'id' | 'totalMeals' | 'createdAt'> & { id?: string; createdAt?: string }) => void;
  onDeleteMealRecord: (id: string) => void;
}

export const MealManager: React.FC<MealManagerProps> = ({
  meals,
  missionaries,
  userRole = 'admin',
  currentUserDisplayName = 'Marconi Castro (Gestor do Estoque)',
  onSaveMealRecord,
  onDeleteMealRecord,
}) => {
  const isAdmin = userRole === 'admin';
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  // Form states for the selected date
  const [breakfast, setBreakfast] = useState<number>(0);
  const [lunch, setLunch] = useState<number>(0);
  const [afternoonSnack, setAfternoonSnack] = useState<number>(0);
  const [dinner, setDinner] = useState<number>(0);
  const [responsible, setResponsible] = useState<string>(currentUserDisplayName);
  const [notes, setNotes] = useState<string>('');

  // When selectedDate changes, load existing record if available
  React.useEffect(() => {
    const existing = meals.find((m) => m.date === selectedDate);
    if (existing) {
      setBreakfast(existing.breakfast || 0);
      setLunch(existing.lunch || 0);
      setAfternoonSnack(existing.afternoonSnack || 0);
      setDinner(existing.dinner || 0);
      setResponsible(existing.responsible || currentUserDisplayName);
      setNotes(existing.notes || '');
      setEditingMealId(existing.id);
    } else {
      setBreakfast(0);
      setLunch(0);
      setAfternoonSnack(0);
      setDinner(0);
      setResponsible(currentUserDisplayName);
      setNotes('');
      setEditingMealId(null);
    }
  }, [selectedDate, meals, currentUserDisplayName]);

  // Current calculated total for form
  const currentTotal = useMemo(() => {
    return (Number(breakfast) || 0) + (Number(lunch) || 0) + (Number(afternoonSnack) || 0) + (Number(dinner) || 0);
  }, [breakfast, lunch, afternoonSnack, dinner]);

  // KPIs
  const stats = useMemo(() => {
    const totalRecords = meals.length;
    const totalAllMeals = meals.reduce((sum, m) => sum + m.totalMeals, 0);
    const avgDailyMeals = totalRecords > 0 ? Math.round(totalAllMeals / totalRecords) : 0;
    
    // Total served today
    const todayRecord = meals.find((m) => m.date === todayStr);
    const todayTotal = todayRecord ? todayRecord.totalMeals : 0;

    // Averages by period
    const avgBreakfast = totalRecords > 0 ? Math.round(meals.reduce((sum, m) => sum + m.breakfast, 0) / totalRecords) : 0;
    const avgLunch = totalRecords > 0 ? Math.round(meals.reduce((sum, m) => sum + m.lunch, 0) / totalRecords) : 0;
    const avgSnack = totalRecords > 0 ? Math.round(meals.reduce((sum, m) => sum + m.afternoonSnack, 0) / totalRecords) : 0;
    const avgDinner = totalRecords > 0 ? Math.round(meals.reduce((sum, m) => sum + m.dinner, 0) / totalRecords) : 0;

    return {
      totalRecords,
      totalAllMeals,
      avgDailyMeals,
      todayTotal,
      avgBreakfast,
      avgLunch,
      avgSnack,
      avgDinner,
    };
  }, [meals, todayStr, currentTotal]);

  // Stepper helper
  const adjustCount = (setter: React.Dispatch<React.SetStateAction<number>>, delta: number) => {
    setter((prev) => Math.max(0, (Number(prev) || 0) + delta));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      toast.error('Por favor, informe uma data válida.');
      return;
    }
    if (!responsible.trim()) {
      toast.error('Informe o nome do responsável pelo registro.');
      return;
    }

    onSaveMealRecord({
      id: editingMealId || undefined,
      date: selectedDate,
      breakfast: Number(breakfast) || 0,
      lunch: Number(lunch) || 0,
      afternoonSnack: Number(afternoonSnack) || 0,
      dinner: Number(dinner) || 0,
      responsible: responsible.trim(),
      notes: notes.trim(),
    });

    toast.success(`Refeições do dia ${formatDateBr(selectedDate)} salvas com sucesso! (${currentTotal} refeições)`);
  };

  const handleEditRecord = (record: DailyMealRecord) => {
    setSelectedDate(record.date);
    setBreakfast(record.breakfast);
    setLunch(record.lunch);
    setAfternoonSnack(record.afternoonSnack);
    setDinner(record.dinner);
    setResponsible(record.responsible);
    setNotes(record.notes || '');
    setEditingMealId(record.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string, date: string) => {
    if (confirm(`Tem certeza que deseja excluir o registro de refeições de ${formatDateBr(date)}?`)) {
      onDeleteMealRecord(id);
      toast.success('Registro de refeição removido com sucesso!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered meal history
  const filteredMeals = useMemo(() => {
    if (!searchTerm.trim()) return meals;
    const term = searchTerm.toLowerCase();
    return meals.filter((m) => 
      m.date.includes(term) ||
      m.responsible.toLowerCase().includes(term) ||
      (m.notes && m.notes.toLowerCase().includes(term))
    );
  }, [meals, searchTerm]);

  function formatDateBr(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getDayOfWeekName(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      return days[date.getDay()];
    } catch {
      return '';
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Controle de Refeições"
        subtitle="Monitoramento diário de refeições servidas nos 4 turnos da Cozinha Cristolândia"
        badgeText="4 Refeições Diárias"
        badgeVariant="warning"
        actions={
          <Button
            variant="secondary"
            onClick={handlePrint}
            icon={<Printer className="w-4 h-4" />}
          >
            Imprimir Relatório
          </Button>
        }
      />

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-breakfast"
          label="☕ Café da Manhã"
          value={stats.avgBreakfast}
          unit="pessoas/dia"
          subtext="Média matinal (07:00)"
          icon={<Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          variant="default"
        />

        <StatCard
          id="stat-lunch"
          label="🍛 Almoço (Pico)"
          value={stats.avgLunch}
          unit="pessoas/dia"
          subtext="Maior demanda diária (12:00)"
          icon={<Utensils className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          variant="default"
        />

        <StatCard
          id="stat-snack"
          label="🥪 Lanche das 16h"
          value={stats.avgSnack}
          unit="pessoas/dia"
          subtext="Média da tarde (16:00)"
          icon={<SunMedium className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          variant="default"
        />

        <StatCard
          id="stat-dinner"
          label="🍲 Jantar"
          value={stats.avgDinner}
          unit="pessoas/dia"
          subtext="Média noturna (19:00)"
          icon={<Soup className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          variant="default"
        />
      </div>

      {/* MAIN FORM: FAST LAUNCHER CARD (Admin Only) */}
      {isAdmin && (
        <Card id="meal-form-card" className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Lançamento Diário de Refeições
                </h2>
                {editingMealId ? (
                  <Badge variant="warning">Editando Registro</Badge>
                ) : (
                  <Badge variant="success">Novo Lançamento</Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Selecione a data e informe a quantidade de pessoas que comeram em cada turno.
              </p>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Dia anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-bold text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  required
                />
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                  ({getDayOfWeekName(selectedDate)})
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Próximo dia"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {selectedDate !== todayStr && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="ml-1 px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-[10px] rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  Hoje
                </button>
              )}
            </div>
          </div>

          {/* 4 MEALS INTERACTIVE COUNTER CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Café da Manhã */}
            <div className="bg-amber-50/60 dark:bg-slate-800/60 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Café da Manhã
                  </h3>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">07:00 às 08:30</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => adjustCount(setBreakfast, -5)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount(setBreakfast, -1)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="w-20 text-center">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={breakfast}
                    onChange={(e) => setBreakfast(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/50 rounded-xl py-1 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">pessoas</span>
                </div>

                <button
                  type="button"
                  onClick={() => adjustCount(setBreakfast, 1)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount(setBreakfast, 5)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  +5
                </button>
              </div>
            </div>

            {/* 2. Almoço */}
            <div className="bg-emerald-50/60 dark:bg-slate-800/60 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Almoço (Principal)
                  </h3>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">11:30 às 13:00</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => adjustCount(setLunch, -5)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount(setLunch, -1)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="w-20 text-center">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={lunch}
                    onChange={(e) => setLunch(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-500/50 rounded-xl py-1 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">pessoas</span>
                </div>

                <button
                  type="button"
                  onClick={() => adjustCount(setLunch, 1)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount(setLunch, 5)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  +5
                </button>
              </div>
            </div>

            {/* 3. Lanche das 16h */}
            <div className="bg-orange-50/60 dark:bg-slate-800/60 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <SunMedium className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Lanche das 16h
                  </h3>
                  <p className="text-[10px] text-orange-700 dark:text-orange-400 font-medium">16:00 às 16:45</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => adjustCount(setAfternoonSnack, -5)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount(setAfternoonSnack, -1)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="w-20 text-center">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={afternoonSnack}
                    onChange={(e) => setAfternoonSnack(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-500/50 rounded-xl py-1 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">pessoas</span>
                </div>

                <button
                  type="button"
                  onClick={() => adjustCount(setAfternoonSnack, 1)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount(setAfternoonSnack, 5)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  +5
                </button>
              </div>
            </div>

            {/* 4. Jantar */}
            <div className="bg-blue-50/60 dark:bg-slate-800/60 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Soup className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Jantar
                  </h3>
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">19:00 às 20:00</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => adjustCount(setDinner, -5)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount(setDinner, -1)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="w-20 text-center">
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={dinner}
                    onChange={(e) => setDinner(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center text-xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-500/50 rounded-xl py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mt-0.5">pessoas</span>
                </div>

                <button
                  type="button"
                  onClick={() => adjustCount(setDinner, 1)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustCount(setDinner, 5)}
                  className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-black text-xs hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  +5
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM METADATA: RESPONSIBLE, NOTES & ACTION BUTTON */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Responsável pelo Lançamento:</span>
              </label>
              <input
                type="text"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Ex: Marconi Castro"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Observações do Dia (Cardápio / Eventos):</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Almoço especial de sábado / Visita voluntários"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-end gap-3">
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Total do Dia
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {currentTotal} <span className="text-xs font-medium text-amber-500">refeições</span>
                </span>
              </div>

              <Button
                variant="primary"
                onClick={handleSave}
                icon={<CheckCircle2 className="w-4 h-4" />}
                className="flex-1 py-2.5"
              >
                Salvar Refeições
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* HISTORICAL LOGS TABLE & SEARCH */}
      <Card id="meal-history-card" className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              <span>Histórico de Refeições Servidas</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registros diários organizados por data com contagem de cada turno
            </p>
          </div>

          <div className="w-full sm:w-64">
            <SearchInput
              id="meal-history-search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por data ou responsável..."
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 rounded-l-xl">Data / Dia</th>
                <th className="py-3 px-3 text-center">☕ Café</th>
                <th className="py-3 px-3 text-center">🍛 Almoço</th>
                <th className="py-3 px-3 text-center">🥪 Lanche 16h</th>
                <th className="py-3 px-3 text-center">🍲 Jantar</th>
                <th className="py-3 px-4 text-center font-black">Total Dia</th>
                <th className="py-3 px-4">Responsável & Observações</th>
                {isAdmin && <th className="py-3 px-4 text-right rounded-r-xl">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredMeals.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-400 italic">
                    Nenhum registro de refeição encontrado para os critérios pesquisados.
                  </td>
                </tr>
              ) : (
                filteredMeals.map((record) => {
                  const isToday = record.date === todayStr;
                  return (
                    <tr 
                      key={record.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isToday ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{formatDateBr(record.date)}</span>
                          {isToday && (
                            <Badge variant="warning">Hoje</Badge>
                          )}
                        </div>
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block">
                          {getDayOfWeekName(record.date)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                        {record.breakfast}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {record.lunch}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-orange-600 dark:text-orange-400">
                        {record.afternoonSnack}
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                        {record.dinner}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-amber-400 font-black rounded-lg text-xs border border-slate-700">
                          {record.totalMeals}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{record.responsible}</p>
                        {record.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">{record.notes}</p>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditRecord(record)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Editar este dia"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id, record.date)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Excluir registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
