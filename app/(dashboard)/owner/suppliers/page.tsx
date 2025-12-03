import { redirect } from 'next/navigation';

/**
 * This route has been moved to /admin/suppliers
 * Redirecting for backwards compatibility with bookmarks and external links.
 */
export default function SuppliersRedirect() {
  redirect('/admin/suppliers');
}
