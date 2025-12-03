import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * This route has been moved to /admin/suppliers/[id]
 * Redirecting for backwards compatibility with bookmarks and external links.
 */
export default async function SupplierDetailRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/suppliers/${id}`);
}
