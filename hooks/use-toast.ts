'use client';

import { useToastContext } from '@/lib/toast';

export function useToast() {
  const context = useToastContext();
  
  return {
    success: (message: string) => context.addToast('success', message),
    error: (message: string) => context.addToast('error', message),
    info: (message: string) => context.addToast('info', message),
  };
}

