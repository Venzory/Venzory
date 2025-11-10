'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToastContext, setToastInstance, type Toast } from '@/lib/toast';

export function ToastContainer() {
  const context = useToastContext();

  // Set the toast instance for imperative API
  useEffect(() => {
    setToastInstance(context);
  }, [context]);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {context.toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={context.removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { type, message, id } = toast;

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-600 dark:bg-green-700',
          icon: <CheckCircle className="h-5 w-5" />,
        };
      case 'error':
        return {
          bg: 'bg-rose-600 dark:bg-rose-700',
          icon: <XCircle className="h-5 w-5" />,
        };
      case 'info':
        return {
          bg: 'bg-sky-600 dark:bg-sky-700',
          icon: <Info className="h-5 w-5" />,
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`${styles.bg} text-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-sm pointer-events-auto animate-slide-in`}
      role="alert"
    >
      <div className="flex-shrink-0">{styles.icon}</div>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 rounded-lg p-1 hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

