import React, { useState } from 'react';
import { Product, Category, Unit } from '../types';
import { UserRole } from '../firebase';
import { calculateDaysRemaining, getProductStockStatus, formatDaysRemainingText, getProductAlertDays } from '../utils/storage';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { Search, Plus, Edit2, History, Package, AlertTriangle, MapPin, Sparkles, X, Check, Lock, Camera, Barcode, Scan, CheckCircle2, BellRing, Calendar, LayoutGrid, Table } from 'lucide-react';

export function getDetailedStockNote(p: Product): string | null {
  const nameLower = p.name.toLowerCase();

  if (nameLower.includes('alho') && p.unit === 'pacote') {
    return `Contém ${p.currentStock * 10} cabeças de alho na dispensa`;
  }
  if ((nameLower.includes('café') || nameLower.includes('cafe')) && p.unit === 'pacote') {
    const totalKg = (p.currentStock * 0.25).toFixed(2);
    return `Equivale a ${totalKg} kg de pó de café`;
  }
  if (nameLower.includes('arroz') && p.unit === 'kg' && p.currentStock > 0) {
    const sacos = (p.currentStock / 50).toFixed(1);
    return `Aproximadamente ${sacos} sacos de 50kg no depósito`;
  }
  if ((nameLower.includes('feijão') || nameLower.includes('feijao')) && p.unit === 'kg' && p.currentStock > 0) {
    const sacos = (p.currentStock / 50).toFixed(1);
    return `Aproximadamente ${sacos} sacos de 50kg no depósito`;
  }
  if (nameLower.includes('macarrão') || nameLower.includes('macarrao')) {
    const refeicoes = Math.floor(p.currentStock / 10);
    return `Garante cerca de ${refeicoes} refeições grandes (quartas/domingos)`;
  }
  if (nameLower.includes('flocão') || nameLower.includes('flocao')) {
    const refeicoes = Math.floor(p.currentStock / 15);
    return `Garante cerca de ${refeicoes} cuscuzes grandes (quartas/domingos)`;
  }
  if (nameLower.includes('suco') && p.unit === 'pacote') {
    return `Total de ${p.currentStock * 250}g em pó para suco`;
  }
  return null;
}

interface ProductManagerProps {
  products: Product[];
  onOpenTimeline: (product: Product) => void;
  onOpenEntry: (product: Product) => void;
  onOpenExit: (product: Product) => void;
  onSaveProduct: (product: Product) => void;
  onAddProduct: (product: Omit<Product, 'id' | 'lastUpdated'>) => void;
  userRole?: UserRole;
  onOpenReconciliationPreview?: () => void;
}

const CATEGORIES: Category[] = [
  'Grãos e Cereais',
  'Óleos e Condimentos',
  'Matinais e Bebidas',
  'Proteínas e Carnes',
  'Laticínios e Massas',
  'Higiene e Limpeza',
  'Outros',
];

const UNITS: Unit[] = ['kg', 'litro', 'pacote', 'caixa', 'unidade', 'lata', 'g'];

