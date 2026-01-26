# PowerFlex - Payment & Plan Management System Implementation Summary

## Overview
Implemented a comprehensive subscription management system with payment tracking, expiry notifications, and automatic plan status transitions.

---

## 1. Database Schema Updates (fix7_payment_and_plan_tracking.sql)

### New Columns Added to `profiles` Table:
- **paid_amount** (numeric, DEFAULT 0): Track amount already paid by user
- **due_amount** (numeric, DEFAULT 0): Track remaining balance due
- **payment_due_date** (timestamp): Set deadline for partial payment collection
- **plan_status** (text, DEFAULT 'free'): Track plan lifecycle status
- **last_expiry_notification_sent** (boolean, DEFAULT false): Prevent duplicate notifications

### New Constraints:
- plan_status CHECK constraint: Ensures only valid statuses ('free', 'pending', 'active', 'upcoming', 'expired')

### New Indexes:
- idx_profiles_plan_status: For filtering users by plan status
- idx_profiles_plan_expiry_date: For quick expiry date queries
- idx_profiles_payment_due_date: For payment collection queries

### Auto-Update Trigger:
- `update_plan_status_trigger`: Automatically updates plan_status based on:
  - Expiry date vs current date
  - Approval and payment status

---

## 2. Admin User Management (AdminUsers.tsx)

### New Features:

#### A. Approval Confirmation Modal
- When admin clicks "Approve", a modal appears asking for:
  - **Amount Paid**: Actual payment received from user
  - **Payment Due Date**: Deadline for any remaining balance
- Calculates:
  - Due Amount = Plan Price - Paid Amount
  - If paid < plan price, tracks the difference for collection
  - If paid >= plan price, user is fully paid

#### B. Phone Number Display with Call Icon
- Shows user's phone number in user list cards
- Added call icon (material-symbols-rounded: "call") as clickable link
- Phone link format: `tel:${phone_number}`
- In modal also shows phone with call icon for direct calling

#### C. Filter for Expiring/Expired Users
- New "Expiring/Expired" filter button (orange badge when active)
- Shows users with:
  - **Expiring Soon**: 5 days or less until expiry (shows remaining days)
  - **Expired**: Past expiry date (colored red in list)
- Each user card changes color based on status:
  - Orange tint for expiring soon
  - Red tint for expired

#### D. Enhanced Subscription Section in Modal
- Shows new fields:
  - **Status**: Plan status (active/expired/upcoming)
  - **Paid Amount**: $X.XX display
  - **Due Amount**: $X.XX display (orange colored)
  - **Due Date**: Payment collection deadline
  - **Expires**: Plan expiry date
- Custom expiry update functionality still available

---

## 3. Profile Screen Updates (ProfileScreen.tsx)

### New Features:

#### A. Phone Number Popup Modal
- Triggers automatically on first load if phone_number is missing
- Clean modal with:
  - Title: "Add Phone Number"
  - Input field for phone number
  - Skip button (dismisses without saving)
  - Save button (saves to database and closes)
- Updates cache after saving
- Shows alert on success

#### B. Edit Profile Modal
- Triggered by clicking "Edit Profile" button
- Allows editing:
  - Full Name
  - Phone Number (now editable here too)
  - Gender (dropdown: Male, Female, Other)
  - Height (cm)
  - Weight (kg)
  - Target Weight (kg)
- Saves all changes to database
- Updates local cache
- Overflow scroll if many fields needed on small screens
- Cancel/Save buttons with proper styling

#### C. Implementation Details
- New state variables:
  - `showPhoneModal`: Controls phone number popup
  - `showEditModal`: Controls profile edit modal
  - `editData`: Holds form data being edited
- New functions:
  - `handlePhoneNumberSave()`: Saves phone number
  - `handleSaveProfile()`: Saves all profile fields

---

## 4. Notification System (lib/notifications.ts)

### Service: `notificationService`

#### Methods:

**getExpiringPlansNotifications()**
- Finds users with plans expiring in 5 days or less
- Returns array of PlanNotification objects
- Cached with MEDIUM TTL
- Fields in notification:
  - Type: 'expiring_soon'
  - Days left until expiry
  - Action URL: 'PROFILE'

**getExpiredPlansNotifications()**
- Finds users with expired plans (plan_status = 'expired')
- Returns array for payment collection
- Shows due amount
- Action URL: 'PROFILE'

**getPaymentDueNotifications()**
- Finds users with payment_due_date in past and due_amount > 0
- Returns payment due reminders
- Shows outstanding amount

**getUserNotifications()**
- Combines all three above types
- Filters for specific user ID
- Returns consolidated notification array

**markNotificationSent()**
- Sets last_expiry_notification_sent = true
- Prevents duplicate notifications
- Invalidates cache

