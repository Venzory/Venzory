import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { createMockPrismaClient } from './__tests__/mocks/prisma';

/**
 * Set up valid test environment variables
 * This ensures the env validation module passes in test environment
 * 
 * Note: DATABASE_URL is a dummy value - unit tests use mocked Prisma client
 */
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://mock:mock@localhost:5432/mock_db', // Dummy URL - not used in unit tests
  NEXTAUTH_SECRET: 'a'.repeat(32), // 32 character secret for tests
  CSRF_SECRET: 'b'.repeat(32), // 32 character secret for tests
  NEXTAUTH_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
});

// Mock Prisma client globally for unit tests
const mockPrisma = createMockPrismaClient();

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

// Mock Next.js server module
vi.mock('next/server', () => {
  class MockNextResponse {
    headers: Headers;
    ok: boolean;
    status: number;
    _body: any;

    constructor(body?: any, init?: any) {
      this._body = body;
      this.headers = new Headers(init?.headers);
      this.ok = true;
      this.status = init?.status || 200;
    }

    async json() {
      return this._body;
    }

    static json(body: any, init?: any) {
      return new MockNextResponse(body, init);
    }

    static redirect(url: string) {
      const res = new MockNextResponse(null, { status: 307 });
      Object.defineProperty(res, 'url', { value: url });
      return res;
    }

    static next(init?: any) {
      return new MockNextResponse(null, init);
    }
  }

  return {
    NextResponse: MockNextResponse,
    NextRequest: class {
      headers: Headers;
      nextUrl: URL;
      url: string;
      
      constructor(input: string | URL, init?: any) {
        this.url = input.toString();
        this.nextUrl = new URL(this.url, 'http://localhost:3000');
        this.headers = new Headers(init?.headers);
      }
    }
  };
});

// Mock next-auth
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

// Mock the auth module
vi.mock('./auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));

// Mock revalidatePath and redirect from next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock logger to prevent open handles/streams
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(() => mockLogger),
};

vi.mock('@/lib/logger', () => ({
  default: mockLogger,
  createLoggerWithCorrelationId: vi.fn(() => mockLogger),
}));

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Reset all mocks after each test
  vi.clearAllMocks();
});

