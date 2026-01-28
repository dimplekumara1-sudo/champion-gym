-- Migration: PT Trainers and Sessions
-- Description: Sets up the tables for Personal Training session booking

-- 1. Create PT Trainers Table
CREATE TABLE IF NOT EXISTS public.pt_trainers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL DEFAULT 'Strength & Conditioning',
  experience TEXT,
  rate TEXT,
  rating NUMERIC DEFAULT 5.0,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create PT Sessions Table
CREATE TABLE IF NOT EXISTS public.pt_sessions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  trainer_id BIGINT REFERENCES public.pt_trainers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT DEFAULT 'Strength & Conditioning',
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Enable RLS
ALTER TABLE public.pt_trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_sessions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for pt_trainers
CREATE POLICY "Anyone can view active trainers" ON public.pt_trainers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage trainers" ON public.pt_trainers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 5. RLS Policies for pt_sessions
CREATE POLICY "Users can view their own sessions" ON public.pt_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can book their own sessions" ON public.pt_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all sessions" ON public.pt_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 6. Insert initial trainer if not exists
INSERT INTO public.pt_trainers (name, specialty, experience, rate, rating, photo_url)
SELECT 'Sarah Williams', 'Strength & Conditioning', '6yr', '₹1500/hr', 4.9, 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxKi-8oL81giM-Bx-bk8rF5_93Jn3vYePYQpcFGPRCKgFT3wQutvrmvzQbq3VJufEpdILPZz-iannbJVMUQR-r-korKOaIoWf2gE2Q_il-skxN6ESzgI-987MyqQZdg7sMkRJ6MCBU1g_18k30OtyhLRhv4IgkfjhjD5nyDvwIZyPw-2e1ITVF0AtqjgOT2HzNsvgJKIZvJyKij7jYm5bpz-aHn_ruREy2nxIbq_ek6K3k5FqyItcIWbhx2vGrDhcfKHZ8CmHSyLwJ'
WHERE NOT EXISTS (SELECT 1 FROM public.pt_trainers WHERE name = 'Sarah Williams');
