import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, WifiOff, X } from 'lucide-react';
import { clearChunkReloadLock } from '../utils/lazyWithRetry';

interface LazyChunkErrorBoundaryProps {
  children: ReactNode;
  moduleName: string;
  moduleKey?: string;
  isModal?: boolean;
  onClose?: () => void;
}

interface LazyChunkErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

/**
 * ErrorBoundary localizado para capturar falhas de download em módulos lazy.
 * - Impede que falhas de rede em módulos secundários derrubem o dashboard ou desloguem o usuário.
 * - Oferece botão de retry manual localizado que reseta a chave e re-dispara o download.
 * - Suporta exibição em formato de modal (com botão fechar) ou de card em aba.
 * - Respeita prefers-reduced-motion e o design system do SIG-Cristolândia.
 */
export class LazyChunkErrorBoundary extends Component<
  LazyChunkErrorBoundaryProps,
  LazyChunkErrorBoundaryState
> {
  public state: LazyChunkErrorBoundaryState = {
    hasError: false,
    error: null,
    resetKey: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<LazyChunkErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[LazyChunkErrorBoundary] Falha ao carregar ${this.props.moduleName}:`, error, errorInfo);
  }

  private handleRetry = () => {
    if (this.props.moduleKey) {
      clearChunkReloadLock(this.props.moduleKey);
    }
    this.setState((prev) => ({
      hasError: false,
      error: null,
      resetKey: prev.resetKey + 1,
    }));
  };

  public render() {
    if (this.state.hasError) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (this.props.isModal) {
        return (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="chunk-error-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 motion-safe:animate-fade-in"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center max-w-md w-full text-center relative">
              {this.props.onClose && (
                <button
                  type="button"
                  onClick={this.props.onClose}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4">
                {isOffline ? <WifiOff className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>

              <h3 id="chunk-error-modal-title" className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Não foi possível carregar {this.props.moduleName}
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                {isOffline
                  ? 'Você está sem conexão com a internet. O módulo será carregado assim que o sinal for restabelecido.'
                  : 'Houve uma instabilidade na rede ao carregar os arquivos deste módulo. O restante do sistema continua operacional.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer motion-reduce:transition-none"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Tentar novamente</span>
                </button>
                {this.props.onClose && (
                  <button
                    type="button"
                    onClick={this.props.onClose}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Voltar ao sistema
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Card localizado para abas inteiras (Relatórios ou Assistente IA)
      return (
        <div
          role="alert"
          aria-labelledby="chunk-error-section-title"
          className="flex flex-col items-center justify-center p-8 sm:p-12 min-h-[360px] bg-white dark:bg-slate-900 border border-amber-500/30 rounded-3xl shadow-sm text-center max-w-xl mx-auto my-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-4">
            {isOffline ? <WifiOff className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </div>

          <h3 id="chunk-error-section-title" className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Módulo temporariamente indisponível
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-md">
            {isOffline
              ? `O dispositivo está sem conexão à internet. Não foi possível baixar os arquivos de ${this.props.moduleName}.`
              : `Ocorreu uma falha ao baixar os componentes de ${this.props.moduleName}. O dashboard e as demais telas continuam funcionando normalmente.`}
          </p>

          <button
            type="button"
            onClick={this.handleRetry}
            className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-md motion-reduce:transition-none"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar carregar novamente</span>
          </button>
        </div>
      );
    }

    // Remonta o componente limpo caso o resetKey seja incrementado no retry manual
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}
