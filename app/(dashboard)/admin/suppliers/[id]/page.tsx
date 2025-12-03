import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPracticeSupplierRepository, getSupplierItemRepository } from '@/src/repositories/suppliers';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UploadCatalogForm } from './_components/upload-form';
import { format } from 'date-fns';
import { isPlatformOwner } from '@/lib/owner-guard';
import { auth } from '@/auth';

export default async function AdminSupplierDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  
  if (!isPlatformOwner(session?.user?.email)) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only the platform owner can access supplier details.
        </p>
      </div>
    );
  }
  
  const { id } = await params;
  const supplierRepo = getPracticeSupplierRepository();
  const supplier = await supplierRepo.findGlobalSupplierById(id).catch(() => null);

  if (!supplier) {
    notFound();
  }

  const itemRepo = getSupplierItemRepository();
  const items = await itemRepo.findByGlobalSupplierId(id, {
      include: { product: true }
  });

  const columns = [
    { 
      accessorKey: 'product.name', 
      header: 'Product Name',
      cell: (row: any) => row.product?.name || 'Unknown'
    },
    { accessorKey: 'supplierSku', header: 'Supplier SKU' },
    { 
        accessorKey: 'product.gtin', 
        header: 'GTIN',
        cell: (row: any) => row.product?.gtin || '-'
    },
    { 
      accessorKey: 'unitPrice', 
      header: 'Price',
      cell: (row: any) => row.unitPrice ? `${row.unitPrice} ${row.currency || 'EUR'}` : '-'
    },
    { 
      accessorKey: 'isActive', 
      header: 'Status',
      cell: (row: any) => (
        <Badge variant={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ) 
    },
    {
      accessorKey: 'lastSyncAt',
      header: 'Last Sync',
      cell: (row: any) => row.lastSyncAt ? format(new Date(row.lastSyncAt), 'PP') : '-'
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/suppliers">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
        <PageHeader title={supplier.name} subtitle="Supplier Details & Catalog" />
      </div>
        
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-sm dark:shadow-none">
            <h3 className="font-medium mb-4 text-slate-900 dark:text-white">Catalog Items ({items.length})</h3>
            <DataTable columns={columns} data={items} />
          </div>
        </div>
             
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-sm dark:shadow-none space-y-4">
            <h3 className="font-medium text-slate-900 dark:text-white">Details</h3>
            <div className="text-sm space-y-2">
              <p><span className="font-medium text-slate-500 dark:text-slate-400">Email:</span> <span className="text-slate-900 dark:text-white">{supplier.email || '-'}</span></p>
              <p><span className="font-medium text-slate-500 dark:text-slate-400">Phone:</span> <span className="text-slate-900 dark:text-white">{supplier.phone || '-'}</span></p>
              <p><span className="font-medium text-slate-500 dark:text-slate-400">Website:</span> <span className="text-slate-900 dark:text-white">{supplier.website || '-'}</span></p>
            </div>
          </div>
                 
          <UploadCatalogForm supplierId={id} />
        </div>
      </div>
    </div>
  );
}

