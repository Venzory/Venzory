import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductsPage from '@/app/(admin)/admin/product-master/page';
import * as Auth from '@/lib/auth';
import * as OwnerGuard from '@/lib/owner-guard';
import * as ServiceFactory from '@/src/services';

// Mock child components to avoid rendering issues
vi.mock('@/app/(admin)/admin/product-master/_components/product-filters', () => ({
  ProductFilters: () => <div>ProductFilters</div>
}));
vi.mock('@/app/(admin)/admin/product-master/_components/create-product-form', () => ({
  CreateProductForm: () => <div>CreateProductForm</div>
}));
vi.mock('@/app/(admin)/admin/product-master/_components/gs1-status-badge', () => ({
  Gs1StatusBadge: () => <div>Gs1StatusBadge</div>
}));
vi.mock('@/components/ui/empty-state', () => ({
  EmptyState: () => <div>EmptyState</div>
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>
}));

describe('Admin Product Master Page Access', () => {
  const mockSession = {
    user: {
      id: 'user1',
      email: 'user@example.com',
      activePracticeId: 'practice1',
      memberships: [
        {
          practiceId: 'practice1',
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock basic auth
    vi.spyOn(Auth, 'requireActivePractice').mockResolvedValue({
      session: mockSession as any,
      practiceId: 'practice1',
    });

    // Mock service
    vi.spyOn(ServiceFactory, 'getProductService').mockReturnValue({
      findProducts: vi.fn().mockResolvedValue([]),
    } as any);
  });

  it('should show "Access Denied" for non-owner', async () => {
    // Arrange
    vi.spyOn(OwnerGuard, 'isPlatformOwner').mockReturnValue(false);

    // Act
    const result = await ProductsPage({});

    // Assert
    const resultString = JSON.stringify(result);
    expect(resultString).toContain('Access Denied');
    expect(resultString).toContain('Only the platform owner can access');
  });

  it('should render Product Master Data for owner', async () => {
    // Arrange
    vi.spyOn(OwnerGuard, 'isPlatformOwner').mockReturnValue(true);

    // Act
    const result = await ProductsPage({});

    // Assert
    const resultString = JSON.stringify(result);
    expect(resultString).toContain('Product Master Data');
    expect(resultString).not.toContain('Access Denied');
    expect(ServiceFactory.getProductService().findProducts).toHaveBeenCalled();
  });
});
