-- Fix attendance table relationship to profiles
-- Drop existing foreign key if it exists
ALTER TABLE IF EXISTS public.attendance 
DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;

-- Add foreign key to profiles
ALTER TABLE public.attendance
ADD CONSTRAINT attendance_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Also add an index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON public.attendance(check_in);
