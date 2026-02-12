# Unknown Users Management System

## Overview

The Unknown Users Management System allows admins to allocate temporary names to unknown gym members before they create formal login profiles. This bridges the gap between walk-in users and the formal registration process.

## How It Works

### 1. **Temporary User Allocation**
- When someone enters the gym without a proper login, they're assigned a temporary name
- Format: `GYM_USER_00001`, `GYM_USER_00002`, etc.
- Can be manually created by admins or auto-generated on gym check-in

### 2. **User Lifecycle**
```
Unknown User Created (PENDING)
         ↓
   Admin Verifies Information
         ↓
   Status Becomes VERIFIED
         ↓
   Admin Creates Login Profile (CONVERTED)
         ↓
   User can now login normally
```

### 3. **Features**
- ✅ Auto-generate unique temporary names
- ✅ Track check-ins for temporary users
- ✅ Collect phone, email, ESSL ID before registration
- ✅ Search and filter unknown users
- ✅ Manage user status lifecycle
- ✅ Export data as CSV
- ✅ Statistics dashboard

---

## Database Schema

### `unknown_users` Table

```sql
-- Main Fields
id                uuid          -- Unique identifier
temporary_name    text          -- Auto-generated (GYM_USER_XXXXX)
essl_id           text          -- Optional ESSL device ID
phone_number      text          -- Contact number
full_name         text          -- Real name once verified
email             text          -- Email address
status            text          -- pending | verified | converted | rejected

-- Tracking Fields
assigned_at       timestamp     -- When user was created
verified_at       timestamp     -- When admin verified
assigned_by       uuid          -- Admin who created/verified
check_in_count    integer       -- Number of check-ins
last_check_in     timestamp     -- Last gym entry

-- Additional Info
metadata          jsonb         -- Extra data (entry method, notes, etc)
notes             text          -- Admin notes
created_at        timestamp     -- Record creation time
updated_at        timestamp     -- Last update
```

---

## API & Service

### `unknownUserService` Functions

#### Create a New Unknown User
```typescript
const newUser = await unknownUserService.createUnknownUser(
  {
    essl_id: 'CGA8',
    phone_number: '+91-98765-43210',
    full_name: 'John Doe',
    email: 'john@example.com',
    notes: 'Walk-in customer'
  },
  adminUserId
);
```

**Returns:**
```typescript
{
  id: 'uuid',
  temporary_name: 'GYM_USER_00001',
  status: 'pending',
  assigned_at: '2026-02-12T10:30:00Z',
  check_in_count: 0,
  // ... other fields
}
```

#### Get All Unknown Users
```typescript
// Get all users
const allUsers = await unknownUserService.getAllUnknownUsers();

// Get only pending users
const pending = await unknownUserService.getAllUnknownUsers('pending');

// Filter options: 'pending' | 'verified' | 'converted' | 'rejected'
```

#### Search Unknown Users
```typescript
const results = await unknownUserService.searchUnknownUsers('john');
// Searches: temporary_name, phone, email, full_name, essl_id
```

#### Verify User Information
```typescript
const verified = await unknownUserService.verifyUnknownUser(
  unknownUserId,
  {
    full_name: 'John Doe',
    email: 'john@example.com',
    phone_number: '+91-98765-43210',
    essl_id: 'CGA8'
  },
  adminUserId
);
// Status changes to: verified
```

#### Record a Check-In
```typescript
const updated = await unknownUserService.recordCheckIn(unknownUserId);
// Increments check_in_count and updates last_check_in
```

#### Convert to Profile
```typescript
await unknownUserService.convertToProfile(unknownUserId, newProfileUserId);
// Status changes to: converted
```

#### Reject User
```typescript
await unknownUserService.rejectUnknownUser(unknownUserId, 'Rejected reason');
// Status changes to: rejected
```

#### Get Statistics
```typescript
const stats = await unknownUserService.getStatistics();
```

**Returns:**
```typescript
{
  total: 150,
  pending: 45,
  verified: 60,
  converted: 40,
  rejected: 5,
  totalCheckIns: 250
}
```

#### Export as CSV
```typescript
const csv = unknownUserService.exportAsCSV(users);
// Downloads as: unknown_users_2026-02-12.csv
```

---

## Admin Interface

### Location: Admin Dashboard → Unknown Users (or ADMIN_UNKNOWN_USERS screen)

### Features:

#### 1. **Statistics Panel**
Shows real-time metrics:
- Total unknown users
- Pending/Verified/Converted/Rejected counts
- Total check-ins recorded

#### 2. **Search & Filter**
- Search by: temporary name, phone, email, full name, ESSL ID
- Filter by status: All, Pending, Verified, Converted, Rejected

#### 3. **User Table**
Displays users with:
- Temporary name
- Full name
- Contact (phone/email)
- ESSL ID
- Status badge
- Check-in count
- Quick action buttons

#### 4. **Create Unknown User Modal**
Fields:
- ESSL ID (optional)
- Phone Number (optional)
- Full Name (optional)
- Email (optional)
- Notes (optional)

**Action:** Creates new user with auto-generated temporary name

#### 5. **User Detail Modal**
Shows complete user information with:
- Temporary name & ID
- Current status
- Check-ins count
- Creation & verification dates

**For Pending Users: Verification Panel**
- Full Name input
- Email input
- Phone Number input
- ESSL ID input
- Notes textarea
- **Verify & Save** button → Status becomes VERIFIED
- **Reject User** button → Status becomes REJECTED

#### 6. **Quick Actions**
- **View** - Open detail modal
- **Check-in** - Record gym entry for pending user
- **Refresh** - Reload data
- **Export as CSV** - Download all users

