import React, { useState, useMemo, useEffect } from 'react';
import { StockMovement, Product, Sector, EntryType } from '../types';
import { UserRole } from '../firebase';
import { getTodayDateString } from '../utils/storage';
import { toast } from '../utils/toast';
import { soundFeedback } from '../utils/audioFeedback';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Layers,
  CalendarDays,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Save,
  CheckCircle2,
  Plus,
  Scale,
} from 'lucide-react';

interface MovementsHistoryProps {
  movements: StockMovement[];
  products?: Product[];
  userRole?: UserRole;
  onOpenProductTimeline?: (productId: string) => void;
  onOpenEntryForDate?: (dateStr: string) => void;
  onOpenExitForDate?: (dateStr: string) => void;
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

export const MovementsHistory: React.FC<MovementsHistoryProps> = ({
  movements,
  products = [],
  userRole = 'admin',
  onOpenProductTimeline,
  onOpenEntryForDate,
  onOpenExitForDate,
  onUpdateMovement,
  onDeleteMovement,
}) => {
  const isAdmin = userRole === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrada' | 'saida' | 'ajuste'>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // 'all', 'today', 'yesterday', '7days', '30days', or custom
  const [customDate, setCustomDate] = useState<string>('');

  // Pagination state (paginates day groups to optimize DOM rendering and performance)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10); // 10 dias por página por padrão

  // Track collapsed days (by default all days open)
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Editing state
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<StockMovement>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Deleting state
  const [deletingMovement, setDeletingMovement] = useState<StockMovement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, sectorFilter, dateFilter, customDate, pageSize]);

  const toggleDayCollapse = (dateStr: string) => {
    soundFeedback.play('click');
    setCollapsedDays((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  const collapseAllDays = () => {
    soundFeedback.play('click');
    const newCollapsed: Record<string, boolean> = {};
    groupedMovements.forEach((g) => {
      newCollapsed[g.date] = true;
    });
    setCollapsedDays(newCollapsed);
  };

  const expandAllDays = () => {
    soundFeedback.play('click');
    setCollapsedDays({});
  };

  // Open Edit Modal
  const handleStartEdit = (movement: StockMovement) => {
    setEditingMovement(movement);
    setEditFormData({
      productId: movement.productId,
      productName: movement.productName,
      unit: movement.unit,
      type: movement.type,
      quantity: movement.quantity,
      date: movement.date,
      time: movement.time || '08:00',
      entryType: movement.entryType || 'Compra',
      supplierOrDonor: movement.supplierOrDonor || '',
      receivedBy: movement.receivedBy || '',
      sector: movement.sector || 'Cozinha',
      retrievedBy: movement.retrievedBy || '',
      deliveredBy: movement.deliveredBy || '',
      notes: movement.notes || '',
    });
  };

  // Submit Edit
  const handleSaveEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement || !onUpdateMovement) return;

    if (!editFormData.productId) {
      toast.error('Selecione um produto.');
      return;
    }

    if (!editFormData.quantity || Number(editFormData.quantity) <= 0) {
      toast.error('Informe uma quantidade válida maior que zero.');
      return;
    }

    try {
      setIsSavingEdit(true);
      await onUpdateMovement(editingMovement.id, {
        productId: editFormData.productId,
        quantity: Number(editFormData.quantity),
        type: editFormData.type as 'entrada' | 'saida',
        date: editFormData.date || editingMovement.date,
        time: editFormData.time || editingMovement.time,
        entryType: editFormData.entryType as EntryType,
        supplierOrDonor: editFormData.supplierOrDonor,
        receivedBy: editFormData.receivedBy,
        sector: editFormData.sector as Sector,
        retrievedBy: editFormData.retrievedBy,
        deliveredBy: editFormData.deliveredBy,
        notes: editFormData.notes,
      });

      toast.success('Movimentação atualizada com sucesso!');
      setEditingMovement(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar alteração');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Submit Delete
  const handleConfirmDelete = async () => {
    if (!deletingMovement || !onDeleteMovement) return;
    try {
      setIsDeleting(true);
      await onDeleteMovement(deletingMovement.id);
      toast.success('Movimentação excluída com sucesso!');
      setDeletingMovement(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir movimentação');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter movements
  const filteredMovements = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return movements.filter((m) => {
      // Search
      const matchesSearch =
        m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.supplierOrDonor && m.supplierOrDonor.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.retrievedBy && m.retrievedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.deliveredBy && m.deliveredBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.notes && m.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Type & Sector
      const matchesType = typeFilter === 'all' || m.type === typeFilter;
      const matchesSector =
        sectorFilter === 'all' ||
        m.sector === sectorFilter ||
        (sectorFilter === 'Casa Missionária Masculina' && (m.sector === 'Casa Masculina' || m.sector === 'Casa Missionária Masculina')) ||
        (sectorFilter === 'Casa Missionária Feminina' && (m.sector === 'Casa Feminina' || m.sector === 'Casa Missionária Feminina'));

      // Date filter
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = m.date === todayStr;
      } else if (dateFilter === 'yesterday') {
        matchesDate = m.date === yesterdayStr;
      } else if (dateFilter === '7days') {
        matchesDate = new Date(m.date) >= sevenDaysAgo;
      } else if (dateFilter === '30days') {
        matchesDate = new Date(m.date) >= thirtyDaysAgo;
      } else if (dateFilter === 'custom' && customDate) {
        matchesDate = m.date === customDate;
      }

      return matchesSearch && matchesType && matchesSector && matchesDate;
    });
  }, [movements, searchTerm, typeFilter, sectorFilter, dateFilter, customDate]);

  // Group filtered movements by Date (descending)
  const groupedMovements = useMemo(() => {
    const groupsMap: Record<string, StockMovement[]> = {};

    filteredMovements.forEach((m) => {
      const d = m.date || 'Desconhecido';
      if (!groupsMap[d]) {
        groupsMap[d] = [];
      }
      groupsMap[d].push(m);
    });

    // Sort dates in descending order (newest date first)
    const sortedDates = Object.keys(groupsMap).sort((a, b) => b.localeCompare(a));

    return sortedDates.map((dateKey) => {
      const dayMovs = groupsMap[dateKey];
      const entriesVolume = dayMovs.filter((m) => m.type === 'entrada').reduce((acc, m) => acc + m.quantity, 0);
      const exitsVolume = dayMovs.filter((m) => m.type === 'saida').reduce((acc, m) => acc + m.quantity, 0);
      const entriesCount = dayMovs.filter((m) => m.type === 'entrada').length;
      const exitsCount = dayMovs.filter((m) => m.type === 'saida').length;

      return {
        date: dateKey,
        movements: dayMovs,
        entriesVolume,
        exitsVolume,
        entriesCount,
        exitsCount,
        dayMeta: formatDayLabel(dateKey),
      };
    });
  }, [filteredMovements]);

  const totalEntriesVolume = filteredMovements
    .filter((m) => m.type === 'entrada')
    .reduce((acc, m) => acc + m.quantity, 0);

  const totalExitsVolume = filteredMovements
    .filter((m) => m.type === 'saida')
    .reduce((acc, m) => acc + m.quantity, 0);

  // Paginação segura dos grupos de dias
  const totalPages = pageSize > 0 ? Math.ceil(groupedMovements.length / pageSize) || 1 : 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedGroupedMovements = useMemo(() => {
    if (pageSize <= 0) return groupedMovements;
    const start = (safePage - 1) * pageSize;
    return groupedMovements.slice(start, start + pageSize);
  }, [groupedMovements, safePage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por produto, fornecedor, quem retirou ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  soundFeedback.play('click');
                  setTypeFilter('all');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({movements.length})
              </button>
              <button
                onClick={() => {
                  soundFeedback.play('click');
                  setTypeFilter('entrada');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  typeFilter === 'entrada' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                + Entradas
              </button>
              <button
                onClick={() => {
                  soundFeedback.play('click');
                  setTypeFilter('saida');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  typeFilter === 'saida' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-amber-600'
                }`}
              >
                - Saídas
              </button>
              <button
                onClick={() => {
                  soundFeedback.play('click');
                  setTypeFilter('ajuste');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  typeFilter === 'ajuste' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-purple-600'
                }`}
              >
                ⚖️ Ajustes
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Sector & Date Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Sector Dropdown */}
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">🏢 Todos os Setores</option>
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

            {/* Date Preset Selector */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">📅 Todas as Datas</option>
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="custom">Escolher Data...</option>
            </select>

            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-900 dark:text-white"
              />
            )}
          </div>

          {/* Expand/Collapse All buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={expandAllDays}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Expandir Dias
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              onClick={collapseAllDays}
              className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
            >
              Recolher Todos
            </button>
          </div>
        </div>
      </div>

      {/* Summary Volume Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          <span>
            Total Filtrado: <strong>{filteredMovements.length}</strong> registro(s) distribuídos em{' '}
            <strong>{groupedMovements.length}</strong> dia(s)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
            + {totalEntriesVolume} vol. em entradas
          </span>
          <span className="text-amber-600 dark:text-amber-400 font-extrabold bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
            - {totalExitsVolume} vol. em saídas
          </span>
        </div>
      </div>

      {/* Grouped Day-by-Day Cards List */}
      <div className="space-y-4">
        {paginatedGroupedMovements.map((group) => {
          const isCollapsed = !!collapsedDays[group.date];

          return (
            <div
              key={group.date}
              className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm transition-all ${
                group.dayMeta.isToday
                  ? 'border-blue-300 dark:border-blue-800/80 ring-1 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Day Header Banner / Accordion Control */}
              <div
                onClick={() => toggleDayCollapse(group.date)}
                className={`p-4 flex items-center justify-between cursor-pointer select-none transition-colors ${
                  group.dayMeta.isToday
                    ? 'bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100/60 dark:hover:bg-blue-950/60'
                    : 'bg-slate-50/80 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      group.dayMeta.isToday
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                        : group.dayMeta.isYesterday
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600 text-white animate-pulse">
                          Hoje
                        </span>
                      )}

                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        ({group.movements.length} movimentação{group.movements.length > 1 ? 'ões' : ''})
                      </span>
                    </div>

                    {/* Day sub-total statistics */}
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      {group.entriesCount > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          + {group.entriesVolume} vol. ({group.entriesCount} entrada{group.entriesCount > 1 ? 's' : ''})
                        </span>
                      )}

                      {group.exitsCount > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          - {group.exitsVolume} vol. ({group.exitsCount} saída{group.exitsCount > 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {(onOpenEntryForDate || onOpenExitForDate) && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {onOpenEntryForDate && (
                        <button
                          onClick={() => onOpenEntryForDate(group.date)}
                          className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          title={`Adicionar lançamento de Entrada no dia ${group.dayMeta.dayNumStr || group.date}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">+ Entrada no dia</span>
                          <span className="sm:hidden">+ Entrada</span>
                        </button>
                      )}

                      {onOpenExitForDate && (
                        <button
                          onClick={() => onOpenExitForDate(group.date)}
                          className="px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          title={`Adicionar lançamento de Saída no dia ${group.dayMeta.dayNumStr || group.date}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">+ Saída no dia</span>
                          <span className="sm:hidden">+ Saída</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-xs font-semibold hidden md:inline">
                      {isCollapsed ? 'Ver Detalhes' : 'Recolher'}
                    </span>
                    {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Day Movements List */}
              {!isCollapsed && (
                <div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
                    {group.movements.map((m) => {
                    const isEntry = m.type === 'entrada';
                    const isAjuste = m.type === 'ajuste';
                    return (
                      <div
                        key={m.id}
                        className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          isAjuste ? 'bg-purple-50/20 dark:bg-purple-950/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 ${
                              isAjuste
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                                : isEntry
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {isAjuste ? (
                              <Scale className="w-4 h-4" />
                            ) : isEntry ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => onOpenProductTimeline?.(m.productId)}
                                className="font-black text-sm text-slate-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer"
                              >
                                {m.productName}
                              </button>

                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isAjuste
                                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                    : isEntry
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {isAjuste
                                  ? 'AJUSTE DE INVENTÁRIO'
                                  : isEntry
                                  ? `ENTRADA (${m.entryType || 'Compra'})`
                                  : `SAÍDA: ${m.sector}`}
                              </span>

                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                🕒 {m.time || '00:00'}
                              </span>

                              {m.isCompensated && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                                  ⚠️ ESTORNADA / COMPENSADA
                                </span>
                              )}

                              {m.movementRole === 'compensation' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  ↩️ LANÇAMENTO COMPENSATÓRIO
                                </span>
                              )}
                            </div>

                            <div className="text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap text-xs">
                              {isAjuste ? (
                                <>
                                  <span>Motivo: <strong>{m.reason || 'Conferência física'}</strong></span>
                                  <span>• Responsável: <strong>{m.responsible || 'Administrador'}</strong></span>
                                  {m.previousStock !== undefined && m.physicalStock !== undefined && (
                                    <span className="text-[11px] text-slate-500">
                                      (De {m.previousStock} {m.unit} para {m.physicalStock} {m.unit})
                                    </span>
                                  )}
                                </>
                              ) : isEntry ? (
                                <>
                                  <span>Fornecedor/Doador: <strong>{m.supplierOrDonor || 'Não especificado'}</strong></span>
                                  <span>• Recebido por: <strong>{m.receivedBy || 'Marconi Castro'}</strong></span>
                                </>
                              ) : (
                                <>
                                  <span>Retirado por: <strong>{m.retrievedBy || 'Não especificado'}</strong></span>
                                  <span>• Entregue por: <strong>{m.deliveredBy || 'Marconi Castro'}</strong></span>
                                </>
                              )}
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
                            <span
                              className={`text-base sm:text-lg font-black block ${
                                isAjuste
                                  ? 'text-purple-600 dark:text-purple-400'
                                  : isEntry
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {isAjuste
                                ? `${(m.difference || 0) > 0 ? '+' : ''}${m.difference !== undefined ? m.difference : m.quantity} ${m.unit}`
                                : `${isEntry ? '+' : '-'}${m.quantity} ${m.unit}`}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ID: {m.id.substring(0, 12)}
                            </span>
                          </div>


                          {/* Actions: Edit & Delete (Admin Only) */}
                          {isAdmin && (
                            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-3">
                              {onUpdateMovement && (
                                <button
                                  onClick={() => handleStartEdit(m)}
                                  title="Editar esta movimentação"
                                  className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}

                              {onDeleteMovement && (
                                <button
                                  onClick={() => setDeletingMovement(m)}
                                  title="Excluir movimentação"
                                  className="p-2 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/60 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>

                  {/* Day Footer Action Bar for Retroactive Launches (Admin Only) */}
                  {isAdmin && (onOpenEntryForDate || onOpenExitForDate) && (
                    <div className="bg-slate-50/80 dark:bg-slate-800/30 p-3 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Esqueceu de lançar algum item no dia <strong>{group.dayMeta.dayNumStr || group.date}</strong>?
                      </span>
                      <div className="flex items-center gap-2">
                        {onOpenEntryForDate && (
                          <button
                            onClick={() => onOpenEntryForDate(group.date)}
                            className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar Entrada no dia {group.dayMeta.dayNumStr || group.date}</span>
                          </button>
                        )}
                        {onOpenExitForDate && (
                          <button
                            onClick={() => onOpenExitForDate(group.date)}
                            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar Saída no dia {group.dayMeta.dayNumStr || group.date}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {groupedMovements.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-2">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300">Nenhuma movimentação para os filtros selecionados</h4>
            <p className="text-xs text-slate-400">Tente buscar por outro produto, limpar o filtro de busca ou alterar a data.</p>
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {groupedMovements.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>
                Mostrando página <strong>{safePage}</strong> de <strong>{totalPages}</strong> ({groupedMovements.length} dias no total)
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Page size selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span>Exibir:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value={5}>5 dias</option>
                  <option value={10}>10 dias</option>
                  <option value={20}>20 dias</option>
                  <option value={50}>50 dias</option>
                  <option value={0}>Todos os dias</option>
                </select>
              </div>

              {/* Prev / Next buttons */}
              {pageSize > 0 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Página Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                    {safePage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Próxima Página"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* EDIT MOVEMENT MODAL */}
      {editingMovement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Editar Movimentação de Estoque
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ID: {editingMovement.id.substring(0, 16)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingMovement(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção para o saldo do estoque:</strong>
                <p className="mt-0.5">
                  Ao salvar a alteração, o saldo do produto será recalculado e atualizado automaticamente para corresponder à nova quantidade.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-4 text-xs">
              {/* Product Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Produto
                </label>
                {products.length > 0 ? (
                  <select
                    value={editFormData.productId || ''}
                    onChange={(e) => {
                      const selectedProd = products.find((p) => p.id === e.target.value);
                      if (selectedProd) {
                        setEditFormData((prev) => ({
                          ...prev,
                          productId: selectedProd.id,
                          productName: selectedProd.name,
                          unit: selectedProd.unit,
                        }));
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-blue-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit}) — Saldo Atual: {p.currentStock}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={editFormData.productName || ''}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-500"
                  />
                )}
              </div>

              {/* Type and Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Movimentação
                  </label>
                  <select
                    value={editFormData.type || 'entrada'}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as 'entrada' | 'saida' })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="entrada">ENTRADA (+)</option>
                    <option value="saida">SAÍDA (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade ({editFormData.unit || 'unid'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editFormData.quantity ?? ''}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-extrabold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data da Lançamento
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.date || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={editFormData.time || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Conditional Fields based on Type */}
              {editFormData.type === 'entrada' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Origem da Entrada
                      </label>
                      <select
                        value={editFormData.entryType || 'Compra'}
                        onChange={(e) => setEditFormData({ ...editFormData, entryType: e.target.value as EntryType })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Compra">Compra</option>
                        <option value="Doação">Doação</option>
                        <option value="Ajuste de Estoque">Ajuste de Estoque</option>
                        <option value="Contagem Inicial">Contagem Inicial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Fornecedor / Doador
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Mercado Central / Doador"
                        value={editFormData.supplierOrDonor || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, supplierOrDonor: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Recebido por (Missionário)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Marconi Castro"
                      value={editFormData.receivedBy || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, receivedBy: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Setor de Destino
                      </label>
                      <select
                        value={editFormData.sector || 'Cozinha'}
                        onChange={(e) => setEditFormData({ ...editFormData, sector: e.target.value as Sector })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Cozinha">Cozinha</option>
                        <option value="Padaria">Padaria</option>
                        <option value="Casa Missionária Masculina">Casa Masculina</option>
                        <option value="Casa Missionária Feminina">Casa Feminina</option>
                        <option value="Administração">Administração</option>
                        <option value="Casa da Coordenação (Huberto & Débora)">Casa Coordenação</option>
                        <option value="Casa Lana & Joabe (Cesta Básica)">Casa Lana & Joabe</option>
                        <option value="Casa Marcos & Fabíola (Cesta Básica)">Casa Marcos & Fabíola</option>
                        <option value="Casa Tainã (Cesta Básica)">Casa Tainã</option>
                        <option value="Eventos">Eventos</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Retirado por (Quem levou)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: João Silva"
                        value={editFormData.retrievedBy || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, retrievedBy: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Entregue por (Responsável no Estoque)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Marconi Castro"
                      value={editFormData.deliveredBy || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, deliveredBy: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações / Justificativa
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Correção de quantidade lançada errado durante contagem"
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMovement(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingMovement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-950/80 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white">
                  Excluir Movimentação?
                </h3>
                <p className="text-xs text-slate-500">Esta ação irá recalcular o estoque do produto.</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl space-y-2 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200">
              <div>
                <span className="text-slate-400 block">Produto:</span>
                <strong className="text-sm font-extrabold">{deletingMovement.productName}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block">Tipo:</span>
                  <span className={`font-extrabold uppercase ${deletingMovement.type === 'entrada' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {deletingMovement.type}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Quantidade:</span>
                  <strong className="font-extrabold">{deletingMovement.quantity} {deletingMovement.unit}</strong>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">Data/Hora:</span>
                <span>{deletingMovement.date} às {deletingMovement.time || '00:00'}</span>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
              ℹ️ Se for uma <strong>Entrada</strong>, a quantidade será subtraída do estoque. Se for uma <strong>Saída</strong>, a quantidade será devolvida ao estoque.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMovement(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold shadow-md cursor-pointer flex items-center gap-2 text-xs disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
