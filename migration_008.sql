
-- Add gender-specific YouTube links to exercises
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS men_youtube_url TEXT;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS women_youtube_url TEXT;
