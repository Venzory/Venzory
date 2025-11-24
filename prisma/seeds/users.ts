import { PrismaClient, PracticeRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { daysAgo } from './utils';

export async function seedUsers(prisma: PrismaClient) {
  console.log('👥 Creating users and practice...');

  // Create Practice
  const practice = await prisma.practice.create({
    data: {
      name: 'Demo Medical Practice',
      slug: 'demo-medical-practice',
      street: 'Dierenweg 12',
      city: 'Amsterdam',
      postalCode: '1015 XY',
      country: 'Netherlands',
      contactEmail: 'info@demovet.nl',
      contactPhone: '+31 20 555 9999',
      onboardingCompletedAt: daysAgo(30),
    },
  });

  console.log(`   - Practice created: ${practice.name}`);

  // Create Users
  const passwordHash = await hash('admin123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@admin.com',
      name: 'Admin User',
      passwordHash,
      emailVerified: new Date(),
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@admin.com',
      name: 'Staff User',
      passwordHash,
      emailVerified: new Date(),
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@admin.com',
      name: 'Viewer User',
      passwordHash,
      emailVerified: new Date(),
    },
  });

  // Create Practice Memberships
  await Promise.all([
    prisma.practiceUser.create({
      data: {
        practiceId: practice.id,
        userId: adminUser.id,
        role: PracticeRole.ADMIN,
        status: 'ACTIVE',
      },
    }),
    prisma.practiceUser.create({
      data: {
        practiceId: practice.id,
        userId: staffUser.id,
        role: PracticeRole.STAFF,
        status: 'ACTIVE',
      },
    }),
    prisma.practiceUser.create({
      data: {
        practiceId: practice.id,
        userId: viewerUser.id,
        role: PracticeRole.VIEWER,
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log(`   - Users created: Admin, Staff, Viewer`);

  return {
    practice,
    users: {
      admin: adminUser,
      staff: staffUser,
      viewer: viewerUser,
    },
  };
}

