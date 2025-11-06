'use server';

import { PracticeRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional().transform((value) => value?.trim() || null),
  items: z.array(
    z.object({
      itemId: z.string().cuid(),
      defaultQuantity: z.coerce.number().int().positive(),
      supplierId: z.string().cuid().optional().transform((value) => value || null),
    })
  ).min(1, 'At least one item is required'),
});

const updateTemplateSchema = z.object({
  templateId: z.string().cuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional().transform((value) => value?.trim() || null),
});

const addTemplateItemSchema = z.object({
  templateId: z.string().cuid(),
  itemId: z.string().cuid(),
  defaultQuantity: z.coerce.number().int().positive(),
  supplierId: z.string().cuid().optional().transform((value) => value || null),
});

const updateTemplateItemSchema = z.object({
  templateItemId: z.string().cuid(),
  defaultQuantity: z.coerce.number().int().positive(),
  supplierId: z.string().cuid().optional().transform((value) => value || null),
});

export async function createTemplateAction(_prevState: unknown, formData: FormData) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    return { error: 'Insufficient permissions' } as const;
  }

  // Parse items from formData (they come as JSON string)
  const itemsJson = formData.get('items');
  let items;
  try {
    items = itemsJson ? JSON.parse(itemsJson as string) : [];
  } catch {
    return { error: 'Invalid items data' } as const;
  }

  const parsed = createTemplateSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid template data' } as const;
  }

  const { name, description, items: templateItems } = parsed.data;

  // Verify all items belong to practice
  const itemIds = templateItems.map((i) => i.itemId);
  const itemsCount = await prisma.item.count({
    where: {
      id: { in: itemIds },
      practiceId,
    },
  });

  if (itemsCount !== itemIds.length) {
    return { error: 'Some items do not belong to this practice' } as const;
  }

  // Create template with items
  const template = await prisma.orderTemplate.create({
    data: {
      practiceId,
      name,
      description,
      createdById: session.user.id,
      items: {
        create: templateItems.map((item) => ({
          itemId: item.itemId,
          defaultQuantity: item.defaultQuantity,
          supplierId: item.supplierId,
        })),
      },
    },
  });

  revalidatePath('/orders/templates');
  redirect(`/orders/templates/${template.id}`);
}

export async function updateTemplateAction(formData: FormData) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  const parsed = updateTemplateSchema.safeParse({
    templateId: formData.get('templateId'),
    name: formData.get('name'),
    description: formData.get('description'),
  });

  if (!parsed.success) {
    throw new Error('Invalid template data');
  }

  const { templateId, name, description } = parsed.data;

  // Verify template belongs to practice
  const template = await prisma.orderTemplate.findUnique({
    where: { id: templateId, practiceId },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  await prisma.orderTemplate.update({
    where: { id: templateId },
    data: {
      name,
      description,
    },
  });

  revalidatePath(`/orders/templates/${templateId}`);
  revalidatePath('/orders/templates');
}

export async function deleteTemplateAction(templateId: string) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  // Verify template belongs to practice
  const template = await prisma.orderTemplate.findUnique({
    where: { id: templateId, practiceId },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  await prisma.orderTemplate.delete({
    where: { id: templateId },
  });

  revalidatePath('/orders/templates');
  redirect('/orders/templates');
}

export async function addTemplateItemAction(_prevState: unknown, formData: FormData) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    return { error: 'Insufficient permissions' } as const;
  }

  const parsed = addTemplateItemSchema.safeParse({
    templateId: formData.get('templateId'),
    itemId: formData.get('itemId'),
    defaultQuantity: formData.get('defaultQuantity'),
    supplierId: formData.get('supplierId'),
  });

  if (!parsed.success) {
    return { error: 'Invalid item data' } as const;
  }

  const { templateId, itemId, defaultQuantity, supplierId } = parsed.data;

  // Verify template belongs to practice
  const template = await prisma.orderTemplate.findUnique({
    where: { id: templateId, practiceId },
  });

  if (!template) {
    return { error: 'Template not found' } as const;
  }

  // Verify item belongs to practice
  const item = await prisma.item.findUnique({
    where: { id: itemId, practiceId },
  });

  if (!item) {
    return { error: 'Item not found' } as const;
  }

  // Check if item already exists in template
  const existing = await prisma.orderTemplateItem.findUnique({
    where: {
      templateId_itemId: {
        templateId,
        itemId,
      },
    },
  });

  if (existing) {
    return { error: 'Item already in template' } as const;
  }

  await prisma.orderTemplateItem.create({
    data: {
      templateId,
      itemId,
      defaultQuantity,
      supplierId,
    },
  });

  revalidatePath(`/orders/templates/${templateId}`);
  return { success: 'Item added to template' } as const;
}

