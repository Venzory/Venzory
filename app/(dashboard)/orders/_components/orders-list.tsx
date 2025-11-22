'use client';

import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { calculateOrderTotal } from '@/lib/prisma-transforms';
import { getOrderSupplierDisplay } from '../../dashboard/_utils/order-display';
import { OrderStatusBadge } from '../../dashboard/_utils/order-status-badge';

interface OrdersListProps {
  orders: any[];
  canManage: boolean;
  currentSort: string;
  currentSortOrder: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export function OrdersList({
  orders,
  canManage,
  currentSort,
  currentSortOrder,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
}: OrdersListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    
    if (currentSort === column) {
       params.set('sortOrder', direction);
    } else {
      params.set('sortBy', column);
      params.set('sortOrder', 'asc'); // Default to asc on new column sort
    }
    
    // Reset to page 1 when sorting changes
    params.delete('page');
    
    router.push(`/orders?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/orders?${params.toString()}`);
  };

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No orders yet"
        description={
          canManage
            ? 'Start tracking your inventory by creating your first purchase order. You can order from any linked supplier.'
            : 'Orders will appear here once created by staff members.'
        }
        action={
          canManage ? (
            <Link href="/orders/new">
              <Button variant="primary">Create Your First Order</Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  const columns = [
    {
      accessorKey: 'createdAt',
      header: 'Date',
      enableSorting: true,
      cell: (order: any) => (
        <div className="flex flex-col">
          <span>{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</span>
          <span className="text-xs text-slate-500">
            {new Date(order.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'supplier', // Sorting by relation might need complex handling server side, but let's assume we can sort by this key if mapped correctly
      header: 'Supplier',
      cell: (order: any) => {
        const { name: supplierName, linkId: supplierLinkId } = getOrderSupplierDisplay(order);
        return supplierLinkId ? (
          <Link
            href={`/suppliers#${supplierLinkId}`}
            className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            {supplierName}
          </Link>
        ) : (
          <span className="text-slate-600 dark:text-slate-400">{supplierName}</span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (order: any) => <OrderStatusBadge status={order.status} />,
    },
    {
      accessorKey: 'items',
      header: 'Items',
      className: 'text-right',
      cell: (order: any) => {
        const itemCount = order.items?.length ?? 0;
        return (
          <span className="text-slate-700 dark:text-slate-300">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        );
      },
    },
    {
      accessorKey: 'total',
      header: 'Total',
      className: 'text-right',
      cell: (order: any) => {
        const total = calculateOrderTotal(order.items || []);
        return (
          <span className="font-medium text-slate-900 dark:text-slate-200">
            {total > 0 ? `€${total.toFixed(2)}` : '-'}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdBy',
      header: 'Created By',
      cell: (order: any) => (
        <span className="text-slate-600 text-xs dark:text-slate-400">
          {order.createdBy?.name || order.createdBy?.email || 'Unknown'}
        </span>
      ),
    },
    {
      accessorKey: 'actions',
      header: '',
      className: 'text-right',
      cell: (order: any) => (
        <Link
          href={`/orders/${order.id}`}
          className="text-sm font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          View →
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <div>
                <span>
                    {totalItems} {totalItems === 1 ? 'order' : 'orders'}
                </span>
                {totalItems > itemsPerPage && (
                    <span className="ml-2">
                    (Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)})
                    </span>
                )}
            </div>
        </div>

        <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
                <DataTable 
                    columns={columns} 
                    data={orders} 
                    className="border-0" 
                    onSort={handleSort}
                    sortColumn={currentSort}
                    sortOrder={currentSortOrder as 'asc' | 'desc'}
                />
            </div>
        </Card>

        <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
        />
    </div>
  );
}

