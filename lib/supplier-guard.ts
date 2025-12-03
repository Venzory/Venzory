import { prisma } from '@/lib/prisma';
import type { SupplierRole } from '@prisma/client';

function normalizeEmail(value: string | null | undefined): string | null {
  return value ? value.trim().toLowerCase() : null;
}

// ============================================
// SUPPLIER USER CONTEXT
// ============================================

export interface SupplierUserInfo {
  id: string;
  userId: string;
  globalSupplierId: string;
  role: SupplierRole;
  userEmail: string;
  userName: string | null;
  supplierName: string;
  supplierEmail: string | null;
}

/**
 * Get supplier user record for a user by email.
 * Returns null if user is not linked to a supplier.
 */
export async function getSupplierUser(
  email: string | null | undefined
): Promise<SupplierUserInfo | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  try {
    const supplierUser = await prisma.supplierUser.findFirst({
      where: {
        user: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        globalSupplier: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!supplierUser) return null;

    return {
      id: supplierUser.id,
      userId: supplierUser.userId,
      globalSupplierId: supplierUser.globalSupplierId,
      role: supplierUser.role,
      userEmail: supplierUser.user.email,
      userName: supplierUser.user.name,
      supplierName: supplierUser.globalSupplier.name,
      supplierEmail: supplierUser.globalSupplier.email,
    };
  } catch (error) {
    console.warn('[supplier-guard] getSupplierUser query failed:', error);
    return null;
  }
}

/**
 * Get supplier user record for a user by user ID.
 */
export async function getSupplierUserByUserId(
  userId: string | null | undefined
): Promise<SupplierUserInfo | null> {
  if (!userId) return null;

  try {
    const supplierUser = await prisma.supplierUser.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        globalSupplier: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!supplierUser) return null;

    return {
      id: supplierUser.id,
      userId: supplierUser.userId,
      globalSupplierId: supplierUser.globalSupplierId,
      role: supplierUser.role,
      userEmail: supplierUser.user.email,
      userName: supplierUser.user.name,
      supplierName: supplierUser.globalSupplier.name,
      supplierEmail: supplierUser.globalSupplier.email,
    };
  } catch (error) {
    console.warn('[supplier-guard] getSupplierUserByUserId query failed:', error);
    return null;
  }
}

/**
 * Check if a user has Supplier Portal access.
 */
export async function hasSupplierPortalAccess(
  email: string | null | undefined
): Promise<boolean> {
  const supplierUser = await getSupplierUser(email);
  return supplierUser !== null;
}

/**
 * Check if a user is a supplier admin.
 */
export async function isSupplierAdmin(
  email: string | null | undefined
): Promise<boolean> {
  const supplierUser = await getSupplierUser(email);
  return supplierUser?.role === 'ADMIN';
}

/**
 * Get the supplier context for a user - full supplier info for portal display.
 */
export async function getSupplierContext(
  email: string | null | undefined
): Promise<{
  supplierId: string;
  supplierName: string;
  supplierEmail: string | null;
  role: SupplierRole;
  userName: string | null;
} | null> {
  const supplierUser = await getSupplierUser(email);
  if (!supplierUser) return null;

  return {
    supplierId: supplierUser.globalSupplierId,
    supplierName: supplierUser.supplierName,
    supplierEmail: supplierUser.supplierEmail,
    role: supplierUser.role,
    userName: supplierUser.userName,
  };
}

/**
 * Get supplier role for a user.
 * Returns null if user has no supplier access.
 */
export async function getSupplierRole(
  email: string | null | undefined
): Promise<SupplierRole | null> {
  const supplierUser = await getSupplierUser(email);
  return supplierUser?.role ?? null;
}

