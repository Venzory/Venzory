import { redirect } from 'next/navigation';

/**
 * This route has been moved to /admin/gs1-quality
 * Redirecting for backwards compatibility with bookmarks and external links.
 */
export default function Gs1QualityRedirect() {
  redirect('/admin/gs1-quality');
}
