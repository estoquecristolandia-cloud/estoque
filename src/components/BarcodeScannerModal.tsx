import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, Zap, Search, PackageCheck, AlertCircle, Volume2 } from 'lucide-react';
import { Product } from '../types';
import { playBeepSound } from '../utils/audio';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string, matchedProduct?: Product) => void;
  products: Product[];
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  products,
  title = 'Leitor de Código de Barras / QR Code',
}) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = 'html5qrcode-scanner-region';

  // Play audio beep when scanned
  const playBeep = () => {
    playBeepSound();
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setLastScanned(null);
      setErrorMsg(null);
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setErrorMsg(null);
        // Clean previous instance if any
        if (scannerRef.current) {
          await stopScanner();
        }

        const html5Qrcode = new Html5Qrcode(regionId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        scannerRef.current = html5Qrcode;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.0,
        };

        await html5Qrcode.start(
          { facingMode: cameraFacing },
          config,
          (decodedText) => {
            if (!isMounted) return;
            playBeep();
            setLastScanned(decodedText);

            // Check if product matches by barcode or id
            const matched = products.find(
              (p) => p.barcode === decodedText || p.id === decodedText
            );

            onScanSuccess(decodedText, matched);
          },
          () => {
            // Frame scan failure - normal when searching
          }
        );

        if (isMounted) {
          setIsScanning(true);
        }
      } catch (err: any) {
        console.warn('Camera error:', err);
        if (isMounted) {
          setErrorMsg(
            'Não foi possível acessar a câmera. Certifique-se de que deu permissão no navegador ou utilize a digitação manual do código.'
          );
          setIsScanning(false);
        }
      }
    };

    // Small delay to ensure DOM element is rendered
    const timer = setTimeout(() => {
      startScanner();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, cameraFacing]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        // ignore cleanup error
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  const toggleCamera = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    const code = manualBarcode.trim();
    playBeep();
    const matched = products.find((p) => p.barcode === code || p.id === code);
    onScanSuccess(code, matched);
    setManualBarcode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">
                Aproxime o código de barras da embalagem à câmera do celular
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden min-h-[260px] flex items-center justify-center">
            {/* Target element for html5-qrcode */}
            <div id={regionId} className="w-full h-full min-h-[250px]" />

            {!isScanning && !errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
                <p className="text-xs font-semibold text-slate-300">
                  Iniciando a câmera do celular/computador...
                </p>
              </div>
            )}

            {errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-500" />
                <p className="text-xs text-rose-300 font-bold max-w-xs">{errorMsg}</p>
              </div>
            )}

            {/* Overlaid Target Guide Lines */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-64 h-36 border-2 border-amber-400/80 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)] relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rose-500/80 animate-pulse shadow-sm" />
                </div>
                <span className="mt-3 text-[10px] font-black uppercase tracking-wider text-amber-400 bg-slate-950/80 px-3 py-1 rounded-full border border-amber-500/30">
                  Posicione o código no retângulo
                </span>
              </div>
            )}
          </div>

          {/* Camera controls */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              Sinal sonoro ativo ao bipar
            </span>

            <button
              onClick={toggleCamera}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Alternar Câmera ({cameraFacing === 'environment' ? 'Traseira' : 'Frontal'})</span>
            </button>
          </div>

          {/* Last scanned feedback notification */}
          {lastScanned && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-2xl flex items-center justify-between text-xs text-emerald-200 animate-fadeIn">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  Último Bip: <strong className="text-white font-mono">{lastScanned}</strong>
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-md">
                Lido
              </span>
            </div>
          )}

          {/* Fallback Manual Input */}
          <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-800 space-y-2">
            <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Digitar Código de Barras Manualmente (Se a câmera falhar):</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Ex: 7891000100103"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!manualBarcode.trim()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Compatível com EAN-13, EAN-8, QR Code e Code-128
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
