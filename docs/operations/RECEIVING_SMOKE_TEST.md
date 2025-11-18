# Receiving Module - Manual Smoke Test Checklist

**Purpose:** Verify the receiving happy path works end-to-end from creating a receipt to confirming it and seeing inventory updates.

**Prerequisites:**
- User logged in with STAFF or ADMIN role
- At least one Location exists in the system
- At least one Supplier exists (optional but recommended)
- At least one Item exists in inventory with a Product that has a GTIN

---

## Test Flow: Create Receipt → Add Lines → Confirm → Verify Inventory

### Step 1: Navigate to Receiving Hub
**Action:** Click "Receiving" in the sidebar navigation (PackageCheck icon)

**Expected Result:**
- Page loads at `/receiving`
- Header shows "Receiving" title
- Stats cards display: Draft Receipts, Confirmed (30d), Total Items
- "New Receipt" button visible in top-right
- Recent receipts list shown (empty if none exist)

---

### Step 2: Create New Receipt
**Action:** Click "New Receipt" button

**Expected Result:**
- Page loads at `/receiving/new`
- Form displays with fields:
  - Receiving Location (dropdown, required)
  - Supplier (dropdown, optional)
  - Notes (textarea, optional)
- "Start Receiving" button enabled if location selected

**Action:** 
1. Select a location from dropdown
2. Optionally select a supplier
3. Optionally add notes
4. Click "Start Receiving"

**Expected Result:**
- Redirects to `/receiving/{receiptId}` (new receipt detail page)
- Receipt status badge shows "DRAFT" (amber/yellow)
- Receipt ID displayed (e.g., "Receipt #abc12345")
- Info cards show selected location and supplier (if chosen)
- "Receipt Lines" section shows "No items added yet" message
- Action buttons visible: "Scan Barcode" and "Add Item Manually"

---

### Step 3: Add Item via Manual Entry
**Action:** Click "Add Item Manually" button

**Expected Result:**
- Form appears inline with fields:
  - Item (dropdown, required)
  - Quantity (number input, required, default 1)
  - Batch / Lot Number (text input, optional)
  - Expiry Date (date picker, optional)
  - Notes (textarea, optional)
- "Add Item" and "Cancel" buttons visible

**Action:**
1. Select an item from dropdown
2. Enter quantity (e.g., 10)
3. Optionally enter batch number (e.g., "LOT12345")
4. Optionally select expiry date
5. Click "Add Item"

**Expected Result:**
- Form closes
- Success message appears briefly
- Page refreshes
- New line appears in "Receipt Lines" section showing:
  - Item name and SKU
  - Quantity and unit
  - Batch number (if entered)
  - Expiry date (if entered)
  - Remove button (trash icon) on right
- Summary card updates to show "1 items, X units"

---

### Step 4: Add Item via Barcode Scan (Optional)
**Action:** Click "Scan Barcode" button

**Expected Result:**
- Full-screen scanner modal opens
- Camera permission requested (if first time)
- Scanner viewfinder visible
- "Close" button (X) in top-right
- "Enter Code Manually" button at bottom

**Action:** 
- Point camera at barcode with GTIN matching an item's product
- OR click "Enter Code Manually" and type GTIN

**Expected Result:**
- Scanner closes
- "Add Item Manually" form opens with item pre-selected
- Continue with quantity/batch/expiry entry as in Step 3

---

### Step 5: Verify Lines Can Be Removed
**Action:** Click trash icon on any receipt line

**Expected Result:**
- Confirmation dialog appears: "Remove this line from the receipt?"
- "Remove" and "Cancel" buttons shown

**Action:** Click "Remove"

**Expected Result:**
- Line disappears from list
- Success message: "Line removed"
- Summary card updates item/unit count

---

### Step 6: Add Multiple Lines
**Action:** Repeat Step 3 or Step 4 to add 2-3 more items

**Expected Result:**
- Each item appears as separate line in receipt
- Summary shows correct total count
- All lines display with proper formatting

---

### Step 7: Confirm Receipt
**Action:** Click "Confirm Receipt" button (green, top-right)

**Expected Result:**
- Confirmation dialog appears: "Confirm this receipt? This will update inventory and cannot be undone."
- "Confirm" and "Cancel" buttons shown

**Action:** Click "Confirm"

**Expected Result:**
- Success message: "Receipt confirmed and inventory updated"
- **REDIRECT OCCURS** to `/receiving` (receiving hub page)
- Newly confirmed receipt appears in recent receipts list
- Receipt status shows "CONFIRMED" (green badge)
- Stats card "Confirmed (30d)" count incremented by 1

