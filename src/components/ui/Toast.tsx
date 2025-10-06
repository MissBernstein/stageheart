// Toast notification system
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { theme } from '../../styles/theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: theme.spacing.lg,
        right: theme.spacing.lg,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.sm,
        maxWidth: '400px',
      }}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{
  toast: Toast;
  onRemove: () => void;
}> = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={20} color={theme.colors.success} />;
      case 'error':
        return <AlertCircle size={20} color={theme.colors.error} />;
      case 'warning':
        return <AlertTriangle size={20} color={theme.colors.warning} />;
      case 'info':
      default:
        return <Info size={20} color={theme.colors.info} />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      case 'info':
      default:
        return theme.colors.info;
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        border: `1px solid ${theme.colors.border}`,
        borderLeft: `4px solid ${getBorderColor()}`,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
        minWidth: '300px',
        animation: 'slideIn 0.3s ease-out'
      }}
      role="alert"
      aria-live="polite"
    >
      {getIcon()}
      
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: theme.typography.sizes.sm,
            fontWeight: theme.typography.weights.semibold,
            color: theme.colors.text.primary,
            marginBottom: toast.description ? theme.spacing.xs : 0,
          }}
        >
          {toast.title}
        </div>
        
        {toast.description && (
          <div
            style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
              lineHeight: 1.4,
            }}
          >
            {toast.description}
          </div>
        )}
      </div>

      <button
        onClick={onRemove}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: theme.colors.text.muted,
          padding: theme.spacing.xs,
          borderRadius: theme.radius.sm,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};