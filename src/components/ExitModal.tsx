import React, { useState } from 'react';
import { X, ArrowUpRight, Check, AlertCircle, Building2, Camera, Barcode, Clock, Plus, Trash2, Layers, Loader2 } from 'lucide-react';
import { Product, Sector, Missionary, KitchenShift } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { getTodayDateString, getNowTimeString } from '../utils/storage';

export interface ExitItem {
  rowId: string;
  productId: string;
  quantity: string;
}

interface ExitModalProps {
  products: Product[];
  selectedProduct?: Product | null;
  initialDate?: string;
  missionaries?: Missionary[];
  onClose: () => void;
  onSubmitBatch?: (
    items: Array<{ product: Product; quantity: number }>,
    sector: Sector,
    retrievedBy: string,
    deliveredBy: string,
    date: string,
    time: string,
    notes: string,
    clientRequestId?: string
  ) => Promise<void> | void;
  onSubmit?: (
    product: Product,
    quantity: number,
    sector: Sector,
    retrievedBy: string,
    deliveredBy: string,
    date: string,
    time: string,
    notes: string,
    clientRequestId?: string
  ) => Promise<void> | void;
}

const SECTORS: Sector[] = [
  'Cozinha',
  'Padaria',
  'Dormitórios / Alojamentos',
  'Baterias de Banheiros',
  'Lavanderia',
  'Kit Pessoal Acolhidos',
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

const KITCHEN_SHIFTS: KitchenShift[] = [
  'Café / Manhã',
  'Almoço',
  'Jantar / Tarde',
  'Ceia / Lanche',
];

export const ExitModal: React.FC<ExitModalProps> = ({
  products,
  selectedProduct,
  initialDate,
  missionaries = [],
  onClose,
  onSubmitBatch,
  onSubmit,
}) => {
  const [items, setItems] = useState<ExitItem[]>([
    {
      rowId: `row-${Date.now()}-1`,
      productId: selectedProduct?.id || (products[0]?.id || ''),
      quantity: '',
    },
  ]);

  const [sector, setSector] = useState<Sector>('Cozinha');
  const [kitchenShift, setKitchenShift] = useState<KitchenShift>('Almoço');
  const [retrievedBy, setRetrievedBy] = useState<string>('');
  const [deliveredBy, setDeliveredBy] = useState<string>('Marconi Castro (Gestor do Estoque)');
  const [date, setDate] = useState<string>(initialDate || getTodayDateString());
  const [time, setTime] = useState<string>(getNowTimeString());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeScanningRowId, setActiveScanningRowId] = useState<string | null>(null);

  // Filter missionaries for the selected sector
  const sectorMissionaries = missionaries.filter((m) => m.sector === sector);

  const handleAddItemRow = () => {
    // Pick first product that isn't already added if possible
    const usedProductIds = new Set(items.map((i) => i.productId));
    const availableProd = products.find((p) => !usedProductIds.has(p.id) && p.currentStock > 0) || products[0];

    setItems((prev) => [
      ...prev,
      {
        rowId: `row-${Date.now()}-${prev.length + 1}`,
        productId: availableProd?.id || '',
        quantity: '',
      },
    ]);
  };

  const handleRemoveItemRow = (rowId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.rowId !== rowId));
  };

  const handleUpdateItem = (rowId: string, field: 'productId' | 'quantity', value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.rowId === rowId ? { ...item, [field]: value } : item))
    );
    setError('');
  };

  const handleScanSuccess = (code: string, matchedProd?: Product) => {
    setIsScannerOpen(false);
    if (matchedProd) {
      if (activeScanningRowId) {
        handleUpdateItem(activeScanningRowId, 'productId', matchedProd.id);
      } else {
        // Append new row with matched product
        setItems((prev) => [
          ...prev,
          {
            rowId: `row-${Date.now()}-${prev.length + 1}`,
            productId: matchedProd.id,
            quantity: '1',
          },
        ]);
      }
      setError('');
    } else {
      setError(`Código "${code}" lido, mas não corresponde a nenhum produto cadastrado.`);
    }
  };

  // Auto set default retriever based on sector / shift
  const handleSectorChange = (sec: Sector) => {
    setSector(sec);
    const available = missionaries.filter((m) => m.sector === sec);
    if (available.length > 0) {
      setRetrievedBy(available[0].name);
    } else if (sec === 'Cozinha') {
      setRetrievedBy('Equipe 1');
    } else if (sec === 'Padaria') {
      setRetrievedBy('Fernando Pates');
    } else if (sec === 'Casa Missionária Masculina') {
      setRetrievedBy('Missionário Carlos Silva');
    } else if (sec === 'Casa Missionária Feminina') {
      setRetrievedBy('Missionária Ana Santos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!retrievedBy.trim()) {
      setError('Informe o nome da pessoa que retirou o(s) produto(s).');
      return;
    }
    if (!deliveredBy.trim()) {
      setError('Informe o nome de quem entregou o(s) produto(s).');
      return;
    }

    // Validate all item rows
    const preparedItems: Array<{ product: Product; quantity: number }> = [];

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const prod = products.find((p) => p.id === row.productId);
      if (!prod) {
        setError(`Selecione um produto válido para o item #${i + 1}.`);
        return;
      }
      const qtyNum = parseFloat(row.quantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        setError(`Informe uma quantidade válida maior que zero para o produto "${prod.name}" (Item #${i + 1}).`);
        return;
      }
      if (qtyNum > prod.currentStock) {
        setError(`Estoque insuficiente para "${prod.name}"! Saldo disponível: ${prod.currentStock} ${prod.unit}.`);
        return;
      }
      preparedItems.push({ product: prod, quantity: qtyNum });
    }

    if (preparedItems.length === 0) {
      setError('Adicione pelo menos um produto para registrar a saída.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const clientRequestId = `req-exit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      if (onSubmitBatch) {
        await onSubmitBatch(preparedItems, sector, retrievedBy.trim(), deliveredBy.trim(), date, time, notes.trim(), clientRequestId);
      } else if (onSubmit) {
        for (const item of preparedItems) {
          const itemRequestId = `${clientRequestId}-${item.product.id}`;
          await onSubmit(item.product, item.quantity, sector, retrievedBy.trim(), deliveredBy.trim(), date, time, notes.trim(), itemRequestId);
        }
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao registrar saída do estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        products={products}
      />

      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Nova Saída do Estoque</h3>
              <p className="text-xs text-slate-400">
                Registrar saída de <strong>um ou mais produtos</strong> para o setor de destino
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Destination Sector & Retriever Information */}
          <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Setor de Destino <span className="text-rose-400">*</span>
                </label>
                <select
                  value={sector}
                  onChange={(e) => handleSectorChange(e.target.value as Sector)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                >
                  {SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quem Retirou (Missionário / Resp.) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Missionário Carlos Silva"
                  value={retrievedBy}
                  onChange={(e) => setRetrievedBy(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            {/* Quick Missionary Suggestions */}
            {sectorMissionaries.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-semibold">Responsáveis cadastrados:</span>
                {sectorMissionaries.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setRetrievedBy(m.name)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium border cursor-pointer transition-colors ${
                      retrievedBy === m.name
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {m.name.replace('Missionário ', 'Miss. ').replace('Missionária ', 'Miss. ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kitchen Shift Selection if Cozinha */}
          {sector === 'Cozinha' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-extrabold text-amber-300">
                  Turno da Cozinha:
                </span>
              </div>
              <select
                value={kitchenShift}
                onChange={(e) => {
                  const s = e.target.value as KitchenShift;
                  setKitchenShift(s);
                  const matched = missionaries.find((m) => m.sector === 'Cozinha' && m.shift === s);
                  if (matched) setRetrievedBy(matched.name);
                }}
                className="bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400"
              >
                {KITCHEN_SHIFTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Multi-Item List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Itens para Saída ({items.length})
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveScanningRowId(null);
                    setIsScannerOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Bipar Câmera</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Adicionar Outro Item</span>
                </button>
              </div>
            </div>

            {/* List of Product Rows */}
            <div className="space-y-2.5">
              {items.map((rowItem, idx) => {
                const selectedProd = products.find((p) => p.id === rowItem.productId);

                return (
                  <div
                    key={rowItem.rowId}
                    className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold text-amber-400">Item #{idx + 1}</span>
                      {selectedProd && (
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            selectedProd.currentStock > 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          Disponível: {selectedProd.currentStock} {selectedProd.unit}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Product Dropdown */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={rowItem.productId}
                          onChange={(e) => handleUpdateItem(rowItem.rowId, 'productId', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id} disabled={p.currentStock <= 0}>
                              {p.name} ({p.currentStock} {p.unit}) {p.currentStock <= 0 ? '- Esgotado' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity Input */}
                      <div className="w-32 shrink-0">
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            placeholder="Qtd"
                            value={rowItem.quantity}
                            onChange={(e) => handleUpdateItem(rowItem.rowId, 'quantity', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-500 pr-8"
                            required
                          />
                          <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                            {selectedProd?.unit || ''}
                          </span>
                        </div>
                      </div>

                      {/* Scan Row Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveScanningRowId(rowItem.rowId);
                          setIsScannerOpen(true);
                        }}
                        title="Bipar código de barras para este item"
                        className="p-2 rounded-xl bg-slate-900 hover:bg-slate-700 border border-slate-700 text-amber-400 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove Row Button */}
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(rowItem.rowId)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                          title="Remover este item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Button underneath */}
            <button
              type="button"
              onClick={handleAddItemRow}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ Adicionar Mais Um Produto a Esta Saída</span>
            </button>
          </div>

          {/* Delivered By, Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Entregue por (Resp. Estoque) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Marconi Castro"
                value={deliveredBy}
                onChange={(e) => setDeliveredBy(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Data / Horário</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Observações (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Mantimentos solicitados para a semana"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Total: <strong>{items.length}</strong> produto(s)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando Baixa...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar Saída ({items.length} item{items.length > 1 ? 's' : ''})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

