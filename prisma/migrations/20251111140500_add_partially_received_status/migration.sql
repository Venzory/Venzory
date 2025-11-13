-- Add PARTIALLY_RECEIVED to OrderStatus enum
-- This must be in a separate migration and committed before use

ALTER TYPE "OrderStatus" ADD VALUE 'PARTIALLY_RECEIVED';

