
import { OrderEmailData } from './html';

export function renderOrderEmailText(data: OrderEmailData): string {
  const {
    practiceName,
    practiceAddress,
    supplierName,
    orderReference,
    orderNotes,
    items,
    orderTotal,
  } = data;

  const reference = orderReference || 'No reference';

  const itemsText = items
    .map(
      (item) =>
        `  ${item.name}${item.sku ? ` (${item.sku})` : ''}\n    Qty: ${
          item.quantity
        }, Unit Price: €${item.unitPrice.toFixed(2)}, Total: €${item.total.toFixed(2)}`
    )
    .join('\n\n');

  return `
Purchase Order from ${practiceName}
Reference: ${reference}

Dear ${supplierName},

${practiceName} has placed a new order with you.

${
  practiceAddress
    ? `Practice Address:
${practiceAddress}

`
    : ''
}${
    orderNotes
      ? `Order Notes:
${orderNotes}

`
      : ''
  }Order Items:
${itemsText}

Order Total: €${orderTotal.toFixed(2)}

If you have any questions about this order, please contact ${practiceName} directly.

© ${new Date().getFullYear()} Venzory. All rights reserved.
  `.trim();
}

