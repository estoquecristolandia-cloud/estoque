import React, { useState } from 'react';
import { X, ArrowDownLeft, Plus, Check, Camera, Barcode } from 'lucide-react';
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
    notes: string
  ) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    onSubmit(targetProd, qtyNum, entryType, supplierOrDonor, receivedBy, date, time, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      {/* Scanner Sub-Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        products={products}
      />

      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Nova Entrada no Estoque</h3>
              <p className="text-xs text-slate-400">Registrar compras ou doações recebidas</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Product selection with Scanner trigger */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Produto <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold cursor-pointer transition-all"
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
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Entrada</label>
              <div className="grid grid-cols-2 gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setEntryType('Compra')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    entryType === 'Compra' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🛒 Compra
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('Doação')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    entryType === 'Doação' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🎁 Doação
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quantidade ({targetProd?.unit || 'unid'}) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="Ex: 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Supplier or Donor */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {entryType === 'Compra' ? 'Fornecedor / Mercado' : 'Nome do Doador / Entidade'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder={entryType === 'Compra' ? 'Ex: Mercado Central / Atacadão' : 'Ex: Igreja Batista / Supermercado Amigo'}
              value={supplierOrDonor}
              onChange={(e) => setSupplierOrDonor(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Received by & Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Recebido por <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Marconi Castro"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Data / Horário</label>
              <div className="grid grid-cols-2 gap-1">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Observações (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Nota fiscal nº 4021 ou doação de campanha de alimentos"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Entrada</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
