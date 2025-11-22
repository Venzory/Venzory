import { auth } from '@/auth';
import { ownerService } from '@/src/services';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { ProductDataOverview } from './_components/product-data-overview';

export default async function OwnerPage() {
  const session = await auth();
  // The middleware already guards this, but service also checks.
  
  const [practices, overviewData] = await Promise.all([
    ownerService.listPractices(session?.user?.email),
    ownerService.getProductDataOverview(session?.user?.email)
  ]);

  const columns = [
    { 
      accessorKey: 'name', 
      header: 'Practice Name', 
      cell: (row: any) => (
        <Link href={`/owner/${row.id}`} className="font-medium hover:underline text-blue-600">
          {row.name}
        </Link>
      ) 
    },
    { accessorKey: 'slug', header: 'Slug' },
    { 
      accessorKey: 'createdAt', 
      header: 'Created', 
      cell: (row: any) => format(row.createdAt, 'PPP') 
    },
    { 
      accessorKey: 'status', 
      header: 'Status', 
      cell: (row: any) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      ) 
    },
    { accessorKey: 'userCount', header: 'Users' },
  ];

  return (
    <div className="space-y-6 p-6">
        <PageHeader title="Owner Console" subtitle="Platform overview and practice management" />
        
        <ProductDataOverview data={overviewData} />

        <div className="space-y-4">
           <h2 className="text-lg font-semibold tracking-tight">All Practices</h2>
           <DataTable columns={columns} data={practices} />
        </div>
    </div>
  );
}

