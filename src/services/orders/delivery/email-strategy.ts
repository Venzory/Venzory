import { OrderDeliveryStrategy } from './types';
import type { RequestContext } from '@/src/lib/context/request-context';
import type { OrderWithRelations } from '@/src/domain/models';
import { sendOrderEmail } from '@/src/lib/email/sendOrderEmail';
import { calculateOrderTotal, decimalToNumber } from '@/lib/prisma-transforms';
import logger from '@/lib/logger';

export class EmailOrderDeliveryStrategy implements OrderDeliveryStrategy {
  async send(ctx: RequestContext, order: OrderWithRelations): Promise<boolean> {
    try {
      const supplierEmail = order.practiceSupplier?.globalSupplier?.email;

      if (supplierEmail) {
        const supplierName =
          order.practiceSupplier?.customLabel ||
          order.practiceSupplier?.globalSupplier?.name ||
          'Unknown supplier';

        // Extract practice information
        const practice = order.practice;
        const practiceName = practice?.name || 'Unknown Practice';

        // Build practice address
        let practiceAddress: string | null = null;
        if (practice) {
          const addressParts: string[] = [];
          if (practice.street) addressParts.push(practice.street);
          if (practice.city) addressParts.push(practice.city);
          if (practice.postalCode) addressParts.push(practice.postalCode);
          if (practice.country) addressParts.push(practice.country);

          if (addressParts.length > 0) {
            practiceAddress = addressParts.join('\n');
          }
        }

        // Map items
        const items = (order.items ?? []).map((orderItem) => {
          const unitPrice = typeof orderItem.unitPrice === 'number'
            ? orderItem.unitPrice
            : (decimalToNumber(orderItem.unitPrice) || 0);

          return {
            name: orderItem.item?.name || 'Unknown Item',
            sku: orderItem.item?.sku || null,
            quantity: orderItem.quantity,
            unitPrice,
            total: unitPrice * orderItem.quantity,
          };
        });

        const result = await sendOrderEmail({
          supplierEmail,
          supplierName,
          practiceName,
          practiceAddress,
          orderReference: order.reference,
          orderNotes: order.notes,
          items,
          orderTotal: calculateOrderTotal(order.items || []),
        });

        if (!result.success) {
            logger.error({
                action: 'EmailOrderDeliveryStrategy.send',
                orderId: order.id,
                error: result.error,
            }, 'Failed to send order email via sendOrderEmail');
            return false;
        }

        return true;
      } else {
        logger.warn({
          action: 'EmailOrderDeliveryStrategy.send',
          orderId: order.id,
          supplierId: order.practiceSupplierId,
        }, 'Cannot send order email - supplier has no email address');
        return false;
      }
    } catch (emailError) {
      logger.error({
        action: 'EmailOrderDeliveryStrategy.send',
        orderId: order.id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      }, 'Failed to send order email');
      return false;
    }
  }
}
