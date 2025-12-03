import { redirect } from 'next/navigation';

/**
 * This route has been moved to /admin/import
 * Redirecting for backwards compatibility with bookmarks and external links.
 */
export default function ImportRedirect() {
  redirect('/admin/import');
}
