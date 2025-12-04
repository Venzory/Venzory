
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getOrderService } from '@/src/services/orders';
import type { RequestContext } from '@/src/lib/context/request-context';
import * as ContextBuilder from '@/src/lib/context/context-builder';
import { 
  createTemplateAction, 
  updateTemplateAction, 
  deleteTemplateAction 
} from '@/app/(clinic)/app/orders/templates/actions';

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// Mock csrf
vi.mock('@/lib/server-action-csrf', () => ({
  verifyCsrfFromHeaders: vi.fn().mockResolvedValue(undefined),
}));

// Mock navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock revalidate
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Order Template Actions - RBAC Tests', () => {
  let practiceId: string;
  let user1Id: string;
  let itemId: string;
  let templateId: string;
  let ctx: RequestContext;

  beforeAll(async () => {
    // Setup data
    const practice = await prisma.practice.create({
      data: { name: 'Template RBAC Test', slug: 'temp-rbac-test' },
    });
    practiceId = practice.id;

    const user = await prisma.user.create({
      data: { email: 'temp-rbac@test.com', name: 'Template Tester' },
    });
    user1Id = user.id;

    const product = await prisma.product.create({
      data: { name: 'Template Product' },
    });

    const item = await prisma.item.create({
      data: {
        practiceId,
        productId: product.id,
        name: 'Template Item',
      },
    });
    itemId = item.id;

    // Create initial template
    const template = await prisma.orderTemplate.create({
      data: {
        practiceId,
        name: 'Existing Template',
        createdById: user1Id,
      },
    });
    templateId = template.id;

    // Base Context
    ctx = {
      userId: user1Id,
      userEmail: 'temp-rbac@test.com',
      userName: 'Template Tester',
      practiceId,
      role: 'STAFF',
      memberships: [],
      timestamp: new Date(),
      locationId: null,
      allowedLocationIds: [],
    };
  });

  afterAll(async () => {
    await prisma.orderTemplateItem.deleteMany({});
    await prisma.orderTemplate.deleteMany({ where: { practiceId } });
    await prisma.item.deleteMany({ where: { id: itemId } });
    await prisma.product.deleteMany({ where: { name: 'Template Product' } });
    await prisma.user.deleteMany({ where: { id: user1Id } });
    await prisma.practice.deleteMany({ where: { id: practiceId } });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mock('@/lib/server-action-csrf', () => ({
      verifyCsrfFromHeaders: vi.fn().mockResolvedValue(undefined),
    }));
  });

  describe('createTemplateAction', () => {
    it('should allow STAFF to create template', async () => {
      const staffCtx = { ...ctx, role: 'STAFF' as const };
      vi.spyOn(ContextBuilder, 'buildRequestContext').mockResolvedValue(staffCtx);

      const formData = new FormData();
      formData.append('name', 'New Staff Template');
      formData.append('items', JSON.stringify([{ itemId, defaultQuantity: 5 }]));

      // The action calls redirect on success, which throws NEXT_REDIRECT
      // We catch it or mock redirect. We mocked redirect.
      
      const result = await createTemplateAction(null, formData);
      if (result && 'error' in result) {
        console.error('Create Action Error:', result.error);
      }
      
      const created = await prisma.orderTemplate.findFirst({
        where: { name: 'New Staff Template' },
      });
      expect(created).not.toBeNull();
    });

    it('should allow STAFF to create template (STAFF is the minimum role)', async () => {
      // STAFF is the lowest role and can create templates
      const staffCtx = { ...ctx, role: 'STAFF' as const };
      vi.spyOn(ContextBuilder, 'buildRequestContext').mockResolvedValue(staffCtx);

      const formData = new FormData();
      formData.append('name', 'Another Staff Template');
      formData.append('items', JSON.stringify([{ itemId, defaultQuantity: 5 }]));

      const result = await createTemplateAction(null, formData);
      
      // STAFF can create templates, so this should succeed
      const created = await prisma.orderTemplate.findFirst({
        where: { name: 'Another Staff Template' },
      });
      expect(created).not.toBeNull();
    });
  });

  describe('updateTemplateAction', () => {
    it('should allow STAFF to update template', async () => {
      // STAFF is the minimum role and can update templates
      const staffCtx = { ...ctx, role: 'STAFF' as const };
      vi.spyOn(ContextBuilder, 'buildRequestContext').mockResolvedValue(staffCtx);

      const formData = new FormData();
      formData.append('templateId', templateId);
      formData.append('name', 'Updated By Staff');

      // This should succeed - STAFF can update templates
      await expect(updateTemplateAction(formData)).resolves.not.toThrow();
    });
  });

  describe('deleteTemplateAction', () => {
    it('should allow STAFF to delete template', async () => {
      // Create a template to delete
      const templateToDelete = await prisma.orderTemplate.create({
        data: {
          practiceId,
          name: 'Template To Delete',
          createdById: user1Id,
        },
      });
      
      const staffCtx = { ...ctx, role: 'STAFF' as const };
      vi.spyOn(ContextBuilder, 'buildRequestContext').mockResolvedValue(staffCtx);

      // STAFF can delete templates
      await expect(deleteTemplateAction(templateToDelete.id)).resolves.not.toThrow();
    });
  });
});

