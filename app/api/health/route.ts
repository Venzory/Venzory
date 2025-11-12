import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { apiHandler } from '@/lib/api-handler';

export const GET = apiHandler(async () => {
  await prisma.$queryRaw`SELECT 1`;

  return NextResponse.json({
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});

