# Remcura V2 Architecture Documentation

## Overview

This document describes the Go-Ready layered architecture implemented in Remcura V2. The architecture provides clear separation of concerns, making the codebase more maintainable, testable, and prepared for future migration to Go.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│          API Layer (Next.js)            │
│   app/(dashboard)/*/actions.ts          │
│   app/api/*/route.ts                    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Service Layer                  │
│   src/services/                         │
│   - Business Logic                      │
│   - Workflow Orchestration              │
│   - Authorization                       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│        Repository Layer                 │
│   src/repositories/                     │
│   - Data Access                         │
│   - Tenant Scoping                      │
│   - Prisma Wrapper                      │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Database Layer                 │
│   PostgreSQL via Prisma                 │
└─────────────────────────────────────────┘
```

## Directory Structure

```
/src
  /domain
    /models          # TypeScript domain models
    /errors          # Domain-specific errors
    /validators      # Business rule validators
  
  /services          # Business logic layer
    /audit           # Centralized audit logging
    /inventory       # Inventory management
    /orders          # Order workflow
    /receiving       # Goods receiving
  
  /repositories      # Data access layer
    /base            # Base repository & transactions
    /inventory       # Inventory data access
    /orders          # Order data access
    /products        # Product catalog data access
    /receiving       # Receiving data access
    /audit           # Audit log data access
    /users           # User & practice data access
  
  /lib
    /context         # Request context pattern
```

## Key Concepts

### 1. Request Context

The `RequestContext` carries user identity, practice, and authorization info through the request lifecycle. This mirrors Go's `context.Context` pattern.

```typescript
interface RequestContext {
  userId: string;
  userEmail: string;
  userName: string | null;
  practiceId: string;
  role: PracticeRole;
  memberships: ContextPracticeMembership[];
  timestamp: Date;
  requestId?: string;
}
```

**Usage:**
```typescript
import { buildRequestContext } from '@/src/lib/context/context-builder';

export async function myAction() {
  const ctx = await buildRequestContext();
  // ctx contains user identity and practice info
}
```

### 2. Repository Pattern

All data access goes through repositories. Repositories:
- Wrap Prisma client
- Enforce tenant scoping automatically
- Support transactions
- Are easily replaceable (e.g., with Go ORMs)

**Example:**
```typescript
class InventoryRepository extends BaseRepository {
  async findItems(practiceId: string, filters?: InventoryFilters) {
    const client = this.getClient();
    return client.item.findMany({
      where: this.scopeToPractice(practiceId),
      // ...
    });
  }
}
```

### 3. Service Layer

Services contain business logic and orchestrate workflows:
- Pure business logic (no Prisma imports)
- Depend on repository interfaces
- Handle authorization via `requireRole()`
- Manage transactions

**Example:**
```typescript
class InventoryService {
  async adjustStock(ctx: RequestContext, input: StockAdjustmentInput) {
    requireRole(ctx, 'STAFF'); // Authorization
    
    return withTransaction(async (tx) => {
      // Business logic
      const { newQuantity } = await this.inventoryRepository.adjustStock(
        input.locationId,
        input.itemId,
        input.quantity,
        { tx }
      );
      
      // Audit logging
      await this.auditService.logStockAdjustment(ctx, adjustment.id, data, tx);
      
      return { newQuantity };
    });
  }
}
```

### 4. Domain Models

TypeScript interfaces that mirror database entities but are framework-independent:

```typescript
interface Item extends BaseEntity {
  practiceId: string;
  productId: string;
  name: string;
  sku: string | null;
  // ...
}
```

### 5. Error Handling

Domain-specific errors provide clear error messages and HTTP status codes:

```typescript
import { ValidationError, NotFoundError, ForbiddenError } from '@/src/domain/errors';

