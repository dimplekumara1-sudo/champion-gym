-- Add missing columns to workouts table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='user_id') THEN
        ALTER TABLE public.workouts ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='image_url') THEN
        ALTER TABLE public.workouts ADD COLUMN image_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='is_featured') THEN
        ALTER TABLE public.workouts ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='duration') THEN
        ALTER TABLE public.workouts ADD COLUMN duration TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='kcal') THEN
        ALTER TABLE public.workouts ADD COLUMN kcal TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='youtube_url') THEN
        ALTER TABLE public.workouts ADD COLUMN youtube_url TEXT;
    END IF;
END $$;

-- Update RLS policies for workouts
-- Enable RLS (just in case it's not enabled)
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can view workouts (Public/Global workouts have user_id as NULL)
DROP POLICY IF EXISTS "Anyone can view workouts" ON public.workouts;
CREATE POLICY "Anyone can view workouts" ON public.workouts FOR SELECT USING (true);

-- 2. Users can insert their own workouts
DROP POLICY IF EXISTS "Users can insert their own workouts" ON public.workouts;
CREATE POLICY "Users can insert their own workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own workouts
DROP POLICY IF EXISTS "Users can update their own workouts" ON public.workouts;
CREATE POLICY "Users can update their own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);

-- 4. Users can delete their own workouts
DROP POLICY IF EXISTS "Users can delete their own workouts" ON public.workouts;
CREATE POLICY "Users can delete their own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- 5. Admins still have full access to everything
DROP POLICY IF EXISTS "Admins can manage workouts" ON public.workouts;
CREATE POLICY "Admins can manage workouts" ON public.workouts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- Fix workout_exercises policies
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view workout_exercises" ON public.workout_exercises;
CREATE POLICY "Anyone can view workout_exercises" ON public.workout_exercises FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage exercises for their own workouts" ON public.workout_exercises;
CREATE POLICY "Users can manage exercises for their own workouts" ON public.workout_exercises 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.workouts
    WHERE id = workout_exercises.workout_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workouts
    WHERE id = workout_exercises.workout_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage workout_exercises" ON public.workout_exercises;
CREATE POLICY "Admins can manage workout_exercises" ON public.workout_exercises FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);

-- Fix user_programs policies to allow users to manage their own programs
ALTER TABLE public.user_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own programs" ON public.user_programs;
CREATE POLICY "Users can view their own programs" ON public.user_programs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own programs" ON public.user_programs;
CREATE POLICY "Users can insert their own programs" ON public.user_programs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own programs" ON public.user_programs;
CREATE POLICY "Users can update their own programs" ON public.user_programs FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own programs" ON public.user_programs;
CREATE POLICY "Users can delete their own programs" ON public.user_programs FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage user_programs" ON public.user_programs;
CREATE POLICY "Admins can manage user_programs" ON public.user_programs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'trainer'))
);
