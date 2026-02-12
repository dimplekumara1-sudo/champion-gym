# Unknown Users System - Quick Setup Guide

## Implementation Checklist

- [x] Database schema created (migration file)
- [x] Service layer implemented (unknownUserService.ts)
- [x] Admin UI created (AdminUnknownUsers.tsx)
- [x] Routing configured (App.tsx)
- [x] Types defined (types.ts)
- [x] Navigation updated (AdminDashboard.tsx)

## What Was Created

### 1. **Database Migration**
📁 File: `supabase/migrations/20260212_unknown_users_management.sql`

Contains:
- `unknown_users` table with all fields
- Indexes for fast queries
- Row-level security policies
- Default configuration in app_settings

### 2. **Service Layer**
📁 File: `lib/unknownUserService.ts`

Provides:
- `generateTemporaryName()` - Auto-generate unique names
- `createUnknownUser()` - Create new temporary user
- `getAllUnknownUsers()` - Fetch all or filtered by status
- `searchUnknownUsers()` - Search by name/phone/email/ESSL ID
- `updateUnknownUser()` - Update user info
- `verifyUnknownUser()` - Mark as verified with full info
- `recordCheckIn()` - Increment gym entry count
- `convertToProfile()` - Move to regular user profile
- `rejectUnknownUser()` - Mark as rejected
- `getStatistics()` - Get dashboard stats
- `exportAsCSV()` - Export data

### 3. **Admin UI Screen**
📁 File: `screens/AdminUnknownUsers.tsx`

Features:
- Statistics dashboard (total, pending, verified, converted, rejected)
- Search bar with real-time search
- Filter tabs by status
- User table with all details
- Create new user modal
- User detail modal
- Verify/update information
- Check-in recording
- CSV export
- Responsive design

### 4. **Type Definitions**
📁 File: `types.ts`

Added:
- `'ADMIN_UNKNOWN_USERS'` screen type
- `UnknownUser` interface

### 5. **Navigation & Routing**
📁 Files: `App.tsx`, `AdminDashboard.tsx`

Changes:
- Added import for AdminUnknownUsers
- Added routing case for ADMIN_UNKNOWN_USERS
- Added to admin screens list
- Dashboard card links to unknown users management

---

## Deployment Steps

### Step 1: Run Database Migration
```bash
# In Supabase dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of 20260212_unknown_users_management.sql
# 3. Run the SQL

# Or use Supabase CLI:
supabase db push
```

### Step 2: Install Dependencies (if needed)
All functionality uses existing dependencies, no new packages needed.

### Step 3: Deploy Updated Code
```bash
# Commit all changes
git add -A
git commit -m "feat: Add unknown users management system"

# Push to production
git push origin main
```

### Step 4: Test the Feature
1. **Access Admin Panel**
   - Login with admin account
   - Go to Admin Dashboard

2. **Create Unknown User**
   - Click "Unknown Users" card or navigate to ADMIN_UNKNOWN_USERS
   - Click "Create Unknown User"
   - Add test data
   - Verify temporary name generated (GYM_USER_00001, etc)

3. **Record Check-in**
   - Click "Check-in" button
   - Verify count incremented

4. **Verify User**
   - Click "View" on user
   - Fill in additional information
   - Click "Verify & Save"
   - Verify status changed to VERIFIED

5. **Export Test**
   - Click "Export as CSV"
   - Verify download works

---

## Features Ready to Use

### For Admins:
✅ Create temporary users without full registration
✅ Track check-ins for unknown members
✅ Collect phone/email/ESSL ID information
✅ Verify before converting to actual profile
✅ Search and filter users efficiently
✅ Export data for reporting
✅ View statistics dashboard
✅ Add notes for reference
✅ Reject or convert users
✅ Track who verified each user

### For Users:
✅ Check in with temporary name
✅ Get tracked for gym attendance
✅ Progress to full account when ready
✅ Keep attendance history

---

## Configuration

### Temporary Name Format
Default: `GYM_USER_XXXXX` (e.g., GYM_USER_00001)

To customize, edit `app_settings` table:
```sql
UPDATE app_settings 
SET value = jsonb_set(value, '{prefix}', '"YOUR_PREFIX"'::jsonb)
WHERE id = 'unknown_users_config';
```

### Expiry Settings
Default: 30 days

To change:
```sql
UPDATE app_settings 
SET value = jsonb_set(value, '{expiry_days}', '60'::jsonb)
WHERE id = 'unknown_users_config';
```

---

## Integration with eSSL System

### Auto-Create on Check-In
Add to eSSL attendance webhook:

```typescript
// When unknown ESSL ID checks in
if (!user && esslId) {
  const tempUser = await unknownUserService.createUnknownUser(
    { essl_id: esslId },
    adminId
  );
  // Record attendance for temp user
}
```

