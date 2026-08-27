import React, { useState, useMemo } from 'react';
import { StockMovement, Product, EntryType } from '../types';
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
  ArrowDownLeft,
  Plus,
  Calendar,
  Layers,
  Clock,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  HeartHandshake,
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Save,
  Filter,
} from 'lucide-react';

interface EntriesViewProps {
  movements: StockMovement[];
  products: Product[];
  userRole?: UserRole;
  onOpenNewEntryModal: (product?: Product | null, defaultDate?: string) => void;
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

export const EntriesView: React.FC<EntriesViewProps> = ({
  movements,
  products,
  userRole = 'admin',
  onOpenNewEntryModal,
  onOpenProductTimeline,
  onUpdateMovement,
  onDeleteMovement,
}) => {
  const isAdmin = userRole === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState<'all' | 'Compra' | 'Doação' | 'Outros'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Edit / Delete states
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<StockMovement>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingMovement, setDeletingMovement] = useState<StockMovement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter only 'entrada' movements
  const entryMovements = useMemo(() => {
    return movements.filter((m) => m.type === 'entrada');
  }, [movements]);

  // KPIs
  const stats = useMemo(() => {
    const todayStr = getTodayDateString();
    const currentMonth = todayStr.substring(0, 7);

    const thisMonthEntries = entryMovements.filter((m) => m.date && m.date.startsWith(currentMonth));
    const totalMonthQty = thisMonthEntries.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
    const totalMonthCount = thisMonthEntries.length;

    const donationsCount = entryMovements.filter((m) => m.entryType === 'Doação').length;
    const purchasesCount = entryMovements.filter((m) => m.entryType === 'Compra').length;

    const todayQty = entryMovements
      .filter((m) => m.date === todayStr)
      .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

    const distinctProducts = new Set(entryMovements.map((m) => m.productId)).size;

    return {
      totalMonthQty,
      totalMonthCount,
      donationsCount,
      purchasesCount,
      todayQty,
      distinctProducts,
    };
  }, [entryMovements]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entryMovements.filter((m) => {
      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const pName = (m.productName || '').toLowerCase();
        const sup = (m.supplierOrDonor || '').toLowerCase();
        const rec = (m.receivedBy || '').toLowerCase();
        const notes = (m.notes || '').toLowerCase();
        if (!pName.includes(query) && !sup.includes(query) && !rec.includes(query) && !notes.includes(query)) {
          return false;
        }
      }

      // Entry Type
      if (entryTypeFilter !== 'all') {
        if (entryTypeFilter === 'Outros') {
          if (m.entryType === 'Compra' || m.entryType === 'Doação') return false;
        } else if (m.entryType !== entryTypeFilter) {
          return false;
        }
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
  }, [entryMovements, searchTerm, entryTypeFilter, dateFilter, customDate]);

  // Group by Date (descending)
  const groupedEntries = useMemo(() => {
    const map: Record<string, StockMovement[]> = {};
    filteredEntries.forEach((m) => {
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
  }, [filteredEntries]);

  const toggleDay = (d: string) => {
    setCollapsedDays((prev) => ({ ...prev, [d]: !prev[d] }));
  };

  const handleStartEdit = (movement: StockMovement) => {
    setEditingMovement(movement);
    setEditFormData({
      productId: movement.productId,
      productName: movement.productName,
      unit: movement.unit,
      type: 'entrada',
      quantity: movement.quantity,
      date: movement.date,
      time: movement.time || '08:00',
      entryType: movement.entryType || 'Compra',
      supplierOrDonor: movement.supplierOrDonor || '',
      receivedBy: movement.receivedBy || '',
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
        type: 'entrada',
        productName: editFormData.productName || editingMovement.productName,
        unit: editFormData.unit || editingMovement.unit,
        date: editFormData.date || editingMovement.date,
        time: editFormData.time || editingMovement.time,
        entryType: editFormData.entryType as EntryType,
        supplierOrDonor: editFormData.supplierOrDonor,
        receivedBy: editFormData.receivedBy,
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
        title="Entradas de Estoque"
        subtitle="Rastreabilidade e registro contábil de compras, doações e mantimentos recebidos na Cristolândia"
        badgeText="Entradas & Doações"
        badgeVariant="success"
        actions={
          isAdmin && (
            <Button
              variant="primary"
              onClick={() => onOpenNewEntryModal(null)}
              icon={<Plus className="w-4 h-4" />}
            >
              + Nova Entrada
            </Button>
          )
        }
      />

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-month-entries"
          label="Entradas do Mês"
          value={stats.totalMonthCount}
          unit="lotes"
          subtext={`${stats.totalMonthQty.toLocaleString('pt-BR')} volumes recebidos`}
          icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          variant="default"
        />

        <StatCard
          id="stat-today-entries"
          label="Recebidos Hoje"
          value={stats.todayQty}
          unit="vol."
          subtext="Volume registrado no dia"
          icon={<Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          variant="default"
        />

        <StatCard
          id="stat-donations"
          label="Doações Recebidas"
          value={stats.donationsCount}
          unit="registros"
          subtext="Apoio de parceiros e igrejas"
          icon={<HeartHandshake className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          variant="default"
        />

        <StatCard
          id="stat-purchases"
          label="Compras Diretas"
          value={stats.purchasesCount}
          unit="registros"
          subtext="Aquisições com notas fiscais"
          icon={<ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          variant="default"
        />
      </div>

      {/* Filter & Search Bar */}
      <Card id="entries-filter-card" className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por alimento, fornecedor/doador ou notas..."
          />

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <button
              onClick={() => setEntryTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                entryTypeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todas ({entryMovements.length})
            </button>
            <button
              onClick={() => setEntryTypeFilter('Compra')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                entryTypeFilter === 'Compra'
                  ? 'bg-amber-500 text-slate-950 shadow-2xs'
                  : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              Compras
            </button>
            <button
              onClick={() => setEntryTypeFilter('Doação')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                entryTypeFilter === 'Doação'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-purple-600'
              }`}
            >
              Doações
            </button>
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
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
              <strong>{filteredEntries.length}</strong> entradas encontradas
            </span>
          </div>
        </div>
      </Card>

      {/* Grouped Day-by-Day Cards List */}
      <div className="space-y-4">
        {groupedEntries.map((group) => {
          const isCollapsed = !!collapsedDays[group.date];

          return (
            <Card
              key={group.date}
              className={`overflow-hidden transition-all p-0 ${
                group.dayMeta.isToday
                  ? 'border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-500/20'
                  : ''
              }`}
            >
              {/* Day Header Banner */}
              <div
                onClick={() => toggleDay(group.date)}
                className={`p-4 flex items-center justify-between cursor-pointer select-none transition-colors ${
                  group.dayMeta.isToday
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/60'
                    : 'bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      group.dayMeta.isToday
                        ? 'bg-emerald-600 text-white font-bold shadow-2xs'
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
                        <Badge variant="emerald" size="sm">
                          Hoje
                        </Badge>
                      )}

                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        ({group.items.length} registro{group.items.length > 1 ? 's' : ''})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        +{group.totalVolume.toLocaleString('pt-BR')} volumes recebidos
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNewEntryModal(null, group.date);
                      }}
                      className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                      title={`Adicionar entrada na data ${group.dayMeta.dayNumStr || group.date}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">+ Entrada no dia</span>
                      <span className="sm:hidden">+ Entrada</span>
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
                        <div className="p-2.5 rounded-xl shrink-0 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <ArrowDownLeft className="w-4 h-4" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => onOpenProductTimeline?.(m.productId)}
                              className="font-extrabold text-sm text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                            >
                              {m.productName}
                            </button>

                            <Badge variant={m.entryType === 'Doação' ? 'purple' : 'emerald'} size="sm">
                              {m.entryType || 'Compra'}
                            </Badge>

                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {m.time || '08:00'}
                            </span>
                          </div>

                          <div className="text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap text-xs">
                            <span>
                              Fornecedor/Doador: <strong>{m.supplierOrDonor || 'Não informado'}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Recebido por: <strong>{m.receivedBy || 'Marconi Castro'}</strong>
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
                          <span className="text-base sm:text-lg font-black block text-emerald-600 dark:text-emerald-400">
                            +{m.quantity} {m.unit}
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
                                title="Editar esta entrada"
                                className="p-1.5 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}

                            {onDeleteMovement && (
                              <button
                                onClick={() => setDeletingMovement(m)}
                                title="Excluir entrada"
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

        {groupedEntries.length === 0 && (
          <EmptyState
            icon={<Layers className="w-10 h-10" />}
            title="Nenhuma entrada encontrada"
            description="Nenhum registro de entrada corresponde aos filtros ou período selecionados."
            action={
              isAdmin ? (
                <Button
                  variant="primary"
                  onClick={() => onOpenNewEntryModal(null)}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Registrar Primeira Entrada
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
        title="Editar Registro de Entrada"
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
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Entrada
                </label>
                <select
                  value={editFormData.entryType || 'Compra'}
                  onChange={(e) => setEditFormData({ ...editFormData, entryType: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Compra">Compra</option>
                  <option value="Doação">Doação</option>
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
                Fornecedor ou Doador
              </label>
              <input
                type="text"
                value={editFormData.supplierOrDonor || ''}
                onChange={(e) => setEditFormData({ ...editFormData, supplierOrDonor: e.target.value })}
                placeholder="Ex: Atacadão, Ceasa, Igreja Batista..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Recebido por
              </label>
              <input
                type="text"
                value={editFormData.receivedBy || ''}
                onChange={(e) => setEditFormData({ ...editFormData, receivedBy: e.target.value })}
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
                placeholder="Detalhes adicionais ou nota fiscal..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditingMovement(null)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" loading={isSavingEdit}>
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
        title="Confirmar Exclusão"
        maxWidth="max-w-md"
      >
        {deletingMovement && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <p className="font-extrabold">Atenção ao excluir movimentação contábil!</p>
                <p>
                  Você está prestes a excluir a entrada de <strong>{deletingMovement.quantity} {deletingMovement.unit}</strong> de <strong>{deletingMovement.productName}</strong> registrada em {deletingMovement.date}.
                </p>
                <p className="font-bold">O estoque do produto será automaticamente reajustado.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingMovement(null)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
                Sim, Excluir Entrada
              </Button>
            </div>
          </div>
        )}
      </ModalWrapper>
    </div>
  );
};
