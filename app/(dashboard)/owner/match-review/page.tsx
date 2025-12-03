import { redirect } from 'next/navigation';

/**
 * This route has been moved to /admin/match-review
 * Redirecting for backwards compatibility with bookmarks and external links.
 */
export default function MatchReviewRedirect() {
  redirect('/admin/match-review');
}