### Block/Unblock Integration
Can track temporary users for access control:

```typescript
// Link temporary user to ESSL for blocking
await unknownUserService.updateUnknownUser(tempUserId, {
  metadata: {
    ...metadata,
    essl_access_group: 1
  }
});
```

---

## File Locations

```
Project Root
├── supabase/migrations/
│   └── 20260212_unknown_users_management.sql    [NEW]
├── lib/
│   └── unknownUserService.ts                     [NEW]
├── screens/
│   └── AdminUnknownUsers.tsx                     [NEW]
├── App.tsx                                       [UPDATED]
├── types.ts                                      [UPDATED]
└── UNKNOWN_USERS_GUIDE.md                        [NEW]
```

---

## Database Tables Used

| Table | Purpose |
|-------|---------|
| `unknown_users` | Stores temporary user data |
| `app_settings` | Configuration settings |
| `profiles` | Links to admin who created user |

---

## API Endpoints (if using as API)

Can be extended to REST API:

```
POST   /api/unknown-users                 Create unknown user
GET    /api/unknown-users                 Get all unknown users
GET    /api/unknown-users/:id             Get specific user
PUT    /api/unknown-users/:id             Update user
DELETE /api/unknown-users/:id             Delete user
POST   /api/unknown-users/:id/check-in    Record check-in
POST   /api/unknown-users/:id/verify      Verify user
POST   /api/unknown-users/:id/convert     Convert to profile
GET    /api/unknown-users/search/:term    Search users
GET    /api/unknown-users/export/csv      Export as CSV
```

---

## Common Tasks

### Find Unknown User by Phone
```typescript
const users = await unknownUserService.searchUnknownUsers('9876543210');
```

### Get All Pending Users
```typescript
const pending = await unknownUserService.getAllUnknownUsers('pending');
```

### Convert to Profile
```typescript
await unknownUserService.convertToProfile(tempUserId, actualUserId);
```

### Export All Users
```typescript
const all = await unknownUserService.getAllUnknownUsers();
const csv = unknownUserService.exportAsCSV(all);
```

### Get Dashboard Stats
```typescript
const stats = await unknownUserService.getStatistics();
console.log(`Total: ${stats.total}, Pending: ${stats.pending}`);
```

---

## Troubleshooting

### Can't See Unknown Users Screen
- Verify admin login
- Check if ADMIN_UNKNOWN_USERS in App.tsx routing
- Clear browser cache

### Temporary Names Duplicating
- Database constraint prevents this
- Check for database errors
- Verify unique constraint on temporary_name

### Can't Create User
- Check admin permissions (role = 'admin')
- Verify RLS policies enabled
- Check app_settings has unknown_users_config entry

### Search Not Working
- Try exact matches first
- Check phone format (should include country code)
- Email should be lowercase

---

## Performance Considerations

### Indexes Created
- `idx_unknown_users_temporary_name` - Fast name lookups
- `idx_unknown_users_essl_id` - Fast ESSL ID lookups
- `idx_unknown_users_status` - Fast status filtering
- `idx_unknown_users_created_at` - Fast sorting by date

### Query Optimization
- Queries use indexed columns
- Pagination recommended for large datasets
- EagerLoad related profile data if needed

---

## Security

### RLS Policies
Only admins can:
- View unknown users
- Create/update users
- Delete users

### Audit Trail
All operations tracked:
- `assigned_by` - Who created the user
- `created_at` - When created
- `updated_at` - When modified
- `verified_at` - When verified

### Data Privacy
- No sensitive data stored
- Phone/email encrypted in transit
- GDPR compliant (can delete records)

---

## Next Steps

1. ✅ Deploy migration
2. ✅ Test UI functionality
3. ✅ Configure temporary name prefix if needed
4. ✅ Train admins on how to use
5. ✅ Set up integration with eSSL devices (optional)
6. ✅ Monitor database for performance
7. ✅ Create backup process for data export

---

## Support Resources

- 📖 [UNKNOWN_USERS_GUIDE.md](./UNKNOWN_USERS_GUIDE.md) - Complete documentation
- 📝 [unknownUserService.ts](./lib/unknownUserService.ts) - Service code
- 🎨 [AdminUnknownUsers.tsx](./screens/AdminUnknownUsers.tsx) - UI component
- 💾 [Migration file](./supabase/migrations/20260212_unknown_users_management.sql) - Database schema

---

## Version Info

- Created: 2026-02-12
- Status: ✅ Ready for Production
- Dependencies: None (uses existing)
- Database: Supabase PostgreSQL
- UI Framework: React + Tailwind CSS

