import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ productId: string }>;
}

/**
 * This route has been moved to /admin/product-master/[productId]
 * Redirecting for backwards compatibility with bookmarks and external links.
 */
export default async function ProductDetailRedirect({ params }: Props) {
  const { productId } = await params;
  redirect(`/admin/product-master/${productId}`);
}
