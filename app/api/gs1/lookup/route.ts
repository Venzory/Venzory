import { NextResponse } from 'next/server';
import { requireActivePractice } from '@/lib/auth';
import { getGs1Service } from '@/src/services/gs1';
import { apiHandlerContext } from '@/lib/api-handler';

export const GET = apiHandlerContext(async (request: Request) => {
  // Require auth to ensure user is logged in
  await requireActivePractice();
  
  const { searchParams } = new URL(request.url);
  const gtin = searchParams.get('gtin');

  if (!gtin) {
    return NextResponse.json(
      { error: 'GTIN parameter is required' },
      { status: 400 }
    );
  }

  const service = getGs1Service();
  
  // Ensure product exists (fetches from GS1 if needed)
  const product = await service.ensureGlobalProductForGtin(gtin);

  // In the future, we can also fetch linked Global Supplier Items here
  
  return NextResponse.json(product);
});

