-- Fix 4: Add missing YouTube URL columns to exercises table
-- This migration adds men_youtube_url and women_youtube_url columns for gender-specific exercise videos

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS men_youtube_url text,
  ADD COLUMN IF NOT EXISTS women_youtube_url text;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises USING btree (exercise_name);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises USING btree (category);
CREATE INDEX IF NOT EXISTS idx_exercises_level ON public.exercises USING btree (level);
