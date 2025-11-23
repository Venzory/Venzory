import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPracticeSupplierRepository, getSupplierItemRepository } from '@/src/repositories/suppliers';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UploadCatalogForm } from './_components/upload-form';
import { format } from 'date-fns';

export default async function SupplierDetailsPage({ params }: { params: Promise<{ id: string }> }) {
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
             <Link href="/owner/suppliers">
                <Button variant="ghost" size="sm">← Back</Button>
             </Link>
             <PageHeader title={supplier.name} subtitle="Supplier Details & Catalog" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-2 space-y-6">
                <div className="bg-white rounded-lg border p-4 shadow-sm">
                    <h3 className="font-medium mb-4">Catalog Items ({items.length})</h3>
                     <DataTable columns={columns} data={items} />
                </div>
             </div>
             
             <div className="space-y-6">
                 <div className="bg-white rounded-lg border p-4 shadow-sm space-y-4">
                     <h3 className="font-medium">Details</h3>
                     <div className="text-sm space-y-2">
                         <p><span className="font-medium text-muted-foreground">Email:</span> {supplier.email || '-'}</p>
                         <p><span className="font-medium text-muted-foreground">Phone:</span> {supplier.phone || '-'}</p>
                         <p><span className="font-medium text-muted-foreground">Website:</span> {supplier.website || '-'}</p>
                     </div>
                 </div>
                 
                 <UploadCatalogForm supplierId={id} />
             </div>
        </div>
    </div>
  );
}

