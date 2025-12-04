import Link from 'next/link';
import { auth } from '@/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { getPracticeSupplierRepository } from '@/src/repositories/suppliers';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { format } from 'date-fns';
import { Building2 } from 'lucide-react';

export default async function AdminSuppliersPage() {
  const session = await auth();
  
  if (!isPlatformOwner(session?.user?.email)) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only the platform owner can access global suppliers.
        </p>
      </div>
    );
  }
  
  const repository = getPracticeSupplierRepository();
  const suppliers = await repository.findGlobalSuppliers();

  const columns = [
    { 
      accessorKey: 'name', 
      header: 'Supplier Name', 
      cell: (row: any) => (
        <Link href={`/admin/suppliers/${row.id}`} className="font-medium hover:underline text-admin">
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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-admin-light dark:bg-admin/20">
            <Building2 className="h-5 w-5 text-admin dark:text-admin" />
          </div>
          <PageHeader title="Global Suppliers" subtitle="Manage platform-wide suppliers and their catalogs (Data Steward)" />
        </div>
      </div>
        
      <div className="space-y-4">
        <DataTable columns={columns} data={suppliers} />
      </div>
    </div>
  );
}

