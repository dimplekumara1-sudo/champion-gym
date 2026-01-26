# Indian Food Nutrition Database Setup Guide

## Overview
This guide covers the integration of the Indian Food Nutrition dataset into your Supabase database. The dataset contains 255+ Indian food items with comprehensive nutritional information.

## What's Included

### Dataset Information
- **Source**: Kaggle - Indian Food Nutrition Dataset
- **Records**: 255+ Indian dishes
- **Nutritional Data**: 
  - Calories (kcal)
  - Macronutrients (Carbs, Protein, Fat)
  - Micronutrients (Calcium, Iron, Vitamin C, Folate)
  - Other nutrients (Sodium, Fiber, Free Sugar)

### Database Schema
A new table `indian_foods` has been created with the following structure:

```sql
CREATE TABLE indian_foods (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  dish_name TEXT NOT NULL UNIQUE,
  calories_kcal NUMERIC NOT NULL,
  carbohydrates_g NUMERIC NOT NULL,
  protein_g NUMERIC NOT NULL,
  fats_g NUMERIC NOT NULL,
  free_sugar_g NUMERIC,
  fibre_g NUMERIC,
  sodium_mg NUMERIC,
  calcium_mg NUMERIC,
  iron_mg NUMERIC,
  vitamin_c_mg NUMERIC,
  folate_mcg NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Row Level Security (RLS) Policies
- **Read Access**: All authenticated users can read food data
- **Write Access**: Admin users only can insert, update, or delete

## Setup Instructions

### Step 1: Install Dependencies
```bash
npm install
```

This installs csv-parse and tsx, which are required for the upload script.

### Step 2: Prepare Environment
Ensure your Supabase environment variables are set:
```bash
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 3: Download the Dataset
The dataset has already been downloaded to:
```
~/Downloads/indian-food-nutrition/Indian_Food_Nutrition_Processed.csv
```

If you need to re-download it:
```bash
curl -L -o ~/Downloads/indian-food-nutrition.zip https://www.kaggle.com/api/v1/datasets/download/batthulavinay/indian-food-nutrition
```

### Step 4: Upload Data to Supabase
```bash
npm run upload:indian-foods
```

This script will:
1. Parse the CSV file
2. Transform data to match the database schema
3. Batch upload records to Supabase (100 at a time)
4. Display progress as it uploads

## Using the Indian Foods Service

### Import the Service
```typescript
import {
  searchIndianFoods,
  getHighProteinFoods,
  getLowCalorieFoods,
  getFoodsByCalorieRange,
  searchFoodByName,
  getNutritionSummary,
  type IndianFood
} from '@/lib/indianFoodService';
```

### Example Usage

#### Search foods by name
```typescript
const foods = await searchFoodByName('dal');
```

#### Get high-protein foods
```typescript
const proteinFoods = await getHighProteinFoods(15); // min 15g protein
```

#### Get low-calorie options
```typescript
const lightMeals = await getLowCalorieFoods(200); // max 200 calories
```

#### Complex search with filters
```typescript
const results = await searchIndianFoods({
  maxCalories: 300,
  minProtein: 10,
  searchTerm: 'rice'
});
```

#### Get nutrition summary
```typescript
const food = await getIndianFoodById(1);
if (food) {
  const summary = getNutritionSummary(food);
  // Returns: [
  //   { label: 'Calories', value: '50.0 kcal' },
  //   { label: 'Protein', value: '2.5g' },
  //   ...
  // ]
}
```

## Integration Ideas

### 1. Food Recommendations
Display Indian food options based on:
- User's daily calorie goals
- Protein targets
- Dietary preferences

### 2. Meal Planning
Build meal plans using Indian foods that match nutritional targets

### 3. Food Logging
Allow users to log Indian dishes they consume and automatically calculate nutrition

### 4. Search & Browse
Create a searchable interface for users to explore Indian cuisine with nutrition facts

### 5. Macro Balancing
Help users find combinations of Indian foods that balance macronutrients

## Available Service Functions

### `searchIndianFoods(filters)`
Advanced search with multiple filter options

**Parameters:**
- `filters.maxCalories`: number
- `filters.minProtein`: number
- `filters.maxFat`: number
- `filters.searchTerm`: string

**Returns:** `Promise<IndianFood[]>`

### `getIndianFoodById(id)`
Fetch a specific food by ID

**Returns:** `Promise<IndianFood | null>`

### `searchFoodByName(name)`
Search foods by partial name match (limit 20 results)

**Returns:** `Promise<IndianFood[]>`

### `getHighProteinFoods(minProtein)`
Get high-protein options (default 10g minimum)

**Returns:** `Promise<IndianFood[]>`

### `getLowCalorieFoods(maxCalories)`
Get low-calorie options (default 200 kcal maximum)

**Returns:** `Promise<IndianFood[]>`

### `getFoodsByCalorieRange(min, max)`
Get foods within a specific calorie range

**Returns:** `Promise<IndianFood[]>`

### `getAllIndianFoods(page, pageSize)`
Get paginated list of all foods

**Parameters:**
- `page`: number (default 1)
- `pageSize`: number (default 20)

**Returns:** `Promise<{ foods: IndianFood[]; total: number }>`

### `getNutritionSummary(food)`
Format food nutrition data for display

**Returns:** `Array<{ label: string; value: string }>`

## Database Indexes
The following indexes have been created for performance:
- `idx_indian_foods_dish_name` - Fast name searches
- `idx_indian_foods_calories` - Quick calorie-based filtering
- `idx_indian_foods_protein` - Efficient protein lookups

## Troubleshooting

### Upload Script Fails
1. Ensure csv-parse is installed: `npm install csv-parse`
2. Check that Supabase credentials are set in environment
3. Verify the CSV file exists at the expected location
4. Check Supabase logs for any constraint violations

### Slow Queries
- Indexes are already created for common queries
- Use specific filters to limit result sets
- Consider pagination for large result sets

### RLS Policy Errors
- Ensure your user is authenticated for read operations
- Use the service role key for admin operations (uploads)
- Check that your user role is properly set for admin operations

## API Schema Reference

```typescript
interface IndianFood {
  id: number;
  dish_name: string;
  calories_kcal: number;
  carbohydrates_g: number;
  protein_g: number;
  fats_g: number;
  free_sugar_g: number | null;
  fibre_g: number | null;
  sodium_mg: number | null;
  calcium_mg: number | null;
  iron_mg: number | null;
  vitamin_c_mg: number | null;
  folate_mcg: number | null;
  created_at: string;
  updated_at: string;
}
```

## Next Steps

1. Install dependencies: `npm install`
2. Run the upload script: `npm run upload:indian-foods`
3. Verify data in Supabase dashboard
4. Integrate `indianFoodService` into your app screens
5. Create UI components to display and search Indian foods

---

For more information about the dataset, visit: https://www.kaggle.com/datasets/batthulavinay/indian-food-nutrition
