
-- Workout Categories table
CREATE TABLE IF NOT EXISTS public.workout_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Update Workouts table
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS kcal TEXT;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Enable RLS for workout_categories
ALTER TABLE public.workout_categories ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Anyone can view workout_categories" ON public.workout_categories FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "Admins can manage workout_categories" ON public.workout_categories FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed categories if they don't exist
INSERT INTO public.workout_categories (name, icon, image_url)
VALUES 
('Weight Loss', 'trending_down', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUXmOArbYP-r9FLVLawzHqU_WtPi0EVGm5gN1rXL3rKPoo-AcCgi9LXp7WIheDNaBwSK06WOqqkt-X29jRh2mRDP_9Q-SumONfWCeZzT4cdzTQhRP1lX1uvkY-V2wi0TFAG816mPHlseUu4tCPfPBDFhApTI9O0F8fV7PQzWH8lC19r4IAIcZwrzfKNpMNcjP0B6wkPv45RULBsSs4LhheKIqE8y2mr9yOwGZz_X0puWlhZlE5DrFgj8JoLd3Cdo84lwlEv_IMC6aF'),
('Strength', 'fitness_center', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwp9GjmBreaYSjHY_0YbtiaoLtNL15rwkyMDHfDMU62G7oQTENLGXyZ2vg5yOH22nWyNRqtGWWYTey-z2QTTxQ5cWfB64bbe25-qAUflpO5Qk0sjo7-xDiUkgAcnV6wS2nFLnuz1wZsZiXx8e_U-k44JOEglc1wsLGCQsC6jb0SRbKWTpBJ9bAxM8AtI6PBaaxcdZFZUiHX1P73sL1aZby2pFJeEI57RKDsuACXj1WOCSTIjZohG4qooHB1S83qvv26CNULphu85Ik'),
('Yoga', 'self_improvement', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJ-uiX20Cccpk-ln8pv9WIoVWDznkLsikOJ8xZCbrseGDFFwvCnbt_ixm-VTcfVWqjiwLDWoYAwt6_o1DcXYsbiYkfEinn-Gc--86cqqeBX1bOO9RtBOqFlve9-7wdYZXqqgCft74qbFYGUSpyBL2IzmiWNDGlw_dnU-AMG7sdFhT8ojHHKSd21va36x65dQ1zoCrDaod4ooBFq7T-QJEFaOYfWIK6Rnb5dnnVZCb6LPgWRwQUq4r4ba_55hxEdcgbii6D0jkUc90T'),
('HIIT', 'bolt', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoPR1Rnir48lRHlhVPLxqDHjWssqfPm7HTHUxwVBYlk2mvYn22dm_-OHOKKbTGJI5WV_3hLCS6EidkEQ5WoWg8Wh0UqGsheOwz7baykEaWBa263Y2pzCRtS8v-5TctkJZrNS2Im655OwmMv0m_-RjPBRjkFkPLpLknl7pNoLXSfb1Ve8Az8m6hGowQ5sg1VL8om8BR16XzIu3F2pfRIfdaxd5yg7mzOfiX88DjvjtYxO3rWDf3_nhMbdiX0GkuWcwuCO_9qIXfaLcZ')
ON CONFLICT DO NOTHING;
