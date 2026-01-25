
-- Add columns to profiles for approval and plan management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
ADD COLUMN IF NOT EXISTS plan_id TEXT,
ADD COLUMN IF NOT EXISTS plan_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS plan_expiry_date TIMESTAMP WITH TIME ZONE;

-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  description TEXT,
  features TEXT[],
  popular BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read plans
DROP POLICY IF EXISTS "Anyone can view plans" ON public.plans;
CREATE POLICY "Anyone can view plans" ON public.plans FOR SELECT USING (true);

-- Only admins can modify plans
DROP POLICY IF EXISTS "Admins can modify plans" ON public.plans;
CREATE POLICY "Admins can modify plans" ON public.plans FOR ALL USING (is_admin());

-- Insert default plans
INSERT INTO public.plans (id, name, price, description, features, popular)
VALUES 
('basic', 'Basic', '$0', 'Get started today', ARRAY['Basic activity tracking', '3 preset workouts/week', 'Community board access'], false),
('pro', 'Pro', '$14.99', 'Level up your fitness', ARRAY['Unlimited custom workouts', 'Personalized AI training plans', 'Offline mode & GPS maps', 'Ad-free experience'], true),
('elite', 'Elite', '$29.99', 'Total health transformation', ARRAY['1-on-1 performance coaching', 'Nutritionist video consultation', 'All wearable device integrations'], false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  popular = EXCLUDED.popular;
