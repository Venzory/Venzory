import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Image as ImageIcon, 
  FileText, 
  Shield, 
  Package,
  ClipboardList
} from 'lucide-react';

interface QualityKPIsProps {
  stats: {
    totalProducts: number;
    gs1VerifiedCount: number;
    lowQualityCount: number;
    missingMediaCount: number;
    missingDocumentsCount: number;
    missingRegulatoryCount: number;
    missingPackagingCount: number;
    needsReviewCount: number;
  };
}

export function QualityKPIs({ stats }: QualityKPIsProps) {
  const verificationRate = stats.totalProducts > 0 
    ? Math.round((stats.gs1VerifiedCount / stats.totalProducts) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              GS1 Verified
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.gs1VerifiedCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {verificationRate}% of {stats.totalProducts.toLocaleString()} products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Quality Score
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.lowQualityCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Products with score &lt; 50
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Needs Review
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
              {stats.needsReviewCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Supplier items pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalProducts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              In product master
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Missing Data KPIs */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Missing Data Elements
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Missing Media
              </CardTitle>
              <ImageIcon className="h-4 w-4 text-red-500" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.missingMediaCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                No product images
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Missing Documents
              </CardTitle>
              <FileText className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.missingDocumentsCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                No IFU/SDS documents
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 dark:border-orange-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Missing Regulatory
              </CardTitle>
              <Shield className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.missingRegulatoryCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Regulated devices only
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Missing Packaging
              </CardTitle>
              <Package className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.missingPackagingCount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                No packaging hierarchy
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

