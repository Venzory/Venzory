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

  // Fetch location inventory with practice validation
  const inventory = await inventoryRepository.getLocationInventory(
    itemId,
    locationId,
    practiceId
  );

  return NextResponse.json({
    quantity: inventory?.quantity ?? 0,
    reorderPoint: inventory?.reorderPoint ?? null,
    reorderQuantity: inventory?.reorderQuantity ?? null,
  });
});


