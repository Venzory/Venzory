/**
 * Backfill Script: Final PracticeSupplier Migration
 * 
 * This script populates practiceSupplierId fields across all tables that still
 * reference legacy Supplier IDs, preparing for the final cleanup migration.
 * 
 * Tables affected:
 * - Item (defaultPracticeSupplierId)
 * - SupplierItem (practiceSupplierId)
 * - SupplierCatalog (practiceSupplierId)
 * - OrderTemplateItem (practiceSupplierId)
 * - GoodsReceipt (practiceSupplierId)
 * 
 * Usage:
 *   npm run backfill:practice-supplier-final          # Dry-run mode (preview only)
 *   npm run backfill:practice-supplier-final -- --apply  # Apply changes
 */

import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';

const prisma = new PrismaClient();

interface BackfillStats {
  items: { processed: number; updated: number; skipped: number; errors: number };
  supplierItems: { processed: number; updated: number; skipped: number; errors: number };
  supplierCatalogs: { processed: number; updated: number; skipped: number; errors: number };
  orderTemplateItems: { processed: number; updated: number; skipped: number; errors: number };
  goodsReceipts: { processed: number; updated: number; skipped: number; errors: number };
}

async function backfillItems(dryRun: boolean): Promise<BackfillStats['items']> {
  const stats = { processed: 0, updated: 0, skipped: 0, errors: 0 };

  logger.info('=== Backfilling Item.defaultPracticeSupplierId ===');

  // Find items with defaultSupplierId but no defaultPracticeSupplierId
  const items = await prisma.item.findMany({
    where: {
      defaultSupplierId: { not: null },
      defaultPracticeSupplierId: null,
    },
    include: {
      defaultSupplier: true,
    },
  });

  logger.info(`Found ${items.length} items to process`);

  for (const item of items) {
    stats.processed++;

    if (!item.defaultSupplierId) {
      stats.skipped++;
      continue;
    }

    try {
      // Find the PracticeSupplier that was migrated from this legacy Supplier
      const practiceSupplier = await prisma.practiceSupplier.findFirst({
        where: {
          practiceId: item.practiceId,
          migratedFromSupplierId: item.defaultSupplierId,
        },
        include: {
          globalSupplier: true,
        },
      });

      if (!practiceSupplier) {
        logger.warn({
          itemId: item.id,
          itemName: item.name,
          legacySupplierId: item.defaultSupplierId,
          legacySupplierName: item.defaultSupplier?.name,
        }, 'No PracticeSupplier found for item - skipping');
        stats.skipped++;
        continue;
      }

      if (!dryRun) {
        await prisma.item.update({
          where: { id: item.id },
          data: { defaultPracticeSupplierId: practiceSupplier.id },
        });
      }

      logger.info({
        itemId: item.id,
        itemName: item.name,
        legacySupplierId: item.defaultSupplierId,
        practiceSupplierId: practiceSupplier.id,
        supplierName: practiceSupplier.globalSupplier.name,
        dryRun,
      }, 'Item updated');

      stats.updated++;
    } catch (error) {
      logger.error({
        itemId: item.id,
        error: error instanceof Error ? error.message : String(error),
      }, 'Error processing item');
      stats.errors++;
    }
  }

  return stats;
}

