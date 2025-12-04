import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ practiceId: string }>;
}

/**
 * This route has been moved to /owner/tenants/[id]
 * Redirecting for backwards compatibility with bookmarks and external links.
 */
export default async function PracticeDetailRedirect({ params }: Props) {
  const { practiceId } = await params;
  redirect(`/owner/tenants/${practiceId}`);
}
