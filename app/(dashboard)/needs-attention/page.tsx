import { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Clock, AlertCircle } from 'lucide-react';
import { format, isBefore } from 'date-fns';

import { requireActivePractice } from '@/lib/auth';
import { buildRequestContextFromSession } from '@/src/lib/context/context-builder';
import { getInventoryService, getOrderService, getReceivingService } from '@/src/services';
import { calculateItemStockInfo } from '@/lib/inventory-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/data-table';

export const metadata: Metadata = {
  title: 'Needs Attention | Remcura',
  description: 'Operational items requiring attention',
};

export default async function NeedsAttentionPage() {
  const { session } = await requireActivePractice();
  const ctx = buildRequestContextFromSession(session);

  // Fetch data
  const [itemsResult, sentOrders, receivingMismatches] = await Promise.all([
    // Fetch enough items to cover likely low stock. Ideally filtered in DB but logic is complex.
    getInventoryService().findItems(ctx, {}, { page: 1, limit: 500 }),
    getOrderService().findOrders(ctx, { status: 'SENT' }, { page: 1, limit: 100 }),
    getReceivingService().getReceivingMismatches(ctx),
  ]);

  // 1. Low Stock Items
  const lowStockItems = itemsResult.items
    .map((item) => ({ item, stockInfo: calculateItemStockInfo(item) }))
    .filter(({ stockInfo }) => stockInfo.isLowStock);

  // 2. Overdue Orders (Expected before today)
  const today = new Date();
  // Reset time to start of day for fair comparison if expectedAt has time, 
  // but usually expectedAt is just a date or we treat strict comparison.
  // If expectedAt is just a date, isBefore(expected, today) means strictly before today.
  const overdueOrders = sentOrders.filter(
    (order) => order.expectedAt && isBefore(new Date(order.expectedAt), today)
  );

  const hasIssues =
    lowStockItems.length > 0 || overdueOrders.length > 0 || receivingMismatches.length > 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Needs Attention</h1>
        <p className="text-muted-foreground">
          Operational items that require your attention.
        </p>
      </div>

      {!hasIssues && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900/30">
              <span className="text-2xl">✓</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">All Good!</h3>
            <p className="text-muted-foreground">
              No operational issues found requiring attention.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Section */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader className="border-b border-orange-100 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900 dark:text-orange-100">
                Low Stock Items ({lowStockItems.length})
              </CardTitle>
            </div>
            <CardDescription>Items below their reorder point.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Reorder Point</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map(({ item, stockInfo }) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <span className="font-medium text-red-600">{stockInfo.totalStock}</span>
                      <span className="ml-1 text-muted-foreground">{item.unit}</span>
                    </TableCell>
                    <TableCell>{item.inventory?.[0]?.reorderPoint ?? '-'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Link href={`/inventory?search=${encodeURIComponent(item.name)}`}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Overdue Orders Section */}
      {overdueOrders.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="border-b border-red-100 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-900 dark:text-red-100">
                Overdue Orders ({overdueOrders.length})
              </CardTitle>
            </div>
            <CardDescription>Orders sent but not received by expected date.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.reference || '-'}</TableCell>
                    <TableCell>
                      {order.practiceSupplier?.customLabel ||
                        order.practiceSupplier?.globalSupplier?.name ||
                        'Unknown'}
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      {order.expectedAt ? format(new Date(order.expectedAt), 'PP') : 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Link href={`/orders/${order.id}`}>View Order</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Receiving Mismatches Section */}
      {receivingMismatches.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardHeader className="border-b border-yellow-100 bg-yellow-50/50 dark:border-yellow-900/50 dark:bg-yellow-950/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-yellow-900 dark:text-yellow-100">
                Receiving Mismatches ({receivingMismatches.length})
              </CardTitle>
            </div>
            <CardDescription>Orders with quantity discrepancies.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Ref</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mismatched Items</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivingMismatches.map((mismatch) => (
                  <TableRow key={mismatch.id}>
                    <TableCell className="font-medium">
                      {mismatch.reference || mismatch.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{mismatch.supplierName}</TableCell>
                    <TableCell>
                      <Badge variant="neutral">{mismatch.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        {mismatch.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="font-medium">{item.name}:</span>
                            <span className="text-muted-foreground">
                              Ordered {item.ordered} / Received {item.received}
                            </span>
                          </div>
                        ))}
                        {mismatch.items.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{mismatch.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Link href={`/orders/${mismatch.id}`}>Resolve</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
