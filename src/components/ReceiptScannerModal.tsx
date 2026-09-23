import React, { useState, useRef } from 'react';
import { Product, StockMovement } from '../types';
import { X, Camera, Upload, Sparkles, Check, AlertCircle, ShoppingCart, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { auth } from '../firebase';

interface ExtractedItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice?: number;
  matchedProductId?: string;
  selected: boolean;
}

interface ParsedReceiptData {
  donorOrStore: string;
  date: string;
  type: 'compra' | 'doacao';
  items: ExtractedItem[];
  totalAmount?: number;
  confidenceNotes?: string;
}

interface ReceiptScannerModalProps {
  products: Product[];
  onClose: () => void;
  onImportEntries: (entries: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    date: string;
    category: 'compra' | 'doacao';
    supplier: string;
    notes: string;
  }>) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  products,
  onClose,
  onImportEntries,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedReceiptData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione uma imagem válida (JPG, PNG ou WEBP).');
      return;
    }

    setErrorMessage(null);
    setImageMime(file.type);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      // Remove data:image/...;base64,
      const base64Data = result.split(',')[1];
      setImageBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessReceipt = async () => {
    if (!imageBase64) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const user = auth.currentUser;
      const idToken = user ? await user.getIdToken() : null;

      if (!idToken) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const response = await fetch('/api/ai/parse-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          imageBase64,
          mimeType: imageMime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao processar nota fiscal com a IA.');
      }

      const resJson = await response.json();
      const rawData = resJson.data;

      // Smart Matching com catálogo existente
      const enhancedItems: ExtractedItem[] = (rawData.items || []).map((item: any) => {
        const itemNameLower = (item.name || '').toLowerCase();
        const matched = products.find((p) => {
          const pNameLower = p.name.toLowerCase();
          return itemNameLower.includes(pNameLower) || pNameLower.includes(itemNameLower);
        });

        return {
          name: item.name || 'Item sem nome',
          quantity: Number(item.quantity) || 1,
          unit: item.unit || matched?.unit || 'un',
          estimatedUnitPrice: Number(item.estimatedUnitPrice) || 0,
          matchedProductId: matched?.id || '',
          selected: true,
        };
      });

      setParsedData({
        donorOrStore: rawData.donorOrStore || 'Estabelecimento / Doador',
        date: rawData.date || new Date().toISOString().split('T')[0],
        type: rawData.type === 'doacao' ? 'doacao' : 'compra',
        items: enhancedItems,
        totalAmount: rawData.totalAmount || 0,
        confidenceNotes: rawData.confidenceNotes || '',
      });
    } catch (err: any) {
      console.error('Erro na leitura da nota fiscal:', err);
      setErrorMessage(err.message || 'Erro ao processar imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData) return;

    const selectedItems = parsedData.items.filter((item) => item.selected && item.matchedProductId);
    if (selectedItems.length === 0) {
      setErrorMessage('Vincule ao menos 1 item a um produto do estoque para importar.');
      return;
    }

    const entriesToCreate = selectedItems.map((item) => {
      const prod = products.find((p) => p.id === item.matchedProductId);
      return {
        productId: item.matchedProductId!,
        productName: prod?.name || item.name,
        quantity: item.quantity,
        unit: prod?.unit || item.unit,
        unitPrice: item.estimatedUnitPrice || 0,
        date: parsedData.date,
        category: parsedData.type,
        supplier: parsedData.donorOrStore,
        notes: `Importado via Leitura IA Nota Fiscal (${parsedData.donorOrStore})`,
      };
    });

    onImportEntries(entriesToCreate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Entrada Inteligente por Foto de Nota / Recibo
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Carregue ou fotografe o cupom fiscal ou termo de doação para preenchimento automático via IA
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Upload / Captura */}
        {!parsedData && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center cursor-pointer hover:border-amber-500 dark:hover:border-amber-400 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition-all flex flex-col items-center justify-center gap-3"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Clique para tirar foto ou selecionar imagem da nota/recibo
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Suporta fotos de cupons fiscais, notas manuais ou listas de arrecadação
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden max-h-64 border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-black/5">
                  <img
                    src={imagePreview}
                    alt="Nota Fiscal"
                    className="max-h-64 object-contain rounded-xl"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageBase64(null);
                    }}
                    className="absolute top-2 right-2 px-3 py-1.5 bg-black/70 hover:bg-black text-white text-xs rounded-xl font-bold backdrop-blur-md"
                  >
                    Trocar Foto
                  </button>
                </div>

                <button
                  onClick={handleProcessReceipt}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analisando nota fiscal com visão computacional...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Extrair Produtos Automaticamente
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tabela de Produtos Extraídos */}
        {parsedData && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Origem / Fornecedor:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 ml-1">
                    {parsedData.donorOrStore}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Data Detectada:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 ml-1">
                    {parsedData.date}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Tipo:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 uppercase ml-1">
                    {parsedData.type}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Itens Identificados na Imagem ({parsedData.items.length})</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Vincule com o item correspondente do seu estoque
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {parsedData.items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      item.selected
                        ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-transparent opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) => {
                          const updated = [...parsedData.items];
                          updated[idx].selected = e.target.checked;
                          setParsedData({ ...parsedData, items: updated });
                        }}
                        className="rounded accent-amber-600 cursor-pointer"
                      />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Qtd: {item.quantity} {item.unit}
                          {item.estimatedUnitPrice ? ` • R$ ${item.estimatedUnitPrice.toFixed(2)}/un` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="w-full sm:w-56">
                      <select
                        value={item.matchedProductId || ''}
                        onChange={(e) => {
                          const updated = [...parsedData.items];
                          updated[idx].matchedProductId = e.target.value;
                          setParsedData({ ...parsedData, items: updated });
                        }}
                        className="w-full px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                      >
                        <option value="">Selecione no Estoque...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setParsedData(null)}
                className="px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Voltar à Foto
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" />
                Confirmar Entradas no Estoque
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
