# Testing Guide

## Overview

Remcura V2 uses **Vitest** for testing with a clear separation between unit tests and integration tests.

- **Unit tests** run quickly without a database using mocked dependencies
- **Integration tests** require a real PostgreSQL database and test full database transactions

## Quick Start

```bash
# Run unit tests (fast, no database required, default)
npm test
# or
npm run test:unit

# Watch mode for development
npm run test:unit:watch

# Run with coverage
npm run test:coverage

# Integration tests (requires test database setup - see below)
DATABASE_URL="postgresql://remcura:remcura@localhost:5432/remcura_test" npm run test:integration
```

## Test Structure

### Unit Tests (`__tests__/`)

Located in `__tests__/` directory, these tests:
- Use **mocked Prisma client** (no real database connection)
- Run quickly (10s timeout per test)
- Focus on business logic, validation, and service layer behavior
- Should be runnable on any machine without setup

**Categories:**
- `__tests__/lib/` - Utility functions (CSRF, error handlers, fetchers)
- `__tests__/services/` - Business logic services (inventory, orders, etc.)
- `__tests__/api/` - API route handlers
- `__tests__/server-actions/` - Server action wrappers
- `__tests__/repositories/` - Repository tenant isolation logic

### Integration Tests (`tests/integration/`)

Located in `tests/integration/`, these tests:
- Use **real PostgreSQL database** connection
- Test full transaction flows with rollback behavior
- Verify data persistence and database constraints
- Run in CI automatically after unit tests pass
- Require local database setup for development (see below)

**Categories:**
- `tests/integration/inventory-transactions.test.ts` - Inventory transaction boundaries
- `tests/integration/order-transactions.test.ts` - Order transaction atomicity  
- `tests/integration/receiving-transactions.test.ts` - Receiving flow transactions
- `tests/integration/tenant-isolation.test.ts` - Multi-tenancy isolation verification

## How Mocking Works

### Prisma Mock

Unit tests use a centralized Prisma mock defined in `__tests__/mocks/prisma.ts`.

**Key Features:**
- All Prisma models are mocked (User, Item, Order, etc.)
- Mock functions return empty arrays/null by default
- Tests can override specific methods as needed
- Mocks are automatically reset between tests

**Example usage in tests:**

```typescript
import { vi } from 'vitest';
import { prisma } from '@/lib/prisma'; // This is the mock

// Override mock behavior for your test
vi.mocked(prisma.item.findMany).mockResolvedValue([
  { id: '1', name: 'Test Item', practiceId: 'practice-1' }
]);

// Run your test
const result = await inventoryService.findItems(ctx, {});

// Assert
expect(prisma.item.findMany).toHaveBeenCalledWith({
  where: { practiceId: 'practice-1' }
});
```

### Other Mocks

The following are also globally mocked in `vitest.setup.ts`:

- `next/server` - NextResponse for API routes
- `next-auth` - Authentication handlers
- `next/cache` - revalidatePath, revalidateTag
- `./auth` - App-specific auth module

## Writing Unit Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YourService } from '@/src/services/your-service';
import { createTestContext } from '@/__tests__/fixtures/inventory-fixtures';

