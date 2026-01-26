-- Add food_name column to user_daily_diet_tracking if it doesn't exist
ALTER TABLE public.user_daily_diet_tracking ADD COLUMN IF NOT EXISTS food_name TEXT;

-- Update existing records with food names from indian_foods table
UPDATE public.user_daily_diet_tracking uddt
SET food_name = i.dish_name
FROM public.indian_foods i
WHERE uddt.food_id = i.id AND uddt.food_name IS NULL;
