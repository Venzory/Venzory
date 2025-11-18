# Migration Guide: From Old to New Architecture

This guide explains how to migrate existing code to the new layered architecture.

## Quick Reference: Before & After

### Before (Old Pattern)
```typescript
// app/(dashboard)/orders/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { requireActivePractice } from '@/lib/auth';
import { hasRole } from '@/lib/rbac';

export async function createOrderAction(formData: FormData) {
  const { session, practiceId } = await requireActivePractice();
  
  if (!hasRole({ memberships: session.user.memberships, practiceId, minimumRole: 'STAFF' })) {
    return { error: 'Insufficient permissions' };
  }
  
  // Direct Prisma access
  const order = await prisma.order.create({
    data: {
      practiceId,
      supplierId: formData.get('supplierId'),
      // ...
    },
  });
  
  return { success: true, orderId: order.id };
}
```

### After (New Pattern)
```typescript
// app/(dashboard)/orders/actions.ts
'use server';

import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getOrderService } from '@/src/services/orders';
import { isDomainError } from '@/src/domain/errors';

const orderService = getOrderService();

export async function createOrderAction(formData: FormData) {
  try {
    const ctx = await buildRequestContext();
    
    const input = {
      supplierId: formData.get('supplierId') as string,
      // ... parse other fields
    };
    
    // Call service (authorization handled inside)
    const order = await orderService.createOrder(ctx, input);
    
    return { success: true, orderId: order.id };
  } catch (error) {
    if (isDomainError(error)) {
      return { error: error.message };
    }
    return { error: 'An unexpected error occurred' };
  }
}
```

## Migration Steps

### Step 1: Replace Auth Pattern

**Old:**
```typescript
const { session, practiceId } = await requireActivePractice();

if (!hasRole({ memberships: session.user.memberships, practiceId, minimumRole: 'STAFF' })) {
  return { error: 'Insufficient permissions' };
}
```

**New:**
```typescript
const ctx = await buildRequestContext();
// Authorization is now in service layer
```

### Step 2: Replace Direct Prisma Calls

**Old:**
```typescript
const items = await prisma.item.findMany({
  where: { practiceId },
  include: { inventory: true },
});
```

**New:**
```typescript
const items = await inventoryService.findItems(ctx);
```

### Step 3: Use Domain Errors

**Old:**
```typescript
if (quantity <= 0) {
  return { error: 'Quantity must be positive' };
}
```

**New:**
```typescript
import { ValidationError } from '@/src/domain/errors';

// In service:
if (quantity <= 0) {
  throw new ValidationError('Quantity must be positive');
}

// In action:
try {
  await service.doSomething(ctx, input);
} catch (error) {
  if (isDomainError(error)) {
    return { error: error.message };
  }
  throw error;
}
```

### Step 4: Use Transactions

**Old:**
```typescript
await prisma.$transaction(async (tx) => {
  await tx.order.create({ data: {...} });
  await tx.orderItem.createMany({ data: [...] });
});
```

**New:**
```typescript
import { withTransaction } from '@/src/repositories/base';

// In service:
return withTransaction(async (tx) => {
  await this.orderRepository.createOrder(order, { tx });
  await this.orderRepository.addOrderItem(item, { tx });
});
```

### Step 5: Add Audit Logging

**Old:**
```typescript
// No audit logging
await prisma.order.create({ data: {...} });
```

**New:**
```typescript
// In service:
const order = await this.orderRepository.createOrder(input, { tx });

await this.auditService.logOrderCreated(
  ctx,
  order.id,
  {
    supplierId: order.supplierId,
    supplierName: supplier.name,
    itemCount: items.length,
  },
  tx
);
```

## File-by-File Migration Checklist

### ✅ Completed

- [x] Domain models (`src/domain/models/`)
- [x] Domain errors (`src/domain/errors/`)
- [x] Domain validators (`src/domain/validators/`)
- [x] Request context (`src/lib/context/`)
- [x] Base repository (`src/repositories/base/`)
- [x] Inventory repository (`src/repositories/inventory/`)
- [x] Orders repository (`src/repositories/orders/`)
- [x] Products repository (`src/repositories/products/`)
- [x] Receiving repository (`src/repositories/receiving/`)
- [x] Audit repository (`src/repositories/audit/`)
- [x] Users repository (`src/repositories/users/`)
- [x] Audit service (`src/services/audit/`)
- [x] Inventory service (`src/services/inventory/`)
- [x] Orders service (`src/services/orders/`)
- [x] Receiving service (`src/services/receiving/`)
- [x] Inventory actions (example: `actions-refactored.ts`)

### 📋 To Migrate

