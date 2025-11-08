# Partial Receiving Feature

## Overview

The receiving system now fully supports **partial receiving** - when an order is received in multiple shipments over time.

## How It Works

### Scenario: Order with 30 Gauze Pads

#### First Shipment (20 units arrive)
1. User clicks "Receive This Order" on the order
2. System shows: **Expected: 30 pack**
3. User enters quantity: **20**
4. Confirms the receipt
5. Inventory updated: +20 Gauze Pads

#### Second Shipment (10 remaining units arrive)
1. User clicks "Receive This Order" again on the **same order**
2. System now shows:
   - **Ordered: 30 pack**
   - **Already received: 20 pack** (in green)
   - **Remaining: 10 pack** (in amber/yellow)
3. Quantity field **pre-filled with 10** (not 30!)
4. User confirms
5. Inventory updated: +10 Gauze Pads (total now 30)

## Implementation Details

### Database Tracking

- Multiple `GoodsReceipt` records can link to the same `orderId`
- Each receipt has a status: `DRAFT`, `CONFIRMED`, or `CANCELLED`
- Only `CONFIRMED` receipts count towards "already received"

### Calculation Logic

```typescript
// For each order item:
alreadyReceived = sum of quantities from all CONFIRMED receipts for this order
remainingQuantity = orderedQuantity - alreadyReceived
```

### Key Features

1. **Accurate Tracking**: Shows what's been received in previous shipments
2. **Smart Defaults**: Pre-fills the remaining quantity, not the original order quantity
3. **Visual Feedback**: 
   - Green text for already received amounts
   - Amber/yellow text for remaining amounts
   - "Fully Received" badge when an item is complete
4. **Flexible**: User can still adjust quantities if needed (e.g., receiving more/less than remaining)

## User Experience

### Progress Indicators

The form shows clear progress:
- **Item 1 of 2** - which item you're currently receiving
- **Progress bars** - visual indication of completion
- **Skip button** - if an item didn't arrive in this shipment
- **Receive & Next** - move through items quickly

### Fully Received Items

When an item is fully received:
- Shows "Fully Received" badge
- Displays all quantity information
- "Skip" button to move to next item
- Can still be manually added if over-shipment occurs

## Edge Cases Handled

1. **Over-receiving**: User can receive more than ordered (e.g., supplier sends extra)
2. **Under-receiving**: Each partial shipment is tracked separately
3. **Multiple partial receipts**: Supports any number of partial shipments
4. **Draft receipts**: Don't count towards "already received" until confirmed
5. **Cancelled receipts**: Excluded from calculations

## Technical Implementation

### Files Modified

1. **`app/(dashboard)/receiving/[id]/page.tsx`**
   - Fetches order items
   - Queries previous CONFIRMED receipts for the same order
   - Calculates received/remaining quantities
   - Passes to ReceiptDetail component

2. **`app/(dashboard)/receiving/[id]/_components/receipt-detail.tsx`**
   - Updated TypeScript interfaces to include `alreadyReceived` and `remainingQuantity`
   - Passes extended data to ExpectedItemsForm

3. **`app/(dashboard)/receiving/[id]/_components/expected-items-form.tsx`**
   - Displays all tracking information
   - Uses `remainingQuantity` as default value
   - Shows "Fully Received" state
   - Handles partial receiving UX

## Future Enhancements

Potential improvements:
1. **Order status tracking**: Add "PARTIALLY_RECEIVED" status to orders
2. **Receipt history**: Link to previous receipts from the order page
3. **Fulfillment percentage**: Show "75% received" on orders list
4. **Expected delivery dates**: Track which items are expected in which shipment
5. **Backorder handling**: Flag items that won't be fulfilled

## Testing Scenarios

### Test Case 1: Full Order in Multiple Shipments
1. Create order for 100 units
2. Receive 40 units → Confirm
3. Receive 35 units → Confirm (should show 40 already received, 60 remaining, default to 60)
4. Receive 25 units → Confirm (should show 75 already received, 25 remaining, default to 25)

### Test Case 2: Over-Shipment
1. Create order for 50 units
2. Receive 50 units → Confirm
3. Receive 10 more units → Should show "Fully Received" but allow entry

### Test Case 3: Draft vs Confirmed
1. Create order for 30 units
2. Create draft receipt with 15 units (don't confirm)
3. Create another receipt → Should still show 30 remaining (draft doesn't count)
4. Confirm first receipt
5. Second receipt should now show 15 already received, 15 remaining

## Benefits

✅ **Accurate inventory**: Tracks exactly what's been received  
✅ **No confusion**: Clear separation between ordered, received, and remaining  
✅ **Efficient workflow**: Pre-fills correct quantities automatically  
✅ **Audit trail**: Each shipment creates a separate receipt record  
✅ **Flexible**: Supports any receiving scenario (partial, over, under, split)

