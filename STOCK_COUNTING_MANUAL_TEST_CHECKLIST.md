# Stock Counting Manual Test Checklist

This checklist covers manual integration testing to verify the stock counting and inventory features work correctly in a real environment.

## Prerequisites

- [ ] Application running locally or on staging environment
- [ ] Database seeded with test data (`npm run db:seed`)
- [ ] Three test users available:
  - [ ] VIEWER role user
  - [ ] STAFF role user
  - [ ] ADMIN role user

---

## A. Happy Path Testing

### 1. Create Location with Initial Inventory

- [ ] Navigate to Locations page
- [ ] Create new location "Test Storage"
- [ ] Navigate to Inventory page
- [ ] Verify location appears in location filter
- [ ] Add inventory to location:
  - [ ] Item A: 10 units
  - [ ] Item B: 5 units
  - [ ] Item C: 20 units

### 2. Start Stock Count

- [ ] Navigate to Stock Count page
- [ ] Click "New Count"
- [ ] Select "Test Storage" location
- [ ] Add notes: "Monthly inventory check"
- [ ] Click Create
- [ ] Verify redirected to count detail page
- [ ] Verify status shows "IN_PROGRESS"
- [ ] Verify location name displayed correctly

### 3. Add Count Lines

**Using Manual Entry**:
- [ ] Click "Add Item"
- [ ] Select Item A
- [ ] Enter counted quantity: 10 (matches system)
- [ ] Save
- [ ] Verify line appears with variance: 0

**Add Variance Line**:
- [ ] Add Item B
- [ ] Enter counted quantity: 7 (system shows 5)
- [ ] Save
- [ ] Verify line shows variance: +2 (in green/up arrow)

**Add Shrinkage Line**:
- [ ] Add Item C
- [ ] Enter counted quantity: 18 (system shows 20)
- [ ] Save
- [ ] Verify line shows variance: -2 (in red/down arrow)

### 4. Review Variance

- [ ] Verify summary stats show:
  - [ ] Total items: 3
  - [ ] Items with variance: 2
  - [ ] Total absolute variance: 4

- [ ] Verify count lines table shows:
  - [ ] System Quantity column
  - [ ] Counted Quantity column
  - [ ] Variance column with color coding

### 5. Complete with Adjustments

- [ ] Click "Complete & Apply Adjustments"
- [ ] Read confirmation dialog
- [ ] Confirm
- [ ] Verify success message
- [ ] Verify status changes to "COMPLETED"
- [ ] Verify buttons now disabled (cannot edit)

### 6. Verify Inventory Updated

- [ ] Navigate to Inventory page
- [ ] Filter by "Test Storage" location
- [ ] Verify quantities:
  - [ ] Item A: 10 (unchanged)
  - [ ] Item B: 7 (increased from 5)
  - [ ] Item C: 18 (decreased from 20)

### 7. Verify Audit Trail

- [ ] Navigate to Stock Count page
- [ ] Find the completed session
- [ ] Verify it shows:
  - [ ] Completion timestamp
  - [ ] User who completed it
  - [ ] Number of items counted
  - [ ] Total variance

---

## B. Edge Cases Testing

### 1. Count Item with Zero Inventory

- [ ] Start new count at "Test Storage"
- [ ] Add Item D (not yet in this location - system qty: 0)
- [ ] Enter counted quantity: 5
- [ ] Save
- [ ] Verify line created with:
  - [ ] System Quantity: 0
  - [ ] Counted Quantity: 5
  - [ ] Variance: +5

- [ ] Complete with adjustments
- [ ] Navigate to Inventory
- [ ] Verify Item D now appears at "Test Storage" with quantity: 5

### 2. Negative Variance (Shrinkage)

- [ ] Start new count
- [ ] Count Item B
- [ ] Enter counted quantity: 5 (assume system shows 7)
- [ ] Save
- [ ] Verify variance: -2
- [ ] Complete with adjustments
- [ ] Verify inventory updated to 5

### 3. Duplicate Item in Count

- [ ] Start new count
- [ ] Add Item A, quantity: 8
- [ ] Save
- [ ] Add Item A again, quantity: 10
- [ ] Save
- [ ] Verify only ONE line exists for Item A
- [ ] Verify line shows counted quantity: 10 (updated)
- [ ] Verify variance recalculated

### 4. Cancel Empty Count

- [ ] Start new count
- [ ] Don't add any lines
- [ ] Try to click "Complete"
- [ ] Verify error message: "Session must have at least one line"

### 5. Complete Without Adjustments

- [ ] Start new count
- [ ] Add Item A, enter different quantity
- [ ] Click "Complete (No Adjustments)"
- [ ] Confirm
- [ ] Verify status: COMPLETED
- [ ] Navigate to Inventory
- [ ] Verify quantity UNCHANGED (no adjustment applied)

---

## C. Concurrency Testing

### 1. Manual Inventory Change During Count

**Setup**:
- [ ] Login as STAFF user
- [ ] Start count for "Test Storage"
- [ ] Add Item A (system shows 10), enter counted: 12
- [ ] Do NOT complete yet

**Simulate Concurrent Change**:
- [ ] Open new browser tab/window
- [ ] Login as same or different STAFF user
- [ ] Navigate to Inventory
- [ ] Manually adjust Item A at "Test Storage" to 15 units
  (simulates receiving or transfer during count)

**Complete Count as STAFF**:
- [ ] Go back to count tab
- [ ] Click "Complete & Apply Adjustments"
- [ ] Verify ERROR message appears:
  - [ ] States "Inventory changed during count"
  - [ ] Shows Item A: 10 → 15 (+5)
  - [ ] Suggests redo count or contact admin
