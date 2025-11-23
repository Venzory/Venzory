'use client';

import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';

interface Practice {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  status: string;
  userCount: number;
}

interface PracticesTableProps {
  practices: Practice[];
}

export function PracticesTable({ practices }: PracticesTableProps) {
  const columns = [
    { 
      accessorKey: 'name', 
      header: 'Practice Name', 
      cell: (row: Practice) => (
        <Link href={`/owner/${row.id}`} className="font-medium hover:underline text-blue-600">
          {row.name}
        </Link>
      ) 
    },
    { accessorKey: 'slug', header: 'Slug' },
    { 
      accessorKey: 'createdAt', 
      header: 'Created', 
      cell: (row: Practice) => format(row.createdAt, 'PPP') 
    },
    { 
      accessorKey: 'status', 
      header: 'Status', 
      cell: (row: Practice) => (
        <Badge variant={row.status === 'Active' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      ) 
    },
    { accessorKey: 'userCount', header: 'Users' },
  ];

  return <DataTable columns={columns} data={practices} />;
}

