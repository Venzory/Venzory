import 'next-auth';
import 'next-auth/jwt';

import type { PracticeRole, MembershipStatus } from '@prisma/client';

export type SessionLocation = {
  id: string;
  name: string;
};

export type SessionPractice = {
  id: string;
  practiceId: string;
  role: PracticeRole;
  status: MembershipStatus;
  practice: {
    id: string;
    name: string;
    slug: string;
    onboardingCompletedAt: Date | null;
    onboardingSkippedAt: Date | null;
  };
  // Location access for this membership
  allowedLocationIds: string[];
  // All locations in the practice (for context)
  locations: SessionLocation[];
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      activePracticeId: string | null;
      activeLocationId: string | null;
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
    activeLocationId?: string | null;
    memberships?: SessionPractice[];
  }
}
