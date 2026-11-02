import { ComponentType, lazy, LazyExoticComponent } from 'react';

interface LazyRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
}

/**
 * Remove a trava de reload de um módulo específico em sessionStorage.
 * Útil para redefinir o estado quando o usuário clica em "Tentar novamente".
 */
export function clearChunkReloadLock(moduleKey: string): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(`sig_chunk_reload_${moduleKey}`);
    }
  } catch {
    // Tratamento defensivo caso o acesso ao sessionStorage esteja bloqueado
  }
}

/**
 * Carrega componentes dinâmicos (React.lazy) com proteção contra falhas de rede transitórias.
 *
 * 1. Tenta até 2 retentativas automáticas em memória com backoff leve (ex: 800ms, 1600ms).
 * 2. Se as retentativas falharem:
 *    - Se houver evidência de chunk obsoleto (ex: 404 / 'Failed to fetch dynamically imported module'
 *      após novo deploy), executa reload limpo ÚNICO com trava em sessionStorage para impedir loops.
 *    - Se a trava já foi utilizada ou o erro for persistente, repassa o erro para o LazyChunkErrorBoundary
 *      que exibirá o fallback amigável com opção manual de "Tentar novamente".
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  moduleKey: string,
  options: LazyRetryOptions = {}
): LazyExoticComponent<T> {
  const { maxRetries = 2, initialDelayMs = 800 } = options;

  return lazy(() => {
    let attemptCount = 0;

    const execute = async (): Promise<{ default: T }> => {
      try {
        const result = await factory();
        // Em caso de sucesso, limpa qualquer trava antiga para futuros carregamentos
        clearChunkReloadLock(moduleKey);
        return result;
      } catch (err: unknown) {
        attemptCount++;

        // Tentativa de retry automático transitório (até maxRetries)
        if (attemptCount <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, initialDelayMs * attemptCount));
          return execute();
        }

        // Analisa se o erro é decorrente de hash de chunk ausente após novo build/deploy
        const errorMessage = String((err as Error)?.message || err || '');
        const errorName = String((err as Error)?.name || '');
        const isChunkMismatch =
          errorName === 'ChunkLoadError' ||
          errorMessage.includes('Failed to fetch dynamically imported module') ||
          errorMessage.includes('Loading chunk') ||
          errorMessage.includes('dynamically imported module') ||
          errorMessage.includes('error loading dynamically imported module');

        const sessionKey = `sig_chunk_reload_${moduleKey}`;
        let alreadyReloaded = false;

        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            alreadyReloaded = !!window.sessionStorage.getItem(sessionKey);
          }
        } catch {
          alreadyReloaded = false;
        }

        // Se for evidência clara de chunk desatualizado e NUNCA tiver recarregado nesta sessão:
        if (isChunkMismatch && !alreadyReloaded && typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem(sessionKey, String(Date.now()));
          } catch {
            // prossegue
          }
          window.location.reload();
          // Retorna promise pendente enquanto a página recarrega
          return new Promise<{ default: T }>(() => {});
        }

        // Caso contrário, lança o erro para o LazyChunkErrorBoundary capturar de forma localizada
        throw err;
      }
    };

    return execute();
  });
}
