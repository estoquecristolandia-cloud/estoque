import React, { useState } from 'react';
import { X, ArrowDownLeft, Check, Camera, Loader2 } from 'lucide-react';
import { Product, EntryType } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { getTodayDateString, getNowTimeString } from '../utils/storage';

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
    notes: string,
    clientRequestId?: string
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

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');
      const clientRequestId = `req-entry-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await onSubmit(targetProd, qtyNum, entryType, supplierOrDonor.trim(), receivedBy.trim(), date, time, notes.trim(), clientRequestId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao registrar entrada no estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      {/* Scanner Sub-Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        products={products}
      />

      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header - Sticky */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
              <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Nova Entrada no Estoque</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Registrar compras ou doações recebidas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Product selection with Scanner trigger */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Produto <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50 active:scale-95"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Bipar Câmera</span>
              </button>
            </div>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setError('');
              }}
              disabled={isSubmitting}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-3 sm:py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Atual: {p.currentStock} {p.unit}) {p.barcode ? ` - EAN: ${p.barcode}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Type & Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tipo de Entrada</label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setEntryType('Compra')}
                  disabled={isSubmitting}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    entryType === 'Compra' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🛒 Compra
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('Doação')}
                  disabled={isSubmitting}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    entryType === 'Doação' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🎁 Doação
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Quantidade ({targetProd?.unit || 'unid'}) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="Ex: 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 sm:py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                required
              />
            </div>
          </div>

          {/* Supplier or Donor */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {entryType === 'Compra' ? 'Fornecedor / Mercado' : 'Nome do Doador / Entidade'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder={entryType === 'Compra' ? 'Ex: Mercado Central / Atacadão' : 'Ex: Igreja Batista / Supermercado Amigo'}
              value={supplierOrDonor}
              onChange={(e) => setSupplierOrDonor(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 sm:py-2 text-sm text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              required
            />
          </div>

          {/* Received by & Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Recebido por <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Marconi Castro"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 sm:py-2 text-sm text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Data / Horário</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2.5 sm:py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={isSubmitting}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2.5 sm:py-2 text-xs text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Observações (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Nota fiscal nº 4021 ou campanha solidária"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 sm:py-2 text-sm text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
          </div>

          {/* Bottom spacer for comfortable scrolling */}
          <div className="h-2" />
        </form>

        {/* Footer buttons - Sticky thumb area */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-4 py-3 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors text-center"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-2 sm:flex-none px-6 py-3 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-98"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gravando...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirmar Entrada</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
