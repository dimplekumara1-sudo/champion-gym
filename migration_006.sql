
-- Add date fields to plans for workshops and challenges
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;