async function backfillSupplierItems(dryRun: boolean): Promise<BackfillStats['supplierItems']> {
  const stats = { processed: 0, updated: 0, skipped: 0, errors: 0 };

  logger.info('=== Backfilling SupplierItem.practiceSupplierId ===');

  // Find supplier items with supplierId but no practiceSupplierId
  const supplierItems = await prisma.supplierItem.findMany({
    where: {
      practiceSupplierId: null,
    },
    include: {
      supplier: true,
      item: {
        select: {
          practiceId: true,
          name: true,
        },
      },
    },
  });

  logger.info(`Found ${supplierItems.length} supplier items to process`);

  for (const supplierItem of supplierItems) {
    stats.processed++;

    try {
      // Find the PracticeSupplier that was migrated from this legacy Supplier
      const practiceSupplier = await prisma.practiceSupplier.findFirst({
        where: {
          practiceId: supplierItem.item.practiceId,
          migratedFromSupplierId: supplierItem.supplierId,
        },
        include: {
          globalSupplier: true,
        },
      });

      if (!practiceSupplier) {
        logger.warn({
          supplierItemId: supplierItem.id,
          itemName: supplierItem.item.name,
          legacySupplierId: supplierItem.supplierId,
          legacySupplierName: supplierItem.supplier.name,
        }, 'No PracticeSupplier found for supplier item - skipping');
        stats.skipped++;
        continue;
      }

      if (!dryRun) {
        await prisma.supplierItem.update({
          where: { id: supplierItem.id },
          data: { practiceSupplierId: practiceSupplier.id },
        });
      }

      logger.info({
        supplierItemId: supplierItem.id,
        itemName: supplierItem.item.name,
        legacySupplierId: supplierItem.supplierId,
        practiceSupplierId: practiceSupplier.id,
        supplierName: practiceSupplier.globalSupplier.name,
        dryRun,
      }, 'SupplierItem updated');

      stats.updated++;
    } catch (error) {
      logger.error({
        supplierItemId: supplierItem.id,
        error: error instanceof Error ? error.message : String(error),
      }, 'Error processing supplier item');
      stats.errors++;
    }
  }

  return stats;
}

