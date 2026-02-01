# Food Items Management System - Complete Setup Guide

## Overview
A complete admin dashboard panel for uploading, managing, and organizing Indian food nutrition data. The system supports CSV and XLSX file uploads with full validation, preview, and management capabilities.

## Features

### 📤 File Upload
- **Multi-format support**: CSV and XLSX files
- **Automatic parsing**: Intelligent column detection
- **Preview before upload**: See all records before committing
- **Batch processing**: Upload up to 1000 items at once
- **Duplicate handling**: Automatically updates existing items

### 🔍 Search & Management
- **Full-text search**: Search by dish name
- **Pagination**: Browse through large datasets
- **Quick deletion**: Remove individual items or clear all
- **Real-time stats**: Total item count display
- **Validation**: Built-in data validation before upload

### 📊 Data Format Support
Recognizes common column headers:
- **Required**: Dish Name, Calories
- **Macronutrients**: Protein, Carbohydrates, Fats
- **Micronutrients**: Calcium, Iron, Fiber, Sodium, Vitamin C, Folate, Sugar

## File Structure

### New Files Created

```
lib/
├── fileParser.ts           # CSV/XLSX parsing utilities
├── indianFoodService.ts    # Database queries for food data

screens/
├── AdminIndianFoods.tsx    # Main management component

docs/
├── FOOD_MANAGEMENT_GUIDE.md (this file)
```

### Updated Files
- `types.ts` - Added 'ADMIN_INDIAN_FOODS' to AppScreen type
- `App.tsx` - Added route and import for new component
- `screens/AdminDashboard.tsx` - Added navigation button

## Setup Instructions

### 1. Install Dependencies
All required dependencies are already in your project:
- `@supabase/supabase-js` - Database access
- `xlsx` - XLSX file parsing
- `csv-parse` - CSV parsing (add if needed: `npm install csv-parse`)

### 2. Database Schema
The `indian_foods` table is already created with:
- Automatic ID generation
- Unique constraint on dish_name (prevents duplicates)
- Indexes for fast queries
- Row Level Security enabled
- Proper data types and constraints

### 3. Access the Panel
1. Log in as an admin user
2. Navigate to Admin Dashboard
3. Click on "Food Nutrition Data" (🥗)
4. Start uploading food data!

## Usage Guide

### Uploading Data

#### Method 1: Using CSV
1. Prepare your CSV with headers in the first row
2. Include required columns: Dish Name, Calories
3. Optionally include: Protein (g), Carbs (g), Fat (g), etc.
4. Click the upload area and select your file
5. Review the preview
6. Click "Upload All Items"

#### Method 2: Using XLSX
1. Prepare your Excel file with headers
2. Use the same column naming as CSV
3. Upload the file
4. Review and confirm

#### Method 3: Using Template
1. Click "Download CSV Template"
2. Fill in your food data
3. Save and upload

### Example CSV Format
```
Dish Name,Calories (kcal),Carbohydrates (g),Protein (g),Fats (g),Free Sugar (g),Fibre (g),Sodium (mg),Calcium (mg),Iron (mg),Vitamin C (mg),Folate (µg)
Dal Makhani,234,12,8,15,2,3,500,120,2,10,50
Butter Chicken,312,8,24,22,1,1,450,80,1,5,20
Biryani,289,38,12,8,0.5,1,580,60,2,3,30
```

### Data Validation Rules
- **Dish Name**: Required, non-empty
- **Calories**: Required, must be numeric and >= 0
- **Protein**: Required, must be numeric and >= 0
- **Carbs**: Required, must be numeric and >= 0
- **Fat**: Required, must be numeric and >= 0
- **Other nutrients**: Optional numeric values

### Searching and Managing
1. Use the search box to filter by dish name
2. Results are paginated (20 items per page)
3. Click the delete button (🗑️) to remove an item
4. Confirm the deletion in the popup
5. Use "Clear All" to delete all items at once

## File Parser Utilities

### Functions in `lib/fileParser.ts`

#### `parseFile(file: File): Promise<ParsedFoodRecord[]>`
Main function to parse either CSV or XLSX files
```typescript
const records = await parseFile(file);
```

#### `parseCSVFile(file: File): Promise<ParsedFoodRecord[]>`
Specifically parse CSV files with intelligent column detection
```typescript
const records = await parseCSVFile(csvFile);
```

#### `parseXLSXFile(file: File): Promise<ParsedFoodRecord[]>`
Parse Excel files with automatic column mapping
```typescript
const records = await parseXLSXFile(xlsxFile);
```

#### `validateFoodRecords(records: ParsedFoodRecord[])`
Validate parsed records and return errors
```typescript
const validation = validateFoodRecords(records);
if (!validation.valid) {
  console.error(validation.errors);
}
```

#### `downloadCSVTemplate(): void`
Generate and download a CSV template for users
```typescript
downloadCSVTemplate();
```

#### `generateCSVTemplate(): string`
Generate CSV template as string
```typescript
const csv = generateCSVTemplate();
```

### ParsedFoodRecord Interface
```typescript
interface ParsedFoodRecord {
  dish_name: string;
  calories_kcal: number;
  carbohydrates_g: number;
  protein_g: number;
  fats_g: number;
  free_sugar_g?: number;
  fibre_g?: number;
  sodium_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  vitamin_c_mg?: number;
  folate_mcg?: number;
}
```

## Integration with Food Service

