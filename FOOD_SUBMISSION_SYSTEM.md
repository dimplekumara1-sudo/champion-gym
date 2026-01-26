# Food Submission & Approval System - Complete Guide

## 📋 Overview

The food submission system allows users to contribute new food items to the database, which are then reviewed and approved by admins. This crowdsources the food database while maintaining quality control.

### User Flow
```
User in DailyTracker
    ↓
Clicks "+" Button in Header
    ↓
Submits Food Item Details
    ↓
Food Saved as PENDING
    ↓
Admin Reviews Submission
    ↓
Admin APPROVES → Food Added to indian_foods
Admin REJECTS → Submission Marked as Rejected
```

## 🗄️ Database Schema

### `pending_food_submissions` Table
Stores all user-submitted food items awaiting admin review.

**Columns:**
- `id` - Primary key
- `user_id` - User who submitted (FK to auth.users)
- `dish_name` - Food name *
- `calories_kcal` - Calories per 100g *
- `carbohydrates_g` - Carbs per 100g *
- `protein_g` - Protein per 100g *
- `fats_g` - Fat per 100g *
- `free_sugar_g` - Optional sugar content
- `fibre_g` - Optional fibre content
- `sodium_mg` - Optional sodium content
- `calcium_mg` - Optional calcium content
- `iron_mg` - Optional iron content
- `vitamin_c_mg` - Optional vitamin C content
- `folate_mcg` - Optional folate content
- `submission_notes` - User's notes/source
- `status` - 'pending', 'approved', or 'rejected'
- `admin_notes` - Admin's review notes
- `reviewed_by` - Admin who reviewed (FK to auth.users)
- `reviewed_at` - Timestamp of review
- `created_at` - Submission timestamp
- `updated_at` - Last update timestamp

**Indexes:**
- `user_id` - For user's submissions
- `status` - For filtering by status
- `created_at` - For sorting chronologically

**RLS Policies:**
- Users view only their own submissions
- Admins view all submissions
- Users can insert their own submissions
- Only admins can update/delete submissions

## 🔧 Setup Instructions

### 1. Database Migration
Run migration file: `migration_food_submissions.sql`

```bash
# Via Supabase Dashboard:
# SQL Editor > New Query > Paste migration_food_submissions.sql > Execute
```

### 2. Files Created

**User-facing:**
- Modified: `screens/DailyTracker.tsx`
  - Added submission form modal
  - Added "+" button in header
  - Added submit handler function

**Admin-facing:**
- Created: `screens/AdminFoodApprovals.tsx`
  - Review pending submissions
  - Approve/reject interface
  - Admin notes feature

**Navigation:**
- Modified: `types.ts` - Added ADMIN_FOOD_APPROVALS screen
- Modified: `App.tsx` - Import and routing
- Modified: `screens/AdminDashboard.tsx` - Added Food Review button

## 👥 User Feature: Submit Food

### Location
**DailyTracker.tsx** - Header with "+" icon button

### Access
1. User navigates to Daily Nutrition tracker
2. Clicks "+" circle icon in top-right header
3. Submit Food modal opens

### Form Fields

**Required:**
- Dish Name
- Calories (kcal)
- Protein (g)
- Carbs (g)
- Fat (g)

**Optional:**
- Fibre (g)
- Sodium (mg)
- Submission Notes (for sources, recipes, etc.)

### Process
1. User fills in food details per 100g
2. Can add submission notes (source, recipe link, etc.)
3. Clicks "Submit for Approval"
4. Food saved as PENDING status
5. Success message shown
6. User can track approval status (future enhancement)

### Validation
- Dish name required
- Calories must be > 0
- All input ranges validated
- Error messages shown for invalid data

### UI Features
- Clean modal form
- Real-time validation feedback
- Loading state during submission
- Success/error messages
- Easy cancel option

## ⚖️ Admin Feature: Review & Approve

### Location
**Admin Dashboard** → "Food Review" tab (new button)
Opens: `AdminFoodApprovals.tsx`

### Dashboard
Shows:
- Count of pending submissions
- List of all submissions with status badges
- Filter options: Pending / All

### Submission Card Display
Each submission shows:
- Dish name
- Nutrition breakdown (cal, protein, carbs, fat)
- Status badge (Pending/Approved/Rejected)
- Submission date
- User's notes (if any)

### Review Process

**For PENDING submissions:**
1. Click submission to open detail modal
2. View full nutrition data
3. View submitter's notes
4. Add admin notes (optional)
5. Choose action:
   - **Approve**: Adds food to `indian_foods` table immediately available to all users
   - **Reject**: Marks as rejected with admin notes

**For REVIEWED submissions:**
- View status and review details
- Cannot modify approved/rejected submissions
- See admin notes left during review

### Admin Notes
- Used to explain approval/rejection
- Can cite sources, data verification notes, etc.
- Visible to admins only
- Not shared with user (future: could add user feedback)

### Approval Workflow
```
Click Approve
    ↓
Validation (required fields exist)
    ↓
Insert into indian_foods table
    ↓
Update pending_food_submissions status to 'approved'
    ↓
Set reviewed_by and reviewed_at
    ↓
Save admin_notes
    ↓
Food now available to all users
```

## 📊 Data Storage Locations

### User Submissions (Pending)
**Table:** `pending_food_submissions`
- All submissions awaiting review
- User info included for tracking

