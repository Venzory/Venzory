import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { InventoryRepository } from '@/src/repositories/inventory';
import { apiHandlerContext } from '@/lib/api-handler';
import { ForbiddenError } from '@/src/domain/errors';

interface RouteParams {
  params: Promise<{
    locationId: string;
    itemId: string;
  }>;
}

export const GET = apiHandlerContext(async (request: Request, { params }: RouteParams) => {
  const { practiceId } = await requireActivePractice();
  const { locationId, itemId } = await params;

  // Initialize repository
  const inventoryRepository = new InventoryRepository();

  // Fetch location inventory
  const inventory = await inventoryRepository.getLocationInventory(
    itemId,
    locationId
  );

  // Validate the location belongs to the user's practice
  if (inventory && inventory.location && inventory.location.practiceId !== practiceId) {
    throw new ForbiddenError('Unauthorized access to inventory');
  }

  return NextResponse.json({
    quantity: inventory?.quantity ?? 0,
    reorderPoint: inventory?.reorderPoint ?? null,
    reorderQuantity: inventory?.reorderQuantity ?? null,
  });
});


