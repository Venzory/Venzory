/**
 * Test fixtures for inventory and stock counting tests
 * Provides reusable test data generators for unit tests
 */

import { PracticeRole, StockCountStatus } from '@prisma/client';
import type { RequestContext } from '@/src/lib/context/request-context';
import { createTestContext as createContextFromModule } from '@/src/lib/context/request-context';

// Unique ID generators for tests
let practiceCounter = 0;
let userCounter = 0;
let locationCounter = 0;
let itemCounter = 0;
let sessionCounter = 0;

export function resetCounters() {
  practiceCounter = 0;
  userCounter = 0;
  locationCounter = 0;
  itemCounter = 0;
  sessionCounter = 0;
}

// Practice fixtures
export function createTestPractice(overrides?: Partial<{
  id: string;
  name: string;
  slug: string;
}>) {
  practiceCounter++;
  return {
    id: overrides?.id ?? `test-practice-${practiceCounter}`,
    name: overrides?.name ?? `Test Practice ${practiceCounter}`,
    slug: overrides?.slug ?? `test-practice-${practiceCounter}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// User fixtures
export function createTestUser(overrides?: Partial<{
  id: string;
  email: string;
  name: string;
}>) {
  userCounter++;
  return {
    id: overrides?.id ?? `test-user-${userCounter}`,
    email: overrides?.email ?? `user${userCounter}@test.com`,
    name: overrides?.name ?? `Test User ${userCounter}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Request context fixtures
export function createTestContext(overrides?: Partial<RequestContext>): RequestContext {
  const practice = createTestPractice();
  const user = createTestUser();
  
  return createContextFromModule({
    userId: overrides?.userId ?? user.id,
    practiceId: overrides?.practiceId ?? practice.id,
    role: overrides?.role ?? 'STAFF',
    requestId: overrides?.requestId ?? `req-${Date.now()}`,
    ...overrides,
  });
}

// Location fixtures
export function createTestLocation(practiceId: string, overrides?: Partial<{
  id: string;
  name: string;
  code: string;
  parentId: string | null;
}>) {
  locationCounter++;
  return {
    id: overrides?.id ?? `test-location-${locationCounter}`,
    practiceId,
    parentId: overrides?.parentId ?? null,
    name: overrides?.name ?? `Test Location ${locationCounter}`,
    code: overrides?.code ?? `LOC-${locationCounter}`,
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Product fixtures
export function createTestProduct(overrides?: Partial<{
  id: string;
  name: string;
  gtin: string | null;
}>) {
  return {
    id: overrides?.id ?? `test-product-${Date.now()}`,
    gtin: overrides?.gtin ?? null,
    brand: null,
    name: overrides?.name ?? 'Test Product',
    description: null,
    isGs1Product: false,
    gs1VerificationStatus: 'UNVERIFIED' as const,
    gs1VerifiedAt: null,
    gs1Data: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Item fixtures
export function createTestItem(practiceId: string, productId: string, overrides?: Partial<{
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
}>) {
  itemCounter++;
  return {
    id: overrides?.id ?? `test-item-${itemCounter}`,
    practiceId,
    productId,
    defaultSupplierId: null,
    defaultPracticeSupplierId: null,
    name: overrides?.name ?? `Test Item ${itemCounter}`,
    sku: overrides?.sku ?? `SKU-${itemCounter}`,
    description: null,
    unit: overrides?.unit ?? 'unit',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Location inventory fixtures
export function createTestInventory(locationId: string, itemId: string, overrides?: Partial<{
  quantity: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
}>) {
  return {
    locationId,
    itemId,
    quantity: overrides?.quantity ?? 10,
    reorderPoint: overrides?.reorderPoint ?? 5,
    reorderQuantity: overrides?.reorderQuantity ?? 20,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Stock count session fixtures
export function createTestStockCountSession(practiceId: string, locationId: string, createdById: string, overrides?: Partial<{
  id: string;
  status: StockCountStatus;
  notes: string | null;
  completedAt: Date | null;
}>) {
  sessionCounter++;
  return {
    id: overrides?.id ?? `test-session-${sessionCounter}`,
    practiceId,
    locationId,
    status: overrides?.status ?? StockCountStatus.IN_PROGRESS,
    createdById,
    completedAt: overrides?.completedAt ?? null,
    notes: overrides?.notes ?? null,
    createdAt: new Date(),
  };
}

// Stock count line fixtures
export function createTestStockCountLine(sessionId: string, itemId: string, overrides?: Partial<{
  id: string;
  countedQuantity: number;
  systemQuantity: number;
  variance: number;
  notes: string | null;
}>) {
  const systemQuantity = overrides?.systemQuantity ?? 10;
  const countedQuantity = overrides?.countedQuantity ?? 8;
  const variance = overrides?.variance ?? (countedQuantity - systemQuantity);
  
  return {
    id: overrides?.id ?? `test-line-${Date.now()}-${Math.random()}`,
    sessionId,
    itemId,
    countedQuantity,
    systemQuantity,
    variance,
    notes: overrides?.notes ?? null,
    createdAt: new Date(),
  };
}

// Stock adjustment fixtures
export function createTestStockAdjustment(practiceId: string, locationId: string, itemId: string, createdById: string, overrides?: Partial<{
  id: string;
  quantity: number;
  reason: string | null;
  note: string | null;
}>) {
  return {
    id: overrides?.id ?? `test-adjustment-${Date.now()}`,
    itemId,
    locationId,
    practiceId,
    quantity: overrides?.quantity ?? 5,
    reason: overrides?.reason ?? 'Test Adjustment',
    note: overrides?.note ?? null,
    createdById,
    createdAt: new Date(),
  };
}

// Inventory transfer fixtures
export function createTestInventoryTransfer(practiceId: string, itemId: string, fromLocationId: string, toLocationId: string, createdById: string, overrides?: Partial<{
  id: string;
  quantity: number;
  note: string | null;
}>) {
  return {
    id: overrides?.id ?? `test-transfer-${Date.now()}`,
    practiceId,
    itemId,
    fromLocationId,
    toLocationId,
    quantity: overrides?.quantity ?? 5,
    note: overrides?.note ?? null,
    createdById,
    createdAt: new Date(),
  };
}

