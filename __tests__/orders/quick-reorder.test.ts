import { describe, it, expect } from 'vitest';
import { selectQuickTemplates } from '@/app/(clinic)/app/orders/_utils/quick-reorder';

describe('selectQuickTemplates', () => {
  it('should return up to maxCount templates', () => {
    const templates = [
      { id: '1', name: 'Template 1', items: [{ id: 'item1' }] },
      { id: '2', name: 'Template 2', items: [{ id: 'item2' }] },
      { id: '3', name: 'Template 3', items: [{ id: 'item3' }] },
      { id: '4', name: 'Template 4', items: [{ id: 'item4' }] },
      { id: '5', name: 'Template 5', items: [{ id: 'item5' }] },
      { id: '6', name: 'Template 6', items: [{ id: 'item6' }] },
    ];

    const result = selectQuickTemplates(templates, 3);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
    expect(result[2].id).toBe('3');
  });

  it('should default to 5 templates when maxCount is not specified', () => {
    const templates = Array.from({ length: 10 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Template ${i + 1}`,
      items: [{ id: `item${i + 1}` }],
    }));

    const result = selectQuickTemplates(templates);

    expect(result).toHaveLength(5);
  });

  it('should return all templates if fewer than maxCount', () => {
    const templates = [
      { id: '1', name: 'Template 1', items: [{ id: 'item1' }] },
      { id: '2', name: 'Template 2', items: [{ id: 'item2' }] },
    ];

    const result = selectQuickTemplates(templates, 5);

    expect(result).toHaveLength(2);
  });

  it('should filter out templates with no items', () => {
    const templates = [
      { id: '1', name: 'Template 1', items: [{ id: 'item1' }] },
      { id: '2', name: 'Template 2', items: [] },
      { id: '3', name: 'Template 3', items: [{ id: 'item3' }] },
    ];

    const result = selectQuickTemplates(templates, 5);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
  });

  it('should handle null templates array', () => {
    const result = selectQuickTemplates(null, 5);

    expect(result).toEqual([]);
  });

  it('should handle undefined templates array', () => {
    const result = selectQuickTemplates(undefined, 5);

    expect(result).toEqual([]);
  });

  it('should handle empty templates array', () => {
    const result = selectQuickTemplates([], 5);

    expect(result).toEqual([]);
  });

  it('should handle templates with null items array', () => {
    const templates = [
      { id: '1', name: 'Template 1', items: [{ id: 'item1' }] },
      { id: '2', name: 'Template 2', items: null as any },
      { id: '3', name: 'Template 3', items: [{ id: 'item3' }] },
    ];

    const result = selectQuickTemplates(templates, 5);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
  });

  it('should handle templates with undefined items array', () => {
    const templates = [
      { id: '1', name: 'Template 1', items: [{ id: 'item1' }] },
      { id: '2', name: 'Template 2', items: undefined as any },
      { id: '3', name: 'Template 3', items: [{ id: 'item3' }] },
    ];

    const result = selectQuickTemplates(templates, 5);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('3');
  });

  it('should return empty array when all templates have no items', () => {
    const templates = [
      { id: '1', name: 'Template 1', items: [] },
      { id: '2', name: 'Template 2', items: [] },
      { id: '3', name: 'Template 3', items: [] },
    ];

    const result = selectQuickTemplates(templates, 5);

    expect(result).toEqual([]);
  });
});

