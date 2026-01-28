-- Fix pt_sessions relationship and add due_date
ALTER TABLE public.pt_sessions 
DROP CONSTRAINT IF EXISTS pt_sessions_user_id_fkey;

ALTER TABLE public.pt_sessions
ADD CONSTRAINT pt_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.pt_sessions 
ADD COLUMN IF NOT EXISTS due_date DATE;