#### High Priority
- [ ] `app/(dashboard)/orders/actions.ts` → Use `OrderService`
- [ ] `app/(dashboard)/receiving/actions.ts` → Use `ReceivingService`
- [ ] `app/(dashboard)/products/actions.ts` → Use `ProductService`
- [ ] `app/(dashboard)/inventory/page.tsx` → Use `InventoryRepository` for queries
- [ ] `app/(dashboard)/orders/page.tsx` → Use `OrderRepository`
- [ ] `app/api/invites/route.ts` → Use `AuthService`

#### Medium Priority
- [ ] `app/(dashboard)/stock-count/actions.ts` → Create `StockCountService`
- [ ] `app/(dashboard)/orders/templates/actions.ts` → Use `OrderService`
- [ ] `app/(dashboard)/settings/actions.ts` → Use `UserService`
- [ ] `lib/notifications.ts` → Create `NotificationService`
- [ ] `lib/integrations/product-sync.ts` → Use `ProductService`

#### Low Priority
- [ ] Other API routes under `app/api/`
- [ ] Remaining page components

## Example Migrations

### Example 1: Orders Actions

**File:** `app/(dashboard)/orders/actions.ts`

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getOrderService } from '@/src/services/orders';
import { isDomainError } from '@/src/domain/errors';

const orderService = getOrderService();

const createOrderSchema = z.object({
  supplierId: z.string().cuid(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string().cuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().optional(),
  })).min(1),
});

export async function createDraftOrderAction(_prevState: unknown, formData: FormData) {
  try {
    const ctx = await buildRequestContext();
    
    const itemsJson = formData.get('items');
    const items = itemsJson ? JSON.parse(itemsJson as string) : [];
    
    const parsed = createOrderSchema.safeParse({
      supplierId: formData.get('supplierId'),
      notes: formData.get('notes'),
      items,
    });
    
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || 'Invalid order data' };
    }
    
    const order = await orderService.createOrder(ctx, parsed.data);
    
    revalidatePath('/orders');
    redirect(`/orders/${order.id}`);
  } catch (error) {
    console.error('[createDraftOrderAction]', error);
    if (isDomainError(error)) {
      return { error: error.message };
    }
    return { error: 'An unexpected error occurred' };
  }
}

export async function sendOrderAction(orderId: string) {
  try {
    const ctx = await buildRequestContext();
    await orderService.sendOrder(ctx, orderId);
    
    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
  } catch (error) {
    console.error('[sendOrderAction]', error);
    throw error;
  }
}

export async function deleteOrderAction(orderId: string) {
  try {
    const ctx = await buildRequestContext();
    await orderService.deleteOrder(ctx, orderId);
    
    revalidatePath('/orders');
    redirect('/orders');
  } catch (error) {
    console.error('[deleteOrderAction]', error);
    throw error;
  }
}

export async function addOrderItemAction(_prevState: unknown, formData: FormData) {
  try {
    const ctx = await buildRequestContext();
    
    const input = {
      itemId: formData.get('itemId') as string,
      quantity: parseInt(formData.get('quantity') as string),
      unitPrice: formData.get('unitPrice') ? parseFloat(formData.get('unitPrice') as string) : undefined,
    };
    
    const orderId = formData.get('orderId') as string;
    await orderService.addOrderItem(ctx, orderId, input);
    
    revalidatePath(`/orders/${orderId}`);
    return { success: 'Item added to order' };
  } catch (error) {
    console.error('[addOrderItemAction]', error);
    if (isDomainError(error)) {
      return { error: error.message };
    }
    return { error: 'Failed to add item' };
  }
}
```

### Example 2: Receiving Actions

**File:** `app/(dashboard)/receiving/actions.ts`

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getReceivingService } from '@/src/services/receiving';
import { isDomainError } from '@/src/domain/errors';

const receivingService = getReceivingService();

export async function createGoodsReceiptAction(_prevState: unknown, formData: FormData) {
  try {
    const ctx = await buildRequestContext();
    
    const input = {
      locationId: formData.get('locationId') as string,
      orderId: formData.get('orderId') as string || null,
      supplierId: formData.get('supplierId') as string || null,
      notes: formData.get('notes') as string || null,
    };
    
    const receipt = await receivingService.createGoodsReceipt(ctx, input);
    
    revalidatePath('/receiving');
    return { success: true, receiptId: receipt.id };
  } catch (error) {
    console.error('[createGoodsReceiptAction]', error);
    if (isDomainError(error)) {
      return { error: error.message };
    }
    return { error: 'Failed to create receipt' };
  }
}

export async function confirmGoodsReceiptAction(receiptId: string) {
  try {
    const ctx = await buildRequestContext();
    const result = await receivingService.confirmGoodsReceipt(ctx, receiptId);
    
    revalidatePath('/receiving');
    revalidatePath(`/receiving/${receiptId}`);
    revalidatePath('/inventory');
    
    return result;
  } catch (error) {
    console.error('[confirmGoodsReceiptAction]', error);
    throw error;
  }
}

export async function addReceiptLineAction(_prevState: unknown, formData: FormData) {
  try {
    const ctx = await buildRequestContext();
    
    const receiptId = formData.get('receiptId') as string;
    const input = {
      itemId: formData.get('itemId') as string,
      quantity: parseInt(formData.get('quantity') as string),
      batchNumber: formData.get('batchNumber') as string || null,
      expiryDate: formData.get('expiryDate') ? new Date(formData.get('expiryDate') as string) : null,
      scannedGtin: formData.get('scannedGtin') as string || null,
      notes: formData.get('notes') as string || null,
    };
    
    await receivingService.addReceiptLine(ctx, receiptId, input);
    
    revalidatePath(`/receiving/${receiptId}`);
    return { success: true };
  } catch (error) {
    console.error('[addReceiptLineAction]', error);
    if (isDomainError(error)) {
      return { error: error.message };
    }
    return { error: 'Failed to add line' };
  }
}
```

