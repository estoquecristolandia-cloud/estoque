import React, { useState } from 'react';
import {
  X,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Users,
  Save,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Clock,
  Lock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Package,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import { Product, DailyKit, KitItem, Missionary, KitchenShift } from '../types';
import { UserRole } from '../firebase';
import { DEFAULT_DAILY_KIT } from '../data/initialData';
import { getTodayDateString, getNowTimeString } from '../utils/storage';

interface DailyKitModalProps {
  products: Product[];
  kit: DailyKit;
  missionaries?: Missionary[];
  userRole?: UserRole;
  onClose: () => void;
  onSubmitKit: (
    kit: DailyKit,
    retrievedBy: string,
    deliveredBy: string,
    date: string,
    time: string,
    saveAsDefault?: boolean,
    clientRequestId?: string
  ) => Promise<void> | void;
}

const KITCHEN_SHIFTS: KitchenShift[] = [
  'Café / Manhã',
  'Almoço',
  'Jantar / Tarde',
  'Ceia / Lanche',
];

export const DailyKitModal: React.FC<DailyKitModalProps> = ({
  products,
  kit,
  missionaries = [],
  userRole = 'admin',
  onClose,
  onSubmitKit,
}) => {
  const isAdmin = userRole === 'admin';
  const [retrievedBy, setRetrievedBy] = useState<string>(kit.defaultRetriever || 'Equipe 1 (Equipe Cozinha)');
  const [deliveredBy, setDeliveredBy] = useState<string>(kit.defaultDeliverer || 'Marconi Castro (Gestor do Estoque)');
  const [selectedShift, setSelectedShift] = useState<KitchenShift>('Almoço');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [time, setTime] = useState<string>(getNowTimeString());

  const kitchenMissionaries = missionaries.filter((m) => m.sector === 'Cozinha');

  // People / Portion Scaler
  const [peopleCount, setPeopleCount] = useState<number>(100);

  // Kit Items State
  const [kitItems, setKitItems] = useState<KitItem[]>(kit.items);
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);

  // New Item Selector State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newProductQty, setNewProductQty] = useState<number>(1);

  // Step State: 'edit' (Preparação) or 'confirm' (Confirmação Prévia da Baixa)
  const [currentStep, setCurrentStep] = useState<'edit' | 'confirm'>('edit');

  // Calculate detailed status for an item based on REAL stock
  const getItemDetailedStatus = (item: KitItem) => {
    const prod = products.find(
      (p) => p.id === item.productId || p.name.toLowerCase() === item.productName.toLowerCase()
    );

    if (!prod) {
      return {
        state: 'indisponivel' as const,
        label: '🔴 INDISPONÍVEL',
        badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        currentStock: 0,
        unit: item.unit,
        resultingStock: -item.quantity,
        isSufficient: false,
        msg: 'Produto não localizado no estoque',
      };
    }

    const current = prod.currentStock;
    const needed = item.quantity;
    const resulting = Math.round((current - needed) * 100) / 100;
    const isZero = current === 0;
    const isInsufficient = current < needed;
    const willBeBelowMin = resulting <= prod.minStock;

    if (isZero) {
      return {
        state: 'indisponivel' as const,
        label: '🔴 INDISPONÍVEL',
        badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-black',
        currentStock: current,
        unit: prod.unit,
        resultingStock: resulting,
        isSufficient: false,
        msg: `Estoque zerado (necessário ${needed} ${prod.unit})`,
        product: prod,
      };
    }

    if (isInsufficient) {
      return {
        state: 'atencao' as const,
        label: '🟡 ATENÇÃO / INSUFICIENTE',
        badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold',
        currentStock: current,
        unit: prod.unit,
        resultingStock: resulting,
        isSufficient: false,
        msg: `Falta ${Math.round((needed - current) * 100) / 100} ${prod.unit} (disponível apenas ${current} ${prod.unit})`,
        product: prod,
      };
    }

    if (willBeBelowMin) {
      return {
        state: 'atencao' as const,
        label: '🟡 ATENÇÃO / ESTOQUE BAIXO',
        badgeBg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-semibold',
        currentStock: current,
        unit: prod.unit,
        resultingStock: resulting,
        isSufficient: true,
        msg: `Saldo pós-baixa (${resulting} ${prod.unit}) ficará abaixo do mínimo (${prod.minStock} ${prod.unit})`,
        product: prod,
      };
    }

    return {
      state: 'disponivel' as const,
      label: '🟢 DISPONÍVEL',
      badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold',
      currentStock: current,
      unit: prod.unit,
      resultingStock: resulting,
      isSufficient: true,
      msg: `Saldo pós-baixa: ${resulting} ${prod.unit}`,
      product: prod,
    };
  };

  // Check if any item has insufficient stock (would generate negative stock)
  const itemsWithStatus = kitItems.map((item) => ({
    item,
    status: getItemDetailedStatus(item),
  }));

  const insufficientItems = itemsWithStatus.filter((i) => !i.status.isSufficient);
  const hasInsufficientStock = insufficientItems.length > 0;

  // Update item quantity directly
  const handleUpdateQuantity = (productId: string, newQty: number) => {
    setKitItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.max(0, Math.round(newQty * 100) / 100) }
          : i
      )
    );
  };

  // Remove item from kit
  const handleRemoveItem = (productId: string) => {
    setKitItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Add new item to kit
  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const existing = kitItems.find((i) => i.productId === prod.id);
    if (existing) {
      handleUpdateQuantity(prod.id, existing.quantity + newProductQty);
    } else {
      setKitItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: Math.max(0.1, newProductQty),
          unit: prod.unit,
        },
      ]);
    }

    setSelectedProductId('');
    setNewProductQty(1);
  };

  // Quick People Scale Adjuster
  const handleScaleByPeople = (newPeople: number) => {
    if (newPeople <= 0) return;
    const ratio = newPeople / peopleCount;
    setPeopleCount(newPeople);

    setKitItems((prev) =>
      prev.map((item) => {
        const scaled = Math.round(item.quantity * ratio * 10) / 10;
        return { ...item, quantity: Math.max(0.1, scaled) };
      })
    );
  };

  // Adjust all items exceeding stock to max available
  const handleAdjustAllToMaxStock = () => {
    setKitItems((prev) =>
      prev.map((item) => {
        const status = getItemDetailedStatus(item);
        if (!status.isSufficient && status.currentStock > 0) {
          return { ...item, quantity: status.currentStock };
        }
        return item;
      })
    );
  };

  const handleResetToDefaultKit = () => {
    setKitItems(DEFAULT_DAILY_KIT.items);
    setPeopleCount(100);
  };

  // Advance to Confirmation Step
  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (kitItems.length === 0) {
      alert('Adicione ao menos um produto para compor o Kit da Cozinha.');
      return;
    }
    setCurrentStep('confirm');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Final Confirmation of Kit Deduction
  const handleFinalConfirmDeduction = async () => {
    if (!isAdmin || isSubmitting) return;
    if (hasInsufficientStock) {
      alert(
        'Operação bloqueada: Existem produtos com estoque insuficiente. Ajuste as quantidades para não gerar saldo negativo.'
      );
      return;
    }

    const updatedKit: DailyKit = {
      ...kit,
      items: kitItems,
    };

    try {
      setIsSubmitting(true);
      const clientRequestId = `req-kit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await onSubmitKit(updatedKit, retrievedBy, deliveredBy, date, time, saveAsDefault, clientRequestId);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Erro ao baixar o Kit Diário no estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Available products to add
  const availableProductsToAdd = products.filter(
    (p) => !kitItems.some((ki) => ki.productId === p.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-500 text-slate-950 shadow-md">
              <Utensils className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {kit.name || 'Kit Cozinha Diário'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {kit.sector || 'Cozinha'}
                </span>
                {!isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Modo Visualização
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentStep === 'confirm'
                  ? 'Confirmação detalhada da baixa de estoque para a cozinha'
                  : 'Composição de mantimentos e conferência de disponibilidade de estoque'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: PREPARAÇÃO E CONFERÊNCIA DO KIT */}
        {/* ========================================================================= */}
        {currentStep === 'edit' && (
          <form onSubmit={handleProceedToConfirmation} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Read-Only Notice for Viewers */}
            {!isAdmin && (
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-3 text-xs text-blue-900 dark:text-blue-200">
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  <strong>Acesso Somente Leitura:</strong> Como usuário visualizador, você pode consultar as quantidades, estoque real e status dos itens, mas a baixa e alterações são exclusivas do administrador.
                </span>
              </div>
            )}

            {/* People Scaler & Presets (Only editable for Admin, informative for Viewer) */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Estimativa de Refeições / Pessoas:
                  </span>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[60, 80, 100, 120, 150, 200].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleScaleByPeople(num)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          peopleCount === num
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {num} p.
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                <div className="w-full sm:w-48">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Número de Pessoas Atendidas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    disabled={!isAdmin}
                    value={peopleCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      handleScaleByPeople(val);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                  />
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex-1 leading-tight">
                  💡 O Kit Cozinha calcula as quantidades ideais proporcionalmente para o número de acolhidos e missionários na Cristolândia.
                </div>
              </div>
            </div>

            {/* Shift & Responsibility Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="col-span-full bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                    Turno da Refeição:
                  </span>
                </div>
                {isAdmin ? (
                  <select
                    value={selectedShift}
                    onChange={(e) => {
                      const shift = e.target.value as KitchenShift;
                      setSelectedShift(shift);
                      const matched = kitchenMissionaries.find((m) => m.shift === shift);
                      if (matched) setRetrievedBy(matched.name);
                    }}
                    className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 w-full sm:w-auto"
                  >
                    {KITCHEN_SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedShift}</span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Retirado Por (Responsável da Cozinha)
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={retrievedBy}
                  onChange={(e) => setRetrievedBy(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-80"
                  required
                />

                {isAdmin && kitchenMissionaries.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {kitchenMissionaries.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setRetrievedBy(m.name)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium border cursor-pointer transition-colors ${
                          retrievedBy === m.name
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {m.name.replace('Missionário ', 'Miss. ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Entregue Por (Estoque)
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={deliveredBy}
                  onChange={(e) => setDeliveredBy(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-80"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Data da Baixa</label>
                <input
                  type="date"
                  disabled={!isAdmin}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white disabled:opacity-80"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Horário</label>
                <input
                  type="time"
                  disabled={!isAdmin}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white disabled:opacity-80"
                />
              </div>
            </div>

            {/* Kit Items List Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Produtos do Kit & Disponibilidade Real ({kitItems.length})
                </h4>

                {isAdmin && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleResetToDefaultKit}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800"
                      title="Restaurar composição oficial do Kit da Cozinha Cristolândia"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Restaurar Kit Padrão</span>
                    </button>

                    {hasInsufficientStock && (
                      <button
                        type="button"
                        onClick={handleAdjustAllToMaxStock}
                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Ajustar ao Saldo Atual</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Responsive Cards for each item */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {itemsWithStatus.map(({ item, status }) => (
                  <div
                    key={item.productId}
                    className={`p-3.5 rounded-2xl border transition-colors flex flex-col gap-2.5 ${
                      !status.isSufficient
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                        : status.state === 'atencao'
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60'
                    }`}
                  >
                    {/* Top line: Name and Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-xl shrink-0 ${
                            !status.isSufficient
                              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                              : status.state === 'atencao'
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                          }`}
                        >
                          {!status.isSufficient ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : status.state === 'atencao' ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-black text-sm text-slate-900 dark:text-white block truncate">
                            {item.productName}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            {status.msg}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full border shrink-0 ${status.badgeBg}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Stock Metrics & Inputs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/50 text-center">
                      <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Estoque Atual</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {status.currentStock} <span className="text-[10px] font-medium">{item.unit}</span>
                        </span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Qtd. Necessária</span>
                        {isAdmin ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="any"
                              min="0.1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(item.productId, parseFloat(e.target.value) || 0)
                              }
                              className="w-16 bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white text-center text-xs rounded-lg py-0.5 focus:outline-none border border-slate-200 dark:border-slate-700"
                            />
                            <span className="text-[10px] font-bold text-slate-500">{item.unit}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                            {item.quantity} <span className="text-[10px] font-medium">{item.unit}</span>
                          </span>
                        )}
                      </div>

                      <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-medium">Será Utilizado</span>
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                          {item.quantity} <span className="text-[10px] font-medium">{item.unit}</span>
                        </span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between px-2">
                        <div className="flex-1 text-center">
                          <span className="text-[10px] text-slate-400 block font-medium">Após a Baixa</span>
                          <span
                            className={`text-xs font-black ${
                              status.resultingStock < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {status.resultingStock} <span className="text-[10px] font-medium">{item.unit}</span>
                          </span>
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Remover produto do kit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {kitItems.length === 0 && (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                    Nenhum produto cadastrado no kit. Adicione produtos abaixo.
                  </div>
                )}
              </div>

              {/* Add Custom Item to Kit (Admin Only) */}
              {isAdmin && availableProductsToAdd.length > 0 && (
                <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 w-full"
                  >
                    <option value="">+ Adicionar outro produto do estoque ao kit...</option>
                    {availableProductsToAdd.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.currentStock} {p.unit} disponíveis)
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      placeholder="Qtd"
                      value={newProductQty}
                      onChange={(e) => setNewProductQty(parseFloat(e.target.value) || 1)}
                      className="w-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-center text-slate-900 dark:text-white focus:outline-none"
                    />

                    <button
                      type="button"
                      disabled={!selectedProductId}
                      onClick={handleAddItem}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer whitespace-nowrap flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Option to Save Composition as Standard Template */}
            {isAdmin && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveAsDefault"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="saveAsDefault"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-blue-500" />
                  <span>Salvar esta composição e volumes como o novo Modelo Padrão do Kit Diário</span>
                </label>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {hasInsufficientStock ? (
                  <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {insufficientItems.length} item(ns) com estoque insuficiente para atender o kit completo.
                  </span>
                ) : (
                  <span>
                    O estoque será deduzido e alocado para o setor <strong className="text-slate-800 dark:text-slate-200">Cozinha</strong>.
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {isAdmin ? 'Cancelar' : 'Fechar'}
                </button>

                {isAdmin ? (
                  <button
                    type="submit"
                    disabled={kitItems.length === 0}
                    className={`flex-1 sm:flex-none px-6 py-2.5 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      hasInsufficientStock
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <span>Baixar Kit Cozinha</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Somente Leitura</span>
                  </div>
                )}
              </div>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: CONFIRMAÇÃO DA BAIXA DO KIT (ATÔMICA E COM PROTEÇÃO TOTAL) */}
        {/* ========================================================================= */}
        {currentStep === 'confirm' && (
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {/* Header of confirmation */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-sm space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-black uppercase tracking-wider">
                  Revisão e Confirmação de Baixa no Estoque
                </h4>
              </div>
              <p className="text-xs text-blue-200">
                Confira a lista dos itens, quantidades a deduzir e o saldo resultante antes de efetivar o registro.
              </p>
            </div>

            {/* Responsibility and metadata recap */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Turno</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedShift}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Data e Horário</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {date} às {time}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Retirado Por</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block" title={retrievedBy}>
                  {retrievedBy}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Entregue Por</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block" title={deliveredBy}>
                  {deliveredBy}
                </span>
              </div>
            </div>

            {/* Validation Alert Box */}
            {hasInsufficientStock ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <h5 className="text-xs font-black uppercase tracking-wide text-rose-700 dark:text-rose-300">
                    Operação Bloqueada: Estoque Insuficiente
                  </h5>
                </div>
                <p className="text-xs">
                  O sistema protege contra saldo negativo. Não é possível baixar o kit enquanto houver produtos com saldo menor do que o necessário.
                </p>
                <div className="text-xs font-bold pl-2 border-l-2 border-rose-400 space-y-1">
                  {insufficientItems.map(({ item, status }) => (
                    <div key={item.productId}>
                      • <strong>{item.productName}:</strong> Necessário {item.quantity} {item.unit} | Saldo Atual: {status.currentStock} {item.unit} (Déficit de {Math.round((item.quantity - status.currentStock) * 100) / 100} {item.unit})
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>Validação Aprovada:</strong> Todos os {kitItems.length} produtos possuem saldo suficiente. Ao confirmar, as saídas serão registradas no histórico e o estoque será deduzido atomicamente.
                </span>
              </div>
            )}

            {/* Detailed Table / Cards of Products to Deduct */}
            <div className="space-y-2">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Produtos que serão baixados ({kitItems.length})
              </h5>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {itemsWithStatus.map(({ item, status }) => (
                  <div
                    key={item.productId}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                      !status.isSufficient
                        ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <h6 className="font-bold text-slate-900 dark:text-white truncate">
                        {item.productName}
                      </h6>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {status.msg}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Estoque Atual</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {status.currentStock} {item.unit}
                        </span>
                      </div>

                      <div className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-center">
                        <span className="text-[10px] text-blue-500 block font-bold">Baixa</span>
                        <span className="font-black text-blue-700 dark:text-blue-300">
                          -{item.quantity} {item.unit}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Saldo Pós-Baixa</span>
                        <span
                          className={`font-black ${
                            status.resultingStock < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {status.resultingStock} {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep('edit')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar e Ajustar Quantidades</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={hasInsufficientStock || isSubmitting}
                  onClick={handleFinalConfirmDeduction}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Efetivando Baixa do Kit...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmar e Efetivar Baixa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
