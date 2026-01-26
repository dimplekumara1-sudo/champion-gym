# Nutrition Goals - Quick Setup Guide

## 🎯 What Are Nutrition Goals?

Nutrition goals are personalized daily macronutrient targets:
- **Calories**: Total energy intake (kcal)
- **Protein**: Muscle building blocks (grams)
- **Carbs**: Energy for workouts (grams)
- **Fats**: Essential nutrients (grams)

## 🔧 How to Set Up

### Step 1: Database Migration
```bash
# Open Supabase Dashboard
# SQL Editor > New Query > Paste migration_nutrition_goals.sql content
# Click Execute
```

### Step 2: Verify Components
All components are already integrated:
- ✅ NutritionGoals.tsx created
- ✅ App.tsx routing added
- ✅ Dashboard.tsx button added
- ✅ types.ts updated

### Step 3: Test
1. Login as a user
2. Go to Dashboard
3. Click "Nutrition Goals" button
4. View default goals
5. Click "Edit Goals"
6. Adjust sliders
7. Click "Save Goals"
8. Verify changes persist after refresh

## 📱 User Journey

```
Dashboard
    ↓
[Nutrition Goals Button]
    ↓
NutritionGoals Screen
    ├─ View Mode (Default)
    │  └─ Shows current daily targets
    │  └─ Shows calorie/macro breakdown
    │  └─ Click "Edit Goals"
    │
    └─ Edit Mode
       └─ Adjust sliders
       └─ Real-time validation
       └─ Save or Cancel
       └─ Back to View Mode
```

## 🎨 Features at a Glance

### View Mode
```
┌─────────────────────────────────┐
│ Daily Calorie Goal              │
│ 2000 kcal                       │
├─────────────────────────────────┤
│ Macronutrient Targets           │
├──────────┬──────────┬───────────┤
│ Protein  │  Carbs   │   Fat     │
│  150g    │  200g    │   65g     │
│ 40%      │ 40%      │ 20%       │
│ 600 cal  │ 800 cal  │ 585 cal   │
└──────────┴──────────┴───────────┘
[Edit Goals Button]
```

### Edit Mode
```
┌─────────────────────────────────┐
│ Daily Calories: 2000            │
│ [==|========|==================] │
│ 1000                        10000│
├─────────────────────────────────┤
│ Daily Protein: 150g             │
│ [=========|====================] │
│ 0g                           500g│
├─────────────────────────────────┤
│ Daily Carbs: 200g               │
│ [=========|====================] │
│ 0g                           500g│
├─────────────────────────────────┤
│ Daily Fat: 65g                  │
│ [======|========================] │
│ 0g                           300g│
├─────────────────────────────────┤
│    [Cancel]      [Save Goals]   │
└─────────────────────────────────┘
```

## 💾 Database Structure

```
nutrition_goals
├── id (PK)
├── user_id (FK) → auth.users
├── daily_calories_target (2000)
├── daily_protein_target (150)
├── daily_carbs_target (200)
├── daily_fat_target (65)
├── created_at
└── updated_at
```

## 🔐 Security (RLS)

All operations are user-specific:
- Users can only view their own goals
- Users can only create/update their own goals
- Users can only delete their own goals

## 📊 Default Goals

When user has no goals:
```json
{
  "daily_calories_target": 2000,
  "daily_protein_target": 150,
  "daily_carbs_target": 200,
  "daily_fat_target": 65
}
```

## 🚀 What Users Can Do

1. **Set Goals** - Create personalized nutrition targets
2. **Edit Goals** - Adjust targets anytime
3. **View Progress** - See calorie/macro breakdown
4. **Calculate Balance** - Understand total vs. macro calories
5. **Track Percentages** - See macro distribution

## 🔄 Integration Points

### Current
- Dashboard shows "Nutrition Goals" button
- NutritionGoals screen is fully functional

### Future
- DailyTracker can use goals instead of hardcoded 2000 kcal
- Can show progress bars against targets
- Can suggest macros based on fitness goal

## 📝 Validation Rules

| Field | Min | Max | Step |
|-------|-----|-----|------|
| Calories | 1000 | 10000 | 100 |
| Protein | 0 | 500 | 5 |
| Carbs | 0 | 500 | 5 |
| Fat | 0 | 300 | 5 |

## 🎓 How Macros Work

### Calorie Contribution
- Protein: 4 cal/g
- Carbs: 4 cal/g
- Fat: 9 cal/g

### Example
```
If user sets:
- Protein: 150g × 4 = 600 cal
- Carbs: 200g × 4 = 800 cal
- Fat: 65g × 9 = 585 cal
Total: 1985 cal (vs. 2000 target)
Difference: +15 cal (shown in info)
```

## ✅ What's Ready

- ✅ Database table created (migration file)
- ✅ NutritionGoals component built
- ✅ All RLS policies configured
- ✅ Routing integrated
- ✅ Dashboard button added
- ✅ Full CRUD operations
- ✅ Validation implemented
- ✅ Error handling added
- ✅ Mobile responsive
- ✅ Dark theme styled

## 🚫 What's Not Included

- Auto-calculation of goals based on user metrics
- Integration with DailyTracker (can be done later)
- Macro preset suggestions
- Weekly/monthly goal tracking
- Goal recommendation system
