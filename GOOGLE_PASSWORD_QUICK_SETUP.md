# Quick Setup Guide

## Two New Features Implemented ✅

### 1. Google Password Setup (for unified login)
### 2. Category Video Filtering in Explore

---

## What You Need To Do

### Step 1: Apply Database Migration ⚡

Run this SQL in Supabase SQL Editor:

```sql
-- Add has_password column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false;

-- Add category_id column to explore_videos
ALTER TABLE explore_videos ADD COLUMN IF NOT EXISTS category_id UUID 
  REFERENCES workout_categories(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_explore_videos_category_id 
  ON explore_videos(category_id);
```

### Step 2: Update Explore Videos (Optional but Recommended)

If you have existing explore_videos without category_id:

```sql
-- Link videos to their appropriate categories
-- Example: Update the first video to the first category
UPDATE explore_videos 
SET category_id = (SELECT id FROM workout_categories WHERE is_active = true LIMIT 1)
WHERE category_id IS NULL;
```

### Step 3: Verify Your Database

Check if columns were added:

```sql
-- Check profiles table
SELECT has_password FROM profiles LIMIT 1;

-- Check explore_videos table
SELECT category_id FROM explore_videos LIMIT 1;
```

---

## Features Explained

### Feature 1: Google Password Setup

**User sees this when:**
- They sign in with Google for the first time
- After completing onboarding

**What happens:**
1. Screen asks them to create a password
2. Password must be:
   - At least 8 characters
   - Have uppercase & lowercase letters
   - Have at least 1 number
3. User can create password OR skip for later
4. Password is saved securely in Supabase

**Benefits:**
✓ Users can now log in with email & password  
✓ Better account security  
✓ Easy account recovery  
✓ Unified login experience  

---

### Feature 2: Category Video Filtering

**User experience:**
1. Open Explore screen
2. See workout categories at bottom
3. Click any category → Videos load for that category
4. Click "Clear Filter" → Back to all videos

**Visual feedback:**
- Selected category gets primary color border
- Checkmark icon appears on selected category
- "Videos in this Category" section appears
- Video grid shows filtered results

---

## File Changes Summary

### New Files Created
- `screens/GooglePasswordSetup.tsx` - Password setup screen
- `GOOGLE_PASSWORD_CATEGORY_FILTERING.md` - Full documentation
- `GOOGLE_PASSWORD_QUICK_SETUP.md` - This file
- `supabase/migrations/20260125_add_google_password_support.sql` - Database changes

### Files Modified
- `App.tsx` - Added Google password detection
- `types.ts` - Added GOOGLE_PASSWORD_SETUP screen
- `ExploreScreen.tsx` - Added category filtering

---

## Testing

### Test Google Password Setup
1. Sign up with Google
2. Complete onboarding (goal, gender, height, weight, plan)
3. Should see "Secure Your Account" screen
4. Create a password (or skip)
5. Continue to dashboard
6. Try logging out and back in with email + new password

### Test Category Filtering
1. Go to Explore screen
2. Scroll down to "Workout Categories"
3. Click any category
4. Videos should load in "Videos in this Category" section
5. Click "Clear Filter" to reset

---

## Common Questions

**Q: Can users skip password setup?**  
A: Yes! They can click "Skip for Now" and set it up later from profile settings.

**Q: What if a user already has a password?**  
A: They won't see the password setup screen - they'll go straight to onboarding.

**Q: Will category filtering work if I don't set category_id?**  
A: No, you need to populate category_id for videos to show. Update your videos with the SQL from Step 2.

**Q: Can I change password requirements?**  
A: Yes, edit the validation logic in `GooglePasswordSetup.tsx` in the `validatePassword()` function.

**Q: Where do users set their password later?**  
A: You can add a "Change Password" button in ProfileScreen settings.

---

## Verification Checklist

- [ ] Database migration applied successfully
- [ ] `has_password` column added to profiles
- [ ] `category_id` column added to explore_videos
- [ ] Index created on category_id
- [ ] Explore videos have category_id values
- [ ] No TypeScript errors in build
- [ ] App compiles without errors
- [ ] Google sign-up shows password setup screen
- [ ] Category clicking loads videos

---

## Rollback (If Needed)

If you need to remove these changes:

```sql
-- Remove columns
ALTER TABLE profiles DROP COLUMN IF EXISTS has_password;
ALTER TABLE explore_videos DROP COLUMN IF EXISTS category_id;

-- Remove index
DROP INDEX IF EXISTS idx_explore_videos_category_id;
```

---

## Performance Notes

- ✅ Index on category_id ensures fast filtering
- ✅ Password validation happens on client-side
- ✅ No excessive database queries
- ✅ Video filtering is efficient with the index

---

## Next Steps

1. ✅ Apply database migration
2. ✅ Update videos with category_id
3. ✅ Test both features
4. ✅ Deploy to production

---

## Support

If you encounter any issues:

1. **Check browser console** for JavaScript errors
2. **Check Supabase logs** for API errors
3. **Verify migration ran** by checking table structure
4. **Review `GOOGLE_PASSWORD_CATEGORY_FILTERING.md`** for detailed docs

Everything is implemented and ready to use! 🚀
