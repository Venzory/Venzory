'use client';

import { useState } from 'react';
import { uploadCatalog, type UploadCatalogResult } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';

interface UploadResult extends UploadCatalogResult {
  // Extend to include all fields
}

export function UploadCatalogForm({ supplierId }: { supplierId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState<UploadResult | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsUploading(true);
    setLastResult(null);
    try {
      const result = await uploadCatalog(supplierId, formData);
      setLastResult(result);
      
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(
          `Imported ${result.successCount} items. Failed: ${result.failedCount}. Need review: ${result.reviewCount}. Enriched: ${result.enrichedCount}`
        );
      }
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import Catalog (CSV)</CardTitle>
          <CardDescription>
            Upload a CSV file to import products. GTINs will be matched and enriched with GS1 data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Input type="file" name="file" accept=".csv" required />
              <p className="text-sm text-muted-foreground">
                Expected columns: sku, gtin, name, brand, description, price, currency, min_qty, stock, lead_time
              </p>
            </div>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload CSV'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {lastResult && lastResult.success && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>Import ID: {lastResult.importId}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{lastResult.totalRows}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {lastResult.successCount}
                </div>
                <div className="text-sm text-green-600">Success</div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {lastResult.failedCount}
                </div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {lastResult.reviewCount}
                </div>
                <div className="text-sm text-amber-600">Review</div>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {lastResult.enrichedCount}
                </div>
                <div className="text-sm text-blue-600">Enriched</div>
              </div>
            </div>

            {/* Detailed Results */}
            {lastResult.items && lastResult.items.length > 0 && (
              <div className="mt-4 max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900">
                    <tr className="border-b">
                      <th className="p-2 text-left">Row</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">Method</th>
                      <th className="p-2 text-left">Confidence</th>
                      <th className="p-2 text-left">Review</th>
                      <th className="p-2 text-left">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastResult.items.slice(0, 50).map((item) => (
                      <tr 
                        key={item.rowIndex} 
                        className={`border-b ${item.needsReview ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                      >
                        <td className="p-2">{item.rowIndex + 1}</td>
                        <td className="p-2">
                          {item.success ? (
                            <Badge variant="default" className="bg-green-600">OK</Badge>
                          ) : (
                            <Badge variant="destructive">Fail</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          {item.matchMethod && (
                            <Badge variant="outline">{item.matchMethod}</Badge>
                          )}
                        </td>
                        <td className="p-2">
                          {item.matchConfidence !== null
                            ? `${Math.round(item.matchConfidence * 100)}%`
                            : '-'}
                        </td>
                        <td className="p-2">
                          {item.needsReview ? (
                            <Badge variant="outline" className="border-amber-500 text-amber-600">
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-green-600">✓</span>
                          )}
                        </td>
                        <td className="p-2 text-xs">
                          {item.errors.length > 0 && (
                            <span className="text-red-600">{item.errors.join(', ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {lastResult.items.length > 50 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Showing first 50 of {lastResult.items.length} items
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