The `lib/indianFoodService.ts` provides several utility functions to query the food data:

```typescript
// Search foods
const foods = await searchIndianFoods({
  maxCalories: 300,
  minProtein: 10,
  searchTerm: 'dal'
});

// Get high-protein foods
const proteinFoods = await getHighProteinFoods(15);

// Get low-calorie options
const lightMeals = await getLowCalorieFoods(200);

// Get foods by calorie range
const range = await getFoodsByCalorieRange(200, 400);

// Get all foods (paginated)
const { foods, total } = await getAllIndianFoods(1, 20);
```

## Advanced Features

### Bulk Upload Optimization
- Uploads processed in batches of 50 items
- Automatic duplicate detection and update
- Progress indicators for large uploads
- Error handling with detailed messages

### Column Header Recognition
The parser recognizes multiple column naming variations:
- "Dish Name" or "Name"
- "Calories (kcal)" or "Calories" or "Calorie"
- "Protein (g)" or "Protein"
- "Carbohydrates (g)" or "Carbs"
- "Fats (g)" or "Fat"
- "Fiber (g)", "Fibre (g)", "Fibre"
- And many more variations...

### Error Handling
All errors are displayed with context:
- File parsing errors
- Validation errors with row numbers
- Database upload errors
- Network errors

## Database Queries

### Get Total Food Count
```sql
SELECT COUNT(*) FROM indian_foods;
```

### Search Foods
```sql
SELECT * FROM indian_foods 
WHERE dish_name ILIKE '%dal%'
ORDER BY dish_name
LIMIT 20;
```

### Get Nutrition Stats
```sql
SELECT 
  AVG(calories_kcal) as avg_calories,
  AVG(protein_g) as avg_protein,
  MIN(calories_kcal) as min_calories,
  MAX(calories_kcal) as max_calories
FROM indian_foods;
```

## Performance Considerations

### Indexes for Query Performance
- `idx_indian_foods_dish_name` - Fast name searches
- `idx_indian_foods_calories` - Calorie-based filtering
- `idx_indian_foods_protein` - Protein lookups

### Pagination
- Default 20 items per page
- Prevents loading too much data at once
- Improves UI responsiveness

### Batch Uploading
- 50 items per batch
- Prevents large payload errors
- Maintains database performance

## Security Features

### Row Level Security (RLS)
- **Public Read**: All authenticated users can view foods
- **Admin Write**: Only admins can insert/update/delete
- **Unique Constraint**: Prevents duplicate dish names

### Data Validation
- Client-side validation before upload
- Server-side constraint enforcement
- Automatic data type conversion

## Troubleshooting

### Upload Fails
**Problem**: File won't parse
**Solution**: 
- Check file format (must be CSV or XLSX)
- Verify column headers
- Download template to see correct format
- Check for special characters in headers

### Slow Search
**Problem**: Search is slow with many items
**Solution**:
- Indexes are already created
- Narrow search terms
- Use pagination
- Check browser console for errors

### Duplicate Items
**Problem**: Same dish appears multiple times
**Solution**:
- Uploads use "upsert" so duplicates are updated
- Clean data before uploading
- Check the original data source

### Delete Not Working
**Problem**: Can't delete items
**Solution**:
- Verify you're logged in as admin
- Check RLS policies in Supabase
- Check browser console for errors
- Try clearing browser cache

## Best Practices

### Before Uploading
1. ✅ Validate data in Excel/Sheets first
2. ✅ Ensure all required columns present
3. ✅ Check for duplicate dish names
4. ✅ Review decimal formats (use . not ,)
5. ✅ Download and use template

### During Upload
1. ✅ Start with small test batch
2. ✅ Review preview carefully
3. ✅ Watch for validation errors
4. ✅ Check success message

### After Upload
1. ✅ Verify items in search
2. ✅ Test queries work correctly
3. ✅ Check nutrition values are reasonable
4. ✅ Monitor database performance

## API Reference

### AdminIndianFoods Component Props
```typescript
interface Props {
  onNavigate: (screen: AppScreen) => void;
}
```

### Supported File Formats

| Format | Extension | Status |
|--------|-----------|--------|
| CSV    | .csv      | ✅ Full support |
| Excel  | .xlsx     | ✅ Full support |
| Excel  | .xls      | ✅ Full support |

### Data Limits
- **Items per upload**: Up to 1000
- **Batch size**: 50 items per batch
- **File size**: Limited by browser (typically 100MB+)
- **Column count**: No limit
- **Row count**: No limit (uploaded in batches)

## Future Enhancements

Potential features to add:
- [ ] Duplicate detection and merging
- [ ] Recipe creation from foods
- [ ] Meal plan generation
- [ ] Nutrition tracking dashboard
- [ ] Food image uploads
- [ ] Allergen tracking
- [ ] Food ratings and reviews
- [ ] Export to CSV/Excel
- [ ] Data backup and restore

## Support & Resources

### Documentation
- Check INDIAN_FOODS_SETUP.md for dataset info
- See CODE_EXAMPLES_AND_USAGE.md for queries

### Issues
- Check browser console for errors
- Review Supabase logs in dashboard
- Validate data format matches template

### More Info
- Kaggle Dataset: https://www.kaggle.com/datasets/batthulavinay/indian-food-nutrition
- Supabase Docs: https://supabase.com/docs

---

**Version**: 1.0  
**Last Updated**: January 26, 2026  
**Created for**: Challenge Gym Elite Fitness Coach Application
