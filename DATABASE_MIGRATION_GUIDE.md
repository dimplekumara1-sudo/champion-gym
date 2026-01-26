# Database Migration Quick Start

## Steps to Apply Payment & Plan Tracking System

### 1. Execute Migration File

Run the SQL migration in Supabase:

```sql
-- Copy contents from fix7_payment_and_plan_tracking.sql
-- Paste into Supabase SQL Editor
-- Execute
```

The migration will:
- Add 5 new columns to profiles table
- Add constraints for data validation
- Create 3 performance indexes
- Create auto-update trigger for plan_status

### 2. Verify Changes

Check in Supabase dashboard:

```sql
-- View new columns
SELECT 
  id, 
  paid_amount, 
  due_amount, 
  payment_due_date, 
  plan_status, 
  last_expiry_notification_sent
FROM profiles 
LIMIT 5;
```

### 3. Update Existing Users (Optional)

If you have existing approved users, run:

```sql
-- Set plan_status for existing approved users
UPDATE profiles
SET plan_status = CASE
  WHEN approval_status = 'approved' AND payment_status = 'paid' AND plan_expiry_date > NOW() THEN 'active'
  WHEN approval_status = 'approved' AND payment_status = 'paid' AND plan_expiry_date <= NOW() THEN 'expired'
  WHEN approval_status = 'pending' OR payment_status = 'pending' THEN 'pending'
  ELSE 'free'
END
WHERE plan_status IS NULL;
```

### 4. Test Payment Approval Flow

Use Admin Dashboard:
1. Find a pending user
2. Click "Approve"
3. Enter payment details (amount, due date)
4. Verify data saved correctly

```sql
-- Check if approval was successful
SELECT 
  id, 
  full_name,
  approval_status, 
  payment_status,
  paid_amount,
  due_amount,
  payment_due_date,
  plan_status,
  plan_expiry_date
FROM profiles 
WHERE id = 'user-id-here';
```

### 5. Test Expiration Notifications

```sql
-- Find users expiring in 5 days
SELECT 
  id, 
  full_name, 
  plan_expiry_date,
  plan_status
FROM profiles
WHERE 
  plan_expiry_date > NOW()
  AND plan_expiry_date <= NOW() + INTERVAL '5 days'
  AND approval_status = 'approved'
  AND payment_status = 'paid';
```

### 6. Test Expired Plan Detection

```sql
-- Find expired plans
SELECT 
  id, 
  full_name, 
  plan_expiry_date,
  due_amount,
  payment_due_date
FROM profiles
WHERE 
  plan_expiry_date <= NOW()
  AND plan_status = 'expired';
```

---

## Troubleshooting

### Issue: Constraint violation on plan_status
**Solution**: Ensure only valid values used: 'free', 'pending', 'active', 'upcoming', 'expired'

### Issue: Trigger not updating plan_status
**Solution**: Manually update records or check trigger logs in Supabase

### Issue: Notifications not appearing
**Solution**: 
1. Verify plan_expiry_date is set correctly
2. Check that approval_status = 'approved'
3. Check that payment_status = 'paid'
4. Ensure date calculation (5 days from now) is correct

### Issue: Phone number appears blank
**Solution**: 
1. User should update profile via ProfileScreen
2. Or admin can update via user details modal
3. Run: `UPDATE profiles SET phone_number = '1234567890' WHERE id = 'user-id'`

---

## Performance Tips

### Indexes Created:
- `idx_profiles_plan_status`: Use for filtering by status
- `idx_profiles_plan_expiry_date`: Use for date range queries
- `idx_profiles_payment_due_date`: Use for payment collection queries

### Query Optimization:
```sql
-- GOOD: Uses index
SELECT * FROM profiles WHERE plan_status = 'expired';

-- GOOD: Uses index
SELECT * FROM profiles 
WHERE plan_expiry_date BETWEEN NOW() AND NOW() + INTERVAL '5 days';

-- GOOD: Combined query with index
SELECT * FROM profiles 
WHERE plan_status = 'active' 
AND plan_expiry_date < NOW() + INTERVAL '7 days';
```

---

## Column Reference

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| paid_amount | numeric | 0 | Amount user has paid for plan |
| due_amount | numeric | 0 | Outstanding balance |
| payment_due_date | timestamp | NULL | Deadline for payment collection |
| plan_status | text | 'free' | Lifecycle status of plan |
| last_expiry_notification_sent | boolean | false | Track notification sent status |

---

## Backup Recommendation

Before running migration:

```sql
-- Backup profiles table
CREATE TABLE profiles_backup_20260126 AS SELECT * FROM profiles;
```

---

## Rollback Procedure

If needed to rollback:

```sql
-- Drop trigger
DROP TRIGGER IF EXISTS update_plan_status_trigger ON profiles;
DROP FUNCTION IF EXISTS update_plan_status();

-- Drop new columns
ALTER TABLE profiles
DROP COLUMN IF EXISTS paid_amount,
DROP COLUMN IF EXISTS due_amount,
DROP COLUMN IF EXISTS payment_due_date,
DROP COLUMN IF EXISTS plan_status,
DROP COLUMN IF EXISTS last_expiry_notification_sent;

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_plan_status;
DROP INDEX IF EXISTS idx_profiles_plan_expiry_date;
DROP INDEX IF EXISTS idx_profiles_payment_due_date;
```

---

## Support Queries

### Get All Users Needing Payment Collection
```sql
SELECT 
  id, 
  full_name, 
  email,
  phone_number,
  due_amount,
  payment_due_date,
  plan_expiry_date
FROM profiles
WHERE 
  plan_status = 'expired'
  AND due_amount > 0
ORDER BY payment_due_date ASC;
```

### Get Users Expiring in Next 7 Days
```sql
SELECT 
  id, 
  full_name, 
  email,
  plan,
  plan_expiry_date
FROM profiles
WHERE 
  plan_status = 'active'
  AND plan_expiry_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY plan_expiry_date ASC;
```

### Get Revenue Status
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN plan_status = 'active' THEN 1 END) as active_plans,
  COUNT(CASE WHEN plan_status = 'expired' THEN 1 END) as expired_plans,
  COUNT(CASE WHEN due_amount > 0 THEN 1 END) as with_due_amounts,
  SUM(COALESCE(paid_amount, 0)) as total_paid,
  SUM(COALESCE(due_amount, 0)) as total_outstanding
FROM profiles
WHERE approval_status = 'approved';
```

---

Done! Your payment and plan tracking system is ready to use.
