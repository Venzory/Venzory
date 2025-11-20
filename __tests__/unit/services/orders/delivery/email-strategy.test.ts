import { EmailOrderDeliveryStrategy } from '@/src/services/orders/delivery/email-strategy';
import { sendOrderEmail } from '@/src/lib/email/sendOrderEmail';
import { calculateOrderTotal } from '@/lib/prisma-transforms';
import type { OrderWithRelations } from '@/src/domain/models';
import type { RequestContext } from '@/src/lib/context/request-context';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/src/lib/email/sendOrderEmail', () => ({
  sendOrderEmail: vi.fn(),
}));

vi.mock('@/lib/prisma-transforms', () => ({
  calculateOrderTotal: vi.fn(),
  decimalToNumber: vi.fn((val) => (typeof val === 'number' ? val : Number(val))),
}));

describe('EmailOrderDeliveryStrategy', () => {
  let strategy: EmailOrderDeliveryStrategy;
  let mockCtx: RequestContext;

  beforeEach(() => {
    strategy = new EmailOrderDeliveryStrategy();
    mockCtx = {
      userId: 'user-1',
      practiceId: 'practice-1',
      roles: ['STAFF'],
      permissions: [],
    } as unknown as RequestContext;

    vi.clearAllMocks();
  });

  it('should successfully send an email when supplier has email address', async () => {
    // Arrange
    const mockOrder = {
      id: 'order-1',
      reference: 'REF-123',
      notes: 'Please deliver ASAP',
      practice: {
        name: 'Test Practice',
        street: '123 Main St',
        city: 'Test City',
        postalCode: '12345',
        country: 'Test Country',
      },
      practiceSupplier: {
        customLabel: 'My Supplier',
        globalSupplier: {
          name: 'Global Supplier Inc',
          email: 'supplier@example.com',
        },
      },
      items: [
        {
          item: { name: 'Item 1', sku: 'SKU-1' },
          quantity: 2,
          unitPrice: 10.5,
        },
        {
          item: { name: 'Item 2', sku: null },
          quantity: 1,
          unitPrice: 20.0,
        },
      ],
    } as unknown as OrderWithRelations;

    (calculateOrderTotal as any).mockReturnValue(41.0);
    (sendOrderEmail as any).mockResolvedValue({ success: true });

    // Act
    const result = await strategy.send(mockCtx, mockOrder);

    // Assert
    expect(result).toBe(true);
    expect(sendOrderEmail).toHaveBeenCalledWith({
      supplierEmail: 'supplier@example.com',
      supplierName: 'My Supplier',
      practiceName: 'Test Practice',
      practiceAddress: '123 Main St\nTest City\n12345\nTest Country',
      orderReference: 'REF-123',
      orderNotes: 'Please deliver ASAP',
      items: [
        {
            name: 'Item 1',
            sku: 'SKU-1',
            quantity: 2,
            unitPrice: 10.5,
            total: 21.0
        },
        {
            name: 'Item 2',
            sku: null,
            quantity: 1,
            unitPrice: 20.0,
            total: 20.0
        }
      ],
      orderTotal: 41.0,
    });
  });

  it('should return false if supplier has no email', async () => {
    // Arrange
    const mockOrder = {
      id: 'order-1',
      practiceSupplier: {
        globalSupplier: {
          email: null,
        },
      },
    } as unknown as OrderWithRelations;

    // Act
    const result = await strategy.send(mockCtx, mockOrder);

    // Assert
    expect(result).toBe(false);
    expect(sendOrderEmail).not.toHaveBeenCalled();
  });

  it('should return false if sendOrderEmail fails', async () => {
    // Arrange
    const mockOrder = {
        id: 'order-1',
        practiceSupplier: {
          globalSupplier: {
            email: 'supplier@example.com',
          },
        },
        items: []
      } as unknown as OrderWithRelations;
  
      (sendOrderEmail as any).mockResolvedValue({ success: false, error: 'SMTP Error' });
  
      // Act
      const result = await strategy.send(mockCtx, mockOrder);
  
      // Assert
      expect(result).toBe(false);
  });
});

