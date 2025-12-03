import { auth } from '@/auth';
import { getSupplierContext } from '@/lib/supplier-guard';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/layout/PageHeader';
import { UploadForm } from './_components/upload-form';
import { UploadHistory } from './_components/upload-history';
import { FileText, Upload, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export default async function CatalogUploadPage() {
  const session = await auth();
  const supplierContext = await getSupplierContext(session?.user?.email);

  if (!supplierContext) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
      </div>
    );
  }

  // Fetch recent uploads
  const recentUploads = await prisma.supplierCatalogUpload.findMany({
    where: { globalSupplierId: supplierContext.supplierId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Calculate upload stats
  const uploadStats = {
    total: recentUploads.length,
    completed: recentUploads.filter(u => u.status === 'COMPLETED').length,
    failed: recentUploads.filter(u => u.status === 'FAILED').length,
    processing: recentUploads.filter(u => u.status === 'PROCESSING').length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
          <Upload className="h-6 w-6 text-white" />
        </div>
        <PageHeader
          title="Catalog Upload"
          subtitle="Import your product catalog via CSV file"
        />
      </div>

      {/* Upload Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Uploads</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{uploadStats.total}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Completed</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{uploadStats.completed}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Processing</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{uploadStats.processing}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Failed</div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{uploadStats.failed}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Upload New Catalog</h2>
        <UploadForm supplierId={supplierContext.supplierId} />
      </div>

      {/* CSV Format Guide */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-6 dark:border-teal-800/50 dark:bg-teal-900/20">
        <h3 className="mb-3 font-semibold text-teal-900 dark:text-teal-200">CSV Format Requirements</h3>
        <div className="space-y-2 text-sm text-teal-800 dark:text-teal-300">
          <p>Your CSV file should include the following columns:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>sku</strong> - Your product SKU (required)</li>
            <li><strong>name</strong> - Product name (required)</li>
            <li><strong>gtin</strong> - GTIN/EAN/UPC barcode (optional, improves matching)</li>
            <li><strong>description</strong> - Product description (optional)</li>
            <li><strong>unit_price</strong> - Price per unit (optional)</li>
            <li><strong>currency</strong> - Currency code, e.g., EUR (optional, defaults to EUR)</li>
            <li><strong>min_order_qty</strong> - Minimum order quantity (optional)</li>
            <li><strong>stock_level</strong> - Current stock level (optional)</li>
            <li><strong>lead_time_days</strong> - Lead time in days (optional)</li>
          </ul>
        </div>
      </div>

      {/* Upload History */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Upload History</h2>
        <UploadHistory uploads={recentUploads} />
      </div>
    </div>
  );
}

