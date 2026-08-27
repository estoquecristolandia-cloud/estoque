import React, { useState, useMemo } from 'react';
import { Product, Category, Unit } from '../types';
import { UserRole } from '../firebase';
import { calculateDaysRemaining, getProductStockStatus, formatDaysRemainingText, getProductAlertDays } from '../utils/storage';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ModalWrapper } from './ui/ModalWrapper';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { SearchInput } from './ui/SearchInput';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import {
  Search,
  Plus,
  Edit2,
  History,
  Package,
  AlertTriangle,
  MapPin,
  Sparkles,
  X,
  Check,
  Lock,
  Camera,
  Barcode,
  Scan,
  CheckCircle2,
  BellRing,
  Calendar,
  LayoutGrid,
  Table,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  ShieldAlert,
  Clock,
  Layers,
} from 'lucide-react';

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
        setScanNotification(`Código ${code} lido, porém o produto não foi encontrado.`);
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
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;

      const status = getProductStockStatus(p);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, searchTerm, selectedCategory, statusFilter]);

  // Stock summary numbers
  const summary = useMemo(() => {
    const total = products.length;
    const critical = products.filter((p) => getProductStockStatus(p) === 'critical').length;
    const warning = products.filter((p) => getProductStockStatus(p) === 'warning').length;
    const normal = total - critical - warning;
    return { total, critical, warning, normal };
  }, [products]);

  return (
    <div className="space-y-6">
      {/* Scan Notification Banner */}
      {scanNotification && (
        <div className="p-4 bg-amber-500 text-slate-950 rounded-2xl font-black text-xs flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-slate-950" />
            <span>{scanNotification}</span>
          </div>
          <button onClick={() => setScanNotification(null)} className="p-1 hover:bg-amber-600 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Catálogo & Saldo de Estoque"
        subtitle="Controle unificado de insumos, pontos de reposição, códigos EAN e autonomia projetada"
        badge={{ text: `${products.length} itens cadastrados`, variant: 'emerald' }}
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              leftIcon={<Camera className="w-4 h-4 text-amber-500" />}
              onClick={() => setIsScannerOpen(true)}
              title="Bipar código de barras pela câmera do celular"
            >
              Bipar Câmera
            </Button>

            {onOpenReconciliationPreview && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<Sparkles className="w-4 h-4 text-emerald-600" />}
                onClick={onOpenReconciliationPreview}
              >
                Prévia Conciliação
              </Button>
            )}

            {isAdmin ? (
              <Button
                variant="emerald"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => openNewProductModal()}
              >
                Novo Produto
              </Button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Cadastro Restrito</span>
              </div>
            )}
          </>
        }
      />

      {/* Status KPI Quick Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-800 border-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-70">Total Geral</span>
            <Package className="w-4 h-4 opacity-70" />
          </div>
          <p className="text-2xl font-black mt-1">{summary.total}</p>
          <p className="text-[11px] opacity-70 mt-0.5">Itens em controle</p>
        </div>

        <div
          onClick={() => setStatusFilter('normal')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'normal'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Estoque Saudável
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{summary.normal}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Autonomia &gt; Reserva</p>
        </div>

        <div
          onClick={() => setStatusFilter('warning')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'warning'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Ponto de Reposição
            </span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{summary.warning}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Comprar em breve</p>
        </div>

        <div
          onClick={() => setStatusFilter('critical')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'critical'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Nível Crítico
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{summary.critical}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Abaixo do mínimo</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome, código EAN ou local de armazenamento..."
          />

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 self-start md:self-auto border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Tabela de conferência rápida para chefia e reuniões"
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabela Direção</span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Todas as Categorias ({products.length})
          </button>
          {CATEGORIES.map((cat) => {
            const countInCat = products.filter((p) => p.category === cat).length;
            if (countInCat === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat} ({countInCat})
              </button>
            );
          })}
        </div>
      </Card>

      {/* Grid or Table View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const days = calculateDaysRemaining(p);
            const status = getProductStockStatus(p);
            const alertDaysNum = getProductAlertDays(p);
            const detailedNote = getDetailedStockNote(p);

            let statusBadge = (
              <Badge variant="emerald" size="sm">
                🟢 Saudável ({days}d)
              </Badge>
            );

            if (status === 'critical') {
              statusBadge = (
                <Badge variant="rose" size="sm" icon={<AlertTriangle className="w-3 h-3" />}>
                  🔴 Crítico ({days}d)
                </Badge>
              );
            } else if (status === 'warning') {
              statusBadge = (
                <Badge variant="amber" size="sm">
                  🟡 Reposição ({days}d)
                </Badge>
              );
            }

            return (
              <Card
                key={p.id}
                hoverEffect
                className="p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Header card */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {p.category}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                        {p.name}
                      </h3>
                    </div>
                    {statusBadge}
                  </div>

                  {/* Barcode & Usage Frequency */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {p.barcode ? (
                      <Badge variant="slate" size="sm" icon={<Barcode className="w-3.5 h-3.5 text-amber-500" />}>
                        EAN: {p.barcode}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Scan className="w-3 h-3" />
                        <span>Sem código</span>
                      </span>
                    )}

                    {p.usageFrequency && (
                      <Badge variant="blue" size="sm" icon={<Calendar className="w-3 h-3" />}>
                        {p.usageFrequency}
                      </Badge>
                    )}
                  </div>

                  {/* Hero Stock Box */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-700/80 mb-3">
                    <div className="grid grid-cols-2 gap-3 divide-x divide-slate-200 dark:divide-slate-700">
                      {/* Left: Current Stock */}
                      <div className="pr-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                          Estoque Atual
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {p.currentStock}
                          </span>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{p.unit}s</span>
                        </div>
                        {detailedNote && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-1 leading-tight">
                            💡 {detailedNote}
                          </span>
                        )}
                      </div>

                      {/* Right: Autonomy */}
                      <div className="pl-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                          Autonomia
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-2xl sm:text-3xl font-black tracking-tight ${
                              days > 10 ? 'text-emerald-600 dark:text-emerald-400' : days > 3 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {days}
                          </span>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {days === 1 ? 'dia' : 'dias'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 font-medium">
                          Média: <strong>{p.dailyAvgConsumption} {p.unit}/dia</strong>
                        </span>
                      </div>
                    </div>

                    {/* Stock minimum / alert rule */}
                    <div className="mt-3 pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 dark:text-slate-400">Reserva de Alerta:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {p.minStock} {p.unit} ({alertDaysNum}d de segurança)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{p.location}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<History className="w-3.5 h-3.5 text-blue-600" />}
                    onClick={() => onOpenTimeline(p)}
                    className="flex-1"
                  >
                    Linha do Tempo
                  </Button>

                  <div className="flex items-center gap-1">
                    {canRegisterMovements && (
                      <>
                        <button
                          onClick={() => onOpenEntry(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                          title="Registrar Entrada (Compra/Doação)"
                        >
                          + Entrada
                        </button>
                        <button
                          onClick={() => onOpenExit(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 text-orange-700 dark:text-orange-300 font-bold text-xs border border-orange-200 dark:border-orange-800 transition-colors cursor-pointer"
                          title="Registrar Saída por Setor"
                        >
                          - Saída
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => openEditProductModal(p)}
                        className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                        title="Editar produto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Executive Table View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-600" />
                <span>Tabela Executiva de Conferência de Estoque</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Visão consolidada para reuniões de coordenação e decisões de compra.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="blue" size="md">
                {filteredProducts.length} itens listados
              </Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3.5">Produto</th>
                  <th className="p-3.5 bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-300">Estoque Atual</th>
                  <th className="p-3.5">Consumo Médio</th>
                  <th className="p-3.5">Autonomia</th>
                  <th className="p-3.5">Ponto de Reserva</th>
                  <th className="p-3.5">Localização</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredProducts.map((p) => {
                  const days = calculateDaysRemaining(p);
                  const alertDaysNum = getProductAlertDays(p);
                  const detailedNote = getDetailedStockNote(p);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div className="flex flex-col">
                          <span className="text-sm font-black">{p.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{p.category}</span>
                            {p.barcode && (
                              <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-400">
                                EAN: {p.barcode}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 bg-emerald-50/20 dark:bg-emerald-950/5 font-black text-slate-900 dark:text-white">
                        <div className="flex items-baseline gap-1">
                          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {p.currentStock}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 uppercase">{p.unit}s</span>
                        </div>
                        {detailedNote && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block mt-0.5">
                            💡 {detailedNote}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        <div className="font-bold">{p.dailyAvgConsumption} {p.unit}/dia</div>
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                          {p.usageFrequency || 'Diário'}
                        </div>
                      </td>

                      <td className="p-3.5 font-bold">
                        <Badge
                          variant={days > 10 ? 'emerald' : days > 3 ? 'amber' : 'rose'}
                          size="sm"
                        >
                          {days} {days === 1 ? 'dia' : 'dias'}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        <span className="text-xs font-semibold">{p.minStock} {p.unit}</span>
                        <span className="text-[10px] text-slate-400 block">({alertDaysNum}d de reserva)</span>
                      </td>

                      <td className="p-3.5 text-slate-500 dark:text-slate-400 text-xs">
                        {p.location}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenTimeline(p)}
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Linha do Tempo"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          {canRegisterMovements && (
                            <>
                              <button
                                onClick={() => onOpenEntry(p)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Entrada"
                              >
                                +
                              </button>
                              <button
                                onClick={() => onOpenExit(p)}
                                className="px-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold text-xs hover:bg-orange-100 transition-colors cursor-pointer"
                                title="Saída"
                              >
                                -
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => openEditProductModal(p)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
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
        <EmptyState
          icon={<Package className="w-10 h-10" />}
          title="Nenhum produto encontrado"
          description="Nenhum item corresponde ao termo de busca ou filtros selecionados."
          action={
            isAdmin && (
              <Button variant="primary" size="sm" onClick={() => openNewProductModal()}>
                Cadastrar Novo Produto
              </Button>
            )
          }
        />
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        products={products}
      />

      {/* New/Edit Product Modal */}
      <ModalWrapper
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProd ? 'Editar Produto' : 'Cadastrar Novo Produto'}
        subtitle="Preencha os detalhes e parâmetros de consumo do alimento"
        icon={<Package className="w-5 h-5" />}
        iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome do Alimento / Item *
            </label>
            <input
              type="text"
              placeholder="Ex: Arroz Tipo 1 ou Leite Integral"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            />
          </div>

          {/* Barcode Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Código de Barras (EAN-13 / QrCode)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: 7891000100101"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Camera className="w-3.5 h-3.5 text-amber-500" />}
                onClick={() => setIsScannerOpen(true)}
              >
                Bipar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Unidade de Medida
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as Unit)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Estoque Atual ({unit})</span>
                {editingProd && (
                  <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Bloqueado
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
                    ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                }`}
              />
              {editingProd && (
                <span className="text-[10px] text-slate-400 block mt-1">
                  Altere via Entrada, Saída ou Ajuste de Inventário.
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Consumo Diário ({unit}/dia)
              </label>
              <input
                type="number"
                step="any"
                value={dailyAvgConsumption}
                onChange={(e) => handleDailyConsumptionChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">
                <BellRing className="w-3.5 h-3.5" />
                Alerta em (Dias)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={alertDays}
                onChange={(e) => handleAlertDaysChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Alerta se durar menos que N dias</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Estoque Mínimo ({unit})
              </label>
              <input
                type="number"
                step="any"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400 block mt-1">= Consumo × {alertDays} dias</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Frequência de Uso
              </label>
              <input
                type="text"
                placeholder="Ex: Diário, Quartas/Domingos"
                value={usageFrequency}
                onChange={(e) => setUsageFrequency(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Local de Armazenamento
              </label>
              <input
                type="text"
                placeholder="Ex: Depósito Principal"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Check className="w-4 h-4" />}
            >
              Salvar Produto
            </Button>
          </div>
        </form>
      </ModalWrapper>
    </div>
  );
};
