export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

type ToastListener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
const listeners: Set<ToastListener> = new Set();

export function subscribeToast(listener: ToastListener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

export function showToast(
  title: string,
  type: ToastType = 'info',
  description?: string,
  duration = 4000
) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newToast: ToastMessage = { id, type, title, description, duration };
  toasts = [newToast, ...toasts].slice(0, 5); // Keep max 5
  notify();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export const toast = {
  success: (title: string, description?: string) => showToast(title, 'success', description),
  error: (title: string, description?: string) => showToast(title, 'error', description, 6000),
  info: (title: string, description?: string) => showToast(title, 'info', description),
  warning: (title: string, description?: string) => showToast(title, 'warning', description, 5000),
};