### Approved Foods (Active)
**Table:** `indian_foods`
- Only approved foods
- Available for all users to track
- No submission/approval metadata stored

## 🔒 Security & Privacy

### Row-Level Security
**Users:**
- Can only view their own submissions
- Cannot see other users' submissions

**Admins:**
- Can view all submissions
- Can modify and delete
- Can mark as approved/rejected

### Data Validation
- Nutrition values must be positive
- Dish names cannot be empty
- Food names must be unique in final table

## 📝 User Experience

### Submitting User
```
User Sees:
1. Success message: "✓ Food submitted! Admin will review soon"
2. Modal closes after 2 seconds
3. Can continue tracking other foods

Process:
- No payment or friction
- Clear success feedback
- Easy to understand
```

### Admin
```
Admin Sees:
1. Notification of pending submissions
2. "Food Review" tab showing pending count
3. Review interface with all details
4. Easy approve/reject buttons
5. Can add notes for record keeping
```

## 🎯 Key Features

✅ User-Contributed Database
- Users can suggest new foods
- Builds database through community

✅ Quality Control
- All submissions require admin approval
- Prevents data corruption
- Maintains data integrity

✅ Approval Workflow
- Clear pending/approved/rejected states
- Admin notes for tracking decisions
- Timestamp tracking for audits

✅ Data Reuse
- Once approved, food available to all users
- Reduces duplicate submissions
- Optimizes database growth

✅ Mobile Optimized
- Works on all screen sizes
- Modal forms responsive
- Easy-to-use interface

## 🚀 Usage Workflow

### For Regular Users

1. **Tracking meals normally** - See DailyTracker with food search
2. **Notice missing food** - Click "+" icon
3. **Submit details** - Fill form with food nutrition per 100g
4. **Success message** - Food now in queue for admin review
5. **Continue using app** - Can add other foods while waiting

### For Admins

1. **Daily check** - Go to Admin Dashboard
2. **Click "Food Review"** - See pending submissions count
3. **Review each submission** - Check if data looks valid
4. **Approve or Reject**:
   - Approve → Food added to main database
   - Reject → Add notes explaining why
5. **Continue checking** - Look for more pending submissions

## 📈 Database Growth

```
Over Time:
Day 1: 100 foods in indian_foods (admin curated)
Day 10: 50 pending submissions (users contributing)
Day 10 Admin Review: 40 approved, 10 rejected
Day 11: 140 foods in indian_foods
```

## 🔄 Future Enhancements

1. **User Notifications**
   - Email when submission is approved/rejected
   - Show rejection reason in app

2. **Duplicate Detection**
   - Auto-check for similar food names
   - Suggest existing foods before submitting

3. **Submission Tracking**
   - Users can see status of their submissions
   - View approval timeline

4. **Bulk Approvals**
   - Admin can approve multiple at once
   - Batch rejection with reason

5. **Source Tracking**
   - Link to nutrition database used
   - Dietary database attribution

6. **Community Voting**
   - Users upvote submitted foods
   - Admin prioritizes reviews

## 📁 Files Modified

**Created:**
1. `migration_food_submissions.sql` - Database schema
2. `screens/AdminFoodApprovals.tsx` - Admin review interface

**Modified:**
1. `screens/DailyTracker.tsx`:
   - Added state for submission form
   - Added "+" button in header
   - Added submission modal
   - Added handleSubmitFood() function

2. `types.ts`:
   - Added 'ADMIN_FOOD_APPROVALS' to AppScreen

3. `App.tsx`:
   - Import AdminFoodApprovals
   - Added case for ADMIN_FOOD_APPROVALS routing

4. `screens/AdminDashboard.tsx`:
   - Added "Food Review" navigation button

## ✅ Testing Checklist

- [ ] Run migration_food_submissions.sql
- [ ] Login as regular user
- [ ] Navigate to DailyTracker
- [ ] Click "+" button in header
- [ ] Submit new food with all details
- [ ] Verify success message
- [ ] Modal closes and form resets
- [ ] Login as admin
- [ ] Go to Admin Dashboard
- [ ] Click "Food Review" button
- [ ] See submitted food in pending list
- [ ] Click food to view details
- [ ] Approve submission
- [ ] Verify food now in indian_foods table
- [ ] Regular user can now search and use food
- [ ] Submit another food and test rejection
- [ ] Verify rejection saves admin notes
- [ ] Check RLS - user can only see own submissions
- [ ] Check RLS - admin can see all submissions

## 🎓 How Per-100g Works

All food nutrition stored per 100g:
```
User submits:
Paneer Butter Masala
- Calories: 150 kcal per 100g
- Protein: 8g per 100g
- Carbs: 4g per 100g
- Fat: 10g per 100g

When user logs 250g:
- Calories: 150 × (250/100) = 375 kcal
- Protein: 8 × 2.5 = 20g
- Carbs: 4 × 2.5 = 10g
- Fat: 10 × 2.5 = 25g
```

## 📞 Support Notes

**For Users:**
- Food submissions usually reviewed within 24 hours
- Admins verify nutrition data against reliable sources
- Invalid or duplicate submissions will be rejected
- Can submit as many foods as needed

**For Admins:**
- Check pending count regularly
- Verify data against nutrition databases
- Use admin notes to document decisions
- Rejected foods help track common errors

