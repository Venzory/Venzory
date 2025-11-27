import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/data-table';
import { Package, Truck, Database, Tags } from 'lucide-react';

interface ProductDataOverviewProps {
  data: {
    counts: {
      products: number;
      globalSuppliers: number;
      catalogEntries: number;
      items: number;
    };
    topPractices: Array<{
      id: string;
      name: string;
      slug: string;
      itemCount: number;
      supplierCount: number;
    }>;
  };
}

export function ProductDataOverview({ data }: ProductDataOverviewProps) {
  return (
    <div className="space-y-6 mb-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-4">Product Data Backbone</h2>
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.counts.products.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Canonical master records
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Global Suppliers
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.counts.globalSuppliers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Available network suppliers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Catalog Entries
              </CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.counts.catalogEntries.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Supplier product links
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Items
              </CardTitle>
              <Tags className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.counts.items.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Practice-specific SKUs
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Practices Table */}
      <div className="rounded-md border bg-card">
        <div className="p-4 border-b bg-muted/40">
          <h3 className="font-semibold text-sm">Top Practices by Data Volume</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Practice Name</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Suppliers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.topPractices.map((practice) => (
              <TableRow key={practice.id}>
                <TableCell className="font-medium">{practice.name}</TableCell>
                <TableCell className="text-right">{practice.itemCount.toLocaleString()}</TableCell>
                <TableCell className="text-right">{practice.supplierCount.toLocaleString()}</TableCell>
              </TableRow>
            ))}
            {data.topPractices.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                        No practices found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}











