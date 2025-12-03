/**
 * Product Components
 * 
 * Reusable product-related UI components for the clinic-side application.
 * 
 * Usage in other modules (Orders, Inventory, Receiving):
 * 
 * ```tsx
 * import { ProductDetailDrawer } from '@/components/product';
 * 
 * function MyComponent() {
 *   const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
 * 
 *   return (
 *     <>
 *       <button onClick={() => setSelectedProductId('product-123')}>
 *         View Product Details
 *       </button>
 * 
 *       <ProductDetailDrawer
 *         productId={selectedProductId}
 *         isOpen={!!selectedProductId}
 *         onClose={() => setSelectedProductId(null)}
 *         onAddToItems={(productId, offers) => {
 *           // Handle adding product to items
 *         }}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

export { ProductDetailDrawer } from './product-detail-drawer';
export type {
  ProductDetail,
  ProductMedia,
  ProductPackaging,
  SupplierOffer,
} from './product-detail-drawer';

