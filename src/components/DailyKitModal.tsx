import React, { useState } from 'react';
import { X, Utensils, CheckCircle2, AlertCircle, Sparkles, Check, Edit2, Plus, Trash2, Users, Save, AlertTriangle, RefreshCw, RotateCcw, Clock, Lock } from 'lucide-react';
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
    saveAsDefault?: boolean
  ) => void;
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
  const [basePeopleCount] = useState<number>(100); // Standard base reference

  // Kit Items State
  const [kitItems, setKitItems] = useState<KitItem[]>(kit.items);
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(false);

  // New Item Selector State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newProductQty, setNewProductQty] = useState<number>(1);

  // Check availability
  const checkItemStatus = (item: KitItem) => {
    const prod = products.find((p) => p.id === item.productId || p.name.toLowerCase() === item.productName.toLowerCase());
    if (!prod) return { ok: false, msg: 'Produto não encontrado', current: 0 };
    if (item.quantity > prod.currentStock) {
      return { ok: false, msg: `Insuficiente (${prod.currentStock} ${prod.unit} dispo.)`, current: prod.currentStock };
    }
    return { ok: true, msg: `Disponível (${prod.currentStock} ${prod.unit})`, current: prod.currentStock };
  };

  const hasAnyStockError = kitItems.some((item) => !checkItemStatus(item).ok);

  // Update item quantity directly
  const handleUpdateQuantity = (productId: string, newQty: number) => {
    setKitItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(0, Math.round(newQty * 100) / 100) } : i))
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

    // Check if already in kit
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
        const status = checkItemStatus(item);
        if (!status.ok && status.current > 0) {
          return { ...item, quantity: status.current };
        }
        return item;
      })
    );
  };

  const handleResetToDefaultKit = () => {
    setKitItems(DEFAULT_DAILY_KIT.items);
    setPeopleCount(100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kitItems.length === 0) {
      alert('Adicione ao menos um produto para entregar no kit da cozinha.');
      return;
    }

    if (hasAnyStockError) {
      alert('Atenção: Alguns itens do kit superam o estoque disponível. Ajuste as quantidades antes de confirmar.');
      return;
    }

    const updatedKit: DailyKit = {
      ...kit,
      items: kitItems,
    };

    onSubmitKit(updatedKit, retrievedBy, deliveredBy, date, time, saveAsDefault);
    onClose();
  };

  // Products available to add
  const availableProductsToAdd = products.filter(
    (p) => !kitItems.some((ki) => ki.productId === p.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Kit Diário da Cozinha (Totalmente Editável)</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Dedução Rápida
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ajuste os itens e volumes conforme o número de refeições/pessoas do dia.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* People Count & Scale Preset Section */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Estimativa de Refeições / Pessoas Hoje:
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[60, 80, 100, 120, 150, 200].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleScaleByPeople(num)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      peopleCount === num
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {num} p.
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Quantidade de Pessoas Atendidas
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={peopleCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    handleScaleByPeople(val);
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-tight">
                💡 Alterar o número de pessoas recalcula proporcionalmente as quantidades dos alimentos no kit.
              </div>
            </div>
          </div>

          {/* Responsibility Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="col-span-full bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                  Turno da Refeição:
                </span>
              </div>
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
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Retirado Por (Responsável da Cozinha)
              </label>
              <input
                type="text"
                value={retrievedBy}
                onChange={(e) => setRetrievedBy(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                required
              />

              {kitchenMissionaries.length > 0 && (
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
                value={deliveredBy}
                onChange={(e) => setDeliveredBy(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Horário</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Kit Items List Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Itens e Volumes do Kit ({kitItems.length})
              </h4>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaultKit}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800"
                  title="Restaurar composição oficial do Kit da Cozinha Cristolândia"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Restaurar Kit Padrão Cristolândia</span>
                </button>

                {hasAnyStockError && (
                  <button
                    type="button"
                    onClick={handleAdjustAllToMaxStock}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ajustar ao Máximo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Item Row List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {kitItems.map((item) => {
                const status = checkItemStatus(item);
                return (
                  <div
                    key={item.productId}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs transition-colors ${
                      status.ok
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-1.5 rounded-xl shrink-0 ${status.ok ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'}`}>
                        {status.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">{item.productName}</span>
                        <span className={`text-[10px] ${status.ok ? 'text-slate-500 dark:text-slate-400' : 'text-red-600 dark:text-red-400 font-bold'}`}>
                          {status.msg}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.productId, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-transparent font-black text-slate-900 dark:text-white text-center text-xs focus:outline-none"
                        />
                        <span className="text-slate-400 text-xs font-semibold">{item.unit}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Remover produto do kit de hoje"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {kitItems.length === 0 && (
                <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                  Nenhum produto selecionado no kit. Adicione produtos abaixo.
                </div>
              )}
            </div>

            {/* Add Custom Item to Kit Controls */}
            {availableProductsToAdd.length > 0 && (
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
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer whitespace-nowrap flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option to Save Composition as Standard Template */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <input
              type="checkbox"
              id="saveAsDefault"
              checked={saveAsDefault}
              onChange={(e) => setSaveAsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="saveAsDefault" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5 text-blue-500" />
              <span>Salvar esta composição e volumes como o novo Modelo Padrão do Kit Diário</span>
            </label>
          </div>

          {/* Footer Submit Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
              O estoque será deduzido e alocado para o setor <strong className="text-slate-800 dark:text-slate-200">Cozinha</strong>.
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                {isAdmin ? 'Cancelar' : 'Fechar'}
              </button>
              {isAdmin ? (
                <button
                  type="submit"
                  disabled={hasAnyStockError || kitItems.length === 0}
                  className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Entrega do Kit</span>
                </button>
              ) : (
                <div className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Somente Administrador pode confirmar</span>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

