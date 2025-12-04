/**
 * Utility functions for displaying practice supplier information
 */

import type { PracticeSupplierWithRelations } from '@/src/domain/models/suppliers';

/**
 * Get supplier display information from a practice supplier
 * Uses customLabel → globalSupplier.name → 'Unknown Supplier'
 */
export function getPracticeSupplierDisplay(practiceSupplier: {
  id: string;
  customLabel?: string | null;
  globalSupplier?: {
    name: string;
  } | null;
} | null | undefined): {
  name: string;
  linkId: string;
} {
  if (!practiceSupplier) {
    return {
      name: 'Unknown Supplier',
      linkId: '',
    };
  }

  const supplierName = 
    practiceSupplier.customLabel || 
    practiceSupplier.globalSupplier?.name || 
    'Unknown Supplier';
  
  const supplierLinkId = practiceSupplier.id || '';

  return {
    name: supplierName,
    linkId: supplierLinkId,
  };
}

