'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { ToastProvider } from '@/lib/toast';
import { ToastContainer } from '@/components/ui/toast-container';
import { ConfirmDialogProvider } from '@/hooks/use-confirm';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <ToastProvider>
          <ConfirmDialogProvider>
            {children}
            <ToastContainer />
          </ConfirmDialogProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

