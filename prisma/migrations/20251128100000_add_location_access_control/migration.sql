-- Migration: Add Location Access Control
-- This migration adds:
-- 1. New roles to PracticeRole enum (OWNER, MANAGER)
-- 2. Removes VIEWER role (converts to STAFF)
-- 3. Creates PracticeUserLocation join table for location-level access control

-- Step 1: Add new enum values to PracticeRole
ALTER TYPE "PracticeRole" ADD VALUE IF NOT EXISTS 'OWNER';
ALTER TYPE "PracticeRole" ADD VALUE IF NOT EXISTS 'MANAGER';

-- Step 2: Convert existing VIEWER roles to STAFF before removing VIEWER
-- Note: PostgreSQL doesn't support removing enum values directly
-- We'll update all VIEWER records to STAFF
UPDATE "PracticeUser" SET "role" = 'STAFF' WHERE "role" = 'VIEWER';
UPDATE "UserInvite" SET "role" = 'STAFF' WHERE "role" = 'VIEWER';

-- Step 3: Create PracticeUserLocation table for location access control
CREATE TABLE "PracticeUserLocation" (
    "id" TEXT NOT NULL,
    "practiceUserId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeUserLocation_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create indexes for efficient lookups
CREATE UNIQUE INDEX "PracticeUserLocation_practiceUserId_locationId_key" ON "PracticeUserLocation"("practiceUserId", "locationId");
CREATE INDEX "PracticeUserLocation_practiceUserId_idx" ON "PracticeUserLocation"("practiceUserId");
CREATE INDEX "PracticeUserLocation_locationId_idx" ON "PracticeUserLocation"("locationId");

-- Step 5: Add foreign key constraints
ALTER TABLE "PracticeUserLocation" ADD CONSTRAINT "PracticeUserLocation_practiceUserId_fkey" FOREIGN KEY ("practiceUserId") REFERENCES "PracticeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeUserLocation" ADD CONSTRAINT "PracticeUserLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

