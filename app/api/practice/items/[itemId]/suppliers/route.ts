import { NextResponse } from 'next/server';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getProductService } from '@/src/services';
import { isDomainError } from '@/src/domain/errors';

interface RouteParams {
  params: {
    itemId: string;
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { session } = await requireActivePractice();
    const ctx = buildRequestContextFromSession(session);

    if (!params.itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const data = await getProductService().getSupplierOptionsForItem(ctx, params.itemId);
    return NextResponse.json(data);
  } catch (error) {
    if (isDomainError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[item-suppliers] Unexpected error', error);
    return NextResponse.json({ error: 'Unable to load supplier options' }, { status: 500 });
  }
}

