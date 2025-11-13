/**
 * Shared URL parameter parsing utilities for list pages.
 * Centralizes common query param handling for pagination, search, and sorting.
 */

export interface ListParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

export interface ParseListParamsOptions {
  defaultLimit?: number;
  defaultSortOrder?: 'asc' | 'desc';
}

/**
 * Parse common list page parameters from URL search params.
 * 
 * @param params - URL search parameters (from Next.js searchParams)
 * @param options - Optional configuration for defaults
 * @returns Normalized list parameters with sensible defaults
 * 
 * @example
 * ```typescript
 * const { page, limit, search, sortBy, sortOrder } = parseListParams(params);
 * ```
 */
export function parseListParams(
  params: Record<string, string | string[] | undefined>,
  options?: ParseListParamsOptions
): ListParams {
  const defaultLimit = options?.defaultLimit ?? 50;
  const defaultSortOrder = options?.defaultSortOrder ?? 'asc';

  // Parse page number with validation
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = parseInt(pageParam || '1', 10);
  const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  // Parse limit with validation
  const limitParam = Array.isArray(params.limit) ? params.limit[0] : params.limit;
  const parsedLimit = parseInt(limitParam || String(defaultLimit), 10);
  const limit = isNaN(parsedLimit) || parsedLimit < 1 ? defaultLimit : parsedLimit;

  // Parse search query (from 'q' parameter)
  const qParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const trimmedSearch = qParam?.trim();
  const search = trimmedSearch && trimmedSearch.length > 0 ? trimmedSearch : undefined;

  // Parse sortBy (optional)
  const sortByParam = Array.isArray(params.sortBy) ? params.sortBy[0] : params.sortBy;
  const sortBy = sortByParam || undefined;

  // Parse sortOrder with validation
  const sortOrderParam = Array.isArray(params.sortOrder) ? params.sortOrder[0] : params.sortOrder;
  const sortOrder: 'asc' | 'desc' = 
    sortOrderParam === 'desc' ? 'desc' : defaultSortOrder;

  return {
    page,
    limit,
    search,
    sortBy,
    sortOrder,
  };
}