---

## Workflow Example

### Scenario: Walk-in Customer Without Account

**Step 1: Customer Arrives at Gym**
- Uses biometric/card at gym entrance
- System doesn't recognize them (no user account)
- Creates attendance record with ESSL ID only

**Step 2: Admin Allocates Temporary User**
- Click "Create Unknown User" in admin panel
- Enter ESSL ID: `CGA8`
- Enter Phone: `+91-98765-43210`
- System generates: `GYM_USER_00001`
- Status: **PENDING**

**Step 3: Customer Uses Gym**
- Customer checks in multiple times
- Check-in count increments automatically
- Shows 5 check-ins so far

**Step 4: Admin Verifies Information**
- Click on `GYM_USER_00001` to view details
- Enter full name: "John Doe"
- Enter email: "john@example.com"
- Click "Verify & Save"
- Status: **VERIFIED**

**Step 5: Create Actual Account**
- Admin manually creates user profile in ADMIN_USERS
- Links it to the verified temporary user
- Marks as **CONVERTED**
- Customer can now login normally

**Step 6: Cleanup**
- Temporary name is historical record
- User profile takes over
- Can reference original temporary name if needed

---

## Configuration

### App Settings

Located in `app_settings` table under `unknown_users_config`:

```json
{
  "prefix": "GYM_USER",
  "auto_generate": true,
  "require_phone": false,
  "require_essl_id": false,
  "expiry_days": 30
}
```

**Options:**
- `prefix`: Prefix for temporary names (default: "GYM_USER")
- `auto_generate`: Auto-create on gym check-in (default: true)
- `require_phone`: Force phone entry (default: false)
- `require_essl_id`: Force ESSL ID entry (default: false)
- `expiry_days`: Auto-delete after X days of pending (default: 30)

---

## Integration Points

### 1. **Gym Check-In Integration**
When eSSL device reports unknown ESSL ID:
```typescript
// In attendance webhook
if (!userFound && esslId) {
  const tempUser = await unknownUserService.createUnknownUser(
    { essl_id: esslId },
    adminId
  );
  recordCheckIn(tempUser.id);
}
```

### 2. **User Registration Integration**
When admin creates new user profile:
```typescript
// Find if temporary user exists
const tempUser = await unknownUserService.searchUnknownUsers(email);
if (tempUser.length > 0) {
  await unknownUserService.convertToProfile(tempUser[0].id, newUserId);
}
```

### 3. **UI Integration**
- Admin Dashboard card links to ADMIN_UNKNOWN_USERS
- Shows unknown users count
- One-click access to management

---

## Status Transitions

```
┌──────────────┐
│   PENDING    │  ← Initial state (created)
└──────┬───────┘
       │
       ├─→ VERIFIED ──→ CONVERTED ──→ (Becomes regular user)
       │      │
       └──→ REJECTED (Won't be converted)
```

**Allowed Transitions:**
- PENDING → VERIFIED (via verifyUnknownUser)
- PENDING → REJECTED (via rejectUnknownUser)
- VERIFIED → CONVERTED (via convertToProfile)
- VERIFIED → REJECTED (manual update)
- Any → PENDING (for re-opening/correction)

---

## Security & RLS

### Row-Level Security Policies

- Only admins can view unknown users
- Only admins can create/update/delete
- Each operation audited via `assigned_by` field

```sql
-- Admin who created/verified the user is tracked
assigned_by: auth.uid()
```

---

## Best Practices

1. **Collect Info Early**
   - Gather phone/email at first interaction
   - Makes verification easier later

2. **Regular Review**
   - Check pending users weekly
   - Follow up on payment/commitment

3. **Record Notes**
   - Add context for other admins
   - "VIP customer", "Referred by X", etc.

4. **Export History**
   - Keep monthly backups
   - Track conversions to actual users

5. **Set Expiry Reminders**
   - Configure expiry_days to auto-clean old pending users
   - Prevents database bloat

---

## Troubleshooting

### Problem: Duplicate Temporary Names
**Solution:** System locks on unique constraint, error shown to admin

### Problem: Can't Find User
**Solution:** Use search with partial matches (first/last name, phone)

### Problem: Status Won't Change
**Solution:** Check database RLS policies, ensure admin role

### Problem: Check-ins Not Incrementing
**Solution:** Verify ESSL ID matches between devices and database

---

## Future Enhancements

- [ ] Auto-create on gym device check-in
- [ ] SMS notifications for verification
- [ ] Membership offer prompts for temporary users
- [ ] Bulk import from CSV
- [ ] Status change notifications
- [ ] Expiry auto-cleanup job
- [ ] QR code generation for temp users
- [ ] Mobile app support

---

## Testing

### Manual Test Workflow

1. **Create Unknown User**
   - Admin → Admin Dashboard → Unknown Users
   - Click "Create Unknown User"
   - Fill form and submit
   - Verify temporary name generated (GYM_USER_XXXXX)

2. **Record Check-In**
   - Click "Check-in" button on user
   - Verify check-in count incremented
   - Verify last_check_in updated

3. **Verify User**
   - Click "View" on user
   - Fill in full information
   - Click "Verify & Save"
   - Verify status changed to VERIFIED

4. **Export Data**
   - Click "Export as CSV"
   - Verify file downloads with all users
   - Check data accuracy

5. **Search Functionality**
   - Try searching by temp name, phone, email
   - Verify results filtered correctly

---

## Support

For questions or issues:
1. Check this documentation
2. Review database schema for field details
3. Check unknownUserService.ts for API reference
4. Review AdminUnknownUsers.tsx UI code
5. Contact admin support