describe('YourService', () => {
  let service: YourService;
  
  beforeEach(() => {
    // Setup runs before each test
    service = new YourService(/* mocked dependencies */);
  });
  
  it('should do something', async () => {
    // Arrange
    const ctx = createTestContext({ role: 'ADMIN' });
    
    // Act
    const result = await service.doSomething(ctx, input);
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

### Using Test Fixtures

Test fixtures are available in `__tests__/fixtures/inventory-fixtures.ts`:

```typescript
import {
  createTestContext,
  createTestPractice,
  createTestLocation,
  createTestItem,
} from '@/__tests__/fixtures/inventory-fixtures';

// Create test data
const ctx = createTestContext({ role: 'STAFF' });
const practice = createTestPractice();
const location = createTestLocation(practice.id);
```

### Mocking Repository Methods

```typescript
import { vi } from 'vitest';

const mockInventoryRepo = {
  findItemById: vi.fn().mockResolvedValue(testItem),
  createItem: vi.fn().mockResolvedValue(testItem),
  updateItem: vi.fn().mockResolvedValue(updatedItem),
};

const service = new InventoryService(mockInventoryRepo, ...);
```

## Running Integration Tests

Integration tests use a **real PostgreSQL database** and are kept separate from unit tests. They run in CI automatically but require local setup for development.

### Local Setup (One-Time)

1. **Start PostgreSQL**
   ```bash
   # Using docker-compose
   docker compose up -d postgres
   ```

2. **Create Test Database**
   ```bash
   # Create remcura_test database alongside remcura_v2
   docker exec -it remcura-postgres createdb -U remcura remcura_test
   ```

3. **Apply Migrations**
   ```bash
   # Set DATABASE_URL to point at test database
   export DATABASE_URL="postgresql://remcura:remcura@localhost:5432/remcura_test"
   
   # Run migrations (production-style)
   npm run db:migrate:deploy
   ```

### Running Integration Tests

```bash
# Set DATABASE_URL to test database
export DATABASE_URL="postgresql://remcura:remcura@localhost:5432/remcura_test"

# Run integration tests
npm run test:integration
```

**Important:**
- Integration tests use `vitest.integration.config.ts` (separate from unit tests)
- They use the **real Prisma client** (no mocks)
- Each test creates and cleans up its own data
- Tests run in Node environment (not jsdom)
- Longer timeout (30s) to accommodate database operations

### CI Behavior

Integration tests run automatically in GitHub Actions:
- Triggered after unit tests pass
- Uses dedicated `integration-tests` job
- Spins up Postgres service
- Runs migrations before tests
- Fails the pipeline if tests fail

### Integration Test Best Practices

- Always clean up test data in `afterEach` hooks
- Use transactions where possible for faster cleanup
- Don't rely on test execution order
- Use unique slugs/emails to avoid conflicts (e.g., `test-${Date.now()}@example.com`)

## Test Configuration

### Timeouts

```typescript
// vitest.config.ts
testTimeout: 10000,  // 10s for unit tests
hookTimeout: 5000,   // 5s for setup/teardown
```

### Environment Variables

Set in `vitest.setup.ts`:
- `NODE_ENV=test`
- `DATABASE_URL` (dummy value for unit tests)
- `NEXTAUTH_SECRET`, `CSRF_SECRET` (test values)

## Common Issues & Solutions

### Tests Hanging

**Problem:** Tests run but never complete

**Solution:** Check that:
1. You're using the mocked Prisma client (not real DB connection)
2. All async operations are properly awaited
3. Mocks are returning resolved promises, not hanging promises
4. Test timeout is configured (`testTimeout` in vitest.config.ts)

### Mock Not Working

**Problem:** Test still tries to connect to real database

**Solution:**
```typescript
// In your test file, verify the mock is used:
import { prisma } from '@/lib/prisma';

// Check it's a mock
expect(vi.isMockFunction(prisma.item.findMany)).toBe(true);
```

### Type Errors with Mocks

**Problem:** TypeScript complains about mock return types

**Solution:** Cast the mock:
```typescript
vi.mocked(prisma.item.findMany).mockResolvedValue([
  testItem as any // Cast if needed
]);
```

## Test Coverage

Run coverage report:
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

**Coverage Targets (aspirational):**
- Services: 80%+
- Repositories: 70%+
- Utilities: 90%+

## CI/CD Integration

### GitHub Actions Workflow

The CI workflow (`.github/workflows/ci.yml`) includes two test jobs:

1. **Unit Tests Job** (`test`)
   - Runs lint, typecheck, unit tests, and build
   - Fast feedback (uses mocked dependencies)
   - Must pass before integration tests run

2. **Integration Tests Job** (`integration-tests`)
   - Runs after unit tests pass (`needs: test`)
   - Spins up PostgreSQL service
   - Applies migrations with `npm run db:migrate:deploy`
   - Runs integration tests with `npm run test:integration`
   - Fails the pipeline if tests fail

```yaml
# Example from .github/workflows/ci.yml
integration-tests:
  runs-on: ubuntu-latest
  needs: test
  
  services:
    postgres:
      image: postgres:15
      # ... postgres config
  
  steps:
    - name: Run database migrations
      run: npm run db:migrate:deploy
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/remcura_test
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/remcura_test
```

## FAQ

**Q: Why are integration tests separate from unit tests?**

A: Integration tests require a PostgreSQL database setup and take longer to run. Unit tests provide fast feedback without infrastructure dependencies and remain the default for local development.

**Q: Can I run both unit and integration tests together?**

A: Yes, run them sequentially:
```bash
npm run test:unit
DATABASE_URL="postgresql://remcura:remcura@localhost:5432/remcura_test" npm run test:integration
```

**Q: Do integration tests run in CI automatically?**

A: Yes! The `integration-tests` job runs automatically after unit tests pass on all PRs and pushes to `main`.

**Q: How do I test server actions?**

A: Server actions are thin wrappers around services. Test the service layer with unit tests, and test the action's error handling/validation separately.

**Q: Should I test React components?**

A: Yes, but focus on component logic and user interactions. Use `@testing-library/react` for component tests.

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

## Contributing

When adding new tests:
1. Write unit tests by default
2. Add integration tests only for critical flows
3. Mock external dependencies
4. Keep tests isolated and deterministic
5. Follow existing test patterns and fixtures

---

**Last Updated:** November 14, 2025

