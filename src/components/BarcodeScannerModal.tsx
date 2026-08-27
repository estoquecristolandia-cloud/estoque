import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, Search, PackageCheck, AlertCircle, Volume2 } from 'lucide-react';
import { Product } from '../types';
import { playBeepSound } from '../utils/audio';
import { ModalWrapper } from './ui/ModalWrapper';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

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
            'Não foi possível acessar a câmera. Certifique-se de conceder a permissão no navegador ou utilize a digitação manual do código.'
          );
          setIsScanning(false);
        }
      }
    };

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
    <ModalWrapper
      id="barcode-scanner-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Aproxime o código de barras da embalagem à câmera do dispositivo"
      icon={<Camera className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-between w-full text-xs text-slate-500">
          <span>Compatível com EAN-13, EAN-8, QR Code e Code-128</span>
          <Button variant="primary" onClick={onClose}>
            Concluir
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Camera Viewport Area */}
        <div className="relative bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden min-h-[260px] flex items-center justify-center">
          <div id={regionId} className="w-full h-full min-h-[250px]" />

          {!isScanning && !errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-200">
                Iniciando câmera do dispositivo...
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-6 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <p className="text-xs text-rose-300 font-bold max-w-xs">{errorMsg}</p>
            </div>
          )}

          {/* Overlaid Target Guide Lines */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-36 border-2 border-emerald-400 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rose-500/80 animate-pulse shadow-sm" />
              </div>
              <span className="mt-3 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
                Posicione o código no retângulo
              </span>
            </div>
          )}
        </div>

        {/* Camera Controls & Audio Status */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
            Sinal sonoro ativado ao bipar
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={toggleCamera}
            icon={<RefreshCw className="w-3 h-3" />}
          >
            {cameraFacing === 'environment' ? 'Câmera Traseira' : 'Câmera Frontal'}
          </Button>
        </div>

        {/* Last scanned feedback notification */}
        {lastScanned && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>
                Último Bip: <strong className="font-mono">{lastScanned}</strong>
              </span>
            </div>
            <Badge variant="success" size="sm">
              Lido com Sucesso
            </Badge>
          </div>
        )}

        {/* Fallback Manual Input */}
        <form onSubmit={handleManualSubmit} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-emerald-600" />
            <span>Digitar Código Manualmente:</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Ex: 7891000100103"
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <Button
              type="submit"
              variant="success"
              disabled={!manualBarcode.trim()}
              size="sm"
            >
              Buscar
            </Button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
};
