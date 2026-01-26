# Food Submission System - Quick Reference

## 🎯 What is it?
Users can submit new food items to the database. Admins review and approve them before they're added to the main database.

## 📱 User Side

### How to Submit Food
1. Open **Daily Nutrition** tracker
2. Click **"+" button** in top-right header
3. Fill in food details (per 100g):
   - Dish name *
   - Calories *
   - Protein *
   - Carbs *
   - Fat *
   - Fibre (optional)
   - Sodium (optional)
   - Notes (optional)
4. Click **"Submit for Approval"**
5. Success! Admin will review

### Fields Required
```
Dish Name: Food name (required)
Calories: kcal (required, > 0)
Protein: grams (required)
Carbs: grams (required)
Fat: grams (required)
Fibre: grams (optional)
Sodium: mg (optional)
Notes: Info about food (optional)
```

### What Happens Next
- Food saved as "PENDING"
- Admin notified
- Admin reviews usually within 24 hours
- If approved → Food added to database for all users
- If rejected → Admin notes explain why

## 👨‍💼 Admin Side

### How to Review Foods
1. Go to **Admin Dashboard**
2. Click **"Food Review"** tab (shows pending count)
3. See list of all submissions
4. Click submission to see details
5. For PENDING submissions:
   - View nutrition data
   - View user's notes
   - Add admin notes (optional)
   - Click **Approve** or **Reject**

### Approve Action
- Food added to `indian_foods` table
- Immediately available to all users
- Marked as "APPROVED"
- Admin notes saved for record

### Reject Action
- Food NOT added to database
- Submission marked "REJECTED"
- Admin notes explaining rejection
- Can help user understand why

### Filters Available
- **Pending**: Only submissions waiting for review
- **All**: All submissions (pending, approved, rejected)

## 🗄️ Database Changes

### New Table: `pending_food_submissions`
Stores all user submissions with approval status

**Status Values:**
- `pending` - Awaiting admin review
- `approved` - Added to indian_foods
- `rejected` - Declined by admin

### Modified Table: `indian_foods`
No structural changes - just receives approved foods

## 🔒 Security

**RLS Policies Enforce:**
- Users see only their own submissions
- Admins see all submissions
- Users can't approve/reject
- Only admins can modify status

## 📊 Workflow Diagram

```
USER SUBMITS FOOD
        ↓
    PENDING
   (in queue)
        ↓
   ADMIN REVIEW
        ↓
    ┌───────────┐
    ↓           ↓
 APPROVED    REJECTED
    ↓           ↓
 ACTIVE      ARCHIVED
(all users)   (history)
```

## 🎨 UI Components

### User Modal (DailyTracker Header)
- **Trigger**: Click "+" button
- **Title**: "Suggest Food Item"
- **Fields**: 8 inputs (name, cals, macros, optional nutrients, notes)
- **Buttons**: Submit for Approval, Cancel
- **Feedback**: Success/error messages

### Admin Screen (AdminFoodApprovals)
- **Header**: Shows pending count
- **Tabs**: Pending, All
- **List**: Cards showing submissions
- **Detail Modal**: Full nutrition + approve/reject buttons
- **Badges**: Status indicators (Pending/Approved/Rejected)

## 📝 Common Use Cases

### User Scenario
```
"I eat a specific Indian dish that's not in the database"
→ Click "+" in DailyTracker
→ Submit nutrition details
→ Admin approves next day
→ Food now searchable for all users
```

### Admin Scenario
```
"I see 5 pending submissions"
→ Click "Food Review" in Admin Dashboard
→ Review each one
→ Approve 4 (valid data)
→ Reject 1 (duplicate of existing food)
→ Return to pending - now shows 0
```

## ⚠️ Important Notes

- All nutrition values stored **per 100g**
- Users submit estimated values
- Admins should verify against reliable sources
- Duplicate foods should be rejected
- Invalid data (0 calories, etc.) should be rejected

## 🚀 Setup Steps

1. **Run Migration**
   ```sql
   -- Copy migration_food_submissions.sql content
   -- Paste in Supabase SQL Editor
   -- Execute
   ```

2. **Test User Submit**
   - Login as regular user
   - Go to Daily Nutrition
   - Click "+"
   - Submit test food

3. **Test Admin Review**
   - Login as admin
   - Go to Admin Dashboard
   - Click "Food Review"
   - Approve test submission

4. **Verify In Database**
   - User can now search for approved food
   - Food appears in DailyTracker search results

## 📈 Metrics to Track

- Total submissions per day
- Approval rate (%)
- Avg. time to review
- Popular foods submitted
- Rejection reasons

## 🔍 Quality Checks

Before approving, admin should verify:
- [ ] Food name is accurate
- [ ] Nutrition values are reasonable
- [ ] Not a duplicate of existing food
- [ ] Data matches reliable source (USDA, nutrition database)
- [ ] All required fields filled

## 🎓 Tips for Users

- Look up nutrition data from reliable sources
- Use USDA FoodData Central for Indian dishes
- Include sources in submission notes
- Check if food already exists before submitting
- Submit homemade recipes with ingredient breakdown

## 💡 Tips for Admins

- Create a checklist for verification
- Keep notes of rejected foods to guide users
- Check for duplicates before approving
- Document data sources in admin notes
- Review rejected foods periodically

## 🐛 Troubleshooting

**Problem**: Submission not appearing
- Check if status is really "pending"
- Refresh the page
- Check user_id matches
- Verify RLS policies are active

**Problem**: Can't approve food
- Check if you're logged in as admin
- Verify role = 'admin' in profiles
- Check if submission still has pending status
- Verify indian_foods table exists

**Problem**: User can see other submissions
- Check RLS policies are enabled
- Verify SELECT policy includes auth.uid() = user_id
- Check if user is actually admin (shouldn't see others)

## 📱 Responsive Design
- Mobile: Full width modal
- Tablet: Centered modal, 90vh height
- Desktop: Same, scrollable content

---

**Files to Deploy:**
1. `migration_food_submissions.sql` (database)
2. `screens/AdminFoodApprovals.tsx` (new component)
3. Modified files: DailyTracker.tsx, App.tsx, AdminDashboard.tsx, types.ts

**Status:** ✅ Ready to Deploy
