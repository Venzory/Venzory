'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

export function BarcodeScanner({ onScan, onError, isActive }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const initScanner = async () => {
      try {
        // Prevent multiple initializations
        if (isInitializedRef.current || scannerRef.current) {
          return;
        }

        isInitializedRef.current = true;

        const scanner = new Html5Qrcode('barcode-scanner');
        scannerRef.current = scanner;

        // Configure scanner for various barcode formats
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        // Start scanning
        await scanner.start(
          { facingMode: 'environment' }, // Use back camera on mobile
          config,
          (decodedText) => {
            // Success callback
            onScan(decodedText);
            
            // Vibrate on successful scan (if supported)
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
          },
          (errorMessage) => {
            // Error callback (occurs frequently, so we don't report every frame)
            // Only report actual errors, not "No barcode found"
            if (errorMessage && !errorMessage.includes('No MultiFormat Readers')) {
              console.debug('Scanner error:', errorMessage);
            }
          }
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to start scanner';
        console.error('Scanner initialization error:', errorMsg);
        onError?.(errorMsg);
        isInitializedRef.current = false;
      }
    };

    initScanner();

    // Cleanup function
    return () => {
      const cleanup = async () => {
        if (scannerRef.current) {
          try {
            const scanner = scannerRef.current;
            if (scanner.isScanning) {
              await scanner.stop();
            }
            scanner.clear();
            scannerRef.current = null;
          } catch (err) {
            console.error('Scanner cleanup error:', err);
          }
        }
        isInitializedRef.current = false;
      };

      cleanup();
    };
  }, [isActive, onScan, onError]);

  return (
    <div className="relative w-full h-full">
      <div id="barcode-scanner" className="w-full h-full" />
    </div>
  );
}