throw new ValidationError('Quantity must be positive');
throw new NotFoundError('Item', itemId);
throw new ForbiddenError('Insufficient permissions');
```

## Using the Architecture

### Creating a New Feature

1. **Define domain models** (`src/domain/models/`)
2. **Create repository methods** (`src/repositories/`)
3. **Implement service logic** (`src/services/`)
4. **Create API wrapper** (`app/(dashboard)/*/actions.ts`)

### Example: Adding Stock Count Feature

#### 1. Domain Models
```typescript
// src/domain/models/stock-count.ts
export interface StockCountSession extends BaseEntity {
  practiceId: string;
  locationId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  // ...
}
```

#### 2. Repository
```typescript
// src/repositories/stock-count/stock-count-repository.ts
export class StockCountRepository extends BaseRepository {
  async findStockCounts(practiceId: string) {
    return this.prisma.stockCountSession.findMany({
      where: this.scopeToPractice(practiceId),
    });
  }
}
```

#### 3. Service
```typescript
// src/services/stock-count/stock-count-service.ts
export class StockCountService {
  async createStockCount(ctx: RequestContext, input: CreateStockCountInput) {
    requireRole(ctx, 'STAFF');
    // Business logic here
  }
}
```

#### 4. API Action
```typescript
// app/(dashboard)/stock-count/actions.ts
export async function createStockCountAction(formData: FormData) {
  const ctx = await buildRequestContext();
  const service = getStockCountService();
  return service.createStockCount(ctx, parseInput(formData));
}
```

## Authorization Patterns

### Role-Based Access Control

```typescript
import { requireRole } from '@/src/lib/context/context-builder';

// Require specific role
requireRole(ctx, 'ADMIN');  // Throws ForbiddenError if insufficient

// Manual check
if (!hasRequiredRole(ctx, 'STAFF')) {
  throw new ForbiddenError('Staff access required');
}
```

### Tenant Isolation

All repositories automatically scope queries to the practice:

```typescript
// Automatically includes practiceId
const where = this.scopeToPractice(practiceId);

// Result: { practiceId: "..." }
```

## Transaction Management

### Simple Transaction
```typescript
import { withTransaction } from '@/src/repositories/base';

await withTransaction(async (tx) => {
  await repo1.create(data, { tx });
  await repo2.update(id, changes, { tx });
});
```

### Transaction in Services
```typescript
async adjustStock(ctx: RequestContext, input: StockAdjustmentInput) {
  return withTransaction(async (tx) => {
    // All repository calls use same transaction
    await this.inventoryRepository.adjustStock(..., { tx });
    await this.auditService.log(ctx, event, tx);
  });
}
```

## Audit Logging

Centralized audit logging for all state changes:

```typescript
import { getAuditService } from '@/src/services/audit';

const auditService = getAuditService();

await auditService.log(ctx, {
  entityType: 'Order',
  entityId: orderId,
  action: 'CREATED',
  changes: { supplierId, itemCount },
});
```

### Pre-built Audit Methods

```typescript
await auditService.logItemCreated(ctx, itemId, itemData, tx);
await auditService.logOrderSent(ctx, orderId, orderData, tx);
await auditService.logGoodsReceiptConfirmed(ctx, receiptId, receiptData, metadata, tx);
```

## Testing Strategy

### Unit Tests (Services)
```typescript
describe('InventoryService', () => {
  it('should adjust stock correctly', async () => {
    const mockRepo = {
      adjustStock: jest.fn().mockResolvedValue({ newQuantity: 15 }),
    };
    const service = new InventoryService(mockRepo, ...);
    
    const result = await service.adjustStock(ctx, {
      itemId: '123',
      locationId: '456',
      quantity: 5,
    });
    
    expect(result.newQuantity).toBe(15);
  });
});
```

### Integration Tests (Repositories)
```typescript
describe('InventoryRepository', () => {
  it('should find items for practice', async () => {
    const repo = new InventoryRepository();
    const items = await repo.findItems('practice-1');
    
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].practiceId).toBe('practice-1');
  });
});
```

## Migration to Go

The architecture is designed for easy migration to Go:

### TypeScript → Go Mapping

| TypeScript | Go |
|------------|-----|
| `src/domain/models` | `internal/domain` |
| `src/services` | `internal/services` |
| `src/repositories` | `internal/repositories` |
| `RequestContext` | `context.Context` |
| `withTransaction()` | `db.Transaction()` |

### Go Repository Example

```go
type InventoryRepository interface {
    FindItems(ctx context.Context, practiceID string) ([]*Item, error)
    CreateItem(ctx context.Context, item *Item) error
}

type inventoryRepository struct {
    db *sql.DB
}

func (r *inventoryRepository) FindItems(ctx context.Context, practiceID string) ([]*Item, error) {
    query := "SELECT * FROM items WHERE practice_id = $1"
    // ... implementation
}
```

### Same Database Schema

No changes to PostgreSQL schema required. Use:
- **sqlc** - Generate type-safe Go from SQL
- **GORM** - ORM similar to Prisma
- **pgx** - High-performance PostgreSQL driver

## Best Practices

### DO ✅
- Always pass `RequestContext` to service methods
- Use `withTransaction()` for multi-step operations
- Log all state changes with `AuditService`
- Enforce authorization in services, not actions
- Use domain errors for business rule violations
- Keep actions thin (just parse and call service)

### DON'T ❌
- Import Prisma directly in services
- Mix business logic in repositories
- Skip tenant scoping checks
- Forget to log audit events
- Put authorization logic in actions
- Write business logic in actions

## Performance Considerations

### N+1 Query Prevention
```typescript
// ✅ Good: Include relations
const items = await repo.findItems(practiceId, undefined, {
  include: {
    product: true,
    inventory: true,
  },
});

// ❌ Bad: Separate queries in loop
const items = await repo.findItems(practiceId);
for (const item of items) {
  const product = await repo.findProduct(item.productId); // N+1!
}
```

### Pagination
```typescript
const items = await repo.findItems(practiceId, filters, {
  pagination: {
    page: 1,
    limit: 50,
  },
});
```

### Caching Strategy
- Cache frequently accessed data (products, locations)
- Invalidate cache on updates
- Use Redis for session storage

## Troubleshooting

### "Cannot find module '@/src/...'"

Ensure `tsconfig.json` includes:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### "No active practice in session"

User must have at least one active practice membership. Check:
```typescript
const ctx = await buildRequestContext();
console.log(ctx.practiceId, ctx.role);
```

### Transaction Errors

Ensure all repository calls within `withTransaction` use the `tx` parameter:
```typescript
await withTransaction(async (tx) => {
  await repo.create(data, { tx }); // ✅ Pass tx
});
```

## Further Reading

- [Go Service Architecture](https://go.dev/doc/effective_go)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

