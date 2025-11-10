'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'neutral';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
  });
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      setResolveCallback(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolveCallback) {
      resolveCallback(true);
    }
    setIsOpen(false);
    setResolveCallback(null);
  };

  const handleCancel = () => {
    if (resolveCallback) {
      resolveCallback(false);
    }
    setIsOpen(false);
    setResolveCallback(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        isOpen={isOpen}
        title={options.title}
        message={options.message}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        variant={options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider');
  }
  return context.confirm;
}

