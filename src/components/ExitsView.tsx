import React, { useState, useMemo } from 'react';
import { StockMovement, Product, Sector } from '../types';
import { UserRole } from '../firebase';
import { getTodayDateString } from '../utils/storage';
import { PageHeader } from './ui/PageHeader';
import { StatCard } from './ui/StatCard';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { SearchInput } from './ui/SearchInput';
import { EmptyState } from './ui/EmptyState';
import { ModalWrapper } from './ui/ModalWrapper';
import {
  ArrowUpRight,
  Plus,
  Calendar,
  Layers,
  Clock,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Building2,
  Utensils,
  UserCheck,
  TrendingDown,
  AlertTriangle,
  Flame,
  ChefHat,
} from 'lucide-react';

interface ExitsViewProps {
  movements: StockMovement[];
  products: Product[];
  userRole?: UserRole;
  onOpenNewExitModal: (product?: Product | null, defaultDate?: string) => void;
  onOpenKitModal: () => void;
  onOpenProductTimeline?: (productId: string) => void;
  onUpdateMovement?: (
    movementId: string,
    updatedData: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' }
  ) => Promise<void> | void;
  onDeleteMovement?: (movementId: string) => Promise<void> | void;
}

function formatDayLabel(dateStr: string): { label: string; isToday: boolean; isYesterday: boolean; dayNumStr: string } {
  if (!dateStr) return { label: 'Data Desconhecida', isToday: false, isYesterday: false, dayNumStr: '' };

  const todayStr = getTodayDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yYear = yesterday.getFullYear();
  const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
  const yDay = String(yesterday.getDate()).padStart(2, '0');
  const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);

    const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const longFormatted = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    if (dateStr === todayStr) {
      return { label: `Hoje — ${formattedDate} (${capitalizedDay})`, isToday: true, isYesterday: false, dayNumStr: formattedDate };
    }
    if (dateStr === yesterdayStr) {
      return { label: `Ontem — ${formattedDate} (${capitalizedDay})`, isToday: false, isYesterday: true, dayNumStr: formattedDate };
    }
    return { label: `${longFormatted} (${capitalizedDay})`, isToday: false, isYesterday: false, dayNumStr: formattedDate };
  }

  return { label: dateStr, isToday: false, isYesterday: false, dayNumStr: dateStr };
}

