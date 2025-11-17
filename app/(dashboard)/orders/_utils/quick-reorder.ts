/**
 * Utilities for Quick Reorder functionality
 */

interface QuickTemplate {
  id: string;
  name: string;
  items: Array<{ id: string }>;
}

/**
 * Select templates suitable for quick reordering
 * Filters out templates with no items and limits to maxCount
 */
export function selectQuickTemplates(
  templates: QuickTemplate[] | null | undefined,
  maxCount: number = 5
): QuickTemplate[] {
  if (!templates || templates.length === 0) {
    return [];
  }

  // Filter out templates with no items
  const validTemplates = templates.filter(
    (template) => template.items && template.items.length > 0
  );

  // Return up to maxCount templates (already sorted by most recent from service)
  return validTemplates.slice(0, maxCount);
}

