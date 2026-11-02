import React, { useMemo } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle, Database } from 'lucide-react';

export type SyncStatus =
  | 'offline'
  | 'connecting'
  | 'syncing'
  | 'synced'
  | 'sync-error'
  | 'local-cache';

interface ConnectionStatusBarProps {
  status: SyncStatus;
  lastSyncedAt: Date | null;
}

/**
 * Barra discreta, honesta e responsiva de estado de conexão e sincronização.
 *
 * Diferencia determinística e fielmente:
 * - offline: navegador sem conexão de rede.
 * - connecting: rede restabelecida, aguardando resposta autoritativa do Firestore.
 * - syncing: transação de escrita ou reconciliação de dados em andamento.
 * - synced: confirmação real de snapshot recebido recentemente via onSnapshot.
 * - sync-error: erro reportado pelo listener ou falha de conectividade com o banco.
 * - local-cache: dados exibidos do armazenamento local antes do primeiro snapshot.
 */
export const ConnectionStatusBar: React.FC<ConnectionStatusBarProps> = ({
  status,
  lastSyncedAt,
}) => {
  const formattedTime = useMemo(() => {
    if (!lastSyncedAt) return null;
    try {
      return lastSyncedAt.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return null;
    }
  }, [lastSyncedAt]);

  const config = useMemo(() => {
    switch (status) {
      case 'offline':
        return {
          wrapperClass:
            'bg-slate-200/90 dark:bg-slate-900/90 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-300',
          dotClass: 'bg-slate-400 dark:bg-slate-500',
          icon: <WifiOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
          badge: 'Offline',
          badgeClass: 'bg-slate-300/80 dark:bg-slate-800 text-slate-800 dark:text-slate-300',
          message: 'Offline — exibindo dados locais; novas operações aguardam conexão.',
        };

      case 'connecting':
        return {
          wrapperClass:
            'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30 text-amber-900 dark:text-amber-200',
          dotClass: 'bg-amber-500 animate-pulse',
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />,
          badge: 'Conectando',
          badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30',
          message: 'Conexão restabelecida — aguardando confirmação autoritativa do Firestore...',
        };

      case 'syncing':
        return {
          wrapperClass:
            'bg-blue-500/10 dark:bg-blue-950/40 border-blue-500/30 text-blue-900 dark:text-blue-200',
          dotClass: 'bg-blue-500 animate-pulse',
          icon: <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />,
          badge: 'Sincronizando',
          badgeClass: 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/30',
          message: 'Gravando movimentação e sincronizando com a nuvem...',
        };

      case 'sync-error':
        return {
          wrapperClass:
            'bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/30 text-rose-900 dark:text-rose-200',
          dotClass: 'bg-rose-500',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
          badge: 'Falha de Sincronização',
          badgeClass: 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30',
          message: 'Instabilidade na sincronização do Firestore. Operações podem aguardar estabilização.',
        };

      case 'local-cache':
        return {
          wrapperClass:
            'bg-indigo-500/10 dark:bg-indigo-950/30 border-indigo-500/20 text-indigo-900 dark:text-indigo-200',
          dotClass: 'bg-indigo-500',
          icon: <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />,
          badge: 'Cache Local',
          badgeClass: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30',
          message: 'Exibindo dados locais seguros — aguardando confirmação do servidor...',
        };

      case 'synced':
      default:
        return {
          wrapperClass:
            'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/15 text-emerald-800 dark:text-emerald-300',
          dotClass: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
          badge: 'Sincronizado',
          badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25',
          message: formattedTime
            ? `Sincronizado com Firestore (última confirmação às ${formattedTime})`
            : 'Sincronizado com Firestore em tempo real',
        };
    }
  }, [status, formattedTime]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full py-1.5 px-3 sm:px-6 border-b text-[11px] sm:text-xs font-medium flex items-center justify-between gap-2 select-none transition-colors duration-200 ${config.wrapperClass}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {config.icon}
        <span
          className={`text-[9.5px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${config.badgeClass} shrink-0`}
        >
          {config.badge}
        </span>
        <span className="truncate">{config.message}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 text-[10px] opacity-75">
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
        <span className="hidden sm:inline font-mono">
          {status === 'synced' && formattedTime ? formattedTime : status.toUpperCase()}
        </span>
      </div>
    </div>
  );
};