export const ExitsView: React.FC<ExitsViewProps> = ({
  movements,
  products,
  userRole = 'admin',
  onOpenNewExitModal,
  onOpenKitModal,
  onOpenProductTimeline,
  onUpdateMovement,
  onDeleteMovement,
}) => {
  const isAdmin = userRole === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Edit / Delete states
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<StockMovement>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingMovement, setDeletingMovement] = useState<StockMovement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter only 'saida' movements
  const exitMovements = useMemo(() => {
    return movements.filter((m) => m.type === 'saida');
  }, [movements]);

  // Sector list from movements
  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    exitMovements.forEach((m) => {
      if (m.sector) set.add(m.sector);
    });
    return Array.from(set);
  }, [exitMovements]);

  // KPIs
  const stats = useMemo(() => {
    const todayStr = getTodayDateString();
    const currentMonth = todayStr.substring(0, 7);

    const thisMonthExits = exitMovements.filter((m) => m.date && m.date.startsWith(currentMonth));
    const totalMonthQty = thisMonthExits.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
    const totalMonthCount = thisMonthExits.length;

    const kitchenExits = exitMovements.filter((m) => (m.sector || '').toLowerCase().includes('cozinha')).length;

    const todayQty = exitMovements
      .filter((m) => m.date === todayStr)
      .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

    const activeSectorsCount = new Set(exitMovements.map((m) => m.sector || 'Outros')).size;

    return {
      totalMonthQty,
      totalMonthCount,
      kitchenExits,
      todayQty,
      activeSectorsCount,
    };
  }, [exitMovements]);

  // Filtered exits
  const filteredExits = useMemo(() => {
    return exitMovements.filter((m) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const pName = (m.productName || '').toLowerCase();
        const sec = (m.sector || '').toLowerCase();
        const ret = (m.retrievedBy || '').toLowerCase();
        const del = (m.deliveredBy || '').toLowerCase();
        const notes = (m.notes || '').toLowerCase();
        if (!pName.includes(query) && !sec.includes(query) && !ret.includes(query) && !del.includes(query) && !notes.includes(query)) {
          return false;
        }
      }

      // Sector
      if (sectorFilter !== 'all') {
        if (m.sector !== sectorFilter) return false;
      }

      // Date
      if (dateFilter !== 'all') {
        const todayStr = getTodayDateString();
        if (dateFilter === 'today' && m.date !== todayStr) return false;
        if (dateFilter === 'yesterday') {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
          if (m.date !== yStr) return false;
        }
        if (dateFilter === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const minDateStr = sevenDaysAgo.toISOString().split('T')[0];
          if ((m.date || '') < minDateStr) return false;
        }
        if (dateFilter === '30days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const minDateStr = thirtyDaysAgo.toISOString().split('T')[0];
          if ((m.date || '') < minDateStr) return false;
        }
        if (dateFilter === 'custom' && customDate && m.date !== customDate) return false;
      }

      return true;
    });
  }, [exitMovements, searchTerm, sectorFilter, dateFilter, customDate]);

  // Group by Date (descending)
  const groupedExits = useMemo(() => {
    const map: Record<string, StockMovement[]> = {};
    filteredExits.forEach((m) => {
      const d = m.date || 'Desconhecido';
      if (!map[d]) map[d] = [];
      map[d].push(m);
    });

    const sortedDates = Object.keys(map).sort((a, b) => b.localeCompare(a));
    return sortedDates.map((d) => {
      const dayItems = map[d];
      const totalVolume = dayItems.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
      return {
        date: d,
        items: dayItems,
        totalVolume,
        dayMeta: formatDayLabel(d),
      };
    });
  }, [filteredExits]);

  const toggleDay = (d: string) => {
    setCollapsedDays((prev) => ({ ...prev, [d]: !prev[d] }));
  };

  const handleStartEdit = (movement: StockMovement) => {
    setEditingMovement(movement);
    setEditFormData({
      productId: movement.productId,
      productName: movement.productName,
      unit: movement.unit,
      type: 'saida',
      quantity: movement.quantity,
      date: movement.date,
      time: movement.time || '08:00',
      sector: movement.sector || 'Cozinha',
      retrievedBy: movement.retrievedBy || '',
      deliveredBy: movement.deliveredBy || '',
      notes: movement.notes || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement || !onUpdateMovement) return;

    try {
      setIsSavingEdit(true);
      await onUpdateMovement(editingMovement.id, {
        productId: editFormData.productId || editingMovement.productId,
        quantity: Number(editFormData.quantity) || 0,
        type: 'saida',
        productName: editFormData.productName || editingMovement.productName,
        unit: editFormData.unit || editingMovement.unit,
        date: editFormData.date || editingMovement.date,
        time: editFormData.time || editingMovement.time,
        sector: editFormData.sector as Sector,
        retrievedBy: editFormData.retrievedBy,
        deliveredBy: editFormData.deliveredBy,
        notes: editFormData.notes,
      });
      setEditingMovement(null);
    } catch (err: any) {
      alert('Erro ao salvar alteração: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMovement || !onDeleteMovement) return;

    try {
      setIsDeleting(true);
      await onDeleteMovement(deletingMovement.id);
      setDeletingMovement(null);
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Saídas do Estoque"
        subtitle="Entrega e consumo de mantimentos para Cozinha, Casas Missionárias e demais setores da Cristolândia"
        badgeText="Saídas & Consumo"
        badgeVariant="danger"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={onOpenKitModal}
              icon={<ChefHat className="w-4 h-4 text-emerald-600" />}
            >
              {isAdmin ? '+ Kit Cozinha Diário' : 'Ver Kit Cozinha'}
            </Button>
            {isAdmin && (
              <Button
                variant="danger"
                onClick={() => onOpenNewExitModal(null)}
                icon={<Plus className="w-4 h-4" />}
              >
                + Nova Saída
              </Button>
            )}
          </div>
        }
      />

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-month-exits"
          label="Saídas do Mês"
          value={stats.totalMonthCount}
          unit="retiradas"
          subtext={`${stats.totalMonthQty.toLocaleString('pt-BR')} volumes entregues`}
          icon={<ArrowUpRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
          variant="default"
        />

        <StatCard
          id="stat-today-exits"
          label="Consumo de Hoje"
          value={stats.todayQty}
          unit="vol."
          subtext="Volume baixado na data"
          icon={<Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          variant="default"
        />

        <StatCard
          id="stat-kitchen-exits"
          label="Demandas da Cozinha"
          value={stats.kitchenExits}
          unit="itens"
          subtext="Preparação dos 4 turnos diários"
          icon={<Utensils className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          variant="default"
        />

        <StatCard
          id="stat-active-sectors"
          label="Setores Atendidos"
          value={stats.activeSectorsCount}
          unit="destinos"
          subtext="Cozinha, casas e eventos"
          icon={<Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          variant="default"
        />
      </div>

      {/* Filter & Search Bar */}
      <Card id="exits-filter-card" className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por alimento, quem retirou, setor ou observação..."
          />

          {/* Sector Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
              <Building2 className="w-3.5 h-3.5" />
              Setor:
            </span>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="all">🏢 Todos os Setores ({exitMovements.length})</option>
              <option value="Cozinha">Cozinha</option>
              <option value="Padaria">Padaria</option>
              <option value="Casa Missionária Masculina">Casa Missionária Masculina</option>
              <option value="Casa Missionária Feminina">Casa Missionária Feminina</option>
              <option value="Administração">Administração</option>
              <option value="Casa da Coordenação (Huberto & Débora)">Casa da Coordenação (Huberto & Débora)</option>
              <option value="Casa Lana & Joabe (Cesta Básica)">Casa Lana & Joabe (Cesta Básica)</option>
              <option value="Casa Marcos & Fabíola (Cesta Básica)">Casa Marcos & Fabíola (Cesta Básica)</option>
              <option value="Casa Tainã (Cesta Básica)">Casa Tainã (Cesta Básica)</option>
              <option value="Eventos">Eventos</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        </div>

        {/* Date presets row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Período:
            </span>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="all">📅 Todo o Histórico</option>
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="custom">Data Específica...</option>
            </select>

            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">
              <strong>{filteredExits.length}</strong> saídas encontradas
            </span>
          </div>
        </div>
      </Card>

      {/* Grouped Day-by-Day Cards List */}
      <div className="space-y-4">
        {groupedExits.map((group) => {
          const isCollapsed = !!collapsedDays[group.date];

          return (
            <Card
              key={group.date}
              className={`overflow-hidden transition-all p-0 ${
                group.dayMeta.isToday
                  ? 'border-rose-300 dark:border-rose-800 ring-1 ring-rose-500/20'
                  : ''
              }`}
            >
              {/* Day Header Banner */}
              <div
                onClick={() => toggleDay(group.date)}
                className={`p-4 flex items-center justify-between cursor-pointer select-none transition-colors ${
                  group.dayMeta.isToday
                    ? 'bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100/70 dark:hover:bg-rose-950/60'
                    : 'bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      group.dayMeta.isToday
                        ? 'bg-rose-600 text-white font-bold shadow-2xs'
                        : group.dayMeta.isYesterday
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                        {group.dayMeta.label}
                      </h3>

                      {group.dayMeta.isToday && (
                        <Badge variant="danger" size="sm">
                          Hoje
                        </Badge>
                      )}

                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        ({group.items.length} registro{group.items.length > 1 ? 's' : ''})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <span className="text-rose-600 dark:text-rose-400 font-bold">
                        -{group.totalVolume.toLocaleString('pt-BR')} volumes consumidos
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewExitModal(null, group.date);
                      }}
                      className="px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      title={`Adicionar saída na data ${group.dayMeta.dayNumStr || group.date}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">+ Saída no dia</span>
                      <span className="sm:hidden">+ Saída</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-xs font-semibold hidden md:inline">
                      {isCollapsed ? 'Ver Detalhes' : 'Recolher'}
                    </span>
                    {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Items Table / List */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
                  {group.items.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl shrink-0 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => onOpenProductTimeline?.(m.productId)}
                              className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              {m.productName}
                            </button>

                            <Badge variant="danger" size="sm">
                              {m.sector || 'Cozinha'}
                            </Badge>

                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {m.time || '08:00'}
                            </span>
                          </div>

                          <div className="text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap text-xs">
                            <span>
                              Retirado por: <strong>{m.retrievedBy || 'Não informado'}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Entregue por: <strong>{m.deliveredBy || 'Marconi Castro'}</strong>
                            </span>
                          </div>

                          {m.notes && (
                            <p className="text-slate-500 dark:text-slate-400 italic text-[11px]">
                              "{m.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
                        <div className="text-right">
                          <span className="text-base sm:text-lg font-black block text-rose-600 dark:text-rose-400">
                            -{m.quantity} {m.unit}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {m.id.substring(0, 8)}
                          </span>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-3">
                            {onUpdateMovement && (
                              <button
                                onClick={() => handleStartEdit(m)}
                                title="Editar esta saída"
                                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}

                            {onDeleteMovement && (
                              <button
                                onClick={() => setDeletingMovement(m)}
                                title="Excluir saída"
                                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}

        {groupedExits.length === 0 && (
          <EmptyState
            icon={<Layers className="w-10 h-10" />}
            title="Nenhuma saída encontrada"
            description="Nenhum registro de saída corresponde aos filtros ou período selecionados."
            action={
              isAdmin ? (
                <Button
                  variant="danger"
                  onClick={() => onOpenNewExitModal(null)}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Registrar Primeira Saída
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      {/* EDIT MODAL */}
      <ModalWrapper
        isOpen={!!editingMovement}
        onClose={() => setEditingMovement(null)}
        title="Editar Registro de Saída"
        maxWidth="max-w-md"
      >
        {editingMovement && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Produto / Alimento
              </label>
              <input
                type="text"
                value={editFormData.productName || ''}
                disabled
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quantidade ({editFormData.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={editFormData.quantity ?? ''}
                  onChange={(e) => setEditFormData({ ...editFormData, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Setor de Destino
                </label>
                <select
                  value={editFormData.sector || 'Cozinha'}
                  onChange={(e) => setEditFormData({ ...editFormData, sector: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="Cozinha">Cozinha</option>
                  <option value="Padaria">Padaria</option>
                  <option value="Casa Missionária Masculina">Casa Missionária Masculina</option>
                  <option value="Casa Missionária Feminina">Casa Missionária Feminina</option>
                  <option value="Administração">Administração</option>
                  <option value="Casa da Coordenação (Huberto & Débora)">Casa da Coordenação (Huberto & Débora)</option>
                  <option value="Casa Lana & Joabe (Cesta Básica)">Casa Lana & Joabe (Cesta Básica)</option>
                  <option value="Casa Marcos & Fabíola (Cesta Básica)">Casa Marcos & Fabíola (Cesta Básica)</option>
                  <option value="Casa Tainã (Cesta Básica)">Casa Tainã (Cesta Básica)</option>
                  <option value="Eventos">Eventos</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={editFormData.date || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hora
                </label>
                <input
                  type="time"
                  value={editFormData.time || '08:00'}
                  onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Retirado por
              </label>
              <input
                type="text"
                value={editFormData.retrievedBy || ''}
                onChange={(e) => setEditFormData({ ...editFormData, retrievedBy: e.target.value })}
                placeholder="Ex: Cozinheiro, Missionário..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Entregue por
              </label>
              <input
                type="text"
                value={editFormData.deliveredBy || ''}
                onChange={(e) => setEditFormData({ ...editFormData, deliveredBy: e.target.value })}
                placeholder="Ex: Marconi Castro"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Observações
              </label>
              <textarea
                rows={2}
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Motivo ou cardápio..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditingMovement(null)}>
                Cancelar
              </Button>
              <Button variant="danger" type="submit" loading={isSavingEdit}>
                Salvar Alterações
              </Button>
            </div>
          </form>
        )}
      </ModalWrapper>

      {/* DELETE CONFIRMATION MODAL */}
      <ModalWrapper
        isOpen={!!deletingMovement}
        onClose={() => setDeletingMovement(null)}
        title="Confirmar Exclusão de Saída"
        maxWidth="max-w-md"
      >
        {deletingMovement && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <p className="font-extrabold">Atenção ao excluir movimentação contábil!</p>
                <p>
                  Você está prestes a excluir a saída de <strong>{deletingMovement.quantity} {deletingMovement.unit}</strong> de <strong>{deletingMovement.productName}</strong> destinada a <strong>{deletingMovement.sector}</strong> em {deletingMovement.date}.
                </p>
                <p className="font-bold">A quantidade será automaticamente devolvida ao saldo do produto.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingMovement(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
                Sim, Excluir Saída
              </Button>
            </div>
          </div>
        )}
      </ModalWrapper>
    </div>
  );
};
