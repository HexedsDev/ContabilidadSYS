import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ToastContext, type ToastItem, type ToastVariant } from './toast-context';

const variantConfig: Record<ToastVariant, { icon: React.ElementType; ring: string; text: string; bg: string }> = {
  success: { icon: CheckCircle2, ring: 'ring-success/30', text: 'text-success', bg: 'bg-success-soft' },
  error: { icon: AlertCircle, ring: 'ring-error/30', text: 'text-error', bg: 'bg-error-soft' },
  warning: { icon: AlertTriangle, ring: 'ring-warning/30', text: 'text-warning', bg: 'bg-warning-soft' },
  info: { icon: Info, ring: 'ring-info/30', text: 'text-info', bg: 'bg-info-soft' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).slice(2, 11);
      const t: ToastItem = { id, duration: 4000, ...toast };
      setToasts(prev => [...prev, t]);
      if (t.duration && t.duration > 0) {
        setTimeout(() => dismiss(id), t.duration);
      }
    },
    [dismiss]
  );

  const value = {
    push,
    success: (title: string, description?: string) => push({ variant: 'success', title, description }),
    error: (title: string, description?: string) => push({ variant: 'error', title, description }),
    warning: (title: string, description?: string) => push({ variant: 'warning', title, description }),
    info: (title: string, description?: string) => push({ variant: 'info', title, description }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none w-[min(360px,calc(100vw-2rem))]">
        <AnimatePresence>
          {toasts.map(t => {
            const cfg = variantConfig[t.variant];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'pointer-events-auto bg-surface rounded-sm border border-border-soft shadow-lg p-4 flex items-start gap-3',
                  'ring-1', cfg.ring
                )}
                role="alert"
              >
                <div className={cn('w-8 h-8 rounded-sm flex items-center justify-center shrink-0', cfg.bg)}>
                  <Icon className={cn('w-4 h-4', cfg.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-main text-sm leading-tight">{t.title}</p>
                  {t.description && (
                    <p className="text-text-muted text-xs mt-0.5">{t.description}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="text-text-subtle hover:text-text-main p-1 rounded -mt-1 -mr-1"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
