import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Product } from '../types';
import { X, Camera, Barcode, CheckCircle2, AlertCircle, ArrowDownLeft, ArrowUpRight, Plus, RefreshCw } from 'lucide-react';

interface BarcodeScannerModalProps {
  products: Product[];
  onClose: () => void;
  isOpen?: boolean;
  onOpenEntry?: (product: Product) => void;
  onOpenExit?: (product: Product) => void;
  onLinkBarcode?: (productId: string, barcode: string) => void;
  onAddNewWithBarcode?: (barcode: string) => void;
  onScanProduct?: (code: string) => void;
  onScanSuccess?: (code: string, matchedProduct?: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  products,
  onClose,
  isOpen = true,
  onOpenEntry,
  onOpenExit,
  onLinkBarcode,
  onAddNewWithBarcode,
  onScanProduct,
  onScanSuccess,
}) => {
  if (!isOpen) return null;

  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedProductIdToLink, setSelectedProductIdToLink] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Play audio beep on scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Ignore audio error if audio context is blocked
    }
  };

  const handleBarcodeDecoded = (decodedText: string) => {
    playBeep();
    setScannedCode(decodedText);

    // Stop active camera
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
      setIsScanning(false);
    }

    // Find in products list
    const found = products.find(
      (p) =>
        p.barcode === decodedText ||
        p.id === decodedText ||
        (p.barcode && p.barcode.trim() === decodedText.trim())
    );

    if (found) {
      setMatchedProduct(found);
    } else {
      setMatchedProduct(null);
    }

    if (onScanProduct) {
      onScanProduct(decodedText);
    }
    if (onScanSuccess) {
      onScanSuccess(decodedText, found);
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    setScannedCode(null);
    setMatchedProduct(null);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('barcode-camera-view');
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 180 },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          handleBarcodeDecoded(decodedText);
        },
        () => {
          // ignore frame decode misses
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn('Erro ao abrir câmera para leitor de código de barras:', err);
      setCameraError(
        'Não foi possível acessar a câmera. Verifique as permissões de vídeo do navegador ou utilize em um celular/tablet.'
      );
      setIsScanning(false);
    }
  };

  useEffect(() => {
    startScanner();

    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current.clear();
      }
    };
  }, []);

  const handleLinkProduct = () => {
    if (!scannedCode || !selectedProductIdToLink || !onLinkBarcode) return;
    onLinkBarcode(selectedProductIdToLink, scannedCode);
    const linked = products.find((p) => p.id === selectedProductIdToLink);
    if (linked) {
      setMatchedProduct({ ...linked, barcode: scannedCode });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Barcode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Leitor de Código de Barras / QR Code
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aponte a câmera para a embalagem para identificação e movimentação instantânea
            </p>
          </div>
        </div>

        {/* Viewport da Câmera */}
        {!scannedCode && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
              <div id="barcode-camera-view" className="w-full h-full" />
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-64 h-36 border-2 border-emerald-400 rounded-lg animate-pulse relative">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  </div>
                  <span className="mt-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-xs font-semibold text-white">
                    Posicione a barra ou QR Code no quadro
                  </span>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-700 dark:text-amber-400 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Aviso sobre a câmera:</p>
                  <p className="mt-1">{cameraError}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resultado do Escaneamento */}
        {scannedCode && (
          <div className="space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>Código Bipado com Sucesso</span>
                <span className="font-mono bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                  {scannedCode}
                </span>
              </div>

              {matchedProduct ? (
                <div className="mt-3 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {matchedProduct.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {matchedProduct.category} • Depto: {matchedProduct.department === 'dml' ? 'DML/Limpeza' : 'Alimentação'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Estoque Físico</span>
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        {matchedProduct.currentStock} {matchedProduct.unit}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block">Estoque Mínimo</span>
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        {matchedProduct.minStock} {matchedProduct.unit}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => {
                        onOpenEntry(matchedProduct);
                        onClose();
                      }}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      Dar Entrada
                    </button>
                    <button
                      onClick={() => {
                        onOpenExit(matchedProduct);
                        onClose();
                      }}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Dar Saída
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Item não cadastrado com este código
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Deseja vincular este código a um produto existente do catálogo ou cadastrar um novo?
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                      Vincular a um produto existente:
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedProductIdToLink}
                        onChange={(e) => setSelectedProductIdToLink(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200"
                      >
                        <option value="">Selecione um produto...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.unit})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleLinkProduct}
                        disabled={!selectedProductIdToLink}
                        className="px-3 py-2 bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Salvar Vínculo
                      </button>
                    </div>
                  </div>

                  {onAddNewWithBarcode && (
                    <button
                      onClick={() => {
                        onAddNewWithBarcode(scannedCode);
                        onClose();
                      }}
                      className="w-full mt-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Cadastrar Novo Produto com este Código
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={startScanner}
              className="w-full py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Escanear Outro Produto
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
