import type { BaseEntity } from './common';
import type { Practice } from './common';

/**
 * Global supplier - platform-wide supplier entity
 */
export interface GlobalSupplier extends BaseEntity {
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
}

/**
 * Practice-specific supplier link with practice-specific settings
 */
export interface PracticeSupplier extends BaseEntity {
  practiceId: string;
  globalSupplierId: string;
  accountNumber: string | null;
  customLabel: string | null;
  orderingNotes: string | null;
  isPreferred: boolean;
  isBlocked: boolean;
  migratedFromSupplierId: string | null;
}

/**
 * Practice supplier with related entities
 */
export interface PracticeSupplierWithRelations extends PracticeSupplier {
  globalSupplier: GlobalSupplier;
  practice?: Practice;
}

/**
 * Input type for creating a practice supplier link
 */
export interface CreatePracticeSupplierInput {
  practiceId: string;
  globalSupplierId: string;
  accountNumber?: string | null;
  customLabel?: string | null;
  orderingNotes?: string | null;
  isPreferred?: boolean;
  isBlocked?: boolean;
}

/**
 * Input type for updating practice supplier settings
 */
export interface UpdatePracticeSupplierInput {
  accountNumber?: string | null;
  customLabel?: string | null;
  orderingNotes?: string | null;
  isPreferred?: boolean;
  isBlocked?: boolean;
}

/**
 * Input type for creating a global supplier
 */
export interface CreateGlobalSupplierInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
}

/**
 * Input type for updating a global supplier
 */
export interface UpdateGlobalSupplierInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
}

