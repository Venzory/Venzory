import type { ReactNode } from 'react';
import { Truck } from 'lucide-react';

interface SupplierContextWrapperProps {
  supplierName: string;
  children: ReactNode;
}

/**
 * Wraps page content with a teal accent header for the Supplier Portal.
 * Provides visual context that the user is in the external supplier portal.
 */
export function SupplierContextWrapper({ supplierName, children }: SupplierContextWrapperProps) {
  return (
    <div className="relative">
      {/* Accent bar at the very top */}
      <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-teal-400 to-teal-500" />
      
      {/* Context indicator strip */}
      <div className="border-b border-slate-200 bg-teal-50/30 dark:border-slate-800 dark:bg-teal-950/10">
        <div className="flex items-center gap-3 px-6 py-2">
          <Truck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-teal-800 dark:text-teal-200">
              Supplier Portal
            </span>
            <span className="text-xs text-teal-800/60 dark:text-teal-200/60">
              • {supplierName}
            </span>
          </div>
        </div>
      </div>
      
      {/* Page content */}
      <div className="min-h-0">
        {children}
      </div>
    </div>
  );
}

