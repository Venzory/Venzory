import { redirect } from 'next/navigation';

/**
 * This route has been moved to /admin/product-master
 * Redirecting for backwards compatibility with bookmarks and external links.
 */
export default function ProductMasterRedirect() {
  redirect('/admin/product-master');
}
