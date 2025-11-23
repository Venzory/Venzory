'use server';

import { isPlatformOwner } from '@/lib/owner-guard';
import { getProductMatcherService } from '@/src/services/products';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export async function uploadCatalog(supplierId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.email || !isPlatformOwner(session.user.email)) {
    throw new Error('Unauthorized');
  }

  const file = formData.get('file') as File;
  if (!file) {
    throw new Error('No file uploaded');
  }

  const text = await file.text();
  const rows = text.split(/\r?\n/);
  
  // Simple CSV parser (assumes no commas in values for now)
  // Header row expected
  if (rows.length < 2) {
      return { error: 'CSV file is empty or missing headers' };
  }

  const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  
  const gtinIndex = headers.indexOf('gtin');
  const skuIndex = headers.indexOf('sku');
  const priceIndex = headers.indexOf('price');
  const currencyIndex = headers.indexOf('currency'); 

  if (gtinIndex === -1 || skuIndex === -1 || priceIndex === -1) {
    return { error: 'Missing required columns: gtin, sku, price' };
  }

  const service = getProductMatcherService();
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const line = rows[i].trim();
    if (!line) continue;
    
    try {
        // Basic split handling
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        
        const gtin = cols[gtinIndex];
        const sku = cols[skuIndex];
        const price = parseFloat(cols[priceIndex]);
        const currency = currencyIndex !== -1 ? cols[currencyIndex] : 'EUR';

        if (!gtin || !sku || isNaN(price)) {
            errorCount++;
            // Don't log every skipped line if it's just empty, but we check for empty line above
            errors.push(`Line ${i + 1}: Invalid data (missing gtin/sku or invalid price)`);
            continue;
        }

        await service.ensureSupplierItemFromRow(supplierId, {
            gtin,
            sku,
            price,
            currency: currency || 'EUR'
        });
        successCount++;
    } catch (err) {
        console.error(`Error processing line ${i + 1}:`, err);
        errorCount++;
        errors.push(`Line ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  revalidatePath(`/owner/suppliers/${supplierId}`);
  return { success: true, successCount, errorCount, errors: errors.slice(0, 10) };
}

