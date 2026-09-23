import React, { useState } from 'react';
import { Product, StockMovement } from '../types';
import { generateDonationReceiptPDF } from '../utils/pdfExport';
import { X, FileText, Plus, Trash2, Printer, CheckCircle2 } from 'lucide-react';

interface DonationReceiptModalProps {
  products: Product[];
  recentDonations?: StockMovement[];
  onClose: () => void;
  managerName?: string;
}

export const DonationReceiptModal: React.FC<DonationReceiptModalProps> = ({
  products,
  recentDonations = [],
  onClose,
  managerName = 'Marconi Castro (Almoxarifado Cristolândia)',
}) => {
  const [donorName, setDonorName] = useState('');
  const [donorDocument, setDonorDocument] = useState('Igreja Batista / Parceiro Mantenedor');
  const [dateStr, setDateStr] = useState(new Date().toLocaleDateString('pt-BR'));
  const [receiptNumber, setReceiptNumber] = useState(
    `CRISTO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );

  const [items, setItems] = useState<Array<{ name: string; quantity: number; unit: string }>>([
    { name: '', quantity: 1, unit: 'kg' },
  ]);

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1, unit: 'kg' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      const updated = [...items];
      updated[index].name = prod.name;
      updated[index].unit = prod.unit;
      setItems(updated);
    }
  };

  const handleGeneratePDF = () => {
    const validItems = items.filter((i) => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      alert('Adicione ao menos um item com quantidade para o recibo.');
      return;
    }
    if (!donorName.trim()) {
      alert('Informe o nome do doador ou igreja parceira.');
      return;
    }

    generateDonationReceiptPDF({
      receiptNumber,
      donorName: donorName.trim(),
      donorDocument: donorDocument.trim(),
      items: validItems,
      dateStr,
      receiverName: managerName,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Emissão de Recibo Oficial de Doação
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comprovante timbrado padrão JMN para entrega a Igrejas, Empresas e Doadores
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Número do Recibo:
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Data do Recebimento:
              </label>
              <input
                type="text"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div className="text-xs space-y-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Nome do Doador / Igreja / Empresa:
              </label>
              <input
                type="text"
                placeholder="Ex: Primeira Igreja Batista de LEM / Irmão Carlos"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Identificação / Documento (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: CNPJ da Igreja / Cidade / Ministério"
                value={donorDocument}
                onChange={(e) => setDonorDocument(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          {/* Relação de Itens */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Mantimentos Doados</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Item
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    onChange={(e) => handleSelectProduct(idx, e.target.value)}
                    className="w-40 text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Do Catálogo...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Descrição do item"
                    value={item.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />

                  <input
                    type="number"
                    step="any"
                    placeholder="Qtd"
                    value={item.quantity || ''}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-16 text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center"
                  />

                  <input
                    type="text"
                    placeholder="Un"
                    value={item.unit}
                    onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                    className="w-14 text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center"
                  />

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGeneratePDF}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              Gerar e Baixar Recibo Oficial (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
