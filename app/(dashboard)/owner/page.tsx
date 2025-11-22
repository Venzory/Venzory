import { auth } from '@/auth';
import { ownerService } from '@/src/services';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function OwnerPage() {
  const session = await auth();
  // The middleware already guards this, but service also checks.
  const practices = await ownerService.listPractices(session?.user?.email);

  const columns = [
    { 
      key: 'name', 
      label: 'Practice Name', 
      render: (row: any) => (
        <Link href={`/owner/${row.id}`} className="font-medium hover:underline text-blue-600">
          {row.name}
        </Link>
      ) 
    },
    { key: 'slug', label: 'Slug' },
    { 
      key: 'createdAt', 
      label: 'Created', 
      render: (row: any) => format(row.createdAt, 'PPP') 
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (row: any) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      ) 
    },
    { key: 'userCount', label: 'Users' },
  ];

  return (
    <div className="space-y-6 p-6">
        <PageHeader title="Owner Console" subtitle="Platform overview and practice management" />
        <DataTable columns={columns} rows={practices} />
    </div>
  );
}

