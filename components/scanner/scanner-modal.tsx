'use client';

import { X } from 'lucide-react';
import { toast } from '@/lib/toast';
import { BarcodeScanner } from './barcode-scanner';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  onManualEntry?: () => void;
  title?: string;
}

export function ScannerModal({
  isOpen,
  onClose,
  onScan,
  onManualEntry,
  title = 'Scan Barcode',
}: ScannerModalProps) {
  if (!isOpen) {
    return null;
  }

  const handleScan = (code: string) => {
    onScan(code);
    onClose();
  };

  const handleError = (error: string) => {
    console.error('Scanner error:', error);
    toast.error(error);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Close scanner"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Scanner */}
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="w-full max-w-md">
          <BarcodeScanner isActive={isOpen} onScan={handleScan} onError={handleError} />
        </div>
      </div>

      {/* Instructions & Manual Entry */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-6 text-center">
        <p className="mb-4 text-sm text-white/90">
          Position the barcode within the frame to scan
        </p>
        {onManualEntry && (
          <button
            onClick={() => {
              onClose();
              onManualEntry();
            }}
            className="rounded-lg border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            style={{ minHeight: '48px' }}
          >
            Enter Code Manually
          </button>
        )}
      </div>
    </div>
  );
}

