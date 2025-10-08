import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motionDur, motionEase } from './motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type ToastVariant = 'default' | 'success' | 'error';

export interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastRecord extends Required<Omit<ToastOptions, 'id'>> {
  id: string;
}

interface ToastContextValue {
  toasts: ToastRecord[];
  show: (options: ToastOptions) => { id: string };
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const DEFAULT_DURATION = 2500;
const TOAST_LIMIT = 3;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const createId = () => `toast-${Math.random().toString(36).slice(2, 9)}`;

const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const variantStyles: Record<ToastVariant, { container: string; indicator: string; Icon: typeof CheckCircle2 }> = {
  default: {
    container: 'bg-card/95 border-card-border text-card-foreground',
    indicator: 'bg-primary',
    Icon: Info,
  },
  success: {
    container: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100',
    indicator: 'bg-emerald-400',
    Icon: CheckCircle2,
  },
  error: {
    container: 'bg-red-500/15 border-red-400/40 text-red-100',
    indicator: 'bg-red-400',
    Icon: AlertTriangle,
  },
};

const getVariantStyles = (variant: ToastVariant) => {
  if (!variantStyles[variant]) {
    console.error(`Undefined toast variant: ${variant}`);
    return variantStyles.default; // Fallback to default styles
  }
  return variantStyles[variant];
};



interface ToastProviderProps {
  children: ReactNode;
}

const ToastItem = ({ toast, onRemove, prefersReducedMotion }: { 
  toast: ToastRecord; 
  onRemove: () => void; 
  prefersReducedMotion: boolean; 
}) => {
  const { container, indicator, Icon } = getVariantStyles(toast.variant);
  
  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: motionDur.base / 1000, ease: motionEase.entrance }}
      className={cn(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border p-4 shadow-lg backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'motion-safe-only',
        container,
      )}
      role="status"
      aria-live="polite"
      tabIndex={0}
      onBlur={onRemove}
    >
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full', indicator)} aria-hidden />
        <div className="flex-1 space-y-1">
          <div className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4" aria-hidden />
            <p className="font-semibold leading-tight">{toast.title}</p>
          </div>
          {toast.description && <p className="text-sm text-muted-foreground/90">{toast.description}</p>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-1 text-sm/none text-foreground/60 transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">Dismiss toast</span>
        </button>
      </div>
    </motion.div>
  );
};

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeout = timeouts.current[id];
    if (timeout) {
      clearTimeout(timeout);
      delete timeouts.current[id];
    }
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
    Object.values(timeouts.current).forEach(clearTimeout);
    timeouts.current = {};
  }, []);

  const show = useCallback(
    ({ id, title, description, variant = 'default', duration = DEFAULT_DURATION }: ToastOptions) => {
      const toastId = id ?? createId();
      setToasts((prev) => {
        const next: ToastRecord[] = [
          ...prev,
          {
            id: toastId,
            title,
            description: description ?? '',
            variant,
            duration,
          },
        ];
        return next.slice(-TOAST_LIMIT);
      });

      if (duration > 0) {
        const timeout = setTimeout(() => dismiss(toastId), duration);
        timeouts.current[toastId] = timeout;
      }

      return { id: toastId };
    },
    [dismiss],
  );

  useEffect(() => () => {
    Object.values(timeouts.current).forEach(clearTimeout);
  }, []);

  const value = useMemo(() => ({ toasts, show, dismiss, dismissAll }), [toasts, show, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-3 px-4">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onRemove={() => dismiss(toast.id)}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </AnimatePresence>
      </div>
      <ToastRegistrar />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const { toasts, show, dismiss, dismissAll } = useToastContext();

  const success = useCallback((title: string, description?: string) => show({ title, description, variant: 'success' }), [show]);
  const error = useCallback((title: string, description?: string) => show({ title, description, variant: 'error' }), [show]);

  return {
    toasts,
    toast: show,
    dismiss,
    dismissAll,
    success,
    error,
  };
};

export const toast = {
  show: (options: ToastOptions) => {
    const context = toastStore.get();
    return context.show(options);
  },
  success: (title: string, description?: string) => {
    const context = toastStore.get();
    return context.show({ title, description, variant: 'success' });
  },
  error: (title: string, description?: string) => {
    const context = toastStore.get();
    return context.show({ title, description, variant: 'error' });
  },
  info: (title: string, description?: string) => {
    const context = toastStore.get();
    return context.show({ title, description, variant: 'default' });
  },
};

// Lightweight store so non-hook modules can trigger toasts
const toastStore = (() => {
  let context: ToastContextValue | null = null;
  return {
    set: (value: ToastContextValue) => {
      context = value;
    },
    clear: () => {
      context = null;
    },
    get: () => {
      if (!context) {
        throw new Error('Toast store not initialised. Wrap your app with <ToastProvider>.');
      }
      return context;
    },
  };
})();

export const ToastRegistrar = () => {
  const context = useToastContext();
  useEffect(() => {
    toastStore.set(context);
    return () => {
      toastStore.clear();
    };
  }, [context]);
  return null;
};
