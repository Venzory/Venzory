'use client';

import { useState } from 'react';
import { uploadCatalog } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';

export function UploadCatalogForm({ supplierId }: { supplierId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  
  async function handleSubmit(formData: FormData) {
    setIsUploading(true);
    try {
      const result = await uploadCatalog(supplierId, formData);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(`Imported ${result.successCount} items. Failed: ${result.errorCount}`);
        if (result.errors && result.errors.length > 0) {
            console.error('Import errors:', result.errors);
            toast.info('Check console for detailed errors');
        }
      }
    } catch (e) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Catalog (CSV)</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Input type="file" name="file" accept=".csv" required />
            <p className="text-sm text-muted-foreground">
                Required columns: gtin, sku, price. Optional: currency.
            </p>
          </div>
          <Button type="submit" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload CSV'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

