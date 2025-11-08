'use client';

import { useState, useCallback } from 'react';

export function useScanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const openScanner = useCallback(() => {
    setIsOpen(true);
    setScannedCode(null);
  }, []);

  const closeScanner = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleScan = useCallback((code: string) => {
    setScannedCode(code);
    setIsOpen(false);
  }, []);

  const resetScan = useCallback(() => {
    setScannedCode(null);
  }, []);

  return {
    isOpen,
    scannedCode,
    openScanner,
    closeScanner,
    handleScan,
    resetScan,
  };
}

