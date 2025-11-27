'use client';

import { useState, useRef } from 'react';
import { importSupplierCatalog, type ImportResult, type SupplierOption } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { toast } from '@/lib/toast';

interface ImportFormProps {
  suppliers: SupplierOption[];
  onImportComplete?: (result: ImportResult) => void;
}

export function ImportForm({ suppliers, onImportComplete }: ImportFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('globalSupplierId', selectedSupplierId);

      const result = await importSupplierCatalog(formData);
      
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(
          `Import complete: ${result.successCount} succeeded, ${result.failedCount} failed, ${result.reviewCount} need review`
        );
        
        // Reset form
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Notify parent
        onImportComplete?.(result);
      }
    } catch (e) {
      toast.error('Upload failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Supplier Catalog</CardTitle>
        <CardDescription>
          Upload a CSV file to import products into a supplier&apos;s catalog. 
          Products will be matched to existing items by GTIN or created as new.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Select
              id="supplier"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              required
            >
              <option value="">Select a supplier...</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">CSV File</Label>
            <Input
              ref={fileInputRef}
              id="file"
              type="file"
              accept=".csv"
              required
            />
            <p className="text-sm text-muted-foreground">
              Expected columns: sku, gtin, name, brand, description, price, currency, min_qty, stock, lead_time
            </p>
          </div>

          <Button type="submit" disabled={isUploading || !selectedSupplierId}>
            {isUploading ? 'Importing...' : 'Upload & Import'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

