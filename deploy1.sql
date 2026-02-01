-- Challenge Gym Elite Fitness Coach - Indian Foods Database Deployment Script
-- This script sets up the complete indian_foods table with indexes and security policies
-- Date: January 26, 2026

-- ============================================================================
-- 1. CREATE INDIAN FOODS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS indian_foods (
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

-- ============================================================================
-- 2. CREATE PERFORMANCE INDEXES
-- ============================================================================
-- Index for fast name searches (ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_indian_foods_dish_name ON indian_foods(dish_name);

-- Index for calorie-based filtering and range queries
CREATE INDEX IF NOT EXISTS idx_indian_foods_calories ON indian_foods(calories_kcal);

-- Index for protein-based filtering and queries
CREATE INDEX IF NOT EXISTS idx_indian_foods_protein ON indian_foods(protein_g);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE indian_foods ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. DROP EXISTING POLICIES (if any) TO AVOID CONFLICTS
-- ============================================================================
DROP POLICY IF EXISTS "Allow read access to indian_foods" ON indian_foods;
DROP POLICY IF EXISTS "Allow admin insert on indian_foods" ON indian_foods;
DROP POLICY IF EXISTS "Allow admin update on indian_foods" ON indian_foods;
DROP POLICY IF EXISTS "Allow admin delete on indian_foods" ON indian_foods;

-- ============================================================================
-- 5. CREATE RLS POLICIES
-- ============================================================================

-- Public Read Access: Allow all authenticated users to read food data
CREATE POLICY "Allow read access to indian_foods" ON indian_foods
  FOR SELECT USING (true);

-- Admin Insert Access: Only admins can insert new food items
CREATE POLICY "Allow admin insert on indian_foods" ON indian_foods
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admin Update Access: Only admins can update existing food items
CREATE POLICY "Allow admin update on indian_foods" ON indian_foods
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Admin Delete Access: Only admins can delete food items
CREATE POLICY "Allow admin delete on indian_foods" ON indian_foods
  FOR DELETE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================================
-- 6. VERIFICATION QUERIES (RUN THESE TO VERIFY SETUP)
-- ============================================================================
-- Verify table structure
-- SELECT * FROM information_schema.columns WHERE table_name = 'indian_foods' ORDER BY ordinal_position;

-- Verify indexes
-- SELECT indexname FROM pg_indexes WHERE tablename = 'indian_foods';

-- Verify RLS is enabled
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'indian_foods';

-- Verify policies
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check FROM pg_policies WHERE tablename = 'indian_foods';

-- ============================================================================
-- 7. SAMPLE DATA (OPTIONAL - Uncomment to insert sample foods)
-- ============================================================================
/*
INSERT INTO indian_foods (
  dish_name,
  calories_kcal,
  carbohydrates_g,
  protein_g,
  fats_g,
  free_sugar_g,
  fibre_g,
  sodium_mg,
  calcium_mg,
  iron_mg,
  vitamin_c_mg,
  folate_mcg
) VALUES
  ('Dal Makhani', 234.00, 12.00, 8.00, 15.00, 2.00, 3.00, 500, 120, 2.00, 10.00, 50),
  ('Butter Chicken', 312.00, 8.00, 24.00, 22.00, 1.00, 1.00, 450, 80, 1.00, 5.00, 20),
  ('Biryani', 289.00, 38.00, 12.00, 8.00, 0.50, 1.00, 580, 60, 2.00, 3.00, 30),
  ('Samosa', 150.00, 18.00, 3.00, 7.00, 1.00, 1.00, 200, 30, 1.00, 2.00, 15),
  ('Paneer Tikka', 200.00, 5.00, 24.00, 11.00, 1.00, 0.00, 400, 200, 2.00, 15.00, 30),
  ('Idli', 56.00, 12.00, 3.00, 0.50, 0.00, 1.00, 200, 50, 1.00, 5.00, 25),
  ('Dosa', 168.00, 15.00, 6.00, 7.00, 1.00, 2.00, 300, 60, 2.00, 8.00, 20),
  ('Tandoori Chicken', 165.00, 0.00, 31.00, 3.00, 0.00, 0.00, 500, 15, 2.00, 0.00, 5),
  ('Chana Masala', 150.00, 20.00, 8.00, 3.00, 2.00, 4.00, 400, 80, 3.00, 10.00, 50),
  ('Aloo Gobi', 120.00, 18.00, 4.00, 3.00, 2.00, 3.00, 350, 60, 1.00, 15.00, 30)
ON CONFLICT (dish_name) DO UPDATE SET
  calories_kcal = EXCLUDED.calories_kcal,
  carbohydrates_g = EXCLUDED.carbohydrates_g,
  protein_g = EXCLUDED.protein_g,
  fats_g = EXCLUDED.fats_g,
  free_sugar_g = EXCLUDED.free_sugar_g,
  fibre_g = EXCLUDED.fibre_g,
  sodium_mg = EXCLUDED.sodium_mg,
  calcium_mg = EXCLUDED.calcium_mg,
  iron_mg = EXCLUDED.iron_mg,
  vitamin_c_mg = EXCLUDED.vitamin_c_mg,
  folate_mcg = EXCLUDED.folate_mcg,
  updated_at = CURRENT_TIMESTAMP;
*/

-- ============================================================================
-- 8. QUERY EXAMPLES FOR REFERENCE
-- ============================================================================
-- Get total food count
-- SELECT COUNT(*) as total_foods FROM indian_foods;

-- Search foods by name
-- SELECT * FROM indian_foods WHERE dish_name ILIKE '%dal%' ORDER BY dish_name;

-- Get high-protein foods (> 15g protein)
-- SELECT * FROM indian_foods WHERE protein_g > 15 ORDER BY protein_g DESC;

-- Get low-calorie foods (< 200 kcal)
-- SELECT * FROM indian_foods WHERE calories_kcal < 200 ORDER BY calories_kcal ASC;

-- Get foods by calorie range (200-400 kcal)
-- SELECT * FROM indian_foods WHERE calories_kcal BETWEEN 200 AND 400 ORDER BY calories_kcal;

-- Get nutrition summary statistics
-- SELECT 
--   COUNT(*) as total_foods,
--   ROUND(AVG(calories_kcal)::NUMERIC, 2) as avg_calories,
--   ROUND(AVG(protein_g)::NUMERIC, 2) as avg_protein,
--   ROUND(MIN(calories_kcal)::NUMERIC, 2) as min_calories,
--   ROUND(MAX(calories_kcal)::NUMERIC, 2) as max_calories
-- FROM indian_foods;

-- ============================================================================
-- 9. MAINTENANCE QUERIES (Use for regular maintenance)
-- ============================================================================
-- Vacuum and analyze table (improves query performance)
-- VACUUM ANALYZE indian_foods;

-- Get table size
-- SELECT pg_size_pretty(pg_total_relation_size('indian_foods')) as total_size;

-- Check for duplicate dish names
-- SELECT dish_name, COUNT(*) as count FROM indian_foods GROUP BY dish_name HAVING COUNT(*) > 1;

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Or apply migration through Supabase Dashboard
-- 3. Verify setup by running verification queries (section 6)
-- 4. Table is now ready for use
-- 5. Access from app via Supabase client library
-- 6. Upload CSV/XLSX files through Admin Dashboard
--
-- VERIFICATION CHECKLIST:
-- ✅ Table created with all columns
-- ✅ Primary key auto-increment enabled
-- ✅ Unique constraint on dish_name
-- ✅ 3 performance indexes created
-- ✅ RLS enabled on table
-- ✅ 4 RLS policies configured
-- ✅ Public read access allowed
-- ✅ Admin-only write access enforced
-- ============================================================================