- [ ] Verify count remains IN_PROGRESS
- [ ] Verify inventory NOT changed

### 2. Admin Override

**Continue from above scenario**:
- [ ] Logout from STAFF account
- [ ] Login as ADMIN user
- [ ] Navigate to the same count session

**Try to Complete with Override**:
- [ ] Click "Complete & Apply Adjustments"
- [ ] Verify concurrency error appears
- [ ] Verify dialog shows "Override and Apply" option
  (only visible to ADMIN)
- [ ] Click "Override and Apply"
- [ ] Confirm in dangerous action dialog
- [ ] Verify success with warning message
- [ ] Verify count completed

**Verify Result**:
- [ ] Navigate to Inventory
- [ ] Verify adjustment applied (despite concurrency)
- [ ] Check audit logs show admin override was used

---

## D. Permissions Testing

### 1. VIEWER Role

Login as VIEWER:
- [ ] Navigate to Stock Count page
- [ ] Verify "New Count" button hidden or disabled
- [ ] Open existing count session
- [ ] Verify all edit buttons hidden
- [ ] Verify can only view data

### 2. STAFF Role

Login as STAFF:
- [ ] Can start counts: ✅
- [ ] Can add/edit lines: ✅
- [ ] Can complete counts: ✅
- [ ] Cannot delete completed sessions
- [ ] Cannot override concurrency: ❌ (blocked)

### 3. ADMIN Role

Login as ADMIN:
- [ ] Can do everything STAFF can: ✅
- [ ] Can delete completed sessions: ✅
- [ ] Can override concurrency: ✅
- [ ] Verify dangerous actions require confirmation

---

## E. Multi-Location Testing

### 1. Same Item, Different Locations

**Setup**:
- [ ] Ensure Item A exists at three locations:
  - [ ] Storage A: 10 units
  - [ ] Storage B: 15 units
  - [ ] Storage C: 8 units

**Count at Storage A Only**:
- [ ] Start count for Storage A
- [ ] Count Item A: 12 units
- [ ] Complete with adjustments

**Verify Isolation**:
- [ ] Navigate to Inventory
- [ ] Verify:
  - [ ] Storage A - Item A: 12 (changed)
  - [ ] Storage B - Item A: 15 (unchanged)
  - [ ] Storage C - Item A: 8 (unchanged)

---

## F. Error Handling & Validation

### 1. Negative Counted Quantity

- [ ] Start count
- [ ] Try to enter -5 for counted quantity
- [ ] Verify error: "must be non-negative"
- [ ] Verify cannot save

### 2. Would-Cause-Negative Final Inventory

- [ ] Start count
- [ ] Item with system qty: 5
- [ ] Enter counted: -3 (if somehow bypassed client validation)
- [ ] Try to complete
- [ ] Verify error: "would result in negative inventory"

### 3. Session State Validation

- [ ] Complete a count session
- [ ] Try to edit any line
- [ ] Verify error: "Cannot edit completed session"

---

## G. UI/UX Verification

### 1. Visual Indicators

- [ ] Large variances (>10 units or >20%) highlighted
- [ ] Positive variances show green/up indicator
- [ ] Negative variances show red/down indicator
- [ ] Items that would go negative show warning icon

### 2. Mobile Responsiveness

- [ ] Open on mobile device or narrow browser
- [ ] Verify all tables scroll horizontally if needed
- [ ] Verify buttons accessible
- [ ] Verify scanner modal works

### 3. Loading States

- [ ] Observe loading indicators during:
  - [ ] Session creation
  - [ ] Adding lines
  - [ ] Completing count
- [ ] Verify no UI freezing

---

## H. Performance Testing

### 1. Large Count Session

- [ ] Start count
- [ ] Add 50+ count lines (can use bulk if available)
- [ ] Verify page remains responsive
- [ ] Complete count
- [ ] Verify completion time < 5 seconds

### 2. List Performance

- [ ] Create 20+ count sessions
- [ ] Navigate to Stock Count list
- [ ] Verify page loads quickly
- [ ] Verify pagination if many sessions

---

## I. Data Validation

### 1. Stock Adjustment Records

After completing a count with adjustments:
- [ ] Check database or admin panel
- [ ] Verify StockAdjustment records created
- [ ] Verify each adjustment has:
  - [ ] Correct quantity (positive or negative)
  - [ ] Reason: "Stock Count"
  - [ ] Reference to count session ID
  - [ ] Creator user ID

### 2. Audit Logs

- [ ] Check audit logs for count session
- [ ] Verify events logged:
  - [ ] SessionCreated
  - [ ] LineAdded (for each item)
  - [ ] LineUpdated (if any edited)
  - [ ] LineRemoved (if any deleted)
  - [ ] CountCompleted (with summary)

---

## Test Completion Summary

**Date Tested**: _________________  
**Tester**: _________________  
**Environment**: _________________  

**Results**:
- [ ] All happy path tests passed
- [ ] All edge case tests passed
- [ ] All concurrency tests passed
- [ ] All permission tests passed
- [ ] All multi-location tests passed
- [ ] All validation tests passed
- [ ] All UI/UX checks passed
- [ ] All performance tests passed
- [ ] All data validation checks passed

**Issues Found**: _________________  
_________________  
_________________  

**Overall Status**: ⬜ PASS / ⬜ FAIL  

**Notes**: _________________  
_________________  
_________________  

