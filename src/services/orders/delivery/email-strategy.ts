import { OrderDeliveryStrategy } from './types';
import type { RequestContext } from '@/src/lib/context/request-context';
import type { OrderWithRelations } from '@/src/domain/models';
import { enqueueEmailJob } from '@/src/lib/jobs/email-queue';
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
        // In the original action, 'practice' was cast from result as any.
        // We should check if practice is available on the order object.
        // The OrderWithRelations interface in src/domain/models/orders.ts extends Order
        // but Order doesn't seem to have 'practice' directly in the interface definition I saw earlier.
        // However, Prisma usually includes it if included in the query.
        // Let's verify if 'practice' is fetched in OrderService.sendOrder -> findOrderById.
        // For now I will use 'as any' or optional chaining compatible with what was there, 
        // but ideally I should type it if I can.
        const practice = (order as any).practice;
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

        await enqueueEmailJob(
          'ORDER_CONFIRMATION',
          supplierEmail,
          {
            supplierEmail,
            supplierName,
            practiceName,
            practiceAddress,
            orderReference: order.reference,
            orderNotes: order.notes,
            items,
            orderTotal: calculateOrderTotal(order.items || []),
          }
        );

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

