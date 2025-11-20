'use client';

import { useToastContext } from '@/lib/toast';

export function useToast() {
  const context = useToastContext();
  
  const toast = ({ 
    title, 
    description, 
    variant = 'default' 
  }: { 
    title: string; 
    description?: string; 
    variant?: 'default' | 'destructive';
  }) => {
    // Map the new API (shadcn-like) to the existing toast context
    if (variant === 'destructive') {
      context.addToast('error', title + (description ? `: ${description}` : ''));
    } else {
      context.addToast('success', title + (description ? `: ${description}` : ''));
    }
  };

  return {
    toast,
    success: (message: string) => context.addToast('success', message),
    error: (message: string) => context.addToast('error', message),
    info: (message: string) => context.addToast('info', message),
  };
}
