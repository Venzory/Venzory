import { redirect } from 'next/navigation';

/**
 * This route has been moved to /admin/supplier-catalog
 * Redirecting for backwards compatibility with bookmarks and external links.
 */
export default async function GlobalSupplierCatalogRedirect() {
  redirect('/admin/supplier-catalog');
}
