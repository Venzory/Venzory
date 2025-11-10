import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { InventoryRepository } from '@/src/repositories/inventory';

interface RouteParams {
  params: Promise<{
    locationId: string;
    itemId: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { session, practiceId } = await requireActivePractice();
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
      return NextResponse.json(
        { error: 'Unauthorized access to inventory' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      quantity: inventory?.quantity ?? 0,
      reorderPoint: inventory?.reorderPoint ?? null,
      reorderQuantity: inventory?.reorderQuantity ?? null,
    });
  } catch (error) {
    console.error('[API] Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}