---

### Step 8: Verify Receipt Details
**Action:** Click on the confirmed receipt in the list

**Expected Result:**
- Receipt detail page loads
- Status badge shows "CONFIRMED" (green)
- "Received" timestamp displayed
- All lines still visible
- NO action buttons (Confirm/Cancel) shown (receipt is locked)
- Remove buttons NOT visible on lines

---

### Step 9: Verify Inventory Updated
**Action:** Navigate to Inventory page (sidebar)

**Expected Result:**
- Inventory page loads at `/inventory`
- Items that were received show updated stock quantities
- Total stock increased by received quantities

**Action:** Click on one of the received items

**Expected Result:**
- Item detail page shows location inventory
- Location where receipt was received shows increased quantity
- Recent adjustments section shows new entry:
  - Reason: "Goods Receipt"
  - Note includes receipt ID and batch number (if applicable)
  - Quantity matches received amount
  - Timestamp matches receipt confirmation time

---

## Alternative Flow: Cancel Draft Receipt

### From Receipt Detail Page (Draft Status)
**Action:** Click "Cancel Receipt" button

**Expected Result:**
- Confirmation dialog: "Cancel this receipt? This action cannot be undone."
- "Cancel Receipt" and "Cancel" buttons shown

**Action:** Click "Cancel Receipt"

**Expected Result:**
- Success message: "Receipt cancelled"
- Page refreshes
- Status badge changes to "CANCELLED" (gray)
- Action buttons (Confirm/Cancel) disappear
- Receipt is locked (no edits allowed)

---

## Alternative Flow: Receiving from Order

### Step 1: Start from Order Page
**Action:** Navigate to an order with status "SENT"

**Expected Result:**
- Order detail page shows "Receive This Order" button

**Action:** Click "Receive This Order"

**Expected Result:**
- Redirects to `/receiving/new?orderId={orderId}`
- Form pre-fills:
  - Order reference in notes
  - Supplier locked to order's supplier
  - Blue banner shows "Linked to Order #XXX" with expected items count

### Step 2: Receive Order Items
**Action:** Select location and click "Start Receiving"

**Expected Result:**
- Receipt detail page loads
- "Receive Order Items" section appears above manual entry
- Expected items list shows:
  - Each order item with ordered quantity
  - Remaining quantity to receive
  - Quick entry form for batch/expiry per item
- Progress indicator shows "Item X of Y"

**Action:** For each expected item:
1. Enter batch number (optional)
2. Enter expiry date (optional)
3. Click "Receive & Next" (or "Receive Last Item" for final item)

**Expected Result:**
- Item added to receipt lines
- Form advances to next expected item
- Progress bar updates
- After last item: "All Order Items Received" success banner appears

**Action:** Click "Confirm Receipt"

**Expected Result:**
- Receipt confirmed
- **REDIRECT OCCURS** to `/orders/{orderId}` (order detail page, not receiving hub)
- Order status updated to "RECEIVED" or "PARTIALLY_RECEIVED"
- Order page shows confirmed receipt in receipts section

---

## Success Criteria

✅ **Create Receipt:** Draft receipt created with selected location/supplier  
✅ **Add Lines:** Items added manually and/or via barcode scan  
✅ **Edit Lines:** Lines can be removed before confirmation  
✅ **Confirm Receipt:** Confirmation dialog shown, receipt confirmed successfully  
✅ **Redirect Works:** After confirm, user redirected to appropriate page (receiving hub or order page)  
✅ **Inventory Updated:** Stock quantities increased at correct location  
✅ **Audit Trail:** Stock adjustments logged with receipt reference  
✅ **Receipt Locked:** Confirmed receipts cannot be edited  
✅ **Order Integration:** Receiving from order pre-fills data and updates order status  

---

## Known Issues to Watch For

1. **Redirect After Confirm:** If you see an error message after clicking "Confirm" but the receipt was actually confirmed (check by refreshing), this indicates the redirect is being swallowed by error handling.

2. **Barcode Scan Not Finding Items:** If scanning a valid GTIN shows "Item not found" even though the item exists, this indicates the GTIN search is not properly querying the Product.gtin field.

3. **CSRF Token Errors:** If you see "Invalid request" errors, ensure you're using the app in a browser (not API client) and cookies are enabled.

---

**Last Updated:** 2025-11-15  
**Module Version:** Receiving Module v1.0

