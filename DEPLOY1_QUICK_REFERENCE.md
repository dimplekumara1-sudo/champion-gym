# Deploy Script Quick Reference

## File: `deploy1.sql`

Complete database deployment script for Indian Foods management system.

### Quick Deploy (3 Steps)

**Step 1:** Open Supabase Dashboard → SQL Editor

**Step 2:** Copy & paste entire `deploy1.sql` content

**Step 3:** Click "Run" button

✅ **Done!** Database is now ready.

---

## What Gets Created

```
TABLE: indian_foods
├── Columns: 15 (id, dish_name, 13 nutrition fields, timestamps)
├── Indexes: 3 (for fast queries)
└── RLS Policies: 4 (admin write, public read)
```

## Validation Queries (Run After Deploy)

**Check table exists:**
```sql
SELECT * FROM information_schema.columns 
WHERE table_name = 'indian_foods' 
LIMIT 5;
```

**Check indexes:**
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'indian_foods';
```

**Check RLS policies:**
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'indian_foods';
```

## Formatting Update

### Before
```
Calories: 234 (no decimals)
Protein: 8.0 (1 decimal)
Carbs: 12.5 (1 decimal)
```

### After
```
Calories: 234.00 (2 decimals)
Protein: 8.00 (2 decimals)
Carbs: 12.50 (2 decimals)
```

All numeric values now display with exactly 2 decimal places.

---

## File Locations

| File | Purpose |
|------|---------|
| `deploy1.sql` | Database setup script |
| `AdminIndianFoods.tsx` | Updated decimal formatting |
| `DECIMAL_FORMATTING_COMPLETE.md` | Full documentation |

## Table Structure (deploy1.sql)

```sql
id              BIGINT (Auto-increment)
dish_name       TEXT (Unique, Required)
calories_kcal   NUMERIC (Required)
carbohydrates_g NUMERIC (Required)
protein_g       NUMERIC (Required)
fats_g          NUMERIC (Required)
free_sugar_g    NUMERIC (Optional)
fibre_g         NUMERIC (Optional)
sodium_mg       NUMERIC (Optional)
calcium_mg      NUMERIC (Optional)
iron_mg         NUMERIC (Optional)
vitamin_c_mg    NUMERIC (Optional)
folate_mcg      NUMERIC (Optional)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

## RLS Policies

| Policy | Action | Allowed For |
|--------|--------|------------|
| Read | SELECT | Everyone |
| Insert | INSERT | Admin only |
| Update | UPDATE | Admin only |
| Delete | DELETE | Admin only |

---

**Version**: 1.0  
**Ready to Deploy**: ✅ YES  
**Tested**: ✅ YES  

Run the script and you're all set! 🚀
