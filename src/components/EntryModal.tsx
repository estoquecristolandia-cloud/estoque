import React, { useState } from 'react';
import { ArrowDownLeft, Check, Camera, Loader2, Package } from 'lucide-react';
import { Product, EntryType } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { getTodayDateString, getNowTimeString } from '../utils/storage';
import { ModalWrapper } from './ui/ModalWrapper';
import { Button } from './ui/Button';

interface EntryModalProps {
  products: Product[];
  selectedProduct?: Product | null;
  initialDate?: string;
  onClose: () => void;
  onSubmit: (
    product: Product,
    quantity: number,
    entryType: EntryType,
    supplierOrDonor: string,
    receivedBy: string,
    date: string,
    time: string,
    notes: string
  ) => Promise<void> | void;
}

export const EntryModal: React.FC<EntryModalProps> = ({
  products,
  selectedProduct,
  initialDate,
  onClose,
  onSubmit,
}) => {
  const [productId, setProductId] = useState<string>(selectedProduct?.id || (products[0]?.id || ''));
  const [quantity, setQuantity] = useState<string>('');
  const [entryType, setEntryType] = useState<EntryType>('Compra');
  const [supplierOrDonor, setSupplierOrDonor] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('Marconi Castro (Gestor do Estoque)');
  const [date, setDate] = useState<string>(initialDate || getTodayDateString());
  const [time, setTime] = useState<string>(getNowTimeString());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const targetProd = products.find((p) => p.id === productId);

  const handleScanSuccess = (code: string, matchedProd?: Product) => {
    setIsScannerOpen(false);
    if (matchedProd) {
      setProductId(matchedProd.id);
      setError('');
    } else {
      setError(`Código "${code}" lido, mas não corresponde a nenhum produto cadastrado.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!targetProd) {
      setError('Selecione um produto.');
      return;
    }
    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Informe uma quantidade válida maior que zero.');
      return;
    }
    if (!supplierOrDonor.trim()) {
      setError('Informe o Fornecedor ou Doador.');
      return;
    }
    if (!receivedBy.trim()) {
      setError('Informe quem recebeu o produto.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSubmit(targetProd, qtyNum, entryType, supplierOrDonor.trim(), receivedBy.trim(), date, time, notes.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao registrar entrada no estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Scanner Sub-Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        products={products}
      />

      <ModalWrapper
        isOpen={true}
        onClose={onClose}
        title="Nova Entrada no Estoque"
        subtitle="Registrar compras ou doações recebidas na Cristolândia"
        icon={<ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
        iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Product selection with Scanner trigger */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Produto <span className="text-rose-500">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Camera className="w-3.5 h-3.5 text-amber-500" />}
                onClick={() => setIsScannerOpen(true)}
                disabled={isSubmitting}
              >
                Bipar Câmera
              </Button>
            </div>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setError('');
              }}
              disabled={isSubmitting}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Atual: {p.currentStock} {p.unit}) {p.barcode ? ` - EAN: ${p.barcode}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Type & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Entrada
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEntryType('Compra')}
                  disabled={isSubmitting}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    entryType === 'Compra'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  🛒 Compra
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('Doação')}
                  disabled={isSubmitting}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    entryType === 'Doação'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  🎁 Doação
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantidade ({targetProd?.unit || 'unid'}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="Ex: 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Supplier or Donor */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {entryType === 'Compra' ? 'Fornecedor / Mercado' : 'Nome do Doador / Entidade'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder={entryType === 'Compra' ? 'Ex: Mercado Central / Atacadão' : 'Ex: Igreja Batista / Supermercado Amigo'}
              value={supplierOrDonor}
              onChange={(e) => setSupplierOrDonor(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>

          {/* Received by & Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Recebido por <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Marconi Castro"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data / Horário
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
              placeholder="Ex: Nota fiscal nº 4021 ou campanha especial"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
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
              variant="emerald"
              size="md"
              isLoading={isSubmitting}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Confirmar Entrada
            </Button>
          </div>
        </form>
      </ModalWrapper>
    </>
  );
};