### Notification Interface:
```typescript
interface PlanNotification {
  userId: string;
  type: 'expiring_soon' | 'expired' | 'payment_due';
  daysLeft?: number;
  expiryDate?: string;
  dueAmount?: number;
  title: string;
  message: string;
  actionUrl?: string;
}
```

---

## 5. Plan Management Service (lib/planService.ts)

### Service: `planService`

#### Key Methods:

**processPlanRenewal(userId)**
- Checks if current plan is expired
- Creates new plan dates from expiry date
- Updates plan_status to 'active'
- Resets notification flag
- Returns boolean success

**markPlanAsUpcoming(userId)**
- Sets plan_status to 'upcoming'
- For plans approved but not yet active

**activatePlan(userId)**
- Moves plan from pending/upcoming to active
- Sets start date to now
- Default 1 month duration
- Updates approval & payment status to approved/paid

**expirePlan(userId)**
- Marks plan as expired
- Allows payment collection phase

**handlePartialPayment()**
- Records paid amount and due amount
- Sets payment due date
- Updates payment_status based on amount received

**collectDuePayment()**
- Processes partial payment collection
- Reduces due amount by collected amount
- Updates paid amount
- Changes payment status when fully paid

**getUsersRequiringPaymentCollection()**
- Admin tool: Get all users with expired plans and due amounts
- Sorted by payment due date (earliest first)
- Includes phone numbers for contact

**getUsersWithUpcomingRenewals()**
- Admin tool: Get users with active plans expiring in 7 days
- For proactive renewal reminders

---

## 6. Header Component Updates (components/Header.tsx)

### New Features:

#### A. Notification Bell
- Shows only if notifications exist
- Displays badge with notification count
- Shows "9+" if more than 9 notifications
- Red-colored badge
- Clickable to open notifications modal
- Icon: material-symbols-rounded "notifications"

#### B. Updated Props:
```typescript
interface HeaderProps {
  onProfileClick?: () => void;
  notifications?: PlanNotification[];
  onNotificationsClick?: () => void;
}
```

#### C. Layout:
- Bell positioned before profile avatar
- Both in a flex container with gap-3
- Bell shows notification count badge with red background

---

## 7. Dashboard Updates (screens/Dashboard.tsx)

### New Features:

#### A. Notification Integration
- Imports notificationService and PlanNotification type
- New state: `showNotificationsModal` and `notifications`
- Calls `notificationService.getUserNotifications()` in fetchProfile
- Passes notifications to Header component

#### B. Notifications Modal
- Triggered by notification bell click
- Shows all user notifications
- Displays:
  - Title and message
  - Icon based on notification type (schedule/error/info)
  - Color-coded by type (orange/red/blue)
  - Due amount if applicable
- "Take Action" button navigates to PROFILE screen
- Close button to dismiss
- Sticky header and footer with scrollable content area

#### C. Notification Display Logic:
- Orange (expiring_soon): Schedule icon
- Red (expired): Error icon
- Blue (payment_due): Info icon

---

## 8. Plan Status Lifecycle

### Status Flow:
```
free (default)
  ↓
pending (on signup, awaiting approval)
  ↓
upcoming (after approval, before activation)
  ↓
active (plan is active and valid)
  ↓
expired (past expiry date, entering payment collection phase)
  ↓
active (after renewal payment)
```

### Triggering Transitions:

1. **free → pending**: User selects a plan on signup
2. **pending → upcoming**: Admin approves user
3. **upcoming → active**: Plan start date reached or manually activated
4. **active → expired**: Automatic via trigger when expiry_date < NOW()
5. **expired → active**: After renewal payment processed

---

## 9. Payment Tracking Workflow

### Approval Process (Admin):
1. Admin clicks "Approve" on pending user
2. Approval modal appears
3. Admin enters:
   - Actual paid amount
   - Payment due date for balance
4. System calculates:
   - Plan price from plan_id
   - Due amount = price - paid
5. Creates entry in profiles with:
   - paid_amount, due_amount, payment_due_date
   - plan_status = 'active'
   - approval_status = 'approved'
   - payment_status = 'paid' (if paid_amount > 0)
   - plan_expiry_date = 30 days from now (default)

### Partial Payment Collection:
1. User/admin notes payment_due_date
2. Use `planService.collectDuePayment()` to record collection
3. Updates paid_amount, due_amount
4. Changes payment_status to 'paid' when due_amount = 0

### Expired User Collection:
1. Admin sees user in "Expiring/Expired" filter
2. Clicks on user to view details
3. Sees due_amount and payment_due_date
4. Can use "Set Custom Expiry" to extend if needed
5. Or use planService to record payment collection

---

## 10. Notifications Workflow

### User-Facing Notifications:
1. **5 Days Before Expiry**: 
   - Notification type: 'expiring_soon'
   - Badge shows on bell icon
   - Click to view "Plan Expiring Soon" alert
   - "Take Action" button → PROFILE screen to renew

