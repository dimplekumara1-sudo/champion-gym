# Nutrition Goals System - Complete Guide

## Overview
The nutrition goals system allows users to set and edit their daily macronutrient targets (calories, protein, carbs, fats). This replaces the hardcoded 2000 kcal goal with a personalized, editable system.

## Database Schema

### `nutrition_goals` Table
```sql
- id: Primary key
- user_id: UUID reference to auth.users (unique per user)
- daily_calories_target: Daily calorie goal (default: 2000)
- daily_protein_target: Daily protein goal in grams (default: 150g)
- daily_carbs_target: Daily carbs goal in grams (default: 200g)
- daily_fat_target: Daily fat goal in grams (default: 65g)
- created_at: Timestamp of goal creation
- updated_at: Timestamp of last update
```

### RLS Policies
- Users can only view their own nutrition goals
- Users can only insert their own nutrition goals
- Users can only update their own nutrition goals
- Users can only delete their own nutrition goals

## Implementation Details

### 1. Database Setup
Run the migration file `migration_nutrition_goals.sql` to create the table and RLS policies:
```bash
# Upload via Supabase dashboard > SQL editor
```

### 2. Frontend Components

#### NutritionGoals.tsx (New Screen)
- **Path**: `/screens/NutritionGoals.tsx`
- **Features**:
  - Display current nutrition goals
  - Toggle between view and edit modes
  - Editable sliders for each macro target
  - Real-time validation of inputs
  - Automatic calculation of calorie percentage per macro
  - Display calorie balance (total from macros vs. daily goal)

#### Key Functions:
```typescript
fetchNutritionGoals(uid): Fetch user's current goals from database
handleSaveGoals(): Save or update goals in database
```

#### State Management:
```typescript
- goals: Current nutrition goals from DB
- editing: Toggle between view/edit mode
- editData: Form state with current values
- saving: Loading state during save
- error/success: User feedback messages
```

### 3. Navigation Integration

#### Types.ts
- Added `'NUTRITION_GOALS'` to `AppScreen` union type

#### App.tsx
- Import NutritionGoals component
- Added case for NUTRITION_GOALS routing

#### Dashboard.tsx
- Added "Nutrition Goals" card button
- Allows quick navigation to goal settings
- Shows goal icon and description

## How It Works

### User Flow

1. **View Goals** (Default)
   - User sees current daily targets
   - Shows macronutrient breakdown with percentages
   - Displays calorie values per macro
   - Shows calorie balance indicator

2. **Edit Goals**
   - Click "Edit Goals" button
   - Adjust sliders for:
     - Daily Calories (1000-10000 kcal)
     - Daily Protein (0-500g)
     - Daily Carbs (0-500g)
     - Daily Fat (0-300g)
   - Real-time validation
   - Save or cancel changes

3. **Save Goals**
   - First check if goals exist in database
   - If exists: UPDATE nutrition_goals
   - If not exists: INSERT into nutrition_goals
   - Refresh display with saved values

### Validation Rules
- Calories: 1000-10000 kcal
- Protein: 0-500g
- Carbs: 0-500g
- Fat: 0-300g

### Default Goals
If user has no goals in database:
- Calories: 2000 kcal
- Protein: 150g
- Carbs: 200g
- Fat: 65g

## Integration with DailyTracker

### Current Status
DailyTracker.tsx currently uses hardcoded `dailyGoal = 2000`

### Future Enhancement
To use user's nutrition goals in DailyTracker:
```typescript
// In DailyTracker.tsx
const [nutritionGoals, setNutritionGoals] = useState<NutritionGoal | null>(null);

useEffect(() => {
  if (userId) {
    fetchNutritionGoals(userId);
  }
}, [userId]);

const dailyGoal = nutritionGoals?.daily_calories_target || 2000;
const remainingCalories = Math.max(0, dailyGoal - totalCalories);
```

## Database Query Examples

### Fetch User's Nutrition Goals
```typescript
const { data, error } = await supabase
  .from('nutrition_goals')
  .select('*')
  .eq('user_id', userId)
  .single();
```

### Update User's Nutrition Goals
```typescript
const { error } = await supabase
  .from('nutrition_goals')
  .update({
    daily_calories_target: 2200,
    daily_protein_target: 160,
    daily_carbs_target: 220,
    daily_fat_target: 73,
  })
  .eq('user_id', userId);
```

### Create New Nutrition Goals
```typescript
const { error } = await supabase
  .from('nutrition_goals')
  .insert([{
    user_id: userId,
    daily_calories_target: 2000,
    daily_protein_target: 150,
    daily_carbs_target: 200,
    daily_fat_target: 65,
  }]);
```

## UI Features

### Display Mode
- Large calorie value display
- Macro cards with color coding (Red: Protein, Blue: Carbs, Amber: Fat)
- Percentage breakdown of each macro
- Calorie contribution per macro
- Calorie balance information

### Edit Mode
- Interactive sliders for each target
- Real-time value updates
- Min/max range indicators
- Calorie calculation from macros
- Validation error messages
- Save/Cancel buttons
- Loading state during save

## Styling
- Dark theme consistent with app
- Rounded corners (2xl-3xl)
- Border colors using slate-700/[#1E293B]
- Primary color for important elements
- Color-coded macros (red, blue, amber)
- Smooth transitions and hover states

## Error Handling
- Validates input ranges before saving
- Displays user-friendly error messages
- Catches database errors gracefully
- Shows success message after save
- Clears errors when user starts editing

## Files Modified/Created

### Created:
1. `migration_nutrition_goals.sql` - Database schema
2. `screens/NutritionGoals.tsx` - User interface

### Modified:
1. `types.ts` - Added NUTRITION_GOALS screen type
2. `App.tsx` - Added routing and import
3. `screens/Dashboard.tsx` - Added navigation button

## Testing Checklist

- [ ] Run migration to create nutrition_goals table
- [ ] Create new user and verify default goals appear
- [ ] Edit goals and verify save works
- [ ] Close and reopen app, verify goals persist
- [ ] Test validation (enter invalid values)
- [ ] Test on mobile viewport
- [ ] Verify RLS policies work (users can only see own goals)
- [ ] Check dashboard button navigates correctly

## Future Enhancements

1. **Auto-calculation**: Calculate goals based on user's body metrics and goal type
2. **Meal templates**: Suggest macro ratios based on fitness goal (cut/bulk/maintenance)
3. **Weekly tracking**: Show weekly progress towards goals
4. **Integration**: Use goals in DailyTracker for dynamic calorie tracking
5. **Presets**: Offer common macro splits (40-40-20, 30-50-20, etc.)
