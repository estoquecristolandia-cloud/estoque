import React, { useState } from 'react';
import { ArrowUpRight, Check, AlertCircle, Camera, Clock, Plus, Trash2, Layers, Loader2 } from 'lucide-react';
import { Product, Sector, Missionary, KitchenShift } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { getTodayDateString, getNowTimeString } from '../utils/storage';
import { ModalWrapper } from './ui/ModalWrapper';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

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
    notes: string
  ) => Promise<void> | void;
  onSubmit?: (
    product: Product,
    quantity: number,
    sector: Sector,
    retrievedBy: string,
    deliveredBy: string,
    date: string,
    time: string,
    notes: string
  ) => Promise<void> | void;
}

const SECTORS: Sector[] = [
  'Cozinha',
  'Casa Missionária Masculina',
  'Casa Missionária Feminina',
  'Administração',
  'Casa da Coordenação (Huberto & Débora)',
  'Casa Lana & Joabe (Cesta Básica)',
  'Casa Marcos & Fabíola (Cesta Básica)',
  'Casa Tainã (Cesta Básica)',
  'Padaria',
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

  const handleSectorChange = (sec: Sector) => {
    setSector(sec);
    const available = missionaries.filter((m) => m.sector === sec);
    if (available.length > 0) {
      setRetrievedBy(available[0].name);
    } else if (sec === 'Cozinha') {
      setRetrievedBy('Equipe 1');
    } else if (sec === 'Padaria') {
      setRetrievedBy('Missionário Antônio Ferreira');
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
        setError(`Informe uma quantidade válida maior que zero para "${prod.name}" (Item #${i + 1}).`);
        return;
      }
      if (qtyNum > prod.currentStock) {
        setError(`Estoque insuficiente para "${prod.name}"! Saldo atual disponível: ${prod.currentStock} ${prod.unit}.`);
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

      if (onSubmitBatch) {
        await onSubmitBatch(preparedItems, sector, retrievedBy.trim(), deliveredBy.trim(), date, time, notes.trim());
      } else if (onSubmit) {
        for (const item of preparedItems) {
          await onSubmit(item.product, item.quantity, sector, retrievedBy.trim(), deliveredBy.trim(), date, time, notes.trim());
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
    <>
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        products={products}
      />

      <ModalWrapper
        isOpen={true}
        onClose={onClose}
        title="Nova Saída do Estoque"
        subtitle="Registrar entrega de mantimentos por setor de destino"
        icon={<ArrowUpRight className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
        iconBgColor="bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Sector & Retriever Information */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Setor de Destino <span className="text-rose-500">*</span>
                </label>
                <select
                  value={sector}
                  onChange={(e) => handleSectorChange(e.target.value as Sector)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  {SECTORS.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quem Retirou (Missionário / Resp.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Missionário Carlos Silva"
                  value={retrievedBy}
                  onChange={(e) => setRetrievedBy(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  required
                />
              </div>
            </div>

            {/* Quick Missionary Suggestions */}
            {sectorMissionaries.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Responsáveis cadastrados:</span>
                {sectorMissionaries.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setRetrievedBy(m.name)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-medium border cursor-pointer transition-colors ${
                      retrievedBy === m.name
                        ? 'bg-orange-500 text-white font-bold border-orange-500'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {m.name.replace('Missionário ', 'Miss. ').replace('Missionária ', 'Miss. ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kitchen Shift Selection */}
          {sector === 'Cozinha' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
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
                className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 focus:outline-none"
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
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Itens para Saída ({items.length})
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Camera className="w-3.5 h-3.5 text-amber-500" />}
                  onClick={() => {
                    setActiveScanningRowId(null);
                    setIsScannerOpen(true);
                  }}
                >
                  Bipar Câmera
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleAddItemRow}
                >
                  Adicionar Item
                </Button>
              </div>
            </div>

            {/* List of Product Rows */}
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {items.map((rowItem, idx) => {
                const selectedProd = products.find((p) => p.id === rowItem.productId);

                return (
                  <div
                    key={rowItem.rowId}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-orange-600 dark:text-orange-400">Item #{idx + 1}</span>
                      {selectedProd && (
                        <Badge
                          variant={selectedProd.currentStock > 0 ? 'emerald' : 'rose'}
                          size="sm"
                        >
                          Saldo: {selectedProd.currentStock} {selectedProd.unit}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Product Dropdown */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={rowItem.productId}
                          onChange={(e) => handleUpdateItem(rowItem.rowId, 'productId', e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-orange-500"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id} disabled={p.currentStock <= 0}>
                              {p.name} ({p.currentStock} {p.unit}) {p.currentStock <= 0 ? '- Esgotado' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity Input */}
                      <div className="w-28 sm:w-32 shrink-0">
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            placeholder="Qtd"
                            value={rowItem.quantity}
                            onChange={(e) => handleUpdateItem(rowItem.rowId, 'quantity', e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-extrabold focus:outline-none focus:border-orange-500 pr-8"
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
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-amber-500 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove Row Button */}
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(rowItem.rowId)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
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
          </div>

          {/* Delivered By, Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Entregue por (Resp. Estoque) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Marconi Castro"
                value={deliveredBy}
                onChange={(e) => setDeliveredBy(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data / Horário
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Observações (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Mantimentos para preparação do almoço da semana"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500">
              Total: <strong>{items.length}</strong> produto(s)
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="orange"
                size="md"
                isLoading={isSubmitting}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Confirmar Saída ({items.length})
              </Button>
            </div>
          </div>
        </form>
      </ModalWrapper>
    </>
  );
};
