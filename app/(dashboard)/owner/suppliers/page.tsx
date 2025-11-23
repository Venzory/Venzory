import Link from 'next/link';
import { auth } from '@/auth';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default async function OwnerSuppliersPage() {
  const session = await auth();
  // Owner check is handled by layout/middleware, but good to be safe if we had strict checks here.
  
  const repository = getPracticeSupplierRepository();
  const suppliers = await repository.findGlobalSuppliers();

  const columns = [
    { 
      accessorKey: 'name', 
      header: 'Supplier Name', 
      cell: (row: any) => (
        <Link href={`/owner/suppliers/${row.id}`} className="font-medium hover:underline text-blue-600">
          {row.name}
        </Link>
      ) 
    },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone' },
    { 
      accessorKey: 'createdAt', 
      header: 'Created', 
      cell: (row: any) => format(new Date(row.createdAt), 'PPP') 
    },
    { 
      accessorKey: 'items', 
      header: 'Catalog Items',
      cell: (row: any) => row.supplierItems?.length || 0
    },
  ];

  return (
    <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
            <PageHeader title="Global Suppliers" subtitle="Manage platform-wide suppliers and their catalogs" />
            {/* Future: Add Create Supplier button */}
        </div>
        
        <div className="space-y-4">
           <DataTable columns={columns} data={suppliers} />
        </div>
    </div>
  );
}