2. **After Expiry**:
   - Notification type: 'expired'
   - Shows expired message
   - Encourages renewal to continue fitness journey

3. **Payment Due**:
   - Notification type: 'payment_due'
   - Shows outstanding amount
   - Links to profile for payment info

### Admin Tools:
1. **getUsersRequiringPaymentCollection()**: Get expired users to follow up
2. **getUsersWithUpcomingRenewals()**: Proactive renewal reminders

---

## 11. Usage Examples

### For Admin - Approving a User:
1. Go to Admin Dashboard → Members
2. Find pending user, click "Approve"
3. Enter details:
   - Amount Paid: $50
   - Due Date: 2026-02-26
4. System calculates: Due = Plan Price - 50
5. User activated with plan expiring in 30 days

### For User - Phone Number Setup:
1. On first ProfileScreen load, modal pops up
2. Enter phone number
3. Click Save
4. Can always edit later via Edit Profile button

### For User - Subscription Renewal:
1. Gets notification 5 days before expiry
2. Clicks on notification or goes to PROFILE
3. Sees "Plan Expiring Soon" alert
4. Clicks RENEW button
5. Completes payment
6. Plan status changes to active again

### For Admin - Collecting Due Payments:
1. Go to User Management
2. Filter by "Expiring/Expired"
3. Click on expired user
4. See due_amount and payment_due_date
5. Call user using phone icon
6. Record payment via planService.collectDuePayment()

---

## 12. Data Models

### Updated Profile Schema:
```typescript
interface Profile {
  // ... existing fields ...
  paid_amount: number;           // Amount user has paid
  due_amount: number;            // Outstanding balance
  payment_due_date: string;      // ISO date string
  plan_status: 'free' | 'pending' | 'active' | 'upcoming' | 'expired';
  last_expiry_notification_sent: boolean;
}
```

### Plan Notification Schema:
```typescript
interface PlanNotification {
  userId: string;
  type: 'expiring_soon' | 'expired' | 'payment_due';
  daysLeft?: number;
  expiryDate?: string;
  dueAmount?: number;
  title: string;
  message: string;
  actionUrl?: string;
}
```

---

## 13. Cache Management

### Invalidated Caches:
- `PROFILE_DATA`: After any profile update
- `${PROFILE_DATA}_expiring_notifications`: When new notification appears
- `${PROFILE_DATA}_expired_notifications`: When user is marked expired
- `${PROFILE_DATA}_payment_due_notifications`: When payment due updated

### TTL Values Used:
- LONG (15 min): Profile data cache
- MEDIUM (5 min): Notification caches
- VERY_LONG (1 hour): Plan details cache

---

## 14. Error Handling

### All functions include:
- Try-catch blocks
- Console error logging
- User-friendly alert messages
- Graceful fallbacks
- Cache invalidation on errors

---

## 15. Testing Checklist

- [ ] Admin approves user with full payment
- [ ] Admin approves user with partial payment
- [ ] User sees phone number popup on first load
- [ ] User can edit profile including phone number
- [ ] Notification bell shows correct count
- [ ] Notification modal shows all types correctly
- [ ] Filter shows expiring (5 days) and expired users
- [ ] Call icon works for phone number
- [ ] Due amount displays correctly
- [ ] Payment collection works
- [ ] Plan expiry notification triggers at 5 days
- [ ] Expired plan shows in red
- [ ] Cache invalidates properly

---

## 16. Next Steps / Optional Enhancements

1. **SMS Integration**: Send SMS reminders 5 days before expiry
2. **Email Notifications**: Send email payment receipts and reminders
3. **Automated Payment**: Integrate payment gateway for automatic billing
4. **Report Generation**: Admin reports on expired users, payment collection
5. **Bulk Actions**: Bulk approve/reject/payment collection
6. **Payment History**: Store and display payment transaction history
7. **Renewal Automation**: Auto-renew if payment method on file
8. **Loyalty Rewards**: Discount for early renewal or auto-renew

---

## Files Modified/Created

### Created:
- [fix7_payment_and_plan_tracking.sql](fix7_payment_and_plan_tracking.sql)
- [lib/notifications.ts](lib/notifications.ts)
- [lib/planService.ts](lib/planService.ts)

### Modified:
- [screens/AdminUsers.tsx](screens/AdminUsers.tsx)
- [screens/ProfileScreen.tsx](screens/ProfileScreen.tsx)
- [screens/Dashboard.tsx](screens/Dashboard.tsx)
- [components/Header.tsx](components/Header.tsx)

---

## API Changes

### New Supabase Queries:
- Filters for plan_status, plan_expiry_date, payment_due_date
- Profile updates with new columns
- Complex queries combining approval, payment, and expiry data

---

This comprehensive implementation provides a complete subscription lifecycle management system for PowerFlex Elite Fitness Coach.
