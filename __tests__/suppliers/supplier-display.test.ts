import { describe, it, expect } from 'vitest';
import { getPracticeSupplierDisplay } from '@/app/(clinic)/app/suppliers/_utils/supplier-display';

describe('getPracticeSupplierDisplay', () => {
  it('should return custom label when available', () => {
    const practiceSupplier = {
      id: 'ps-123',
      customLabel: 'My Custom Supplier Name',
      globalSupplier: {
        name: 'Global Supplier Inc',
      },
    };

    const result = getPracticeSupplierDisplay(practiceSupplier);

    expect(result.name).toBe('My Custom Supplier Name');
    expect(result.linkId).toBe('ps-123');
  });

  it('should return global supplier name when custom label is null', () => {
    const practiceSupplier = {
      id: 'ps-456',
      customLabel: null,
      globalSupplier: {
        name: 'Global Supplier Inc',
      },
    };

    const result = getPracticeSupplierDisplay(practiceSupplier);

    expect(result.name).toBe('Global Supplier Inc');
    expect(result.linkId).toBe('ps-456');
  });

  it('should return global supplier name when custom label is empty string', () => {
    const practiceSupplier = {
      id: 'ps-789',
      customLabel: '',
      globalSupplier: {
        name: 'Global Supplier Inc',
      },
    };

    const result = getPracticeSupplierDisplay(practiceSupplier);

    expect(result.name).toBe('Global Supplier Inc');
    expect(result.linkId).toBe('ps-789');
  });

  it('should return "Unknown Supplier" when practiceSupplier is null', () => {
    const result = getPracticeSupplierDisplay(null);

    expect(result.name).toBe('Unknown Supplier');
    expect(result.linkId).toBe('');
  });

  it('should return "Unknown Supplier" when practiceSupplier is undefined', () => {
    const result = getPracticeSupplierDisplay(undefined);

    expect(result.name).toBe('Unknown Supplier');
    expect(result.linkId).toBe('');
  });

  it('should return "Unknown Supplier" when globalSupplier is null', () => {
    const practiceSupplier = {
      id: 'ps-999',
      customLabel: null,
      globalSupplier: null,
    };

    const result = getPracticeSupplierDisplay(practiceSupplier);

    expect(result.name).toBe('Unknown Supplier');
    expect(result.linkId).toBe('ps-999');
  });

  it('should handle missing globalSupplier gracefully', () => {
    const practiceSupplier = {
      id: 'ps-111',
      customLabel: '',
    };

    const result = getPracticeSupplierDisplay(practiceSupplier);

    expect(result.name).toBe('Unknown Supplier');
    expect(result.linkId).toBe('ps-111');
  });

  it('should prefer custom label over global supplier name', () => {
    const practiceSupplier = {
      id: 'ps-222',
      customLabel: 'Preferred Name',
      globalSupplier: {
        name: 'Original Name',
      },
    };

    const result = getPracticeSupplierDisplay(practiceSupplier);

    expect(result.name).toBe('Preferred Name');
    expect(result.linkId).toBe('ps-222');
  });
});

