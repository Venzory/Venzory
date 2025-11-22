import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { getInventoryService } from '@/src/services/inventory';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { apiHandlerContext } from '@/lib/api-handler';

interface RouteParams {
  params: Promise<{
    locationId: string;
    itemId: string;
  }>;
}

export const GET = apiHandlerContext(async (request: Request, { params }: RouteParams) => {
  const { session } = await requireActivePractice();
  const { locationId, itemId } = await params;

  // Build request context for service call
  const ctx = buildRequestContextFromSession(session);

  // Initialize service
  const inventoryService = getInventoryService();

  // Fetch location inventory via service (handles logic and validation)
  const inventory = await inventoryService.getItemInventoryAtLocation(
    ctx,
    itemId,
    locationId
  );

  return NextResponse.json(inventory);
});
