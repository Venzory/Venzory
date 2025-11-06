'use server';

import { PracticeRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireActivePractice } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasRole } from '@/lib/rbac';

const upsertItemSchema = z.object({
  itemId: z.string().cuid().optional(),
  name: z.string().min(1, 'Name is required'),
  sku: z.string().max(64).optional().transform((value) => value?.trim() || null),
  description: z
    .string()
    .max(512)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
  unit: z.string().max(64).optional().transform((value) => value?.trim() || null),
  defaultSupplierId: z
    .string()
    .optional()
    .transform((value) => (value && value !== 'none' ? value : null)),
});

const updateLocationSchema = z.object({
  locationId: z.string().cuid(),
  name: z.string().min(1, 'Name is required'),
  code: z.string().max(32).optional().transform((value) => value?.trim() || null),
  description: z
    .string()
    .max(256)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
  parentId: z
    .string()
    .optional()
    .transform((value) => (value && value !== 'none' ? value : null)),
});

const createLocationSchema = updateLocationSchema.omit({ locationId: true });

const upsertSupplierSchema = z.object({
  supplierId: z.string().cuid().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z
    .string()
    .optional()
    .transform((value) => value?.trim() || null)
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Invalid email address',
    }),
  phone: z.string().max(32).optional().transform((value) => value?.trim() || null),
  website: z
    .string()
    .optional()
    .transform((value) => value?.trim() || null)
    .refine((value) => !value || z.string().url().safeParse(value).success, {
      message: 'Invalid website URL',
    }),
  notes: z
    .string()
    .max(512)
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : null)),
});

const stockAdjustmentSchema = z.object({
  itemId: z.string().cuid(),
  locationId: z.string().cuid(),
  quantity: z.coerce.number().int(),
  reason: z.string().max(64).optional().transform((value) => value?.trim() || null),
  note: z.string().max(256).optional().transform((value) => (value?.trim() ? value.trim() : null)),
});

export async function upsertItemAction(_prevState: unknown, formData: FormData) {
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

  const parsed = upsertItemSchema.safeParse({
    itemId: formData.get('itemId') ?? undefined,
    name: formData.get('name'),
    sku: formData.get('sku'),
    description: formData.get('description'),
    unit: formData.get('unit'),
    defaultSupplierId: formData.get('defaultSupplierId'),
  });

  if (!parsed.success) {
    return { error: 'Invalid item fields' } as const;
  }

  const { itemId, ...values } = parsed.data;

  if (itemId) {
    await prisma.item.update({
      where: { id: itemId, practiceId },
      data: values,
    });
  } else {
    await prisma.item.create({
      data: {
        ...values,
        practiceId,
      },
    });
  }

  revalidatePath('/inventory');
  return { success: itemId ? 'Item updated' : 'Item created' } as const;
}

export async function deleteItemAction(itemId: string) {
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

  await prisma.item.delete({
    where: { id: itemId, practiceId },
  });

  revalidatePath('/inventory');
}

export async function upsertLocationAction(_prevState: unknown, formData: FormData) {
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

  const payload = {
    locationId: formData.get('locationId') ?? undefined,
    name: formData.get('name'),
    code: formData.get('code'),
    description: formData.get('description'),
    parentId: formData.get('parentId'),
  };

  if (payload.locationId) {
    const parsed = updateLocationSchema.safeParse(payload);
    if (!parsed.success) {
      return { error: 'Invalid location details' } as const;
    }
    
    const { locationId, ...values } = parsed.data;
    await prisma.location.update({
      where: { id: locationId, practiceId },
      data: values,
    });
  } else {
    const parsed = createLocationSchema.safeParse(payload);
    if (!parsed.success) {
      return { error: 'Invalid location details' } as const;
    }
    
    await prisma.location.create({
      data: {
        ...parsed.data,
        practiceId,
      },
    });
  }

  revalidatePath('/locations');
  return { success: payload.locationId ? 'Location updated' : 'Location created' } as const;
}

export async function deleteLocationAction(locationId: string) {
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

  await prisma.location.delete({
    where: { id: locationId, practiceId },
  });

  revalidatePath('/locations');
}

export async function upsertSupplierAction(_prevState: unknown, formData: FormData) {
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

  const parsed = upsertSupplierSchema.safeParse({
    supplierId: formData.get('supplierId') ?? undefined,
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    website: formData.get('website'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: 'Invalid supplier details' } as const;
  }

  const { supplierId, ...values } = parsed.data;

  if (supplierId) {
    await prisma.supplier.update({
      where: { id: supplierId, practiceId },
      data: values,
    });
  } else {
    await prisma.supplier.create({
      data: {
        ...values,
        practiceId,
      },
    });
  }

  revalidatePath('/suppliers');
  revalidatePath('/inventory');
  return { success: supplierId ? 'Supplier updated' : 'Supplier added' } as const;
}

export async function deleteSupplierAction(supplierId: string) {
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

  await prisma.supplier.delete({
    where: { id: supplierId, practiceId },
  });

  revalidatePath('/suppliers');
  revalidatePath('/inventory');
}

// Wrapper for inline form usage (no return value)
export async function upsertItemInlineAction(formData: FormData) {
  await upsertItemAction(null, formData);
}

// Wrapper for inline form usage (no return value)
export async function upsertLocationInlineAction(formData: FormData) {
  await upsertLocationAction(null, formData);
}

// Wrapper for inline form usage (no return value)
export async function upsertSupplierInlineAction(formData: FormData) {
  await upsertSupplierAction(null, formData);
}

export async function createStockAdjustmentAction(_prevState: unknown, formData: FormData) {
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

  const parsed = stockAdjustmentSchema.safeParse({
    itemId: formData.get('itemId'),
    locationId: formData.get('locationId'),
    quantity: formData.get('quantity'),
    reason: formData.get('reason'),
    note: formData.get('note'),
  });

  if (!parsed.success) {
    return { error: 'Invalid adjustment details' } as const;
  }

  const { itemId, locationId, quantity, reason, note } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.locationInventory.findUnique({
      where: {
        locationId_itemId: {
          locationId,
          itemId,
        },
      },
    });

    const nextQuantity = (existing?.quantity ?? 0) + quantity;

    if (nextQuantity < 0) {
      throw new Error('Resulting quantity cannot be negative');
    }

    await tx.locationInventory.upsert({
      where: {
        locationId_itemId: {
          locationId,
          itemId,
        },
      },
      create: {
        locationId,
        itemId,
        quantity: nextQuantity,
      },
      update: {
        quantity: nextQuantity,
      },
    });

    await tx.stockAdjustment.create({
      data: {
        itemId,
        locationId,
        practiceId,
        quantity,
        reason,
        note,
        createdById: session.user.id,
      },
    });
  });

  revalidatePath('/inventory');
  return { success: 'Stock adjustment recorded' } as const;
}