### Example 3: Page Components

**File:** `app/(dashboard)/inventory/page.tsx`

**Old:**
```typescript
import { prisma } from '@/lib/prisma';

export default async function InventoryPage() {
  const { practiceId } = await requireActivePractice();
  
  const items = await prisma.item.findMany({
    where: { practiceId },
    include: { inventory: true },
  });
  
  return <div>{/* render items */}</div>;
}
```

**New:**
```typescript
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { InventoryRepository } from '@/src/repositories/inventory';

const inventoryRepository = new InventoryRepository();

export default async function InventoryPage() {
  const ctx = await buildRequestContext();
  
  const items = await inventoryRepository.findItems(ctx.practiceId);
  
  return <div>{/* render items */}</div>;
}
```

## Testing Your Migration

### 1. Check Imports
```bash
# Ensure no direct Prisma imports in services
grep -r "from '@/lib/prisma'" src/services/
# Should return nothing

# Ensure services use repositories
grep -r "Repository" src/services/
# Should find repository usage
```

### 2. Test Authorization
```typescript
// Should throw ForbiddenError
try {
  const ctx = createTestContext({ role: 'VIEWER' });
  await orderService.createOrder(ctx, {...});
} catch (error) {
  expect(error).toBeInstanceOf(ForbiddenError);
}
```

### 3. Test Transactions
```typescript
// Should rollback on error
try {
  await service.complexOperation(ctx);
} catch (error) {
  // Verify nothing was persisted
  const count = await repository.count();
  expect(count).toBe(0);
}
```

### 4. Test Audit Logs
```typescript
await service.createOrder(ctx, input);

const logs = await auditRepository.findAuditLogs({
  practiceId: ctx.practiceId,
  entityType: 'Order',
  action: 'CREATED',
});

expect(logs.length).toBeGreaterThan(0);
```

## Common Pitfalls

### ❌ Forgetting to pass transaction
```typescript
await withTransaction(async (tx) => {
  await repo.create(data); // Missing { tx }
});
```

### ✅ Always pass transaction
```typescript
await withTransaction(async (tx) => {
  await repo.create(data, { tx });
});
```

### ❌ Mixing old and new patterns
```typescript
const ctx = await buildRequestContext();
await prisma.item.create({...}); // Don't use Prisma directly
```

### ✅ Use services
```typescript
const ctx = await buildRequestContext();
await inventoryService.createItem(ctx, {...});
```

### ❌ No error handling
```typescript
export async function myAction() {
  const ctx = await buildRequestContext();
  await service.doSomething(ctx); // Errors not caught
}
```

### ✅ Proper error handling
```typescript
export async function myAction() {
  try {
    const ctx = await buildRequestContext();
    await service.doSomething(ctx);
  } catch (error) {
    if (isDomainError(error)) {
      return { error: error.message };
    }
    throw error;
  }
}
```

## Next Steps

1. Review `docs/ARCHITECTURE.md` for detailed architecture explanation
2. Migrate high-priority files first (orders, receiving, products)
3. Test each migration thoroughly
4. Add unit tests for new services
5. Update documentation as you go

## Getting Help

If you encounter issues during migration:

1. Check existing migrated files for reference (e.g., `actions-refactored.ts`)
2. Review error messages - domain errors provide clear guidance
3. Verify `RequestContext` is being passed correctly
4. Ensure transactions are used for multi-step operations
5. Check audit logs are being created for state changes

## Summary

The new architecture provides:
- ✅ Clear separation of concerns
- ✅ Consistent authorization patterns
- ✅ Automatic tenant scoping
- ✅ Comprehensive audit logging
- ✅ Easy testing with mocks
- ✅ Prepared for Go migration

Take it step by step, test thoroughly, and enjoy better code quality!

