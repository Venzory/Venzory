'use server';

import { PracticeRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getOrderService } from '@/src/services';
import { hasRole } from '@/lib/rbac';
import { verifyCsrfFromHeaders } from '@/lib/server-action-csrf';

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
  await verifyCsrfFromHeaders();
  
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

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

  try {
    const template = await getOrderService().createTemplate(ctx, {
      name,
      description,
      items: templateItems,
    });

    revalidatePath('/orders/templates');
    redirect(`/orders/templates/${template.id}`);
  } catch (error: any) {
    return { error: error.message || 'Failed to create template' } as const;
  }
}

export async function updateTemplateAction(formData: FormData) {
  await verifyCsrfFromHeaders();
  
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

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

  await getOrderService().updateTemplate(ctx, templateId, {
    name,
    description,
  });

  revalidatePath(`/orders/templates/${templateId}`);
  revalidatePath('/orders/templates');
}

export async function deleteTemplateAction(templateId: string) {
  await verifyCsrfFromHeaders();
  
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  await getOrderService().deleteTemplate(ctx, templateId);

  revalidatePath('/orders/templates');
  redirect('/orders/templates');
}

export async function addTemplateItemAction(_prevState: unknown, formData: FormData) {
  await verifyCsrfFromHeaders();
  
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

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

  try {
    await getOrderService().addTemplateItem(ctx, templateId, {
      itemId,
      defaultQuantity,
      supplierId,
    });

    revalidatePath(`/orders/templates/${templateId}`);
    return { success: 'Item added to template' } as const;
  } catch (error: any) {
    return { error: error.message || 'Failed to add item' } as const;
  }
}

export async function updateTemplateItemAction(formData: FormData) {
  await verifyCsrfFromHeaders();
  
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

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

  const result = await getOrderService().updateTemplateItem(ctx, templateItemId, {
    defaultQuantity,
    supplierId,
  });

  revalidatePath(`/orders/templates/${result.templateId}`);
}

export async function removeTemplateItemAction(templateItemId: string) {
  await verifyCsrfFromHeaders();
  
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    throw new Error('Insufficient permissions');
  }

  await getOrderService().removeTemplateItem(ctx, templateItemId);

  revalidatePath(`/orders/templates`);
}

export async function createOrdersFromTemplateAction(
  templateId: string,
  orderData: {
    supplierId: string;
    items: { itemId: string; quantity: number; unitPrice: number | null }[];
  }[]
) {
  await verifyCsrfFromHeaders();
  
  const { session, practiceId } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  if (
    !hasRole({
      memberships: session.user.memberships,
      practiceId,
      minimumRole: PracticeRole.STAFF,
    })
  ) {
    return { error: 'Insufficient permissions' } as const;
  }

  if (orderData.length === 0) {
    return { error: 'No orders to create' } as const;
  }

  try {
    const result = await getOrderService().createOrdersFromTemplate(ctx, templateId, orderData);

    revalidatePath('/orders');
    revalidatePath('/orders/templates');
    revalidatePath('/dashboard');

    return result;
  } catch (error: any) {
    console.error('Error creating orders:', error);
    return { error: error.message || 'Failed to create orders. Please try again.' } as const;
  }
}


