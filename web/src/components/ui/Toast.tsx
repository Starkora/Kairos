import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Tipos de toast
 */
type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Interfaz de un toast
 */
interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

/**
 * Context para manejar toasts
 */
interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Hook para usar el sistema de toasts
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return context;
};

/**
 * Props para ToastProvider
 */
interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * Provider del sistema de toasts
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, type, message, duration };
    
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
};

/**
 * Props para ToastContainer
 */
interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

/**
 * Contenedor de toasts
 */
const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      maxWidth: 400
    }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

/**
 * Props para ToastItem
 */
interface ToastItemProps {
  toast: Toast;
  onClose: (id: string) => void;
}

/**
 * Item individual de toast con animación
 */
const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = React.useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  const getColors = () => {
    switch (toast.type) {
      case 'success':
        return { bg: '#10b981', icon: '✓' };
      case 'error':
        return { bg: '#ef4444', icon: '✕' };
      case 'warning':
        return { bg: '#f59e0b', icon: '⚠' };
      case 'info':
        return { bg: '#3b82f6', icon: 'ℹ' };
    }
  };

  const { bg, icon } = getColors();

  return (
    <div
      style={{
        background: bg,
        color: '#fff',
        padding: '14px 16px',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 300,
        animation: isExiting ? 'slideOut 0.3s ease-out' : 'slideIn 0.3s ease-out',
        transform: isExiting ? 'translateX(100%)' : 'translateX(0)'
      }}
    >
      <div style={{
        fontSize: 18,
        fontWeight: 700,
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '50%',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
        {toast.message}
      </div>
      <button
        onClick={handleClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          padding: 4,
          fontSize: 18,
          opacity: 0.7,
          transition: 'opacity 0.2s',
          flexShrink: 0
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
      >
        ×
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Helper functions para mostrar toasts rápidamente
 */
export const toast = {
  success: (message: string, duration?: number) => {
    // Esta función se usa a través del hook useToast
    
  },
  error: (message: string, duration?: number) => {
    
  },
  warning: (message: string, duration?: number) => {
    
  },
  info: (message: string, duration?: number) => {
    
  }
};
