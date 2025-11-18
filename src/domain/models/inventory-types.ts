export interface UpsertSupplierItemInput {
  supplierSku?: string | null;
  unitPrice?: number | null;
  currency?: string | null;
  minOrderQty?: number | null;
  practiceSupplierId?: string;
}

