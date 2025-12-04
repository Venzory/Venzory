/**
 * Order Email HTML Template
 * 
 * Sent to suppliers when a practice places an order.
 * Uses consistent Venzory branding with preheader support.
 */

export interface OrderEmailData {
  practiceName: string;
  practiceAddress?: string | null;
  supplierName: string;
  orderReference: string | null;
  orderNotes: string | null;
  items: Array<{
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  orderTotal: number;
}

export function renderOrderEmailHtml(data: OrderEmailData): string {
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
  
  // Preheader: appears in email client preview
  const preheaderText = `New order from ${practiceName}${orderReference ? ` (Ref: ${orderReference})` : ''} - ${items.length} item${items.length === 1 ? '' : 's'}, Total: €${orderTotal.toFixed(2)}`;

  const itemsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-weight: 500; color: #1e293b;">${item.name}</div>
          ${
            item.sku
              ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">SKU: ${item.sku}</div>`
              : ''
          }
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">${
          item.quantity
        }</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">€${item.unitPrice.toFixed(
          2
        )}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 500; color: #1e293b;">€${item.total.toFixed(
          2
        )}</td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>Purchase Order from ${practiceName}</title>
  </head>
  <body style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
    <!-- Preheader text (appears in email client preview) -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
      ${preheaderText}
    </div>
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
      &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    </div>
    
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;">
      <div style="background: linear-gradient(to right, #0ea5e9, #0284c7); padding: 32px 24px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Purchase Order</h1>
        <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0; font-size: 14px;">Reference: ${reference}</p>
      </div>
      
      <div style="padding: 32px 24px;">
        <p style="margin: 0 0 16px; font-size: 16px;">Dear ${supplierName},</p>
        
        <p style="margin: 0 0 24px; font-size: 16px;">
          <strong>${practiceName}</strong> has placed a new order with you.
        </p>

        ${
          practiceAddress
            ? `
          <div style="background-color: #f8fafc; border-left: 3px solid #0ea5e9; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">Practice Address:</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #64748b; white-space: pre-line;">${practiceAddress}</p>
          </div>
        `
            : ''
        }

        ${
          orderNotes
            ? `
          <div style="background-color: #fffbeb; border-left: 3px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">Order Notes:</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #92400e; white-space: pre-line;">${orderNotes}</p>
          </div>
        `
            : ''
        }
        
        <h2 style="font-size: 18px; font-weight: 600; color: #1e293b; margin: 32px 0 16px;">Order Items</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Quantity</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Unit Price</th>
              <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #f8fafc;">
              <td colspan="3" style="padding: 16px; text-align: right; font-weight: 600; color: #1e293b; font-size: 16px;">Order Total</td>
              <td style="padding: 16px; text-align: right; font-weight: 700; color: #0ea5e9; font-size: 18px;">€${orderTotal.toFixed(
                2
              )}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">
            If you have any questions about this order, please contact ${practiceName} directly.
          </p>
        </div>
      </div>
      
      <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} Venzory. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
  `.trim();
}
