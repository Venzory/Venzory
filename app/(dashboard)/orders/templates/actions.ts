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
      practiceSupplierId: z.string().cuid().optional().transform((value) => value || null),
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
  practiceSupplierId: z.string().cuid().optional().transform((value) => value || null),
});

const updateTemplateItemSchema = z.object({
  templateItemId: z.string().cuid(),
  defaultQuantity: z.coerce.number().int().positive(),
  practiceSupplierId: z.string().cuid().optional().transform((value) => value || null),
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create template';
    return { error: message } as const;
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
    practiceSupplierId: formData.get('supplierId'), // Form field is still named supplierId
  });

  if (!parsed.success) {
    return { error: 'Invalid item data' } as const;
  }

  const { templateId, itemId, defaultQuantity, practiceSupplierId } = parsed.data;

  try {
    await getOrderService().addTemplateItem(ctx, templateId, {
      itemId,
      defaultQuantity,
      practiceSupplierId,
    });

    revalidatePath(`/orders/templates/${templateId}`);
    return { success: 'Item added to template' } as const;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add item';
    return { error: message } as const;
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
    practiceSupplierId: formData.get('supplierId'), // Form field is still named supplierId
  });

  if (!parsed.success) {
    throw new Error('Invalid item data');
  }

  const { templateItemId, defaultQuantity, practiceSupplierId } = parsed.data;

  const result = await getOrderService().updateTemplateItem(ctx, templateItemId, {
    defaultQuantity,
    practiceSupplierId,
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
    supplierId: string; // This is actually a practiceSupplierId (naming kept for backward compat with client)
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
    // Map to the format expected by the service
    // Note: supplierId is actually a practiceSupplierId from the client
    const mappedOrderData = orderData.map(group => ({
      practiceSupplierId: group.supplierId,
      items: group.items,
    }));
    
    const result = await getOrderService().createOrdersFromTemplate(ctx, templateId, mappedOrderData);

    revalidatePath('/orders');
    revalidatePath('/orders/templates');
    revalidatePath('/dashboard');

    return result;
  } catch (error: unknown) {
    console.error('Error creating orders:', error);
    const message = error instanceof Error ? error.message : 'Failed to create orders. Please try again.';
    return { error: message } as const;
  }
}

/**
 * Quick create orders from template using default quantities and suppliers
 * One-click action that creates draft orders and redirects to the order detail page
 */
export async function quickCreateOrderFromTemplateAction(templateId: string) {
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

  try {
    const result = await getOrderService().createOrdersFromTemplateWithDefaults(ctx, templateId);

    revalidatePath('/orders');
    revalidatePath('/orders/templates');
    revalidatePath('/dashboard');

    // Single order - redirect directly to the order detail page
    if (result.orders && result.orders.length === 1) {
      redirect(`/orders/${result.orders[0].id}`);
    } else if (result.orders && result.orders.length > 1) {
      // Multiple orders - redirect to summary page with order IDs
      const orderIds = result.orders.map(o => o.id).join(',');
      redirect(`/orders/quick-summary?templateId=${templateId}&orderIds=${orderIds}`);
    } else {
      // Fallback - shouldn't happen but handle gracefully
      redirect('/orders');
    }
  } catch (error: unknown) {
    // redirect() throws a special NEXT_REDIRECT error that should propagate
    // Only catch and handle actual errors
    if (error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error; // Re-throw redirect errors
    }
    console.error('Error creating orders from template:', error);
    const message = error instanceof Error ? error.message : 'Failed to create orders from template. Please try again.';
    throw new Error(message);
  }
}


