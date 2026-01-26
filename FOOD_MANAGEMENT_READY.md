# 🚀 Getting Started with Food Management

## ✅ Table Successfully Created!

The `indian_foods` table is now live in your Supabase database. Here's what's ready:

### Database Setup
- ✅ Table created: `indian_foods`
- ✅ Columns: 14 nutrition fields
- ✅ Indexes: 3 performance indexes
- ✅ RLS: Admin write, public read
- ✅ Constraints: Unique dish names

### What You Can Do Now

#### 1. Access the Admin Panel
```
1. Open your app
2. Login as Admin
3. Go to Admin Dashboard
4. Click "🥗 Food Nutrition Data"
```

#### 2. Upload Your First File

**Option A: Use Template**
```
1. Click "📥 Download CSV Template"
2. Fill with your food data
3. Click upload area
4. Select the file
5. Review preview
6. Click "✓ Upload All Items"
```

**Option B: Use Your Own CSV**
```
Required format:
Dish Name,Calories (kcal),Carbohydrates (g),Protein (g),Fats (g)
Dal,234,12,8,15
Biryani,289,38,12,8
```

#### 3. Manage Your Foods
```
- Search by name
- Delete items
- Browse with pagination
- Clear all foods
```

## 📊 Sample Upload Data

Save this as `foods.csv` and upload it:

```csv
Dish Name,Calories (kcal),Carbohydrates (g),Protein (g),Fats (g),Free Sugar (g),Fibre (g),Sodium (mg),Calcium (mg),Iron (mg),Vitamin C (mg),Folate (µg)
Dal Makhani,234,12,8,15,2,3,500,120,2,10,50
Butter Chicken,312,8,24,22,1,1,450,80,1,5,20
Biryani,289,38,12,8,0.5,1,580,60,2,3,30
Samosa,150,18,3,7,1,1,200,30,1,2,15
Paneer Tikka,200,5,24,11,1,0,400,200,2,15,30
Idli,56,12,3,0.5,0,1,200,50,1,5,25
Dosa,168,15,6,7,1,2,300,60,2,8,20
Tandoori Chicken,165,0,31,3,0,0,500,15,2,0,5
Chana Masala,150,20,8,3,2,4,400,80,3,10,50
Aloo Gobi,120,18,4,3,2,3,350,60,1,15,30
```

## 🧪 Testing Checklist

After uploading sample data:

- [ ] Open Admin Dashboard
- [ ] Click "Food Nutrition Data"
- [ ] See the upload form
- [ ] Download template
- [ ] Upload sample CSV above
- [ ] See preview with 10 items
- [ ] Confirm upload
- [ ] Check "Total Items" shows count
- [ ] Search for "dal"
- [ ] See filtered results
- [ ] Browse pagination
- [ ] Delete one item
- [ ] Verify it's removed

## 🔗 Integration Examples

### In Your App Code

```typescript
import { searchIndianFoods, getHighProteinFoods } from '@/lib/indianFoodService';

// Search for high-protein foods
const foods = await searchIndianFoods({
  minProtein: 15,
  maxCalories: 300
});

// Get protein-rich options
const proteinFoods = await getHighProteinFoods(20);

// Search by name
const dals = await searchFoodByName('dal');
```

### Create a Food Selection Screen

```typescript
import { searchIndianFoods } from '@/lib/indianFoodService';

const FoodSelectionScreen = () => {
  const [foods, setFoods] = useState([]);

  useEffect(() => {
    const fetchFoods = async () => {
      const results = await searchIndianFoods({
        maxCalories: 400
      });
      setFoods(results);
    };
    fetchFoods();
  }, []);

  return (
    <div>
      {foods.map(food => (
        <div key={food.id}>
          <h3>{food.dish_name}</h3>
          <p>Calories: {food.calories_kcal}</p>
          <p>Protein: {food.protein_g}g</p>
        </div>
      ))}
    </div>
  );
};
```

## 🎯 Common Tasks

### Search for Low-Calorie Foods
```typescript
const lightMeals = await searchIndianFoods({
  maxCalories: 200
});
```

### Get High-Protein Options
```typescript
const proteinRich = await getHighProteinFoods(25);
```

### Get Foods by Calorie Range
```typescript
const mealOptions = await getFoodsByCalorieRange(200, 400);
```

### Get All Foods (Paginated)
```typescript
const { foods, total } = await getAllIndianFoods(1, 50);
```

## 🐛 Troubleshooting

### Still Getting 404?
1. **Hard refresh your browser**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache**: Open DevTools → Application → Clear storage
3. **Check Supabase project**: Verify you're using the correct URL and key
4. **Verify table exists**: Go to Supabase Dashboard → SQL Editor → Run:
   ```sql
   SELECT * FROM information_schema.tables WHERE table_name = 'indian_foods';
   ```

### RLS Policy Issues?
If you get permission denied when uploading:
1. Make sure you're logged in as admin
2. Your profile must have `role = 'admin'` in the profiles table
3. Contact support if RLS policies aren't working

### Upload Not Working?
1. Check file format (CSV or XLSX)
2. Verify column headers match expected names
3. Check browser console for error details
4. Try with the template file first

## 📚 Documentation Files

- **FOOD_MANAGEMENT_GUIDE.md** - Complete reference guide
- **FOOD_MANAGEMENT_QUICK_REFERENCE.md** - Quick tips & commands
- **FOOD_MANAGEMENT_ARCHITECTURE.md** - System design details

## ✨ Features Ready to Use

✅ Upload CSV files  
✅ Upload Excel files  
✅ Download templates  
✅ Search foods  
✅ Browse with pagination  
✅ Delete items  
✅ Data validation  
✅ Error handling  
✅ Success messages  

## 🎉 You're All Set!

The system is ready to go. Start by:

1. Login as admin
2. Go to Admin Dashboard
3. Click "Food Nutrition Data"
4. Download the template
5. Upload some food data
6. Start using it in your app!

---

**Status**: ✅ LIVE AND READY  
**Table**: `indian_foods` (Created)  
**Policies**: RLS Enabled  
**Ready To**: Upload, Search, Manage Foods

Happy food management! 🥗
