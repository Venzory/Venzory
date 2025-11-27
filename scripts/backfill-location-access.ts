/**
 * Backfill Location Access Script
 * 
 * This script grants all existing users access to all locations in their practice.
 * Run this once after the migration to ensure existing users maintain their access.
 * 
 * Usage: npx tsx scripts/backfill-location-access.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillLocationAccess() {
  console.log('Starting location access backfill...\n');

  try {
    // Get all practices with their users and locations
    const practices = await prisma.practice.findMany({
      include: {
        users: {
          select: {
            id: true,
            userId: true,
            role: true,
            user: {
              select: { email: true, name: true },
            },
          },
        },
        locations: {
          select: { id: true, name: true },
        },
      },
    });

    console.log(`Found ${practices.length} practices to process.\n`);

    let totalAssignments = 0;
    let totalSkipped = 0;

    for (const practice of practices) {
      console.log(`\nProcessing: ${practice.name} (${practice.slug})`);
      console.log(`  Locations: ${practice.locations.length}`);
      console.log(`  Users: ${practice.users.length}`);

      if (practice.locations.length === 0) {
        console.log('  -> No locations, skipping');
        continue;
      }

      for (const membership of practice.users) {
        // Check existing location access
        const existingAccess = await prisma.practiceUserLocation.findMany({
          where: { practiceUserId: membership.id },
        });

        if (existingAccess.length > 0) {
          console.log(`  -> User ${membership.user.email} already has ${existingAccess.length} location(s), skipping`);
          totalSkipped++;
          continue;
        }

        // Grant access to all locations for this user
        const assignments = practice.locations.map((location) => ({
          practiceUserId: membership.id,
          locationId: location.id,
        }));

        await prisma.practiceUserLocation.createMany({
          data: assignments,
          skipDuplicates: true,
        });

        console.log(`  -> Granted ${membership.user.email} (${membership.role}) access to ${assignments.length} location(s)`);
        totalAssignments += assignments.length;
      }
    }

    console.log('\n========================================');
    console.log('Backfill complete!');
    console.log(`Total new assignments: ${totalAssignments}`);
    console.log(`Total skipped (already had access): ${totalSkipped}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillLocationAccess();