async function backfillSupplierCatalogs(dryRun: boolean): Promise<BackfillStats['supplierCatalogs']> {
  const stats = { processed: 0, updated: 0, skipped: 0, errors: 0 };

  logger.info('=== Backfilling SupplierCatalog.practiceSupplierId ===');

  // Find supplier catalogs with supplierId but no practiceSupplierId
  const supplierCatalogs = await prisma.supplierCatalog.findMany({
    where: {
      practiceSupplierId: null,
    },
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          practiceId: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  logger.info(`Found ${supplierCatalogs.length} supplier catalog entries to process`);

  for (const catalog of supplierCatalogs) {
    stats.processed++;

    try {
      // Find the PracticeSupplier that was migrated from this legacy Supplier
      const practiceSupplier = await prisma.practiceSupplier.findFirst({
        where: {
          practiceId: catalog.supplier.practiceId,
          migratedFromSupplierId: catalog.supplierId,
        },
        include: {
          globalSupplier: true,
        },
      });

      if (!practiceSupplier) {
        logger.warn({
          catalogId: catalog.id,
          productName: catalog.product.name,
          legacySupplierId: catalog.supplierId,
          legacySupplierName: catalog.supplier.name,
        }, 'No PracticeSupplier found for catalog entry - skipping');
        stats.skipped++;
        continue;
      }

      // Check for duplicates: (practiceSupplierId, productId) should be unique
      const existingCatalog = await prisma.supplierCatalog.findFirst({
        where: {
          practiceSupplierId: practiceSupplier.id,
          productId: catalog.productId,
          id: { not: catalog.id },
        },
      });

      if (existingCatalog) {
        logger.warn({
          catalogId: catalog.id,
          duplicateId: existingCatalog.id,
          productName: catalog.product.name,
          supplierName: practiceSupplier.globalSupplier.name,
        }, 'Duplicate catalog entry found - deactivating this one');

        if (!dryRun) {
          await prisma.supplierCatalog.update({
            where: { id: catalog.id },
            data: {
              practiceSupplierId: practiceSupplier.id,
              isActive: false,
            },
          });
        }

        stats.updated++;
        continue;
      }

      if (!dryRun) {
        await prisma.supplierCatalog.update({
          where: { id: catalog.id },
          data: { practiceSupplierId: practiceSupplier.id },
        });
      }

      logger.info({
        catalogId: catalog.id,
        productName: catalog.product.name,
        legacySupplierId: catalog.supplierId,
        practiceSupplierId: practiceSupplier.id,
        supplierName: practiceSupplier.globalSupplier.name,
        dryRun,
      }, 'SupplierCatalog updated');

      stats.updated++;
    } catch (error) {
      logger.error({
        catalogId: catalog.id,
        error: error instanceof Error ? error.message : String(error),
      }, 'Error processing supplier catalog');
      stats.errors++;
    }
  }

  return stats;
}

async function backfillOrderTemplateItems(dryRun: boolean): Promise<BackfillStats['orderTemplateItems']> {
  const stats = { processed: 0, updated: 0, skipped: 0, errors: 0 };

  logger.info('=== Backfilling OrderTemplateItem.practiceSupplierId ===');

  // Find template items with supplierId but no practiceSupplierId
  const templateItems = await prisma.orderTemplateItem.findMany({
    where: {
      OR: [
        { supplierId: { not: null }, practiceSupplierId: null },
        { supplierId: null, practiceSupplierId: null },
      ],
    },
    include: {
      template: {
        select: {
          practiceId: true,
          name: true,
        },
      },
      item: {
        select: {
          name: true,
          defaultPracticeSupplierId: true,
        },
      },
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  logger.info(`Found ${templateItems.length} order template items to process`);

  for (const templateItem of templateItems) {
    stats.processed++;

    try {
      let practiceSupplier = null;

      // First, try to map from supplierId if present
      if (templateItem.supplierId) {
        practiceSupplier = await prisma.practiceSupplier.findFirst({
          where: {
            practiceId: templateItem.template.practiceId,
            migratedFromSupplierId: templateItem.supplierId,
          },
          include: {
            globalSupplier: true,
          },
        });
      }

      // Fallback: use item's defaultPracticeSupplierId
      if (!practiceSupplier && templateItem.item.defaultPracticeSupplierId) {
        practiceSupplier = await prisma.practiceSupplier.findUnique({
          where: {
            id: templateItem.item.defaultPracticeSupplierId,
          },
          include: {
            globalSupplier: true,
          },
        });
      }

      if (!practiceSupplier) {
        logger.warn({
          templateItemId: templateItem.id,
          templateName: templateItem.template.name,
          itemName: templateItem.item.name,
          legacySupplierId: templateItem.supplierId,
          legacySupplierName: templateItem.supplier?.name,
        }, 'No PracticeSupplier found for template item - skipping');
        stats.skipped++;
        continue;
      }

      if (!dryRun) {
        await prisma.orderTemplateItem.update({
          where: { id: templateItem.id },
          data: { practiceSupplierId: practiceSupplier.id },
        });
      }

      logger.info({
        templateItemId: templateItem.id,
        templateName: templateItem.template.name,
        itemName: templateItem.item.name,
        legacySupplierId: templateItem.supplierId,
        practiceSupplierId: practiceSupplier.id,
        supplierName: practiceSupplier.globalSupplier.name,
        dryRun,
      }, 'OrderTemplateItem updated');

      stats.updated++;
    } catch (error) {
      logger.error({
        templateItemId: templateItem.id,
        error: error instanceof Error ? error.message : String(error),
      }, 'Error processing order template item');
      stats.errors++;
    }
  }

  return stats;
}

async function backfillGoodsReceipts(dryRun: boolean): Promise<BackfillStats['goodsReceipts']> {
  const stats = { processed: 0, updated: 0, skipped: 0, errors: 0 };

  logger.info('=== Backfilling GoodsReceipt.practiceSupplierId ===');

  // Find goods receipts with supplierId or orderId but no practiceSupplierId
  const goodsReceipts = await prisma.goodsReceipt.findMany({
    where: {
      practiceSupplierId: null,
    },
    include: {
      order: {
        select: {
          id: true,
          practiceSupplierId: true,
        },
      },
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  logger.info(`Found ${goodsReceipts.length} goods receipts to process`);

  for (const receipt of goodsReceipts) {
    stats.processed++;

    try {
      let practiceSupplier = null;

      // First, try to get from order if present
      if (receipt.orderId && receipt.order?.practiceSupplierId) {
        practiceSupplier = await prisma.practiceSupplier.findUnique({
          where: {
            id: receipt.order.practiceSupplierId,
          },
          include: {
            globalSupplier: true,
          },
        });
      }

      // Fallback: map from supplierId if present
      if (!practiceSupplier && receipt.supplierId) {
        practiceSupplier = await prisma.practiceSupplier.findFirst({
          where: {
            practiceId: receipt.practiceId,
            migratedFromSupplierId: receipt.supplierId,
          },
          include: {
            globalSupplier: true,
          },
        });
      }

      if (!practiceSupplier) {
        logger.warn({
          receiptId: receipt.id,
          orderId: receipt.orderId,
          legacySupplierId: receipt.supplierId,
          legacySupplierName: receipt.supplier?.name,
        }, 'No PracticeSupplier found for goods receipt - leaving as-is');
        stats.skipped++;
        continue;
      }

      if (!dryRun) {
        await prisma.goodsReceipt.update({
          where: { id: receipt.id },
          data: { practiceSupplierId: practiceSupplier.id },
        });
      }

      logger.info({
        receiptId: receipt.id,
        orderId: receipt.orderId,
        legacySupplierId: receipt.supplierId,
        practiceSupplierId: practiceSupplier.id,
        supplierName: practiceSupplier.globalSupplier.name,
        dryRun,
      }, 'GoodsReceipt updated');

      stats.updated++;
    } catch (error) {
      logger.error({
        receiptId: receipt.id,
        error: error instanceof Error ? error.message : String(error),
      }, 'Error processing goods receipt');
      stats.errors++;
    }
  }

  return stats;
}

async function validateBackfill(): Promise<void> {
  logger.info('=== Validation Checks ===');

  const checks = [
    {
      name: 'Items with defaultSupplierId but no defaultPracticeSupplierId',
      query: () => prisma.item.count({
        where: {
          defaultSupplierId: { not: null },
          defaultPracticeSupplierId: null,
        },
      }),
    },
    {
      name: 'SupplierItems with no practiceSupplierId',
      query: () => prisma.supplierItem.count({
        where: {
          practiceSupplierId: null,
        },
      }),
    },
    {
      name: 'SupplierCatalogs with no practiceSupplierId',
      query: () => prisma.supplierCatalog.count({
        where: {
          practiceSupplierId: null,
        },
      }),
    },
    {
      name: 'OrderTemplateItems with supplierId but no practiceSupplierId',
      query: () => prisma.orderTemplateItem.count({
        where: {
          supplierId: { not: null },
          practiceSupplierId: null,
        },
      }),
    },
    {
      name: 'GoodsReceipts with supplierId but no practiceSupplierId',
      query: () => prisma.goodsReceipt.count({
        where: {
          supplierId: { not: null },
          practiceSupplierId: null,
        },
      }),
    },
  ];

  for (const check of checks) {
    const count = await check.query();
    const status = count === 0 ? '✓' : '✗';
    logger.info(`${status} ${check.name}: ${count}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  if (dryRun) {
    logger.info('=== DRY RUN MODE ===');
    logger.info('No changes will be made. Use --apply to execute updates.');
  } else {
    logger.info('=== APPLY MODE ===');
    logger.info('Changes will be written to the database.');
  }

  const stats: BackfillStats = {
    items: { processed: 0, updated: 0, skipped: 0, errors: 0 },
    supplierItems: { processed: 0, updated: 0, skipped: 0, errors: 0 },
    supplierCatalogs: { processed: 0, updated: 0, skipped: 0, errors: 0 },
    orderTemplateItems: { processed: 0, updated: 0, skipped: 0, errors: 0 },
    goodsReceipts: { processed: 0, updated: 0, skipped: 0, errors: 0 },
  };

  try {
    stats.items = await backfillItems(dryRun);
    stats.supplierItems = await backfillSupplierItems(dryRun);
    stats.supplierCatalogs = await backfillSupplierCatalogs(dryRun);
    stats.orderTemplateItems = await backfillOrderTemplateItems(dryRun);
    stats.goodsReceipts = await backfillGoodsReceipts(dryRun);

    logger.info('=== Backfill Summary ===');
    logger.info('Items:', stats.items);
    logger.info('SupplierItems:', stats.supplierItems);
    logger.info('SupplierCatalogs:', stats.supplierCatalogs);
    logger.info('OrderTemplateItems:', stats.orderTemplateItems);
    logger.info('GoodsReceipts:', stats.goodsReceipts);

    if (!dryRun) {
      logger.info('Running validation checks...');
      await validateBackfill();
    }

    logger.info('Backfill completed successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
    }, 'Backfill failed');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

