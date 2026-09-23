import React, { useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { getToastsSnapshot, subscribeToast, removeToast } from '../utils/toast';

const EMPTY_TOASTS: any[] = [];

export const ToastContainer: React.FC = () => {
  const toasts = useSyncExternalStore(subscribeToast, getToastsSnapshot, () => EMPTY_TOASTS);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((t) => {
          const getIcon = () => {
            switch (t.type) {
              case 'success':
                return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
              case 'error':
                return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
              case 'warning':
                return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
              default:
                return <Info className="w-5 h-5 text-blue-400 shrink-0" />;
            }
          };

          const getBorderColor = () => {
            switch (t.type) {
              case 'success':
                return 'border-emerald-500/40 bg-emerald-950/90 text-emerald-50';
              case 'error':
                return 'border-rose-500/40 bg-rose-950/90 text-rose-50';
              case 'warning':
                return 'border-amber-500/40 bg-amber-950/90 text-amber-50';
              default:
                return 'border-blue-500/40 bg-slate-900/95 text-slate-100';
            }
          };

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-xl backdrop-blur-md flex items-start gap-3 ${getBorderColor()}`}
            >
              <div className="mt-0.5">{getIcon()}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold leading-snug">{t.title}</h4>
                {t.description && (
                  <p className="text-xs opacity-90 leading-relaxed mt-0.5">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
