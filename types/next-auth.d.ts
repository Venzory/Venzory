import 'next-auth';
import 'next-auth/jwt';

import type { PracticeRole } from '@prisma/client';

export type SessionPractice = {
  id: string;
  practiceId: string;
  role: PracticeRole;
  practice: {
    id: string;
    name: string;
    slug: string;
  };
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      activePracticeId: string | null;
      memberships: SessionPractice[];
    };
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    activePracticeId?: string | null;
  }
}

