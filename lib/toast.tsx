'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, message };

    setToasts((prev) => {
      // Keep max 3 toasts
      const updated = [...prev, newToast];
      return updated.slice(-3);
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}

// Singleton toast instance for imperative calls
let toastInstance: ToastContextType | null = null;

export function setToastInstance(instance: ToastContextType) {
  toastInstance = instance;
}

// Imperative API
export const toast = {
  success: (message: string) => {
    if (toastInstance) {
      toastInstance.addToast('success', message);
    }
  },
  error: (message: string) => {
    if (toastInstance) {
      toastInstance.addToast('error', message);
    }
  },
  info: (message: string) => {
    if (toastInstance) {
      toastInstance.addToast('info', message);
    }
  },
};

