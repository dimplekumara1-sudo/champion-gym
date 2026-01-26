# 🥗 Food Management System - Quick Reference

## 🚀 Quick Start

### Access the Panel
1. Login as **Admin**
2. Go to **Admin Dashboard**
3. Click **"Food Nutrition Data" (🥗)**
4. Start managing!

## 📤 Upload Methods

### Option 1: Download Template
```
1. Click "📥 Download CSV Template"
2. Fill in your food data
3. Save and upload
```

### Option 2: Use Your Own File
```
Supported formats:
- CSV (.csv)
- Excel (.xlsx, .xls)

Required columns:
- Dish Name
- Calories (kcal)

Optional columns:
- Protein (g)
- Carbohydrates (g)
- Fats (g)
- And many more...
```

### Option 3: Upload Process
```
1. Click upload area or select file
2. Choose CSV/XLSX file
3. Review preview (shows first 10 items)
4. Click "✓ Upload All Items"
5. Wait for completion message
```

## 🔍 Search & Management

```
Search:
- Type dish name in search box
- Results filter in real-time
- Browse paginated results

Manage:
- Click 🗑️ to delete item
- Click "🗑️ Clear All" to delete everything
- Pagination controls at bottom
```

## 📊 CSV Format Example

```csv
Dish Name,Calories (kcal),Carbohydrates (g),Protein (g),Fats (g),Free Sugar (g),Fibre (g),Sodium (mg),Calcium (mg),Iron (mg),Vitamin C (mg),Folate (µg)
Dal Makhani,234,12,8,15,2,3,500,120,2,10,50
Butter Chicken,312,8,24,22,1,1,450,80,1,5,20
Biryani,289,38,12,8,0.5,1,580,60,2,3,30
Samosa,150,18,3,7,1,1,200,30,1,2,15
```

## ✅ Column Headers Recognized

### Required
- Dish Name / Name
- Calories / Calories (kcal) / Calorie

### Common Macros
- Protein / Protein (g)
- Carbohydrates / Carbs / Carbohydrates (g)
- Fats / Fat / Fats (g)

### Common Micros
- Fiber / Fibre / Fibre (g)
- Calcium / Calcium (mg)
- Iron / Iron (mg)
- Sodium / Sodium (mg)
- Vitamin C / Vitamin C (mg)
- Folate / Folate (µg)
- Sugar / Free Sugar / Sugar (g)

## ⚙️ Configuration

### Default Settings
- **Batch Size**: 50 items per batch
- **Page Size**: 20 items per page
- **Preview Limit**: Shows first 10 items
- **Max Upload**: 1000 items per file

### Database Info
- **Table**: `indian_foods`
- **Rows**: Unlimited
- **Storage**: Supabase PostgreSQL
- **Access**: Public read, Admin write

## 🎯 Common Tasks

### Upload 100 Food Items
```
1. Prepare CSV with 100 rows
2. Click upload area
3. Select your CSV
4. Review (shows 10/100)
5. Click Upload
6. Wait for completion (~5-10 seconds)
```

### Search for "Dal"
```
1. In search box, type: dal
2. Results filter to matching items
3. Browse results with pagination
```

### Delete All Foods
```
1. Click "🗑️ Clear All"
2. Confirm in dialog
3. All foods deleted
```

### Update Existing Food
```
1. Upload file with same dish name
2. System detects duplicate
3. Updates nutrition values
4. No duplicates created
```

## 🚨 Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "CSV file is empty" | No data in file | Add rows to CSV |
| "CSV must contain Dish Name" | Missing column | Use template |
| "Invalid calories value" | Non-numeric | Check format |
| "Unsupported file format" | Wrong extension | Use CSV or XLSX |
| "Network error" | Connection issue | Check internet |

## 💾 File Requirements

```
✅ Valid CSV:
- UTF-8 encoding
- Comma-separated values
- Headers in first row
- Numeric values use . (not ,)

✅ Valid XLSX:
- Standard Excel format
- Headers in first row
- Single sheet
- Numeric formatting
```

## 📈 Performance Tips

```
For large uploads:
- Keep files under 500 items
- Use XLSX for structured data
- Check internet connection
- Allow 10-15 seconds per 500 items

For searches:
- Use specific keywords
- Pagination loads 20 at a time
- Searches use indexes (fast)
```

## 🔐 Security & Permissions

```
Who can access?
- Admin users: Full access (upload/edit/delete)
- Regular users: Read-only access

Database security:
- Row Level Security (RLS) enabled
- Unique constraint on dish names
- Encrypted connection to database
- Automatic backups
```

## 🔗 Integration with App

### In Your Code
```typescript
import { searchIndianFoods, getHighProteinFoods } from '@/lib/indianFoodService';

// Search foods
const foods = await searchIndianFoods({
  maxCalories: 300,
  minProtein: 10
});

// Get high-protein options
const protein = await getHighProteinFoods(15);
```

### In Screens
```typescript
// Import service
import { searchFoodByName } from '@/lib/indianFoodService';

// Use in component
const [foods, setFoods] = useState([]);

useEffect(() => {
  const fetchFoods = async () => {
    const results = await searchFoodByName('dal');
    setFoods(results);
  };
  fetchFoods();
}, []);
```

## 📞 Support

### Common Issues

**Upload hangs?**
- Check file size
- Verify internet connection
- Try smaller batch

**Search not working?**
- Clear browser cache
- Refresh page
- Check spelling

**Items not updating?**
- Ensure same dish name
- Check for extra spaces
- Verify permissions

### Resources
- Full Guide: See `FOOD_MANAGEMENT_GUIDE.md`
- Food Service Docs: See `INDIAN_FOODS_SETUP.md`
- Code Examples: See `CODE_EXAMPLES_AND_USAGE.md`

## 📊 Dashboard Stats

```
Top of page shows:
- 🥗 Total Items: Count of all foods
- Pagination info
- Search results count
- Upload progress
```

## 🎨 UI Components

### Sections
1. **Header** - Navigation & stats
2. **Upload Form** - File upload & template
3. **Preview** - Data review before upload
4. **Search** - Find & filter foods
5. **Table** - Browse all foods
6. **Pagination** - Navigate pages

### Buttons
- 📤 Upload file
- 📥 Download template
- ✓ Confirm upload
- 🗑️ Delete item
- 🗑️ Clear all
- ← Previous page
- Next → page

---

**Version**: 1.0  
**Last Updated**: January 26, 2026  
**For**: PowerFlex Elite Fitness Coach Admin Panel