export async function updateTemplateItemAction(formData: FormData) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  const parsed = updateTemplateItemSchema.safeParse({
    templateItemId: formData.get('templateItemId'),
    defaultQuantity: formData.get('defaultQuantity'),
    supplierId: formData.get('supplierId'),
  });

  if (!parsed.success) {
    throw new Error('Invalid item data');
  }

  const { templateItemId, defaultQuantity, supplierId } = parsed.data;

  // Verify template item exists and belongs to practice
  const templateItem = await prisma.orderTemplateItem.findUnique({
    where: { id: templateItemId },
    include: {
      template: {
        select: { practiceId: true },
      },
    },
  });

  if (!templateItem || templateItem.template.practiceId !== practiceId) {
    throw new Error('Template item not found');
  }

  await prisma.orderTemplateItem.update({
    where: { id: templateItemId },
    data: {
      defaultQuantity,
      supplierId,
    },
  });

  revalidatePath(`/orders/templates/${templateItem.templateId}`);
}

export async function removeTemplateItemAction(templateItemId: string) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  // Verify template item exists and belongs to practice
  const templateItem = await prisma.orderTemplateItem.findUnique({
    where: { id: templateItemId },
    include: {
      template: {
        select: { practiceId: true, id: true },
      },
    },
  });

  if (!templateItem || templateItem.template.practiceId !== practiceId) {
    throw new Error('Template item not found');
  }

  await prisma.orderTemplateItem.delete({
    where: { id: templateItemId },
  });

  revalidatePath(`/orders/templates/${templateItem.templateId}`);
}

export async function createOrdersFromTemplateAction(
  templateId: string,
  orderData: {
    supplierId: string;
    items: { itemId: string; quantity: number; unitPrice: number | null }[];
  }[]
) {
  const { session, practiceId } = await requireActivePractice();

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    return { error: 'Insufficient permissions' } as const;
  }

  // Verify template belongs to practice
  const template = await prisma.orderTemplate.findUnique({
    where: { id: templateId, practiceId },
  });

  if (!template) {
    return { error: 'Template not found' } as const;
  }

  if (orderData.length === 0) {
    return { error: 'No orders to create' } as const;
  }

  // Create one draft order per supplier
  const createdOrders: { id: string; supplierName: string }[] = [];

  try {
    for (const supplierGroup of orderData) {
      if (supplierGroup.items.length === 0) {
        continue;
      }

      // Verify supplier belongs to practice
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierGroup.supplierId, practiceId },
      });

      if (!supplier) {
        continue; // Skip invalid suppliers
      }

      const order = await prisma.order.create({
        data: {
          practiceId,
          supplierId: supplierGroup.supplierId,
          status: 'DRAFT',
          createdById: session.user.id,
          notes: `Created from template: ${template.name}`,
          items: {
            create: supplierGroup.items.map((item) => ({
              itemId: item.itemId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
      });

      createdOrders.push({
        id: order.id,
        supplierName: supplier.name,
      });
    }
  } catch (error) {
    console.error('Error creating orders:', error);
    return { error: 'Failed to create orders. Please try again.' } as const;
  }

  if (createdOrders.length === 0) {
    return { error: 'No valid orders could be created' } as const;
  }

  revalidatePath('/orders');
  revalidatePath('/orders/templates');

  const message =
    createdOrders.length === 1
      ? `Created 1 draft order for ${createdOrders[0].supplierName}`
      : `Created ${createdOrders.length} draft orders for ${createdOrders.length} suppliers`;

  return {
    success: true,
    message,
    orders: createdOrders,
  } as const;
}

