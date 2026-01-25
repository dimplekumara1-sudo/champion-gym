
-- Update plans table to include duration
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1;

-- Update existing plans to INR and add durations
-- We can create multiple entries for different durations if needed, 
-- but for now let's update the existing ones and add a few more.

UPDATE public.plans SET price = '₹0', duration_months = 1 WHERE id = 'basic';
UPDATE public.plans SET price = '₹1200', duration_months = 1 WHERE id = 'pro';
UPDATE public.plans SET price = '₹2500', duration_months = 1 WHERE id = 'elite';

-- Add multi-month plans
INSERT INTO public.plans (id, name, price, description, features, popular, duration_months)
VALUES 
('pro_3', 'Pro (3 Months)', '₹3000', 'Level up your fitness', ARRAY['Unlimited custom workouts', 'Personalized AI training plans', 'Offline mode & GPS maps'], false, 3),
('pro_6', 'Pro (6 Months)', '₹5500', 'Level up your fitness', ARRAY['Unlimited custom workouts', 'Personalized AI training plans', 'Offline mode & GPS maps'], false, 6),
('pro_12', 'Pro (12 Months)', '₹10000', 'Level up your fitness', ARRAY['Unlimited custom workouts', 'Personalized AI training plans', 'Offline mode & GPS maps'], false, 12)
ON CONFLICT (id) DO NOTHING;
