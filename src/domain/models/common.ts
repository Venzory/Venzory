/**
 * Common domain model types used across multiple domains
 */

import type { PracticeRole, MembershipStatus } from '@prisma/client';

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Practice membership information
 */
export interface PracticeMembership {
  id: string;
  practiceId: string;
  userId: string;
  role: PracticeRole;
  status: MembershipStatus;
  invitedAt: Date;
  acceptedAt: Date | null;
}

/**
 * User information
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  memberships: PracticeMembership[];
}

/**
 * Practice information
 */
export interface Practice {
  id: string;
  name: string;
  slug: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Location information
 */
export interface Location extends BaseEntity {
  practiceId: string;
  parentId: string | null;
  name: string;
  code: string | null;
  description: string | null;
}

/**
 * Supplier information
 */
export interface Supplier extends BaseEntity {
  practiceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Sorting parameters
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter operator types
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';

/**
 * Generic filter condition
 */
export interface FilterCondition<T = any> {
  field: keyof T;
  operator: FilterOperator;
  value: any;
}