export const ProductManager: React.FC<ProductManagerProps> = ({
  products,
  onOpenTimeline,
  onOpenEntry,
  onOpenExit,
  onSaveProduct,
  onAddProduct,
  userRole = 'admin',
  onOpenReconciliationPreview,
}) => {
  // Only admin (Marconi Castro) can edit/add/delete products or register entries/exits
  const isAdmin = userRole === 'admin';
  const canRegisterMovements = userRole === 'admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');

  // Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanNotification, setScanNotification] = useState<string | null>(null);

  // View Mode: 'grid' cards vs 'table' executive table
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State for New/Edit Product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Grãos e Cereais');
  const [unit, setUnit] = useState<Unit>('kg');
  const [currentStock, setCurrentStock] = useState<string>('0');
  const [minStock, setMinStock] = useState<string>('10');
  const [dailyAvgConsumption, setDailyAvgConsumption] = useState<string>('1');
  const [alertDays, setAlertDays] = useState<string>('3');
  const [usageFrequency, setUsageFrequency] = useState<string>('Diário');
  const [location, setLocation] = useState<string>('Depósito Principal');
  const [barcode, setBarcode] = useState<string>('');

  const handleDailyConsumptionChange = (val: string) => {
    setDailyAvgConsumption(val);
    const daily = parseFloat(val) || 0;
    const days = parseFloat(alertDays) || 3;
    if (daily > 0) {
      setMinStock(Math.ceil(daily * days).toString());
    }
  };

  const handleAlertDaysChange = (val: string) => {
    setAlertDays(val);
    const daily = parseFloat(dailyAvgConsumption) || 0;
    const days = parseFloat(val) || 3;
    if (daily > 0) {
      setMinStock(Math.ceil(daily * days).toString());
    }
  };

  const openNewProductModal = (initialBarcode = '') => {
    setEditingProd(null);
    setName('');
    setCategory('Grãos e Cereais');
    setUnit('kg');
    setCurrentStock('0');
    setDailyAvgConsumption('1');
    setAlertDays('3');
    setMinStock('3');
    setUsageFrequency('Diário');
    setLocation('Depósito Principal');
    setBarcode(initialBarcode);
    setIsModalOpen(true);
  };

  const openEditProductModal = (p: Product) => {
    setEditingProd(p);
    setName(p.name);
    setCategory(p.category);
    setUnit(p.unit);
    setCurrentStock(p.currentStock.toString());
    setMinStock(p.minStock.toString());
    setDailyAvgConsumption(p.dailyAvgConsumption.toString());
    const daysAlert = getProductAlertDays(p);
    setAlertDays(daysAlert.toString());
    setUsageFrequency(p.usageFrequency || 'Diário');
    setLocation(p.location);
    setBarcode(p.barcode || '');
    setIsModalOpen(true);
  };

  const handleScanSuccess = (code: string, matchedProd?: Product) => {
    setIsScannerOpen(false);
    if (matchedProd) {
      setSearchTerm(matchedProd.name);
      setScanNotification(`Produto encontrado: ${matchedProd.name}`);
      setTimeout(() => setScanNotification(null), 5000);
    } else {
      if (isAdmin) {
        setScanNotification(`Código ${code} lido. Preencha os dados para cadastrar este novo item.`);
        openNewProductModal(code);
        setTimeout(() => setScanNotification(null), 6000);
      } else {
        setScanNotification(`Código ${code} lido, porém o produto não foi encontrado. Apenas o gestor Marconi Castro pode cadastrar novos itens.`);
        setTimeout(() => setScanNotification(null), 6000);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const prodData = {
      name: name.trim(),
      category,
      unit,
      currentStock: editingProd ? editingProd.currentStock : parseFloat(currentStock) || 0,
      minStock: parseFloat(minStock) || 0,
      dailyAvgConsumption: parseFloat(dailyAvgConsumption) || 0,
      alertDays: parseFloat(alertDays) || 3,
      usageFrequency: usageFrequency.trim() || undefined,
      location: location.trim() || 'Depósito Principal',
      barcode: barcode.trim() || undefined,
    };

    if (editingProd) {
      onSaveProduct({
        ...editingProd,
        ...prodData,
        currentStock: editingProd.currentStock,
        lastUpdated: new Date().toISOString(),
      });
    } else {
      onAddProduct(prodData);
    }

    setIsModalOpen(false);
  };

  // Filter logic
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;

    const status = getProductStockStatus(p);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesCat && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Scan Notification Banner */}
      {scanNotification && (
        <div className="p-4 bg-amber-500 text-slate-950 rounded-2xl font-black text-xs flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-slate-950" />
            <span>{scanNotification}</span>
          </div>
          <button onClick={() => setScanNotification(null)} className="p-1 hover:bg-amber-600 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Action Bar & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome, código de barras ou local..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Action Controls: Scanner + Status + New Product */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {/* Camera Scanner Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
            title="Bipar código de barras pela câmera do celular"
          >
            <Camera className="w-4 h-4" />
            <span>Bipar Câmera</span>
          </button>

          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-950 text-white dark:bg-blue-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Todos ({products.length})
          </button>

          <button
            onClick={() => setStatusFilter('critical')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
              statusFilter === 'critical'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            🚨 Críticos ({products.filter((p) => getProductStockStatus(p) === 'critical').length})
          </button>

          <button
            onClick={() => setStatusFilter('warning')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
              statusFilter === 'warning'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            🟡 Reposição ({products.filter((p) => getProductStockStatus(p) === 'warning').length})
          </button>

          {isAdmin ? (
            <button
              onClick={() => openNewProductModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold whitespace-nowrap">
              <Lock className="w-3.5 h-3.5" />
              <span>Cadastro Restrito</span>
            </div>
          )}
        </div>
      </div>

      {/* Categories Horizontal Selector + View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            Todas Categorias
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View Switcher: Cards vs Executive Table */}
        <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Tabela de conferência rápida para chefia e reuniões"
          >
            <Table className="w-3.5 h-3.5" />
            <span>Tabela Direção</span>
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* Product Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const days = calculateDaysRemaining(p);
            const status = getProductStockStatus(p);
            const alertDaysNum = getProductAlertDays(p);
            const detailedNote = getDetailedStockNote(p);

            let borderClass = 'border-slate-200 dark:border-slate-800';
            let statusBadge = (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                🟢 Normal ({days}d)
              </span>
            );

            if (status === 'critical') {
              borderClass = 'border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/10';
              statusBadge = (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 🔴 Crítico ({days}d)
                </span>
              );
            } else if (status === 'warning') {
              borderClass = 'border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10';
              statusBadge = (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  🟡 Repor em breve ({days}d)
                </span>
              );
            }

            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-slate-900 border ${borderClass} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
              >
                <div>
                  {/* Header card */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {p.category}
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                        {p.name}
                      </h3>
                    </div>
                    {statusBadge}
                  </div>

                  {/* Barcode & Usage Frequency Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {p.barcode ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <Barcode className="w-3.5 h-3.5 text-amber-500" />
                        <span>EAN: {p.barcode}</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                        <Scan className="w-3 h-3" />
                        <span>Sem código</span>
                      </div>
                    )}

                    {p.usageFrequency && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Uso: {p.usageFrequency}</span>
                      </div>
                    )}
                  </div>

                  {/* Hero Stock Box: Estoque Real & Autonomia Conciliados */}
                  <div className="bg-slate-900 text-white dark:bg-slate-800/90 rounded-2xl p-4 border border-slate-800 dark:border-slate-700 shadow-inner mb-3">
                    <div className="grid grid-cols-2 gap-3 divide-x divide-slate-700/80">
                      {/* Lado Esquerdo: Estoque Real Atual */}
                      <div className="pr-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                          Estoque Real Atual
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                            {p.currentStock}
                          </span>
                          <span className="text-xs font-bold text-slate-300 uppercase">{p.unit}s</span>
                        </div>
                        {detailedNote && (
                          <span className="text-[10px] text-amber-300 font-semibold block mt-1 leading-tight">
                            💡 {detailedNote}
                          </span>
                        )}
                      </div>

                      {/* Lado Direito: Autonomia Estimada */}
                      <div className="pl-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                          Autonomia
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-2xl sm:text-3xl font-black tracking-tight ${
                              days > 10 ? 'text-emerald-400' : days > 3 ? 'text-amber-400' : 'text-rose-400'
                            }`}
                          >
                            {days}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {days === 1 ? 'dia de uso' : 'dias de uso'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                          Consumo: <strong>{p.dailyAvgConsumption} {p.unit}/dia</strong>
                        </span>
                      </div>
                    </div>

                    {/* Linha de Regra de Alerta/Mínimo */}
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Reserva Mínima (Aviso):</span>
                      <span className="font-extrabold text-amber-300">
                        {p.minStock} {p.unit} ({alertDaysNum}d de reserva)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-4 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{p.location}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenTimeline(p)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800/50 transition-colors cursor-pointer"
                  title="Ver todo o histórico de compras, doações e saídas"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Linha do Tempo</span>
                </button>

                <div className="flex items-center gap-1">
                  {canRegisterMovements && (
                    <>
                      <button
                        onClick={() => onOpenEntry(p)}
                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-200 dark:border-emerald-800/50 cursor-pointer"
                        title="Registrar Entrada (Compra/Doação)"
                      >
                        + Entrada
                      </button>
                      <button
                        onClick={() => onOpenExit(p)}
                        className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-200 dark:border-amber-800/50 cursor-pointer"
                        title="Registrar Saída por Setor"
                      >
                        - Saída
                      </button>
                    </>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => openEditProductModal(p)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="Editar produto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      ) : (
        /* Executive Table View (Para Direção / Reunião de Estoque) */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <Table className="w-4 h-4 text-amber-400" />
                <span>Tabela Executiva de Conferência de Estoque Real</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Visão consolidada do saldo físico atual e autonomia projetada para tomadas de decisão.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenReconciliationPreview && (
                <button
                  onClick={onOpenReconciliationPreview}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Abrir Prévia da Conciliação Física dos 14 produtos (Marco Zero)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Prévia da Conciliação Física</span>
                </button>
              )}
              <span className="text-xs font-bold px-3 py-1 bg-slate-800 rounded-lg text-emerald-400 border border-slate-700">
                {filteredProducts.length} itens
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3.5">Produto</th>
                  <th className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">Estoque Real Atual</th>
                  <th className="p-3.5">Consumo & Frequência</th>
                  <th className="p-3.5">Autonomia Estimada</th>
                  <th className="p-3.5">Ponto de Alerta</th>
                  <th className="p-3.5">Local</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredProducts.map((p) => {
                  const days = calculateDaysRemaining(p);
                  const alertDaysNum = getProductAlertDays(p);
                  const detailedNote = getDetailedStockNote(p);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div className="flex flex-col">
                          <span className="text-sm font-black">{p.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 uppercase">{p.category}</span>
                            {p.barcode && (
                              <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                EAN: {p.barcode}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 bg-emerald-50/30 dark:bg-emerald-950/10 font-black text-slate-900 dark:text-white">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {p.currentStock}
                          </span>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{p.unit}s</span>
                        </div>
                        {detailedNote && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-0.5">
                            💡 {detailedNote}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        <div className="font-bold">{p.dailyAvgConsumption} {p.unit}/dia</div>
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                          {p.usageFrequency || 'Uso Diário'}
                        </div>
                      </td>

                      <td className="p-3.5 font-bold">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                          days > 10
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                            : days > 3
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                        }`}>
                          {days} {days === 1 ? 'dia' : 'dias'}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        <span className="text-xs font-semibold">{p.minStock} {p.unit}</span>
                        <span className="text-[10px] text-slate-400 block">({alertDaysNum}d de reserva)</span>
                      </td>

                      <td className="p-3.5 text-slate-500 dark:text-slate-400 text-xs truncate max-w-[140px]">
                        {p.location}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenTimeline(p)}
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100 cursor-pointer"
                            title="Linha do Tempo"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          {canRegisterMovements && (
                            <>
                              <button
                                onClick={() => onOpenEntry(p)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold text-xs cursor-pointer"
                                title="Entrada"
                              >
                                +
                              </button>
                              <button
                                onClick={() => onOpenExit(p)}
                                className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold text-xs cursor-pointer"
                                title="Saída"
                              >
                                -
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => openEditProductModal(p)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <Package className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-300">Nenhum produto encontrado</p>
          <p className="text-xs text-slate-400 mt-1">Tente ajustar o termo da busca ou bipar um novo código.</p>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        products={products}
      />

      {/* New/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {editingProd ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Alimento / Item</label>
                <input
                  type="text"
                  placeholder="Ex: Arroz Tipo 1 ou Leite Integral"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Barcode Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Código de Barras (EAN-13 / QrCode)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: 7891000100101"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold hover:bg-amber-500/30 flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Bipar</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Unidade</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as Unit)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Estoque Atual ({unit})</span>
                    {editingProd && (
                      <span className="text-[10px] text-amber-400 font-normal flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Gerenciado por Lançamentos
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="any"
                    disabled={!!editingProd}
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-sm font-bold ${
                      editingProd
                        ? 'bg-slate-800/60 border-slate-700 text-emerald-400 cursor-not-allowed opacity-90'
                        : 'bg-slate-800 border-slate-700 text-white focus:outline-none focus:border-emerald-500'
                    }`}
                  />
                  {editingProd && (
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Para alterar o saldo físico, faça uma Entrada, Saída ou Ajuste de Inventário.
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-400 mb-1">Consumo Diário ({unit}/dia)</label>
                  <input
                    type="number"
                    step="any"
                    value={dailyAvgConsumption}
                    onChange={(e) => handleDailyConsumptionChange(e.target.value)}
                    className="w-full bg-slate-800 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                <div>
                  <label className="block text-xs font-bold text-rose-300 mb-1 flex items-center gap-1">
                    <BellRing className="w-3.5 h-3.5 text-rose-400" />
                    Alerta em (Dias)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={alertDays}
                    onChange={(e) => handleAlertDaysChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-rose-400"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Gera alerta se durar menos que N dias</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Estoque Mínimo ({unit})</label>
                  <input
                    type="number"
                    step="any"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">= Consumo ({dailyAvgConsumption}) × {alertDays} dias</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Frequência / Padrão de Uso</label>
                  <input
                    type="text"
                    placeholder="Ex: Diário, Quartas e Domingos..."
                    value={usageFrequency}
                    onChange={(e) => setUsageFrequency(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Local de Armazenamento</label>
                  <input
                    type="text"
                    placeholder="Ex: Depósito Principal"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Produto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

