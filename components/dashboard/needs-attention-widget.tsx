import Link from 'next/link';
import { AlertTriangle, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface NeedsAttentionWidgetProps {
  lowStockCount: number;
  overdueOrderCount: number;
  mismatchCount: number;
}

export function NeedsAttentionWidget({
  lowStockCount,
  overdueOrderCount,
  mismatchCount,
}: NeedsAttentionWidgetProps) {
  const totalIssues = lowStockCount + overdueOrderCount + mismatchCount;

  if (totalIssues === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-muted-foreground">Operational status healthy</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
        <AlertTriangle className="h-4 w-4 text-orange-600" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalIssues}</div>
        <div className="mt-4 space-y-2">
          {lowStockCount > 0 && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-orange-600">
                <AlertTriangle className="h-3 w-3" />
                <span>Low Stock Items</span>
              </div>
              <span className="font-medium">{lowStockCount}</span>
            </div>
          )}
          {overdueOrderCount > 0 && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-red-600">
                <Clock className="h-3 w-3" />
                <span>Overdue Orders</span>
              </div>
              <span className="font-medium">{overdueOrderCount}</span>
            </div>
          )}
          {mismatchCount > 0 && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-yellow-600">
                <AlertCircle className="h-3 w-3" />
                <span>Receiving Mismatches</span>
              </div>
              <span className="font-medium">{mismatchCount}</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Button variant="ghost" size="sm" className="w-full justify-start p-0 text-xs">
            <Link href="/needs-attention">View Details &rarr;</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

