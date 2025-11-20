import { PrismaClient, Practice, PracticeSupplier, Item } from '@prisma/client';
import { PRODUCT_DATA } from './data/products';
import { randomElement, randomInt, randomPrice } from './utils';

export async function seedCatalogs(prisma: PrismaClient, practice: Practice) {
  console.log('📚 Creating catalogs and products...');

  // 1. Create Global Suppliers
  const globalSuppliers = await Promise.all([
    prisma.globalSupplier.create({
      data: {
        name: 'Remka Medical',
        website: 'https://remka.nl',
        email: 'orders@remka.nl',
        phone: '+31 20 123 4567',
        notes: 'Main supplier - Hoofdweg 123, Amsterdam',
      },
    }),
    prisma.globalSupplier.create({
      data: {
        name: 'Medical Supplies NL',
        website: 'https://medicalsupplies.nl',
        email: 'info@medicalsupplies.nl',
        phone: '+31 30 987 6543',
        notes: 'Secondary supplier - Kerkstraat 45, Utrecht',
      },
    }),
    prisma.globalSupplier.create({
      data: {
        name: 'DemoLab Supplies',
        website: 'https://demolab.com',
        email: 'sales@demolab.com',
        phone: '+31 10 555 1234',
        notes: 'Lab supplies - Industrieweg 78, Rotterdam',
      },
    }),
  ]);

  // 2. Create Practice Suppliers
  const practiceSuppliers = await Promise.all([
    prisma.practiceSupplier.create({
      data: {
        practiceId: practice.id,
        globalSupplierId: globalSuppliers[0].id,
        customLabel: null,
        accountNumber: 'ACC-001-REMKA',
        orderingNotes: 'Standard delivery on Tuesdays and Thursdays',
        isPreferred: true,
        isBlocked: false,
      },
    }),
    prisma.practiceSupplier.create({
      data: {
        practiceId: practice.id,
        globalSupplierId: globalSuppliers[1].id,
        customLabel: 'MedSupply',
        accountNumber: 'ACC-002-MEDSUP',
        orderingNotes: 'Minimum order €100',
        isPreferred: false,
        isBlocked: false,
      },
    }),
    prisma.practiceSupplier.create({
      data: {
        practiceId: practice.id,
        globalSupplierId: globalSuppliers[2].id,
        customLabel: null,
        accountNumber: 'ACC-003-DEMO',
        orderingNotes: null,
        isPreferred: false,
        isBlocked: false,
      },
    }),
  ]);

  // 3. Create Canonical Products
  const products = await Promise.all(
    PRODUCT_DATA.map((p) =>
      prisma.product.create({
        data: {
          name: p.name,
          gtin: p.gtin,
          brand: 'VetSupply',
          description: `${p.category} - High-quality ${p.name.toLowerCase()} for veterinary use`,
          isGs1Product: true,
        },
      })
    )
  );

  // 4. Create Items (Practice-specific)
  const items = await Promise.all(
    products.map((product, index) => {
      const defaultPracticeSupplier = practiceSuppliers[index % practiceSuppliers.length];

      return prisma.item.create({
        data: {
          practiceId: practice.id,
          productId: product.id,
          name: product.name,
          sku: `SKU-${String(index + 1).padStart(4, '0')}`,
          unit: randomElement(['box', 'pack', 'roll', 'bottle', 'piece']),
          description: product.description,
          defaultPracticeSupplierId: defaultPracticeSupplier.id,
        },
      });
    })
  );

  // 5. Create Supplier Catalogs & Supplier Items
  const supplierItems: any[] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const item = items[i];

    // Each product available from 1-2 suppliers
    const numSuppliers = randomInt(1, 2);
    const availableSuppliers = [...practiceSuppliers]
      .sort(() => Math.random() - 0.5)
      .slice(0, numSuppliers);

    for (const ps of availableSuppliers) {
      // Catalog Entry
      await prisma.supplierCatalog.create({
        data: {
          productId: product.id,
          practiceSupplierId: ps.id,
          supplierSku: `SUP-${ps.id.slice(0, 4)}-${product.gtin?.slice(-6)}`,
          unitPrice: randomPrice(5, 150),
          currency: 'EUR',
          minOrderQty: randomInt(1, 5),
          integrationType: 'MANUAL',
        },
      });

      // Supplier Item (Practice Link)
      const si = await prisma.supplierItem.create({
        data: {
          itemId: item.id,
          practiceSupplierId: ps.id,
          supplierSku: `SI-${ps.id.slice(0, 4)}-${item.sku}`,
          unitPrice: randomPrice(5, 150),
          currency: 'EUR',
          minOrderQty: randomInt(1, 5),
        },
      });
      supplierItems.push(si);
    }
  }

  console.log(`   - Created ${globalSuppliers.length} global suppliers`);
  console.log(`   - Created ${items.length} items`);

  return {
    practiceSuppliers,
    items,
    supplierItems,
  };
}

